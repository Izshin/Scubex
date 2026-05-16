package com.scubex.service;

import com.scubex.model.*;
import com.scubex.repository.CommentRepository;
import com.scubex.repository.PublicationLikeRepository;
import com.scubex.repository.PublicationSaveRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class InteractionServiceTest {

    @Mock private PublicationLikeRepository likeRepository;
    @Mock private PublicationSaveRepository saveRepository;
    @Mock private CommentRepository commentRepository;
    @Mock private NotificationService notificationService;

    @InjectMocks
    private InteractionService interactionService;

    // ── helpers ───────────────────────────────────────────────────────

    private User user(Long id) {
        return User.builder().id(id).googleId("gid-" + id).email("u" + id + "@test.com").name("User" + id).build();
    }

    private Publication pub(Long id, User owner) {
        return Publication.builder().id(id).user(owner).title("Pub" + id)
                .createdAt(Instant.now()).build();
    }

    // ── toggleLike ────────────────────────────────────────────────────

    @Test
    void toggleLike_noExisting_likesAndNotifies() {
        User u = user(1L);
        Publication p = pub(10L, user(2L));
        when(likeRepository.findByPublicationIdAndUserId(10L, 1L)).thenReturn(Optional.empty());
        when(likeRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        boolean result = interactionService.toggleLike(p, u);

        assertThat(result).isTrue();
        verify(likeRepository).save(any(PublicationLike.class));
        verify(notificationService).notifyLike(u, p);
    }

    @Test
    void toggleLike_existing_unlikesAndDoesNotNotify() {
        User u = user(1L);
        Publication p = pub(10L, user(2L));
        PublicationLike existing = PublicationLike.builder().publication(p).user(u).build();
        when(likeRepository.findByPublicationIdAndUserId(10L, 1L)).thenReturn(Optional.of(existing));

        boolean result = interactionService.toggleLike(p, u);

        assertThat(result).isFalse();
        verify(likeRepository).delete(existing);
        verify(notificationService, never()).notifyLike(any(), any());
    }

    @Test
    void getLikeCount_returnsRepositoryValue() {
        when(likeRepository.countByPublicationId(10L)).thenReturn(7L);

        assertThat(interactionService.getLikeCount(10L)).isEqualTo(7L);
    }

    @Test
    void hasUserLiked_returnsTrue() {
        when(likeRepository.existsByPublicationIdAndUserId(10L, 1L)).thenReturn(true);

        assertThat(interactionService.hasUserLiked(10L, 1L)).isTrue();
    }

    @Test
    void hasUserLiked_returnsFalse() {
        when(likeRepository.existsByPublicationIdAndUserId(10L, 1L)).thenReturn(false);

        assertThat(interactionService.hasUserLiked(10L, 1L)).isFalse();
    }

    // ── toggleSave ────────────────────────────────────────────────────

    @Test
    void toggleSave_noExisting_saves() {
        User u = user(1L);
        Publication p = pub(10L, user(2L));
        when(saveRepository.findByPublicationIdAndUserId(10L, 1L)).thenReturn(Optional.empty());
        when(saveRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        boolean result = interactionService.toggleSave(p, u);

        assertThat(result).isTrue();
        verify(saveRepository).save(any(PublicationSave.class));
    }

    @Test
    void toggleSave_existing_unsaves() {
        User u = user(1L);
        Publication p = pub(10L, user(2L));
        PublicationSave existing = PublicationSave.builder().publication(p).user(u).build();
        when(saveRepository.findByPublicationIdAndUserId(10L, 1L)).thenReturn(Optional.of(existing));

        boolean result = interactionService.toggleSave(p, u);

        assertThat(result).isFalse();
        verify(saveRepository).delete(existing);
    }

    @Test
    void hasUserSaved_returnsRepositoryValue() {
        when(saveRepository.existsByPublicationIdAndUserId(10L, 1L)).thenReturn(true);

        assertThat(interactionService.hasUserSaved(10L, 1L)).isTrue();
    }

    @Test
    void getSavedByUser_returnsList() {
        User u = user(1L);
        Publication p = pub(10L, u);
        PublicationSave save = PublicationSave.builder().user(u).publication(p).build();
        when(saveRepository.findByUserIdOrderByCreatedAtDesc(1L)).thenReturn(List.of(save));

        List<PublicationSave> result = interactionService.getSavedByUser(1L);

        assertThat(result).hasSize(1);
    }

    // ── addComment ────────────────────────────────────────────────────

    @Test
    void addComment_savesCommentAndNotifies() {
        User u = user(1L);
        User owner = user(2L);
        Publication p = pub(10L, owner);
        Comment saved = Comment.builder().id(20L).user(u).publication(p)
                .text("Qué bonito!").createdAt(Instant.now()).build();
        when(commentRepository.save(any())).thenReturn(saved);

        Comment result = interactionService.addComment(p, u, "Qué bonito!");

        assertThat(result.getId()).isEqualTo(20L);
        verify(commentRepository).save(any(Comment.class));
        verify(notificationService).notifyComment(u, p, "Qué bonito!");
    }

    // ── getComments ───────────────────────────────────────────────────

    @Test
    void getComments_returnsOrderedList() {
        User u = user(1L);
        Publication p = pub(10L, u);
        Comment c = Comment.builder().id(1L).user(u).publication(p)
                .text("Hi").createdAt(Instant.now()).build();
        when(commentRepository.findByPublicationIdOrderByCreatedAtAsc(10L)).thenReturn(List.of(c));

        List<Comment> result = interactionService.getComments(10L);

        assertThat(result).hasSize(1);
    }

    @Test
    void getCommentCount_returnsRepositoryValue() {
        when(commentRepository.countByPublicationId(10L)).thenReturn(4L);

        assertThat(interactionService.getCommentCount(10L)).isEqualTo(4L);
    }

    // ── deleteComment ─────────────────────────────────────────────────

    @Test
    void deleteComment_owner_deletesAndReturnsTrue() {
        User u = user(1L);
        Publication p = pub(10L, user(2L));
        Comment c = Comment.builder().id(30L).user(u).publication(p)
                .text("X").createdAt(Instant.now()).build();
        when(commentRepository.findById(30L)).thenReturn(Optional.of(c));

        boolean result = interactionService.deleteComment(30L, u);

        assertThat(result).isTrue();
        verify(commentRepository).delete(c);
    }

    @Test
    void deleteComment_notOwner_returnsFalse() {
        User owner = user(1L);
        User other = user(2L);
        Publication p = pub(10L, owner);
        Comment c = Comment.builder().id(30L).user(owner).publication(p)
                .text("X").createdAt(Instant.now()).build();
        when(commentRepository.findById(30L)).thenReturn(Optional.of(c));

        boolean result = interactionService.deleteComment(30L, other);

        assertThat(result).isFalse();
        verify(commentRepository, never()).delete(any());
    }

    @Test
    void deleteComment_notFound_returnsFalse() {
        when(commentRepository.findById(99L)).thenReturn(Optional.empty());

        boolean result = interactionService.deleteComment(99L, user(1L));

        assertThat(result).isFalse();
        verify(commentRepository, never()).delete(any());
    }
}
