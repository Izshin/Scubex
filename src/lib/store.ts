import { create } from 'zustand'

interface AppState {
  selectedSpecies: any | null
  setSelectedSpecies: (species: any | null) => void
  mapBounds: number[] | null
  setMapBounds: (bounds: number[] | null) => void
}

export const useAppStore = create<AppState>((set) => ({
  selectedSpecies: null,
  setSelectedSpecies: (species) => set({ selectedSpecies: species }),
  mapBounds: null,
  setMapBounds: (bounds) => set({ mapBounds: bounds }),
}))