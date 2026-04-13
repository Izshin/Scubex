package com.scubex.DTO;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class WeatherResponse {

    // Atmospheric (from Forecast API)
    private Double temperature;
    private Double humidity;
    private Double windSpeed;
    private Double windDirection;
    private Double precipitation;
    private Double precipitationProbability;
    private Double snowfall;
    private Double visibility;
    private Integer weatherCode;

    // Marine (from Marine API)
    private Double waveHeight;
    private Double waveDirection;
    private Double wavePeriod;
    private Double seaSurfaceTemperature;
    private Double oceanCurrentVelocity;
    private Double oceanCurrentDirection;
    private Double swellWaveHeight;
    private Double seaLevelHeight;

    // Diving condition evaluation
    private String divingCondition;

}
