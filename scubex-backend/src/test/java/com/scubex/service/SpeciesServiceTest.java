package com.scubex.service;

import com.scubex.DTO.SpeciesResponse;
import com.scubex.model.iNaturalist.INaturalistInfo;
import com.scubex.model.iNaturalist.INaturalistResponse;
import com.scubex.model.obis.ObisOccurrence;
import com.scubex.model.obis.ObisResponse;
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
import java.util.ArrayList;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

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

    @InjectMocks
    private SpeciesService speciesService;

    @BeforeEach
    void setUp() {
        // Inject properties that would normally come from application.properties
        ReflectionTestUtils.setField(speciesService, "obisApiUrl", "https://api.obis.org/v3");
        ReflectionTestUtils.setField(speciesService, "iNaturalistApiUrl", "https://api.inaturalist.org/v1");
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
}
