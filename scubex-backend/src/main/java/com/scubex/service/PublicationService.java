package com.scubex.service;

import com.scubex.model.Publication;
import com.scubex.model.User;
import com.scubex.repository.PublicationRepository;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class PublicationService {

    private final PublicationRepository publicationRepository;

    public PublicationService(PublicationRepository publicationRepository) {
        this.publicationRepository = publicationRepository;
    }

    public Publication create(Publication publication) {
        return publicationRepository.save(publication);
    }

    public List<Publication> getAll() {
        return publicationRepository.findAllByOrderByCreatedAtDesc();
    }

    public List<Publication> getByUser(User user) {
        return publicationRepository.findByUser(user);
    }

    public List<Publication> getInArea(Double latMin, Double latMax, Double lngMin, Double lngMax) {
        return publicationRepository.findByLatitudeBetweenAndLongitudeBetween(latMin, latMax, lngMin, lngMax);
    }

    public Publication getById(Long id) {
        return publicationRepository.findById(id).orElse(null);
    }

    public Publication update(Long id, Publication updated, User user) {
        Publication existing = publicationRepository.findById(id).orElse(null);
        if (existing == null || !existing.getUser().getId().equals(user.getId())) {
            return null;
        }
        existing.setTitle(updated.getTitle());
        existing.setDescription(updated.getDescription());
        existing.setImageUrl(updated.getImageUrl());
        return publicationRepository.save(existing);
    }

    public boolean delete(Long id, User user) {
        Publication existing = publicationRepository.findById(id).orElse(null);
        if (existing == null || !existing.getUser().getId().equals(user.getId())) {
            return false;
        }
        publicationRepository.delete(existing);
        return true;
    }
}
