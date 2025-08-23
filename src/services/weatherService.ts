import { WeatherInfo, Coordinates } from '../types';

// Demo API key - in production, this should be in environment variables
const API_KEY = 'demo_key'; // Replace with actual API key
const BASE_URL = 'https://api.openweathermap.org/data/2.5';

export interface WeatherForecast {
  date: string;
  weather: WeatherInfo;
}

export interface ExtendedWeatherInfo extends WeatherInfo {
  feelsLike?: number;
  pressure?: number;
  visibility?: number;
  uvIndex?: number;
  sunrise?: string;
  sunset?: string;
}

export class WeatherService {
  private static cache = new Map<string, { data: any; timestamp: number }>();
  private static readonly CACHE_DURATION = 10 * 60 * 1000; // 10 minutes

  // Get current weather for coordinates
  static async getCurrentWeather(coordinates: Coordinates): Promise<ExtendedWeatherInfo | null> {
    const cacheKey = `current_${coordinates.lat}_${coordinates.lng}`;
    
    // Check cache first
    const cached = this.getCachedData(cacheKey);
    if (cached) {
      return this.parseCurrentWeather(cached);
    }

    try {
      // For demo purposes, return mock data if no API key
      if (API_KEY === 'demo_key') {
        return this.getMockCurrentWeather(coordinates);
      }

      const response = await fetch(
        `${BASE_URL}/weather?lat=${coordinates.lat}&lon=${coordinates.lng}&appid=${API_KEY}&units=metric&lang=de`
      );

      if (!response.ok) {
        throw new Error(`Weather API error: ${response.status}`);
      }

      const data = await response.json();
      this.setCachedData(cacheKey, data);
      
      return this.parseCurrentWeather(data);
    } catch (error) {
      console.error('Failed to fetch current weather:', error);
      return this.getMockCurrentWeather(coordinates);
    }
  }

  // Get weather forecast for coordinates
  static async getWeatherForecast(coordinates: Coordinates, days: number = 5): Promise<WeatherForecast[]> {
    const cacheKey = `forecast_${coordinates.lat}_${coordinates.lng}_${days}`;
    
    // Check cache first
    const cached = this.getCachedData(cacheKey);
    if (cached) {
      return this.parseForecast(cached, days);
    }

    try {
      // For demo purposes, return mock data if no API key
      if (API_KEY === 'demo_key') {
        return this.getMockForecast(coordinates, days);
      }

      const response = await fetch(
        `${BASE_URL}/forecast?lat=${coordinates.lat}&lon=${coordinates.lng}&appid=${API_KEY}&units=metric&lang=de`
      );

      if (!response.ok) {
        throw new Error(`Weather API error: ${response.status}`);
      }

      const data = await response.json();
      this.setCachedData(cacheKey, data);
      
      return this.parseForecast(data, days);
    } catch (error) {
      console.error('Failed to fetch weather forecast:', error);
      return this.getMockForecast(coordinates, days);
    }
  }

  // Get weather for a specific date and location
  static async getWeatherForDate(coordinates: Coordinates, date: string): Promise<WeatherInfo | null> {
    const targetDate = new Date(date);
    const now = new Date();
    const diffTime = targetDate.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    // If date is in the past or too far in the future, return historical/mock data
    if (diffDays < 0 || diffDays > 5) {
      return this.getMockWeatherForDate(coordinates, date);
    }

    // Get forecast and find the closest date
    const forecast = await this.getWeatherForecast(coordinates, 5);
    const targetForecast = forecast.find(f => f.date === date);
    
    return targetForecast?.weather || null;
  }

