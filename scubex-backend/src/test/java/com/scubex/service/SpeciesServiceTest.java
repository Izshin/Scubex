package com.scubex.service;

import com.scubex.DTO.SpeciesResponse;
import com.scubex.model.iNaturalist.INaturalistInfo;
import com.scubex.model.iNaturalist.INaturalistResponse;
import com.scubex.model.obis.ObisOccurrence;
import com.scubex.model.obis.ObisResponse;
import com.scubex.model.SpeciesEnrichmentCache;
import com.scubex.repository.CachedScanRepository;
import com.scubex.repository.SpeciesEnrichmentCacheRepository;
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
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;
import org.mockito.quality.Strictness;
import org.mockito.junit.jupiter.MockitoSettings;

/**
 * Test suite for SpeciesService following TDD approach
 * Tests cover:
 * - WKT Polygon generation
 * - Microorganism filtering (total_results=0)
 * - Species enrichment with iNaturalist data
 * - Resilience to API timeouts
 */
@ExtendWith(MockitoExtension.class)
class SpeciesServiceTest {

    @Mock
    private RestTemplate restTemplate;

    @Mock
    private CachedScanRepository cachedScanRepository;

    @Mock
    private SpeciesEnrichmentCacheRepository speciesEnrichmentCacheRepository;

    @InjectMocks
    private SpeciesService speciesService;

    @BeforeEach
    void setUp() {
        // Inject properties that would normally come from application.properties
        ReflectionTestUtils.setField(speciesService, "obisApiUrl", "https://api.obis.org/v3");
        ReflectionTestUtils.setField(speciesService, "iNaturalistApiUrl", "https://api.inaturalist.org/v1");

        // Default: no cache hits (L1)
        when(cachedScanRepository.findFirstByRoundedLatAndRoundedLngAndRadiusGreaterThanEqualAndCreatedAtAfterOrderByRadiusDesc(
                any(Double.class), any(Double.class), any(Double.class), any(Instant.class)))
                .thenReturn(Optional.empty());

        // Default: no enrichment cache hits (L2) — lenient: no todos los tests llegan a esta rama
        lenient().when(speciesEnrichmentCacheRepository.findByScientificNameAndCachedAtAfter(
                any(String.class), any(Instant.class)))
                .thenReturn(Optional.empty());
    }

    /**
     * Test: shouldGenerateValidWKTPolygon
     * Verifica que, dado un punto (36.5, -4.0) y radio 5000m, 
     * se genera un String POLYGON((...)) geométricamente cerrado
     * (primer y último punto idénticos).
     */
    @Test
    void shouldGenerateValidWKTPolygon() {
        // Given: Coordenadas del sur de España
        double lat = 36.5;
        double lng = -4.0;
        double radius = 5000.0; // 5km

        // Mock OBIS response (vacía para este test)
        ObisResponse obisResponse = new ObisResponse();
        obisResponse.setTotal(0);
        obisResponse.setResults(new ArrayList<>());
        
        when(restTemplate.getForEntity(any(URI.class), eq(ObisResponse.class)))
                .thenReturn(new ResponseEntity<>(obisResponse, HttpStatus.OK));

        // When: Llamamos al servicio
        List<SpeciesResponse> result = speciesService.getSpeciesInSelectedArea(lat, lng, radius);

        // Then: Verificamos que se generó un URI válido con POLYGON
        verify(restTemplate).getForEntity(argThat(uri -> {
            String uriString = uri.toString();
            
            // Debe contener "geometry=POLYGON"
            assertTrue(uriString.contains("geometry=POLYGON"), 
                    "URI should contain POLYGON geometry");
            
            // Extraer el polígono de la URI
            int startIdx = uriString.indexOf("POLYGON((") + 9;
            int endIdx = uriString.indexOf("))", startIdx);
            
            if (startIdx > 9 && endIdx > startIdx) {
                String coords = uriString.substring(startIdx, endIdx);
                String[] points = coords.split(",");
                
                // Debe tener al menos 4 puntos (triángulo cerrado = 4 puntos)
                assertTrue(points.length >= 4, 
                        "Polygon should have at least 4 points (closed triangle)");
                
                // Primer y último punto deben ser idénticos (polígono cerrado)
                // Normalizar espacios y comparar
                String firstPoint = points[0].replaceAll("%20", "").trim();
                String lastPoint = points[points.length - 1].replaceAll("%20", "").trim();
                
                assertEquals(firstPoint, lastPoint, 
                        "First and last points must be identical (closed polygon)");
                
                return true;
            }
            
            return false;
        }), eq(ObisResponse.class));

        // El resultado debe ser vacío (no hay datos en OBIS)
        assertTrue(result.isEmpty(), "Result should be empty for this test");
    }

