package com.scubex.repository;

import com.scubex.model.Comment;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface CommentRepository extends JpaRepository<Comment, Long> {

    List<Comment> findByPublicationIdOrderByCreatedAtAsc(Long publicationId);

    long countByPublicationId(Long publicationId);
}
