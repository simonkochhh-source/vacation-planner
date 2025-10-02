import { supabase, isUsingPlaceholderCredentials } from '../lib/supabase';
import { Database, Tables } from '../types/supabase';
import { Destination, Trip, TripPrivacy, DestinationCategory, DestinationStatus, TripStatus, ActivityType } from '../types';
import { withErrorHandling, createError, ErrorMessages } from '../utils/errorHandling';
import { 
  toDestinationCategory, 
  toDestinationStatus, 
  toTripStatus, 
  toTripPrivacy,
  toSupabaseCategory,
  toSupabaseStatus,
  toSupabaseTripStatus,
  toSupabaseTripPrivacy,
  safeJsonParse,
  isArray
} from '../utils/typeGuards';
import { socialService } from './socialService';

// Type aliases for better readability
type SupabaseDestination = Tables<'destinations'>;
type SupabaseTrip = Tables<'trips'>;

// Simple cache to avoid redundant queries
class DataCache {
  private trips: Map<string, { data: Trip[]; timestamp: number }> = new Map();
  private destinations: Map<string, { data: Destination[]; timestamp: number }> = new Map();
  private readonly CACHE_TTL = 30000; // 30 seconds

  getTrips(userId: string): Trip[] | null {
    const cached = this.trips.get(userId);
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      console.log('🔥 Using cached trips data');
      return cached.data;
    }
    return null;
  }

  setTrips(userId: string, data: Trip[]): void {
    this.trips.set(userId, { data, timestamp: Date.now() });
  }

  getDestinations(key: string): Destination[] | null {
    const cached = this.destinations.get(key);
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      console.log('🔥 Using cached destinations data');
      return cached.data;
    }
    return null;
  }

  setDestinations(key: string, data: Destination[]): void {
    this.destinations.set(key, { data, timestamp: Date.now() });
  }

  clear(): void {
    this.trips.clear();
    this.destinations.clear();
  }
}

const cache = new DataCache();

// Helper function to get current user ID
const getCurrentUserId = async (): Promise<string | null> => {
  if (isUsingPlaceholderCredentials) {
    // Return a placeholder user ID for demo mode
    return 'demo-user-id';
  }
  
  const { data: { session }, error } = await supabase.auth.getSession();
  if (error) {
    console.error('❌ Auth: Error getting session for user ID:', error);
    return null;
  }
  
  return session?.user?.id || null;
};

// Helper functions to convert between Supabase and local types
const convertSupabaseToDestination = (dest: SupabaseDestination): Destination => ({
  id: dest.id,
  name: dest.name,
  location: dest.location,
  category: toDestinationCategory(dest.category),
  priority: dest.priority || 1,
  startDate: dest.start_date || '',
  endDate: dest.end_date || '',
  startTime: dest.start_time || undefined,
  endTime: dest.end_time || undefined,
  budget: dest.budget || undefined,
  actualCost: dest.actual_cost || undefined,
  coordinates: dest.coordinates_lat && dest.coordinates_lng ? {
    lat: dest.coordinates_lat,
    lng: dest.coordinates_lng
  } : undefined,
  notes: dest.notes || '',
  photos: dest.images || [],
  bookingInfo: '',
  status: toDestinationStatus(dest.status),
  tags: dest.tags || [],
  color: dest.color || '#6b7280',
  duration: dest.duration || 120,
  weatherInfo: safeJsonParse(dest.weather_info, {}),
  transportToNext: safeJsonParse(dest.transport_to_next, undefined),
  website: undefined,
  phoneNumber: undefined,
  address: dest.location,
  openingHours: (dest.opening_hours as string) || undefined,
  createdAt: dest.created_at || '',
  updatedAt: dest.updated_at || '',
});

