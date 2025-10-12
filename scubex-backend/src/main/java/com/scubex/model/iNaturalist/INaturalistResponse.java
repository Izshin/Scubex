package com.scubex.model.iNaturalist;
import java.util.List;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import lombok.Data;

@JsonIgnoreProperties(ignoreUnknown = true)  
@Data

public class INaturalistResponse {
    private List<INaturalistInfo> results;
    private Integer totalResults;
}
