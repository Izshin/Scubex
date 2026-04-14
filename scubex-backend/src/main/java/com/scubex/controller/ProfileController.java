package com.scubex.controller;

import com.scubex.model.User;
import com.scubex.service.JwtService;
import com.scubex.service.UserService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/profile")
public class ProfileController {

    private final UserService userService;
    private final JwtService jwtService;

    public ProfileController(UserService userService, JwtService jwtService) {
        this.userService = userService;
        this.jwtService = jwtService;
    }

    @GetMapping
    public ResponseEntity<?> getProfile(Authentication auth) {
        if (auth == null) {
            return ResponseEntity.status(401).body(Map.of("error", "Not authenticated"));
        }
        String googleId = auth.getName();
        User user = userService.findByGoogleId(googleId);
        if (user == null) {
            return ResponseEntity.status(404).body(Map.of("error", "User not found"));
        }
        return ResponseEntity.ok(Map.of(
                "name", user.getDisplayName() != null ? user.getDisplayName() : "",
                "email", user.getEmail(),
                "picture", user.getDisplayPicture() != null ? user.getDisplayPicture() : "",
                "customName", user.getCustomName() != null ? user.getCustomName() : "",
                "customPictureUrl", user.getCustomPictureUrl() != null ? user.getCustomPictureUrl() : ""
        ));
    }

    @PutMapping
    public ResponseEntity<?> updateProfile(@RequestBody Map<String, String> body, Authentication auth) {
        if (auth == null) {
            return ResponseEntity.status(401).body(Map.of("error", "Not authenticated"));
        }
        String googleId = auth.getName();

        String customName = body.get("customName");
        String customPictureUrl = body.get("customPictureUrl");

        User user = userService.updateProfile(googleId, customName, customPictureUrl);
        String newToken = jwtService.generateToken(user);

        return ResponseEntity.ok(Map.of(
                "token", newToken,
                "user", Map.of(
                        "name", user.getDisplayName() != null ? user.getDisplayName() : "",
                        "email", user.getEmail(),
                        "picture", user.getDisplayPicture() != null ? user.getDisplayPicture() : ""
                )
        ));
    }

    @DeleteMapping
    public ResponseEntity<?> deleteAccount(Authentication auth) {
        if (auth == null) {
            return ResponseEntity.status(401).body(Map.of("error", "Not authenticated"));
        }
        String googleId = auth.getName();
        userService.deleteAccount(googleId);
        return ResponseEntity.noContent().build();
    }
}
