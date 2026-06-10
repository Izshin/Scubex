package com.scubex.model;

import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;

@Entity
@Table(name = "species_enrichment_cache", indexes = {
    @Index(name = "idx_enrichment_name", columnList = "scientificName")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SpeciesEnrichmentCache {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true)
    private String scientificName;

    /** True if iNaturalist returned results for this species. False = skip on future scans. */
    @Column(nullable = false)
    private boolean hasInatData;

    private String commonName;
    private String photoUrl;

    // Eco-data from OBIS /statistics + /statistics/env + /checklist/redlist
    private Integer depthMin;
    private Integer depthMax;
    private Integer tempMin;
    private Integer tempMax;
    private Integer firstYear;
    private Integer lastYear;
    private Integer globalRecords;
    private String iucnCategory;

    @Column(columnDefinition = "TEXT")
    private String description;

    private String wikipediaUrl;

    private Boolean invasive;

    @Column(nullable = false)
    private Instant cachedAt;

    @PrePersist
    protected void onCreate() {
        cachedAt = Instant.now();
    }
}
