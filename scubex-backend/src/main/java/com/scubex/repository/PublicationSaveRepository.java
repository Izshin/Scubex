package com.scubex.repository;

import com.scubex.model.PublicationSave;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface PublicationSaveRepository extends JpaRepository<PublicationSave, Long> {

    Optional<PublicationSave> findByPublicationIdAndUserId(Long publicationId, Long userId);

    boolean existsByPublicationIdAndUserId(Long publicationId, Long userId);

    List<PublicationSave> findByUserIdOrderByCreatedAtDesc(Long userId);

    void deleteAllByUserId(Long userId);

    void deleteAllByPublicationIdIn(List<Long> publicationIds);
}
