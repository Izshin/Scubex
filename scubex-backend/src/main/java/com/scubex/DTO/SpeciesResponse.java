package com.scubex.DTO;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SpeciesResponse {
    
    private String commonName;
    private String scientificName;
    private String photoUrl;
    private String recordDate;
    private String phylum;
    private Double latitude;
    private Double longitude;
    private Integer numberOfOccurrences;
    
}
    