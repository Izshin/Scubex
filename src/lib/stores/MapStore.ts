import { makeAutoObservable } from 'mobx';
import type { SpeciesData } from './SpeciesStore';

class MapStore {
  // Map state
  mapBounds: number[] | null = null;
  currentZoom = 10;
  currentCenter: { lat: number; lng: number } = { lat: 36.52, lng: -5.98 }; // Cádiz default
  
  // UI state
  selectedSpecies: SpeciesData | null = null;
  
  constructor() {
    makeAutoObservable(this);
  }

  // Actions
  setMapBounds(bounds: number[] | null) {
    this.mapBounds = bounds;
  }

  setCurrentZoom(zoom: number) {
    this.currentZoom = zoom;
  }

  setCurrentCenter(center: { lat: number; lng: number }) {
    this.currentCenter = center;
  }

  setSelectedSpecies(species: SpeciesData | null) {
    this.selectedSpecies = species;
  }

  updateMapState(zoom: number, center: { lat: number; lng: number }, bounds?: number[]) {
    this.currentZoom = zoom;
    this.currentCenter = center;
    if (bounds) {
      this.mapBounds = bounds;
    }
  }

  // Computed values
  get zoomRadius() {
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
    
    const roundedZoom = Math.round(this.currentZoom);
    return zoomToRadius[roundedZoom] || 1000; // Default to 1km
  }
}

export default MapStore;