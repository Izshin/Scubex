package com.scubex.service;

import com.scubex.model.Publication;
import com.scubex.model.User;
import com.scubex.repository.CommentRepository;
import com.scubex.repository.NotificationRepository;
import com.scubex.repository.PublicationLikeRepository;
import com.scubex.repository.PublicationRepository;
import com.scubex.repository.PublicationSaveRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Objects;

@Service
public class PublicationService {

    private final PublicationRepository publicationRepository;
    private final CommentRepository commentRepository;
    private final PublicationLikeRepository likeRepository;
    private final PublicationSaveRepository saveRepository;
    private final NotificationRepository notificationRepository;

    public PublicationService(PublicationRepository publicationRepository,
                              CommentRepository commentRepository,
                              PublicationLikeRepository likeRepository,
                              PublicationSaveRepository saveRepository,
                              NotificationRepository notificationRepository) {
        this.publicationRepository = publicationRepository;
        this.commentRepository = commentRepository;
        this.likeRepository = likeRepository;
        this.saveRepository = saveRepository;
        this.notificationRepository = notificationRepository;
    }

    public Publication create(Publication publication) {
        return publicationRepository.save(publication);
    }

    public List<Publication> getAll() {
        return publicationRepository.findAllByOrderByCreatedAtDesc();
    }

    public List<Publication> getAllVisibleTo(User requester) {
        return publicationRepository.findAllByOrderByCreatedAtDesc().stream()
                .filter(p -> canView(p, requester))
                .toList();
    }

    public List<Publication> getByUser(User user) {
        return publicationRepository.findByUser(user);
    }

    public List<Publication> getByUserVisibleTo(User user, User requester) {
        if (isOwner(user, requester)) {
            return publicationRepository.findByUser(user);
        }
        if (Boolean.TRUE.equals(user.getAccountPrivate())) {
            return List.of();
        }
        return publicationRepository.findByUser(user).stream()
                .filter(p -> !Boolean.TRUE.equals(p.getIsPrivate()))
                .toList();
    }

    public List<Publication> getInArea(Double latMin, Double latMax, Double lngMin, Double lngMax) {
        return publicationRepository.findByLatitudeBetweenAndLongitudeBetween(latMin, latMax, lngMin, lngMax);
    }

    public List<Publication> getInAreaVisibleTo(Double latMin, Double latMax, Double lngMin, Double lngMax, User requester) {
        return publicationRepository.findByLatitudeBetweenAndLongitudeBetween(latMin, latMax, lngMin, lngMax).stream()
                .filter(p -> canView(p, requester))
                .toList();
    }

    public Publication getById(Long id) {
        return publicationRepository.findById(id).orElse(null);
    }

    public Publication getByIdVisibleTo(Long id, User requester) {
        Publication p = publicationRepository.findById(id).orElse(null);
        if (p == null) return null;
        return canView(p, requester) ? p : null;
    }

    @Transactional
    public Publication update(Long id, Publication updated, User user) {
        Publication existing = publicationRepository.findById(id).orElse(null);
        if (existing == null || !existing.getUser().getId().equals(user.getId())) {
            return null;
        }
        existing.setTitle(updated.getTitle());
        existing.setDescription(updated.getDescription());
        existing.setImageUrl(updated.getImageUrl());
        existing.setIsPrivate(updated.getIsPrivate() != null ? updated.getIsPrivate() : false);
        return publicationRepository.save(existing);
    }

    @Transactional
    public boolean delete(Long id, User user) {
        Publication existing = publicationRepository.findById(id).orElse(null);
        if (existing == null || !existing.getUser().getId().equals(user.getId())) {
            return false;
        }
        // Borrar hijos antes de borrar la publicación para evitar violaciones de FK
        List<Long> pubIds = List.of(id);
        commentRepository.deleteAllByPublicationIdIn(pubIds);
        likeRepository.deleteAllByPublicationIdIn(pubIds);
        saveRepository.deleteAllByPublicationIdIn(pubIds);
        notificationRepository.deleteAllByPublicationId(id);
        publicationRepository.delete(existing);
        return true;
    }

    public boolean canView(Publication p, User requester) {
        if (p == null || p.getUser() == null) return false;
        if (isOwner(p.getUser(), requester)) return true;
        if (Boolean.TRUE.equals(p.getUser().getAccountPrivate())) return false;
        return !Boolean.TRUE.equals(p.getIsPrivate());
    }

    private boolean isOwner(User owner, User requester) {
        return owner != null && requester != null && Objects.equals(owner.getId(), requester.getId());
    }
}
