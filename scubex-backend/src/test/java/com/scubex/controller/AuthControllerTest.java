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
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.client.RestTemplate;

import java.util.Map;

import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * Test suite para AuthController.
 * Tests cover:
 * - Credencial vac�a devuelve 400
 * - Credencial inv�lida (Google rechaza) devuelve 401
 * - Credencial v�lida devuelve 200 con token y datos de usuario
 */
@ExtendWith(MockitoExtension.class)
class AuthControllerTest {

    @Mock
    private UserService userService;

    @Mock
    private JwtService jwtService;

    @Mock
    private RestTemplate restTemplate;

    @InjectMocks
    private AuthController authController;

    private MockMvc mockMvc;
    private final ObjectMapper objectMapper = new ObjectMapper();

    private static final String CLIENT_ID = "252744646128-cjav2fij0vfbauvb11co4qtrgq27cd7p.apps.googleusercontent.com";

    @BeforeEach
    void setup() {
        ReflectionTestUtils.setField(authController, "googleClientId", CLIENT_ID);
        mockMvc = MockMvcBuilders.standaloneSetup(authController).build();
    }

    @Test
    void login_missingCredential_returns400() throws Exception {
        mockMvc.perform(post("/api/auth/google")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(Map.of())))
                .andExpect(status().isBadRequest());
    }

    @Test
    void login_googleRejectsToken_returns401() throws Exception {
        when(restTemplate.getForObject(anyString(), eq(Map.class)))
                .thenThrow(new RuntimeException("Google rejected token"));

        mockMvc.perform(post("/api/auth/google")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(Map.of("credential", "bad-token"))))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @SuppressWarnings("unchecked")
    void login_validCredential_returns200WithToken() throws Exception {
        Map<String, String> googleInfo = Map.of(
                "sub", "google-123",
                "email", "user@scubex.com",
                "name", "Test User",
                "picture", "https://pic.url",
                "aud", CLIENT_ID
        );
        when(restTemplate.getForObject(anyString(), eq(Map.class))).thenReturn(googleInfo);

        User user = User.builder()
                .id(1L)
                .googleId("google-123")
                .email("user@scubex.com")
                .name("Test User")
                .pictureUrl("https://pic.url")
                .build();
        when(userService.findOrCreate(anyString(), anyString(), anyString(), anyString())).thenReturn(user);
        when(jwtService.generateToken(any(User.class))).thenReturn("mocked.jwt.token");

        mockMvc.perform(post("/api/auth/google")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(Map.of("credential", "valid-google-token"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.token").value("mocked.jwt.token"))
                .andExpect(jsonPath("$.user.email").value("user@scubex.com"))
                .andExpect(jsonPath("$.user.name").value("Test User"));
    }
}
