package com.scubex.service;

import java.net.URI;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.util.UriComponentsBuilder;

import com.scubex.DTO.SpeciesResponse;
import com.scubex.model.iNaturalist.INaturalistInfo;
import com.scubex.model.iNaturalist.INaturalistResponse;
import com.scubex.model.obis.ObisOccurrence;
import com.scubex.model.obis.ObisResponse;

@Service
public class SpeciesService {
    
    @Autowired
    private RestTemplate restTemplate;
    
    @Value("${obis.api.url}")
    private String obisApiUrl;
    
    @Value("${inaturalist.api.taxa}")
    private String iNaturalistApiUrl;
    
    public List<SpeciesResponse> getSpeciesInSelectedArea(double lat, double lng, double radius) {
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
        int numPoints = 12; 
        double radiusInDegreesLat = radius / 111320.0; 
        double radiusInDegreesLng = radius / (111320.0 * Math.cos(Math.toRadians(lat))); 

        // Build WKT polygon string
        StringBuilder polygon = new StringBuilder("POLYGON((");
        
        for (int i = 0; i <= numPoints; i++) { // Note: <= to close the polygon
            double angle = (2.0 * Math.PI * i) / numPoints;
            double pointLat = lat + radiusInDegreesLat * Math.cos(angle);
            double pointLng = lng + radiusInDegreesLng * Math.sin(angle);
            
            // OBIS expects: longitude latitude (note the order!)
            polygon.append(String.format("%.6f %.6f", pointLng, pointLat));
            
            if (i < numPoints) {
                polygon.append(", ");
            }
        }
        
        polygon.append("))");
        
        return polygon.toString();
    }
    
    private List<ObisOccurrence> callObisApi(String polygon) {
    try {
        // RAW WKT coming from Swagger (lon lat pairs with spaces)
        String wkt = polygon.replaceAll("\\s+", " ").trim();

        // Option A (recommended): let Spring encode the whole URI
        UriComponentsBuilder b = UriComponentsBuilder
                .fromUriString(obisApiUrl + "/occurrence")
                .queryParam("geometry", wkt) // raw value; will be encoded below
                .queryParam("size", 1000)
                .queryParam("fields", "scientificName,decimalLatitude,decimalLongitude,eventDate")
                .queryParam("taxonid", "2,3,4");

        // build().encode() → encodes spaces as %20 (and other illegal chars) correctly
        URI uri = b.build().encode().toUri();
        System.out.println("🌊 OBIS final URI: " + uri);

        ResponseEntity<ObisResponse> res = restTemplate.getForEntity(uri, ObisResponse.class);
        if (!res.getStatusCode().is2xxSuccessful() || res.getBody() == null) {
            System.err.println("❌ OBIS HTTP " + res.getStatusCode() + " or empty body");
            return List.of();
        }

        ObisResponse body = res.getBody();
        List<ObisOccurrence> out = body.getResults() != null ? body.getResults() : List.of();
        System.out.println("✅ OBIS total=" + body.getTotal() + " results=" + out.size());
        return out;

    } catch (Exception e) {
        System.err.println("❌ Error calling/parsing OBIS: " + e.getMessage());
        return List.of();
    }
}

    private INaturalistResponse callINaturalistApi(String scientificName) {
        try {
            // Build iNaturalist search URL
            String url = iNaturalistApiUrl + "/taxa?" +
                        "q=" + java.net.URLEncoder.encode(scientificName, "UTF-8") +
                        "&per_page=1" +  // We only need the first result
                        "&order=desc&order_by=observations_count";  // Most observed first
            
            
            // Make HTTP GET request to iNaturalist
            String response = restTemplate.getForObject(url, String.class);
            
            // Parse JSON response manually
            if (response != null && !response.isEmpty()) {
                return parseINaturalistResponse(response);
            }
            
            return null;
            
        } catch (Exception e) {
            System.err.println("❌ Error calling iNaturalist API: " + e.getMessage());
            return null;
        }
    }
    
