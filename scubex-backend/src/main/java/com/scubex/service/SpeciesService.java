package com.scubex.service;

import java.net.URI;
import java.time.Instant;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Semaphore;
import java.util.stream.Collectors;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.util.UriComponentsBuilder;

import com.scubex.DTO.SpeciesResponse;
import com.scubex.model.CachedScan;
import com.scubex.model.CachedSpecies;
import com.scubex.model.SpeciesEnrichmentCache;
import com.scubex.model.iNaturalist.INaturalistInfo;
import com.scubex.model.iNaturalist.INaturalistResponse;
import com.scubex.model.obis.ObisOccurrence;
import com.scubex.model.obis.ObisResponse;
import com.scubex.repository.CachedScanRepository;
import com.scubex.repository.SpeciesEnrichmentCacheRepository;

@Service
public class SpeciesService {

    @Autowired
    private RestTemplate restTemplate;

    @Autowired
    private CachedScanRepository cachedScanRepository;

    @Autowired
    private SpeciesEnrichmentCacheRepository speciesEnrichmentCacheRepository;

    @Value("${obis.api.url}")
    private String obisApiUrl;

    @Value("${inaturalist.api.taxa}")
    private String iNaturalistApiUrl;

    /**
     * Adaptive coordinate rounding based on scan radius.
     * Larger radii use coarser rounding to maximize cache hits.
     *   - radius <= 1000m  → 0.01° (~1.1 km tolerance)
     *   - radius <= 2000m  → 0.05° (~5.5 km tolerance)
     *   - radius >  2000m  → 0.1°  (~11 km tolerance)
     */
    private static double roundCoord(double value, double radius) {
        double step;
        if (radius <= 1000) {
            step = 0.01;
        } else if (radius <= 2000) {
            step = 0.05;
        } else {
            step = 0.1;
        }
        return Math.round(value / step) * step;
    }

