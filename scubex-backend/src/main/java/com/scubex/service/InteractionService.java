package com.scubex.service;

import com.scubex.model.*;
import com.scubex.repository.CommentRepository;
import com.scubex.repository.PublicationLikeRepository;
import com.scubex.repository.PublicationSaveRepository;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;

@Service
public class InteractionService {

    private final PublicationLikeRepository likeRepository;
    private final PublicationSaveRepository saveRepository;
    private final CommentRepository commentRepository;

    public InteractionService(PublicationLikeRepository likeRepository,
                              PublicationSaveRepository saveRepository,
                              CommentRepository commentRepository) {
        this.likeRepository = likeRepository;
        this.saveRepository = saveRepository;
        this.commentRepository = commentRepository;
    }

    // ── Likes ──

    public boolean toggleLike(Publication publication, User user) {
        Optional<PublicationLike> existing = likeRepository.findByPublicationIdAndUserId(publication.getId(), user.getId());
        if (existing.isPresent()) {
            likeRepository.delete(existing.get());
            return false; // unliked
        }
        likeRepository.save(PublicationLike.builder()
                .publication(publication)
                .user(user)
                .build());
        return true; // liked
    }

    public long getLikeCount(Long publicationId) {
        return likeRepository.countByPublicationId(publicationId);
    }

    public boolean hasUserLiked(Long publicationId, Long userId) {
        return likeRepository.existsByPublicationIdAndUserId(publicationId, userId);
    }

    // ── Saves ──

    public boolean toggleSave(Publication publication, User user) {
        Optional<PublicationSave> existing = saveRepository.findByPublicationIdAndUserId(publication.getId(), user.getId());
        if (existing.isPresent()) {
            saveRepository.delete(existing.get());
            return false; // unsaved
        }
        saveRepository.save(PublicationSave.builder()
                .publication(publication)
                .user(user)
                .build());
        return true; // saved
    }

    public boolean hasUserSaved(Long publicationId, Long userId) {
        return saveRepository.existsByPublicationIdAndUserId(publicationId, userId);
    }

    public List<PublicationSave> getSavedByUser(Long userId) {
        return saveRepository.findByUserIdOrderByCreatedAtDesc(userId);
    }

    // ── Comments ──

    public Comment addComment(Publication publication, User user, String text) {
        return commentRepository.save(Comment.builder()
                .publication(publication)
                .user(user)
                .text(text)
                .build());
    }

    public List<Comment> getComments(Long publicationId) {
        return commentRepository.findByPublicationIdOrderByCreatedAtAsc(publicationId);
    }

    public long getCommentCount(Long publicationId) {
        return commentRepository.countByPublicationId(publicationId);
    }

    public boolean deleteComment(Long commentId, User user) {
        Comment comment = commentRepository.findById(commentId).orElse(null);
        if (comment == null || !comment.getUser().getId().equals(user.getId())) {
            return false;
        }
        commentRepository.delete(comment);
        return true;
    }
}
