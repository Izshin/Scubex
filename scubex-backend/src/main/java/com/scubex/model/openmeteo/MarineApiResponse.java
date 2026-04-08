package com.scubex.model.openmeteo;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;

import lombok.Data;

@Data
@JsonIgnoreProperties(ignoreUnknown = true)
public class MarineApiResponse {

    @JsonProperty("current")
    private CurrentMarine current;

    @Data
    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class CurrentMarine {

        @JsonProperty("wave_height")
        private Double waveHeight;

        @JsonProperty("wave_direction")
        private Double waveDirection;

        @JsonProperty("wave_period")
        private Double wavePeriod;

        @JsonProperty("sea_surface_temperature")
        private Double seaSurfaceTemperature;

        @JsonProperty("ocean_current_velocity")
        private Double oceanCurrentVelocity;

        @JsonProperty("ocean_current_direction")
        private Double oceanCurrentDirection;

        @JsonProperty("swell_wave_height")
        private Double swellWaveHeight;
    }
}