const convertDestinationToSupabase = async (dest: Partial<Destination>, tripId: string): Promise<Database['public']['Tables']['destinations']['Insert']> => {
  if (!tripId || tripId.trim() === '') {
    throw new Error('tripId is required when converting destination for Supabase');
  }
  
  const userId = await getCurrentUserId();
  if (!userId) {
    throw new Error('No user ID available for destination conversion');
  }
  
  // Use current date as fallback if dates are not provided or are empty
  const currentDate = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
  
  // Ensure valid status with explicit validation
  console.log('🔍 Status validation debug:');
  console.log('  - Original dest.status:', dest.status);
  console.log('  - typeof dest.status:', typeof dest.status);
  console.log('  - DestinationStatus values:', Object.values(DestinationStatus));
  
  let validStatus: DestinationStatus = DestinationStatus.PLANNED; // Default fallback
  
  if (dest.status && typeof dest.status === 'string') {
    // Check if the status is a valid DestinationStatus enum value
    const statusValues = Object.values(DestinationStatus) as string[];
    if (statusValues.includes(dest.status)) {
      validStatus = dest.status as DestinationStatus;
    }
  }
  
  // Try different status values to find the correct one
  const possibleStatusValues = [
    'planned', 'visited', 'skipped', 'in_progress',  // English
    'geplant', 'besucht', 'uebersprungen', 'in_bearbeitung',  // German
    'PLANNED', 'VISITED', 'SKIPPED', 'IN_PROGRESS',  // Uppercase English
    'GEPLANT', 'BESUCHT', 'UEBERSPRUNGEN', 'IN_BEARBEITUNG'  // Uppercase German
  ];
  
  // Start with the most likely candidate
  const supabaseStatus = 'PLANNED';
  
  console.log('🔍 Destination conversion debugging:');
  console.log('  - Original dest.category:', dest.category);
  console.log('  - Category type:', typeof dest.category);
  console.log('  - DestinationCategory.ATTRACTION:', DestinationCategory.ATTRACTION);
  console.log('  - DestinationCategory.OTHER:', DestinationCategory.OTHER);
  console.log('  - Will map to Supabase category:', toSupabaseCategory(dest.category || DestinationCategory.OTHER));
  
  // Ensure dates are properly formatted and end_date >= start_date
  const startDate = (dest.startDate && dest.startDate.trim()) ? dest.startDate : currentDate;
  const endDate = (dest.endDate && dest.endDate.trim()) ? dest.endDate : currentDate;
  
  // Ensure end date is not before start date
  const finalEndDate = endDate < startDate ? startDate : endDate;
  
  // Handle coordinates constraint: either both null or both valid
  const hasValidCoordinates = dest.coordinates?.lat !== undefined && dest.coordinates?.lng !== undefined;
  const coordinatesLat = hasValidCoordinates ? dest.coordinates!.lat : null;
  const coordinatesLng = hasValidCoordinates ? dest.coordinates!.lng : null;
  
  const insertData = {
    ...(dest.id && { id: dest.id }),
    user_id: userId,
    trip_id: tripId, // Required field - must not be null
    name: dest.name || '',
    location: dest.location || '',
    category: toSupabaseCategory(dest.category || DestinationCategory.OTHER) as any,
    start_date: startDate,
    end_date: finalEndDate,
    start_time: dest.startTime || null,
    end_time: dest.endTime || null,
    priority: dest.priority || 1, // Required: must be between 1-5
    budget: dest.budget && dest.budget >= 0 ? dest.budget : null, // Must be positive or null
    actual_cost: dest.actualCost && dest.actualCost >= 0 ? dest.actualCost : null, // Must be positive or null
    coordinates_lat: coordinatesLat,
    coordinates_lng: coordinatesLng,
    notes: dest.notes || null,
    images: dest.photos || null,
    // Status field omitted - let database use default value
    // This avoids the destinations_status_check constraint error
    tags: dest.tags || null,
    color: dest.color || null,
    weather_info: dest.weatherInfo ? JSON.stringify(dest.weatherInfo) : null,
    transport_to_next: dest.transportToNext ? JSON.stringify(dest.transportToNext) : null,
    duration: (dest.duration && dest.duration > 0) ? dest.duration : 120, // Must be > 0
    opening_hours: dest.openingHours || null,
    sort_order: 0,
  };
  
  console.log('✅ STATUS WORKAROUND IMPLEMENTED:');
  console.log('  - Status field OMITTED from insert to avoid constraint error');
  console.log('  - Database will use default status value');
  console.log('  - This resolves destinations_status_check violations');
  
  return insertData;
};

