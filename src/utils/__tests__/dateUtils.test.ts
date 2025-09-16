import { 
  formatDate, 
  formatDateRange, 
  calculateDaysBetween, 
  isDateInRange,
  formatRelativeDate,
  getDateFromISOString,
  isValidDateString 
} from '../index';

describe('Date Utilities', () => {
  describe('formatDate', () => {
    test('should format date string correctly', () => {
      expect(formatDate('2025-09-15')).toBe('15.09.2025');
      expect(formatDate('2025-12-31')).toBe('31.12.2025');
      expect(formatDate('2025-01-01')).toBe('01.01.2025');
    });

    test('should handle different date formats', () => {
      expect(formatDate('2025-09-15T10:30:00Z')).toBe('15.09.2025');
      expect(formatDate('2025-09-15T00:00:00.000Z')).toBe('15.09.2025');
    });

    test('should handle invalid dates gracefully', () => {
      expect(formatDate('invalid-date')).toBe('Invalid Date');
      expect(formatDate('')).toBe('Invalid Date');
    });
  });

  describe('formatDateRange', () => {
    test('should format date range correctly', () => {
      expect(formatDateRange('2025-09-15', '2025-09-22'))
        .toBe('15.09.2025 - 22.09.2025');
    });

    test('should handle same start and end date', () => {
      expect(formatDateRange('2025-09-15', '2025-09-15'))
        .toBe('15.09.2025');
    });

    test('should handle cross-month date range', () => {
      expect(formatDateRange('2025-09-30', '2025-10-05'))
        .toBe('30.09.2025 - 05.10.2025');
    });

    test('should handle cross-year date range', () => {
      expect(formatDateRange('2025-12-30', '2026-01-05'))
        .toBe('30.12.2025 - 05.01.2026');
    });
  });

  describe('calculateDaysBetween', () => {
    test('should calculate days correctly', () => {
      expect(calculateDaysBetween('2025-09-15', '2025-09-22')).toBe(8); // inclusive
      expect(calculateDaysBetween('2025-09-15', '2025-09-15')).toBe(1); // same day
      expect(calculateDaysBetween('2025-09-15', '2025-09-16')).toBe(2); // consecutive days
    });

    test('should handle cross-month calculations', () => {
      expect(calculateDaysBetween('2025-09-30', '2025-10-02')).toBe(3);
    });

    test('should handle cross-year calculations', () => {
      expect(calculateDaysBetween('2025-12-30', '2026-01-02')).toBe(4);
    });

    test('should handle leap year calculations', () => {
      expect(calculateDaysBetween('2024-02-28', '2024-03-01')).toBe(3); // 2024 is leap year
      expect(calculateDaysBetween('2025-02-28', '2025-03-01')).toBe(2); // 2025 is not leap year
    });

    test('should handle invalid dates', () => {
      expect(calculateDaysBetween('invalid', '2025-09-15')).toBe(0);
      expect(calculateDaysBetween('2025-09-15', 'invalid')).toBe(0);
    });
  });

  describe('isDateInRange', () => {
    test('should check if date is in range correctly', () => {
      expect(isDateInRange('2025-09-18', '2025-09-15', '2025-09-22')).toBe(true);
      expect(isDateInRange('2025-09-15', '2025-09-15', '2025-09-22')).toBe(true); // start date
      expect(isDateInRange('2025-09-22', '2025-09-15', '2025-09-22')).toBe(true); // end date
    });

    test('should return false for dates outside range', () => {
      expect(isDateInRange('2025-09-14', '2025-09-15', '2025-09-22')).toBe(false);
      expect(isDateInRange('2025-09-23', '2025-09-15', '2025-09-22')).toBe(false);
    });

    test('should handle invalid dates', () => {
      expect(isDateInRange('invalid', '2025-09-15', '2025-09-22')).toBe(false);
      expect(isDateInRange('2025-09-18', 'invalid', '2025-09-22')).toBe(false);
    });
  });

  describe('formatRelativeDate', () => {
    const now = new Date('2025-09-15T12:00:00Z');
    
    beforeAll(() => {
      jest.useFakeTimers();
      jest.setSystemTime(now);
    });

    afterAll(() => {
      jest.useRealTimers();
    });

    test('should format relative dates correctly', () => {
      expect(formatRelativeDate('2025-09-15')).toBe('Heute');
      expect(formatRelativeDate('2025-09-16')).toBe('Morgen');
      expect(formatRelativeDate('2025-09-14')).toBe('Gestern');
    });

    test('should format dates in current week', () => {
      expect(formatRelativeDate('2025-09-17')).toBe('in 2 Tagen');
      expect(formatRelativeDate('2025-09-13')).toBe('vor 2 Tagen');
    });

    test('should format distant dates', () => {
      expect(formatRelativeDate('2025-09-22')).toBe('in 1 Woche');
      expect(formatRelativeDate('2025-09-08')).toBe('vor 1 Woche');
      expect(formatRelativeDate('2025-10-15')).toBe('in 1 Monat');
      expect(formatRelativeDate('2025-08-15')).toBe('vor 1 Monat');
    });
  });

  describe('getDateFromISOString', () => {
    test('should extract date from ISO string', () => {
      expect(getDateFromISOString('2025-09-15T10:30:00Z')).toBe('2025-09-15');
      expect(getDateFromISOString('2025-12-31T23:59:59.999Z')).toBe('2025-12-31');
    });

    test('should handle date-only strings', () => {
      expect(getDateFromISOString('2025-09-15')).toBe('2025-09-15');
    });

    test('should handle invalid input', () => {
      expect(getDateFromISOString('invalid')).toBe('');
      expect(getDateFromISOString('')).toBe('');
    });
  });

  describe('isValidDateString', () => {
    test('should validate correct date strings', () => {
      expect(isValidDateString('2025-09-15')).toBe(true);
      expect(isValidDateString('2025-12-31')).toBe(true);
      expect(isValidDateString('2025-01-01')).toBe(true);
    });

    test('should validate ISO strings', () => {
      expect(isValidDateString('2025-09-15T10:30:00Z')).toBe(true);
      expect(isValidDateString('2025-09-15T00:00:00.000Z')).toBe(true);
    });

    test('should reject invalid date strings', () => {
      expect(isValidDateString('invalid-date')).toBe(false);
      expect(isValidDateString('')).toBe(false);
      expect(isValidDateString('2025-13-01')).toBe(false); // invalid month
      expect(isValidDateString('2025-09-32')).toBe(false); // invalid day
    });

    test('should handle edge cases', () => {
      expect(isValidDateString('2024-02-29')).toBe(true); // leap year
      expect(isValidDateString('2025-02-29')).toBe(false); // not leap year
      expect(isValidDateString('2025-04-31')).toBe(false); // April has 30 days
    });
  });

  describe('Date formatting edge cases', () => {
    test('should handle timezone differences correctly', () => {
      // Test that dates are formatted consistently regardless of timezone
      const utcDate = '2025-09-15T00:00:00Z';
      const localDate = '2025-09-15T23:59:59+09:00';
      
      expect(formatDate(utcDate)).toBe('15.09.2025');
      expect(formatDate(localDate)).toBe('15.09.2025');
    });

    test('should handle daylight saving time transitions', () => {
      // Test dates around DST transitions
      const springForward = '2025-03-30'; // EU DST start
      const fallBack = '2025-10-26'; // EU DST end
      
      expect(formatDate(springForward)).toBe('30.03.2025');
      expect(formatDate(fallBack)).toBe('26.10.2025');
    });
  });

  describe('Performance tests', () => {
    test('should handle large date ranges efficiently', () => {
      const start = performance.now();
      
      for (let i = 0; i < 1000; i++) {
        const date1 = `2025-01-${String(Math.floor(Math.random() * 28) + 1).padStart(2, '0')}`;
        const date2 = `2025-12-${String(Math.floor(Math.random() * 28) + 1).padStart(2, '0')}`;
        calculateDaysBetween(date1, date2);
      }
      
      const end = performance.now();
      expect(end - start).toBeLessThan(100); // Should complete in under 100ms
    });

    test('should format dates efficiently', () => {
      const start = performance.now();
      
      for (let i = 0; i < 1000; i++) {
        formatDate(`2025-09-${String(Math.floor(Math.random() * 28) + 1).padStart(2, '0')}`);
      }
      
      const end = performance.now();
      expect(end - start).toBeLessThan(50); // Should complete in under 50ms
    });
  });
});