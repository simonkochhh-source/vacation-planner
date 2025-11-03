import { DestinationCategory, DestinationStatus, TripStatus, TripPrivacy, TransportMode } from '../types';

// Type guards for enums
export const isDestinationCategory = (value: any): value is DestinationCategory => {
  return Object.values(DestinationCategory).includes(value);
};

export const isDestinationStatus = (value: any): value is DestinationStatus => {
  return Object.values(DestinationStatus).includes(value);
};

export const isTripStatus = (value: any): value is TripStatus => {
  return Object.values(TripStatus).includes(value);
};

export const isTripPrivacy = (value: any): value is TripPrivacy => {
  return Object.values(TripPrivacy).includes(value);
};

export const isTransportMode = (value: any): value is TransportMode => {
  return Object.values(TransportMode).includes(value);
};

// Mapping functions for Supabase conversion
const categoryToSupabase = (category: DestinationCategory): string => {
  const mapping: Record<DestinationCategory, string> = {
    [DestinationCategory.MUSEUM]: 'museum',
    [DestinationCategory.RESTAURANT]: 'restaurant',
    [DestinationCategory.ATTRACTION]: 'sehenswuerdigkeit', // Map to valid Supabase category
    [DestinationCategory.HOTEL]: 'hotel',
    [DestinationCategory.TRANSPORT]: 'transport',
    [DestinationCategory.NATURE]: 'natur',
    [DestinationCategory.ENTERTAINMENT]: 'nachtleben',
    [DestinationCategory.SHOPPING]: 'shopping',
    [DestinationCategory.CULTURAL]: 'kultur',
    [DestinationCategory.SPORTS]: 'sport',
    [DestinationCategory.OTHER]: 'sonstiges'
  };
  return mapping[category] || 'sonstiges';
};

const statusToSupabase = (status: DestinationStatus): string => {
  const mapping: Record<DestinationStatus, string> = {
    [DestinationStatus.PLANNED]: 'geplant',
    [DestinationStatus.VISITED]: 'besucht',
    [DestinationStatus.SKIPPED]: 'uebersprungen',
    [DestinationStatus.IN_PROGRESS]: 'in_bearbeitung'
  };
  return mapping[status] || 'geplant';
};

const tripStatusToSupabase = (status: TripStatus): string => {
  // DB constraint expects English values: ('planning', 'active', 'completed', 'cancelled')
  const mapping: Record<TripStatus, string> = {
    [TripStatus.PLANNING]: 'planning',
    [TripStatus.ACTIVE]: 'active', 
    [TripStatus.COMPLETED]: 'completed',
    [TripStatus.CANCELLED]: 'cancelled'
  };
  return mapping[status] || 'planning';
};

// Reverse mapping from Supabase categories to our enum values
const supabaseCategoryToEnum = (supabaseCategory: string): DestinationCategory => {
  const reverseMapping: Record<string, DestinationCategory> = {
    'museum': DestinationCategory.MUSEUM,
    'restaurant': DestinationCategory.RESTAURANT,
    'sehenswuerdigkeit': DestinationCategory.ATTRACTION, // This was the issue!
    'hotel': DestinationCategory.HOTEL,
    'transport': DestinationCategory.TRANSPORT,
    'natur': DestinationCategory.NATURE,
    'nachtleben': DestinationCategory.ENTERTAINMENT,
    'shopping': DestinationCategory.SHOPPING,
    'kultur': DestinationCategory.CULTURAL,
    'sport': DestinationCategory.SPORTS,
    'aktivitaet': DestinationCategory.SPORTS, // Alternative mapping
    'wellness': DestinationCategory.NATURE, // Map to nature or add new category
    'business': DestinationCategory.OTHER,
    'sonstiges': DestinationCategory.OTHER
  };
  
  return reverseMapping[supabaseCategory] || DestinationCategory.OTHER;
};

