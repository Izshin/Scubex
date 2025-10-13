import { useEffect, useRef, forwardRef, useImperativeHandle } from "react";
import maplibregl, { Map } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { motion, AnimatePresence } from "framer-motion";

type Props = { 
  onViewportIdle?: (bbox: number[]) => void;
  isScanning?: boolean;
};

export type MapViewRef = { getMap: () => Map | null };

export default forwardRef<MapViewRef, Props>(function MapView({ onViewportIdle, isScanning = false }, forwardedRef) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<Map | null>(null);

  useImperativeHandle(forwardedRef, () => ({
    getMap: () => mapRef.current
  }));
  
  useEffect(() => {
    if (!containerRef.current) return;
    
    // Usar OpenStreetMap si no hay API key de MapTiler
    const style = import.meta.env.VITE_MAPTILER_KEY 
      ? `https://api.maptiler.com/maps/streets/style.json?key=${import.meta.env.VITE_MAPTILER_KEY}`
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
    
    return () => { 
      map.remove(); 
    };
  }, [onViewportIdle]);

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
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
});