    /**
     * Manually parse iNaturalist JSON response
     * @param jsonResponse The JSON response string from iNaturalist API
     * @return INaturalistResponse object or null if parsing fails
     */
    private INaturalistResponse parseINaturalistResponse(String jsonResponse) {
        try {
            INaturalistResponse response = new INaturalistResponse();
            
            // Extract total_results
            String totalResultsPattern = "\"total_results\":(\\d+)";
            java.util.regex.Pattern pattern = java.util.regex.Pattern.compile(totalResultsPattern);
            java.util.regex.Matcher matcher = pattern.matcher(jsonResponse);
            
            if (matcher.find()) {
                response.setTotalResults(Integer.parseInt(matcher.group(1)));
            } else {
                response.setTotalResults(0);
            }
            
            // Extract results array
            List<INaturalistInfo> results = new ArrayList<>();
            
            // Find the results array in the JSON
            int resultsStart = jsonResponse.indexOf("\"results\":[");
            if (resultsStart != -1) {
                int arrayStart = jsonResponse.indexOf('[', resultsStart);
                int arrayEnd = findMatchingBracket(jsonResponse, arrayStart);
                
                if (arrayEnd != -1) {
                    String resultsArray = jsonResponse.substring(arrayStart + 1, arrayEnd);
                    
                    // Parse individual taxa objects
                    List<String> taxaObjects = extractJsonObjects(resultsArray);
                    
                    for (String taxaJson : taxaObjects) {
                        INaturalistInfo info = parseINaturalistInfo(taxaJson);
                        if (info != null) {
                            results.add(info);
                        }
                    }
                }
            }
            
            response.setResults(results);
            
            return response;
            
        } catch (Exception e) {
            System.err.println("❌ Error parsing iNaturalist JSON: " + e.getMessage());
            return null;
        }
    }
    
    /**
     * Parse individual iNaturalist info object from JSON
     */
    private INaturalistInfo parseINaturalistInfo(String jsonObject) {
        try {
            INaturalistInfo info = new INaturalistInfo();
            
            // Extract preferred_common_name
            String commonNamePattern = "\"preferred_common_name\":\\s*\"([^\"]+)\"";
            java.util.regex.Pattern pattern = java.util.regex.Pattern.compile(commonNamePattern);
            java.util.regex.Matcher matcher = pattern.matcher(jsonObject);
            
            if (matcher.find()) {
                info.setPreferred_common_name(matcher.group(1));
            }
            
            // Extract photo URL from default_photo.url
            String photoUrlPattern = "\"default_photo\":\\s*\\{[^}]*\"url\":\\s*\"([^\"]+)\"";
            pattern = java.util.regex.Pattern.compile(photoUrlPattern);
            matcher = pattern.matcher(jsonObject);
            
            if (matcher.find()) {
                info.setPhotoUrl(matcher.group(1));
            }
            
            return info;
            
        } catch (Exception e) {
            System.err.println("❌ Error parsing iNaturalist info: " + e.getMessage());
            return null;
        }
    }
    
    /**
     * Find the matching closing bracket for an array or object
     */
    private int findMatchingBracket(String json, int startIndex) {
        if (startIndex >= json.length()) return -1;
        
        char openChar = json.charAt(startIndex);
        char closeChar = (openChar == '[') ? ']' : '}';
        
        int count = 1;
        boolean inString = false;
        
        for (int i = startIndex + 1; i < json.length(); i++) {
            char c = json.charAt(i);
            
            if (c == '"' && (i == 0 || json.charAt(i - 1) != '\\')) {
                inString = !inString;
            } else if (!inString) {
                if (c == openChar) {
                    count++;
                } else if (c == closeChar) {
                    count--;
                    if (count == 0) {
                        return i;
                    }
                }
            }
        }
        
        return -1;
    }
    
    /**
     * Extract individual JSON objects from an array content
     */
    private List<String> extractJsonObjects(String arrayContent) {
        List<String> objects = new ArrayList<>();
        
        int start = 0;
        boolean inString = false;
        int braceCount = 0;
        
        for (int i = 0; i < arrayContent.length(); i++) {
            char c = arrayContent.charAt(i);
            
            if (c == '"' && (i == 0 || arrayContent.charAt(i - 1) != '\\')) {
                inString = !inString;
            } else if (!inString) {
                if (c == '{') {
                    if (braceCount == 0) {
                        start = i;
                    }
                    braceCount++;
                } else if (c == '}') {
                    braceCount--;
                    if (braceCount == 0) {
                        objects.add(arrayContent.substring(start, i + 1));
                    }
                }
            }
        }
        
        return objects;
    }
    
    // Helper methods for processing data
    
