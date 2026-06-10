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
    private final AuthHelper authHelper;

    public ProfileController(UserService userService, JwtService jwtService, AuthHelper authHelper) {
        this.userService = userService;
        this.jwtService = jwtService;
        this.authHelper = authHelper;
    }

    @GetMapping
    public ResponseEntity<?> getProfile(Authentication auth) {
        User user = authHelper.getUser(auth);
        return ResponseEntity.ok(Map.of(
                "name", user.getDisplayName() != null ? user.getDisplayName() : "",
                "email", user.getEmail(),
                "picture", user.getDisplayPicture() != null ? user.getDisplayPicture() : "",
                "customName", user.getCustomName() != null ? user.getCustomName() : "",
            "customPictureUrl", user.getCustomPictureUrl() != null ? user.getCustomPictureUrl() : "",
            "accountPrivate", Boolean.TRUE.equals(user.getAccountPrivate())
        ));
    }

    @PutMapping
    public ResponseEntity<?> updateProfile(@RequestBody Map<String, Object> body, Authentication auth) {
        User user = authHelper.getUser(auth);
        String customName = body.get("customName") != null ? body.get("customName").toString() : null;
        String customPictureUrl = body.get("customPictureUrl") != null ? body.get("customPictureUrl").toString() : null;
        Boolean accountPrivate = body.get("accountPrivate") instanceof Boolean b ? b : null;

        User updated = userService.updateProfile(user.getGoogleId(), customName, customPictureUrl, accountPrivate);
        String newToken = jwtService.generateToken(updated);

        return ResponseEntity.ok(Map.of(
                "token", newToken,
                "user", Map.of(
                        "name", updated.getDisplayName() != null ? updated.getDisplayName() : "",
                        "email", updated.getEmail(),
                    "picture", updated.getDisplayPicture() != null ? updated.getDisplayPicture() : "",
                    "accountPrivate", Boolean.TRUE.equals(updated.getAccountPrivate())
                )
        ));
    }

    @DeleteMapping
    public ResponseEntity<?> deleteAccount(Authentication auth) {
        User user = authHelper.getUser(auth);
        userService.deleteAccount(user.getGoogleId());
        return ResponseEntity.noContent().build();
    }
}
