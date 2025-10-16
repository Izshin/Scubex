import { useRef, useCallback } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { observer } from "mobx-react-lite";
import MapView, { type MapViewRef } from "../components/MapComponents/MapView.tsx";
import SpeciesPanel from "../components/SpeciesPanel";
import { useSpeciesStore, useMapStore } from "../lib/stores/index.tsx";

const MapPage = observer(() => {
  const speciesStore = useSpeciesStore();
  const mapStore = useMapStore();
  const mapRef = useRef<MapViewRef>(null);

  // Update zoom when map viewport changes - useCallback to prevent map re-initialization
  const handleViewportChange = useCallback((bbox: number[]) => {
    const map = mapRef.current?.getMap();
    if (map) {
      const zoom = map.getZoom();
      const center = map.getCenter();
      mapStore.updateMapState(zoom, { lat: center.lat, lng: center.lng }, bbox);
    }
  }, [mapStore]);

  // 🎯 MUCH SIMPLER: Radar animation syncs directly with actual loading state!
  const isScanning = speciesStore.isScanning;

  const handleScan = useCallback(async () => {
    const map = mapRef.current?.getMap();
    if (!map) return;

    // Get current map data
    const zoom = map.getZoom();
    const center = map.getCenter();
    const radius = mapStore.zoomRadius;
    
    // Log the scan parameters
    console.log('🗺️ MobX Map Scan initiated:');
    console.log('📍 Center:', { lat: center.lat.toFixed(6), lng: center.lng.toFixed(6) });
    console.log('🔍 Zoom Level:', zoom.toFixed(1));
    console.log('📏 Search Radius:', `${radius}m`);
    console.log('🌊 Backend API Call will be:', `http://localhost:8080/api/species?lat=${center.lat}&lng=${center.lng}&radius=${radius}`);
    
    // Update map state and fetch species data using MobX store
    mapStore.updateMapState(zoom, { lat: center.lat, lng: center.lng });
    await speciesStore.fetchSpecies({
      lat: Number(center.lat.toFixed(6)), // Round to 6 decimal places for precision
      lng: Number(center.lng.toFixed(6)), 
      radius: radius
    });
  }, [mapStore, speciesStore]);

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
            onViewportIdle={handleViewportChange}
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
          <SpeciesPanel 
            loading={speciesStore.isLoading} 
            data={speciesStore.speciesData || undefined} 
            zoom={mapStore.currentZoom} 
          />
        </div>
      </div>
    </div>
  );
});

export default MapPage;