// Safe conversion functions with fallbacks
export const toDestinationCategory = (value: any): DestinationCategory => {
  // If it's already a valid enum value, return it
  if (isDestinationCategory(value)) {
    return value;
  }
  
  // If it's a string from Supabase, convert it
  if (typeof value === 'string') {
    return supabaseCategoryToEnum(value);
  }
  
  // Fallback to OTHER
  return DestinationCategory.OTHER;
};

export const toDestinationStatus = (value: any): DestinationStatus => {
  return isDestinationStatus(value) ? value : DestinationStatus.PLANNED;
};

// Reverse mapping from Supabase trip status to our enum values
const supabaseTripStatusToEnum = (supabaseStatus: string): TripStatus => {
  const reverseMapping: Record<string, TripStatus> = {
    'planning': TripStatus.PLANNING,
    'active': TripStatus.ACTIVE,
    'completed': TripStatus.COMPLETED,
    'cancelled': TripStatus.CANCELLED,
    // Legacy German values support (for existing data)
    'geplant': TripStatus.PLANNING,
    'aktiv': TripStatus.ACTIVE,
    'abgeschlossen': TripStatus.COMPLETED,
    'storniert': TripStatus.CANCELLED
  };
  return reverseMapping[supabaseStatus] || TripStatus.PLANNING;
};

export const toTripStatus = (value: any): TripStatus => {
  // If it's already a valid enum value, return it
  if (isTripStatus(value)) {
    return value;
  }
  
  // If it's a string from Supabase, convert it
  if (typeof value === 'string') {
    return supabaseTripStatusToEnum(value);
  }
  
  // Fallback
  return TripStatus.PLANNING;
};

export const toTripPrivacy = (value: any): TripPrivacy => {
  return isTripPrivacy(value) ? value : TripPrivacy.PRIVATE;
};

export const toTransportMode = (value: any): TransportMode => {
  return isTransportMode(value) ? value : TransportMode.WALKING;
};

// Supabase conversion functions
export const toSupabaseCategory = (category: DestinationCategory): "restaurant" | "museum" | "hotel" | "transport" | "shopping" | "sehenswuerdigkeit" | "aktivitaet" | "nachtleben" | "natur" | "kultur" | "sport" | "wellness" | "business" | "sonstiges" => {
  return categoryToSupabase(category) as "restaurant" | "museum" | "hotel" | "transport" | "shopping" | "sehenswuerdigkeit" | "aktivitaet" | "nachtleben" | "natur" | "kultur" | "sport" | "wellness" | "business" | "sonstiges";
};

export const toSupabaseStatus = (status: DestinationStatus): "geplant" | "besucht" | "uebersprungen" | "in_bearbeitung" => {
  return statusToSupabase(status) as "geplant" | "besucht" | "uebersprungen" | "in_bearbeitung";
};

export const toSupabaseTripStatus = (status: TripStatus): 'planning' | 'active' | 'completed' | 'cancelled' => {
  return tripStatusToSupabase(status) as 'planning' | 'active' | 'completed' | 'cancelled';
};

export const toSupabaseTripPrivacy = (privacy: TripPrivacy): 'private' | 'public' | 'contacts' => {
  // Direct mapping since our enum values match Supabase values
  return privacy as 'private' | 'public' | 'contacts';
};

// Generic object type guard
export const isObject = (value: any): value is Record<string, any> => {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
};

// Array type guard
export const isArray = (value: any): value is any[] => {
  return Array.isArray(value);
};

// Safe JSON parsing
export const safeJsonParse = <T = any>(value: string | null | undefined | number | boolean | object, fallback: T): T => {
  if (value === null || value === undefined) return fallback;
  
  // If value is already an object, return it as is
  if (typeof value === 'object') return value as T;
  
  // If value is not a string, try to convert it
  if (typeof value !== 'string') {
    try {
      return value as T;
    } catch {
      return fallback;
    }
  }
  
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
};