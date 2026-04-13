import { makeAutoObservable, runInAction } from 'mobx';
import { getWeather, type WeatherData } from '../api';

class WeatherStore {
  weatherData: WeatherData | null = null;
  isLoading = false;
  error: string | null = null;

  constructor() {
    makeAutoObservable(this);
  }

  async fetchWeather(lat: number, lng: number) {
    this.isLoading = true;
    this.error = null;

    try {
      console.log('🌤️ MobX Store - Fetching weather for:', { lat, lng });
      const data = await getWeather(lat, lng);

      runInAction(() => {
        this.weatherData = data;
        this.isLoading = false;
      });
    } catch (error) {
      runInAction(() => {
        this.error = error instanceof Error ? error.message : 'Error fetching weather';
        this.isLoading = false;
      });
    }
  }

  clearWeather() {
    this.weatherData = null;
    this.error = null;
  }

  get hasWeather() {
    return this.weatherData !== null;
  }
}

export default WeatherStore;
