import { useQuery } from "@tanstack/react-query";
import { useState, useRef } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import MapView, { type MapViewRef } from "../components/MapView";
import { getZoneSpecies } from "../lib/api";
import SpeciesPanel from "../components/SpeciesPanel";

// Zoom to radius conversion (in meters)
const zoomToRadius: Record<number, number> = {
  8: 10000,   // 10km - country/region level
  9: 7000,    // 7km
  10: 5000,   // 5km - city level  
  11: 3000,   // 3km
  12: 2000,   // 2km - district level
  13: 1500,   // 1.5km
  14: 1000,   // 1km - neighborhood
  15: 700,    // 700m
  16: 500,    // 500m - local area
  17: 300,    // 300m
  18: 100     // 100m - precise location
};

function getRadiusFromZoom(zoom: number): number {
  const roundedZoom = Math.round(zoom);
  return zoomToRadius[roundedZoom] || 1000; // Default to 1km
}

export default function MapPage() {
  const [scanData, setScanData] = useState<{ lat: number; lng: number; radius: number } | null>(null);
  const mapRef = useRef<MapViewRef>(null);
  
  const q = useQuery({
    queryKey: ["zone-species", scanData],
    queryFn: () => getZoneSpecies(scanData!), // Pass the scan data directly to the backend API
    enabled: !!scanData
  });

  // 🎯 MUCH SIMPLER: Radar animation syncs directly with actual loading state!
  const isScanning = q.isLoading;

  const handleScan = () => {
    const map = mapRef.current?.getMap();
    if (!map) return;

    // Get current map data
    const zoom = map.getZoom();
    const center = map.getCenter();
    const radius = getRadiusFromZoom(zoom);
    
    // Log the scan parameters
    console.log('🗺️ Map Scan initiated:');
    console.log('📍 Center:', { lat: center.lat.toFixed(6), lng: center.lng.toFixed(6) });
    console.log('🔍 Zoom Level:', zoom.toFixed(1));
    console.log('📏 Search Radius:', `${radius}m`);
    console.log('🌊 Backend API Call will be:', `http://localhost:8080/api/species?lat=${center.lat}&lng=${center.lng}&radius=${radius}`);
    
    // Set scan data to trigger the backend API call (this will automatically start isScanning via q.isLoading)
    setScanData({
      lat: Number(center.lat.toFixed(6)), // Round to 6 decimal places for precision
      lng: Number(center.lng.toFixed(6)), 
      radius: radius
    });
  };

  return (
    <div className="h-screen flex flex-col bg-gray-50 overflow-hidden">
      {/* Header fijo */}
      <header className="bg-gradient-to-r from-blue-600 to-cyan-600 shadow-lg h-16 flex items-center px-6 flex-shrink-0 z-20">
        <Link to="/" className="text-2xl font-bold text-white hover:text-blue-100 transition-colors">
          Scubex
        </Link>
      </header>

      {/* Main content con altura fija */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-[1fr_400px] gap-0 min-h-0">
        <div className="relative">
          <MapView 
            ref={mapRef} 
            isScanning={isScanning}
          />
          

          {/* Scan Button */}
          <motion.button
            onClick={handleScan}
            className={`group absolute bottom-5 left-4 bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white rounded-full p-4 shadow-lg border-2 border-white/20 backdrop-blur-sm transition-all duration-300 z-10 ${
              isScanning ? 'scale-110' : 'hover:scale-105'
            }`}
            disabled={isScanning}
            initial={{ opacity: 0, scale: 0.8, x: 20 }}
            animate={{ opacity: 1, scale: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.5 }}
            whileHover={{ y: -2, boxShadow: "0 10px 25px rgba(0,0,0,0.2)" }}
            whileTap={{ scale: 0.95 }}
          >
            <div className="relative">
              {isScanning ? (
                <motion.div 
                  className="w-6 h-6 relative"
                  animate={{ rotate: [0, 360] }}
                  transition={{ 
                    duration: 1, 
                    repeat: Infinity, 
                    ease: "linear",
                    repeatType: "loop"
                  }}
                  key="loading-spinner" // Force remount to ensure clean animation
                >
                  <div className="absolute inset-0 border-2 border-white/30 rounded-full"></div>
                  <div className="absolute inset-0 border-2 border-transparent border-t-white rounded-full"></div>
                </motion.div>
              ) : (
                <motion.div 
                  className="w-6 h-6 relative"
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ rotate: 360 }}
                  transition={{ type: "spring", stiffness: 300, damping: 20 }}
                >
                  {/* Radar/Sonar icon */}
                  <svg viewBox="0 0 24 24" fill="none" className="w-full h-full overflow-visible">
                    <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2" fill="currentColor"/>
                    <circle cx="12" cy="12" r="7" stroke="currentColor" strokeWidth="1.5" fill="none" opacity="0.6"/>
                    <circle cx="12" cy="12" r="11" stroke="currentColor" strokeWidth="1" fill="none" opacity="0.3"/>
                    {/* Pulsating dot instead of spinning line */}
                    <motion.circle 
                      cx="12" 
                      cy="2" 
                      r="2"
                      fill="currentColor"
                      initial={{ scale: 0, opacity: 0 }}
                      animate={{ 
                        scale: [0, 1.5, 0],
                        opacity: [0, 1, 0]
                      }}
                      transition={{ 
                        duration: 2, 
                        repeat: Infinity, 
                        ease: "easeInOut",
                        repeatType: "loop"
                      }}
                    />
                  </svg>
                </motion.div>
              )}
              
              {/* Single continuous radar pulse */}
              {isScanning && (
                <motion.div 
                  className="absolute inset-0 bg-white/25 rounded-full"
                  animate={{ 
                    scale: [0, 3], 
                    opacity: [0, 0.7, 0] 
                  }}
                  transition={{ 
                    duration: 1.8, 
                    repeat: Infinity,
                    ease: "easeInOut",
                    repeatType: "loop"
                  }}
                  key="radar-pulse"
                />
              )}
            </div>
            
           
          </motion.button>
        </div>
        
        <div className="bg-white shadow-xl border-l border-gray-200 flex flex-col min-h-0">
          <SpeciesPanel loading={q.isLoading} data={q.data} />
        </div>
      </div>
    </div>
  );
}