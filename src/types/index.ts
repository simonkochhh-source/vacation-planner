// Base Types
export type UUID = string;
export type DateString = string; // ISO 8601 date string
export type TimeString = string; // HH:MM format

// Enums
export enum DestinationStatus {
  PLANNED = 'planned',
  VISITED = 'visited',
  SKIPPED = 'skipped',
  IN_PROGRESS = 'in_progress'
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

export enum TripPrivacy {
  PRIVATE = 'private',
  PUBLIC = 'public',
  CONTACTS = 'contacts'
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
  priority?: number; // 1-5 priority level for importance ranking
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
  
  // Cross-reference support for destination copies
  copiedFromId?: UUID; // References the original destination this was copied from
  isOriginal?: boolean; // Indicates if this is an original destination (true) or a copy (false)
  
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
  
  // Privacy and sharing settings
  privacy: TripPrivacy;
  ownerId: UUID; // User ID of the trip owner
  taggedUsers: UUID[]; // User IDs of users tagged in this trip
  
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
  currentView: 'list' | 'map' | 'timeline' | 'budget' | 'settings' | 'discovery' | 'search' | 'landing' | 'photos' | 'user-profile' | 'my-profile' | 'social-feed' | 'place-search-demo';
  activeView?: 'list' | 'map' | 'timeline' | 'budget' | 'settings' | 'discovery' | 'search' | 'landing' | 'photos' | 'user-profile' | 'my-profile' | 'social-feed' | 'place-search-demo';
  activeDestination?: UUID;
  activeTripId?: UUID;
  filters: DestinationFilters;
  sortOptions: SortOptions;
  isLoading: boolean;
  searchQuery: string;
  sidebarOpen: boolean;
  hideHeader?: boolean; // Optional flag to hide header during trip editing/creation
  mapCenter?: Coordinates;
  mapZoom?: number;
  // Search navigation states
  selectedTripId?: UUID; // For opening specific trip details in search
  showTripDetails?: boolean; // Flag to show trip details view
  selectedDestinationId?: UUID; // For opening specific destination details in search
  showDestinationDetails?: boolean; // Flag to show destination details view
  // Social navigation states
  selectedUserId?: UUID; // For opening specific user profiles
  showUserProfile?: boolean; // Flag to show user profile view
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
  privacy?: TripPrivacy;
  taggedUsers?: UUID[];
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

// Permission and access control types
export interface TripPermissions {
  canEdit: boolean;
  canView: boolean;
  canDelete: boolean;
  isOwner: boolean;
  isTagged: boolean;
}

// Utility functions for trip permissions
export const getTripPermissions = (trip: Trip, currentUserId: UUID): TripPermissions => {
  // Null checks to prevent runtime errors
  if (!trip || !currentUserId) {
    return {
      canEdit: false,
      canView: false,
      canDelete: false,
      isOwner: false,
      isTagged: false
    };
  }
  
  // Ensure trip properties exist with fallbacks
  const ownerId = trip.ownerId || '';
  const taggedUsers = trip.taggedUsers || [];
  const privacy = trip.privacy || TripPrivacy.PRIVATE;
  
  const isOwner = ownerId === currentUserId;
  const isTagged = taggedUsers.includes(currentUserId);
  const isPublic = privacy === TripPrivacy.PUBLIC;
  
  return {
    canEdit: isOwner || isTagged,
    canView: isOwner || isTagged || isPublic,
    canDelete: isOwner,
    isOwner,
    isTagged
  };
};

// Async version that can check follower relationships for CONTACTS privacy
export const getTripPermissionsAsync = async (trip: Trip, currentUserId: UUID): Promise<TripPermissions> => {
  // Null checks to prevent runtime errors
  if (!trip || !currentUserId) {
    return {
      canEdit: false,
      canView: false,
      canDelete: false,
      isOwner: false,
      isTagged: false
    };
  }
  
  // Ensure trip properties exist with fallbacks
  const ownerId = trip.ownerId || '';
  const taggedUsers = trip.taggedUsers || [];
  const privacy = trip.privacy || TripPrivacy.PRIVATE;
  
  const isOwner = ownerId === currentUserId;
  const isTagged = taggedUsers.includes(currentUserId);
  const isPublic = privacy === TripPrivacy.PUBLIC;
  
  // For CONTACTS privacy, check if users are following each other
  let isFollowing = false;
  if (privacy === TripPrivacy.CONTACTS && !isOwner && !isTagged) {
    try {
      // Dynamic import to avoid circular dependency
      const { socialService } = await import('../services/socialService');
      const followStatus = await socialService.getFollowStatus(ownerId);
      isFollowing = followStatus === 'accepted';
    } catch (error) {
      console.error('Error checking follow status:', error);
      isFollowing = false;
    }
  }
  
  // Determine view permissions based on privacy level
  let canView = false;
  
  if (isOwner || isTagged) {
    // Owner and tagged users can always see the trip
    canView = true;
  } else if (privacy === TripPrivacy.PUBLIC) {
    // Anyone can see public trips
    canView = true;
  } else if (privacy === TripPrivacy.CONTACTS) {
    // Only followers can see contact trips
    canView = isFollowing;
  } else {
    // Private trips - only owner and tagged users (already handled above)
    canView = false;
  }
  
  return {
    canEdit: isOwner || isTagged,
    canView,
    canDelete: isOwner,
    isOwner,
    isTagged
  };
};

export const canUserAccessTrip = (trip: Trip, currentUserId: UUID): boolean => {
  const permissions = getTripPermissions(trip, currentUserId);
  return permissions.canView;
};

export const canUserAccessTripAsync = async (trip: Trip, currentUserId: UUID): Promise<boolean> => {
  const permissions = await getTripPermissionsAsync(trip, currentUserId);
  return permissions.canView;
};

export const canUserEditTrip = (trip: Trip, currentUserId: UUID): boolean => {
  const permissions = getTripPermissions(trip, currentUserId);
  return permissions.canEdit;
};

// Context types
export interface AppContextType {
  trips: Trip[];
  publicTrips: Trip[];
  destinations: Destination[];
  currentTrip?: Trip;
  uiState: UIState;
  settings: AppSettings;
  
