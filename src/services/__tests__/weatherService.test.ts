import { WeatherService } from '../weatherService';

// Mock fetch globally
global.fetch = jest.fn();

describe('WeatherService', () => {
  const mockFetch = fetch as jest.MockedFunction<typeof fetch>;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getWeatherByCoordinates', () => {
    it('fetches weather data successfully', async () => {
      const mockWeatherResponse = {
        main: {
          temp: 22.5,
          humidity: 65
        },
        weather: [
          {
            main: 'Clear',
            description: 'clear sky',
            icon: '01d'
          }
        ],
        wind: {
          speed: 3.5
        }
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockWeatherResponse)
      } as Response);

      const result = await WeatherService.getWeatherByCoordinates(50.0, 10.0);

      expect(result).toEqual({
        temperature: 23, // Rounded
        condition: 'Clear',
        humidity: 65,
        windSpeed: 13, // Converted from m/s to km/h and rounded
        icon: '01d',
        description: 'clear sky'
      });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('lat=50&lon=10')
      );
    });

    it('handles API errors gracefully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found'
      } as Response);

      await expect(
        WeatherService.getWeatherByCoordinates(50.0, 10.0)
      ).rejects.toThrow('Weather API error: 404 Not Found');
    });

    it('handles network errors gracefully', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      await expect(
        WeatherService.getWeatherByCoordinates(50.0, 10.0)
      ).rejects.toThrow('Network error');
    });

    it('handles missing weather data', async () => {
      const mockWeatherResponse = {
        main: {
          temp: 22.5
          // Missing humidity
        },
        weather: [
          {
            main: 'Clear'
            // Missing description and icon
          }
        ]
        // Missing wind data
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockWeatherResponse)
      } as Response);

      const result = await WeatherService.getWeatherByCoordinates(50.0, 10.0);

      expect(result).toEqual({
        temperature: 23,
        condition: 'Clear',
        humidity: undefined,
        windSpeed: undefined,
        icon: undefined,
        description: undefined
      });
    });

    it('uses correct API key from environment', async () => {
      const originalEnv = process.env.REACT_APP_OPENWEATHER_API_KEY;
      process.env.REACT_APP_OPENWEATHER_API_KEY = 'test-api-key';

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          main: { temp: 20 },
          weather: [{ main: 'Sunny' }]
        })
      } as Response);

      await WeatherService.getWeatherByCoordinates(50.0, 10.0);

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('appid=test-api-key')
      );

      process.env.REACT_APP_OPENWEATHER_API_KEY = originalEnv;
    });
  });

  describe('getForecast', () => {
    it('fetches forecast data successfully', async () => {
      const mockForecastResponse = {
        list: [
          {
            dt: 1640995200, // 2022-01-01 00:00:00 UTC
            main: {
              temp: 20.5
            },
            weather: [
              {
                main: 'Sunny',
                icon: '01d'
              }
            ]
          },
          {
            dt: 1641081600, // 2022-01-02 00:00:00 UTC
            main: {
              temp: 18.2
            },
            weather: [
              {
                main: 'Cloudy',
                icon: '03d'
              }
            ]
          }
        ]
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockForecastResponse)
      } as Response);

      const result = await WeatherService.getForecast(50.0, 10.0, 2);

      expect(result).toEqual([
        {
          date: '2022-01-01',
          temperature: 21,
          condition: 'Sunny',
          icon: '01d'
        },
        {
          date: '2022-01-02',
          temperature: 18,
          condition: 'Cloudy',
          icon: '03d'
        }
      ]);
    });

    it('limits forecast to requested number of days', async () => {
      const mockForecastResponse = {
        list: Array.from({ length: 10 }, (_, i) => ({
          dt: 1640995200 + i * 86400, // Daily increments
          main: { temp: 20 + i },
          weather: [{ main: 'Test', icon: '01d' }]
        }))
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockForecastResponse)
      } as Response);

      const result = await WeatherService.getForecast(50.0, 10.0, 3);

      expect(result).toHaveLength(3);
    });

    it('handles forecast API errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        statusText: 'Unauthorized'
      } as Response);

      await expect(
        WeatherService.getForecast(50.0, 10.0, 5)
      ).rejects.toThrow('Weather API error: 401 Unauthorized');
    });

    it('handles empty forecast list', async () => {
      const mockForecastResponse = {
        list: []
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockForecastResponse)
      } as Response);

      const result = await WeatherService.getForecast(50.0, 10.0, 5);

      expect(result).toEqual([]);
    });
  });

  describe('temperature conversion', () => {
    it('converts Kelvin to Celsius correctly', async () => {
      const mockWeatherResponse = {
        main: {
          temp: 295.15 // 22°C in Kelvin
        },
        weather: [{ main: 'Clear' }]
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockWeatherResponse)
      } as Response);

      const result = await WeatherService.getWeatherByCoordinates(50.0, 10.0);

      expect(result.temperature).toBe(22);
    });
  });

  describe('wind speed conversion', () => {
    it('converts m/s to km/h correctly', async () => {
      const mockWeatherResponse = {
        main: { temp: 295.15 },
        weather: [{ main: 'Clear' }],
        wind: {
          speed: 5.0 // 5 m/s = 18 km/h
        }
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockWeatherResponse)
      } as Response);

      const result = await WeatherService.getWeatherByCoordinates(50.0, 10.0);

      expect(result.windSpeed).toBe(18);
    });
  });

  describe('caching', () => {
    it('caches weather requests', async () => {
      const mockWeatherResponse = {
        main: { temp: 295.15 },
        weather: [{ main: 'Clear' }]
      };

      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockWeatherResponse)
      } as Response);

      // First request
      await WeatherService.getWeatherByCoordinates(50.0, 10.0);
      
      // Second request with same coordinates
      await WeatherService.getWeatherByCoordinates(50.0, 10.0);

      // Should only make one API call due to caching
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it('makes separate requests for different coordinates', async () => {
      const mockWeatherResponse = {
        main: { temp: 295.15 },
        weather: [{ main: 'Clear' }]
      };

      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockWeatherResponse)
      } as Response);

      // First request
      await WeatherService.getWeatherByCoordinates(50.0, 10.0);
      
      // Second request with different coordinates
      await WeatherService.getWeatherByCoordinates(51.0, 11.0);

      // Should make two API calls
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });
  });
});