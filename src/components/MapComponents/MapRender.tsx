import { useEffect, useRef, forwardRef, useImperativeHandle } from "react";
import maplibregl, { Map } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";

/** Generate a GeoJSON polygon circle (64 points) given center and radius in meters */
function createCircleGeoJSON(center: [number, number], radiusMeters: number): GeoJSON.Feature<GeoJSON.Polygon> {
  const points = 64;
  const coords: [number, number][] = [];
  const earthRadius = 6371000;
  const lat = (center[1] * Math.PI) / 180;
  const lng = (center[0] * Math.PI) / 180;

  for (let i = 0; i <= points; i++) {
    const angle = (i * 2 * Math.PI) / points;
    const dLat = (radiusMeters / earthRadius) * Math.cos(angle);
    const dLng = (radiusMeters / earthRadius) * Math.sin(angle) / Math.cos(lat);
    coords.push([
      ((lng + dLng) * 180) / Math.PI,
      ((lat + dLat) * 180) / Math.PI,
    ]);
  }

  return {
    type: "Feature",
    properties: {},
    geometry: { type: "Polygon", coordinates: [coords] },
  };
}

interface MapRenderProps {
  onViewportIdle?: (bbox: number[]) => void;
  onMapClick?: (lngLat: { lng: number; lat: number }) => void;
  isScanning?: boolean;
  scanCenter?: { lat: number; lng: number } | null;
  scanRadius?: number;
}

export type MapRenderRef = { 
  getMap: () => Map | null;
  getContainer: () => HTMLDivElement | null;
};

export default forwardRef<MapRenderRef, MapRenderProps>(function MapRender({ onViewportIdle, onMapClick, isScanning = false, scanCenter, scanRadius = 2000 }, forwardedRef) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<Map | null>(null);
  const onMapClickRef = useRef(onMapClick);
  onMapClickRef.current = onMapClick;

  useImperativeHandle(forwardedRef, () => ({
    getMap: () => mapRef.current,
    getContainer: () => containerRef.current
  }));
  
  // Map initialization
  useEffect(() => {
    if (!containerRef.current) return;
    
    // Use OpenStreetMap if no MapTiler API key
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

    // Add navigation controls
    map.addControl(new maplibregl.NavigationControl(), 'top-right');
    map.addControl(new maplibregl.FullscreenControl(), 'top-right');
    
    mapRef.current = map;

    map.on("load", () => {
      if (onViewportIdle) {
        const b = map.getBounds(); // w,s,e,n
        onViewportIdle([b.getWest(), b.getSouth(), b.getEast(), b.getNorth()]);
      }
    });
    
    // Add bathymetry layer when style loads
    map.on("style.load", () => {
      map.addLayer({
        id: "bathymetry",
        type: "fill",
        source: "ocean",
        "source-layer": "contour",
        paint: {
          "fill-color": [
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

    // Click handler for scan
    map.on("click", (e) => {
      if (onMapClickRef.current) {
        onMapClickRef.current({ lng: e.lngLat.lng, lat: e.lngLat.lat });
      }
    });

    // Add scan circle source (empty initially)
    map.on("load", () => {
      map.addSource("scan-circle", {
        type: "geojson",
        data: { type: "FeatureCollection", features: [] },
      });
      map.addLayer({
        id: "scan-circle-fill",
        type: "fill",
        source: "scan-circle",
        paint: {
          "fill-color": "#06b6d4",
          "fill-opacity": 0.12,
        },
      });
      map.addLayer({
        id: "scan-circle-border",
        type: "line",
        source: "scan-circle",
        paint: {
          "line-color": "#06b6d4",
          "line-width": 2,
          "line-dasharray": [3, 2],
        },
      });
    });

    return () => { 
      map.remove(); 
    };
  }, []); // Remove onViewportIdle dependency to prevent map re-initialization

  // Set up viewport change handler separately 
  useEffect(() => {
    if (!mapRef.current || !onViewportIdle) return;

    let timer: number | null = null;
    const emitBbox = () => {
      if (onViewportIdle && mapRef.current) {
        const b = mapRef.current.getBounds(); // w,s,e,n
        onViewportIdle([b.getWest(), b.getSouth(), b.getEast(), b.getNorth()]);
      }
    };

    const onMoveEnd = () => {
      if (timer) window.clearTimeout(timer);
      timer = window.setTimeout(emitBbox, 500); // debounce 500ms
    };

    mapRef.current.on("moveend", onMoveEnd);
    
    return () => {
      if (mapRef.current) {
        mapRef.current.off("moveend", onMoveEnd);
      }
      if (timer) {
        window.clearTimeout(timer);
      }
    };
  }, [onViewportIdle]);

  // Update scan circle when center/radius change
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const source = map.getSource("scan-circle") as maplibregl.GeoJSONSource | undefined;
    if (!source) return;

    if (scanCenter) {
      const circle = createCircleGeoJSON([scanCenter.lng, scanCenter.lat], scanRadius);
      source.setData({ type: "FeatureCollection", features: [circle] });
    } else {
      source.setData({ type: "FeatureCollection", features: [] });
    }
  }, [scanCenter, scanRadius]);

  // Control map interactions based on scanning state
  useEffect(() => {
    if (!mapRef.current) return;
    
    if (isScanning) {
      mapRef.current.dragPan.disable();
      mapRef.current.scrollZoom.disable();
      mapRef.current.boxZoom.disable();
      mapRef.current.keyboard.disable();
      mapRef.current.doubleClickZoom.disable();
      mapRef.current.touchZoomRotate.disable();
    } else {
      mapRef.current.dragPan.enable();
      mapRef.current.scrollZoom.enable();
      mapRef.current.boxZoom.enable();
      mapRef.current.keyboard.enable();
      mapRef.current.doubleClickZoom.enable();
      mapRef.current.touchZoomRotate.enable();
    }
  }, [isScanning]);

  return <div className="w-full h-full cursor-crosshair" ref={containerRef} />;
});