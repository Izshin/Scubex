package com.scubex.repository;

import java.time.Instant;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.scubex.model.CachedWeather;

public interface CachedWeatherRepository extends JpaRepository<CachedWeather, Long> {

    Optional<CachedWeather> findFirstByRoundedLatAndRoundedLngAndCreatedAtAfter(
            Double roundedLat, Double roundedLng, Instant after);

    void deleteByCreatedAtBefore(Instant before);
}
