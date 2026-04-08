import SpeciesStore from './SpeciesStore';
import MapStore from './MapStore';
import UserStore from './UserStore';
import WeatherStore from './WeatherStore';

class RootStore {
  speciesStore: SpeciesStore;
  mapStore: MapStore;
  userStore: UserStore;
  weatherStore: WeatherStore;

  constructor() {
    this.speciesStore = new SpeciesStore();
    this.mapStore = new MapStore();
    this.userStore = new UserStore();
    this.weatherStore = new WeatherStore();
  }
}

export default RootStore;