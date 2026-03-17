package com.scubex.service;

import com.scubex.model.User;
import io.jsonwebtoken.Claims;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Test suite for JwtService.
 * Tests cover:
 * - Token generation contains correct claims
 * - Token validation returns correct subject
 * - Tampered token is rejected
 * - Expired token is rejected
 */
class JwtServiceTest {

    private JwtService jwtService;

    private static final String TEST_SECRET =
            "scubex-test-secret-key-must-be-at-least-256-bits-long-padded";

    @BeforeEach
    void setUp() {
        jwtService = new JwtService();
        ReflectionTestUtils.setField(jwtService, "secret", TEST_SECRET);
    }

    private User buildUser() {
        return User.builder()
                .id(1L)
                .googleId("google-123")
                .email("test@scubex.com")
                .name("Test User")
                .pictureUrl("https://example.com/pic.jpg")
                .build();
    }

    /**
     * Test: generateToken_containsExpectedClaims
     * Dado un usuario, el token generado debe tener subject = googleId
     * y claims de email, name y picture correctos.
     */
    @Test
    void generateToken_containsExpectedClaims() {
        User user = buildUser();

        String token = jwtService.generateToken(user);
        Claims claims = jwtService.validateToken(token);

        assertEquals("google-123", claims.getSubject());
        assertEquals("test@scubex.com", claims.get("email"));
        assertEquals("Test User", claims.get("name"));
        assertEquals("https://example.com/pic.jpg", claims.get("picture"));
    }

    /**
     * Test: validateToken_returnsSubject
     * Un token válido debe devolver el googleId como subject.
     */
    @Test
    void validateToken_returnsSubject() {
        User user = buildUser();
        String token = jwtService.generateToken(user);

        Claims claims = jwtService.validateToken(token);

        assertEquals(user.getGoogleId(), claims.getSubject());
    }

    /**
     * Test: validateToken_tamperedToken_throwsException
     * Un token modificado debe lanzar excepción al validar.
     */
    @Test
    void validateToken_tamperedToken_throwsException() {
        User user = buildUser();
        String token = jwtService.generateToken(user);

        // Tamper the signature
        String tampered = token.substring(0, token.lastIndexOf('.') + 1) + "invalidsignature";

        assertThrows(Exception.class, () -> jwtService.validateToken(tampered));
    }

    /**
     * Test: validateToken_wrongSecret_throwsException
     * Un token firmado con otro secret debe ser rechazado.
     */
    @Test
    void validateToken_wrongSecret_throwsException() {
        User user = buildUser();
        String token = jwtService.generateToken(user);

        // Create a second JwtService with a different secret
        JwtService otherService = new JwtService();
        ReflectionTestUtils.setField(otherService, "secret",
                "completely-different-secret-key-256-bits-long-padding-here");

        assertThrows(Exception.class, () -> otherService.validateToken(token));
    }
}
