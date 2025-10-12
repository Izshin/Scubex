package com.scubex.model.obis;

import java.util.List;

import lombok.Data;

@Data
public class ObisResponse {
    private List<ObisOccurrence> results;  
    private Integer total;                
}