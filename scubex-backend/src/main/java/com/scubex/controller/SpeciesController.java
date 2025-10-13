package com.scubex.controller;

import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.scubex.DTO.SpeciesResponse;
import com.scubex.service.SpeciesService;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;

@RestController
@RequestMapping("/api/species")
@Tag(name = "Species", description = "Marine species discovery API")
public class SpeciesController {
    @Autowired
    private SpeciesService speciesService;

    @GetMapping
    @Operation(
        summary = "Discover marine species in an area", 
        description = "Returns marine species found within a circular area using OBIS and iNaturalist APIs"
    )
    @ApiResponses(value = {
        @ApiResponse(responseCode = "200", description = "Species found successfully"),
        @ApiResponse(responseCode = "400", description = "Invalid coordinates or radius")
    })



    public ResponseEntity<List<SpeciesResponse>> getSpeciesInSelectedArea(
        @Parameter(description = "Latitude (-90 to 90)", example = "36.722656") 
        @RequestParam double lat,
        @Parameter(description = "Longitude (-180 to 180)", example = " -3.727697")
        @RequestParam double lng,
        @Parameter(description = "Search radius in meters", example = "1000")
        @RequestParam double radius
    ) {
        // Validate parameters
        if (lat < -90 || lat > 90 || lng < -180 || lng > 180 || radius <= 0) {
            return ResponseEntity.badRequest().build();
        }
        
        // Call service to process OBIS + iNaturalist data
        List<SpeciesResponse> species = speciesService.getSpeciesInSelectedArea(lat, lng, radius);

        return ResponseEntity.ok(species);
    }
}
