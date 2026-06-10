package com.scubex.model;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "cached_species")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CachedSpecies {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "cached_scan_id", nullable = false)
    private CachedScan cachedScan;

    private String commonName;

    @Column(nullable = false)
    private String scientificName;

    private String photoUrl;

    private String recordDate;

    private String phylum;

    private Double latitude;

    private Double longitude;

    private Integer numberOfOccurrences;

    // Eco-data
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
}