  // Actions
  createTrip: (data: CreateTripData) => Promise<Trip>;
  updateTrip: (id: UUID, data: Partial<Trip>) => Promise<Trip>;
  deleteTrip: (id: UUID) => Promise<void>;
  
  createDestination: (data: CreateDestinationData) => Promise<Destination>;
  createDestinationForTrip: (data: CreateDestinationData, tripId: UUID) => Promise<Destination>;
  updateDestination: (id: UUID, data: Partial<Destination>) => Promise<Destination>;
  deleteDestination: (id: UUID) => Promise<void>;
  reorderDestinations: (tripId: UUID, destinationIds: UUID[]) => Promise<void>;
  
  setCurrentTrip: (tripId: UUID) => void;
  updateUIState: (state: Partial<UIState>) => void;
  updateSettings: (settings: Partial<AppSettings>) => void;
  exportTrip: (tripId: UUID, options: ExportOptions) => Promise<string>;
  loadPublicTrips: () => Promise<void>;
}

// =====================================================
// Social Network Types
// =====================================================

// Follow relationship status
export enum FollowStatus {
  PENDING = 'pending',
  ACCEPTED = 'accepted',
  DECLINED = 'declined'
}

// Activity types for the social feed
export enum ActivityType {
  TRIP_CREATED = 'trip_created',
  TRIP_PLANNED = 'trip_created', // Alias for trip creation
  TRIP_STARTED = 'trip_started',
  TRIP_COMPLETED = 'trip_completed',
  DESTINATION_VISITED = 'destination_visited',
  DESTINATION_PLANNED = 'destination_added', // Alias for destination planning
  DESTINATION_ADDED = 'destination_added',
  PHOTO_UPLOADED = 'photo_uploaded',
  TRIP_SHARED = 'trip_shared',
  USER_FOLLOWED = 'user_followed'
}

// Follow relationship interface
export interface Follow {
  id: UUID;
  follower_id: UUID;
  following_id: UUID;
  status: FollowStatus;
  created_at: DateString;
  updated_at: DateString;
}

// User activity interface
export interface UserActivity {
  id: UUID;
  user_id: UUID;
  activity_type: ActivityType;
  related_trip_id?: UUID;
  related_destination_id?: UUID;
  metadata: Record<string, any>;
  title: string;
  description?: string;
  created_at: DateString;
}

// Enhanced user profile with social features
export interface SocialUserProfile {
  id: UUID;
  nickname: string;
  display_name?: string;
  email: string;
  avatar_url?: string;
  bio?: string;
  location?: string;
  website?: string;
  social_links: Record<string, string>;
  is_public_profile: boolean;
  is_verified: boolean;
  
