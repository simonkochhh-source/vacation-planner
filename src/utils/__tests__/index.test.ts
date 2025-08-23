import {
  formatDate,
  formatTime,
  formatCurrency,
  getCategoryIcon,
  getCategoryLabel,
  calculateDistance,
  calculateDuration,
  getStatusColor,
  validateEmail,
  generateId,
  sortDestinations,
  filterDestinations,
  calculateTripStatistics
} from '../index';
import { DestinationCategory, DestinationStatus, SortField, SortDirection } from '../../types';

describe('Utility Functions', () => {
  describe('formatDate', () => {
    it('formats date correctly', () => {
      expect(formatDate('2024-01-15')).toBe('15. Januar 2024');
      expect(formatDate('2024-12-31')).toBe('31. Dezember 2024');
    });

    it('handles invalid dates gracefully', () => {
      expect(formatDate('invalid-date')).toBe('Ungültiges Datum');
      expect(formatDate('')).toBe('Ungültiges Datum');
    });

    it('formats with different locales', () => {
      expect(formatDate('2024-01-15', 'en-US')).toBe('January 15, 2024');
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

  describe('calculateDuration', () => {
    it('calculates duration correctly', () => {
      const start = new Date('2024-01-01T09:00:00');
      const end = new Date('2024-01-01T12:30:00');
      
      expect(calculateDuration(start, end)).toBe(210); // 3.5 hours = 210 minutes
    });

    it('handles same time', () => {
      const time = new Date('2024-01-01T09:00:00');
      expect(calculateDuration(time, time)).toBe(0);
    });

    it('handles overnight duration', () => {
      const start = new Date('2024-01-01T23:00:00');
      const end = new Date('2024-01-02T01:00:00');
      
      expect(calculateDuration(start, end)).toBe(120); // 2 hours = 120 minutes
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

  describe('validateEmail', () => {
    it('validates correct emails', () => {
      expect(validateEmail('test@example.com')).toBe(true);
      expect(validateEmail('user.name+tag@example.co.uk')).toBe(true);
      expect(validateEmail('x@y.z')).toBe(true);
    });

    it('rejects invalid emails', () => {
      expect(validateEmail('invalid')).toBe(false);
      expect(validateEmail('test@')).toBe(false);
      expect(validateEmail('@example.com')).toBe(false);
      expect(validateEmail('test..test@example.com')).toBe(false);
    });

    it('handles edge cases', () => {
      expect(validateEmail('')).toBe(false);
      expect(validateEmail('   ')).toBe(false);
    });
  });

  describe('generateId', () => {
    it('generates unique IDs', () => {
      const id1 = generateId();
      const id2 = generateId();
      
      expect(id1).not.toBe(id2);
      expect(typeof id1).toBe('string');
      expect(id1.length).toBeGreaterThan(0);
    });

    it('generates IDs with specified prefix', () => {
      const id = generateId('trip');
      expect(id).toMatch(/^trip-/);
    });
  });

  describe('sortDestinations', () => {
    const destinations = [
      {
        id: '1',
        name: 'Beta Destination',
        startDate: '2024-01-02',
        priority: 3,
        createdAt: '2024-01-01T10:00:00Z'
      },
      {
        id: '2',
        name: 'Alpha Destination',
        startDate: '2024-01-01',
        priority: 5,
        createdAt: '2024-01-01T09:00:00Z'
      },
      {
        id: '3',
        name: 'Gamma Destination',
        startDate: '2024-01-03',
        priority: 1,
        createdAt: '2024-01-01T11:00:00Z'
      }
    ] as any[];

    it('sorts by name ascending', () => {
      const sorted = sortDestinations(destinations, {
        field: SortField.NAME,
        direction: SortDirection.ASC
      });
      
      expect(sorted[0].name).toBe('Alpha Destination');
      expect(sorted[1].name).toBe('Beta Destination');
      expect(sorted[2].name).toBe('Gamma Destination');
    });

    it('sorts by date descending', () => {
      const sorted = sortDestinations(destinations, {
        field: SortField.START_DATE,
        direction: SortDirection.DESC
      });
      
      expect(sorted[0].startDate).toBe('2024-01-03');
      expect(sorted[1].startDate).toBe('2024-01-02');
      expect(sorted[2].startDate).toBe('2024-01-01');
    });

    it('sorts by priority ascending', () => {
      const sorted = sortDestinations(destinations, {
        field: SortField.PRIORITY,
        direction: SortDirection.ASC
      });
      
      expect(sorted[0].priority).toBe(1);
      expect(sorted[1].priority).toBe(3);
      expect(sorted[2].priority).toBe(5);
    });
  });

  describe('filterDestinations', () => {
    const destinations = [
      {
        id: '1',
        name: 'Museum Visit',
        category: DestinationCategory.MUSEUM,
        status: DestinationStatus.PLANNED,
        priority: 5,
        tags: ['culture', 'indoor'],
        startDate: '2024-01-15',
        budget: 50
      },
      {
        id: '2',
        name: 'Restaurant Dinner',
        category: DestinationCategory.RESTAURANT,
        status: DestinationStatus.VISITED,
        priority: 3,
        tags: ['food', 'evening'],
        startDate: '2024-01-20',
        budget: 80
      },
      {
        id: '3',
        name: 'Park Walk',
        category: DestinationCategory.NATURE,
        status: DestinationStatus.PLANNED,
        priority: 2,
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

    it('filters by priority range', () => {
      const filtered = filterDestinations(destinations, {
        priority: [3, 5]
      });
      
      expect(filtered).toHaveLength(2);
      expect(filtered.map(d => d.priority)).toEqual([5, 3]);
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

  describe('calculateTripStatistics', () => {
    const destinations = [
      {
        status: DestinationStatus.PLANNED,
        category: DestinationCategory.MUSEUM,
        budget: 50,
        actualCost: 45,
        rating: 4,
        duration: 180
      },
      {
        status: DestinationStatus.VISITED,
        category: DestinationCategory.RESTAURANT,
        budget: 80,
        actualCost: 85,
        rating: 5,
        duration: 90
      },
      {
        status: DestinationStatus.SKIPPED,
        category: DestinationCategory.NATURE,
        budget: 0,
        actualCost: 0,
        duration: 120
      }
    ] as any[];

    it('calculates statistics correctly', () => {
      const stats = calculateTripStatistics(destinations);
      
      expect(stats.totalDestinations).toBe(3);
      expect(stats.visitedDestinations).toBe(1);
      expect(stats.plannedDestinations).toBe(1);
      expect(stats.skippedDestinations).toBe(1);
      expect(stats.totalBudget).toBe(130);
      expect(stats.actualCost).toBe(130);
      expect(stats.averageRating).toBe(4.5);
      expect(stats.totalDuration).toBe(390);
    });

    it('handles empty destinations array', () => {
      const stats = calculateTripStatistics([]);
      
      expect(stats.totalDestinations).toBe(0);
      expect(stats.visitedDestinations).toBe(0);
      expect(stats.plannedDestinations).toBe(0);
      expect(stats.skippedDestinations).toBe(0);
      expect(stats.totalBudget).toBe(0);
      expect(stats.actualCost).toBe(0);
      expect(stats.averageRating).toBe(0);
      expect(stats.totalDuration).toBe(0);
    });

    it('calculates category counts correctly', () => {
      const stats = calculateTripStatistics(destinations);
      
      expect(stats.categoriesCount[DestinationCategory.MUSEUM]).toBe(1);
      expect(stats.categoriesCount[DestinationCategory.RESTAURANT]).toBe(1);
      expect(stats.categoriesCount[DestinationCategory.NATURE]).toBe(1);
      expect(stats.categoriesCount[DestinationCategory.HOTEL]).toBe(0);
    });
  });
});