package com.scubex.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.scubex.model.User;
import com.scubex.service.JwtService;
import com.scubex.service.UserService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.MediaType;
import org.springframework.http.HttpStatus;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Map;

import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * Test suite para ProfileController.
 * Tests cover:
 * - GET /api/profile sin autenticación devuelve 401
 * - GET /api/profile con usuario válido devuelve datos del perfil
 * - PUT /api/profile actualiza y devuelve nuevo token
 * - DELETE /api/profile elimina la cuenta y devuelve 204
 * - GET /api/profile con usuario no encontrado devuelve 404
 */
@ExtendWith(MockitoExtension.class)
class ProfileControllerTest {

    @Mock private UserService userService;
    @Mock private JwtService jwtService;
    @Mock private AuthHelper authHelper;

    @InjectMocks
    private ProfileController profileController;

    private MockMvc mockMvc;
    private final ObjectMapper mapper = new ObjectMapper();

    private final UsernamePasswordAuthenticationToken principal =
            new UsernamePasswordAuthenticationToken("gid-1", null, List.of());

    private User buildUser() {
        return User.builder()
                .id(1L).googleId("gid-1")
                .email("user@scubex.com").name("Carlos Díaz")
                .build();
    }

    @BeforeEach
    void setup() {
        mockMvc = MockMvcBuilders.standaloneSetup(profileController).build();
    }

    // ── GET /api/profile ──────────────────────────────────────────────

    @Test
    void getProfile_unauthenticated_returns401() throws Exception {
        when(authHelper.getUser(null))
                .thenThrow(new ResponseStatusException(HttpStatus.UNAUTHORIZED));

        mockMvc.perform(get("/api/profile"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void getProfile_authenticated_returnsProfileData() throws Exception {
        User user = buildUser();
        when(authHelper.getUser(any())).thenReturn(user);

        mockMvc.perform(get("/api/profile").principal(principal))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.email").value("user@scubex.com"))
                .andExpect(jsonPath("$.name").value("Carlos Díaz"));
    }

    @Test
    void getProfile_userNotFound_returns404() throws Exception {
        when(authHelper.getUser(any()))
                .thenThrow(new ResponseStatusException(HttpStatus.NOT_FOUND));

        mockMvc.perform(get("/api/profile").principal(principal))
                .andExpect(status().isNotFound());
    }

    // ── PUT /api/profile ──────────────────────────────────────────────

    @Test
    void updateProfile_validBody_returnsNewToken() throws Exception {
        User user = buildUser();
        User updated = User.builder()
                .id(1L).googleId("gid-1")
                .email("user@scubex.com").name("Carlos Díaz")
                .customName("Carlos D.").customPictureUrl("https://new.pic")
                .build();

        when(authHelper.getUser(any())).thenReturn(user);
        when(userService.updateProfile("gid-1", "Carlos D.", "https://new.pic")).thenReturn(updated);
        when(jwtService.generateToken(updated)).thenReturn("new.jwt.token");

        mockMvc.perform(put("/api/profile")
                        .principal(principal)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(mapper.writeValueAsString(
                                Map.of("customName", "Carlos D.", "customPictureUrl", "https://new.pic"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.token").value("new.jwt.token"))
                .andExpect(jsonPath("$.user.email").value("user@scubex.com"));
    }

    @Test
    void updateProfile_unauthenticated_returns401() throws Exception {
        when(authHelper.getUser(null))
                .thenThrow(new ResponseStatusException(HttpStatus.UNAUTHORIZED));

        mockMvc.perform(put("/api/profile")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(mapper.writeValueAsString(Map.of("customName", "X"))))
                .andExpect(status().isUnauthorized());
    }

    // ── DELETE /api/profile ───────────────────────────────────────────

    @Test
    void deleteAccount_authenticated_returns204() throws Exception {
        User user = buildUser();
        when(authHelper.getUser(any())).thenReturn(user);
        doNothing().when(userService).deleteAccount("gid-1");

        mockMvc.perform(delete("/api/profile").principal(principal))
                .andExpect(status().isNoContent());

        verify(userService, times(1)).deleteAccount("gid-1");
    }

    @Test
    void deleteAccount_unauthenticated_returns401() throws Exception {
        when(authHelper.getUser(null))
                .thenThrow(new ResponseStatusException(HttpStatus.UNAUTHORIZED));

        mockMvc.perform(delete("/api/profile"))
                .andExpect(status().isUnauthorized());
    }
}
