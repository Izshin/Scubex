import SpeciesStore from './SpeciesStore';
import MapStore from './MapStore';

class RootStore {
  speciesStore: SpeciesStore;
  mapStore: MapStore;

  constructor() {
    this.speciesStore = new SpeciesStore();
    this.mapStore = new MapStore();
  }
}

export default RootStore;