  // Social stats
  follower_count: number;
  following_count: number;
  trip_count: number;
  
  // Metadata
  created_at: DateString;
  updated_at: DateString;
}

// Activity feed item with user info
export interface ActivityFeedItem {
  activity_id: UUID;
  id?: UUID; // Legacy compatibility
  user_id: UUID;
  user_nickname: string;
  user_avatar?: string;
  user_avatar_url?: string; // Legacy compatibility
  activity_type: ActivityType;
  title: string;
  description?: string;
  metadata: Record<string, any>;
  created_at: DateString;
  
  // Additional context for display
  trip_name?: string;
  destination_name?: string;
  destination_location?: string;
  related_data?: {
    tripId?: UUID;
    tripName?: string;
    destinationId?: UUID;
    destinationName?: string;
    location?: string;
    targetUserName?: string;
  };
}

// User search result
export interface UserSearchResult {
  id: UUID;
  nickname: string;
  display_name?: string;
  avatar_url?: string;
  bio?: string;
  location?: string;
  follower_count: number;
  trip_count: number;
  is_verified: boolean;
  follow_status?: FollowStatus | 'none'; // Current user's relationship to this user
}

// Social statistics
export interface SocialStats {
  follower_count: number;
  following_count: number;
  trip_count: number;
  public_trip_count: number;
  contact_trip_count: number;
}

// Follow request/response interfaces
export interface FollowRequest {
  target_user_id: UUID;
}

export interface FollowResponse {
  follow_id: UUID;
  action: 'accept' | 'decline';
}

// Social feed filters
export interface SocialFeedFilters {
  activity_types?: ActivityType[];
  date_range?: {
    start: DateString;
    end: DateString;
  };
  user_ids?: UUID[]; // Filter to specific users
}

// Updated trip permissions to include contacts privacy
export const getSocialTripPermissions = (
  trip: Trip, 
  currentUserId: UUID, 
  followStatus?: FollowStatus | 'none'
): TripPermissions => {
  if (!trip || !currentUserId) {
    return {
      canEdit: false,
      canView: false,
      canDelete: false,
      isOwner: false,
      isTagged: false
    };
  }
  
  const ownerId = trip.ownerId || '';
  const taggedUsers = trip.taggedUsers || [];
  const privacy = trip.privacy || TripPrivacy.PRIVATE;
  
  const isOwner = ownerId === currentUserId;
  const isTagged = taggedUsers.includes(currentUserId);
  const isPublic = privacy === TripPrivacy.PUBLIC;
  const isContacts = privacy === TripPrivacy.CONTACTS;
  const isFollowing = followStatus === FollowStatus.ACCEPTED;
  
  // Determine view permissions based on privacy level
  let canView = false;
  if (isOwner || isTagged) {
    canView = true; // Owners and tagged users can always view
  } else if (isPublic) {
    canView = true; // Public trips are visible to everyone
  } else if (isContacts && isFollowing) {
    canView = true; // Contact trips are visible to followers
  }
  
  return {
    canEdit: isOwner || isTagged,
    canView,
    canDelete: isOwner,
    isOwner,
    isTagged
  };
};

// Social service interface types
export interface SocialServiceInterface {
  // Follow management
  followUser: (targetUserId: UUID) => Promise<Follow>;
  unfollowUser: (targetUserId: UUID) => Promise<void>;
  acceptFollowRequest: (followId: UUID) => Promise<void>;
  declineFollowRequest: (followId: UUID) => Promise<void>;
  
  // User search and discovery
  searchUsers: (query: string, limit?: number) => Promise<UserSearchResult[]>;
  getUserProfile: (userId: UUID) => Promise<SocialUserProfile>;
  
  // Follow relationships
  getFollowers: (userId: UUID) => Promise<SocialUserProfile[]>;
  getFollowing: (userId: UUID) => Promise<SocialUserProfile[]>;
  getFollowRequests: () => Promise<Follow[]>;
  getFollowStatus: (targetUserId: UUID) => Promise<FollowStatus | 'none'>;
  
  // Activity feed
  getActivityFeed: (limit?: number) => Promise<ActivityFeedItem[]>;
  getUserActivityFeed: (userId: UUID, limit?: number) => Promise<ActivityFeedItem[]>;
  createActivity: (activity: Omit<UserActivity, 'id' | 'created_at'>) => Promise<UserActivity>;
  
  // Social stats
  getSocialStats: (userId: UUID) => Promise<SocialStats>;
}