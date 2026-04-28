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
    private final AuthHelper authHelper;

    public NotificationController(NotificationService notificationService, UserService userService,
                                   AuthHelper authHelper) {
        this.notificationService = notificationService;
        this.userService = userService;
        this.authHelper = authHelper;
    }

    @GetMapping
    public ResponseEntity<?> getNotifications(Authentication auth) {
        User user = authHelper.getUser(auth);
        List<Notification> notifications = notificationService.getNotifications(user);
        return ResponseEntity.ok(notifications.stream().map(this::toDto).toList());
    }

    @GetMapping("/unread-count")
    public ResponseEntity<?> getUnreadCount(Authentication auth) {
        User user = authHelper.getUser(auth);
        return ResponseEntity.ok(Map.of("count", notificationService.getUnreadCount(user)));
    }

    @PostMapping("/{id}/read")
    public ResponseEntity<?> markRead(@PathVariable Long id, Authentication auth) {
        User user = authHelper.getUser(auth);
        notificationService.markRead(id, user);
        return ResponseEntity.ok().build();
    }

    @PostMapping("/read-all")
    public ResponseEntity<?> markAllRead(Authentication auth) {
        User user = authHelper.getUser(auth);
        notificationService.markAllRead(user);
        return ResponseEntity.ok().build();
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteNotification(@PathVariable Long id, Authentication auth) {
        User user = authHelper.getUser(auth);
        notificationService.deleteNotification(id, user);
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
