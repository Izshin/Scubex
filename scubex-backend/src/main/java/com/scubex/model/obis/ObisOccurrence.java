package com.scubex.model.obis;

import lombok.Data;

@Data
public class ObisOccurrence {
    private String scientificName;
    private Double decimalLatitude;
    private Double decimalLongitude;
    private String eventDate;
    private String phylum;
    
}

