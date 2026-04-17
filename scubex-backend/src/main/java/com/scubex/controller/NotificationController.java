package com.scubex.controller;

import com.scubex.model.Notification;
import com.scubex.model.User;
import com.scubex.service.NotificationService;
import com.scubex.service.UserService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/notifications")
public class NotificationController {

    private final NotificationService notificationService;
    private final UserService userService;

    public NotificationController(NotificationService notificationService, UserService userService) {
        this.notificationService = notificationService;
        this.userService = userService;
    }

    @GetMapping
    public ResponseEntity<?> getNotifications(Authentication auth) {
        if (auth == null) return ResponseEntity.status(401).build();
        User user = userService.findByGoogleId(auth.getName());
        if (user == null) return ResponseEntity.status(404).build();

        List<Notification> notifications = notificationService.getNotifications(user);
        return ResponseEntity.ok(notifications.stream().map(this::toDto).toList());
    }

    @GetMapping("/unread-count")
    public ResponseEntity<?> getUnreadCount(Authentication auth) {
        if (auth == null) return ResponseEntity.status(401).build();
        User user = userService.findByGoogleId(auth.getName());
        if (user == null) return ResponseEntity.status(404).build();

        return ResponseEntity.ok(Map.of("count", notificationService.getUnreadCount(user)));
    }

    @PostMapping("/{id}/read")
    public ResponseEntity<?> markRead(@PathVariable Long id, Authentication auth) {
        if (auth == null) return ResponseEntity.status(401).build();
        User user = userService.findByGoogleId(auth.getName());
        if (user == null) return ResponseEntity.status(404).build();

        notificationService.markRead(id, user);
        return ResponseEntity.ok().build();
    }

    @PostMapping("/read-all")
    public ResponseEntity<?> markAllRead(Authentication auth) {
        if (auth == null) return ResponseEntity.status(401).build();
        User user = userService.findByGoogleId(auth.getName());
        if (user == null) return ResponseEntity.status(404).build();

        notificationService.markAllRead(user);
        return ResponseEntity.ok().build();
    }

    private Map<String, Object> toDto(Notification n) {
        Map<String, Object> map = new LinkedHashMap<>();
        map.put("id", n.getId());
        map.put("type", n.getType().name());
        map.put("read", n.isRead());
        map.put("createdAt", n.getCreatedAt().toString());
        map.put("actorName", n.getActorName() != null ? n.getActorName() : "");
        map.put("actorPicture", n.getActorPicture() != null ? n.getActorPicture() : "");
        map.put("actorEmail", n.getActorEmail() != null ? n.getActorEmail() : "");
        map.put("publicationId", n.getPublicationId());
        map.put("publicationTitle", n.getPublicationTitle() != null ? n.getPublicationTitle() : "");
        map.put("commentSnippet", n.getCommentSnippet() != null ? n.getCommentSnippet() : "");
        return map;
    }
}
