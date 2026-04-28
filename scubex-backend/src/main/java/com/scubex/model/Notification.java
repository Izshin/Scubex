package com.scubex.model;

import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;

@Entity
@Table(name = "notifications", indexes = {
    @Index(name = "idx_notification_recipient", columnList = "recipient_id"),
    @Index(name = "idx_notification_created", columnList = "created_at")
})
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Notification {

    public enum Type { FOLLOW, LIKE, COMMENT, MENTION }

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "recipient_id", nullable = false)
    private User recipient;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Type type;

    @Column(nullable = false)
    private boolean read = false;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    // Actor info (denormalized — no extra join needed when listing)
    @Column(nullable = false)
    private String actorName;

    private String actorPicture;

    @Column(nullable = false)
    private String actorEmail;

    // Publication context (null for FOLLOW)
    private Long publicationId;

    @Column(length = 200)
    private String publicationTitle;

    // Snippet for COMMENT / MENTION
    @Column(length = 200)
    private String commentSnippet;

    @PrePersist
    protected void onCreate() {
        createdAt = Instant.now();
    }
}