  // Batch fetch weather for multiple destinations
  static async getWeatherForDestinations(destinations: Array<{ coordinates: Coordinates; date: string }>): Promise<Map<string, WeatherInfo>> {
    const weatherMap = new Map<string, WeatherInfo>();
    
    // Process in parallel but limit concurrent requests
    const BATCH_SIZE = 5;
    for (let i = 0; i < destinations.length; i += BATCH_SIZE) {
      const batch = destinations.slice(i, i + BATCH_SIZE);
      
      const promises = batch.map(async (dest) => {
        const weather = await this.getWeatherForDate(dest.coordinates, dest.date);
        if (weather) {
          const key = `${dest.coordinates.lat}_${dest.coordinates.lng}_${dest.date}`;
          weatherMap.set(key, weather);
        }
      });

      await Promise.all(promises);
      
      // Small delay between batches to respect API limits
      if (i + BATCH_SIZE < destinations.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    return weatherMap;
  }

  // Helper methods
  private static getCachedData(key: string): any | null {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
      return cached.data;
    }
    this.cache.delete(key);
    return null;
  }

  private static setCachedData(key: string, data: any): void {
    this.cache.set(key, { data, timestamp: Date.now() });
  }

  private static parseCurrentWeather(data: any): ExtendedWeatherInfo {
    return {
      temperature: Math.round(data.main?.temp || 20),
      condition: data.weather?.[0]?.main || 'Clear',
      description: data.weather?.[0]?.description || 'Klarer Himmel',
      humidity: data.main?.humidity || 50,
      windSpeed: data.wind?.speed || 5,
      icon: data.weather?.[0]?.icon || '01d',
      feelsLike: Math.round(data.main?.feels_like || data.main?.temp || 20),
      pressure: data.main?.pressure || 1013,
      visibility: data.visibility ? Math.round(data.visibility / 1000) : 10,
      uvIndex: data.uvi || 3,
      sunrise: data.sys?.sunrise ? new Date(data.sys.sunrise * 1000).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' }) : '06:30',
      sunset: data.sys?.sunset ? new Date(data.sys.sunset * 1000).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' }) : '18:30'
    };
  }

  private static parseForecast(data: any, days: number): WeatherForecast[] {
    const forecasts: WeatherForecast[] = [];
    const processedDates = new Set<string>();

    // Group by date and take midday forecast
    data.list?.forEach((item: any) => {
      const date = new Date(item.dt * 1000);
      const dateString = date.toISOString().split('T')[0];
      const hour = date.getHours();

      // Take midday forecast (12:00) or closest available
      if (!processedDates.has(dateString) && (hour === 12 || hour === 15)) {
        processedDates.add(dateString);
        
        forecasts.push({
          date: dateString,
          weather: {
            temperature: Math.round(item.main?.temp || 20),
            condition: item.weather?.[0]?.main || 'Clear',
            description: item.weather?.[0]?.description || 'Klarer Himmel',
            humidity: item.main?.humidity || 50,
            windSpeed: item.wind?.speed || 5,
            icon: item.weather?.[0]?.icon || '01d'
          }
        });
      }
    });

    return forecasts.slice(0, days);
  }

  private static getMockCurrentWeather(coordinates: Coordinates): ExtendedWeatherInfo {
    // Generate consistent mock data based on coordinates
    const seed = Math.abs(coordinates.lat + coordinates.lng) * 1000;
    const temp = 15 + (seed % 20);
    const conditions = ['Clear', 'Clouds', 'Rain', 'Snow', 'Mist'];
    const descriptions = ['Klarer Himmel', 'Bewölkt', 'Leichter Regen', 'Schneeschauer', 'Nebel'];
    const icons = ['01d', '02d', '10d', '13d', '50d'];
    
    const conditionIndex = Math.floor(seed) % conditions.length;

    return {
      temperature: Math.round(temp),
      condition: conditions[conditionIndex],
      description: descriptions[conditionIndex],
      humidity: 40 + (Math.floor(seed) % 40),
      windSpeed: 2 + (Math.floor(seed) % 8),
      icon: icons[conditionIndex],
      feelsLike: Math.round(temp + (Math.floor(seed) % 6) - 3),
      pressure: 1000 + (Math.floor(seed) % 50),
      visibility: 8 + (Math.floor(seed) % 7),
      uvIndex: Math.floor(seed) % 11,
      sunrise: '06:30',
      sunset: '18:30'
    };
  }

  private static getMockForecast(coordinates: Coordinates, days: number): WeatherForecast[] {
    const forecasts: WeatherForecast[] = [];
    const baseTemp = 15 + (Math.abs(coordinates.lat + coordinates.lng) * 1000 % 20);
    
    for (let i = 0; i < days; i++) {
      const date = new Date();
      date.setDate(date.getDate() + i);
      const dateString = date.toISOString().split('T')[0];
      
      const tempVariation = (Math.sin(i * 0.5) * 5);
      const temperature = Math.round(baseTemp + tempVariation);
      
      const conditions = ['Clear', 'Clouds', 'Rain'];
      const descriptions = ['Sonnig', 'Bewölkt', 'Regenschauer'];
      const icons = ['01d', '02d', '10d'];
      
      const conditionIndex = (i + Math.floor(coordinates.lat)) % conditions.length;

      forecasts.push({
        date: dateString,
        weather: {
          temperature,
          condition: conditions[conditionIndex],
          description: descriptions[conditionIndex],
          humidity: 45 + (i * 5) % 30,
          windSpeed: 3 + (i % 6),
          icon: icons[conditionIndex]
        }
      });
    }

    return forecasts;
  }

  private static getMockWeatherForDate(coordinates: Coordinates, date: string): WeatherInfo {
    const targetDate = new Date(date);
    const dayOfYear = Math.floor((targetDate.getTime() - new Date(targetDate.getFullYear(), 0, 0).getTime()) / 86400000);
    
    // Simulate seasonal temperature variations
    const baseTemp = 10 + Math.sin((dayOfYear - 80) * 2 * Math.PI / 365) * 15;
    const locationTemp = baseTemp + (Math.abs(coordinates.lat) - 50) * 0.5;
    
    const conditions = ['Clear', 'Clouds', 'Rain'];
    const descriptions = ['Sonnig', 'Teilweise bewölkt', 'Leichter Regen'];
    const icons = ['01d', '02d', '10d'];
    
    const conditionIndex = dayOfYear % conditions.length;

    return {
      temperature: Math.round(locationTemp),
      condition: conditions[conditionIndex],
      description: descriptions[conditionIndex],
      humidity: 40 + (dayOfYear % 40),
      windSpeed: 2 + (dayOfYear % 8),
      icon: icons[conditionIndex]
    };
  }

  // Utility function to get weather icon URL
  static getIconUrl(icon: string): string {
    return `https://openweathermap.org/img/wn/${icon}@2x.png`;
  }

  // Get weather emoji for condition
  static getWeatherEmoji(condition: string): string {
    const emojiMap: Record<string, string> = {
      'Clear': '☀️',
      'Clouds': '☁️',
      'Rain': '🌧️',
      'Drizzle': '🌦️',
      'Thunderstorm': '⛈️',
      'Snow': '❄️',
      'Mist': '🌫️',
      'Fog': '🌫️',
      'Haze': '🌫️'
    };
    
    return emojiMap[condition] || '🌤️';
  }

  // Get weather description in German
  static getGermanDescription(condition: string): string {
    const descriptions: Record<string, string> = {
      'Clear': 'Sonnig',
      'Clouds': 'Bewölkt',
      'Rain': 'Regen',
      'Drizzle': 'Nieselregen',
      'Thunderstorm': 'Gewitter',
      'Snow': 'Schnee',
      'Mist': 'Nebel',
      'Fog': 'Nebel',
      'Haze': 'Dunst'
    };
    
    return descriptions[condition] || condition;
  }
}