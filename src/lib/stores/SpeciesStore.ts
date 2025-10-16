import { makeAutoObservable, runInAction } from 'mobx';
import { getZoneSpecies } from '../api';

export interface SpeciesData {
  taxon_id: string;
  common_name?: string;
  scientific_name: string;
  records: number;
  last_record: string;
  photoUrl?: string;
  phylum?: string;
}

export interface SpeciesResponse {
  species?: SpeciesData[];
  counts?: {
    total_taxa: number;
    total_occurrences?: number;
  };
  source?: string[];
}

export interface ScanData {
  lat: number;
  lng: number;
  radius: number;
}

class SpeciesStore {
  // Species data
  speciesData: SpeciesResponse | null = null;
  isLoading = false;
  error: string | null = null;
  
  // Scan parameters
  currentScanData: ScanData | null = null;
  
  constructor() {
    makeAutoObservable(this);
  }

  // Actions
  async fetchSpecies(scanData: ScanData) {
    this.isLoading = true;
    this.error = null;
    this.currentScanData = scanData;
    
    try {
      console.log('🗺️ MobX Store - Fetching species for:', scanData);
      const data = await getZoneSpecies(scanData);
      
      runInAction(() => {
        this.speciesData = data;
        this.isLoading = false;
      });
    } catch (error) {
      runInAction(() => {
        this.error = error instanceof Error ? error.message : 'Unknown error occurred';
        this.isLoading = false;
      });
    }
  }

  clearSpecies() {
    this.speciesData = null;
    this.currentScanData = null;
    this.error = null;
  }

  // Computed values
  get hasSpecies() {
    return this.speciesData?.species && this.speciesData.species.length > 0;
  }

  get speciesCount() {
    return this.speciesData?.counts?.total_taxa ?? 0;
  }

  get isScanning() {
    return this.isLoading;
  }
}

export default SpeciesStore;