import { makeAutoObservable } from 'mobx';
import type { SpeciesData } from './SpeciesStore';

class MapStore {
  // Map state
  mapBounds: number[] | null = null;
  currentZoom = 10;
  currentCenter: { lat: number; lng: number } = { lat: 36.52, lng: -5.98 }; // Cádiz default
  
  // Scan target (where user clicked)
  scanCenter: { lat: number; lng: number } | null = null;
  scanRadius = 500; // meters, user-configurable
  
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

  setScanCenter(center: { lat: number; lng: number } | null) {
    this.scanCenter = center;
  }

  setScanRadius(radius: number) {
    this.scanRadius = radius;
  }

  clearScan() {
    this.scanCenter = null;
  }

  updateMapState(zoom: number, center: { lat: number; lng: number }, bounds?: number[]) {
    this.currentZoom = zoom;
    this.currentCenter = center;
    if (bounds) {
      this.mapBounds = bounds;
    }
  }
}

export default MapStore;