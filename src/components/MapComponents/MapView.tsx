import { useRef, forwardRef, useImperativeHandle, useMemo } from "react";
import { Map } from "maplibre-gl";
import MapRender, { type MapRenderRef } from "./MapRender";
import ScanningAnimation from "./ScanningAnimation";

type Props = { 
  onViewportIdle?: (bbox: number[]) => void;
  isScanning?: boolean;
};

export type MapViewRef = { getMap: () => Map | null };

export default forwardRef<MapViewRef, Props>(function MapView({ onViewportIdle, isScanning = false }, forwardedRef) {
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
        isScanning={isScanning}
      />
      <ScanningAnimation 
        isScanning={isScanning}
        containerRef={stableContainerRef}
        mapRef={stableMapRef}
      />
    </div>
  );
});