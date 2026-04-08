package com.scubex.scheduler;

import java.time.Instant;
import java.time.temporal.ChronoUnit;

import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import com.scubex.repository.CachedScanRepository;
import com.scubex.repository.CachedWeatherRepository;

@Component
public class CacheCleanupScheduler {

    private final CachedScanRepository cachedScanRepository;
    private final CachedWeatherRepository cachedWeatherRepository;

    public CacheCleanupScheduler(CachedScanRepository cachedScanRepository,
            CachedWeatherRepository cachedWeatherRepository) {
        this.cachedScanRepository = cachedScanRepository;
        this.cachedWeatherRepository = cachedWeatherRepository;
    }

    @Scheduled(fixedRate = 21600000) // Every 6 hours
    @Transactional
    public void cleanupExpiredCache() {
        Instant scanCutoff = Instant.now().minus(48, ChronoUnit.HOURS);
        Instant weatherCutoff = Instant.now().minus(30, ChronoUnit.MINUTES);

        cachedScanRepository.deleteByCreatedAtBefore(scanCutoff);
        cachedWeatherRepository.deleteByCreatedAtBefore(weatherCutoff);

        System.out.println("🧹 Cache cleanup completed - scans before " + scanCutoff + ", weather before " + weatherCutoff);
    }
}
