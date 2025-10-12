import { useEffect, useRef, forwardRef, useImperativeHandle } from "react";
import maplibregl, { Map } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";

type Props = { onViewportIdle?: (bbox: number[]) => void };
export type MapViewRef = { getMap: () => Map | null };

export default forwardRef<MapViewRef, Props>(function MapView({ onViewportIdle }, forwardedRef) {
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
    </div>
  );
});