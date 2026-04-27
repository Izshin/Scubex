import { useRef, useCallback, useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { observer } from "mobx-react-lite";
import { useLocation, useSearchParams } from "react-router-dom";
import { GoogleLogin } from '@react-oauth/google';
import MapView, { type MapViewRef } from "../components/MapComponents/MapView.tsx";
import SpeciesPanel from "../components/SpeciesPanel";
import WeatherPanel from "../components/WeatherPanel";
import PublicationPopup from "../components/PublicationPopup";
import PublicationDetail from "../components/PublicationDetail";
import PlaceSearch from "../components/PlaceSearch";
import NotificationBell from "../components/NotificationBell";
import Avatar from "../components/Avatar";
import Spinner from "../components/Spinner";
import { useSpeciesStore, useMapStore, useWeatherStore, usePublicationStore, useUserStore } from "../lib/stores/index.tsx";
import { useWaveTransition } from "../lib/transition";
import { loginWithGoogle } from "../lib/api";
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
  const [detailHidden, setDetailHidden] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [loginPromptCoords, setLoginPromptCoords] = useState<{ lat: number; lng: number } | null>(null);
  // Tracks the focusPublication id that has already been processed so re-renders
  // triggered by publicationStore.publications changing (e.g. after creating a new
  // publication) don't fly back to the originally focused publication.
  const focusedPubIdRef = useRef<number | null>(null);
  const [searchParams] = useSearchParams();

  // Load publications on mount
  useEffect(() => {
    publicationStore.fetchPublications();
  }, [publicationStore]);

  // Focus on a publication when navigated from profile OR via ?pub= URL param
  useEffect(() => {
    const state = location.state as { focusPublication?: number } | null;
    const pubId = state?.focusPublication ?? (searchParams.get('pub') ? Number(searchParams.get('pub')) : null);
    if (!pubId) return;
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
  }, [location.state, searchParams, publicationStore.publications]);

  const handleViewportChange = useCallback((bbox: number[]) => {
    const map = mapRef.current?.getMap();
    if (map) {
      const zoom = map.getZoom();
      const center = map.getCenter();
      mapStore.updateMapState(zoom, { lat: center.lat, lng: center.lng }, bbox);
    }
  }, [mapStore]);

  const isScanning = speciesStore.isScanning;

  // Scan completed toast: place name + badge
  const [scanToastName, setScanToastName] = useState<string | null>(null);
  const [scanBadge, setScanBadge] = useState(false);
  const prevScanningRef = useRef(false);
  useEffect(() => {
    if (prevScanningRef.current && !isScanning && mapStore.scanCenter) {
      // Scan just finished — reverse-geocode the scan center
      const { lat, lng } = mapStore.scanCenter;
      fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&accept-language=es`)
        .then(r => r.json())
        .then(data => {
          const a = data.address ?? {};
          const name = a.beach ?? a.bay ?? a.town ?? a.city ?? a.village ?? a.county ?? a.state ?? `${lat.toFixed(2)}, ${lng.toFixed(2)}`;
          setScanToastName(name);
          setScanBadge(true);
        })
        .catch(() => { setScanToastName(`${lat.toFixed(2)}, ${lng.toFixed(2)}`); setScanBadge(true); });
    }
    prevScanningRef.current = isScanning;
  }, [isScanning, mapStore.scanCenter]);

  // Click on map → depends on mode
  const handleMapClick = useCallback((lngLat: { lng: number; lat: number }) => {
    const lat = Number(lngLat.lat.toFixed(6));
    const lng = Number(lngLat.lng.toFixed(6));

    if (mode === 'publish') {
      setSelectedPublication(null);
      if (!userStore.isLoggedIn) {
        setLoginPromptCoords({ lat, lng });
        return;
      }
      setPublishCoords({ lat, lng });
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
      if (isScanning) return; // don't move scan center while scan in progress
      mapStore.setScanCenter({ lat, lng });
      weatherStore.fetchWeather(lat, lng);
    }
  }, [mapStore, weatherStore, isScanning, mode, userStore.isLoggedIn]);

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
          <div className="flex items-center gap-8">
            <NotificationBell
              onFocusPublication={(id) => {
                const pub = publicationStore.publications.find(p => p.id === id);
                if (pub) {
                  handlePublicationClick(pub);
                } else {
                  // not loaded yet — use focusPublication state nav
                  focusedPubIdRef.current = null;
                  window.history.replaceState({ focusPublication: id }, '');
                  window.dispatchEvent(new PopStateEvent('popstate', { state: { focusPublication: id } }));
                }
              }}
            />
            <a
              href="/profile"
              onClick={(e) => { e.preventDefault(); startWaveTransition('/profile', { from: '/map' }); }}
              className="flex items-center gap-2 bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/20 rounded-full px-3 py-1.5 transition-all"
            >
              <Avatar
                src={userStore.user?.picture}
                name={userStore.user?.name}
                className="w-7 h-7 active:animate-coin-spin"
              />
              <span className="text-white text-sm font-medium hidden sm:inline">{userStore.user?.name}</span>
            </a>
          </div>
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
            scanCenter={mapStore.scanCenter}
            publishCenter={mode === 'publish' ? publishCoords : null}
            scanRadius={mapStore.scanRadius}
            publications={publicationStore.publications}
          />

          {/* Controls bar: mode toggle + radius selector + action button */}
          <motion.div
            className="absolute bottom-3 sm:bottom-5 left-3 sm:left-4 right-3 sm:right-auto bg-white/90 backdrop-blur-md rounded-2xl shadow-lg border border-gray-200/60 px-3 sm:px-4 py-2.5 sm:py-3 z-10 flex flex-wrap sm:flex-nowrap items-center gap-2 sm:gap-3"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.3 }}
          >
            {/* Mode toggle — always visible */}
            <div className="flex bg-gray-100 rounded-lg p-px">
              <button
                onClick={() => { setMode('scan'); setPublishCoords(null); setLoginPromptCoords(null); }}
                className={`px-3 py-1.5 rounded-[7px] text-xs font-semibold transition-all duration-200 ${
                  mode === 'scan'
                    ? 'bg-cyan-500 text-white shadow-md shadow-cyan-500/30 -m-px rounded-lg'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Escanear
              </button>
              <button
                onClick={() => { setMode('publish'); setLoginPromptCoords(null); }}
                className={`px-3 py-1.5 rounded-[7px] text-xs font-semibold transition-all duration-200 ${
                  mode === 'publish'
                    ? 'bg-cyan-500 text-white shadow-md shadow-cyan-500/30 -m-px rounded-lg'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Publicar
              </button>
            </div>

            {/* Divider */}
            <div className="w-px h-8 bg-gray-300 hidden sm:block" />

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
                    <Spinner size="w-4 h-4" color="border-white/30 border-t-white" />
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
              className="absolute bottom-40 sm:bottom-24 left-1/2 -translate-x-1/2 sm:left-8 sm:translate-x-0 bg-black/60 backdrop-blur-sm text-white text-sm px-4 py-2 rounded-full z-10 pointer-events-none"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1 }}
            >
              Haz click en el mapa para seleccionar una zona
            </motion.div>
          )}

          {/* Scan completed toast */}
          <AnimatePresence>
            {scanToastName && (
              <motion.button
                key="scan-toast"
                className={`absolute ${mode === 'publish' ? 'bottom-24' : 'bottom-40'} sm:bottom-24 left-3 sm:left-4 z-20 flex items-center gap-2 bg-white/90 backdrop-blur-md text-gray-800 text-xs px-3 py-2 rounded-2xl shadow-lg border border-gray-200/60 hover:bg-white transition-all`}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 8 }}
                transition={{ duration: 0.25 }}
                onClick={() => {
                  const map = mapRef.current?.getMap();
                  if (map && mapStore.scanCenter) {
                    map.flyTo({ center: [mapStore.scanCenter.lng, mapStore.scanCenter.lat], zoom: 12.5, duration: 700 });
                  }
                  setScanBadge(false);
                  setScanToastName(null);
                  setTimeout(() => setSidebarOpen(true), 500);
                }}
              >
                <svg viewBox="0 0 24 24" fill="none" className="w-3.5 h-3.5 text-cyan-500 ml-1 shrink-0">
                  <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2" fill="currentColor"/>
                  <circle cx="12" cy="12" r="7" stroke="currentColor" strokeWidth="1.5" fill="none" opacity="0.6"/>
                  <circle cx="12" cy="12" r="11" stroke="currentColor" strokeWidth="1" fill="none" opacity="0.3"/>
                </svg>
                <span className="text-gray-700 font-medium">Escaneo en {scanToastName}, acabado</span>
                <button
                  onClick={e => { e.stopPropagation(); setScanToastName(null); }}
                  className="ml-1 text-gray-400 hover:text-cyan-600 transition-colors"
                >
                  <svg width="10" height="10" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                    <line x1="3" y1="3" x2="13" y2="13"/><line x1="13" y1="3" x2="3" y2="13"/>
                  </svg>
                </button>
              </motion.button>
            )}
          </AnimatePresence>

          {/* Login prompt — shown when unauthenticated user clicks in publish mode */}
          <AnimatePresence>
            {mode === 'publish' && loginPromptCoords && !userStore.isLoggedIn && (
              <motion.div
                key="login-prompt-backdrop"
                className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                onClick={() => setLoginPromptCoords(null)}
              >
                <motion.div
                  className="relative bg-white rounded-2xl shadow-xl border border-gray-200/60 p-5 flex flex-col items-center gap-3 w-72 mx-4"
                  initial={{ scale: 0.9, y: 10 }}
                  animate={{ scale: 1, y: 0 }}
                  exit={{ scale: 0.9, y: 10 }}
                  transition={{ duration: 0.2 }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    onClick={() => setLoginPromptCoords(null)}
                    className="absolute top-3 right-3 text-gray-400 hover:text-cyan-600 text-xl leading-none transition-colors"
                    title="Cerrar"
                  >
                    ×
                  </button>
                  <p className="text-sm font-semibold text-gray-800 text-center">Inicia sesión para publicar</p>
                  <p className="text-xs text-gray-500 text-center">Necesitas una cuenta para compartir tus inmersiones con la comunidad.</p>
                  <div className="relative">
                    <div className="inline-flex items-center gap-2 bg-gradient-to-r from-cyan-500 to-blue-500 text-white font-semibold py-2 px-4 rounded-xl text-sm shadow-md">
                      <svg className="w-4 h-4" viewBox="0 0 24 24">
                        <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/>
                        <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                        <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                        <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                      </svg>
                      Iniciar sesión con Google
                    </div>
                    <div className="absolute inset-0 overflow-hidden rounded-xl" style={{ opacity: 0.01 }}>
                      <GoogleLogin
                        onSuccess={async (res) => {
                          if (!res.credential) return;
                          try {
                            const data = await loginWithGoogle(res.credential);
                            userStore.setUser({ ...data.user, token: data.token });
                            setLoginPromptCoords(null);
                            setPublishCoords(loginPromptCoords);
                          } catch (e) {
                            console.error('Login failed', e);
                          }
                        }}
                        onError={() => console.error('Google login error')}
                        shape="pill"
                        theme="filled_blue"
                        width={288}
                      />
                    </div>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

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
                key={selectedPublication.id}
                publication={selectedPublication}
                map={mapRef.current?.getMap() ?? null}
                isOwner={userStore.user?.email === selectedPublication.author.email}
                hidden={detailHidden}
                onClose={() => setSelectedPublication(null)}
                onEdit={async (id, data) => {
                  const updated = await publicationStore.editPublication(id, data);
                  if (updated) setSelectedPublication(updated);
                }}
                onDelete={async (id) => {
                  await publicationStore.removePublication(id);
                  setSelectedPublication(null);
                }}
                onCountsChange={(likeCount, commentCount) => {
                  setSelectedPublication(prev => prev ? { ...prev, likeCount, commentCount } : prev);
                  publicationStore.updatePublicationCounts(selectedPublication.id, likeCount, commentCount);
                }}
              />
            )}
          </AnimatePresence>

          {/* Place search — top right */}
          <PlaceSearch
            onSelectPlace={(lat, lng) => {
              const map = mapRef.current?.getMap();
              if (map) {
                map.flyTo({ center: [lng, lat], zoom: 12, duration: 800 });
              }
            }}
            onExpandChange={setSearchOpen}
          />

          {/* Weather overlay on map — hidden on mobile while search is open */}
          <WeatherPanel
            data={weatherStore.weatherData}
            loading={weatherStore.isLoading}
            error={weatherStore.error}
            hidden={(searchOpen || sidebarOpen) && window.innerWidth < 640}
            onInfoOpen={() => setDetailHidden(true)}
            onInfoClose={() => setDetailHidden(false)}
          />

          {/* Collapsible sidebar — absolutely positioned to avoid map reflow */}
          {hasScanned && (
            <>
              {/* Toggle tab — hidden on mobile when sidebar is open (use close button instead) */}
              <button
                className={`absolute top-1/2 -translate-y-1/2 z-30 transition-[right] duration-300 ease-in-out ${sidebarOpen ? 'hidden sm:block' : ''}`}
                style={{ right: sidebarOpen ? 400 : 0 }}
                onClick={() => {
                  const opening = !sidebarOpen;
                  if (opening && window.innerWidth < 640) setDetailHidden(true);
                  if (!opening && window.innerWidth < 640) setDetailHidden(false);
                  setSidebarOpen(opening);
                  setScanBadge(false);
                }}
              >
                <div className="relative w-6 h-12 bg-white shadow-lg border border-r-0 border-gray-200 rounded-l-full flex items-center justify-center hover:bg-gray-50 transition-colors">
                  <svg
                    width="10"
                    height="14"
                    viewBox="0 0 10 14"
                    fill="none"
                    className={`text-gray-500 transition-transform duration-300 ${sidebarOpen ? 'rotate-180' : 'rotate-0'}`}
                  >
                    <path d="M8 1L2 7L8 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  {scanBadge && !sidebarOpen && (
                    <span className="absolute -top-2 -left-2 w-3 h-3 bg-cyan-500 rounded-full" />
                  )}
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
                    onClick={() => { setSidebarOpen(false); setDetailHidden(false); }}
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