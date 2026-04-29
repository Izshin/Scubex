package com.scubex.service;

import com.scubex.model.Publication;
import com.scubex.model.User;
import com.scubex.repository.*;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

/**
 * Test suite para UserService.
 * Tests cover:
 * - findOrCreate: usuario nuevo, existente, datos originales preservados
 * - findByGoogleId: encontrado y no encontrado
 * - findByEmail: encontrado y no encontrado
 * - findById: encontrado y no encontrado
 * - updateProfile: actualiza customName y customPictureUrl
 * - deleteAccount: usuario inexistente no lanza excepción
 * - deleteAccount: borra todas las relaciones y el usuario
 */
@ExtendWith(MockitoExtension.class)
class UserServiceTest {

    @Mock private UserRepository userRepository;
    @Mock private NotificationRepository notificationRepository;
    @Mock private UserFollowRepository userFollowRepository;
    @Mock private PublicationRepository publicationRepository;
    @Mock private CommentRepository commentRepository;
    @Mock private PublicationLikeRepository publicationLikeRepository;
    @Mock private PublicationSaveRepository publicationSaveRepository;

    @InjectMocks
    private UserService userService;

    // ── helpers ───────────────────────────────────────────────────────

    private User buildUser(Long id, String googleId, String email) {
        return User.builder().id(id).googleId(googleId).email(email).name("User " + id).build();
    }

    // ── findOrCreate ──────────────────────────────────────────────────

    @Test
    void findOrCreate_newUser_savesAndReturns() {
        when(userRepository.findByGoogleId("google-new")).thenReturn(Optional.empty());
        User saved = buildUser(1L, "google-new", "new@scubex.com");
        when(userRepository.save(any(User.class))).thenReturn(saved);

        User result = userService.findOrCreate("google-new", "new@scubex.com", "New User", "https://pic.url");

        assertEquals("google-new", result.getGoogleId());
        verify(userRepository, times(1)).save(any(User.class));
    }

    @Test
    void findOrCreate_existingUser_returnsWithoutSaving() {
        User existing = buildUser(2L, "google-existing", "existing@scubex.com");
        when(userRepository.findByGoogleId("google-existing")).thenReturn(Optional.of(existing));

        User result = userService.findOrCreate("google-existing", "x@x.com", "X", "https://x");

        assertEquals(2L, result.getId());
        verify(userRepository, never()).save(any(User.class));
    }

    @Test
    void findOrCreate_existingUser_returnsOriginalData() {
        User existing = buildUser(3L, "google-abc", "original@scubex.com");
        when(userRepository.findByGoogleId("google-abc")).thenReturn(Optional.of(existing));

        User result = userService.findOrCreate("google-abc", "new@email.com", "New Name", "https://new.pic");

        assertEquals("original@scubex.com", result.getEmail());
    }

    // ── findByGoogleId ────────────────────────────────────────────────

    @Test
    void findByGoogleId_found_returnsUser() {
        User user = buildUser(1L, "gid-1", "a@b.com");
        when(userRepository.findByGoogleId("gid-1")).thenReturn(Optional.of(user));

        User result = userService.findByGoogleId("gid-1");

        assertNotNull(result);
        assertEquals("gid-1", result.getGoogleId());
    }

    @Test
    void findByGoogleId_notFound_returnsNull() {
        when(userRepository.findByGoogleId("missing")).thenReturn(Optional.empty());

        assertNull(userService.findByGoogleId("missing"));
    }

    // ── findByEmail ───────────────────────────────────────────────────

    @Test
    void findByEmail_found_returnsUser() {
        User user = buildUser(2L, "gid-2", "found@scubex.com");
        when(userRepository.findByEmail("found@scubex.com")).thenReturn(Optional.of(user));

        User result = userService.findByEmail("found@scubex.com");

        assertNotNull(result);
        assertEquals("found@scubex.com", result.getEmail());
    }

    @Test
    void findByEmail_notFound_returnsNull() {
        when(userRepository.findByEmail("nobody@scubex.com")).thenReturn(Optional.empty());

        assertNull(userService.findByEmail("nobody@scubex.com"));
    }

    // ── findById ──────────────────────────────────────────────────────

    @Test
    void findById_found_returnsUser() {
        User user = buildUser(5L, "gid-5", "five@scubex.com");
        when(userRepository.findById(5L)).thenReturn(Optional.of(user));

        User result = userService.findById(5L);

        assertNotNull(result);
        assertEquals(5L, result.getId());
    }

    @Test
    void findById_notFound_returnsNull() {
        when(userRepository.findById(99L)).thenReturn(Optional.empty());

        assertNull(userService.findById(99L));
    }

    // ── updateProfile ─────────────────────────────────────────────────

    @Test
    void updateProfile_setsCustomFieldsAndSaves() {
        User user = buildUser(10L, "gid-update", "u@scubex.com");
        when(userRepository.findByGoogleId("gid-update")).thenReturn(Optional.of(user));
        when(userRepository.save(any(User.class))).thenAnswer(inv -> inv.getArgument(0));

        User result = userService.updateProfile("gid-update", "Nuevo Nombre", "https://newpic.png");

        assertEquals("Nuevo Nombre", result.getCustomName());
        assertEquals("https://newpic.png", result.getCustomPictureUrl());
        verify(userRepository, times(1)).save(user);
    }

    // ── deleteAccount ─────────────────────────────────────────────────

    @Test
    void deleteAccount_userNotFound_doesNothing() {
        when(userRepository.findByGoogleId("ghost")).thenReturn(Optional.empty());

        assertDoesNotThrow(() -> userService.deleteAccount("ghost"));
        verify(userRepository, never()).delete(any(User.class));
    }

    @Test
    void deleteAccount_deletesAllRelationsAndUser() {
        User user = buildUser(20L, "gid-del", "del@scubex.com");
        when(userRepository.findByGoogleId("gid-del")).thenReturn(Optional.of(user));

        Publication pub = Publication.builder().id(100L).user(user).title("T")
                .latitude(0.0).longitude(0.0).build();
        when(publicationRepository.findByUser(user)).thenReturn(List.of(pub));

        userService.deleteAccount("gid-del");

        verify(notificationRepository).deleteAllByRecipientId(20L);
        verify(userFollowRepository).deleteAllByFollowerId(20L);
        verify(userFollowRepository).deleteAllByFollowedId(20L);
        verify(commentRepository).deleteAllByPublicationIdIn(List.of(100L));
        verify(publicationLikeRepository).deleteAllByPublicationIdIn(List.of(100L));
        verify(publicationSaveRepository).deleteAllByPublicationIdIn(List.of(100L));
        verify(commentRepository).deleteAllByUserId(20L);
        verify(publicationLikeRepository).deleteAllByUserId(20L);
        verify(publicationSaveRepository).deleteAllByUserId(20L);
        verify(publicationRepository).deleteAll(List.of(pub));
        verify(userRepository).delete(user);
    }
}
