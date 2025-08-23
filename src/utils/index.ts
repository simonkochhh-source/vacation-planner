import { format, parseISO, addDays, differenceInMinutes, isWithinInterval } from 'date-fns';
import { de } from 'date-fns/locale';
import { Destination, UUID, Coordinates, DestinationCategory, DestinationStatus } from '../types';

// Date and Time utilities
export const formatDate = (dateString: string): string => {
  return format(parseISO(dateString), 'dd.MM.yyyy', { locale: de });
};

export const formatTime = (timeString: string): string => {
  return timeString;
};

export const formatDateTime = (dateString: string, timeString: string): string => {
  const date = parseISO(dateString);
  const [hours, minutes] = timeString.split(':');
  date.setHours(parseInt(hours), parseInt(minutes));
  return format(date, 'dd.MM.yyyy HH:mm', { locale: de });
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

export const calculateDuration = (startDate: string, startTime: string, endDate: string, endTime: string): number => {
  const start = parseISO(`${startDate}T${startTime}`);
  const end = parseISO(`${endDate}T${endTime}`);
  return differenceInMinutes(end, start);
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
    [DestinationStatus.SKIPPED]: '#EF4444'
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
      aValue = new Date(`${aValue}T${a.startTime}`);
      bValue = new Date(`${bValue}T${b.startTime}`);
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

    // Priority filter
    if (filters.priority && filters.priority.length > 0) {
      if (!filters.priority.includes(destination.priority)) return false;
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

// Validation utilities
export const isValidCoordinate = (coord: Coordinates): boolean => {
  return coord.lat >= -90 && coord.lat <= 90 && coord.lng >= -180 && coord.lng <= 180;
};

export const isValidTimeRange = (startDate: string, startTime: string, endDate: string, endTime: string): boolean => {
  const start = new Date(`${startDate}T${startTime}`);
  const end = new Date(`${endDate}T${endTime}`);
  return start < end;
};

// Export utilities
export const exportToJSON = (data: any): string => {
  return JSON.stringify(data, null, 2);
};

export const exportToCSV = (destinations: Destination[]): string => {
  const headers = ['Name', 'Ort', 'Kategorie', 'Start Datum', 'Start Zeit', 'Ende Datum', 'Ende Zeit', 'Status', 'Budget', 'Tatsächliche Kosten', 'Bewertung', 'Notizen'];
  
  const rows = destinations.map(dest => [
    dest.name,
    dest.location,
    getCategoryLabel(dest.category),
    dest.startDate,
    dest.startTime,
    dest.endDate,
    dest.endTime,
    dest.status,
    dest.budget || '',
    dest.actualCost || '',
    dest.rating || '',
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