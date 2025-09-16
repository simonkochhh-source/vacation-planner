import { supabaseService } from '../supabaseService';
import { createMockSupabaseClient, mockSuccessResponse, mockErrorResponse } from '../../test-utils/renderWithProviders';

// Mock the supabase client
const mockClient = createMockSupabaseClient();
jest.mock('../../lib/supabase', () => ({
  supabase: mockClient,
}));

describe('SupabaseService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Trip Operations', () => {
    const mockTrip = {
      id: 'trip-1',
      name: 'Test Trip',
      description: 'A test trip',
      startDate: '2025-09-15',
      endDate: '2025-09-22',
      budget: 1000,
      participants: ['user1'],
      status: 'planned',
    };

    describe('getTrips', () => {
      test('should fetch trips successfully', async () => {
        const mockResponse = mockSuccessResponse([mockTrip]);
        mockClient.from.mockReturnValue({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              order: jest.fn().mockResolvedValue(mockResponse),
            }),
          }),
        });

        const result = await supabaseService.getTrips();

        expect(mockClient.from).toHaveBeenCalledWith('trips');
        expect(result).toEqual([mockTrip]);
      });

      test('should handle errors when fetching trips', async () => {
        const mockResponse = mockErrorResponse('Failed to fetch trips');
        mockClient.from.mockReturnValue({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              order: jest.fn().mockResolvedValue(mockResponse),
            }),
          }),
        });

        await expect(supabaseService.getTrips()).rejects.toThrow('Failed to fetch trips');
      });

      test('should handle network errors', async () => {
        mockClient.from.mockReturnValue({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              order: jest.fn().mockRejectedValue(new Error('Network error')),
            }),
          }),
        });

        await expect(supabaseService.getTrips()).rejects.toThrow('Network error');
      });
    });

    describe('createTrip', () => {
      test('should create trip successfully', async () => {
        const mockResponse = mockSuccessResponse([mockTrip]);
        mockClient.from.mockReturnValue({
          insert: jest.fn().mockReturnValue({
            select: jest.fn().mockResolvedValue(mockResponse),
          }),
        });

        const result = await supabaseService.createTrip(mockTrip);

        expect(mockClient.from).toHaveBeenCalledWith('trips');
        expect(result).toEqual(mockTrip);
      });

      test('should handle creation errors', async () => {
        const mockResponse = mockErrorResponse('Failed to create trip');
        mockClient.from.mockReturnValue({
          insert: jest.fn().mockReturnValue({
            select: jest.fn().mockResolvedValue(mockResponse),
          }),
        });

        await expect(supabaseService.createTrip(mockTrip)).rejects.toThrow('Failed to create trip');
      });

      test('should validate required fields', async () => {
        const invalidTrip = { ...mockTrip, name: '' };

        await expect(supabaseService.createTrip(invalidTrip)).rejects.toThrow('Trip name is required');
      });

      test('should validate date range', async () => {
        const invalidTrip = { 
          ...mockTrip, 
          startDate: '2025-09-22', 
          endDate: '2025-09-15' 
        };

        await expect(supabaseService.createTrip(invalidTrip)).rejects.toThrow('End date must be after start date');
      });
    });

    describe('updateTrip', () => {
      test('should update trip successfully', async () => {
        const updatedTrip = { ...mockTrip, name: 'Updated Trip' };
        const mockResponse = mockSuccessResponse([updatedTrip]);
        
        mockClient.from.mockReturnValue({
          update: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              select: jest.fn().mockResolvedValue(mockResponse),
            }),
          }),
        });

        const result = await supabaseService.updateTrip(updatedTrip);

        expect(mockClient.from).toHaveBeenCalledWith('trips');
        expect(result).toEqual(updatedTrip);
      });

      test('should handle update errors', async () => {
        const mockResponse = mockErrorResponse('Failed to update trip');
        mockClient.from.mockReturnValue({
          update: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              select: jest.fn().mockResolvedValue(mockResponse),
            }),
          }),
        });

        await expect(supabaseService.updateTrip(mockTrip)).rejects.toThrow('Failed to update trip');
      });
    });

    describe('deleteTrip', () => {
      test('should delete trip successfully', async () => {
        const mockResponse = mockSuccessResponse([]);
        mockClient.from.mockReturnValue({
          delete: jest.fn().mockReturnValue({
            eq: jest.fn().mockResolvedValue(mockResponse),
          }),
        });

        await supabaseService.deleteTrip('trip-1');

        expect(mockClient.from).toHaveBeenCalledWith('trips');
      });

      test('should handle deletion errors', async () => {
        const mockResponse = mockErrorResponse('Failed to delete trip');
        mockClient.from.mockReturnValue({
          delete: jest.fn().mockReturnValue({
            eq: jest.fn().mockResolvedValue(mockResponse),
          }),
        });

        await expect(supabaseService.deleteTrip('trip-1')).rejects.toThrow('Failed to delete trip');
      });
    });
  });

  describe('Destination Operations', () => {
    const mockDestination = {
      id: 'dest-1',
      tripId: 'trip-1',
      name: 'Eiffel Tower',
      location: 'Paris, France',
      category: 'attraction',
      startDate: '2025-09-15',
      endDate: '2025-09-15',
      budget: 50,
      notes: 'Must see',
      status: 'planned',
      sortOrder: 0,
    };

    describe('getDestinations', () => {
      test('should fetch all destinations successfully', async () => {
        const mockResponse = mockSuccessResponse([mockDestination]);
        mockClient.from.mockReturnValue({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              order: jest.fn().mockResolvedValue(mockResponse),
            }),
          }),
        });

        const result = await supabaseService.getDestinations();

        expect(mockClient.from).toHaveBeenCalledWith('destinations');
        expect(result).toEqual([mockDestination]);
      });

      test('should fetch destinations for specific trip', async () => {
        const mockResponse = mockSuccessResponse([mockDestination]);
        mockClient.from.mockReturnValue({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                order: jest.fn().mockResolvedValue(mockResponse),
              }),
            }),
          }),
        });

        const result = await supabaseService.getDestinationsForTrip('trip-1');

        expect(result).toEqual([mockDestination]);
      });
    });

    describe('createDestination', () => {
      test('should create destination successfully', async () => {
        const mockResponse = mockSuccessResponse([mockDestination]);
        mockClient.from.mockReturnValue({
          insert: jest.fn().mockReturnValue({
            select: jest.fn().mockResolvedValue(mockResponse),
          }),
        });

        const result = await supabaseService.createDestination(mockDestination);

        expect(mockClient.from).toHaveBeenCalledWith('destinations');
        expect(result).toEqual(mockDestination);
      });

      test('should validate required fields', async () => {
        const invalidDestination = { ...mockDestination, name: '' };

        await expect(supabaseService.createDestination(invalidDestination))
          .rejects.toThrow('Destination name is required');
      });

      test('should validate category', async () => {
        const invalidDestination = { ...mockDestination, category: 'invalid' };

        await expect(supabaseService.createDestination(invalidDestination))
          .rejects.toThrow('Invalid destination category');
      });
    });

    describe('updateDestination', () => {
      test('should update destination successfully', async () => {
        const updatedDestination = { ...mockDestination, name: 'Updated Destination' };
        const mockResponse = mockSuccessResponse([updatedDestination]);
        
        mockClient.from.mockReturnValue({
          update: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              select: jest.fn().mockResolvedValue(mockResponse),
            }),
          }),
        });

        const result = await supabaseService.updateDestination(updatedDestination);

        expect(result).toEqual(updatedDestination);
      });
    });

    describe('deleteDestination', () => {
      test('should delete destination successfully', async () => {
        const mockResponse = mockSuccessResponse([]);
        mockClient.from.mockReturnValue({
          delete: jest.fn().mockReturnValue({
            eq: jest.fn().mockResolvedValue(mockResponse),
          }),
        });

        await supabaseService.deleteDestination('dest-1');

        expect(mockClient.from).toHaveBeenCalledWith('destinations');
      });
    });

    describe('updateDestinationOrder', () => {
      test('should update destination order successfully', async () => {
        const destinations = [
          { ...mockDestination, id: 'dest-1', sortOrder: 0 },
          { ...mockDestination, id: 'dest-2', sortOrder: 1 },
        ];

        const mockResponse = mockSuccessResponse(destinations);
        mockClient.from.mockReturnValue({
          update: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              select: jest.fn().mockResolvedValue(mockResponse),
            }),
          }),
        });

        const result = await supabaseService.updateDestinationOrder(destinations);

        expect(result).toEqual(destinations);
        expect(mockClient.from).toHaveBeenCalledWith('destinations');
      });

      test('should handle empty destination list', async () => {
        const result = await supabaseService.updateDestinationOrder([]);
        expect(result).toEqual([]);
      });
    });
  });

  describe('Search and Filtering', () => {
    test('should search trips by name', async () => {
      const mockTrips = [
        { id: 'trip-1', name: 'Paris Trip', status: 'planned' },
        { id: 'trip-2', name: 'Tokyo Adventure', status: 'active' },
      ];

      const mockResponse = mockSuccessResponse(mockTrips);
      mockClient.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            ilike: jest.fn().mockReturnValue({
              order: jest.fn().mockResolvedValue(mockResponse),
            }),
          }),
        }),
      });

      const result = await supabaseService.searchTrips('Paris');

      expect(result).toEqual(mockTrips);
    });

    test('should filter destinations by category', async () => {
      const mockDestinations = [
        { id: 'dest-1', category: 'restaurant', name: 'Restaurant A' },
        { id: 'dest-2', category: 'museum', name: 'Museum B' },
      ];

      const mockResponse = mockSuccessResponse(mockDestinations);
      mockClient.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              order: jest.fn().mockResolvedValue(mockResponse),
            }),
          }),
        }),
      });

      const result = await supabaseService.getDestinationsByCategory('restaurant');

      expect(result).toEqual(mockDestinations);
    });
  });

  describe('Error Handling', () => {
    test('should handle authentication errors', async () => {
      const authError = { message: 'User not authenticated', code: 'UNAUTHORIZED' };
      mockClient.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({ data: null, error: authError }),
        }),
      });

      await expect(supabaseService.getTrips()).rejects.toThrow('User not authenticated');
    });

    test('should handle network timeouts', async () => {
      mockClient.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockRejectedValue(new Error('Request timeout')),
        }),
      });

      await expect(supabaseService.getTrips()).rejects.toThrow('Request timeout');
    });

    test('should handle rate limiting', async () => {
      const rateLimitError = { message: 'Too many requests', code: 'RATE_LIMIT' };
      mockClient.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({ data: null, error: rateLimitError }),
        }),
      });

      await expect(supabaseService.getTrips()).rejects.toThrow('Too many requests');
    });
  });

  describe('Data Validation', () => {
    test('should validate trip data before submission', async () => {
      const invalidTrip = {
        id: 'trip-1',
        name: '', // Invalid: empty name
        startDate: 'invalid-date', // Invalid: bad date format
        endDate: '2025-09-15',
        status: 'invalid-status', // Invalid: bad status
      };

      await expect(supabaseService.createTrip(invalidTrip)).rejects.toThrow();
    });

    test('should validate destination coordinates', async () => {
      const destinationWithInvalidCoords = {
        id: 'dest-1',
        tripId: 'trip-1',
        name: 'Test Location',
        location: 'Test',
        category: 'restaurant',
        startDate: '2025-09-15',
        endDate: '2025-09-15',
        coordinates: {
          lat: 200, // Invalid: outside valid range
          lng: -200, // Invalid: outside valid range
        },
        sortOrder: 0,
      };

      await expect(supabaseService.createDestination(destinationWithInvalidCoords))
        .rejects.toThrow('Invalid coordinates');
    });
  });

  describe('Performance', () => {
    test('should handle large datasets efficiently', async () => {
      const largeDataset = Array.from({ length: 1000 }, (_, i) => ({
        id: `trip-${i}`,
        name: `Trip ${i}`,
        startDate: '2025-09-15',
        endDate: '2025-09-22',
        status: 'planned',
      }));

      const mockResponse = mockSuccessResponse(largeDataset);
      mockClient.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            order: jest.fn().mockResolvedValue(mockResponse),
          }),
        }),
      });

      const start = performance.now();
      const result = await supabaseService.getTrips();
      const end = performance.now();

      expect(result).toHaveLength(1000);
      expect(end - start).toBeLessThan(100); // Should complete in under 100ms
    });

    test('should implement proper pagination', async () => {
      const mockResponse = mockSuccessResponse([]);
      mockClient.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            range: jest.fn().mockReturnValue({
              order: jest.fn().mockResolvedValue(mockResponse),
            }),
          }),
        }),
      });

      await supabaseService.getTrips(0, 10); // page 0, 10 items

      const mockChain = mockClient.from().select().eq().range();
      expect(mockChain.range).toHaveBeenCalledWith(0, 9); // Supabase uses inclusive ranges
    });
  });
});