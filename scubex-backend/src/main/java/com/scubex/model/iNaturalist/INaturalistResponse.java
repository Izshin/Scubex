package com.scubex.model.iNaturalist;
import java.util.List;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;

import lombok.Data;

@JsonIgnoreProperties(ignoreUnknown = true)  
@Data
public class INaturalistResponse {
    private List<INaturalistInfo> results;
    
    @JsonProperty("total_results")
    private Integer totalResults;
}
