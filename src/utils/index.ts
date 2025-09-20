import { format, parseISO, addDays, differenceInMinutes, isWithinInterval } from 'date-fns';
import { Destination, UUID, Coordinates, DestinationCategory, DestinationStatus } from '../types';

// Date and Time utilities
export const formatDate = (dateString: string | null | undefined): string => {
  if (!dateString) return '';
  return format(parseISO(dateString), 'dd.MM.yyyy');
};

export const formatTime = (timeString: string): string => {
  return timeString;
};

export const formatDateTimeWithDuration = (dateString: string | null | undefined, duration: number): string => {
  if (!dateString) return `(${Math.floor(duration / 60)}h ${duration % 60}min)`;
  const date = parseISO(dateString);
  const hours = Math.floor(duration / 60);
  const minutes = duration % 60;
  return `${format(date, 'dd.MM.yyyy')} (${hours}h ${minutes}min)`;
};

export const getCurrentDateString = (): string => {
  return format(new Date(), 'yyyy-MM-dd');
};

export const getCurrentTimeString = (): string => {
  return format(new Date(), 'HH:mm');
};

export const addDaysToDate = (dateString: string, days: number): string => {
  return format(addDays(parseISO(dateString), days), 'yyyy-MM-dd');
};

export const calculateDurationFromDates = (startDate: string, endDate: string, defaultDuration: number = 60): number => {
  // If end date is different from start date, calculate day difference in minutes
  if (startDate !== endDate) {
    const start = parseISO(startDate);
    const end = parseISO(endDate);
    return differenceInMinutes(end, start);
  }
  // If same date, return default duration
  return defaultDuration;
};

// UUID generator
export const generateUUID = (): UUID => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : ((r & 0x3) | 0x8);
    return v.toString(16);
  });
};

// Color utilities
export const getCategoryColor = (category: DestinationCategory): string => {
  const colors: Record<DestinationCategory, string> = {
    [DestinationCategory.MUSEUM]: '#8B5CF6',
    [DestinationCategory.RESTAURANT]: '#EF4444',
    [DestinationCategory.ATTRACTION]: '#F59E0B',
    [DestinationCategory.HOTEL]: '#3B82F6',
    [DestinationCategory.TRANSPORT]: '#6B7280',
    [DestinationCategory.NATURE]: '#10B981',
    [DestinationCategory.ENTERTAINMENT]: '#EC4899',
    [DestinationCategory.SHOPPING]: '#8B5CF6',
    [DestinationCategory.CULTURAL]: '#F97316',
    [DestinationCategory.SPORTS]: '#06B6D4',
    [DestinationCategory.OTHER]: '#6B7280'
  };
  return colors[category];
};

export const getStatusColor = (status: DestinationStatus): string => {
  const colors: Record<DestinationStatus, string> = {
    [DestinationStatus.PLANNED]: '#6B7280',
    [DestinationStatus.VISITED]: '#10B981',
    [DestinationStatus.SKIPPED]: '#EF4444',
    [DestinationStatus.IN_PROGRESS]: '#F59E0B'
  };
  return colors[status];
};

// Category utilities
export const getCategoryIcon = (category: DestinationCategory): string => {
  const icons: Record<DestinationCategory, string> = {
    [DestinationCategory.MUSEUM]: '🏛️',
    [DestinationCategory.RESTAURANT]: '🍽️',
    [DestinationCategory.ATTRACTION]: '🎢',
    [DestinationCategory.HOTEL]: '🏨',
    [DestinationCategory.TRANSPORT]: '🚗',
    [DestinationCategory.NATURE]: '🌳',
    [DestinationCategory.ENTERTAINMENT]: '🎭',
    [DestinationCategory.SHOPPING]: '🛍️',
    [DestinationCategory.CULTURAL]: '🎨',
    [DestinationCategory.SPORTS]: '⚽',
    [DestinationCategory.OTHER]: '📍'
  };
  return icons[category];
};

