// Base Types
export type UUID = string;
export type DateString = string; // ISO 8601 date string
export type TimeString = string; // HH:MM format

// Enums
export enum DestinationStatus {
  PLANNED = 'planned',
  VISITED = 'visited',
  SKIPPED = 'skipped'
}

export enum DestinationCategory {
  MUSEUM = 'museum',
  RESTAURANT = 'restaurant',
  ATTRACTION = 'attraction',
  HOTEL = 'hotel',
  TRANSPORT = 'transport',
  NATURE = 'nature',
  ENTERTAINMENT = 'entertainment',
  SHOPPING = 'shopping',
  CULTURAL = 'cultural',
  SPORTS = 'sports',
  OTHER = 'other'
}

export enum TripStatus {
  PLANNED = 'planned',
  ACTIVE = 'active',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled'
}

export enum TransportMode {
  WALKING = 'walking',
  DRIVING = 'driving',
  PUBLIC_TRANSPORT = 'public_transport',
  BICYCLE = 'bicycle',
  FLIGHT = 'flight',
  TRAIN = 'train'
}

// Coordinate interface
export interface Coordinates {
  lat: number;
  lng: number;
}

// Weather information
export interface WeatherInfo {
  temperature?: number;
  condition?: string;
  humidity?: number;
  windSpeed?: number;
  icon?: string;
  description?: string;
}

// Transport information
export interface TransportInfo {
  mode: TransportMode;
  duration?: number; // in minutes
  distance?: number; // in meters
  cost?: number;
  notes?: string;
  bookingReference?: string;
}

// Main Destination interface
export interface Destination {
  id: UUID;
  name: string;
  location: string;
  coordinates?: Coordinates;
  startDate: DateString;
  endDate: DateString;
  startTime: TimeString;
  endTime: TimeString;
  category: DestinationCategory;
  priority: number; // 1-5 (1 = lowest, 5 = highest)
  rating?: number; // 1-5 stars
  budget?: number;
  actualCost?: number;
  notes?: string;
  photos: string[]; // URLs to photos
  bookingInfo?: string;
  status: DestinationStatus;
  tags: string[];
  color?: string; // hex color for map display
  duration: number; // planned duration in minutes
  weatherInfo?: WeatherInfo;
  transportToNext?: TransportInfo;
  website?: string;
  phoneNumber?: string;
  address?: string;
  openingHours?: string;
  
  // Metadata
  createdAt: DateString;
  updatedAt: DateString;
}

// Trip interface
export interface Trip {
  id: UUID;
  name: string;
  description?: string;
  startDate: DateString;
  endDate: DateString;
  destinations: UUID[]; // Array of destination IDs
  budget?: number;
  actualCost?: number;
  participants: string[];
  status: TripStatus;
  coverImage?: string;
  tags: string[];
  
  // Metadata
  createdAt: DateString;
  updatedAt: DateString;
}

// Filter and sorting types
export interface DestinationFilters {
  category?: DestinationCategory[];
  status?: DestinationStatus[];
  priority?: number[];
  tags?: string[];
  dateRange?: {
    start: DateString;
    end: DateString;
  };
  budgetRange?: {
    min: number;
    max: number;
  };
}

export enum SortField {
  NAME = 'name',
  START_DATE = 'startDate',
  START_TIME = 'startTime',
  PRIORITY = 'priority',
  RATING = 'rating',
  BUDGET = 'budget',
  CREATED_AT = 'createdAt'
}

export enum SortDirection {
  ASC = 'asc',
  DESC = 'desc'
}

export interface SortOptions {
  field: SortField;
  direction: SortDirection;
}

// UI State types
export interface UIState {
  currentView: 'list' | 'map' | 'timeline' | 'scheduling' | 'budget';
  activeDestination?: UUID;
  activeTripId?: UUID;
  filters: DestinationFilters;
  sortOptions: SortOptions;
  isLoading: boolean;
  searchQuery: string;
  sidebarOpen: boolean;
  mapCenter?: Coordinates;
  mapZoom?: number;
}

// Form types
export interface CreateDestinationData {
  name: string;
  location: string;
  coordinates?: Coordinates;
  startDate: DateString;
  endDate: DateString;
  startTime: TimeString;
  endTime: TimeString;
  category: DestinationCategory;
  priority: number;
  budget?: number;
  notes?: string;
  tags: string[];
  color?: string;
}

export interface CreateTripData {
  name: string;
  description?: string;
  startDate: DateString;
  endDate: DateString;
  budget?: number;
  participants: string[];
  tags: string[];
}

// API Response types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// Export formats
export interface ExportOptions {
  format: 'json' | 'csv' | 'gpx' | 'pdf';
  includePhotos?: boolean;
  includeNotes?: boolean;
  dateRange?: {
    start: DateString;
    end: DateString;
  };
}

// Statistics and Analytics
export interface TripStatistics {
  totalDestinations: number;
  visitedDestinations: number;
  plannedDestinations: number;
  skippedDestinations: number;
  totalBudget: number;
  actualCost: number;
  averageRating: number;
  totalDuration: number; // in minutes
  categoriesCount: Record<DestinationCategory, number>;
}

// Error types
export interface ValidationError {
  field: string;
  message: string;
}

export interface AppError {
  code: string;
  message: string;
  details?: any;
}

// Context types
export interface AppContextType {
  trips: Trip[];
  destinations: Destination[];
  currentTrip?: Trip;
  uiState: UIState;
  
  // Actions
  createTrip: (data: CreateTripData) => Promise<Trip>;
  updateTrip: (id: UUID, data: Partial<Trip>) => Promise<Trip>;
  deleteTrip: (id: UUID) => Promise<void>;
  
  createDestination: (data: CreateDestinationData) => Promise<Destination>;
  updateDestination: (id: UUID, data: Partial<Destination>) => Promise<Destination>;
  deleteDestination: (id: UUID) => Promise<void>;
  reorderDestinations: (tripId: UUID, destinationIds: UUID[]) => Promise<void>;
  
  setCurrentTrip: (tripId: UUID) => void;
  updateUIState: (state: Partial<UIState>) => void;
  exportTrip: (tripId: UUID, options: ExportOptions) => Promise<string>;
}