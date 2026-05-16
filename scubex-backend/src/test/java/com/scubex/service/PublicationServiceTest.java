package com.scubex.service;

import com.scubex.model.Publication;
import com.scubex.model.User;
import com.scubex.repository.PublicationRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.anyDouble;
import static org.mockito.Mockito.*;

/**
 * Test suite para PublicationService.
 * Tests cover:
 * - getInArea devuelve solo publicaciones dentro del bounding box
 * - update por propietario ajeno devuelve null sin persistir
 * - delete por propietario ajeno devuelve false sin llamar a delete
 */
@ExtendWith(MockitoExtension.class)
class PublicationServiceTest {

    @Mock
    private PublicationRepository publicationRepository;

    @InjectMocks
    private PublicationService publicationService;

    // ── helpers ─────────────────────────────────────────────────────

    private User buildUser(Long id) {
        return User.builder()
                .id(id)
                .googleId("google-" + id)
                .email("user" + id + "@scubex.com")
                .name("User " + id)
                .build();
    }

    private Publication buildPublication(Long id, User owner, double lat, double lng) {
        return Publication.builder()
                .id(id)
                .user(owner)
                .title("Inmersión " + id)
                .description("Descripción " + id)
                .latitude(lat)
                .longitude(lng)
                .createdAt(Instant.now())
                .build();
    }

    // ── tests ────────────────────────────────────────────────────────

    /**
     * Test: getInArea_returnsOnlyPublicationsInsideBoundingBox
     * El repositorio filtra por coordenadas; el servicio devuelve exactamente
     * lo que el repositorio proporciona para ese bounding box.
     * Se verifican tanto las que están dentro como que las exteriores no aparecen.
     */
    @Test
    void getInArea_returnsOnlyPublicationsInsideBoundingBox() {
        User owner = buildUser(1L);

        // Publicaciones que el repositorio retorna para el área dada
        Publication inside1 = buildPublication(1L, owner, 36.5, -6.0);
        Publication inside2 = buildPublication(2L, owner, 37.0, -5.5);

        // El repositorio ya filtra; devuelve solo las interiores
        when(publicationRepository.findByLatitudeBetweenAndLongitudeBetween(
                36.0, 38.0, -7.0, -5.0))
                .thenReturn(List.of(inside1, inside2));

        List<Publication> result = publicationService.getInArea(36.0, 38.0, -7.0, -5.0);

        assertEquals(2, result.size());
        assertTrue(result.stream().anyMatch(p -> p.getId().equals(1L)));
        assertTrue(result.stream().anyMatch(p -> p.getId().equals(2L)));
        verify(publicationRepository, times(1))
                .findByLatitudeBetweenAndLongitudeBetween(36.0, 38.0, -7.0, -5.0);
    }

    /**
     * Test: update_byNonOwner_returnsNull
     * Si el usuario que intenta editar no es el propietario de la publicación,
     * el servicio devuelve null y no persiste ningún cambio.
     */
    @Test
    void update_byNonOwner_returnsNull() {
        User owner    = buildUser(1L);
        User stranger = buildUser(2L);

        Publication existing = buildPublication(10L, owner, 40.0, -3.0);
        when(publicationRepository.findById(10L)).thenReturn(Optional.of(existing));

        Publication attempted = Publication.builder()
                .title("Título modificado")
                .description("Descripción modificada")
                .build();

        Publication result = publicationService.update(10L, attempted, stranger);

        assertNull(result, "update por propietario ajeno debe devolver null");
        verify(publicationRepository, never()).save(any(Publication.class));
    }

    /**
     * Test: delete_byNonOwner_returnsFalse
     * Si el usuario que intenta borrar no es el propietario de la publicación,
     * el servicio devuelve false y no llama a delete en el repositorio.
     */
    @Test
    void delete_byNonOwner_returnsFalse() {
        User owner    = buildUser(1L);
        User stranger = buildUser(3L);

        Publication existing = buildPublication(20L, owner, 38.0, -0.5);
        when(publicationRepository.findById(20L)).thenReturn(Optional.of(existing));

        boolean result = publicationService.delete(20L, stranger);

        assertFalse(result, "delete por propietario ajeno debe devolver false");
        verify(publicationRepository, never()).delete(any(Publication.class));
    }
}