export const getCategoryLabel = (category: DestinationCategory): string => {
  const labels: Record<DestinationCategory, string> = {
    [DestinationCategory.MUSEUM]: 'Museum',
    [DestinationCategory.RESTAURANT]: 'Restaurant',
    [DestinationCategory.ATTRACTION]: 'Sehenswürdigkeit',
    [DestinationCategory.HOTEL]: 'Unterkunft',
    [DestinationCategory.TRANSPORT]: 'Transport',
    [DestinationCategory.NATURE]: 'Natur',
    [DestinationCategory.ENTERTAINMENT]: 'Unterhaltung',
    [DestinationCategory.SHOPPING]: 'Shopping',
    [DestinationCategory.CULTURAL]: 'Kultur',
    [DestinationCategory.SPORTS]: 'Sport',
    [DestinationCategory.OTHER]: 'Sonstiges'
  };
  return labels[category];
};

// Coordinate utilities
export const calculateDistance = (coord1: Coordinates, coord2: Coordinates): number => {
  const R = 6371; // Earth's radius in kilometers
  const dLat = (coord2.lat - coord1.lat) * Math.PI / 180;
  const dLon = (coord2.lng - coord1.lng) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(coord1.lat * Math.PI / 180) * Math.cos(coord2.lat * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c; // Distance in kilometers
};

export const getCenterCoordinates = (destinations: Destination[]): Coordinates | null => {
  const validDestinations = destinations.filter(d => d.coordinates);
  if (validDestinations.length === 0) return null;

  const totalLat = validDestinations.reduce((sum, d) => sum + d.coordinates!.lat, 0);
  const totalLng = validDestinations.reduce((sum, d) => sum + d.coordinates!.lng, 0);

  return {
    lat: totalLat / validDestinations.length,
    lng: totalLng / validDestinations.length
  };
};

// Sorting utilities
export const sortDestinations = (destinations: Destination[], field: string, direction: 'asc' | 'desc'): Destination[] => {
  return [...destinations].sort((a, b) => {
    let aValue: any = a[field as keyof Destination];
    let bValue: any = b[field as keyof Destination];

    // Handle different data types
    if (field === 'startDate' || field === 'endDate') {
      aValue = new Date(aValue);
      bValue = new Date(bValue);
    } else if (typeof aValue === 'string') {
      aValue = aValue.toLowerCase();
      bValue = bValue.toLowerCase();
    }

    if (aValue < bValue) return direction === 'asc' ? -1 : 1;
    if (aValue > bValue) return direction === 'asc' ? 1 : -1;
    return 0;
  });
};

// Filter utilities
export const filterDestinations = (destinations: Destination[], filters: any): Destination[] => {
  return destinations.filter(destination => {
    // Category filter
    if (filters.category && filters.category.length > 0) {
      if (!filters.category.includes(destination.category)) return false;
    }

    // Status filter
    if (filters.status && filters.status.length > 0) {
      if (!filters.status.includes(destination.status)) return false;
    }


    // Tags filter
    if (filters.tags && filters.tags.length > 0) {
      const hasMatchingTag = filters.tags.some((tag: string) => 
        destination.tags.some(destTag => destTag.toLowerCase().includes(tag.toLowerCase()))
      );
      if (!hasMatchingTag) return false;
    }

    // Date range filter
    if (filters.dateRange) {
      const destStart = parseISO(destination.startDate);
      const filterStart = parseISO(filters.dateRange.start);
      const filterEnd = parseISO(filters.dateRange.end);
      
      if (!isWithinInterval(destStart, { start: filterStart, end: filterEnd })) {
        return false;
      }
    }

    // Budget range filter
    if (filters.budgetRange && destination.budget) {
      if (destination.budget < filters.budgetRange.min || destination.budget > filters.budgetRange.max) {
        return false;
      }
    }

    return true;
  });
};

// Search utilities
export const searchDestinations = (destinations: Destination[], query: string): Destination[] => {
  if (!query.trim()) return destinations;

  const searchTerm = query.toLowerCase();
  return destinations.filter(destination => 
    destination.name.toLowerCase().includes(searchTerm) ||
    destination.location.toLowerCase().includes(searchTerm) ||
    destination.notes?.toLowerCase().includes(searchTerm) ||
    destination.tags.some(tag => tag.toLowerCase().includes(searchTerm))
  );
};

// Budget utilities
export const calculateTotalBudget = (destinations: Destination[]): number => {
  return destinations.reduce((total, dest) => total + (dest.budget || 0), 0);
};

export const calculateActualCost = (destinations: Destination[]): number => {
  return destinations.reduce((total, dest) => total + (dest.actualCost || 0), 0);
};

export const formatCurrency = (amount: number, currency: string = 'EUR'): string => {
  return new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: currency
  }).format(amount);
};