    public List<SpeciesResponse> getSpeciesInSelectedArea(double lat, double lng, double radius) {
        double roundedLat = roundCoord(lat, radius);
        double roundedLng = roundCoord(lng, radius);

        // Check cache: reuse any cached scan with radius >= requested radius
        Instant cutoff = Instant.now().minus(48, ChronoUnit.HOURS);
        Optional<CachedScan> cached = cachedScanRepository
                .findFirstByRoundedLatAndRoundedLngAndRadiusGreaterThanEqualAndCreatedAtAfterOrderByRadiusDesc(
                        roundedLat, roundedLng, radius, cutoff);

        if (cached.isPresent()) {
            CachedScan cachedScan = cached.get();
            boolean needsFilter = cachedScan.getRadius() > radius;
            return cachedScan.getSpecies().stream()
                    .filter(cs -> !needsFilter || isWithinRadius(lat, lng, radius,
                            cs.getLatitude(), cs.getLongitude()))
                    .map(cs -> SpeciesResponse.builder()
                            .commonName(cs.getCommonName())
                            .scientificName(cs.getScientificName())
                            .photoUrl(cs.getPhotoUrl())
                            .recordDate(cs.getRecordDate())
                            .phylum(cs.getPhylum())
                            .latitude(cs.getLatitude())
                            .longitude(cs.getLongitude())
                            .numberOfOccurrences(cs.getNumberOfOccurrences())
                            .depthMin(cs.getDepthMin())
                            .depthMax(cs.getDepthMax())
                            .tempMin(cs.getTempMin())
                            .tempMax(cs.getTempMax())
                            .firstYear(cs.getFirstYear())
                            .lastYear(cs.getLastYear())
                            .globalRecords(cs.getGlobalRecords())
                            .iucnCategory(cs.getIucnCategory())
                            .build())
                    .toList();
        }

        // 1. Create polygon from coordinates + radius
        String polygon = createPolygonFromRadius(lat, lng, radius);

        // 2. Call OBIS API
        List<ObisOccurrence> obisData = callObisApi(polygon);

        // 3. Group by species and count occurrences
        Map<String, List<ObisOccurrence>> groupedBySpecies = groupBySpecies(obisData);

        // 4. Process all species in parallel using virtual threads
        // Semaphore limits concurrent iNaturalist calls to avoid 429
        Semaphore iNatSemaphore = new Semaphore(3);
        ExecutorService executor = Executors.newVirtualThreadPerTaskExecutor();

        Instant enrichmentCutoff = Instant.now().minus(30, ChronoUnit.DAYS);

        List<CompletableFuture<Optional<SpeciesResponse>>> futures = groupedBySpecies.entrySet().stream()
            .map(entry -> CompletableFuture.supplyAsync(() -> {
                String scientificName = entry.getKey();
                List<ObisOccurrence> occurrences = entry.getValue();
                ObisOccurrence mostRecent = getMostRecentOccurrence(occurrences);

                // Check enrichment cache first (iNaturalist + eco-stats are global per species)
                Optional<SpeciesEnrichmentCache> cachedEnrichment = speciesEnrichmentCacheRepository
                        .findByScientificNameAndCachedAtAfter(scientificName, enrichmentCutoff);
                if (cachedEnrichment.isPresent()) {
                    SpeciesEnrichmentCache enrichment = cachedEnrichment.get();
                    if (!enrichment.isHasInatData()) {
                        return Optional.<SpeciesResponse>empty();
                    }
                    return Optional.of(buildSpeciesResponseFromCache(scientificName, occurrences, mostRecent, enrichment));
                }

                // Cache miss: call external APIs
                INaturalistResponse iNatData = null;
                try {
                    iNatSemaphore.acquire();
                    iNatData = callINaturalistApi(scientificName);
                } catch (InterruptedException e) {
                    Thread.currentThread().interrupt();
                } finally {
                    iNatSemaphore.release();
                }

                if (iNatData == null || iNatData.getTotalResults() == null || iNatData.getTotalResults() == 0) {
                    saveEnrichmentCache(scientificName, false, null, null);
                    return Optional.<SpeciesResponse>empty();
                }

                ObisEcoData ecoData = callObisEcoStats(scientificName, executor);
                saveEnrichmentCache(scientificName, true, iNatData, ecoData);
                return Optional.of(buildSpeciesResponse(scientificName, occurrences, mostRecent, iNatData, ecoData));
            }, executor))
            .collect(Collectors.toList());

        List<SpeciesResponse> enrichedSpecies = futures.stream()
            .map(CompletableFuture::join)
            .filter(Optional::isPresent)
            .map(Optional::get)
            .collect(Collectors.toList());

        executor.shutdown();

        // Save to cache
        saveToCache(roundedLat, roundedLng, radius, enrichedSpecies);

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
            polygon.append(String.format(Locale.US, "%.6f %.6f", pointLng, pointLat));

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
                    .queryParam("fields", "scientificName,decimalLatitude,decimalLongitude,eventDate,phylum")
                    .queryParam("taxonid", "2,3,4");

            // build().encode() → encodes spaces as %20 (and other illegal chars) correctly
            URI uri = b.build().encode().toUri();

            ResponseEntity<ObisResponse> res = restTemplate.getForEntity(uri, ObisResponse.class);
            if (!res.getStatusCode().is2xxSuccessful() || res.getBody() == null) {
                return List.of();
            }

            ObisResponse body = res.getBody();
            List<ObisOccurrence> out = body.getResults() != null ? body.getResults() : List.of();
            return out;

        } catch (Exception e) {
            return List.of();
        }
    }

    // ─── Inner record to hold OBIS eco-stats ───────────────────────────────────
    private record ObisEcoData(
        Integer depthMin, Integer depthMax,
        Integer tempMin,  Integer tempMax,
        Integer firstYear, Integer lastYear,
        Integer globalRecords, String iucnCategory
    ) {}

    @SuppressWarnings("unchecked")
    private ObisEcoData callObisEcoStats(String scientificName, ExecutorService executor) {

        // --- call 1: /statistics (records + yearrange) ---
        CompletableFuture<int[]> statsFuture = CompletableFuture.supplyAsync(() -> {
            // [globalRecords, firstYear, lastYear]
            int[] result = new int[]{-1, -1, -1};
            try {
                URI uri = UriComponentsBuilder.fromUriString(obisApiUrl + "/statistics")
                        .queryParam("scientificname", scientificName)
                        .build().encode().toUri();
                ResponseEntity<Map> resp = restTemplate.getForEntity(uri, Map.class);
                if (resp.getStatusCode().is2xxSuccessful() && resp.getBody() != null) {
                    Map<?, ?> body = resp.getBody();
                    if (body.get("records") instanceof Number n) result[0] = n.intValue();
                    if (body.get("yearrange") instanceof List<?> yr && yr.size() == 2) {
                        if (yr.get(0) instanceof Number y0) result[1] = y0.intValue();
                        if (yr.get(1) instanceof Number y1) result[2] = y1.intValue();
                    }
                }
            } catch (Exception e) {
                // ignore stats error
            }
            return result;
        }, executor);

        // --- call 2: /statistics/env (depth + SST) ---
        CompletableFuture<int[]> envFuture = CompletableFuture.supplyAsync(() -> {
            // [depthMin, depthMax, tempMin, tempMax]
            int[] result = new int[]{Integer.MAX_VALUE, Integer.MIN_VALUE, Integer.MAX_VALUE, Integer.MIN_VALUE};
            try {
                URI uri = UriComponentsBuilder.fromUriString(obisApiUrl + "/statistics/env")
                        .queryParam("scientificname", scientificName)
                        .build().encode().toUri();
                ResponseEntity<Map> resp = restTemplate.getForEntity(uri, Map.class);
                if (resp.getStatusCode().is2xxSuccessful() && resp.getBody() != null) {
                    Map<?, ?> body = resp.getBody();
                    if (body.get("depth") instanceof List<?> depths) {
                        for (Object o : depths) {
                            if (o instanceof Map<?,?> m
                                    && m.get("records") instanceof Number rec && rec.intValue() > 0
                                    && m.get("from") instanceof Number f) {
                                int v = f.intValue();
                                if (v < result[0]) result[0] = v;
                                if (v > result[1]) result[1] = v;
                            }
                        }
                    }
                    if (body.get("sst") instanceof List<?> ssts) {
                        for (Object o : ssts) {
                            if (o instanceof Map<?,?> m
                                    && m.get("records") instanceof Number rec && rec.intValue() > 0
                                    && m.get("sst") instanceof Number t) {
                                int v = t.intValue();
                                if (v < result[2]) result[2] = v;
                                if (v > result[3]) result[3] = v;
                            }
                        }
                    }
                }
            } catch (Exception e) {
                // ignore env error
            }
            return result;
        }, executor);

        // --- call 3: /checklist/redlist (IUCN) ---
        CompletableFuture<String> iucnFuture = CompletableFuture.supplyAsync(() -> {
            try {
                URI uri = UriComponentsBuilder.fromUriString(obisApiUrl + "/checklist/redlist")
                        .queryParam("scientificname", scientificName)
                        .queryParam("size", 1)
                        .build().encode().toUri();
                ResponseEntity<Map> resp = restTemplate.getForEntity(uri, Map.class);
                if (resp.getStatusCode().is2xxSuccessful() && resp.getBody() != null) {
                    if (resp.getBody().get("results") instanceof List<?> results && !results.isEmpty()) {
                        if (results.get(0) instanceof Map<?,?> first && first.get("category") instanceof String cat) {
                            return cat;
                        }
                    }
                }
            } catch (Exception e) {
                // ignore redlist error
            }
            return null;
        }, executor);

        // Wait for all 3 in parallel
        CompletableFuture.allOf(statsFuture, envFuture, iucnFuture).join();

        int[] stats = statsFuture.join();
        int[] env   = envFuture.join();
        String iucnCategory = iucnFuture.join();

        Integer globalRecords = stats[0] >= 0 ? stats[0] : null;
        Integer firstYear     = stats[1] >= 0 ? stats[1] : null;
        Integer lastYear      = stats[2] >= 0 ? stats[2] : null;
        Integer depthMin      = env[0] != Integer.MAX_VALUE ? env[0] : null;
        Integer depthMax      = env[1] != Integer.MIN_VALUE ? env[1] : null;
        Integer tempMin       = env[2] != Integer.MAX_VALUE ? env[2] : null;
        Integer tempMax       = env[3] != Integer.MIN_VALUE ? env[3] : null;

        return new ObisEcoData(depthMin, depthMax, tempMin, tempMax, firstYear, lastYear, globalRecords, iucnCategory);
    }

    private INaturalistResponse callINaturalistApi(String scientificName) {
        try {
            // Build iNaturalist search URL with UriComponentsBuilder for proper encoding
            URI uri = UriComponentsBuilder.fromUriString(iNaturalistApiUrl + "/taxa")
                    .queryParam("q", scientificName)
                    .queryParam("per_page", 1) // We only need the first result
                    .queryParam("order", "desc")
                    .queryParam("order_by", "observations_count") // Most observed first
                    .build()
                    .encode()
                    .toUri();

            // Use automatic JSON deserialization instead of manual parsing
            ResponseEntity<INaturalistResponse> response = restTemplate.getForEntity(uri, INaturalistResponse.class);

            if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null) {
                return response.getBody();
            }

            return null;

        } catch (Exception e) {
            return null;
        }
    }

    // Helper methods for processing data

    /**
     * Groups OBIS occurrences by species (scientific name)
     * 
     * @param occurrences List of OBIS occurrences
     * @return Map where key = scientific name, value = list of occurrences for that
     *         species
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

        return grouped;
    }

    /**
     * Finds the most recent occurrence from a list (based on event date)
     * 
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
     * 
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
            // ignore unparseable date
        }

        return null;
    }

    /**
     * Builds final SpeciesResponse object combining OBIS and iNaturalist data
     * 
     * @param scientificName Scientific name of the species
     * @param occurrences    List of OBIS occurrences for this species
     * @param mostRecent     Most recent occurrence (for coordinates)
     * @param iNatData       iNaturalist data (common name, photos)
     * @return Complete SpeciesResponse object
     */
    private SpeciesResponse buildSpeciesResponse(String scientificName, List<ObisOccurrence> occurrences,
            ObisOccurrence mostRecent, INaturalistResponse iNatData, ObisEcoData eco) {
        SpeciesResponse species = new SpeciesResponse();

        // Basic information from OBIS
        species.setScientificName(scientificName);
        species.setNumberOfOccurrences(occurrences.size());

        // Coordinates and date from most recent occurrence
        if (mostRecent != null) {
            species.setLatitude(mostRecent.getDecimalLatitude());
            species.setLongitude(mostRecent.getDecimalLongitude());
            species.setRecordDate(mostRecent.getEventDate());
            species.setPhylum(mostRecent.getPhylum());
        }

        // Enhanced information from iNaturalist
        if (iNatData != null && iNatData.getTotalResults() > 0 &&
                iNatData.getResults() != null && !iNatData.getResults().isEmpty()) {
            INaturalistInfo firstResult = iNatData.getResults().get(0);
            if (firstResult.getPreferred_common_name() != null) {
                species.setCommonName(firstResult.getPreferred_common_name());
            }
            if (firstResult.getPhotoUrl() != null) {
                species.setPhotoUrl(firstResult.getPhotoUrl());
            }
        } else {
            // no iNaturalist data for this species
        }

        // Eco-data from OBIS statistics
        if (eco != null) {
            species.setDepthMin(eco.depthMin());
            species.setDepthMax(eco.depthMax());
            species.setTempMin(eco.tempMin());
            species.setTempMax(eco.tempMax());
            species.setFirstYear(eco.firstYear());
            species.setLastYear(eco.lastYear());
            species.setGlobalRecords(eco.globalRecords());
            species.setIucnCategory(eco.iucnCategory());
        }

        return species;
    }

    private SpeciesResponse buildSpeciesResponseFromCache(String scientificName, List<ObisOccurrence> occurrences,
            ObisOccurrence mostRecent, SpeciesEnrichmentCache enrichment) {
        SpeciesResponse species = new SpeciesResponse();
        species.setScientificName(scientificName);
        species.setNumberOfOccurrences(occurrences.size());
        if (mostRecent != null) {
            species.setLatitude(mostRecent.getDecimalLatitude());
            species.setLongitude(mostRecent.getDecimalLongitude());
            species.setRecordDate(mostRecent.getEventDate());
            species.setPhylum(mostRecent.getPhylum());
        }
        species.setCommonName(enrichment.getCommonName());
        species.setPhotoUrl(enrichment.getPhotoUrl());
        species.setDepthMin(enrichment.getDepthMin());
        species.setDepthMax(enrichment.getDepthMax());
        species.setTempMin(enrichment.getTempMin());
        species.setTempMax(enrichment.getTempMax());
        species.setFirstYear(enrichment.getFirstYear());
        species.setLastYear(enrichment.getLastYear());
        species.setGlobalRecords(enrichment.getGlobalRecords());
        species.setIucnCategory(enrichment.getIucnCategory());
        return species;
    }

    private void saveEnrichmentCache(String scientificName, boolean hasInatData,
            INaturalistResponse iNatData, ObisEcoData ecoData) {
        try {
            String commonName = null;
            String photoUrl = null;
            if (hasInatData && iNatData != null
                    && iNatData.getResults() != null && !iNatData.getResults().isEmpty()) {
                INaturalistInfo first = iNatData.getResults().get(0);
                commonName = first.getPreferred_common_name();
                photoUrl = first.getPhotoUrl();
            }
            speciesEnrichmentCacheRepository.save(SpeciesEnrichmentCache.builder()
                    .scientificName(scientificName)
                    .hasInatData(hasInatData)
                    .commonName(commonName)
                    .photoUrl(photoUrl)
                    .depthMin(ecoData != null ? ecoData.depthMin() : null)
                    .depthMax(ecoData != null ? ecoData.depthMax() : null)
                    .tempMin(ecoData != null ? ecoData.tempMin() : null)
                    .tempMax(ecoData != null ? ecoData.tempMax() : null)
                    .firstYear(ecoData != null ? ecoData.firstYear() : null)
                    .lastYear(ecoData != null ? ecoData.lastYear() : null)
                    .globalRecords(ecoData != null ? ecoData.globalRecords() : null)
                    .iucnCategory(ecoData != null ? ecoData.iucnCategory() : null)
                    .build());
        } catch (Exception e) {
            // Ignore duplicate key if concurrent thread already saved this species
        }
    }

    private void saveToCache(double roundedLat, double roundedLng, double radius,
            List<SpeciesResponse> speciesList) {
        try {
            CachedScan scan = CachedScan.builder()
                    .roundedLat(roundedLat)
                    .roundedLng(roundedLng)
                    .radius(radius)
                    .build();

            List<CachedSpecies> cachedSpeciesList = speciesList.stream()
                    .map(sr -> CachedSpecies.builder()
                            .cachedScan(scan)
                            .commonName(sr.getCommonName())
                            .scientificName(sr.getScientificName())
                            .photoUrl(sr.getPhotoUrl())
                            .recordDate(sr.getRecordDate())
                            .phylum(sr.getPhylum())
                            .latitude(sr.getLatitude())
                            .longitude(sr.getLongitude())
                            .numberOfOccurrences(sr.getNumberOfOccurrences())
                            .depthMin(sr.getDepthMin())
                            .depthMax(sr.getDepthMax())
                            .tempMin(sr.getTempMin())
                            .tempMax(sr.getTempMax())
                            .firstYear(sr.getFirstYear())
                            .lastYear(sr.getLastYear())
                            .globalRecords(sr.getGlobalRecords())
                            .iucnCategory(sr.getIucnCategory())
                            .build())
                    .toList();

            scan.getSpecies().addAll(cachedSpeciesList);
            cachedScanRepository.save(scan);
        } catch (Exception e) {
            // ignore cache save errors
        }
    }

    /**
     * Haversine check: is the point (pLat, pLng) within radiusMeters of (centerLat, centerLng)?
     */
    private static boolean isWithinRadius(double centerLat, double centerLng, double radiusMeters,
                                          Double pLat, Double pLng) {
        if (pLat == null || pLng == null) return true; // keep species with no coords
        double R = 6_371_000; // Earth radius in meters
        double dLat = Math.toRadians(pLat - centerLat);
        double dLng = Math.toRadians(pLng - centerLng);
        double a = Math.sin(dLat / 2) * Math.sin(dLat / 2)
                 + Math.cos(Math.toRadians(centerLat)) * Math.cos(Math.toRadians(pLat))
                 * Math.sin(dLng / 2) * Math.sin(dLng / 2);
        double dist = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return dist <= radiusMeters;
    }
}