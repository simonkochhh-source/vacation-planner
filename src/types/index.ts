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

export enum FuelType {
  DIESEL = 'diesel',
  E5 = 'e5',
  E10 = 'e10'
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

// Vehicle and fuel configuration
export interface VehicleConfig {
  fuelType: FuelType;
  fuelConsumption: number; // liters per 100km
  fuelPrice?: number; // EUR per liter (cached from API)
  lastPriceUpdate?: DateString; // when fuel price was last updated
}

// Fuel price information
export interface FuelPrice {
  type: FuelType;
  price: number; // EUR per liter
  stationId: string;
  stationName: string;
  location: Coordinates;
  lastUpdated: DateString;
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
  category: DestinationCategory;
  budget?: number;
  actualCost?: number;
  notes?: string;
  photos: string[]; // URLs to photos
  bookingInfo?: string;
  status: DestinationStatus;
  tags: string[];
  color?: string; // hex color for map display
  duration?: number; // kept for compatibility but deprecated - use startTime/endTime instead
  
  // Enhanced timeline features
  startTime?: TimeString; // HH:MM format for daily schedule
  endTime?: TimeString; // HH:MM format for daily schedule
  
  weatherInfo?: WeatherInfo;
  transportToNext?: TransportInfo;
  website?: string;
  phoneNumber?: string;
  address?: string;
  openingHours?: string;
  
  // Return destination for walking/biking activities (optional)
  returnDestinationId?: UUID; // ID of existing destination to return to
  
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
  
  // Vehicle and fuel configuration for travel cost calculations
  vehicleConfig?: VehicleConfig;
  
  // Metadata
  createdAt: DateString;
  updatedAt: DateString;
}

// Filter and sorting types
export interface DestinationFilters {
  category?: DestinationCategory[];
  status?: DestinationStatus[];
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
  currentView: 'list' | 'map' | 'timeline' | 'budget' | 'settings' | 'discovery';
  activeView?: 'list' | 'map' | 'timeline' | 'budget' | 'settings' | 'discovery';
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

// Settings types
export interface AppSettings {
  // General Settings
  language: 'de' | 'en';
  theme: 'light' | 'dark' | 'auto';
  currency: string;
  dateFormat: 'dd.MM.yyyy' | 'MM/dd/yyyy' | 'yyyy-MM-dd';
  timeFormat: '24h' | '12h';
  
  // Map Settings
  defaultMapProvider: 'osm' | 'google' | 'mapbox';
  defaultMapZoom: number;
  showTraffic: boolean;
  showPublicTransport: boolean;
  
  // Travel Settings
  defaultTransportMode: TransportMode;
  fuelType: FuelType;
  fuelConsumption: number; // L/100km
  
  // Home Point Settings
  homePoint?: {
    name: string;
    address: string;
    coordinates: Coordinates;
  };
  
  // Notification Settings
  enableNotifications: boolean;
  reminderTime: number; // minutes before event
  
  // Export Settings
  defaultExportFormat: 'json' | 'csv' | 'gpx' | 'kml';
  includePhotosInExport: boolean;
  includeNotesInExport: boolean;
  
  // Privacy Settings
  shareLocation: boolean;
  trackVisitHistory: boolean;
  
  // Backup Settings
  autoBackup: boolean;
  backupInterval: number; // hours
}

// Form types
export interface CreateDestinationData {
  name: string;
  location: string;
  coordinates?: Coordinates;
  startDate: DateString;
  endDate: DateString;
  category: DestinationCategory;
  budget?: number;
  status?: DestinationStatus;
  notes?: string;
  tags: string[];
  color?: string;
  returnDestinationId?: UUID;
}

export interface CreateTripData {
  name: string;
  description?: string;
  startDate: DateString;
  endDate: DateString;
  budget?: number;
  participants: string[];
  tags: string[];
  vehicleConfig?: VehicleConfig;
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
  totalDuration?: number; // deprecated - kept for compatibility
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
  settings: AppSettings;
  
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
  updateSettings: (settings: Partial<AppSettings>) => void;
  exportTrip: (tripId: UUID, options: ExportOptions) => Promise<string>;
}