// Travel cost calculation utilities
export const calculateTravelCosts = (
  destinations: Destination[],
  fuelConsumption: number = 9.0, // liters per 100km
  fuelPrice: number = 1.65 // EUR per liter (fallback price)
): number => {
  if (!destinations || destinations.length < 2) return 0;
  
  let totalDistance = 0;
  
  // Group destinations by day and sort chronologically
  const destinationsByDay = destinations
    .filter(dest => dest.coordinates)
    .reduce((acc, dest) => {
      const day = dest.startDate;
      if (!acc[day]) acc[day] = [];
      acc[day].push(dest);
      return acc;
    }, {} as Record<string, Destination[]>);

  const sortedDays = Object.entries(destinationsByDay).sort(([a], [b]) => a.localeCompare(b));

  // Calculate travel within each day and between days
  sortedDays.forEach(([day, dayDestinations], dayIndex) => {
    const sortedDestinations = dayDestinations.sort((a, b) => a.name.localeCompare(b.name));
    
    // Calculate travel within the day
    for (let i = 0; i < sortedDestinations.length - 1; i++) {
      const current = sortedDestinations[i];
      const next = sortedDestinations[i + 1];
      
      if (current.coordinates && next.coordinates) {
        const distance = calculateDistance(current.coordinates, next.coordinates) * 1.4; // Apply road factor
        totalDistance += distance;
      }
    }
    
    // Calculate travel from last destination of day to first of next day
    if (dayIndex < sortedDays.length - 1) {
      const nextDay = sortedDays[dayIndex + 1][1];
      const nextDayDestinations = nextDay.sort((a, b) => a.name.localeCompare(b.name));
      
      const lastToday = sortedDestinations[sortedDestinations.length - 1];
      const firstNextDay = nextDayDestinations[0];
      
      if (lastToday.coordinates && firstNextDay.coordinates) {
        const distance = calculateDistance(lastToday.coordinates, firstNextDay.coordinates) * 1.4;
        totalDistance += distance;
      }
    }
  });
  
  // Calculate fuel costs: distance (km) * consumption (L/100km) * price (EUR/L) / 100
  const fuelNeeded = (totalDistance * fuelConsumption) / 100;
  return fuelNeeded * fuelPrice;
};

// Legacy function for backward compatibility
export const calculateTravelCostsLegacy = (destinations: Destination[]): number => {
  return calculateTravelCosts(destinations, 9.0, 1.65);
};

// Validation utilities
export const isValidCoordinate = (coord: Coordinates): boolean => {
  return coord.lat >= -90 && coord.lat <= 90 && coord.lng >= -180 && coord.lng <= 180;
};

export const isValidDateRange = (startDate: string, endDate: string): boolean => {
  const start = new Date(startDate);
  const end = new Date(endDate);
  return start <= end;
};

// Export utilities
export const exportToJSON = (data: any): string => {
  return JSON.stringify(data, null, 2);
};

