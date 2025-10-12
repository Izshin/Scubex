package com.scubex.controller;

import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.scubex.DTO.SpeciesResponse;
import com.scubex.service.SpeciesService;

@RestController
@RequestMapping("/api/species")
@CrossOrigin(origins = "http://localhost:5173")


public class SpeciesController {
    @Autowired
    private SpeciesService speciesService;

    @GetMapping
    public ResponseEntity<List<SpeciesResponse>> getSpeciesInSelectedArea(
        @RequestParam double lat,
        @RequestParam double lng,
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
