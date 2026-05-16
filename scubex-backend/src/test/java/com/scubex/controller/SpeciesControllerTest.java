package com.scubex.controller;

import com.scubex.DTO.SpeciesResponse;
import com.scubex.service.SpeciesService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.util.List;

import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * Test suite para SpeciesController.
 * Tests cover:
 * - Coordenadas inválidas (lat fuera de rango) devuelven 400
 * - Coordenadas inválidas (lng fuera de rango) devuelven 400
 * - Radio negativo devuelve 400
 * - Radio cero devuelve 400
 * - Parámetros válidos devuelven 200 con lista de especies
 * - Lista vacía devuelve 200 con array vacío
 */
@ExtendWith(MockitoExtension.class)
class SpeciesControllerTest {

    @Mock
    private SpeciesService speciesService;

    @InjectMocks
    private SpeciesController speciesController;

    private MockMvc mockMvc;

    @BeforeEach
    void setup() {
        mockMvc = MockMvcBuilders.standaloneSetup(speciesController).build();
    }

    // ── validación de parámetros ──────────────────────────────────────

    @Test
    void getSpecies_latTooHigh_returns400() throws Exception {
        mockMvc.perform(get("/api/species")
                        .param("lat", "91")
                        .param("lng", "-3.7")
                        .param("radius", "1000"))
                .andExpect(status().isBadRequest());

        verify(speciesService, never()).getSpeciesInSelectedArea(anyDouble(), anyDouble(), anyDouble());
    }

    @Test
    void getSpecies_latTooLow_returns400() throws Exception {
        mockMvc.perform(get("/api/species")
                        .param("lat", "-91")
                        .param("lng", "0")
                        .param("radius", "500"))
                .andExpect(status().isBadRequest());

        verify(speciesService, never()).getSpeciesInSelectedArea(anyDouble(), anyDouble(), anyDouble());
    }

    @Test
    void getSpecies_lngTooHigh_returns400() throws Exception {
        mockMvc.perform(get("/api/species")
                        .param("lat", "36.7")
                        .param("lng", "181")
                        .param("radius", "1000"))
                .andExpect(status().isBadRequest());

        verify(speciesService, never()).getSpeciesInSelectedArea(anyDouble(), anyDouble(), anyDouble());
    }

    @Test
    void getSpecies_negativeRadius_returns400() throws Exception {
        mockMvc.perform(get("/api/species")
                        .param("lat", "36.7")
                        .param("lng", "-3.7")
                        .param("radius", "-1"))
                .andExpect(status().isBadRequest());

        verify(speciesService, never()).getSpeciesInSelectedArea(anyDouble(), anyDouble(), anyDouble());
    }

    @Test
    void getSpecies_zeroRadius_returns400() throws Exception {
        mockMvc.perform(get("/api/species")
                        .param("lat", "36.7")
                        .param("lng", "-3.7")
                        .param("radius", "0"))
                .andExpect(status().isBadRequest());

        verify(speciesService, never()).getSpeciesInSelectedArea(anyDouble(), anyDouble(), anyDouble());
    }

    // ── respuestas exitosas ───────────────────────────────────────────

    @Test
    void getSpecies_validParams_returns200WithSpeciesList() throws Exception {
        SpeciesResponse sp = SpeciesResponse.builder()
                .scientificName("Diplodus sargus")
                .commonName("Sargo")
                .latitude(36.7)
                .longitude(-3.7)
                .numberOfOccurrences(12)
                .build();

        when(speciesService.getSpeciesInSelectedArea(36.7, -3.7, 1000.0))
                .thenReturn(List.of(sp));

        mockMvc.perform(get("/api/species")
                        .param("lat", "36.7")
                        .param("lng", "-3.7")
                        .param("radius", "1000"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].scientificName").value("Diplodus sargus"))
                .andExpect(jsonPath("$[0].commonName").value("Sargo"));

        verify(speciesService, times(1)).getSpeciesInSelectedArea(36.7, -3.7, 1000.0);
    }

    @Test
    void getSpecies_noResults_returns200WithEmptyList() throws Exception {
        when(speciesService.getSpeciesInSelectedArea(anyDouble(), anyDouble(), anyDouble()))
                .thenReturn(List.of());

        mockMvc.perform(get("/api/species")
                        .param("lat", "0")
                        .param("lng", "0")
                        .param("radius", "500"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray())
                .andExpect(jsonPath("$").isEmpty());
    }
}