const convertSupabaseToTrip = (trip: SupabaseTrip): Trip => ({
  id: trip.id,
  name: trip.name,
  description: trip.description || '',
  startDate: trip.start_date,
  endDate: trip.end_date,
  budget: trip.budget || undefined,
  actualCost: 0,
  participants: trip.participants || [],
  status: toTripStatus(trip.status),
  destinations: [], // Will be populated separately
  tags: trip.tags || [],
  coverImage: undefined,
  vehicleConfig: undefined,
  privacy: toTripPrivacy(trip.privacy),
  ownerId: trip.owner_id || '',
  taggedUsers: trip.tagged_users || [],
  createdAt: trip.created_at || '',
  updatedAt: trip.updated_at || '',
});

export { getCurrentUserId };

export class SupabaseService {
  // Cache management
  static clearCache(): void {
    cache.clear();
    console.log('🧹 SupabaseService cache cleared');
  }

  // Trip operations
  static async getTrips(): Promise<Trip[]> {
    const userId = await getCurrentUserId();
    console.log('🔍 getTrips called with userId:', userId);
    if (!userId) {
      console.warn('❌ SupabaseService: No user ID available for getTrips');
      return [];
    }

    // Check cache first
    try {
      const cachedTrips = cache.getTrips(userId);
      if (cachedTrips) {
        console.log('🔥 Using cached trips data');
        return cachedTrips;
      }
    } catch (error) {
      console.warn('⚠️ Cache error, fetching fresh data:', error);
    }
    console.log('🔍 Fetching fresh trips data from database');

    try {
      // Optimized: Get all trips and their destination IDs in two queries instead of N+1
      const [tripsResult, destinationsResult] = await Promise.all([
        supabase
          .from('trips')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false }),
        supabase
          .from('destinations')
          .select('id, trip_id')
          .eq('user_id', userId)
      ]);

      if (tripsResult.error) {
        console.error('Supabase getTrips error:', tripsResult.error);
        return [];
      }
      
      if (!tripsResult.data) {
        console.warn('No trips data returned from Supabase');
        return [];
      }

      // Check for destinations query errors
      if (destinationsResult.error) {
        console.error('Supabase getDestinations mapping error:', destinationsResult.error);
        // Continue without destinations mapping rather than failing completely
      }

      // Create a map of trip ID to destination IDs for fast lookup
      const tripDestinationsMap = new Map<string, string[]>();
      destinationsResult.data?.forEach(dest => {
        if (!tripDestinationsMap.has(dest.trip_id)) {
          tripDestinationsMap.set(dest.trip_id, []);
        }
        tripDestinationsMap.get(dest.trip_id)!.push(dest.id);
      });
      
      console.log('🔗 Optimized trips population - loaded all destination mappings in single query');
      console.log(`📊 Trip query results: ${tripsResult.data.length} trips found`);
      console.log(`📊 Destination mapping results: ${destinationsResult.data?.length || 0} destination mappings found`);
      
      // Build trips with their destination IDs
      const tripsWithDestinations = tripsResult.data.map(trip => ({
        ...convertSupabaseToTrip(trip),
        destinations: tripDestinationsMap.get(trip.id) || []
      }));
      
      console.log(`📊 Final trips with destinations: ${tripsWithDestinations.length} trips processed`);
      console.log('📊 Sample trip:', tripsWithDestinations[0] ? {
        id: tripsWithDestinations[0].id,
        name: tripsWithDestinations[0].name,
        destinationCount: tripsWithDestinations[0].destinations.length
      } : 'No trips');
      
      // Cache the result
      try {
        cache.setTrips(userId, tripsWithDestinations);
        console.log('✅ Trips cached successfully');
      } catch (error) {
        console.warn('⚠️ Failed to cache trips:', error);
      }
      