export const exportToCSV = (destinations: Destination[]): string => {
  const headers = ['Name', 'Ort', 'Kategorie', 'Start Datum', 'Ende Datum', 'Dauer (min)', 'Status', 'Budget', 'Tatsächliche Kosten', 'Notizen'];
  
  const rows = destinations.map(dest => [
    dest.name,
    dest.location,
    getCategoryLabel(dest.category),
    dest.startDate,
    dest.endDate || dest.startDate,
    (dest.duration || 0).toString(),
    dest.status,
    dest.budget || '',
    dest.actualCost || '',
    dest.notes || ''
  ]);

  return [headers, ...rows]
    .map(row => row.map(field => `"${field}"`).join(','))
    .join('\n');
};

// Local Storage utilities
export const saveToLocalStorage = <T>(key: string, data: T): void => {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (error) {
    console.error('Failed to save to localStorage:', error);
  }
};

export const loadFromLocalStorage = <T>(key: string): T | null => {
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : null;
  } catch (error) {
    console.error('Failed to load from localStorage:', error);
    return null;
  }
};

export const removeFromLocalStorage = (key: string): void => {
  try {
    localStorage.removeItem(key);
  } catch (error) {
    console.error('Failed to remove from localStorage:', error);
  }
};

// Reference Value utilities - for handling missing/undefined properties
interface ReferenceValueResult<T> {
  value: T;
  isReference: boolean;
}

export const getDestinationDuration = (destination: Destination): ReferenceValueResult<number> => {
  if (destination.duration !== undefined && destination.duration !== null) {
    return { value: destination.duration, isReference: false };
  }
  
  // Default duration based on category (reference value)
  const defaultDurations: Record<DestinationCategory, number> = {
    [DestinationCategory.HOTEL]: 720, // 12 hours (overnight stay)
    [DestinationCategory.RESTAURANT]: 120, // 2 hours
    [DestinationCategory.ATTRACTION]: 180, // 3 hours
    [DestinationCategory.MUSEUM]: 150, // 2.5 hours
    [DestinationCategory.NATURE]: 240, // 4 hours (nature/park)
    [DestinationCategory.CULTURAL]: 180, // 3 hours
    [DestinationCategory.SPORTS]: 120, // 2 hours
    [DestinationCategory.SHOPPING]: 90, // 1.5 hours
    [DestinationCategory.ENTERTAINMENT]: 180, // 3 hours
    [DestinationCategory.TRANSPORT]: 60, // 1 hour
    [DestinationCategory.OTHER]: 120 // 2 hours
  };
  
  return { 
    value: defaultDurations[destination.category] || 120, 
    isReference: true 
  };
};

export const formatDurationWithIndicator = (duration: ReferenceValueResult<number>): string => {
  const hours = Math.floor(duration.value / 60);
  const minutes = duration.value % 60;
  const timeStr = hours > 0 ? `${hours}h ${minutes}min` : `${minutes}min`;
  return duration.isReference ? `${timeStr} ⚠️` : timeStr;
};

export const getDestinationBudget = (destination: Destination): ReferenceValueResult<number> => {
  if (destination.budget !== undefined && destination.budget !== null) {
    return { value: destination.budget, isReference: false };
  }
  
  // Default budget based on category (reference value)
  const defaultBudgets: Record<DestinationCategory, number> = {
    [DestinationCategory.HOTEL]: 150,
    [DestinationCategory.RESTAURANT]: 50,
    [DestinationCategory.ATTRACTION]: 25,
    [DestinationCategory.MUSEUM]: 15,
    [DestinationCategory.NATURE]: 0,
    [DestinationCategory.CULTURAL]: 20,
    [DestinationCategory.SPORTS]: 30,
    [DestinationCategory.SHOPPING]: 100,
    [DestinationCategory.ENTERTAINMENT]: 40,
    [DestinationCategory.TRANSPORT]: 30,
    [DestinationCategory.OTHER]: 25
  };
  
  return { 
    value: defaultBudgets[destination.category] || 25, 
    isReference: true 
  };
};

export const formatCurrencyWithIndicator = (budget: ReferenceValueResult<number>): string => {
  const currencyStr = formatCurrency(budget.value);
  return budget.isReference ? `${currencyStr} ⚠️` : currencyStr;
};