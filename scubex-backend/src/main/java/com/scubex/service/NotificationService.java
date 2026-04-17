package com.scubex.service;

import com.scubex.model.Notification;
import com.scubex.model.Publication;
import com.scubex.model.User;
import com.scubex.repository.NotificationRepository;
import com.scubex.repository.UserRepository;
import org.springframework.stereotype.Service;

import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Service
public class NotificationService {

    // Matches @[Display Name](email@example.com)
    private static final Pattern MENTION_PATTERN =
            Pattern.compile("@\\[([^\\]]+)\\]\\(([^)]+)\\)");

    private final NotificationRepository notificationRepository;
    private final UserRepository userRepository;

    public NotificationService(NotificationRepository notificationRepository,
                                UserRepository userRepository) {
        this.notificationRepository = notificationRepository;
        this.userRepository = userRepository;
    }

    public void notifyFollow(User follower, User followed) {
        if (follower.getId().equals(followed.getId())) return;
        notificationRepository.save(Notification.builder()
                .recipient(followed)
                .type(Notification.Type.FOLLOW)
                .actorName(follower.getDisplayName() != null ? follower.getDisplayName() : "")
                .actorPicture(follower.getDisplayPicture())
                .actorEmail(follower.getEmail())
                .build());
    }

    public void notifyLike(User actor, Publication pub) {
        if (actor.getId().equals(pub.getUser().getId())) return;
        notificationRepository.save(Notification.builder()
                .recipient(pub.getUser())
                .type(Notification.Type.LIKE)
                .actorName(actor.getDisplayName() != null ? actor.getDisplayName() : "")
                .actorPicture(actor.getDisplayPicture())
                .actorEmail(actor.getEmail())
                .publicationId(pub.getId())
                .publicationTitle(pub.getTitle())
                .build());
    }

    public void notifyComment(User actor, Publication pub, String text) {
        String snippet = text.length() > 150 ? text.substring(0, 150) + "…" : text;
        Set<Long> notified = new HashSet<>();
        notified.add(actor.getId());

        // Notify publication owner (unless self-comment)
        if (!actor.getId().equals(pub.getUser().getId())) {
            notified.add(pub.getUser().getId());
            notificationRepository.save(Notification.builder()
                    .recipient(pub.getUser())
                    .type(Notification.Type.COMMENT)
                    .actorName(actor.getDisplayName() != null ? actor.getDisplayName() : "")
                    .actorPicture(actor.getDisplayPicture())
                    .actorEmail(actor.getEmail())
                    .publicationId(pub.getId())
                    .publicationTitle(pub.getTitle())
                    .commentSnippet(snippet)
                    .build());
        }

        // Notify mentioned users
        Matcher matcher = MENTION_PATTERN.matcher(text);
        while (matcher.find()) {
            String mentionedEmail = matcher.group(2);
            userRepository.findByEmail(mentionedEmail).ifPresent(mentioned -> {
                if (!notified.contains(mentioned.getId())) {
                    notified.add(mentioned.getId());
                    notificationRepository.save(Notification.builder()
                            .recipient(mentioned)
                            .type(Notification.Type.MENTION)
                            .actorName(actor.getDisplayName() != null ? actor.getDisplayName() : "")
                            .actorPicture(actor.getDisplayPicture())
                            .actorEmail(actor.getEmail())
                            .publicationId(pub.getId())
                            .publicationTitle(pub.getTitle())
                            .commentSnippet(snippet)
                            .build());
                }
            });
        }
    }

    public List<Notification> getNotifications(User user) {
        return notificationRepository.findByRecipientIdOrderByCreatedAtDesc(user.getId());
    }

    public long getUnreadCount(User user) {
        return notificationRepository.countByRecipientIdAndReadFalse(user.getId());
    }

    public void markRead(Long notificationId, User user) {
        notificationRepository.findById(notificationId).ifPresent(n -> {
            if (n.getRecipient().getId().equals(user.getId())) {
                n.setRead(true);
                notificationRepository.save(n);
            }
        });
    }

    public void markAllRead(User user) {
        List<Notification> unread = notificationRepository.findByRecipientIdAndReadFalse(user.getId());
        unread.forEach(n -> n.setRead(true));
        notificationRepository.saveAll(unread);
    }
}