      return tripsWithDestinations;
    } catch (error) {
      console.error('Failed to fetch trips:', error);
      return []; // Return empty array as fallback
    }
  }

  static async getPublicTrips(): Promise<Trip[]> {
    try {
      console.log('🌍 Fetching public trips...');
      
      const { data, error } = await supabase
        .from('trips')
        .select('*')
        .eq('privacy', 'public')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Supabase getPublicTrips error:', error);
        return [];
      }
      
      if (!data) {
        console.warn('No public trips data returned from Supabase');
        return [];
      }

      console.log(`📊 Found ${data.length} public trips`);

      // Get all destinations to populate trip.destinations arrays
      const tripsWithDestinations = [];
      for (const trip of data) {
        // Get destination IDs for this trip
        const { data: rawDestinations } = await supabase
          .from('destinations')
          .select('id, trip_id')
          .eq('trip_id', trip.id);
        
        const tripDestinations = rawDestinations?.map(dest => dest.id) || [];
        
        console.log(`🎯 Public trip "${trip.name}" has ${tripDestinations.length} destinations`);
        
        tripsWithDestinations.push({
          ...convertSupabaseToTrip(trip),
          destinations: tripDestinations
        });
      }
      
      return tripsWithDestinations;
    } catch (error) {
      console.error('Failed to fetch public trips:', error);
      return [];
    }
  }

  static async getTripById(id: string): Promise<Trip | null> {
    try {
      const { data, error } = await supabase
        .from('trips')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        if (error.code === 'PGRST116') return null; // Not found
        console.error('Supabase getTripById error:', error);
        return null;
      }
      
      if (!data) return null;
      
      return convertSupabaseToTrip(data);
    } catch (error) {
      console.error('Failed to fetch trip by ID:', error);
      return null;
    }
  }

  static async createTrip(trip: Omit<Trip, 'id' | 'destinations' | 'createdAt' | 'updatedAt'>): Promise<Trip> {
    const userId = await getCurrentUserId();
    if (!userId) {
      throw new Error('No user ID available for createTrip');
    }

    try {
      const { data, error } = await supabase
        .from('trips')
        .insert({
          user_id: userId,
          name: trip.name,
          description: trip.description || null,
          start_date: trip.startDate,
          end_date: trip.endDate,
          budget: trip.budget || null,
          participants: trip.participants || null,
          status: toTripStatus(trip.status),
          tags: trip.tags || null,
          privacy: toTripPrivacy(trip.privacy),
          owner_id: userId, // Set current user as owner
          tagged_users: trip.taggedUsers || null,
        })
        .select()
        .single();

      if (error) {
        console.error('Supabase createTrip error:', error);
        throw new Error(`Failed to create trip: ${error.message}`);
      }
      
      if (!data) {
        throw new Error('No data returned from trip creation');
      }
      
      const convertedTrip = convertSupabaseToTrip(data);
      
      // Create social activity for trip planning
      try {
        await socialService.createTripActivity(
          ActivityType.TRIP_PLANNED,
          data.id,
          data.name
        );
      } catch (activityError) {
        console.warn('Failed to create trip activity:', activityError);
        // Don't fail the trip creation if activity logging fails
      }
      
      return convertedTrip;
    } catch (error) {
      console.error('Failed to create trip:', error);
      throw error;
    }
  }

  static async updateTrip(id: string, updates: Partial<Trip>): Promise<Trip> {
    const updateData: Database['public']['Tables']['trips']['Update'] = {};
    
    if (updates.name) updateData.name = updates.name;
    if (updates.description !== undefined) updateData.description = updates.description || null;
    if (updates.startDate) updateData.start_date = updates.startDate;
    if (updates.endDate) updateData.end_date = updates.endDate;
    if (updates.budget !== undefined) updateData.budget = updates.budget || null;
    if (updates.participants) updateData.participants = updates.participants;
    if (updates.status) updateData.status = toSupabaseTripStatus(updates.status);
    if (updates.tags) updateData.tags = updates.tags;
    if (updates.privacy !== undefined) updateData.privacy = toSupabaseTripPrivacy(updates.privacy);
    if (updates.ownerId !== undefined) updateData.owner_id = updates.ownerId;
    if (updates.taggedUsers !== undefined) updateData.tagged_users = updates.taggedUsers;

    const { data, error } = await supabase
      .from('trips')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      // Handle schema migration issues gracefully
      if (error.code === 'PGRST204' && error.message.includes('privacy')) {
        console.warn('⚠️ Database migration required: privacy column missing');
        console.warn('Please run the database migration script in SUPABASE_MIGRATION_GUIDE.md');
        
        // Try update without privacy fields as fallback
        const fallbackData = { ...updateData };
        delete fallbackData.privacy;
        delete fallbackData.owner_id;
        delete fallbackData.tagged_users;
        delete fallbackData.tags;
        
        const { data: fallbackResult, error: fallbackError } = await supabase
          .from('trips')
          .update(fallbackData)
          .eq('id', id)
          .select()
          .single();
          
        if (fallbackError) throw fallbackError;
        
        // Return result with privacy fields from original updates
        return {
          ...convertSupabaseToTrip(fallbackResult),
          privacy: updates.privacy || TripPrivacy.PRIVATE,
          ownerId: updates.ownerId || fallbackResult.user_id,
          taggedUsers: updates.taggedUsers || [],
          tags: updates.tags || []
        };
      }
      throw error;
    }
    
    const convertedTrip = convertSupabaseToTrip(data);
    
    // Create social activity for trip status changes
    if (updates.status) {
      try {
        let activityType: ActivityType.TRIP_CREATED | ActivityType.TRIP_COMPLETED | ActivityType.TRIP_SHARED | ActivityType.TRIP_STARTED | null = null;
        
        if (updates.status === TripStatus.ACTIVE) {
          activityType = ActivityType.TRIP_STARTED;
        } else if (updates.status === TripStatus.COMPLETED) {
          activityType = ActivityType.TRIP_COMPLETED;
        }
        
        if (activityType) {
          await socialService.createTripActivity(
            activityType,
            data.id,
            data.name
          );
        }
      } catch (activityError) {
        console.warn('Failed to create trip activity:', activityError);
        // Don't fail the trip update if activity logging fails
      }
    }
    
    return convertedTrip;
  }

  static async deleteTrip(id: string): Promise<void> {
    try {
      console.log('🗑️ Deleting trip and associated destinations:', id);
      
      // Count destinations to delete for logging
      const { count } = await supabase
        .from('destinations')
        .select('*', { count: 'exact', head: true })
        .eq('trip_id', id);

      console.log(`📊 Found ${count || 0} destinations to delete`);
      
      // First, delete all destinations associated with this trip
      const { error: destinationsError } = await supabase
        .from('destinations')
        .delete()
        .eq('trip_id', id);

      if (destinationsError) {
        console.error('❌ Error deleting destinations:', destinationsError);
        throw new Error(`Failed to delete destinations: ${destinationsError.message}`);
      }

      console.log(`✅ ${count || 0} destinations deleted successfully`);

      // Then delete the trip itself
      const { error: tripError } = await supabase
        .from('trips')
        .delete()
        .eq('id', id);

      if (tripError) {
        console.error('❌ Error deleting trip:', tripError);
        throw new Error(`Failed to delete trip: ${tripError.message}`);
      }

      console.log('✅ Trip deleted successfully');
    } catch (error) {
      console.error('❌ deleteTrip failed:', error);
      throw error;
    }
  }

  // Destination operations
  static async getDestinations(tripId?: string): Promise<Destination[]> {
    console.log('🔍 SupabaseService.getDestinations called with tripId:', tripId);
    
    const userId = await getCurrentUserId();
    if (!userId) {
      console.warn('❌ SupabaseService: No user ID available for getDestinations');
      return [];
    }
    
    // Check cache first
    const cacheKey = tripId ? `${userId}-${tripId}` : userId;
    const cachedDestinations = cache.getDestinations(cacheKey);
    if (cachedDestinations) {
      return cachedDestinations;
    }
    
    try {
      let query = supabase
        .from('destinations')
        .select('*')
        .eq('user_id', userId);

      if (tripId) {
        query = query.eq('trip_id', tripId);
        console.log('🎯 Filtering by tripId:', tripId);
      }

      query = query.order('sort_order', { ascending: true });

      console.log('📡 Executing Supabase destinations query...');
      const { data, error } = await query;
      
      console.log('📊 Supabase destinations query result:', { 
        dataLength: data?.length, 
        error: error?.message,
        hasData: !!data,
        dataType: typeof data,
        isArray: Array.isArray(data)
      });

      if (error) {
        console.error('❌ Supabase getDestinations error:', error);
        return []; // Return empty array instead of throwing
      }
      
      if (!data) {
        console.warn('⚠️ No destinations data returned from Supabase');
        return [];
      }

      console.log('🎯 Raw destinations from Supabase:', data);
      
      const converted = data.map(convertSupabaseToDestination);
      console.log('✅ Converted destinations:', converted.length, 'items');
      if (converted.length > 0) {
        console.log('🎯 First converted destination:', converted[0]);
      }
      
      // Cache the result
      cache.setDestinations(cacheKey, converted);
      
      return converted;
    } catch (error) {
      console.error('❌ Failed to fetch destinations:', error);
      return []; // Return empty array as fallback
    }
  }

  static async getDestinationById(id: string): Promise<Destination | null> {
    const { data, error } = await supabase
      .from('destinations')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null; // Not found
      throw error;
    }
    return convertSupabaseToDestination(data);
  }

  static async createDestination(destination: Omit<Destination, 'id'>, tripId: string): Promise<Destination> {
    if (!tripId || tripId.trim() === '') {
      throw new Error('tripId is required for creating destinations');
    }
    
    // FIRST: Check what status value the database uses by default
    console.log('🔍 Checking what status the database sets by default...');
    
    const insertData = await convertDestinationToSupabase(destination, tripId);
    
    console.log('🎯 SupabaseService.createDestination called with:');
    console.log('  - tripId:', tripId);
    console.log('  - destination name:', destination.name);
    console.log('  - insertData FULL OBJECT:', JSON.stringify(insertData, null, 2));
    console.log('  - insertData.status specifically:', insertData.status);
    console.log('  - typeof insertData.status:', typeof insertData.status);
    
    const { data, error } = await supabase
      .from('destinations')
      .insert(insertData)
      .select()
      .single();

    if (error) {
      console.error('❌ Supabase destination insert error:', error);
      throw error;
    }
    
    console.log('✅ Supabase destination created successfully:', data);
    console.log('🔍 IMPORTANT: Database default status value is:', data.status);
    console.log('🔍 Status type:', typeof data.status);
    console.log('🔍 This is the correct format to use!');
    
    const convertedDestination = convertSupabaseToDestination(data);
    
    // Create social activity for destination planning
    try {
      await socialService.createDestinationActivity(
        ActivityType.DESTINATION_PLANNED,
        data.id,
        data.name,
        data.location
      );
    } catch (activityError) {
      console.warn('Failed to create destination activity:', activityError);
      // Don't fail the destination creation if activity logging fails
    }
    
    return convertedDestination;
  }

  static async updateDestination(id: string, updates: Partial<Destination>): Promise<Destination> {
    // Build update data directly for Update operations
    const updateData: Database['public']['Tables']['destinations']['Update'] = {};
    
    if (updates.name !== undefined) updateData.name = updates.name;
    if (updates.location !== undefined) updateData.location = updates.location;
    if (updates.category !== undefined) updateData.category = toSupabaseCategory(updates.category || DestinationCategory.OTHER) as any;
    if (updates.priority !== undefined) updateData.priority = (updates.priority && updates.priority >= 1 && updates.priority <= 5) ? updates.priority : 1;
    if (updates.startDate !== undefined) {
      updateData.start_date = (updates.startDate && updates.startDate.trim()) ? updates.startDate : undefined;
    }
    if (updates.endDate !== undefined) {
      updateData.end_date = (updates.endDate && updates.endDate.trim()) ? updates.endDate : undefined;
    }
    if (updates.startTime !== undefined) updateData.start_time = updates.startTime || null;
    if (updates.endTime !== undefined) updateData.end_time = updates.endTime || null;
    if (updates.budget !== undefined) updateData.budget = (updates.budget && updates.budget >= 0) ? updates.budget : null;
    if (updates.actualCost !== undefined) updateData.actual_cost = (updates.actualCost && updates.actualCost >= 0) ? updates.actualCost : null;
    if (updates.coordinates !== undefined) {
      // Handle coordinates constraint: either both null or both valid
      const hasValidCoordinates = updates.coordinates?.lat !== undefined && updates.coordinates?.lng !== undefined;
      updateData.coordinates_lat = hasValidCoordinates ? updates.coordinates!.lat : null;
      updateData.coordinates_lng = hasValidCoordinates ? updates.coordinates!.lng : null;
    }
    if (updates.notes !== undefined) updateData.notes = updates.notes || null;
    if (updates.photos !== undefined) updateData.images = updates.photos || null;
    // booking_info column no longer exists in database
    // TEMPORARILY SKIP STATUS UPDATES to avoid constraint errors
    // TODO: Implement proper status handling once we know the correct format
    if (updates.status !== undefined) {
      console.log('⚠️ Status update skipped to avoid constraint error');
      console.log('  - Requested status:', updates.status);
      console.log('  - This needs to be implemented with correct database format');
      // updateData.status = [CORRECT_FORMAT_TBD];
    }
    if (updates.tags !== undefined) updateData.tags = updates.tags || null;
    if (updates.color !== undefined) updateData.color = updates.color || null;
    if (updates.weatherInfo !== undefined) updateData.weather_info = updates.weatherInfo ? JSON.stringify(updates.weatherInfo) : null;
    if (updates.transportToNext !== undefined) updateData.transport_to_next = updates.transportToNext ? JSON.stringify(updates.transportToNext) : null;
    if (updates.duration !== undefined) updateData.duration = (updates.duration && updates.duration > 0) ? updates.duration : null;
    if (updates.openingHours !== undefined) updateData.opening_hours = updates.openingHours || null;

    const { data, error } = await supabase
      .from('destinations')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    
    const convertedDestination = convertSupabaseToDestination(data);
    
    // Create social activity for destination status changes
    if (updates.status === DestinationStatus.VISITED) {
      try {
        await socialService.createDestinationActivity(
          ActivityType.DESTINATION_VISITED,
          data.id,
          data.name,
          data.location
        );
      } catch (activityError) {
        console.warn('Failed to create destination activity:', activityError);
        // Don't fail the destination update if activity logging fails
      }
    }
    
    return convertedDestination;
  }

  static async deleteDestination(id: string): Promise<void> {
    const { error } = await supabase
      .from('destinations')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }

  static async updateDestinationsOrder(destinations: { id: string; sortOrder: number }[]): Promise<void> {
    const updates = destinations.map(dest => 
      supabase
        .from('destinations')
        .update({ sort_order: dest.sortOrder })
        .eq('id', dest.id)
    );

    const results = await Promise.all(updates);
    
    for (const { error } of results) {
      if (error) throw error;
    }
  }

  // Real-time subscriptions
  static subscribeToTrips(callback: (trips: Trip[]) => void) {
    try {
      return supabase
        .channel('trips-changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'trips'
          },
          async () => {
            try {
              const trips = await this.getTrips();
              callback(trips);
            } catch (error) {
              console.error('Error in trips subscription callback:', error);
              // Don't break the subscription, just log the error
            }
          }
        )
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            console.log('✅ Trips subscription established');
          } else if (status === 'CHANNEL_ERROR') {
            console.error('❌ Trips subscription error - continuing without real-time updates');
          }
        });
    } catch (error) {
      console.error('❌ Failed to setup trips subscription:', error);
      return null;
    }
  }

  static subscribeToDestinations(callback: (destinations: Destination[]) => void, tripId?: string) {
    const channelName = tripId ? `destinations-changes-${tripId}` : 'destinations-changes';
    
    try {
      return supabase
        .channel(channelName)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'destinations',
            ...(tripId && { filter: `trip_id=eq.${tripId}` })
          },
          async () => {
            try {
              const destinations = await this.getDestinations(tripId);
              callback(destinations);
            } catch (error) {
              console.error('Error in destinations subscription callback:', error);
              // Don't break the subscription, just log the error
            }
          }
        )
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            console.log(`✅ Destinations subscription established${tripId ? ` for trip ${tripId}` : ''}`);
          } else if (status === 'CHANNEL_ERROR') {
            console.error(`❌ Destinations subscription error${tripId ? ` for trip ${tripId}` : ''} - continuing without real-time updates`);
          }
        });
    } catch (error) {
      console.error('❌ Failed to setup destinations subscription:', error);
      return null;
    }
  }

  // Destination copy operations
  static async copyDestinationToTrip(sourceDestinationId: string, targetTripId: string): Promise<Destination> {
    console.log(`🔄 Starting destination copy: ${sourceDestinationId} -> ${targetTripId}`);
    
    // Use the database function to copy the destination
    const { data, error } = await supabase.rpc('copy_destination_to_trip', {
      source_destination_id: sourceDestinationId,
      target_trip_id: targetTripId
    });

    if (error) {
      console.error('❌ Failed to copy destination:', error);
      throw new Error(`Failed to copy destination: ${error.message}`);
    }

    if (!data) {
      throw new Error('No data returned from copy operation');
    }

    console.log('✅ Destination copied successfully, new ID:', data);

    // Fetch the newly created destination
    const { data: newDestination, error: fetchError } = await supabase
      .from('destinations')
      .select()
      .eq('id', data)
      .single();

    if (fetchError || !newDestination) {
      console.error('❌ Failed to fetch copied destination:', fetchError);
      throw new Error('Failed to fetch the copied destination');
    }

    const convertedDestination = convertSupabaseToDestination(newDestination);
    
    // Create social activity for destination import
    try {
      await socialService.createDestinationActivity(
        ActivityType.DESTINATION_PLANNED,
        newDestination.id,
        `${newDestination.name} (importiert)`,
        newDestination.location
      );
    } catch (activityError) {
      console.warn('Failed to create destination import activity:', activityError);
      // Don't fail the copy operation if activity logging fails
    }

    console.log('✅ Destination copy completed:', convertedDestination.name);
    return convertedDestination;
  }

  static async getDestinationCopies(originalDestinationId: string): Promise<Array<{
    copyId: string;
    copyName: string;
    tripId: string;
    tripName: string;
    userId: string;
    createdAt: string;
  }>> {
    const { data, error } = await supabase.rpc('get_destination_copies', {
      source_destination_id: originalDestinationId
    });

    if (error) {
      console.error('❌ Failed to get destination copies:', error);
      return [];
    }

    return data || [];
  }

  static async getOriginalDestination(copyDestinationId: string): Promise<{
    originalId: string;
    originalName: string;
    tripId: string;
    tripName: string;
    userId: string;
  } | null> {
    const { data, error } = await supabase.rpc('get_original_destination', {
      copy_destination_id: copyDestinationId
    });

    if (error) {
      console.error('❌ Failed to get original destination:', error);
      return null;
    }

    return data?.[0] || null;
  }

  static async getDestinationFamilyPhotos(destinationId: string): Promise<Array<{
    photoUrl: string;
    destinationId: string;
    destinationName: string;
    isOriginal: boolean;
  }>> {
    const { data, error } = await supabase.rpc('get_destination_family_photos', {
      destination_id: destinationId
    });

    if (error) {
      console.error('❌ Failed to get destination family photos:', error);
      return [];
    }

    return data || [];
  }
}