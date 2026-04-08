package com.scubex.model;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "cached_scans", indexes = {
    @Index(name = "idx_cached_scan_coords", columnList = "roundedLat, roundedLng, radius")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CachedScan {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private Double roundedLat;

    @Column(nullable = false)
    private Double roundedLng;

    @Column(nullable = false)
    private Double radius;

    @Column(nullable = false)
    private Instant createdAt;

    @OneToMany(mappedBy = "cachedScan", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private List<CachedSpecies> species = new ArrayList<>();

    @PrePersist
    protected void onCreate() {
        createdAt = Instant.now();
    }
}
