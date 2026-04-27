package com.scubex.service;

import com.scubex.DTO.WeatherResponse;
import com.scubex.model.CachedWeather;
import com.scubex.model.openmeteo.ForecastApiResponse;
import com.scubex.model.openmeteo.MarineApiResponse;
import com.scubex.repository.CachedWeatherRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestTemplate;

import java.net.URI;
import java.time.Instant;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

/**
 * Test suite for WeatherService.
 * Tests cover:
 * - Cache hit: cached entry younger than 30 min is returned without calling Open-Meteo.
 * - Critical override: wave height > 2.5 m forces divingCondition = "bad" immediately.
 * - No marine data: null marine response (continental area) does not throw and still computes condition.
 * - API fault tolerance: RestClientException in forecast API yields null atmospheric fields without propagating the error.
 */
@ExtendWith(MockitoExtension.class)
class WeatherServiceTest {

    @Mock
    private RestTemplate restTemplate;

    @Mock
    private CachedWeatherRepository cachedWeatherRepository;

    @InjectMocks
    private WeatherService weatherService;

    @BeforeEach
    void setUp() {
        ReflectionTestUtils.setField(weatherService, "forecastApiUrl",
                "https://api.open-meteo.com/v1/forecast");
        ReflectionTestUtils.setField(weatherService, "marineApiUrl",
                "https://marine-api.open-meteo.com/v1/marine");
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Test 1: Cache hit
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Cache hit: a database entry younger than 30 minutes for the given coordinates
     * must be returned directly, without issuing any HTTP call to Open-Meteo.
     */
    @Test
    void cacheHit_returnsCachedDataWithoutCallingExternalApis() {
        // Given: a fresh cache entry (10 minutes old)
        CachedWeather cached = CachedWeather.builder()
                .roundedLat(36.5)
                .roundedLng(-4.0)
                .createdAt(Instant.now().minusSeconds(10 * 60))
                .temperature(22.0)
                .windSpeed(10.0)
                .visibility(15000.0)
                .weatherCode(1)
                .waveHeight(0.5)
                .oceanCurrentVelocity(0.8)
                .divingCondition("good")
                .build();

        when(cachedWeatherRepository.findFirstByRoundedLatAndRoundedLngAndCreatedAtAfter(
                eq(36.5), eq(-4.0), any(Instant.class)))
                .thenReturn(Optional.of(cached));

        // When
        WeatherResponse result = weatherService.getWeather(36.5, -4.0);

        // Then: cached values are returned as-is
        assertEquals("good", result.getDivingCondition());
        assertEquals(22.0, result.getTemperature());
        assertEquals(0.5, result.getWaveHeight());

        // And: no HTTP calls were made
        verifyNoInteractions(restTemplate);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Test 2: Critical override — wave height > 2.5 m
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Critical override: when wave height exceeds 2.5 m, evaluateDivingCondition()
     * must return "bad" immediately, regardless of all other factors being favorable.
     */
    @Test
    void criticalOverride_waveHeightExceeds2_5m_returnsDivingConditionBad() {
        // Given: no cache
        when(cachedWeatherRepository.findFirstByRoundedLatAndRoundedLngAndCreatedAtAfter(
                any(), any(), any())).thenReturn(Optional.empty());

        // Forecast API: ideal atmospheric conditions
        ForecastApiResponse forecastResponse = buildForecastResponse(20.0, 5.0, 20000.0, 0, 0.0);
        when(restTemplate.getForEntity(any(URI.class), eq(ForecastApiResponse.class)))
                .thenReturn(new ResponseEntity<>(forecastResponse, HttpStatus.OK));

        // Marine API: critically high wave (3.0 m > 2.5 m threshold)
        MarineApiResponse marineResponse = buildMarineResponse(3.0, 0.5);
        when(restTemplate.getForEntity(any(URI.class), eq(MarineApiResponse.class)))
                .thenReturn(new ResponseEntity<>(marineResponse, HttpStatus.OK));

        // When
        WeatherResponse result = weatherService.getWeather(36.5, -4.0);

        // Then: critical override forces "bad" despite good atmospheric conditions
        assertEquals("bad", result.getDivingCondition());
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Test 3: No marine data (continental area)
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * No marine data: when the marine API returns null body (continental zone),
     * the service must compute the diving condition from atmospheric data alone
     * without throwing any exception, and marine fields must remain null.
     */
    @Test
    void noMarineData_continentalArea_computesConditionFromAtmosphereOnly() {
        // Given: no cache
        when(cachedWeatherRepository.findFirstByRoundedLatAndRoundedLngAndCreatedAtAfter(
                any(), any(), any())).thenReturn(Optional.empty());

        // Forecast API: good atmospheric conditions
        ForecastApiResponse forecastResponse = buildForecastResponse(18.0, 8.0, 15000.0, 1, 10.0);
        when(restTemplate.getForEntity(any(URI.class), eq(ForecastApiResponse.class)))
                .thenReturn(new ResponseEntity<>(forecastResponse, HttpStatus.OK));

        // Marine API: null body — no marine data for this inland location
        when(restTemplate.getForEntity(any(URI.class), eq(MarineApiResponse.class)))
                .thenReturn(new ResponseEntity<>((MarineApiResponse) null, HttpStatus.OK));

        // When / Then: no exception is thrown
        WeatherResponse result = assertDoesNotThrow(
                () -> weatherService.getWeather(40.4, -3.7)); // Madrid coordinates

        // Atmospheric fields are populated
        assertEquals(18.0, result.getTemperature());
        assertEquals(8.0, result.getWindSpeed());

        // Marine fields are absent
        assertNull(result.getWaveHeight());
        assertNull(result.getOceanCurrentVelocity());
        assertNull(result.getSeaSurfaceTemperature());

        // Diving condition is still evaluated using only atmospheric factors
        assertNotNull(result.getDivingCondition());
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Test 4: API fault tolerance — forecast API unavailable
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * API fault tolerance: when callForecastApi() raises RestClientException,
     * the service must return a response with null atmospheric fields and must
     * NOT propagate the error to the caller.
     */
    @Test
    void forecastApiFailure_returnsNullAtmosphericFieldsWithoutThrowing() {
        // Given: no cache
        when(cachedWeatherRepository.findFirstByRoundedLatAndRoundedLngAndCreatedAtAfter(
                any(), any(), any())).thenReturn(Optional.empty());

        // Forecast API: throws RestClientException (e.g. network timeout)
        when(restTemplate.getForEntity(any(URI.class), eq(ForecastApiResponse.class)))
                .thenThrow(new RestClientException("Forecast API unavailable"));

        // Marine API: valid response
        MarineApiResponse marineResponse = buildMarineResponse(0.3, 0.2);
        when(restTemplate.getForEntity(any(URI.class), eq(MarineApiResponse.class)))
                .thenReturn(new ResponseEntity<>(marineResponse, HttpStatus.OK));

        // When / Then: no exception is propagated
        WeatherResponse result = assertDoesNotThrow(
                () -> weatherService.getWeather(36.5, -4.0));

        // Atmospheric fields are null (API failed)
        assertNull(result.getTemperature());
        assertNull(result.getWindSpeed());
        assertNull(result.getVisibility());
        assertNull(result.getWeatherCode());

        // Marine data is still present
        assertEquals(0.3, result.getWaveHeight());
        assertEquals(0.2, result.getOceanCurrentVelocity());
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Helpers
    // ─────────────────────────────────────────────────────────────────────────

    private ForecastApiResponse buildForecastResponse(double temperature, double windSpeed,
            double visibility, int weatherCode, double precipProb) {
        ForecastApiResponse.CurrentWeather current = new ForecastApiResponse.CurrentWeather();
        current.setTemperature(temperature);
        current.setWindSpeed(windSpeed);
        current.setVisibility(visibility);
        current.setWeatherCode(weatherCode);
        current.setPrecipitationProbability(precipProb);

        ForecastApiResponse response = new ForecastApiResponse();
        response.setCurrent(current);
        return response;
    }

    private MarineApiResponse buildMarineResponse(double waveHeight, double oceanCurrentVelocity) {
        MarineApiResponse.CurrentMarine current = new MarineApiResponse.CurrentMarine();
        current.setWaveHeight(waveHeight);
        current.setOceanCurrentVelocity(oceanCurrentVelocity);

        MarineApiResponse response = new MarineApiResponse();
        response.setCurrent(current);
        return response;
    }
}