    /**
     * Test: shouldFilterMicroorganismsWithZeroResults
     * Mockea una respuesta de OBIS con Pycnococcaceae y simula total_results=0 
     * en iNaturalist. Verifica que la lista final de SpeciesResponse está vacía.
     */
    @Test
    void shouldFilterMicroorganismsWithZeroResults() {
        // Given: OBIS devuelve un microorganismo
        ObisOccurrence microorganism = new ObisOccurrence();
        microorganism.setScientificName("Pycnococcaceae");
        microorganism.setPhylum("Cyanobacteria");
        microorganism.setDecimalLatitude(36.5);
        microorganism.setDecimalLongitude(-4.0);
        microorganism.setEventDate("2023-08-15");

        ObisResponse obisResponse = new ObisResponse();
        obisResponse.setTotal(1);
        obisResponse.setResults(List.of(microorganism));

        // iNaturalist devuelve total_results=0 (no existe en su base de datos)
        INaturalistResponse iNatResponse = new INaturalistResponse();
        iNatResponse.setTotalResults(0);
        iNatResponse.setResults(new ArrayList<>());

        // Mock both API calls
        when(restTemplate.getForEntity(any(URI.class), eq(ObisResponse.class)))
                .thenReturn(new ResponseEntity<>(obisResponse, HttpStatus.OK));
        
        when(restTemplate.getForEntity(any(URI.class), eq(INaturalistResponse.class)))
                .thenReturn(new ResponseEntity<>(iNatResponse, HttpStatus.OK));

        // When: Llamamos al servicio
        List<SpeciesResponse> result = speciesService.getSpeciesInSelectedArea(36.5, -4.0, 5000.0);

        // Then: La lista debe estar vacía (microorganismo filtrado)
        assertTrue(result.isEmpty(), 
                "Microorganisms with total_results=0 should be filtered out");
        
        // Verificamos que se llamó a ambas APIs
        verify(restTemplate).getForEntity(any(URI.class), eq(ObisResponse.class));
        verify(restTemplate).getForEntity(any(URI.class), eq(INaturalistResponse.class));
    }

    /**
     * Test: shouldEnrichSpeciesWithPhoto
     * Mockea OBIS devolviendo Chimaera monstrosa e iNaturalist devolviendo 
     * foto + nombre común. Verifica que SpeciesResponse.photoUrl no es null 
     * y commonName == "Rabbit Fish".
     */
    @Test
    void shouldEnrichSpeciesWithPhoto() {
        // Given: OBIS devuelve Chimaera monstrosa
        ObisOccurrence occurrence = new ObisOccurrence();
        occurrence.setScientificName("Chimaera monstrosa");
        occurrence.setPhylum("Chordata");
        occurrence.setDecimalLatitude(36.7203);
        occurrence.setDecimalLongitude(-4.4214);
        occurrence.setEventDate("2023-08-15");

        ObisResponse obisResponse = new ObisResponse();
        obisResponse.setTotal(1);
        obisResponse.setResults(List.of(occurrence));

        // iNaturalist devuelve foto y nombre común
        INaturalistInfo iNatInfo = new INaturalistInfo();
        iNatInfo.setPreferred_common_name("Rabbit Fish");
        iNatInfo.setPhotoUrl("https://inaturalist-open-data.s3.amazonaws.com/photos/12345/medium.jpg");

        INaturalistResponse iNatResponse = new INaturalistResponse();
        iNatResponse.setTotalResults(1203);
        iNatResponse.setResults(List.of(iNatInfo));

        // Mock both API calls
        when(restTemplate.getForEntity(any(URI.class), eq(ObisResponse.class)))
                .thenReturn(new ResponseEntity<>(obisResponse, HttpStatus.OK));
        
        when(restTemplate.getForEntity(any(URI.class), eq(INaturalistResponse.class)))
                .thenReturn(new ResponseEntity<>(iNatResponse, HttpStatus.OK));

        // When: Llamamos al servicio
        List<SpeciesResponse> result = speciesService.getSpeciesInSelectedArea(36.7, -4.4, 5000.0);

        // Then: Debe devolver la especie enriquecida con foto y nombre común
        assertFalse(result.isEmpty(), "Result should contain one species");
        assertEquals(1, result.size(), "Should return exactly one species");

        SpeciesResponse species = result.get(0);
        assertEquals("Chimaera monstrosa", species.getScientificName());
        assertEquals("Rabbit Fish", species.getCommonName(), 
                "Common name should be 'Rabbit Fish'");
        assertNotNull(species.getPhotoUrl(), 
                "Photo URL should not be null");
        assertTrue(species.getPhotoUrl().contains("inaturalist"), 
                "Photo URL should be from iNaturalist");
        assertEquals(36.7203, species.getLatitude());
        assertEquals(-4.4214, species.getLongitude());
    }

