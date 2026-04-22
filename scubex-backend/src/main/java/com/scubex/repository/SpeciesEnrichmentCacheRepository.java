package com.scubex.repository;

import com.scubex.model.SpeciesEnrichmentCache;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.Instant;
import java.util.Optional;

public interface SpeciesEnrichmentCacheRepository extends JpaRepository<SpeciesEnrichmentCache, Long> {

    Optional<SpeciesEnrichmentCache> findByScientificNameAndCachedAtAfter(String scientificName, Instant after);

    void deleteByScientificNameNotNullAndCachedAtBefore(Instant before);
}
