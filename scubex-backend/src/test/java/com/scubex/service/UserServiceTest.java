package com.scubex.service;

import com.scubex.model.User;
import com.scubex.repository.UserRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

/**
 * Test suite para UserService.
 * Tests cover:
 * - Usuario nuevo se crea y se guarda en BD
 * - Usuario existente se devuelve sin crear uno nuevo
 */
@ExtendWith(MockitoExtension.class)
class UserServiceTest {

    @Mock
    private UserRepository userRepository;

    @InjectMocks
    private UserService userService;

    /**
     * Test: findOrCreate_newUser_savesAndReturns
     * Si no existe el googleId en BD, debe crear y guardar el usuario.
     */
    @Test
    void findOrCreate_newUser_savesAndReturns() {
        when(userRepository.findByGoogleId("google-new")).thenReturn(Optional.empty());

        User saved = User.builder()
                .id(1L)
                .googleId("google-new")
                .email("new@scubex.com")
                .name("New User")
                .pictureUrl("https://pic.url")
                .build();
        when(userRepository.save(any(User.class))).thenReturn(saved);

        User result = userService.findOrCreate("google-new", "new@scubex.com", "New User", "https://pic.url");

        assertEquals("google-new", result.getGoogleId());
        assertEquals("new@scubex.com", result.getEmail());
        verify(userRepository, times(1)).save(any(User.class));
    }

    /**
     * Test: findOrCreate_existingUser_returnsWithoutSaving
     * Si ya existe el googleId en BD, debe devolver el existente sin hacer save.
     */
    @Test
    void findOrCreate_existingUser_returnsWithoutSaving() {
        User existing = User.builder()
                .id(2L)
                .googleId("google-existing")
                .email("existing@scubex.com")
                .name("Existing User")
                .pictureUrl("https://existing.pic")
                .build();
        when(userRepository.findByGoogleId("google-existing")).thenReturn(Optional.of(existing));

        User result = userService.findOrCreate("google-existing", "existing@scubex.com", "Existing User", "https://existing.pic");

        assertEquals(2L, result.getId());
        verify(userRepository, never()).save(any(User.class));
    }

    /**
     * Test: findOrCreate_updatesNameAndPicture_onExistingUser
     * El usuario existente se devuelve con sus datos originales de BD (no se sobreescriben).
     */
    @Test
    void findOrCreate_existingUser_returnsOriginalData() {
        User existing = User.builder()
                .id(3L)
                .googleId("google-abc")
                .email("original@scubex.com")
                .name("Original Name")
                .pictureUrl("https://original.pic")
                .build();
        when(userRepository.findByGoogleId("google-abc")).thenReturn(Optional.of(existing));

        User result = userService.findOrCreate("google-abc", "new@email.com", "New Name", "https://new.pic");

        // Debe devolver los datos originales de BD
        assertEquals("Original Name", result.getName());
        assertEquals("original@scubex.com", result.getEmail());
    }
}
