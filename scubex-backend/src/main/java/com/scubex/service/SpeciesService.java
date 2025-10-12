package com.scubex.service;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import com.scubex.DTO.SpeciesResponse;
import com.scubex.model.obis.ObisOccurrence;

@Service
public class SpeciesService {
    
    @Autowired
    private RestTemplate restTemplate;
    
    @Value("${obis.api.url}")
    private String obisApiUrl;
    
    @Value("${inaturalist.api.taxa}")
    private String iNaturalistApiUrl;
    
    public List<SpeciesResponse> getSpeciesInArea(double lat, double lng, double radius) {
        // 1. Create polygon from coordinates + radius
        String polygon = createPolygonFromRadius(lat, lng, radius);
        
        // 2. Call OBIS API
        List<ObisOccurrence> obisData = callObisApi(polygon);
        
        // 3. Group by species and count occurrences
        Map<String, List<ObisOccurrence>> groupedBySpecies = groupBySpecies(obisData);
        
        // 4. Process each species with iNaturalist
        List<SpeciesResponse> enrichedSpecies = new ArrayList<>();
        
        for (Map.Entry<String, List<ObisOccurrence>> entry : groupedBySpecies.entrySet()) {
            String scientificName = entry.getKey();
            List<ObisOccurrence> occurrences = entry.getValue();
            
            // Get most recent occurrence for coordinates
            ObisOccurrence mostRecent = getMostRecentOccurrence(occurrences);
            
            // Call iNaturalist for this species
            INaturalistResponse iNatData = callINaturalistApi(scientificName);
            
            // Filter out microorganisms (total_results=0)
            if (iNatData != null && iNatData.getTotalResults() > 0) {
                SpeciesResponse species = buildSpeciesResponse(scientificName, occurrences, mostRecent, iNatData);
                enrichedSpecies.add(species);
            }
        }
        
        return enrichedSpecies;
    }
    
    private String createPolygonFromRadius(double lat, double lng, double radius) {
        // Convert radius to degrees and create polygon
        // Implementation coming next
    }
    
    private List<ObisOccurrence> callObisApi(String polygon) {
        // OBIS API call implementation
    }
    
    private INaturalistResponse callINaturalistApi(String scientificName) {
        // iNaturalist API call implementation
    }
    
    // Helper methods for processing data...
}