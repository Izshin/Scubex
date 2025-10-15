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
  containerRef: React.RefObject<HTMLDivElement | null>;
  mapRef: React.RefObject<Map | null>;
}

export default function ScanningAnimation({ isScanning, containerRef, mapRef }: ScanningAnimationProps) {
  const [oceanDots, setOceanDots] = useState<OceanDot[]>([]);
  const beamIntervalRef = useRef<number | null>(null);
  const scanStartTime = useRef<number>(Date.now());

  const isPointOnOcean = useCallback((x: number, y: number): boolean => {
    if (!mapRef.current) return false;
    
    // Query rendered features at this point
    const features = mapRef.current.queryRenderedFeatures([x, y]);
    
    // Check if any feature belongs to ocean/water layers
    return features.some(feature => 
      feature.layer?.id?.toLowerCase().includes('ocean') ||
      feature.layer?.id?.toLowerCase().includes('water') ||
      feature.layer?.id?.toLowerCase().includes('sea') ||
      feature.source === 'ocean' // Your bathymetry source
    );
  }, [mapRef]);

  const createOceanDot = useCallback((beamX: number, scanElapsedTime: number) => {
    if (!containerRef.current) return;
    
    const containerRect = containerRef.current.getBoundingClientRect();
    const containerHeight = containerRect.height;
    
    // Progressive dot density based on scan time
    const baseDotsPerSweep = 1;
    const maxDotsPerSweep = 15;
    const rampUpTime = 15000; // 15 seconds to reach max density

    // Calculate current dot density (1 to 15 dots)
    const progress = Math.min(scanElapsedTime / rampUpTime, 1);
    const currentMaxDots = Math.floor(baseDotsPerSweep + (progress * (maxDotsPerSweep - baseDotsPerSweep)));
    
    // Randomly decide how many dots to create (0 to currentMaxDots)
    const dotsToCreate = Math.floor(Math.random() * (currentMaxDots + 1));
    
    // Generate random Y positions along the beam
    for (let i = 0; i < dotsToCreate; i++) {
      const randomY = Math.random() * containerHeight;
      
      if (isPointOnOcean(beamX, randomY)) {
        const newDot: OceanDot = {
          id: `dot-${Date.now()}-${i}`,
          x: beamX,
          y: randomY,
          timestamp: Date.now()
        };
        
        setOceanDots(prev => [...prev, newDot]);
        
        // Progressive dot lifetime (longer scan = longer living dots)
        const baseDotLifetime = 2000; // 2 seconds
        const maxDotLifetime = 4000; // 4 seconds
        const dotLifetime = baseDotLifetime + (progress * (maxDotLifetime - baseDotLifetime));
        
        setTimeout(() => {
          setOceanDots(prev => prev.filter(dot => dot.id !== newDot.id));
        }, dotLifetime);
      }
    }
  }, [containerRef, isPointOnOcean]);

  // Beam tracking for ocean dots (only when scanning)
  useEffect(() => {
    if (isScanning) {
      // Reset scan start time when scanning begins
      scanStartTime.current = Date.now();
      
      beamIntervalRef.current = window.setInterval(() => {
        if (!containerRef.current) return;
        
        const containerWidth = containerRef.current.clientWidth;
        const beamDuration = 4000; // 4 seconds as defined in animation
        const currentTime = Date.now();
        
        // Synchronize with animation start time (not modulo)
        const animationElapsed = currentTime - scanStartTime.current;
        const cycleTime = animationElapsed % beamDuration;
        const beamProgress = cycleTime / beamDuration;
        
        // Match visual beam position: from -50px to containerWidth + 50px
        const beamStartX = -50;
        const beamEndX = containerWidth + 50;
        const beamX = beamStartX + (beamProgress * (beamEndX - beamStartX));
        
        // Only create dots when beam is within visible area
        if (beamX >= 0 && beamX <= containerWidth) {
          // Calculate elapsed time since scan started
          const scanElapsedTime = currentTime - scanStartTime.current;
          
          // Create dots at beam position if it's on ocean (progressive density)
          createOceanDot(beamX, scanElapsedTime);
        }
        
      }, 100); // Check every 100ms for better precision
    } else {
      // Clear interval and dots when not scanning
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
  }, [isScanning, containerRef, mapRef, createOceanDot]);

  if (!isScanning) return null;

  return (
    <AnimatePresence>
      <motion.div 
        className="absolute inset-0 pointer-events-none overflow-hidden"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        {/* Scanning background overlay */}
        <motion.div
          className="absolute inset-0"
          style={{
            background: 'radial-gradient(ellipse at center, rgba(59, 130, 246, 0.05) 0%, transparent 70%)',
          }}
          animate={{
            opacity: [0.3, 0.7, 0.3],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
        
        {/* Main scanning beam */}
        <motion.div
          className="absolute top-0 h-full pointer-events-none"
          style={{
            width: '3px',
            background: 'linear-gradient(to bottom, transparent 0%, rgba(59, 130, 246, 0.4) 10%, rgba(59, 130, 246, 0.9) 30%, rgba(59, 130, 246, 1) 50%, rgba(59, 130, 246, 0.9) 70%, rgba(59, 130, 246, 0.4) 90%, transparent 100%)',
            boxShadow: '0 0 25px rgba(59, 130, 246, 0.8), 0 0 50px rgba(59, 130, 246, 0.4)',
          }}
          initial={{ x: '-50px' }}
          animate={{ x: 'calc(100vw + 50px)' }}
          transition={{
            duration: 4,
            ease: "easeInOut",
            repeat: Infinity,
          }}
        />
        
        {/* Wide glow effect */}
        <motion.div
          className="absolute top-0 h-full pointer-events-none"
          style={{
            width: '60px',
            background: 'linear-gradient(to right, transparent 0%, rgba(59, 130, 246, 0.1) 20%, rgba(59, 130, 246, 0.3) 50%, rgba(59, 130, 246, 0.1) 80%, transparent 100%)',
            filter: 'blur(8px)',
          }}
          initial={{ x: '-80px' }}
          animate={{ x: 'calc(100vw + 80px)' }}
          transition={{
            duration: 4,
            ease: "easeInOut",
            repeat: Infinity,
            delay: 0.1
          }}
        />
        
        {/* Subtle secondary beam */}
        <motion.div
          className="absolute top-0 h-full pointer-events-none"
          style={{
            width: '1px',
            background: 'rgba(255, 255, 255, 0.8)',
            boxShadow: '0 0 10px rgba(255, 255, 255, 0.6)',
          }}
          initial={{ x: '-30px' }}
          animate={{ x: 'calc(100vw + 30px)' }}
          transition={{
            duration: 4,
            ease: "easeInOut",
            repeat: Infinity,
            delay: 0.05
          }}
        />
        
        {/* Ocean Detection Dots */}
        <AnimatePresence>
          {oceanDots.map(dot => (
            <motion.div
              key={dot.id}
              className="absolute w-1.5 h-1.5 pointer-events-none"
              style={{
                left: dot.x - 3, // Center the smaller dot
                top: dot.y - 3,
                backgroundColor: '#87ceeb',
                borderRadius: '50%',
                boxShadow: '0 0 6px #87ceeb, 0 0 12px #87ceeb',
              }}
              initial={{ 
                scale: 0, 
                opacity: 0.8,
              }}
              animate={{ 
                scale: [1, 1.5, 0.8],
                opacity: [0.8, 1, 0.3],
              }}
              exit={{ 
                scale: 0, 
                opacity: 0 
              }}
              transition={{
                duration: 2,
                ease: "easeOut"
              }}
            />
          ))}
        </AnimatePresence>
      </motion.div>
    </AnimatePresence>
  );
}