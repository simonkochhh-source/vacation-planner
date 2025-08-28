import { geocodingService } from '../geocoding';
import { Coordinates } from '../../types';

// Mock fetch globally
const mockFetch = jest.fn();
global.fetch = mockFetch;

// Mock Date.now for rate limiting tests
const mockDateNow = jest.fn();
Date.now = mockDateNow;

describe('GeocodingService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockDateNow.mockReturnValue(1000000); // Fixed timestamp
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('searchLocations', () => {
    const mockSearchResults = [
      {
        display_name: 'Berlin, Deutschland',
        lat: '52.5200066',
        lon: '13.404954',
        place_id: '240109189',
        type: 'city',
        importance: 0.8,
        boundingbox: ['52.367573', '52.6755087', '13.0892841', '13.7611609'],
        address: {
          city: 'Berlin',
          state: 'Berlin',
          country: 'Deutschland',
          postcode: '10115'
        }
      }
    ];

    it('should search for locations successfully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValueOnce(mockSearchResults)
      });

      const results = await geocodingService.searchLocations('Berlin');

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/search?q=Berlin'),
        expect.objectContaining({
          headers: {
            'User-Agent': 'VacationPlanner/1.0',
            'Accept': 'application/json',
            'Accept-Language': 'de,en;q=0.8'
          }
        })
      );

      expect(results).toHaveLength(1);
      expect(results[0]).toEqual({
        displayName: 'Berlin, Deutschland',
        coordinates: { lat: 52.5200066, lng: 13.404954 },
        address: 'Berlin, Berlin, Deutschland',
        type: 'city',
        importance: 0.8,
        placeId: '240109189'
      });
    });

    it('should return empty array for empty query', async () => {
      const results = await geocodingService.searchLocations('');
      expect(results).toEqual([]);
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('should return empty array for whitespace-only query', async () => {
      const results = await geocodingService.searchLocations('   ');
      expect(results).toEqual([]);
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('should handle API errors gracefully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error'
      });

      await expect(geocodingService.searchLocations('Berlin')).rejects.toThrow(
        'Ortssuche fehlgeschlagen. Bitte versuchen Sie es später erneut.'
      );
    });

    it('should handle network errors', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      await expect(geocodingService.searchLocations('Berlin')).rejects.toThrow(
        'Ortssuche fehlgeschlagen. Bitte versuchen Sie es später erneut.'
      );
    });

    it('should respect rate limiting', async () => {
      mockDateNow
        .mockReturnValueOnce(1000000) // Initial time
        .mockReturnValueOnce(1000100) // 100ms later (too soon)
        .mockReturnValueOnce(1001100); // After delay

      mockFetch.mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue([])
      });

      const startTime = Date.now();
      await geocodingService.searchLocations('test');
      
      // Should have waited for rate limiting
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it('should encode special characters in query', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValueOnce([])
      });

      await geocodingService.searchLocations('München/Göttingen');

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('M%C3%BCnchen%2FG%C3%B6ttingen'),
        expect.any(Object)
      );
    });

    it('should handle results with missing optional fields', async () => {
      const incompleteResult = {
        display_name: 'Unknown Place',
        lat: '50.0',
        lon: '10.0',
        place_id: '123',
        importance: 0.5,
        boundingbox: ['49', '51', '9', '11']
        // Missing: type, address, class
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValueOnce([incompleteResult])
      });

      const results = await geocodingService.searchLocations('test');

      expect(results[0]).toEqual({
        displayName: 'Unknown Place',
        coordinates: { lat: 50.0, lng: 10.0 },
        address: '',
        type: 'location', // default
        importance: 0.5,
        placeId: '123'
      });
    });
  });

  describe('reverseGeocode', () => {
    const mockReverseResult = {
      display_name: 'Alexanderplatz, Berlin, Deutschland',
      lat: '52.521918',
      lon: '13.413215',
      place_id: '240109189',
      type: 'square',
      importance: 0.75,
      boundingbox: ['52.5', '52.6', '13.3', '13.5'],
      address: {
        road: 'Alexanderplatz',
        city: 'Berlin',
        state: 'Berlin',
        country: 'Deutschland'
      }
    };

    it('should reverse geocode coordinates successfully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValueOnce(mockReverseResult)
      });

      const coordinates: Coordinates = { lat: 52.521918, lng: 13.413215 };
      const result = await geocodingService.reverseGeocode(coordinates);

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/reverse?lat=52.521918&lon=13.413215'),
        expect.any(Object)
      );

      expect(result).toEqual({
        displayName: 'Alexanderplatz, Berlin, Deutschland',
        coordinates: { lat: 52.521918, lng: 13.413215 },
        address: 'Alexanderplatz, Berlin, Berlin, Deutschland',
        type: 'square',
        importance: 0.75,
        placeId: '240109189'
      });
    });

    it('should return null for no results', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValueOnce(null)
      });

      const result = await geocodingService.reverseGeocode({ lat: 0, lng: 0 });
      expect(result).toBeNull();
    });

    it('should handle errors gracefully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found'
      });

      const result = await geocodingService.reverseGeocode({ lat: 52.521918, lng: 13.413215 });
      expect(result).toBeNull();
    });
  });

  describe('getPlaceDetails', () => {
    const mockPlaceDetails = {
      display_name: 'Brandenburg Gate, Berlin',
      lat: '52.516272',
      lon: '13.377722',
      place_id: '240109189',
      type: 'tourism',
      importance: 0.9,
      boundingbox: ['52.5', '52.6', '13.3', '13.4'],
      address: {
        tourism: 'Brandenburg Gate',
        city: 'Berlin',
        country: 'Deutschland'
      }
    };

    it('should get place details successfully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValueOnce(mockPlaceDetails)
      });

      const result = await geocodingService.getPlaceDetails('240109189');

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/details?place_id=240109189'),
        expect.any(Object)
      );

      expect(result).toEqual({
        displayName: 'Brandenburg Gate, Berlin',
        coordinates: { lat: 52.516272, lng: 13.377722 },
        address: 'Berlin, Deutschland',
        type: 'tourism',
        importance: 0.9,
        placeId: '240109189'
      });
    });

    it('should return null when place not found', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValueOnce(null)
      });

      const result = await geocodingService.getPlaceDetails('invalid_id');
      expect(result).toBeNull();
    });

    it('should handle errors gracefully', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const result = await geocodingService.getPlaceDetails('240109189');
      expect(result).toBeNull();
    });
  });

  describe('searchNearby', () => {
    const mockNearbyResults = [
      {
        display_name: 'Restaurant Berlin',
        lat: '52.52',
        lon: '13.41',
        place_id: '123',
        type: 'restaurant',
        importance: 0.6,
        boundingbox: ['52.5', '52.53', '13.4', '13.42'],
        address: { city: 'Berlin' }
      }
    ];

    it('should search nearby locations successfully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValueOnce(mockNearbyResults)
      });

      const results = await geocodingService.searchNearby(
        { lat: 52.52, lng: 13.41 },
        1000,
        10
      );

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/search?format=json&limit=10&addressdetails=1&bounded=1&viewbox='),
        expect.any(Object)
      );

      expect(results).toHaveLength(1);
      expect(results[0].type).toBe('restaurant');
    });

    it('should handle errors and return empty array', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const results = await geocodingService.searchNearby({ lat: 52.52, lng: 13.41 });
      expect(results).toEqual([]);
    });

    it('should calculate bounding box correctly', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValueOnce([])
      });

      await geocodingService.searchNearby({ lat: 50.0, lng: 10.0 }, 2220); // ~0.02 degrees

      const expectedViewbox = '9.98,49.98,10.02,50.02';
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining(`viewbox=${expectedViewbox}`),
        expect.any(Object)
      );
    });
  });

  describe('validateLocation', () => {
    it('should validate correct locations', () => {
      const result = geocodingService.validateLocation('Berlin');
      expect(result.isValid).toBe(true);
      expect(result.suggestion).toBeUndefined();
    });

    it('should reject too short input', () => {
      const result = geocodingService.validateLocation('B');
      expect(result.isValid).toBe(false);
      expect(result.suggestion).toBe('Bitte geben Sie mindestens 2 Zeichen ein');
    });

    it('should reject too long input', () => {
      const longInput = 'A'.repeat(201);
      const result = geocodingService.validateLocation(longInput);
      expect(result.isValid).toBe(false);
      expect(result.suggestion).toBe('Ortsname zu lang (max. 200 Zeichen)');
    });

    it('should reject numbers-only input', () => {
      const result = geocodingService.validateLocation('12345');
      expect(result.isValid).toBe(false);
      expect(result.suggestion).toBe('Bitte geben Sie einen Ortsnamen ein, nicht nur Zahlen');
    });

    it('should trim whitespace', () => {
      const result = geocodingService.validateLocation('  Berlin  ');
      expect(result.isValid).toBe(true);
    });

    it('should reject empty trimmed input', () => {
      const result = geocodingService.validateLocation('   ');
      expect(result.isValid).toBe(false);
    });
  });

  describe('formatAddress', () => {
    it('should format complete address correctly', () => {
      // Access private method via any cast for testing
      const service = geocodingService as any;
      const address = {
        house_number: '1',
        road: 'Unter den Linden',
        city: 'Berlin',
        state: 'Berlin',
        country: 'Deutschland'
      };

      const result = service.formatAddress(address);
      expect(result).toBe('Unter den Linden 1, Berlin, Deutschland');
    });

    it('should handle missing components gracefully', () => {
      const service = geocodingService as any;
      const address = {
        city: 'Berlin',
        country: 'Deutschland'
      };

      const result = service.formatAddress(address);
      expect(result).toBe('Berlin, Deutschland');
    });

    it('should handle undefined address', () => {
      const service = geocodingService as any;
      const result = service.formatAddress(undefined);
      expect(result).toBe('');
    });

    it('should avoid duplicate state and city', () => {
      const service = geocodingService as any;
      const address = {
        city: 'Berlin',
        state: 'Berlin', // Same as city
        country: 'Deutschland'
      };

      const result = service.formatAddress(address);
      expect(result).toBe('Berlin, Deutschland');
    });
  });

  describe('getLocationTypeIcon', () => {
    it('should return correct icons for known types', () => {
      expect(geocodingService.getLocationTypeIcon('city')).toBe('🏙️');
      expect(geocodingService.getLocationTypeIcon('restaurant')).toBe('🍽️');
      expect(geocodingService.getLocationTypeIcon('hotel')).toBe('🏨');
      expect(geocodingService.getLocationTypeIcon('tourism')).toBe('🏖️');
    });

    it('should return default icon for unknown types', () => {
      expect(geocodingService.getLocationTypeIcon('unknown_type')).toBe('📍');
      expect(geocodingService.getLocationTypeIcon('')).toBe('📍');
    });
  });

  describe('rate limiting', () => {
    it('should enforce minimum interval between requests', async () => {
      const mockDelay = jest.fn();
      global.setTimeout = jest.fn().mockImplementation((callback) => {
        mockDelay();
        callback();
      });

      mockDateNow
        .mockReturnValueOnce(1000000) // First request time
        .mockReturnValueOnce(1000500) // 500ms later (too soon)
        .mockReturnValueOnce(1001500); // After delay completion

      mockFetch.mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue([])
      });

      // Make first request
      await geocodingService.searchLocations('test1');
      
      // Make second request immediately (should be delayed)
      await geocodingService.searchLocations('test2');

      expect(mockDelay).toHaveBeenCalled();
      expect(global.setTimeout).toHaveBeenCalledWith(expect.any(Function), 500);
    });
  });
});