    /**
     * Test: shouldHandleINaturalistTimeout
     * Simula timeout en petición a iNaturalist. Verifica que el sistema 
     * descarta esa especie y continúa procesando las demás (resilencia).
     */
    @Test
    void shouldHandleINaturalistTimeout() {
        // Given: OBIS devuelve DOS especies
        ObisOccurrence species1 = new ObisOccurrence();
        species1.setScientificName("Octopus vulgaris");
        species1.setPhylum("Mollusca");
        species1.setDecimalLatitude(36.5);
        species1.setDecimalLongitude(-4.0);
        species1.setEventDate("2023-08-15");

        ObisOccurrence species2 = new ObisOccurrence();
        species2.setScientificName("Sepia officinalis");
        species2.setPhylum("Mollusca");
        species2.setDecimalLatitude(36.6);
        species2.setDecimalLongitude(-4.1);
        species2.setEventDate("2023-08-16");

        ObisResponse obisResponse = new ObisResponse();
        obisResponse.setTotal(2);
        obisResponse.setResults(List.of(species1, species2));

        // iNaturalist: primera llamada falla (timeout), segunda funciona
        INaturalistInfo iNatInfo2 = new INaturalistInfo();
        iNatInfo2.setPreferred_common_name("Common Cuttlefish");
        iNatInfo2.setPhotoUrl("https://inaturalist-open-data.s3.amazonaws.com/photos/67890/medium.jpg");

        INaturalistResponse iNatResponse2 = new INaturalistResponse();
        iNatResponse2.setTotalResults(850);
        iNatResponse2.setResults(List.of(iNatInfo2));

        // Mock OBIS (siempre funciona)
        when(restTemplate.getForEntity(any(URI.class), eq(ObisResponse.class)))
                .thenReturn(new ResponseEntity<>(obisResponse, HttpStatus.OK));

        // Mock iNaturalist: primera llamada falla, segunda funciona
        when(restTemplate.getForEntity(any(URI.class), eq(INaturalistResponse.class)))
                .thenThrow(new RestClientException("Connection timeout"))  // Primera especie: fallo
                .thenReturn(new ResponseEntity<>(iNatResponse2, HttpStatus.OK));  // Segunda especie: éxito

        // When: Llamamos al servicio
        List<SpeciesResponse> result = speciesService.getSpeciesInSelectedArea(36.5, -4.0, 5000.0);

        // Then: Debe devolver solo UNA especie (la que no falló)
        assertEquals(1, result.size(), 
                "Should return one species despite one iNaturalist failure");
        
        SpeciesResponse species = result.get(0);
        // No asumimos el orden, pero verificamos que tiene datos válidos
        assertNotNull(species.getScientificName(), 
                "Species should have a scientific name");
        assertNotNull(species.getCommonName(), 
                "Species should have a common name");
        assertNotNull(species.getPhotoUrl(), 
                "Species should have a photo URL");
        
        // Verificamos que es una de las dos especies esperadas
        assertTrue(
            species.getScientificName().equals("Octopus vulgaris") || 
            species.getScientificName().equals("Sepia officinalis"),
            "Should be one of the expected species"
        );

        // Verificamos que se llamó a iNaturalist DOS veces (una falló, otra funcionó)
        verify(restTemplate, times(2))
                .getForEntity(any(URI.class), eq(INaturalistResponse.class));
    }

