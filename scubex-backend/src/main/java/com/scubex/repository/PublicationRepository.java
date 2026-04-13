package com.scubex.repository;

import com.scubex.model.Publication;
import com.scubex.model.User;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface PublicationRepository extends JpaRepository<Publication, Long> {

    List<Publication> findByUser(User user);

    List<Publication> findByLatitudeBetweenAndLongitudeBetween(
            Double latMin, Double latMax, Double lngMin, Double lngMax);

    List<Publication> findAllByOrderByCreatedAtDesc();
}
