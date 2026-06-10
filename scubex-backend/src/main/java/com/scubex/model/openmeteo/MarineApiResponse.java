package com.scubex.model.openmeteo;

import java.util.List;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;

import lombok.Data;

@Data
@JsonIgnoreProperties(ignoreUnknown = true)
public class MarineApiResponse {

    @JsonProperty("current")
    private CurrentMarine current;

    @JsonProperty("daily")
    private DailyMarine daily;

    @Data
    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class DailyMarine {

        @JsonProperty("time")
        private List<String> time;

        @JsonProperty("wave_height_max")
        private List<Double> waveHeightMax;

        @JsonProperty("swell_wave_height_max")
        private List<Double> swellWaveHeightMax;
    }

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

        @JsonProperty("sea_level_height_msl")
        private Double seaLevelHeight;
    }
}
