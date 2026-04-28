import { useRef, forwardRef, useImperativeHandle, useMemo } from "react";
import { Map } from "maplibre-gl";
import MapRender, { type MapRenderRef } from "./MapRender";
import ScanningAnimation from "./ScanningAnimation";
import type { PublicationData } from "../../lib/api";

type Props = { 
  onViewportIdle?: (bbox: number[]) => void;
  onMapClick?: (lngLat: { lng: number; lat: number }) => void;
  onPublicationClick?: (pub: PublicationData) => void;
  isScanning?: boolean;
  scanCenter?: { lat: number; lng: number } | null;
  scanRadius?: number;
  publishCenter?: { lat: number; lng: number } | null;
  publications?: PublicationData[];
};

export type MapViewRef = { getMap: () => Map | null };

export default forwardRef<MapViewRef, Props>(function MapView({ onViewportIdle, onMapClick, onPublicationClick, isScanning = false, scanCenter, scanRadius, publishCenter, publications }, forwardedRef) {
  const mapRenderRef = useRef<MapRenderRef>(null);

  useImperativeHandle(forwardedRef, () => ({
    getMap: () => mapRenderRef.current?.getMap() || null
  }));

  // Stable refs for ScanningAnimation
  const stableContainerRef = useMemo(() => ({
    get current() {
      return mapRenderRef.current?.getContainer() || null;
    }
  }), []);

  const stableMapRef = useMemo(() => ({
    get current() {
      return mapRenderRef.current?.getMap() || null;
    }
  }), []);

  return (
    <div className="w-full h-full relative">
      <MapRender 
        ref={mapRenderRef}
        onViewportIdle={onViewportIdle}
        onMapClick={onMapClick}
        onPublicationClick={onPublicationClick}
        isScanning={isScanning}
        scanCenter={scanCenter}
        scanRadius={scanRadius}
        publishCenter={publishCenter}
        publications={publications}
      />
      <ScanningAnimation 
        isScanning={isScanning}
        containerRef={stableContainerRef}
        mapRef={stableMapRef}
        scanCenter={scanCenter}
        scanRadius={scanRadius}
      />
    </div>
  );
});