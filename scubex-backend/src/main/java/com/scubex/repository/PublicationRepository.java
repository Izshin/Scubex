package com.scubex.repository;

import com.scubex.model.Publication;
import com.scubex.model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface PublicationRepository extends JpaRepository<Publication, Long> {

    @Query("SELECT p FROM Publication p LEFT JOIN FETCH p.user WHERE p.user = :user")
    List<Publication> findByUser(@Param("user") User user);

    List<Publication> findByLatitudeBetweenAndLongitudeBetween(
            Double latMin, Double latMax, Double lngMin, Double lngMax);

    @Query("SELECT p FROM Publication p LEFT JOIN FETCH p.user ORDER BY p.createdAt DESC")
    List<Publication> findAllByOrderByCreatedAtDesc();
}
