import { makeAutoObservable, runInAction } from 'mobx';
import { getWeather, getDailyForecast, type WeatherData, type DailyForecastItem } from '../api';

class WeatherStore {
  weatherData: WeatherData | null = null;
  forecastData: DailyForecastItem[] | null = null;
  isLoading = false;
  forecastLoading = false;
  error: string | null = null;

  constructor() {
    makeAutoObservable(this);
  }

  async fetchWeather(lat: number, lng: number) {
    this.isLoading = true;
    this.forecastLoading = true;
    this.error = null;

    try {
      const [weatherResult, forecastResult] = await Promise.allSettled([
        getWeather(lat, lng),
        getDailyForecast(lat, lng),
      ]);

      runInAction(() => {
        if (weatherResult.status === 'fulfilled') {
          this.weatherData = weatherResult.value;
        } else {
          this.error = weatherResult.reason instanceof Error ? weatherResult.reason.message : 'Error fetching weather';
        }
        if (forecastResult.status === 'fulfilled') {
          this.forecastData = forecastResult.value;
        }
        this.isLoading = false;
        this.forecastLoading = false;
      });
    } catch (error) {
      runInAction(() => {
        this.error = error instanceof Error ? error.message : 'Error fetching weather';
        this.isLoading = false;
        this.forecastLoading = false;
      });
    }
  }

  clearWeather() {
    this.weatherData = null;
    this.forecastData = null;
    this.error = null;
  }

  get hasWeather() {
    return this.weatherData !== null;
  }
}

export default WeatherStore;
