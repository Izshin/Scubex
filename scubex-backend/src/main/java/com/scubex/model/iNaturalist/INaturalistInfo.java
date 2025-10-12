package com.scubex.model.iNaturalist;

import java.util.Map;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;

import lombok.Data;

@Data
@JsonIgnoreProperties(ignoreUnknown = true)
public class INaturalistInfo{
    private String preferred_common_name;
    private String photoUrl;
    
    @JsonProperty("default_photo")
    private void setDefaultPhoto(Map<String, Object> defaultPhoto) {
        if (defaultPhoto != null && defaultPhoto.containsKey("url")) {
            this.photoUrl = (String) defaultPhoto.get("url");
        }
    }
}

