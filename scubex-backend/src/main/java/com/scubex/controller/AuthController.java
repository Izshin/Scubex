package com.scubex.controller;

import com.scubex.model.User;
import com.scubex.service.JwtService;
import com.scubex.service.UserService;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.client.RestTemplate;

import java.util.Map;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final UserService userService;
    private final JwtService jwtService;

    @Value("${google.client.id}")
    private String googleClientId;

    public AuthController(UserService userService, JwtService jwtService) {
        this.userService = userService;
        this.jwtService = jwtService;
    }

    @PostMapping("/google")
    public ResponseEntity<?> loginWithGoogle(@RequestBody Map<String, String> body) {
        String credential = body.get("credential");
        if (credential == null || credential.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Missing credential"));
        }

        try {
            RestTemplate restTemplate = new RestTemplate();
            String url = "https://oauth2.googleapis.com/tokeninfo?id_token=" + credential;

            @SuppressWarnings("unchecked")
            Map<String, String> googleInfo = restTemplate.getForObject(url, Map.class);

            if (googleInfo == null) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "Token validation failed"));
            }

            // Verify the token was issued for our app
            String aud = googleInfo.get("aud");
            String azp = googleInfo.get("azp");
            if (!googleClientId.equals(aud) && !googleClientId.equals(azp)) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "Token audience mismatch"));
            }

            User user = userService.findOrCreate(
                    googleInfo.get("sub"),
                    googleInfo.get("email"),
                    googleInfo.get("name"),
                    googleInfo.get("picture")
            );

            String jwt = jwtService.generateToken(user);

            return ResponseEntity.ok(Map.of(
                    "token", jwt,
                    "user", Map.of(
                            "name", user.getName() != null ? user.getName() : "",
                            "email", user.getEmail(),
                            "picture", user.getPictureUrl() != null ? user.getPictureUrl() : ""
                    )
            ));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "Token validation failed"));
        }
    }
}
