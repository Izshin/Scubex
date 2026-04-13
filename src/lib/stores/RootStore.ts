import SpeciesStore from './SpeciesStore';
import MapStore from './MapStore';
import UserStore from './UserStore';
import WeatherStore from './WeatherStore';
import PublicationStore from './PublicationStore';

class RootStore {
  speciesStore: SpeciesStore;
  mapStore: MapStore;
  userStore: UserStore;
  weatherStore: WeatherStore;
  publicationStore: PublicationStore;

  constructor() {
    this.speciesStore = new SpeciesStore();
    this.mapStore = new MapStore();
    this.userStore = new UserStore();
    this.weatherStore = new WeatherStore();
    this.publicationStore = new PublicationStore();
  }
}

export default RootStore;