package com.scubex.controller;

import com.scubex.model.Comment;
import com.scubex.model.Publication;
import com.scubex.model.User;
import com.scubex.service.InteractionService;
import com.scubex.service.PublicationService;
import com.scubex.service.UserService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/publications/{pubId}")
public class InteractionController {

    private final InteractionService interactionService;
    private final PublicationService publicationService;
    private final UserService userService;
    private final AuthHelper authHelper;

    public InteractionController(InteractionService interactionService,
                                 PublicationService publicationService,
                                 UserService userService,
                                 AuthHelper authHelper) {
        this.interactionService = interactionService;
        this.publicationService = publicationService;
        this.userService = userService;
        this.authHelper = authHelper;
    }

    // ── Likes ──

    @PostMapping("/like")
    public ResponseEntity<?> toggleLike(@PathVariable Long pubId, Authentication auth) {
        User user = authHelper.getUser(auth);
        Publication pub = publicationService.getById(pubId);
        if (pub == null) return ResponseEntity.status(404).body(Map.of("error", "Publication not found"));
        boolean liked = interactionService.toggleLike(pub, user);
        long count = interactionService.getLikeCount(pubId);
        return ResponseEntity.ok(Map.of("liked", liked, "count", count));
    }

    @GetMapping("/like")
    public ResponseEntity<?> getLikeStatus(@PathVariable Long pubId, Authentication auth) {
        Publication pub = publicationService.getById(pubId);
        if (pub == null) return ResponseEntity.status(404).body(Map.of("error", "Publication not found"));

        long count = interactionService.getLikeCount(pubId);
        boolean liked = false;
        if (auth != null) {
            User user = userService.findByGoogleId(auth.getName());
            if (user != null) {
                liked = interactionService.hasUserLiked(pubId, user.getId());
            }
        }
        return ResponseEntity.ok(Map.of("liked", liked, "count", count));
    }

    // ── Saves ──

    @PostMapping("/save")
    public ResponseEntity<?> toggleSave(@PathVariable Long pubId, Authentication auth) {
        User user = authHelper.getUser(auth);
        Publication pub = publicationService.getById(pubId);
        if (pub == null) return ResponseEntity.status(404).body(Map.of("error", "Publication not found"));

        boolean saved = interactionService.toggleSave(pub, user);
        return ResponseEntity.ok(Map.of("saved", saved));
    }

    @GetMapping("/save")
    public ResponseEntity<?> getSaveStatus(@PathVariable Long pubId, Authentication auth) {
        Publication pub = publicationService.getById(pubId);
        if (pub == null) return ResponseEntity.status(404).body(Map.of("error", "Publication not found"));

        boolean saved = false;
        if (auth != null) {
            User user = userService.findByGoogleId(auth.getName());
            if (user != null) {
                saved = interactionService.hasUserSaved(pubId, user.getId());
            }
        }
        return ResponseEntity.ok(Map.of("saved", saved));
    }

    // ── Comments ──

    @GetMapping("/comments")
    public ResponseEntity<?> getComments(@PathVariable Long pubId) {
        Publication pub = publicationService.getById(pubId);
        if (pub == null) return ResponseEntity.status(404).body(Map.of("error", "Publication not found"));

        List<Comment> comments = interactionService.getComments(pubId);
        return ResponseEntity.ok(comments.stream().map(this::commentToDto).toList());
    }

    @PostMapping("/comments")
    public ResponseEntity<?> addComment(@PathVariable Long pubId, @RequestBody Map<String, String> body, Authentication auth) {
        User user = authHelper.getUser(auth);
        Publication pub = publicationService.getById(pubId);
        if (pub == null) return ResponseEntity.status(404).body(Map.of("error", "Publication not found"));

        String text = body.get("text");
        if (text == null || text.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Comment text is required"));
        }
        if (text.length() > 500) {
            return ResponseEntity.badRequest().body(Map.of("error", "Comment too long (max 500 chars)"));
        }

        Comment comment = interactionService.addComment(pub, user, text.trim());
        return ResponseEntity.ok(commentToDto(comment));
    }

    @DeleteMapping("/comments/{commentId}")
    public ResponseEntity<?> deleteComment(@PathVariable Long pubId, @PathVariable Long commentId, Authentication auth) {
        User user = authHelper.getUser(auth);

        boolean deleted = interactionService.deleteComment(commentId, user);
        if (!deleted) {
            return ResponseEntity.status(403).body(Map.of("error", "Not authorized or not found"));
        }
        return ResponseEntity.ok(Map.of("success", true));
    }

    private Map<String, Object> commentToDto(Comment c) {
        return Map.of(
                "id", c.getId(),
                "text", c.getText(),
                "createdAt", c.getCreatedAt().toString(),
                "author", Map.of(
                        "name", c.getUser().getDisplayName() != null ? c.getUser().getDisplayName() : "",
                        "picture", c.getUser().getDisplayPicture() != null ? c.getUser().getDisplayPicture() : "",
                        "email", c.getUser().getEmail() != null ? c.getUser().getEmail() : ""
                )
        );
    }
}
