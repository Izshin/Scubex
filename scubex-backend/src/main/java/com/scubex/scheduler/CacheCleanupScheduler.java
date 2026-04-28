package com.scubex.scheduler;

import java.time.Instant;
import java.time.temporal.ChronoUnit;

import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import com.scubex.repository.CachedScanRepository;
import com.scubex.repository.CachedWeatherRepository;
import com.scubex.repository.SpeciesEnrichmentCacheRepository;

@Component
public class CacheCleanupScheduler {

    private final CachedScanRepository cachedScanRepository;
    private final CachedWeatherRepository cachedWeatherRepository;
    private final SpeciesEnrichmentCacheRepository speciesEnrichmentCacheRepository;

    public CacheCleanupScheduler(CachedScanRepository cachedScanRepository,
            CachedWeatherRepository cachedWeatherRepository,
            SpeciesEnrichmentCacheRepository speciesEnrichmentCacheRepository) {
        this.cachedScanRepository = cachedScanRepository;
        this.cachedWeatherRepository = cachedWeatherRepository;
        this.speciesEnrichmentCacheRepository = speciesEnrichmentCacheRepository;
    }

    @Scheduled(fixedRate = 21600000) // Every 6 hours
    @Transactional
    public void cleanupExpiredCache() {
        Instant scanCutoff = Instant.now().minus(48, ChronoUnit.HOURS);
        Instant weatherCutoff = Instant.now().minus(30, ChronoUnit.MINUTES);
        Instant enrichmentCutoff = Instant.now().minus(30, ChronoUnit.DAYS);

        cachedScanRepository.deleteByCreatedAtBefore(scanCutoff);
        cachedWeatherRepository.deleteByCreatedAtBefore(weatherCutoff);
        speciesEnrichmentCacheRepository.deleteByScientificNameNotNullAndCachedAtBefore(enrichmentCutoff);
    }
}
