package com.scubex.model;

import java.time.Instant;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "cached_weather", indexes = {
    @Index(name = "idx_cached_weather_coords", columnList = "roundedLat, roundedLng")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CachedWeather {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private Double roundedLat;

    @Column(nullable = false)
    private Double roundedLng;

    @Column(nullable = false)
    private Instant createdAt;

    // Atmospheric
    private Double temperature;
    private Double humidity;
    private Double windSpeed;
    private Double windDirection;
    private Double precipitation;
    private Double precipitationProbability;
    private Double snowfall;
    private Double visibility;
    private Integer weatherCode;

    // Marine
    private Double waveHeight;
    private Double waveDirection;
    private Double wavePeriod;
    private Double seaSurfaceTemperature;
    private Double oceanCurrentVelocity;
    private Double oceanCurrentDirection;
    private Double swellWaveHeight;
    private Double seaLevelHeight;
    private String divingCondition;

    @PrePersist
    protected void onCreate() {
        createdAt = Instant.now();
    }
}
