import { supabase, isUsingPlaceholderCredentials } from '../lib/supabase';
import { Database, Tables } from '../types/supabase';
import { Destination, Trip, TripPrivacy, DestinationCategory, DestinationStatus } from '../types';
import { withErrorHandling, createError, ErrorMessages } from '../utils/errorHandling';
import { 
  toDestinationCategory, 
  toDestinationStatus, 
  toTripStatus, 
  toTripPrivacy,
  toSupabaseCategory,
  toSupabaseStatus,
  toSupabaseTripStatus,
  safeJsonParse,
  isArray
} from '../utils/typeGuards';

// Type aliases for better readability
type SupabaseDestination = Tables<'destinations'>;
type SupabaseTrip = Tables<'trips'>;

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
  bookingInfo: dest.booking_info || '',
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
  
  // Ensure valid status 
  const validStatus = dest.status && Object.values(DestinationStatus).includes(dest.status as DestinationStatus) 
    ? dest.status 
    : DestinationStatus.PLANNED;
  
  const supabaseStatus = toSupabaseStatus(validStatus);
  
  console.log('🔍 Status conversion debug:');
  console.log('  - Original status:', dest.status);
  console.log('  - Valid status:', validStatus);
  console.log('  - Supabase status:', supabaseStatus);
  
  return {
    ...(dest.id && { id: dest.id }),
    user_id: userId,
    trip_id: tripId, // Required field - must not be null
    name: dest.name || '',
    location: dest.location || '',
    category: toSupabaseCategory(dest.category || DestinationCategory.OTHER) as any,
    start_date: (dest.startDate && dest.startDate.trim()) ? dest.startDate : currentDate,
    end_date: (dest.endDate && dest.endDate.trim()) ? dest.endDate : currentDate,
    start_time: dest.startTime || null,
    end_time: dest.endTime || null,
    budget: dest.budget || null,
    actual_cost: dest.actualCost || null,
    coordinates_lat: dest.coordinates?.lat || null,
    coordinates_lng: dest.coordinates?.lng || null,
    notes: dest.notes || null,
    images: dest.photos || null,
    booking_info: dest.bookingInfo || null,
    status: supabaseStatus,
    tags: dest.tags || null,
    color: dest.color || null,
    weather_info: dest.weatherInfo ? JSON.stringify(dest.weatherInfo) : null,
    transport_to_next: dest.transportToNext ? JSON.stringify(dest.transportToNext) : null,
    duration: dest.duration || 120,
    opening_hours: dest.openingHours || null,
    sort_order: 0,
  };
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
  // Trip operations
  static async getTrips(): Promise<Trip[]> {
    const userId = await getCurrentUserId();
    if (!userId) {
      console.warn('❌ SupabaseService: No user ID available for getTrips');
      return [];
    }

    try {
      const { data, error } = await supabase
        .from('trips')
        .select('*')
        .or(`user_id.eq.${userId},participants.cs.{${userId}}`)
        .order('created_at', { ascending: false });

      // Handle case where table doesn't exist or data is null
      if (error) {
        console.error('Supabase getTrips error:', error);
        // Return empty array instead of throwing
        return [];
      }
      
      if (!data) {
        console.warn('No trips data returned from Supabase');
        return [];
      }

      // Get all destinations to populate trip.destinations arrays
      console.log('🔗 Populating trips with destination IDs...');
      
      const tripsWithDestinations = [];
      for (const trip of data) {
        // Get destination IDs for this trip
        const { data: rawDestinations } = await supabase
          .from('destinations')
          .select('id, trip_id')
          .eq('trip_id', trip.id);
        
        const tripDestinations = rawDestinations?.map(dest => dest.id) || [];
        
        console.log(`🎯 Trip "${trip.name}" has ${tripDestinations.length} destinations:`, tripDestinations);
        
        tripsWithDestinations.push({
          ...convertSupabaseToTrip(trip),
          destinations: tripDestinations
        });
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
      
      return convertSupabaseToTrip(data);
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
    if (updates.privacy !== undefined) updateData.privacy = toTripPrivacy(updates.privacy);
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
    return convertSupabaseToTrip(data);
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
    
    const insertData = await convertDestinationToSupabase(destination, tripId);
    
    console.log('🎯 SupabaseService.createDestination called with:');
    console.log('  - tripId:', tripId);
    console.log('  - destination name:', destination.name);
    console.log('  - insertData:', insertData);
    
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
    return convertSupabaseToDestination(data);
  }

  static async updateDestination(id: string, updates: Partial<Destination>): Promise<Destination> {
    // Build update data directly for Update operations
    const updateData: Database['public']['Tables']['destinations']['Update'] = {};
    
    if (updates.name !== undefined) updateData.name = updates.name;
    if (updates.location !== undefined) updateData.location = updates.location;
    if (updates.category !== undefined) updateData.category = toSupabaseCategory(updates.category || DestinationCategory.OTHER) as any;
    if (updates.startDate !== undefined) {
      updateData.start_date = (updates.startDate && updates.startDate.trim()) ? updates.startDate : undefined;
    }
    if (updates.endDate !== undefined) {
      updateData.end_date = (updates.endDate && updates.endDate.trim()) ? updates.endDate : undefined;
    }
    if (updates.startTime !== undefined) updateData.start_time = updates.startTime || null;
    if (updates.endTime !== undefined) updateData.end_time = updates.endTime || null;
    if (updates.budget !== undefined) updateData.budget = updates.budget || null;
    if (updates.actualCost !== undefined) updateData.actual_cost = updates.actualCost || null;
    if (updates.coordinates !== undefined) {
      updateData.coordinates_lat = updates.coordinates?.lat || null;
      updateData.coordinates_lng = updates.coordinates?.lng || null;
    }
    if (updates.notes !== undefined) updateData.notes = updates.notes || null;
    if (updates.photos !== undefined) updateData.images = updates.photos || null;
    if (updates.bookingInfo !== undefined) updateData.booking_info = updates.bookingInfo || null;
    if (updates.status !== undefined) updateData.status = toSupabaseStatus(updates.status || DestinationStatus.PLANNED);
    if (updates.tags !== undefined) updateData.tags = updates.tags || null;
    if (updates.color !== undefined) updateData.color = updates.color || null;
    if (updates.weatherInfo !== undefined) updateData.weather_info = updates.weatherInfo ? JSON.stringify(updates.weatherInfo) : null;
    if (updates.transportToNext !== undefined) updateData.transport_to_next = updates.transportToNext ? JSON.stringify(updates.transportToNext) : null;
    if (updates.duration !== undefined) updateData.duration = updates.duration || null;
    if (updates.openingHours !== undefined) updateData.opening_hours = updates.openingHours || null;

    const { data, error } = await supabase
      .from('destinations')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return convertSupabaseToDestination(data);
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
            console.error('Error in trips subscription:', error);
            // Don't break the subscription, just log the error
          }
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('✅ Trips subscription established');
        } else if (status === 'CHANNEL_ERROR') {
          console.error('❌ Trips subscription error');
        }
      });
  }

  static subscribeToDestinations(callback: (destinations: Destination[]) => void, tripId?: string) {
    const channelName = tripId ? `destinations-changes-${tripId}` : 'destinations-changes';
    
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
            console.error('Error in destinations subscription:', error);
            // Don't break the subscription, just log the error
          }
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log(`✅ Destinations subscription established${tripId ? ` for trip ${tripId}` : ''}`);
        } else if (status === 'CHANNEL_ERROR') {
          console.error(`❌ Destinations subscription error${tripId ? ` for trip ${tripId}` : ''}`);
        }
      });
  }
}