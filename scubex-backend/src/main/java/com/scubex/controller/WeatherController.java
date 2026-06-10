package com.scubex.controller;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.scubex.DTO.DailyForecastResponse;
import com.scubex.DTO.WeatherResponse;
import com.scubex.service.WeatherService;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;

import java.util.List;

@RestController
@RequestMapping("/api/weather")
@Tag(name = "Weather", description = "Weather and marine conditions API")
public class WeatherController {

    @Autowired
    private WeatherService weatherService;

    @GetMapping
    @Operation(
        summary = "Get current weather and marine conditions",
        description = "Returns atmospheric weather (temperature, wind, precipitation) and marine conditions "
                + "(waves, currents, sea temperature) for a given location using Open-Meteo APIs"
    )
    @ApiResponses(value = {
        @ApiResponse(responseCode = "200", description = "Weather data retrieved successfully"),
        @ApiResponse(responseCode = "400", description = "Invalid coordinates")
    })
    public ResponseEntity<WeatherResponse> getWeather(
        @Parameter(description = "Latitude (-90 to 90)", example = "36.722656")
        @RequestParam double lat,
        @Parameter(description = "Longitude (-180 to 180)", example = "-3.727697")
        @RequestParam double lng
    ) {
        if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
            return ResponseEntity.badRequest().build();
        }

        WeatherResponse weather = weatherService.getWeather(lat, lng);
        return ResponseEntity.ok(weather);
    }

    @GetMapping("/forecast")
    @Operation(
        summary = "Get 7-day diving forecast",
        description = "Returns daily aggregated weather and marine data with server-side diving condition evaluation"
    )
    @ApiResponses(value = {
        @ApiResponse(responseCode = "200", description = "Forecast retrieved successfully"),
        @ApiResponse(responseCode = "400", description = "Invalid coordinates")
    })
    public ResponseEntity<List<DailyForecastResponse>> getForecast(
        @Parameter(description = "Latitude (-90 to 90)", example = "36.722656")
        @RequestParam double lat,
        @Parameter(description = "Longitude (-180 to 180)", example = "-3.727697")
        @RequestParam double lng
    ) {
        if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
            return ResponseEntity.badRequest().build();
        }
        return ResponseEntity.ok(weatherService.getForecast(lat, lng));
    }
}
