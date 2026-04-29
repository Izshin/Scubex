package com.scubex.service;

import com.scubex.model.Notification;
import com.scubex.model.Publication;
import com.scubex.model.User;
import com.scubex.repository.NotificationRepository;
import com.scubex.repository.UserRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class NotificationServiceTest {

    @Mock private NotificationRepository notificationRepository;
    @Mock private UserRepository userRepository;

    @InjectMocks
    private NotificationService notificationService;

    // ── helpers ───────────────────────────────────────────────────────

    private User user(Long id, String email) {
        return User.builder().id(id).googleId("gid-" + id).email(email).name("User" + id).build();
    }

    private Publication pub(Long id, User owner) {
        return Publication.builder().id(id).user(owner).title("Pub" + id).build();
    }

    // ── notifyFollow ──────────────────────────────────────────────────

    @Test
    void notifyFollow_differentUsers_savesNotification() {
        User follower = user(1L, "follower@test.com");
        User followed = user(2L, "followed@test.com");

        notificationService.notifyFollow(follower, followed);

        ArgumentCaptor<Notification> captor = ArgumentCaptor.forClass(Notification.class);
        verify(notificationRepository).save(captor.capture());
        Notification n = captor.getValue();
        assertThat(n.getType()).isEqualTo(Notification.Type.FOLLOW);
        assertThat(n.getRecipient()).isEqualTo(followed);
        assertThat(n.getActorEmail()).isEqualTo("follower@test.com");
    }

    @Test
    void notifyFollow_sameUser_doesNotSave() {
        User u = user(1L, "self@test.com");

        notificationService.notifyFollow(u, u);

        verify(notificationRepository, never()).save(any());
    }

    // ── notifyLike ────────────────────────────────────────────────────

    @Test
    void notifyLike_differentUsers_savesLikeNotification() {
        User actor = user(1L, "actor@test.com");
        User owner = user(2L, "owner@test.com");
        Publication p = pub(10L, owner);

        notificationService.notifyLike(actor, p);

        ArgumentCaptor<Notification> captor = ArgumentCaptor.forClass(Notification.class);
        verify(notificationRepository).save(captor.capture());
        Notification n = captor.getValue();
        assertThat(n.getType()).isEqualTo(Notification.Type.LIKE);
        assertThat(n.getPublicationId()).isEqualTo(10L);
        assertThat(n.getRecipient()).isEqualTo(owner);
    }

    @Test
    void notifyLike_selfLike_doesNotSave() {
        User u = user(1L, "self@test.com");
        Publication p = pub(10L, u);

        notificationService.notifyLike(u, p);

        verify(notificationRepository, never()).save(any());
    }

    // ── notifyComment ─────────────────────────────────────────────────

    @Test
    void notifyComment_differentUsers_savesCommentNotification() {
        User actor = user(1L, "actor@test.com");
        User owner = user(2L, "owner@test.com");
        Publication p = pub(10L, owner);

        notificationService.notifyComment(actor, p, "Gran foto!");

        ArgumentCaptor<Notification> captor = ArgumentCaptor.forClass(Notification.class);
        verify(notificationRepository).save(captor.capture());
        Notification n = captor.getValue();
        assertThat(n.getType()).isEqualTo(Notification.Type.COMMENT);
        assertThat(n.getCommentSnippet()).isEqualTo("Gran foto!");
    }

    @Test
    void notifyComment_selfComment_doesNotSaveOwnerNotification() {
        User u = user(1L, "self@test.com");
        Publication p = pub(10L, u);

        notificationService.notifyComment(u, p, "Mi propio comentario");

        // No notification for owner since actor == owner, no mentions either
        verify(notificationRepository, never()).save(any());
    }

    @Test
    void notifyComment_longText_snippetTruncatedAt150() {
        User actor = user(1L, "actor@test.com");
        User owner = user(2L, "owner@test.com");
        Publication p = pub(10L, owner);
        String longText = "a".repeat(200);

        notificationService.notifyComment(actor, p, longText);

        ArgumentCaptor<Notification> captor = ArgumentCaptor.forClass(Notification.class);
        verify(notificationRepository).save(captor.capture());
        assertThat(captor.getValue().getCommentSnippet()).hasSize(151); // 150 + "…"
    }

    @Test
    void notifyComment_withMention_savesMentionNotification() {
        User actor = user(1L, "actor@test.com");
        User owner = user(2L, "owner@test.com");
        User mentioned = user(3L, "mentioned@test.com");
        Publication p = pub(10L, owner);
        String text = "Mira @[Mentioned](mentioned@test.com) qué inmersión!";

        when(userRepository.findByEmailIn(List.of("mentioned@test.com")))
                .thenReturn(List.of(mentioned));

        notificationService.notifyComment(actor, p, text);

        // 2 saves: one COMMENT (owner), one MENTION (mentioned)
        verify(notificationRepository, times(2)).save(any(Notification.class));
    }

    @Test
    void notifyComment_mentionAlreadyNotified_doesNotDuplicate() {
        User actor = user(1L, "actor@test.com");
        // owner IS the mentioned user
        User owner = user(2L, "owner@test.com");
        Publication p = pub(10L, owner);
        String text = "Hola @[Owner](owner@test.com)";

        when(userRepository.findByEmailIn(List.of("owner@test.com")))
                .thenReturn(List.of(owner));

        notificationService.notifyComment(actor, p, text);

        // Only 1 save: COMMENT for owner, no duplicate MENTION
        verify(notificationRepository, times(1)).save(any(Notification.class));
    }

    // ── getNotifications ──────────────────────────────────────────────

    @Test
    void getNotifications_returnsOrderedList() {
        User u = user(1L, "u@test.com");
        Notification n = Notification.builder().id(1L).recipient(u)
                .type(Notification.Type.FOLLOW).actorName("").actorEmail("").build();
        when(notificationRepository.findByRecipientIdOrderByCreatedAtDesc(1L))
                .thenReturn(List.of(n));

        List<Notification> result = notificationService.getNotifications(u);

        assertThat(result).hasSize(1).first().extracting(Notification::getType)
                .isEqualTo(Notification.Type.FOLLOW);
    }

    // ── getUnreadCount ────────────────────────────────────────────────

    @Test
    void getUnreadCount_returnsCount() {
        User u = user(1L, "u@test.com");
        when(notificationRepository.countByRecipientIdAndReadFalse(1L)).thenReturn(3L);

        assertThat(notificationService.getUnreadCount(u)).isEqualTo(3L);
    }

    // ── markRead ─────────────────────────────────────────────────────

    @Test
    void markRead_ownNotification_setsReadAndSaves() {
        User u = user(1L, "u@test.com");
        Notification n = Notification.builder().id(5L).recipient(u)
                .type(Notification.Type.LIKE).actorName("").actorEmail("").read(false).build();
        when(notificationRepository.findById(5L)).thenReturn(Optional.of(n));

        notificationService.markRead(5L, u);

        assertThat(n.isRead()).isTrue();
        verify(notificationRepository).save(n);
    }

    @Test
    void markRead_otherUserNotification_doesNotSave() {
        User u = user(1L, "u@test.com");
        User other = user(2L, "other@test.com");
        Notification n = Notification.builder().id(5L).recipient(other)
                .type(Notification.Type.LIKE).actorName("").actorEmail("").read(false).build();
        when(notificationRepository.findById(5L)).thenReturn(Optional.of(n));

        notificationService.markRead(5L, u);

        verify(notificationRepository, never()).save(any());
    }

    @Test
    void markRead_notificationNotFound_doesNothing() {
        User u = user(1L, "u@test.com");
        when(notificationRepository.findById(99L)).thenReturn(Optional.empty());

        notificationService.markRead(99L, u);

        verify(notificationRepository, never()).save(any());
    }

    // ── markAllRead ───────────────────────────────────────────────────

    @Test
    void markAllRead_setsAllReadAndSaves() {
        User u = user(1L, "u@test.com");
        Notification n1 = Notification.builder().id(1L).recipient(u)
                .type(Notification.Type.LIKE).actorName("").actorEmail("").read(false).build();
        Notification n2 = Notification.builder().id(2L).recipient(u)
                .type(Notification.Type.FOLLOW).actorName("").actorEmail("").read(false).build();
        when(notificationRepository.findByRecipientIdAndReadFalse(1L)).thenReturn(List.of(n1, n2));

        notificationService.markAllRead(u);

        assertThat(n1.isRead()).isTrue();
        assertThat(n2.isRead()).isTrue();
        verify(notificationRepository).saveAll(List.of(n1, n2));
    }

    // ── deleteNotification ────────────────────────────────────────────

    @Test
    void deleteNotification_ownNotification_deletes() {
        User u = user(1L, "u@test.com");
        Notification n = Notification.builder().id(7L).recipient(u)
                .type(Notification.Type.LIKE).actorName("").actorEmail("").build();
        when(notificationRepository.findById(7L)).thenReturn(Optional.of(n));

        notificationService.deleteNotification(7L, u);

        verify(notificationRepository).delete(n);
    }

    @Test
    void deleteNotification_otherUserNotification_doesNotDelete() {
        User u = user(1L, "u@test.com");
        User other = user(2L, "other@test.com");
        Notification n = Notification.builder().id(7L).recipient(other)
                .type(Notification.Type.LIKE).actorName("").actorEmail("").build();
        when(notificationRepository.findById(7L)).thenReturn(Optional.of(n));

        notificationService.deleteNotification(7L, u);

        verify(notificationRepository, never()).delete(any());
    }
}
