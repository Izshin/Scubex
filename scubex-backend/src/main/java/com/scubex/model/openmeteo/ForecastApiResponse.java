package com.scubex.model.openmeteo;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;

import lombok.Data;

@Data
@JsonIgnoreProperties(ignoreUnknown = true)
public class ForecastApiResponse {

    @JsonProperty("current")
    private CurrentWeather current;

    @Data
    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class CurrentWeather {

        @JsonProperty("temperature_2m")
        private Double temperature;

        @JsonProperty("relative_humidity_2m")
        private Double relativeHumidity;

        @JsonProperty("wind_speed_10m")
        private Double windSpeed;

        @JsonProperty("wind_direction_10m")
        private Double windDirection;

        @JsonProperty("precipitation")
        private Double precipitation;

        @JsonProperty("precipitation_probability")
        private Double precipitationProbability;

        @JsonProperty("snowfall")
        private Double snowfall;

        @JsonProperty("visibility")
        private Double visibility;

        @JsonProperty("weather_code")
        private Integer weatherCode;
    }
}
