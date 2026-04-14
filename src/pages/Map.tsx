import { useRef, useCallback, useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { observer } from "mobx-react-lite";
import { useLocation } from "react-router-dom";
import MapView, { type MapViewRef } from "../components/MapComponents/MapView.tsx";
import SpeciesPanel from "../components/SpeciesPanel";
import WeatherPanel from "../components/WeatherPanel";
import PublicationPopup from "../components/PublicationPopup";
import PublicationDetail from "../components/PublicationDetail";
import { useSpeciesStore, useMapStore, useWeatherStore, usePublicationStore, useUserStore } from "../lib/stores/index.tsx";
import { useWaveTransition } from "../lib/transition";
import type { PublicationData } from "../lib/api";

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
  const publicationStore = usePublicationStore();
  const userStore = useUserStore();
  const { startWaveTransition } = useWaveTransition();
  const location = useLocation();
  const mapRef = useRef<MapViewRef>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [hasScanned, setHasScanned] = useState(false);
  const [mode, setMode] = useState<'scan' | 'publish'>('scan');
  const [publishCoords, setPublishCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [selectedPublication, setSelectedPublication] = useState<PublicationData | null>(null);
  // Tracks the focusPublication id that has already been processed so re-renders
  // triggered by publicationStore.publications changing (e.g. after creating a new
  // publication) don't fly back to the originally focused publication.
  const focusedPubIdRef = useRef<number | null>(null);

  // Load publications on mount
  useEffect(() => {
    publicationStore.fetchPublications();
  }, [publicationStore]);

  // Focus on a publication when navigated from profile
  useEffect(() => {
    const state = location.state as { focusPublication?: number } | null;
    if (!state?.focusPublication) return;
    const pubId = state.focusPublication;
    // Already handled this id — don't fly again
    if (focusedPubIdRef.current === pubId) return;
    // Wait for publications to load, then fly to the target
    const tryFocus = () => {
      const pub = publicationStore.publications.find(p => p.id === pubId);
      if (pub) {
        focusedPubIdRef.current = pubId;
        setSelectedPublication(pub);
        setPublishCoords(null);
        const map = mapRef.current?.getMap();
        if (map) {
          const containerH = map.getContainer().clientHeight;
          map.flyTo({
            center: [pub.longitude, pub.latitude],
            padding: { top: containerH * 0.3, bottom: 0, left: 0, right: 0 },
            zoom: 14,
            duration: 800,
          });
        }
      } else {
        // Publications might not be loaded yet, retry shortly
        setTimeout(tryFocus, 300);
      }
    };
    tryFocus();
  }, [location.state, publicationStore.publications]);

  const handleViewportChange = useCallback((bbox: number[]) => {
    const map = mapRef.current?.getMap();
    if (map) {
      const zoom = map.getZoom();
      const center = map.getCenter();
      mapStore.updateMapState(zoom, { lat: center.lat, lng: center.lng }, bbox);
    }
  }, [mapStore]);

  const isScanning = speciesStore.isScanning;

  // Click on map → depends on mode
  const handleMapClick = useCallback((lngLat: { lng: number; lat: number }) => {
    if (isScanning) return;
    const lat = Number(lngLat.lat.toFixed(6));
    const lng = Number(lngLat.lng.toFixed(6));

    if (mode === 'publish') {
      setPublishCoords({ lat, lng });
      setSelectedPublication(null);
      // Offset so clicked point sits ~65% down, leaving space for popup above
      const map = mapRef.current?.getMap();
      if (map) {
        const containerH = map.getContainer().clientHeight;
        // target at 65%: (P + H) / 2 = 0.65H → P = 0.3H
        map.flyTo({
          center: [lng, lat],
          padding: { top: containerH * 0.3, bottom: 0, left: 0, right: 0 },
          duration: 600,
        });
      }
    } else {
      mapStore.setScanCenter({ lat, lng });
      weatherStore.fetchWeather(lat, lng);
    }
  }, [mapStore, weatherStore, isScanning, mode]);

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

  const handlePublish = useCallback(async (data: { title: string; description: string; imageUrl: string }) => {
    if (!publishCoords) return;
    const result = await publicationStore.addPublication({
      ...data,
      latitude: publishCoords.lat,
      longitude: publishCoords.lng,
    });
    if (result) {
      setPublishCoords(null);
    }
  }, [publishCoords, publicationStore]);

  const handlePublicationClick = useCallback((pub: PublicationData) => {
    setSelectedPublication(pub);
    setPublishCoords(null);
    // Fly to publication marker, offset to lower part of screen
    const map = mapRef.current?.getMap();
    if (map) {
      const containerH = map.getContainer().clientHeight;
      map.flyTo({
        center: [pub.longitude, pub.latitude],
        padding: { top: containerH * 0.3, bottom: 0, left: 0, right: 0 },
        duration: 600,
      });
    }
  }, []);

  return (
    <div className="h-dvh flex flex-col bg-gray-50 overflow-hidden">
      {/* Header fijo */}
      <header className="bg-gradient-to-r from-blue-600 to-cyan-600 shadow-lg h-16 flex items-center justify-between px-6 flex-shrink-0 z-20">
        <a
          href="/"
          onClick={(e) => { e.preventDefault(); startWaveTransition('/'); }}
          className="text-2xl font-bold text-white hover:text-blue-100 transition-colors"
        >
          Scubex
        </a>
        {userStore.isLoggedIn && (
          <a
            href="/profile"
            onClick={(e) => { e.preventDefault(); startWaveTransition('/profile', { from: '/map' }); }}
            className="flex items-center gap-2 bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/20 rounded-full px-3 py-1.5 transition-all"
          >
            {userStore.user?.picture ? (
              <img src={userStore.user.picture} alt={userStore.user.name} className="w-7 h-7 rounded-full active:animate-coin-spin" />
            ) : (
              <div className="w-7 h-7 rounded-full bg-cyan-500 flex items-center justify-center text-white text-xs font-bold active:animate-coin-spin">
                {userStore.user?.name?.[0]?.toUpperCase() ?? '?'}
              </div>
            )}
            <span className="text-white text-sm font-medium hidden sm:inline">{userStore.user?.name}</span>
          </a>
        )}
      </header>

      {/* Main content con altura fija */}
      <div className="flex-1 flex min-h-0">
        <div className="relative flex-1">
          <MapView 
            ref={mapRef} 
            isScanning={isScanning}
            onViewportIdle={handleViewportChange}
            onMapClick={handleMapClick}
            onPublicationClick={handlePublicationClick}
            scanCenter={mode === 'scan' ? mapStore.scanCenter : publishCoords}
            scanRadius={mode === 'scan' ? mapStore.scanRadius : undefined}
            publications={publicationStore.publications}
          />

          {/* Controls bar: mode toggle + radius selector + action button */}
          <motion.div
            className="absolute bottom-3 sm:bottom-5 left-3 sm:left-4 right-3 sm:right-auto bg-white/90 backdrop-blur-md rounded-2xl shadow-lg border border-gray-200/60 px-3 sm:px-4 py-2.5 sm:py-3 z-10 flex flex-wrap sm:flex-nowrap items-center gap-2 sm:gap-3"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.3 }}
          >
            {/* Mode toggle — only show if logged in */}
            {userStore.isLoggedIn && (
              <div className="flex bg-gray-100 rounded-lg p-px">
                <button
                  onClick={() => { setMode('scan'); setPublishCoords(null); }}
                  className={`px-3 py-1.5 rounded-[7px] text-xs font-semibold transition-all duration-200 ${
                    mode === 'scan'
                      ? 'bg-cyan-500 text-white shadow-md shadow-cyan-500/30 -m-px rounded-lg'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Escanear
                </button>
                <button
                  onClick={() => setMode('publish')}
                  className={`px-3 py-1.5 rounded-[7px] text-xs font-semibold transition-all duration-200 ${
                    mode === 'publish'
                      ? 'bg-cyan-500 text-white shadow-md shadow-cyan-500/30 -m-px rounded-lg'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Publicar
                </button>
              </div>
            )}

            {/* Divider — only when toggle is shown */}
            {userStore.isLoggedIn && <div className="w-px h-8 bg-gray-300 hidden sm:block" />}

            {mode === 'scan' ? (
              <>
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide hidden sm:inline">Radio</span>
                <div className="flex gap-1 flex-wrap sm:flex-nowrap">
                  {RADIUS_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => handleRadiusChange(opt.value)}
                      disabled={isScanning}
                      className={`px-2 sm:px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-all duration-200 ${
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
                <div className="w-px h-8 bg-gray-300 hidden sm:block" />

                {/* Scan button */}
                <motion.button
                  onClick={handleScan}
                  disabled={!mapStore.scanCenter || isScanning}
                  className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-sm font-semibold transition-all duration-200 w-full sm:w-auto justify-center ${
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
              </>
            ) : (
              <span className="text-xs text-cyan-600 font-medium">
                Haz click en el mapa para publicar
              </span>
            )}
          </motion.div>

          {/* Hint overlay */}
          {mode === 'scan' && !mapStore.scanCenter && !isScanning && !speciesStore.hasSpecies && (
            <motion.div
              className="absolute top-4 left-1/2 -translate-x-1/2 bg-black/60 backdrop-blur-sm text-white text-sm px-4 py-2 rounded-full z-10 pointer-events-none"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1 }}
            >
              Haz click en el mapa para seleccionar una zona
            </motion.div>
          )}

          {/* Publication popup — speech bubble from marker */}
          <AnimatePresence>
            {mode === 'publish' && publishCoords && !selectedPublication && (
              <PublicationPopup
                lat={publishCoords.lat}
                lng={publishCoords.lng}
                map={mapRef.current?.getMap() ?? null}
                onSubmit={handlePublish}
                onClose={() => setPublishCoords(null)}
                isLoading={publicationStore.isLoading}
              />
            )}
          </AnimatePresence>

          {/* Selected publication detail */}
          <AnimatePresence>
            {selectedPublication && (
              <PublicationDetail
                publication={selectedPublication}
                map={mapRef.current?.getMap() ?? null}
                isOwner={userStore.user?.email === selectedPublication.author.email}
                onClose={() => setSelectedPublication(null)}
                onEdit={async (id, data) => {
                  const updated = await publicationStore.editPublication(id, data);
                  if (updated) setSelectedPublication(updated);
                }}
                onDelete={async (id) => {
                  await publicationStore.removePublication(id);
                  setSelectedPublication(null);
                }}
              />
            )}
          </AnimatePresence>

          {/* Weather overlay on map */}
          <WeatherPanel
            data={weatherStore.weatherData}
            loading={weatherStore.isLoading}
            error={weatherStore.error}
          />

          {/* Collapsible sidebar — absolutely positioned to avoid map reflow */}
          {hasScanned && (
            <>
              {/* Toggle tab — hidden on mobile when sidebar is open (use close button instead) */}
              <button
                className={`absolute top-1/2 -translate-y-1/2 z-30 transition-[right] duration-300 ease-in-out ${sidebarOpen ? 'hidden sm:block' : ''}`}
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

              {/* Sidebar panel — full width on mobile, 400px on sm+ */}
              <div
                className="absolute top-0 right-0 h-full w-full sm:w-[400px] z-20 bg-white shadow-xl border-l border-gray-200 flex flex-col transition-transform duration-300 ease-in-out"
                style={{ transform: sidebarOpen ? 'translateX(0)' : 'translateX(100%)' }}
              >
                {/* Mobile back button */}
                <div className="sm:hidden flex items-center gap-2 px-3 py-2.5 border-b border-gray-200">
                  <button
                    className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors"
                    onClick={() => setSidebarOpen(false)}
                  >
                    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                      <path d="M13 3L6 10L13 17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </button>
                  <span className="text-sm font-semibold text-gray-700">Especies</span>
                </div>
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