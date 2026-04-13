package com.scubex.repository;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.scubex.model.CachedScan;

public interface CachedScanRepository extends JpaRepository<CachedScan, Long> {

    Optional<CachedScan> findFirstByRoundedLatAndRoundedLngAndRadiusAndCreatedAtAfter(
            Double roundedLat, Double roundedLng, Double radius, Instant after);

    Optional<CachedScan> findFirstByRoundedLatAndRoundedLngAndRadiusGreaterThanEqualAndCreatedAtAfterOrderByRadiusDesc(
            Double roundedLat, Double roundedLng, Double radius, Instant after);

    List<CachedScan> findByCreatedAtBefore(Instant before);

    void deleteByCreatedAtBefore(Instant before);
}