    /**
     * Groups OBIS occurrences by species (scientific name)
     * @param occurrences List of OBIS occurrences
     * @return Map where key = scientific name, value = list of occurrences for that species
     */
    private Map<String, List<ObisOccurrence>> groupBySpecies(List<ObisOccurrence> occurrences) {
        Map<String, List<ObisOccurrence>> grouped = new HashMap<>();
        
        for (ObisOccurrence occurrence : occurrences) {
            String scientificName = occurrence.getScientificName();
            
            // Skip occurrences without scientific name
            if (scientificName != null && !scientificName.trim().isEmpty()) {
                // Create new list for this species if it doesn't exist
                grouped.computeIfAbsent(scientificName, k -> new ArrayList<>()).add(occurrence);
            }
        }
        
        System.out.println("📊 Grouped " + occurrences.size() + " occurrences into " + grouped.size() + " species");
        return grouped;
    }
    
    /**
     * Finds the most recent occurrence from a list (based on event date)
     * @param occurrences List of occurrences for a species
     * @return Most recent occurrence, or first one if dates can't be parsed
     */
    private ObisOccurrence getMostRecentOccurrence(List<ObisOccurrence> occurrences) {
        if (occurrences == null || occurrences.isEmpty()) {
            return null;
        }
        
        ObisOccurrence mostRecent = occurrences.get(0);
        LocalDate mostRecentDate = parseEventDate(mostRecent.getEventDate());
        
        // Compare dates and find the most recent
        for (ObisOccurrence occurrence : occurrences) {
            LocalDate occurrenceDate = parseEventDate(occurrence.getEventDate());
            
            if (occurrenceDate != null && mostRecentDate != null) {
                if (occurrenceDate.isAfter(mostRecentDate)) {
                    mostRecent = occurrence;
                    mostRecentDate = occurrenceDate;
                }
            }
        }
        
        return mostRecent;
    }
    
    /**
     * Parses event date string to LocalDate (handles various formats)
     * @param eventDateStr Date string from OBIS API
     * @return Parsed LocalDate or null if parsing fails
     */
    private LocalDate parseEventDate(String eventDateStr) {
        if (eventDateStr == null || eventDateStr.trim().isEmpty()) {
            return null;
        }
        
        try {
            // Try common date formats
            if (eventDateStr.matches("\\d{4}-\\d{2}-\\d{2}")) {
                // Format: 2023-08-15
                return LocalDate.parse(eventDateStr, DateTimeFormatter.ISO_LOCAL_DATE);
            } else if (eventDateStr.matches("\\d{4}-\\d{2}-\\d{2}T.*")) {
                // Format: 2023-08-15T14:30:00Z (extract date part)
                return LocalDate.parse(eventDateStr.substring(0, 10), DateTimeFormatter.ISO_LOCAL_DATE);
            } else if (eventDateStr.matches("\\d{4}")) {
                // Format: 2023 (year only)
                return LocalDate.of(Integer.parseInt(eventDateStr), 1, 1);
            }
        } catch (Exception e) {
            System.err.println("⚠️  Could not parse date: " + eventDateStr);
        }
        
        return null;
    }
    
    /**
     * Builds final SpeciesResponse object combining OBIS and iNaturalist data
     * @param scientificName Scientific name of the species
     * @param occurrences List of OBIS occurrences for this species
     * @param mostRecent Most recent occurrence (for coordinates)
     * @param iNatData iNaturalist data (common name, photos)
     * @return Complete SpeciesResponse object
     */
    private SpeciesResponse buildSpeciesResponse(String scientificName, List<ObisOccurrence> occurrences, 
                                               ObisOccurrence mostRecent, INaturalistResponse iNatData) {
        SpeciesResponse species = new SpeciesResponse();
        
        // Basic information from OBIS
        species.setScientificName(scientificName);
        species.setNumberOfOccurrences(occurrences.size());
        
        // Coordinates and date from most recent occurrence
        if (mostRecent != null) {
            species.setLatitude(mostRecent.getDecimalLatitude());
            species.setLongitude(mostRecent.getDecimalLongitude());
            species.setRecordDate(mostRecent.getEventDate());
        }
        
        // Enhanced information from iNaturalist
        if (iNatData != null && iNatData.getTotalResults() > 0 && 
            iNatData.getResults() != null && !iNatData.getResults().isEmpty()) {
            
            INaturalistInfo firstResult = iNatData.getResults().get(0);
            
            // Extract common name
            if (firstResult.getPreferred_common_name() != null) {
                species.setCommonName(firstResult.getPreferred_common_name());
            }
            
            // Extract photo URL
            if (firstResult.getPhotoUrl() != null) {
                species.setPhotoUrl(firstResult.getPhotoUrl());
            }
            
        
        } else {
            System.out.println("⚠️  No iNaturalist data found for " + scientificName);
        }
        
        return species;
    }
}