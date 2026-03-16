import SpeciesStore from './SpeciesStore';
import MapStore from './MapStore';
import UserStore from './UserStore';

class RootStore {
  speciesStore: SpeciesStore;
  mapStore: MapStore;
  userStore: UserStore;

  constructor() {
    this.speciesStore = new SpeciesStore();
    this.mapStore = new MapStore();
    this.userStore = new UserStore();
  }
}

export default RootStore;