    /**
     * Test: shouldFetchEcoStatsAndPopulateDepthTemperatureAndIucn
     *
     * Cubre los tres lambdas de callObisEcoStats (lambda$7, lambda$8, lambda$9) que
     * capturan scientificName (String) y son invocados via CompletableFuture.supplyAsync.
     * Los tests anteriores no mockeaban las llamadas con Map.class, por lo que Mockito
     * devolvía null → NullPointerException silenciosa → los lambdas nunca ejecutaban
     * sus ramas internas.
     *
     * Este test mockeA los tres endpoints de OBIS eco-stats con datos reales:
     * - /statistics            → globalRecords, firstYear, lastYear
     * - /statistics/env        → depthMin, depthMax, tempMin, tempMax  (lambda$8)
     * - /checklist/redlist     → iucnCategory
     */
    @Test
    @SuppressWarnings("unchecked")
    void shouldFetchEcoStatsAndPopulateDepthTemperatureAndIucn() {
        // Given: una única especie en OBIS
        ObisOccurrence occurrence = new ObisOccurrence();
        occurrence.setScientificName("Octopus vulgaris");
        occurrence.setPhylum("Mollusca");
        occurrence.setDecimalLatitude(36.5);
        occurrence.setDecimalLongitude(-4.0);
        occurrence.setEventDate("2024-03-01");

        ObisResponse obisResponse = new ObisResponse();
        obisResponse.setTotal(1);
        obisResponse.setResults(List.of(occurrence));

        when(restTemplate.getForEntity(any(URI.class), eq(ObisResponse.class)))
                .thenReturn(new ResponseEntity<>(obisResponse, HttpStatus.OK));

        // iNaturalist: respuesta válida
        INaturalistInfo info = new INaturalistInfo();
        info.setPreferred_common_name("Common Octopus");
        info.setPhotoUrl("https://inaturalist-open-data.s3.amazonaws.com/photos/1/medium.jpg");

        INaturalistResponse iNatResponse = new INaturalistResponse();
        iNatResponse.setTotalResults(5000);
        iNatResponse.setResults(List.of(info));

        when(restTemplate.getForEntity(any(URI.class), eq(INaturalistResponse.class)))
                .thenReturn(new ResponseEntity<>(iNatResponse, HttpStatus.OK));

        // OBIS /statistics  → globalRecords=1500, firstYear=1980, lastYear=2024
        Map<String, Object> statsBody = new HashMap<>();
        statsBody.put("records", 1500);
        statsBody.put("yearrange", List.of(1980, 2024));

        when(restTemplate.getForEntity(
                argThat((URI uri) -> uri != null && uri.toString().contains("/statistics")
                        && !uri.toString().contains("/env")
                        && !uri.toString().contains("redlist")),
                eq(Map.class)))
                .thenReturn(new ResponseEntity<>(statsBody, HttpStatus.OK));

        // OBIS /statistics/env  → depthMin=5, depthMax=40, tempMin=18, tempMax=26
        // Dos entradas de profundidad y dos de temperatura para ejercitar los min/max
        Map<String, Object> envBody = new HashMap<>();
        envBody.put("depth", List.of(
                Map.of("from", 5,  "records", 100),
                Map.of("from", 40, "records", 50)));
        envBody.put("sst", List.of(
                Map.of("sst", 18, "records", 80),
                Map.of("sst", 26, "records", 60)));

        when(restTemplate.getForEntity(
                argThat((URI uri) -> uri != null && uri.toString().contains("/statistics/env")),
                eq(Map.class)))
                .thenReturn(new ResponseEntity<>(envBody, HttpStatus.OK));

        // OBIS /checklist/redlist  → category=LC
        Map<String, Object> redlistResult = new HashMap<>();
        redlistResult.put("category", "LC");
        Map<String, Object> redlistBody = new HashMap<>();
        redlistBody.put("results", List.of(redlistResult));

        when(restTemplate.getForEntity(
                argThat((URI uri) -> uri != null && uri.toString().contains("redlist")),
                eq(Map.class)))
                .thenReturn(new ResponseEntity<>(redlistBody, HttpStatus.OK));

        // When
        List<SpeciesResponse> result = speciesService.getSpeciesInSelectedArea(36.5, -4.0, 5000.0);

        // Then: la especie tiene todos los campos de eco-estadísticas rellenos
        assertFalse(result.isEmpty(), "Debe devolver al menos una especie");
        SpeciesResponse species = result.get(0);

        assertEquals("Octopus vulgaris", species.getScientificName());
        assertEquals("Common Octopus",   species.getCommonName());
        assertEquals("LC",               species.getIucnCategory());
        assertEquals(1500,               species.getGlobalRecords());
        assertEquals(1980,               species.getFirstYear());
        assertEquals(2024,               species.getLastYear());
        assertEquals(5,                  species.getDepthMin());
        assertEquals(40,                 species.getDepthMax());
        assertEquals(18,                 species.getTempMin());
        assertEquals(26,                 species.getTempMax());
    }
}
