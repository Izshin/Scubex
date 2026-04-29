package com.scubex.controller;

import com.scubex.DTO.WeatherResponse;
import com.scubex.service.WeatherService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * Test suite para WeatherController.
 * Tests cover:
 * - Latitud fuera de rango devuelve 400
 * - Longitud fuera de rango devuelve 400
 * - Límites exactos de coordenadas válidas devuelven 200
 * - Parámetros válidos devuelven 200 con datos meteorológicos
 * - divingCondition se incluye en la respuesta
 */
@ExtendWith(MockitoExtension.class)
class WeatherControllerTest {

    @Mock
    private WeatherService weatherService;

    @InjectMocks
    private WeatherController weatherController;

    private MockMvc mockMvc;

    @BeforeEach
    void setup() {
        mockMvc = MockMvcBuilders.standaloneSetup(weatherController).build();
    }

    // ── validación de parámetros ──────────────────────────────────────

    @Test
    void getWeather_latTooHigh_returns400() throws Exception {
        mockMvc.perform(get("/api/weather")
                        .param("lat", "90.1")
                        .param("lng", "0"))
                .andExpect(status().isBadRequest());

        verify(weatherService, never()).getWeather(anyDouble(), anyDouble());
    }

    @Test
    void getWeather_latTooLow_returns400() throws Exception {
        mockMvc.perform(get("/api/weather")
                        .param("lat", "-90.1")
                        .param("lng", "0"))
                .andExpect(status().isBadRequest());

        verify(weatherService, never()).getWeather(anyDouble(), anyDouble());
    }

    @Test
    void getWeather_lngTooHigh_returns400() throws Exception {
        mockMvc.perform(get("/api/weather")
                        .param("lat", "36.7")
                        .param("lng", "180.1"))
                .andExpect(status().isBadRequest());

        verify(weatherService, never()).getWeather(anyDouble(), anyDouble());
    }

    @Test
    void getWeather_lngTooLow_returns400() throws Exception {
        mockMvc.perform(get("/api/weather")
                        .param("lat", "36.7")
                        .param("lng", "-180.1"))
                .andExpect(status().isBadRequest());

        verify(weatherService, never()).getWeather(anyDouble(), anyDouble());
    }

    // ── límites exactos (frontera) ────────────────────────────────────

    @Test
    void getWeather_exactBoundaryCoords_returns200() throws Exception {
        WeatherResponse resp = WeatherResponse.builder()
                .temperature(20.0).windSpeed(5.0).divingCondition("good").build();
        when(weatherService.getWeather(90.0, 180.0)).thenReturn(resp);

        mockMvc.perform(get("/api/weather")
                        .param("lat", "90")
                        .param("lng", "180"))
                .andExpect(status().isOk());

        verify(weatherService, times(1)).getWeather(90.0, 180.0);
    }

    // ── respuesta exitosa ─────────────────────────────────────────────

    @Test
    void getWeather_validCoords_returns200WithWeatherData() throws Exception {
        WeatherResponse resp = WeatherResponse.builder()
                .temperature(22.5)
                .windSpeed(12.0)
                .windDirection(270.0)
                .waveHeight(1.2)
                .seaSurfaceTemperature(19.0)
                .divingCondition("good")
                .build();
        when(weatherService.getWeather(36.7, -3.7)).thenReturn(resp);

        mockMvc.perform(get("/api/weather")
                        .param("lat", "36.7")
                        .param("lng", "-3.7"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.temperature").value(22.5))
                .andExpect(jsonPath("$.windSpeed").value(12.0))
                .andExpect(jsonPath("$.waveHeight").value(1.2))
                .andExpect(jsonPath("$.divingCondition").value("good"));

        verify(weatherService, times(1)).getWeather(36.7, -3.7);
    }

    @Test
    void getWeather_validCoords_divingConditionBadIncluded() throws Exception {
        WeatherResponse resp = WeatherResponse.builder()
                .temperature(15.0)
                .waveHeight(3.5)
                .divingCondition("bad")
                .build();
        when(weatherService.getWeather(43.0, -8.0)).thenReturn(resp);

        mockMvc.perform(get("/api/weather")
                        .param("lat", "43.0")
                        .param("lng", "-8.0"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.divingCondition").value("bad"));
    }
}
