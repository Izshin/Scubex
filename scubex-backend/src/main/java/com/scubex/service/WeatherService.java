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
            return convertFromCache(cached.get());
        }

        ForecastApiResponse.CurrentWeather atmosphere = callForecastApi(lat, lng);
        MarineApiResponse.CurrentMarine marine = callMarineApi(lat, lng);

        WeatherResponse response = buildWeatherResponse(atmosphere, marine);

        // Evaluate diving condition
        response.setDivingCondition(evaluateDivingCondition(response));

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

            ResponseEntity<ForecastApiResponse> response = restTemplate.getForEntity(uri, ForecastApiResponse.class);

            if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null
                    && response.getBody().getCurrent() != null) {
                return response.getBody().getCurrent();
            }

            return null;

        } catch (Exception e) {
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
                            + "ocean_current_direction,swell_wave_height,"
                            + "sea_level_height_msl")
                    .queryParam("length_unit", "metric")
                    .build()
                    .encode()
                    .toUri();

            ResponseEntity<MarineApiResponse> response = restTemplate.getForEntity(uri, MarineApiResponse.class);

            if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null
                    && response.getBody().getCurrent() != null) {
                return response.getBody().getCurrent();
            }

            return null;

        } catch (Exception e) {
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
                    .swellWaveHeight(marine.getSwellWaveHeight())
                    .seaLevelHeight(marine.getSeaLevelHeight());
        }

        return builder.build();
    }

    /**
     * Evaluate diving conditions based on weighted scoring.
     * Returns "good", "moderate", or "bad".
     *
     * Critical overrides: extreme values in key factors force "bad" immediately.
     * Weights: waves=3, current=3, visibility=2, wind=2, weatherCode=2, precipProb=1
     * Each factor scores 0 (bad), 1 (moderate), or 2 (good).
     * Weighted average >= 1.5 → good, >= 0.8 → moderate, else bad.
     */
    private String evaluateDivingCondition(WeatherResponse wr) {
        // Critical overrides — extreme values in important factors = immediate "bad"
        if (wr.getWaveHeight() != null && wr.getWaveHeight() > 2.5) return "bad";
        if (wr.getOceanCurrentVelocity() != null && wr.getOceanCurrentVelocity() > 5) return "bad";
        if (wr.getWindSpeed() != null && wr.getWindSpeed() > 40) return "bad";
        if (wr.getWeatherCode() != null && (wr.getWeatherCode() == 95 || wr.getWeatherCode() == 96 || wr.getWeatherCode() == 99)) return "bad";
        if (wr.getVisibility() != null && wr.getVisibility() < 1000) return "bad";

        int score = 0;
        int weight = 0;

        // Waves (m): <0.5 good, 0.5-1.5 moderate, >1.5 bad — weight 3
        if (wr.getWaveHeight() != null) {
            weight += 3;
            score += (wr.getWaveHeight() < 0.5 ? 2 : wr.getWaveHeight() < 1.5 ? 1 : 0) * 3;
        }
        // Current (km/h): <1 good, 1-3 moderate, >3 bad — weight 3
        if (wr.getOceanCurrentVelocity() != null) {
            weight += 3;
            score += (wr.getOceanCurrentVelocity() < 1 ? 2 : wr.getOceanCurrentVelocity() < 3 ? 1 : 0) * 3;
        }
        // Visibility (m): >10000 good, 2000-10000 moderate, <2000 bad — weight 2
        if (wr.getVisibility() != null) {
            weight += 2;
            score += (wr.getVisibility() > 10000 ? 2 : wr.getVisibility() > 2000 ? 1 : 0) * 2;
        }
        // Wind (km/h): <15 good, 15-30 moderate, >30 bad — weight 2
        if (wr.getWindSpeed() != null) {
            weight += 2;
            score += (wr.getWindSpeed() < 15 ? 2 : wr.getWindSpeed() < 30 ? 1 : 0) * 2;
        }
        // Weather code: storms (95,96,99) bad, rain (>=61) moderate, else good — weight 2
        if (wr.getWeatherCode() != null) {
            weight += 2;
            int wc = wr.getWeatherCode();
            score += (wc == 95 || wc == 96 || wc == 99 ? 0 : wc >= 61 ? 1 : 2) * 2;
        }
        // Precipitation probability: <20 good, 20-60 moderate, >60 bad — weight 1
        if (wr.getPrecipitationProbability() != null) {
            weight += 1;
            score += (wr.getPrecipitationProbability() < 20 ? 2 : wr.getPrecipitationProbability() < 60 ? 1 : 0);
        }

        if (weight == 0) return "moderate";
        double avg = (double) score / weight;
        if (avg >= 1.5) return "good";
        if (avg >= 0.8) return "moderate";
        return "bad";
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
                .seaLevelHeight(cw.getSeaLevelHeight())
                .divingCondition(cw.getDivingCondition())
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
                    .seaLevelHeight(wr.getSeaLevelHeight())
                    .divingCondition(wr.getDivingCondition())
                    .build();

            cachedWeatherRepository.save(cw);
        } catch (Exception e) {
            // ignore cache save errors
        }
    }
}
