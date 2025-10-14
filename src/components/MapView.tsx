import { useEffect, useRef, forwardRef, useImperativeHandle, useState } from "react";
import maplibregl, { Map } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { motion, AnimatePresence } from "framer-motion";

interface OceanDot {
  id: string;
  x: number;
  y: number;
  timestamp: number;
}

type Props = { 
  onViewportIdle?: (bbox: number[]) => void;
  isScanning?: boolean;
};

export type MapViewRef = { getMap: () => Map | null };

export default forwardRef<MapViewRef, Props>(function MapView({ onViewportIdle, isScanning = false }, forwardedRef) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<Map | null>(null);
  const [oceanDots, setOceanDots] = useState<OceanDot[]>([]);
  const beamIntervalRef = useRef<number | null>(null);

  useImperativeHandle(forwardedRef, () => ({
    getMap: () => mapRef.current
  }));
  
  useEffect(() => {
    if (!containerRef.current) return;
    
    // Usar OpenStreetMap si no hay API key de MapTiler
    const style = import.meta.env.VITE_MAPTILER_KEY 
      ? `https://api.maptiler.com/maps/0199e04a-a7b7-7683-bd10-043c4c0dceaf/style.json?key=${import.meta.env.VITE_MAPTILER_KEY}`
      : {
          version: 8 as const,
          sources: {
            osm: {
              type: 'raster' as const,
              tiles: ['https://a.tile.openstreetmap.org/{z}/{x}/{y}.png'],
              tileSize: 256,
              attribution: '© OpenStreetMap contributors'
            }
          },
          layers: [
            {
              id: 'osm',
              type: 'raster' as const,
              source: 'osm'
            }
          ]
        };

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: style,
      center: [-5.98, 36.52], // Cádiz
      zoom: 8,
      maxZoom: 18,
      minZoom: 3
    });

    // Agregar controles de navegación
    map.addControl(new maplibregl.NavigationControl(), 'top-right');
    map.addControl(new maplibregl.FullscreenControl(), 'top-right');
    
    mapRef.current = map;

    let timer: number | null = null;
    const emitBbox = () => {
      if (onViewportIdle) {
        const b = map.getBounds(); // w,s,e,n
        onViewportIdle([b.getWest(), b.getSouth(), b.getEast(), b.getNorth()]);
      }
    };

    const onMoveEnd = () => {
      if (timer) window.clearTimeout(timer);
      timer = window.setTimeout(emitBbox, 500); // debounce 500ms
    };

    map.on("load", emitBbox);
    map.on("moveend", onMoveEnd);
    
    // Ocean dot creation logic
    const isPointOnOcean = (x: number, y: number): boolean => {
      if (!mapRef.current) return false;
      
      // Convert screen coordinates to map coordinates
      const lngLat = mapRef.current.unproject([x, y]);
      
      // Query rendered features at this point
      const features = mapRef.current.queryRenderedFeatures([x, y]);
      
      // Check if any feature belongs to ocean/water layers
      return features.some(feature => 
        feature.layer?.id?.toLowerCase().includes('ocean') ||
        feature.layer?.id?.toLowerCase().includes('water') ||
        feature.layer?.id?.toLowerCase().includes('sea') ||
        feature.source === 'ocean' // Your bathymetry source
      );
    };
    
    const createOceanDot = (beamX: number) => {
      if (!containerRef.current) return;
      
      const containerRect = containerRef.current.getBoundingClientRect();
      const containerHeight = containerRect.height;
      
      // Generate random Y positions along the beam
      for (let i = 0; i < 3; i++) { // Create up to 3 dots per beam position
        const randomY = Math.random() * containerHeight;
        
        if (isPointOnOcean(beamX, randomY)) {
          const newDot: OceanDot = {
            id: `dot-${Date.now()}-${i}`,
            x: beamX,
            y: randomY,
            timestamp: Date.now()
          };
          
          setOceanDots(prev => [...prev, newDot]);
          
          // Remove dot after animation completes
          setTimeout(() => {
            setOceanDots(prev => prev.filter(dot => dot.id !== newDot.id));
          }, 2000);
        }
      }
    };
    // Add bathymetry layer when style loads
    map.on("style.load", () => {
      map.addLayer({
        id: "bathymetry",
        type: "fill",
        source: "ocean",
        "source-layer": "contour",
        paint: {
          "fill-color":
          [
              "step",
              ["get", "depth"],
              "#000",
              -6500, "#000000",
              -6000, "#000010",
              -5500, "#000015",
              -5000, "#000020",
              -4500, "#000030",
              -4000, "#000040",
              -3500, "#000050",
              -3000, "#000060",
              -2500, "#000070",
              -2000, "rgb(7, 15, 123)",
              -1750, "rgb(14, 28, 135)",
              -1500, "rgb(18, 40, 147)",
              -1250, "rgb(22, 52, 158)",
              -1000, "rgb(24, 64, 170)",
              -750,  "rgb(25, 76, 183)",
              -500,  "rgb(25, 89, 195)",
              -250,  "rgb(23, 101, 207)",
              -200,  "rgb(20, 114, 220)",
              -100,  "rgb(13, 126, 232)",
              -50,   "#008bf5"
          ],
        },
      }, "Sea labels");
      map.setPaintProperty("Water", "fill-color", "#008ff5ff");

    });
    return () => { 
      map.remove(); 
    };
  }, [onViewportIdle]);

  // Separate effect for beam tracking (doesn't recreate map)
  useEffect(() => {
    const createOceanDot = (beamX: number) => {
      if (!containerRef.current) return;
      
      const containerRect = containerRef.current.getBoundingClientRect();
      const containerHeight = containerRect.height;
      
      // Generate random Y positions along the beam
      for (let i = 0; i < 3; i++) { // Create up to 3 dots per beam position
        const randomY = Math.random() * containerHeight;
        
        if (isPointOnOcean(beamX, randomY)) {
          const newDot: OceanDot = {
            id: `dot-${Date.now()}-${i}`,
            x: beamX,
            y: randomY,
            timestamp: Date.now()
          };
          
          setOceanDots(prev => [...prev, newDot]);
          
          // Remove dot after animation completes
          setTimeout(() => {
            setOceanDots(prev => prev.filter(dot => dot.id !== newDot.id));
          }, 2000);
        }
      }
    };

    const isPointOnOcean = (x: number, y: number): boolean => {
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
    };

    // Beam tracking for ocean dots (only when scanning)
    if (isScanning) {
      beamIntervalRef.current = window.setInterval(() => {
        if (!containerRef.current) return;
        
        const containerWidth = containerRef.current.clientWidth;
        const beamDuration = 4000; // 4 seconds as defined in animation
        const currentTime = Date.now();
        const cycleTime = currentTime % beamDuration;
        const beamProgress = cycleTime / beamDuration;
        
        // Calculate current beam X position
        const beamX = beamProgress * containerWidth;
        
        // Create dots at beam position if it's on ocean
        createOceanDot(beamX);
        
      }, 200); // Check every 200ms
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
  }, [isScanning]);

  return (
    <div className="w-full h-full relative">
      <div className="w-full h-full" ref={containerRef} />
      
      {/* Scanning Animation Overlay */}
      <AnimatePresence>
        {isScanning && (
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
        )}
      </AnimatePresence>
    </div>
  );
});