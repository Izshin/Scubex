package com.scubex.model.openmeteo;

import java.util.List;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;

import lombok.Data;

@Data
@JsonIgnoreProperties(ignoreUnknown = true)
public class ForecastApiResponse {

    @JsonProperty("current")
    private CurrentWeather current;

    @JsonProperty("daily")
    private DailyForecast daily;

    @Data
    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class DailyForecast {

        @JsonProperty("time")
        private List<String> time;

        @JsonProperty("weather_code")
        private List<Integer> weatherCode;

        @JsonProperty("temperature_2m_max")
        private List<Double> temperatureMax;

        @JsonProperty("temperature_2m_min")
        private List<Double> temperatureMin;

        @JsonProperty("precipitation_probability_max")
        private List<Double> precipitationProbabilityMax;

        @JsonProperty("wind_speed_10m_max")
        private List<Double> windSpeedMax;
    }

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
