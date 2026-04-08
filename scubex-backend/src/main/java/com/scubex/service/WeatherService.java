package com.scubex.service;

import java.net.URI;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Optional;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.util.UriComponentsBuilder;

import com.scubex.DTO.WeatherResponse;
import com.scubex.model.CachedWeather;
import com.scubex.model.openmeteo.ForecastApiResponse;
import com.scubex.model.openmeteo.MarineApiResponse;
import com.scubex.repository.CachedWeatherRepository;

@Service
public class WeatherService {

    @Autowired
    private RestTemplate restTemplate;

    @Autowired
    private CachedWeatherRepository cachedWeatherRepository;

    @Value("${open-meteo.weather.url}")
    private String forecastApiUrl;

    @Value("${open-meteo.marine.url}")
    private String marineApiUrl;

    private static double roundCoord(double value) {
        return Math.round(value * 100.0) / 100.0;
    }

    public WeatherResponse getWeather(double lat, double lng) {
        double roundedLat = roundCoord(lat);
        double roundedLng = roundCoord(lng);

        // Check cache first
        Instant cutoff = Instant.now().minus(30, ChronoUnit.MINUTES);
        Optional<CachedWeather> cached = cachedWeatherRepository
                .findFirstByRoundedLatAndRoundedLngAndCreatedAtAfter(roundedLat, roundedLng, cutoff);

        if (cached.isPresent()) {
            System.out.println("✅ Cache HIT for weather at " + roundedLat + ", " + roundedLng);
            return convertFromCache(cached.get());
        }

        System.out.println("⏳ Cache MISS for weather at " + roundedLat + ", " + roundedLng);

        ForecastApiResponse.CurrentWeather atmosphere = callForecastApi(lat, lng);
        MarineApiResponse.CurrentMarine marine = callMarineApi(lat, lng);

        WeatherResponse response = buildWeatherResponse(atmosphere, marine);

        // Save to cache
        saveToCache(roundedLat, roundedLng, response);

        return response;
    }

