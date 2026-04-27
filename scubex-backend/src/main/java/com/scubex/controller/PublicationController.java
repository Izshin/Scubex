package com.scubex.controller;

import com.scubex.model.Publication;
import com.scubex.model.User;
import com.scubex.service.InteractionService;
import com.scubex.service.PublicationService;
import com.scubex.service.UserService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/publications")
public class PublicationController {

    private final PublicationService publicationService;
    private final UserService userService;
    private final InteractionService interactionService;
    private final AuthHelper authHelper;

    public PublicationController(PublicationService publicationService, UserService userService,
                                 InteractionService interactionService, AuthHelper authHelper) {
        this.publicationService = publicationService;
        this.userService = userService;
        this.interactionService = interactionService;
        this.authHelper = authHelper;
    }

    @PostMapping
    public ResponseEntity<?> create(@RequestBody Map<String, Object> body, Authentication auth) {
        User user = authHelper.getUser(auth);

        String title = (String) body.get("title");
        String description = (String) body.get("description");
        String imageUrl = (String) body.get("imageUrl");
        Double latitude = ((Number) body.get("latitude")).doubleValue();
        Double longitude = ((Number) body.get("longitude")).doubleValue();

        if (title == null || title.isBlank() || latitude == null || longitude == null) {
            return ResponseEntity.badRequest().body(Map.of("error", "Title, latitude and longitude are required"));
        }

        Publication publication = Publication.builder()
                .user(user)
                .title(title)
                .description(description)
                .imageUrl(imageUrl)
                .latitude(latitude)
                .longitude(longitude)
                .build();

        Publication saved = publicationService.create(publication);
        return ResponseEntity.ok(toDto(saved));
    }

    @GetMapping
    public ResponseEntity<?> getAll() {
        List<Publication> publications = publicationService.getAll();
        return ResponseEntity.ok(publications.stream().map(this::toDto).toList());
    }

    @GetMapping("/area")
    public ResponseEntity<?> getInArea(
            @RequestParam Double latMin,
            @RequestParam Double latMax,
            @RequestParam Double lngMin,
            @RequestParam Double lngMax) {
        List<Publication> publications = publicationService.getInArea(latMin, latMax, lngMin, lngMax);
        return ResponseEntity.ok(publications.stream().map(this::toDto).toList());
    }

    @GetMapping("/{id}")
    public ResponseEntity<?> getById(@PathVariable Long id) {
        Publication publication = publicationService.getById(id);
        if (publication == null) {
            return ResponseEntity.status(404).body(Map.of("error", "Publication not found"));
        }
        return ResponseEntity.ok(toDto(publication));
    }

    @GetMapping("/mine")
    public ResponseEntity<?> getMine(Authentication auth) {
        User user = authHelper.getUser(auth);
        List<Publication> publications = publicationService.getByUser(user);
        return ResponseEntity.ok(publications.stream().map(this::toDto).toList());
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> update(@PathVariable Long id, @RequestBody Map<String, Object> body, Authentication auth) {
        User user = authHelper.getUser(auth);

        Publication updated = Publication.builder()
                .title((String) body.get("title"))
                .description((String) body.get("description"))
                .imageUrl((String) body.get("imageUrl"))
                .build();

        Publication result = publicationService.update(id, updated, user);
        if (result == null) {
            return ResponseEntity.status(403).body(Map.of("error", "Not authorized or not found"));
        }
        return ResponseEntity.ok(toDto(result));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> delete(@PathVariable Long id, Authentication auth) {
        User user = authHelper.getUser(auth);

        boolean deleted = publicationService.delete(id, user);
        if (!deleted) {
            return ResponseEntity.status(403).body(Map.of("error", "Not authorized or not found"));
        }
        return ResponseEntity.ok(Map.of("success", true));
    }

    private Map<String, Object> toDto(Publication p) {
        Map<String, Object> dto = new HashMap<>();
        dto.put("id", p.getId());
        dto.put("title", p.getTitle());
        dto.put("description", p.getDescription() != null ? p.getDescription() : "");
        dto.put("imageUrl", p.getImageUrl() != null ? p.getImageUrl() : "");
        dto.put("latitude", p.getLatitude());
        dto.put("longitude", p.getLongitude());
        dto.put("createdAt", p.getCreatedAt().toString());
        dto.put("author", Map.of(
                "email", p.getUser().getEmail() != null ? p.getUser().getEmail() : "",
                "name", p.getUser().getDisplayName() != null ? p.getUser().getDisplayName() : "",
                "picture", p.getUser().getDisplayPicture() != null ? p.getUser().getDisplayPicture() : ""
        ));
        dto.put("likeCount", interactionService.getLikeCount(p.getId()));
        dto.put("commentCount", interactionService.getCommentCount(p.getId()));
        return dto;
    }
}
