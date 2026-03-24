import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Map } from "maplibre-gl";

interface OceanDot {
  id: string;
  x: number;
  y: number;
  timestamp: number;
}

interface ScanningAnimationProps {
  isScanning: boolean;
  containerRef: { current: HTMLDivElement | null };
  mapRef: { current: Map | null };
  scanCenter?: { lat: number; lng: number } | null;
  scanRadius?: number;
}

// Sweep duration must match the framer-motion rotate animation
const SWEEP_DURATION_MS = 3000;

export default function ScanningAnimation({ isScanning, mapRef, scanCenter, scanRadius = 2000 }: ScanningAnimationProps) {
  const [oceanDots, setOceanDots] = useState<OceanDot[]>([]);
  const beamIntervalRef = useRef<number | null>(null);
  const scanStartTime = useRef<number>(Date.now());

  // Convert scan center + radius to screen-space bounding box
  const getScanScreenBounds = useCallback(() => {
    const map = mapRef.current;
    if (!map || !scanCenter) return null;

    const centerPx = map.project([scanCenter.lng, scanCenter.lat]);

    const earthRadius = 6371000;
    const dLat = (scanRadius / earthRadius) * (180 / Math.PI);
    const edgePx = map.project([scanCenter.lng, scanCenter.lat + dLat]);
    const radiusPx = Math.abs(centerPx.y - edgePx.y);

    return { cx: centerPx.x, cy: centerPx.y, r: radiusPx };
  }, [mapRef, scanCenter, scanRadius]);

  const isPointOnOcean = useCallback((x: number, y: number): boolean => {
    if (!mapRef.current) return false;
    const features = mapRef.current.queryRenderedFeatures([x, y]);
    return features.some(feature => 
      feature.layer?.id?.toLowerCase().includes('ocean') ||
      feature.layer?.id?.toLowerCase().includes('water') ||
      feature.layer?.id?.toLowerCase().includes('sea') ||
      feature.source === 'ocean'
    );
  }, [mapRef]);

  // Current sweep angle in radians (0 = right / 3 o'clock, clockwise)
  const getSweepAngle = useCallback(() => {
    const elapsed = Date.now() - scanStartTime.current;
    return ((elapsed % SWEEP_DURATION_MS) / SWEEP_DURATION_MS) * 2 * Math.PI;
  }, []);

  const createOceanDots = useCallback((scanElapsedTime: number) => {
    const bounds = getScanScreenBounds();
    if (!bounds || bounds.r < 5) return;

    const { cx, cy, r } = bounds;
    const sweepAngle = getSweepAngle();

    // Dots spawn in a narrow sector just behind the sweep line
    const sectorWidth = Math.PI / 4; // 45° band behind sweep

    // Progressive dot density
    const rampUpTime = 30000;
    const progress = Math.min(scanElapsedTime / rampUpTime, 1);
    const maxDots = Math.floor(1 + progress * 6);
    const dotsToCreate = Math.floor(Math.random() * (maxDots + 1));

    for (let i = 0; i < dotsToCreate; i++) {
      // Angle within the sector just behind the sweep line
      const offsetAngle = Math.random() * sectorWidth;
      const dotAngle = sweepAngle - offsetAngle;
      // Random distance from centre (uniform distribution inside circle)
      const dist = Math.sqrt(Math.random()) * r;
      const x = cx + dist * Math.cos(dotAngle);
      const y = cy + dist * Math.sin(dotAngle);

      if (isPointOnOcean(x, y)) {
        const newDot: OceanDot = {
          id: `dot-${Date.now()}-${i}`,
          x,
          y,
          timestamp: Date.now()
        };

        setOceanDots(prev => [...prev, newDot]);

        // Dots fade after roughly one full sweep so they don't clutter
        const dotLifetime = SWEEP_DURATION_MS * (0.8 + Math.random() * 0.4);

        setTimeout(() => {
          setOceanDots(prev => prev.filter(dot => dot.id !== newDot.id));
        }, dotLifetime);
      }
    }
  }, [getScanScreenBounds, getSweepAngle, isPointOnOcean]);

  useEffect(() => {
    if (isScanning && scanCenter) {
      scanStartTime.current = Date.now();

      beamIntervalRef.current = window.setInterval(() => {
        const scanElapsedTime = Date.now() - scanStartTime.current;
        createOceanDots(scanElapsedTime);
      }, 80);
    } else {
      if (beamIntervalRef.current) {
        clearInterval(beamIntervalRef.current);
        beamIntervalRef.current = null;
      }
      setOceanDots([]);
    }

    return () => {
      if (beamIntervalRef.current) {
        clearInterval(beamIntervalRef.current);
        beamIntervalRef.current = null;
      }
    };
  }, [isScanning, scanCenter, createOceanDots]);

  if (!isScanning || !scanCenter) return null;

  const bounds = getScanScreenBounds();

  return (
    <AnimatePresence>
      <motion.div 
        className="absolute inset-0 pointer-events-none overflow-hidden"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        {/* Pulsing circle overlay on the scan area */}
        {bounds && (
          <motion.div
            className="absolute rounded-full pointer-events-none"
            style={{
              left: bounds.cx - bounds.r,
              top: bounds.cy - bounds.r,
              width: bounds.r * 2,
              height: bounds.r * 2,
              border: '2px solid rgba(6, 182, 212, 0.6)',
              background: 'radial-gradient(circle, rgba(6, 182, 212, 0.08) 0%, rgba(6, 182, 212, 0.02) 70%, transparent 100%)',
            }}
            animate={{
              boxShadow: [
                '0 0 10px rgba(6, 182, 212, 0.3), inset 0 0 20px rgba(6, 182, 212, 0.05)',
                '0 0 25px rgba(6, 182, 212, 0.6), inset 0 0 40px rgba(6, 182, 212, 0.1)',
                '0 0 10px rgba(6, 182, 212, 0.3), inset 0 0 20px rgba(6, 182, 212, 0.05)',
              ],
            }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          />
        )}

        {/* Rotating sweep line inside circle */}
        {bounds && (
          <motion.div
            className="absolute pointer-events-none"
            style={{
              left: bounds.cx,
              top: bounds.cy,
              width: bounds.r,
              height: 2,
              transformOrigin: '0% 50%',
              background: 'linear-gradient(to right, rgba(6, 182, 212, 0.8), transparent)',
            }}
            animate={{ rotate: [0, 360] }}
            transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
          />
        )}

        {/* Ocean Detection Dots */}
        <AnimatePresence>
          {oceanDots.map(dot => (
            <motion.div
              key={dot.id}
              className="absolute w-1.5 h-1.5 pointer-events-none"
              style={{
                left: dot.x - 3,
                top: dot.y - 3,
                backgroundColor: '#87ceeb',
                borderRadius: '50%',
                boxShadow: '0 0 6px #87ceeb, 0 0 12px #87ceeb',
              }}
              initial={{ scale: 0, opacity: 0.8 }}
              animate={{ scale: [1, 1.5, 0.8], opacity: [0.8, 1, 0.3] }}
              exit={{ scale: 0, opacity: 0 }}
              transition={{ duration: 2, ease: "easeOut" }}
            />
          ))}
        </AnimatePresence>
      </motion.div>
    </AnimatePresence>
  );
}