    private ForecastApiResponse.CurrentWeather callForecastApi(double lat, double lng) {
        try {
            URI uri = UriComponentsBuilder.fromUriString(forecastApiUrl)
                    .queryParam("latitude", lat)
                    .queryParam("longitude", lng)
                    .queryParam("current", "temperature_2m,relative_humidity_2m,wind_speed_10m,"
                            + "wind_direction_10m,precipitation,precipitation_probability,"
                            + "snowfall,visibility,weather_code")
                    .queryParam("wind_speed_unit", "kmh")
                    .build()
                    .encode()
                    .toUri();

            System.out.println("🌤️ Forecast API URI: " + uri);

            ResponseEntity<ForecastApiResponse> response = restTemplate.getForEntity(uri, ForecastApiResponse.class);

            if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null
                    && response.getBody().getCurrent() != null) {
                System.out.println("✅ Forecast API response successful");
                return response.getBody().getCurrent();
            }

            System.err.println("❌ Forecast API HTTP " + response.getStatusCode() + " or empty body");
            return null;

        } catch (Exception e) {
            System.err.println("❌ Error calling Forecast API: " + e.getMessage());
            return null;
        }
    }

    private MarineApiResponse.CurrentMarine callMarineApi(double lat, double lng) {
        try {
            URI uri = UriComponentsBuilder.fromUriString(marineApiUrl)
                    .queryParam("latitude", lat)
                    .queryParam("longitude", lng)
                    .queryParam("current", "wave_height,wave_direction,wave_period,"
                            + "sea_surface_temperature,ocean_current_velocity,"
                            + "ocean_current_direction,swell_wave_height")
                    .queryParam("length_unit", "metric")
                    .build()
                    .encode()
                    .toUri();

            System.out.println("🌊 Marine API URI: " + uri);

            ResponseEntity<MarineApiResponse> response = restTemplate.getForEntity(uri, MarineApiResponse.class);

            if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null
                    && response.getBody().getCurrent() != null) {
                System.out.println("✅ Marine API response successful");
                return response.getBody().getCurrent();
            }

            System.err.println("❌ Marine API HTTP " + response.getStatusCode() + " or empty body");
            return null;

        } catch (Exception e) {
            System.err.println("❌ Error calling Marine API: " + e.getMessage());
            return null;
        }
    }

    private WeatherResponse buildWeatherResponse(ForecastApiResponse.CurrentWeather atmosphere,
            MarineApiResponse.CurrentMarine marine) {

        WeatherResponse.WeatherResponseBuilder builder = WeatherResponse.builder();

        if (atmosphere != null) {
            builder.temperature(atmosphere.getTemperature())
                    .humidity(atmosphere.getRelativeHumidity())
                    .windSpeed(atmosphere.getWindSpeed())
                    .windDirection(atmosphere.getWindDirection())
                    .precipitation(atmosphere.getPrecipitation())
                    .precipitationProbability(atmosphere.getPrecipitationProbability())
                    .snowfall(atmosphere.getSnowfall())
                    .visibility(atmosphere.getVisibility())
                    .weatherCode(atmosphere.getWeatherCode());
        }

        if (marine != null) {
            builder.waveHeight(marine.getWaveHeight())
                    .waveDirection(marine.getWaveDirection())
                    .wavePeriod(marine.getWavePeriod())
                    .seaSurfaceTemperature(marine.getSeaSurfaceTemperature())
                    .oceanCurrentVelocity(marine.getOceanCurrentVelocity())
                    .oceanCurrentDirection(marine.getOceanCurrentDirection())
                    .swellWaveHeight(marine.getSwellWaveHeight());
        }

        return builder.build();
    }

    private WeatherResponse convertFromCache(CachedWeather cw) {
        return WeatherResponse.builder()
                .temperature(cw.getTemperature())
                .humidity(cw.getHumidity())
                .windSpeed(cw.getWindSpeed())
                .windDirection(cw.getWindDirection())
                .precipitation(cw.getPrecipitation())
                .precipitationProbability(cw.getPrecipitationProbability())
                .snowfall(cw.getSnowfall())
                .visibility(cw.getVisibility())
                .weatherCode(cw.getWeatherCode())
                .waveHeight(cw.getWaveHeight())
                .waveDirection(cw.getWaveDirection())
                .wavePeriod(cw.getWavePeriod())
                .seaSurfaceTemperature(cw.getSeaSurfaceTemperature())
                .oceanCurrentVelocity(cw.getOceanCurrentVelocity())
                .oceanCurrentDirection(cw.getOceanCurrentDirection())
                .swellWaveHeight(cw.getSwellWaveHeight())
                .build();
    }

    private void saveToCache(double roundedLat, double roundedLng, WeatherResponse wr) {
        try {
            CachedWeather cw = CachedWeather.builder()
                    .roundedLat(roundedLat)
                    .roundedLng(roundedLng)
                    .temperature(wr.getTemperature())
                    .humidity(wr.getHumidity())
                    .windSpeed(wr.getWindSpeed())
                    .windDirection(wr.getWindDirection())
                    .precipitation(wr.getPrecipitation())
                    .precipitationProbability(wr.getPrecipitationProbability())
                    .snowfall(wr.getSnowfall())
                    .visibility(wr.getVisibility())
                    .weatherCode(wr.getWeatherCode())
                    .waveHeight(wr.getWaveHeight())
                    .waveDirection(wr.getWaveDirection())
                    .wavePeriod(wr.getWavePeriod())
                    .seaSurfaceTemperature(wr.getSeaSurfaceTemperature())
                    .oceanCurrentVelocity(wr.getOceanCurrentVelocity())
                    .oceanCurrentDirection(wr.getOceanCurrentDirection())
                    .swellWaveHeight(wr.getSwellWaveHeight())
                    .build();

            cachedWeatherRepository.save(cw);
            System.out.println("💾 Cached weather for " + roundedLat + ", " + roundedLng);
        } catch (Exception e) {
            System.err.println("⚠️ Failed to save weather cache: " + e.getMessage());
        }
    }
}
