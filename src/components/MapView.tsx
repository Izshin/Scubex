import { useEffect, useRef, forwardRef, useImperativeHandle } from "react";
import maplibregl, { Map } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { motion, AnimatePresence } from "framer-motion";

type SpeciesData = {
  taxon_id: string;
  common_name?: string;
  scientific_name: string;
  records: number;
  last_record: string;
  photoUrl?: string;
};

type Props = { 
  onViewportIdle?: (bbox: number[]) => void;
  isScanning?: boolean;
  speciesData?: SpeciesData[];
};

export type MapViewRef = { getMap: () => Map | null };

export default forwardRef<MapViewRef, Props>(function MapView({ onViewportIdle, isScanning = false, speciesData = [] }, forwardedRef) {
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
            
            {/* Species dots that appear as the beam passes over them */}
            {speciesData.map((species, index) => {
              // Generate realistic positions within the current map view
              // We'll distribute them randomly but realistically across the viewport
              const x = 15 + (index * 23) % 70; // Distribute across screen width
              const y = 20 + ((index * 31) % 60); // Distribute across screen height
              
              // Add some variation to make it look more natural
              const offsetX = (Math.sin(index * 1.3) * 10);
              const offsetY = (Math.cos(index * 1.7) * 10);
              
              const finalX = Math.max(5, Math.min(95, x + offsetX));
              const finalY = Math.max(5, Math.min(95, y + offsetY));
              
              return (
                <motion.div
                  key={species.taxon_id}
                  className="absolute group cursor-pointer"
                  style={{
                    left: `${finalX}%`,
                    top: `${finalY}%`,
                  }}
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ 
                    scale: [0, 1.3, 1], 
                    opacity: [0, 1, 0.9],
                  }}
                  transition={{
                    duration: 0.8,
                    delay: (index * 0.2) + 1, // Delay after beam starts
                    ease: "easeOut"
                  }}
                  whileHover={{ scale: 1.4, zIndex: 50 }}
                >
                  {/* Main species dot */}
                  <div 
                    className="w-5 h-5 rounded-full border-2 border-white shadow-lg relative"
                    style={{
                      backgroundColor: `hsl(${120 + (index * 40) % 180}, 70%, 50%)`, // Varied colors
                      boxShadow: '0 0 15px rgba(34, 197, 94, 0.8)',
                    }}
                  >
                    {/* Pulsing ring effect */}
                    <motion.div
                      className="absolute inset-0 rounded-full border-2 border-current"
                      animate={{ 
                        scale: [1, 2.5, 1],
                        opacity: [0.8, 0, 0.8]
                      }}
                      transition={{
                        duration: 2.5,
                        repeat: Infinity,
                        ease: "easeInOut",
                        delay: index * 0.5
                      }}
                    />
                  </div>
                  
                  {/* Tooltip on hover */}
                  <motion.div
                    className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 bg-black/80 text-white text-xs rounded px-2 py-1 whitespace-nowrap pointer-events-none"
                    initial={{ opacity: 0, scale: 0.8, y: 5 }}
                    whileHover={{ opacity: 1, scale: 1, y: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <div className="font-semibold">{species.common_name || species.scientific_name}</div>
                    <div className="text-gray-300">{species.records} registros</div>
                    {/* Little arrow pointing down */}
                    <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-2 border-r-2 border-t-4 border-transparent border-t-black/80"></div>
                  </motion.div>
                </motion.div>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
});