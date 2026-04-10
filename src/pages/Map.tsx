import { useRef, useCallback, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { observer } from "mobx-react-lite";
import MapView, { type MapViewRef } from "../components/MapComponents/MapView.tsx";
import SpeciesPanel from "../components/SpeciesPanel";
import WeatherPanel from "../components/WeatherPanel";
import { useSpeciesStore, useMapStore, useWeatherStore } from "../lib/stores/index.tsx";

const RADIUS_OPTIONS = [
  { value: 500, label: "500m" },
  { value: 1000, label: "1 km" },
  { value: 2000, label: "2 km" },
  { value: 5000, label: "5 km" },
  { value: 10000, label: "10 km" },
];

const MapPage = observer(() => {
  const speciesStore = useSpeciesStore();
  const mapStore = useMapStore();
  const weatherStore = useWeatherStore();
  const mapRef = useRef<MapViewRef>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [hasScanned, setHasScanned] = useState(false);

  const handleViewportChange = useCallback((bbox: number[]) => {
    const map = mapRef.current?.getMap();
    if (map) {
      const zoom = map.getZoom();
      const center = map.getCenter();
      mapStore.updateMapState(zoom, { lat: center.lat, lng: center.lng }, bbox);
    }
  }, [mapStore]);

  const isScanning = speciesStore.isScanning;

  // Click on map → place the scan target and fetch weather
  const handleMapClick = useCallback((lngLat: { lng: number; lat: number }) => {
    if (isScanning) return;
    const lat = Number(lngLat.lat.toFixed(6));
    const lng = Number(lngLat.lng.toFixed(6));
    mapStore.setScanCenter({ lat, lng });
    weatherStore.fetchWeather(lat, lng);
  }, [mapStore, weatherStore, isScanning]);

  // Scan button triggers the actual API call
  const handleScan = useCallback(async () => {
    if (!mapStore.scanCenter || isScanning) return;
    const { lat, lng } = mapStore.scanCenter;
    const radius = mapStore.scanRadius;

    // Fetch species and weather in parallel
    await Promise.all([
      speciesStore.fetchSpecies({ lat, lng, radius }),
      weatherStore.fetchWeather(lat, lng),
    ]);

    // Open sidebar on first scan
    if (!hasScanned) {
      setHasScanned(true);
    }
    setSidebarOpen(true);
  }, [mapStore, speciesStore, weatherStore, isScanning, hasScanned]);

  const handleRadiusChange = useCallback((radius: number) => {
    mapStore.setScanRadius(radius);
  }, [mapStore]);

  return (
    <div className="h-screen flex flex-col bg-gray-50 overflow-hidden">
      {/* Header fijo */}
      <header className="bg-gradient-to-r from-blue-600 to-cyan-600 shadow-lg h-16 flex items-center px-6 flex-shrink-0 z-20">
        <Link to="/" className="text-2xl font-bold text-white hover:text-blue-100 transition-colors">
          Scubex
        </Link>
      </header>

      {/* Main content con altura fija */}
      <div className="flex-1 flex min-h-0">
        <div className="relative flex-1">
          <MapView 
            ref={mapRef} 
            isScanning={isScanning}
            onViewportIdle={handleViewportChange}
            onMapClick={handleMapClick}
            scanCenter={mapStore.scanCenter}
            scanRadius={mapStore.scanRadius}
          />

          {/* Controls bar: radius selector + scan button */}
          <motion.div
            className="absolute bottom-5 left-4 bg-white/90 backdrop-blur-md rounded-2xl shadow-lg border border-gray-200/60 px-4 py-3 z-10 flex items-center gap-3"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.3 }}
          >
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Radio</span>
            <div className="flex gap-1">
              {RADIUS_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => handleRadiusChange(opt.value)}
                  disabled={isScanning}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                    mapStore.scanRadius === opt.value
                      ? "bg-cyan-500 text-white shadow-md shadow-cyan-500/30"
                      : "text-gray-600 hover:bg-gray-100"
                  } ${isScanning ? "opacity-50 cursor-not-allowed" : ""}`}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            {/* Divider */}
            <div className="w-px h-8 bg-gray-300" />

            {/* Scan button */}
            <motion.button
              onClick={handleScan}
              disabled={!mapStore.scanCenter || isScanning}
              className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-sm font-semibold transition-all duration-200 ${
                mapStore.scanCenter && !isScanning
                  ? "bg-gradient-to-r from-blue-500 to-cyan-500 text-white shadow-md shadow-cyan-500/30 hover:from-blue-600 hover:to-cyan-600"
                  : "bg-gray-200 text-gray-400 cursor-not-allowed"
              }`}
              whileHover={mapStore.scanCenter && !isScanning ? { scale: 1.03 } : {}}
              whileTap={mapStore.scanCenter && !isScanning ? { scale: 0.97 } : {}}
            >
              {isScanning ? (
                <motion.div
                  className="w-4 h-4"
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                >
                  <div className="w-full h-full border-2 border-white/30 border-t-white rounded-full" />
                </motion.div>
              ) : (
                <svg viewBox="0 0 24 24" fill="none" className="w-4 h-4">
                  <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2" fill="currentColor"/>
                  <circle cx="12" cy="12" r="7" stroke="currentColor" strokeWidth="1.5" fill="none" opacity="0.6"/>
                  <circle cx="12" cy="12" r="11" stroke="currentColor" strokeWidth="1" fill="none" opacity="0.3"/>
                </svg>
              )}
              {isScanning ? "Escaneando..." : "Escanear"}
            </motion.button>
          </motion.div>

          {/* Hint overlay */}
          {!mapStore.scanCenter && !isScanning && !speciesStore.hasSpecies && (
            <motion.div
              className="absolute top-4 left-1/2 -translate-x-1/2 bg-black/60 backdrop-blur-sm text-white text-sm px-4 py-2 rounded-full z-10 pointer-events-none"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1 }}
            >
              Haz click en el mapa para seleccionar una zona
            </motion.div>
          )}

          {/* Weather overlay on map */}
          <WeatherPanel
            data={weatherStore.weatherData}
            loading={weatherStore.isLoading}
            error={weatherStore.error}
          />

          {/* Collapsible sidebar — absolutely positioned to avoid map reflow */}
          {hasScanned && (
            <>
              {/* Toggle tab */}
              <button
                className="absolute top-1/2 -translate-y-1/2 z-30 transition-[right] duration-300 ease-in-out"
                style={{ right: sidebarOpen ? 400 : 0 }}
                onClick={() => setSidebarOpen(!sidebarOpen)}
              >
                <div className="w-6 h-12 bg-white shadow-lg border border-r-0 border-gray-200 rounded-l-full flex items-center justify-center hover:bg-gray-50 transition-colors">
                  <svg
                    width="10"
                    height="14"
                    viewBox="0 0 10 14"
                    fill="none"
                    className={`text-gray-500 transition-transform duration-300 ${sidebarOpen ? 'rotate-180' : 'rotate-0'}`}
                  >
                    <path d="M8 1L2 7L8 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
              </button>

              {/* Sidebar panel — slides via transform, no layout reflow */}
              <div
                className="absolute top-0 right-0 h-full w-[400px] z-20 bg-white shadow-xl border-l border-gray-200 flex flex-col transition-transform duration-300 ease-in-out"
                style={{ transform: sidebarOpen ? 'translateX(0)' : 'translateX(100%)' }}
              >
                <SpeciesPanel 
                  loading={speciesStore.isLoading} 
                  data={speciesStore.speciesData || undefined} 
                  zoom={mapStore.currentZoom} 
                />
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
});

export default MapPage;