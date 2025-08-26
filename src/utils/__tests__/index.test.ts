import {
  formatDate,
  formatTime,
  formatCurrency,
  getCategoryIcon,
  getCategoryLabel,
  calculateDistance,
  calculateDurationFromDates,
  getStatusColor,
  generateUUID,
  sortDestinations,
  filterDestinations
} from '../index';
import { DestinationCategory, DestinationStatus } from '../../types';

describe('Utility Functions', () => {
  describe('formatDate', () => {
    it('formats date correctly', () => {
      expect(formatDate('2024-01-15')).toBe('15.01.2024');
      expect(formatDate('2024-12-31')).toBe('31.12.2024');
    });
  });

  describe('formatTime', () => {
    it('formats time correctly', () => {
      expect(formatTime('09:30')).toBe('09:30');
      expect(formatTime('23:59')).toBe('23:59');
    });

    it('handles 12-hour format', () => {
      expect(formatTime('09:30', true)).toBe('9:30 AM');
      expect(formatTime('15:30', true)).toBe('3:30 PM');
      expect(formatTime('00:00', true)).toBe('12:00 AM');
      expect(formatTime('12:00', true)).toBe('12:00 PM');
    });

    it('handles invalid time gracefully', () => {
      expect(formatTime('invalid')).toBe('--:--');
      expect(formatTime('')).toBe('--:--');
    });
  });

  describe('formatCurrency', () => {
    it('formats currency correctly', () => {
      expect(formatCurrency(100)).toBe('€100');
      expect(formatCurrency(99.99)).toBe('€100');
      expect(formatCurrency(1000)).toBe('€1.000');
    });

    it('handles different currencies', () => {
      expect(formatCurrency(100, 'USD')).toBe('$100');
      expect(formatCurrency(100, 'GBP')).toBe('£100');
    });

    it('handles zero and negative amounts', () => {
      expect(formatCurrency(0)).toBe('€0');
      expect(formatCurrency(-50)).toBe('-€50');
    });
  });

  describe('getCategoryIcon', () => {
    it('returns correct icons for categories', () => {
      expect(getCategoryIcon(DestinationCategory.MUSEUM)).toBe('🏛️');
      expect(getCategoryIcon(DestinationCategory.RESTAURANT)).toBe('🍽️');
      expect(getCategoryIcon(DestinationCategory.HOTEL)).toBe('🏨');
      expect(getCategoryIcon(DestinationCategory.ATTRACTION)).toBe('🎯');
    });

    it('returns default icon for unknown category', () => {
      expect(getCategoryIcon('unknown' as any)).toBe('📍');
    });
  });

  describe('getCategoryLabel', () => {
    it('returns correct labels for categories', () => {
      expect(getCategoryLabel(DestinationCategory.MUSEUM)).toBe('Museum');
      expect(getCategoryLabel(DestinationCategory.RESTAURANT)).toBe('Restaurant');
      expect(getCategoryLabel(DestinationCategory.NATURE)).toBe('Natur');
    });

    it('returns category key for unknown category', () => {
      expect(getCategoryLabel('unknown' as any)).toBe('unknown');
    });
  });

  describe('calculateDistance', () => {
    it('calculates distance correctly using Haversine formula', () => {
      // Distance between Berlin and Munich (approximately 504 km)
      const berlin = { lat: 52.5200, lng: 13.4050 };
      const munich = { lat: 48.1351, lng: 11.5820 };
      
      const distance = calculateDistance(berlin, munich);
      expect(distance).toBeCloseTo(504, 0); // Allow for rounding
    });

    it('returns 0 for same coordinates', () => {
      const point = { lat: 50.0, lng: 10.0 };
      expect(calculateDistance(point, point)).toBe(0);
    });

    it('handles edge cases', () => {
      const northPole = { lat: 90, lng: 0 };
      const southPole = { lat: -90, lng: 0 };
      
      // Should return approximately half the Earth's circumference
      const distance = calculateDistance(northPole, southPole);
      expect(distance).toBeCloseTo(20015, 0);
    });
  });

  describe('calculateDurationFromDates', () => {
    it('calculates duration for different dates', () => {
      const startDate = '2024-01-01';
      const endDate = '2024-01-02';
      
      expect(calculateDurationFromDates(startDate, endDate)).toBe(1440); // 24 hours = 1440 minutes
    });

    it('returns default duration for same date', () => {
      const date = '2024-01-01';
      expect(calculateDurationFromDates(date, date, 120)).toBe(120);
    });

    it('uses default duration when not provided', () => {
      const date = '2024-01-01';
      expect(calculateDurationFromDates(date, date)).toBe(60);
    });
  });

  describe('getStatusColor', () => {
    it('returns correct colors for statuses', () => {
      expect(getStatusColor(DestinationStatus.PLANNED)).toBe('#3b82f6');
      expect(getStatusColor(DestinationStatus.VISITED)).toBe('#16a34a');
      expect(getStatusColor(DestinationStatus.SKIPPED)).toBe('#6b7280');
    });

    it('returns default color for unknown status', () => {
      expect(getStatusColor('unknown' as any)).toBe('#6b7280');
    });
  });

  describe('generateUUID', () => {
    it('generates unique UUIDs', () => {
      const id1 = generateUUID();
      const id2 = generateUUID();
      
      expect(id1).not.toBe(id2);
      expect(typeof id1).toBe('string');
      expect(id1.length).toBe(36); // UUID v4 length
      expect(id1).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
    });
  });

  describe('sortDestinations', () => {
    const destinations = [
      {
        id: '1',
        name: 'Beta Destination',
        startDate: '2024-01-02',
        createdAt: '2024-01-01T10:00:00Z'
      },
      {
        id: '2',
        name: 'Alpha Destination',
        startDate: '2024-01-01',
        createdAt: '2024-01-01T09:00:00Z'
      },
      {
        id: '3',
        name: 'Gamma Destination',
        startDate: '2024-01-03',
        createdAt: '2024-01-01T11:00:00Z'
      }
    ] as any[];

    it('sorts by name ascending', () => {
      const sorted = sortDestinations(destinations, 'name', 'asc');
      
      expect(sorted[0].name).toBe('Alpha Destination');
      expect(sorted[1].name).toBe('Beta Destination');
      expect(sorted[2].name).toBe('Gamma Destination');
    });

    it('sorts by date descending', () => {
      const sorted = sortDestinations(destinations, 'startDate', 'desc');
      
      expect(sorted[0].startDate).toBe('2024-01-03');
      expect(sorted[1].startDate).toBe('2024-01-02');
      expect(sorted[2].startDate).toBe('2024-01-01');
    });

  });

  describe('filterDestinations', () => {
    const destinations = [
      {
        id: '1',
        name: 'Museum Visit',
        category: DestinationCategory.MUSEUM,
        status: DestinationStatus.PLANNED,
        tags: ['culture', 'indoor'],
        startDate: '2024-01-15',
        budget: 50
      },
      {
        id: '2',
        name: 'Restaurant Dinner',
        category: DestinationCategory.RESTAURANT,
        status: DestinationStatus.VISITED,
        tags: ['food', 'evening'],
        startDate: '2024-01-20',
        budget: 80
      },
      {
        id: '3',
        name: 'Park Walk',
        category: DestinationCategory.NATURE,
        status: DestinationStatus.PLANNED,
        tags: ['outdoor', 'free'],
        startDate: '2024-01-25',
        budget: 0
      }
    ] as any[];

    it('filters by category', () => {
      const filtered = filterDestinations(destinations, {
        category: [DestinationCategory.MUSEUM]
      });
      
      expect(filtered).toHaveLength(1);
      expect(filtered[0].name).toBe('Museum Visit');
    });

    it('filters by status', () => {
      const filtered = filterDestinations(destinations, {
        status: [DestinationStatus.PLANNED]
      });
      
      expect(filtered).toHaveLength(2);
      expect(filtered.map(d => d.name)).toContain('Museum Visit');
      expect(filtered.map(d => d.name)).toContain('Park Walk');
    });


    it('filters by tags', () => {
      const filtered = filterDestinations(destinations, {
        tags: ['culture']
      });
      
      expect(filtered).toHaveLength(1);
      expect(filtered[0].name).toBe('Museum Visit');
    });

    it('filters by date range', () => {
      const filtered = filterDestinations(destinations, {
        dateRange: {
          start: '2024-01-18',
          end: '2024-01-22'
        }
      });
      
      expect(filtered).toHaveLength(1);
      expect(filtered[0].name).toBe('Restaurant Dinner');
    });

    it('filters by budget range', () => {
      const filtered = filterDestinations(destinations, {
        budgetRange: {
          min: 40,
          max: 60
        }
      });
      
      expect(filtered).toHaveLength(1);
      expect(filtered[0].name).toBe('Museum Visit');
    });

    it('applies multiple filters', () => {
      const filtered = filterDestinations(destinations, {
        category: [DestinationCategory.MUSEUM, DestinationCategory.NATURE],
        status: [DestinationStatus.PLANNED]
      });
      
      expect(filtered).toHaveLength(2);
      expect(filtered.map(d => d.name)).toContain('Museum Visit');
      expect(filtered.map(d => d.name)).toContain('Park Walk');
    });
  });

  // Note: calculateTripStatistics tests removed as the function is not available in utils
});