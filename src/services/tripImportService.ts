import { Trip, Destination, TripPrivacy, TripStatus, DestinationStatus } from '../types';
import { SupabaseService } from './supabaseService';

/**
 * Service for importing public trips into user's personal collection
 */
export class TripImportService {
  /**
   * Import a public trip as a private copy for the current user
   */
  static async importPublicTrip(
    originalTrip: Trip, 
    originalDestinations: Destination[],
    importOptions?: {
      name?: string;
      privacy?: TripPrivacy;
      copyNotes?: boolean;
      copyTags?: boolean;
      copyBudgets?: boolean;
    }
  ): Promise<{ trip: Trip; destinations: Destination[] }> {
    try {
      const options = {
        name: originalTrip.name + ' (Kopie)',
        privacy: TripPrivacy.PRIVATE,
        copyNotes: true,
        copyTags: true,
        copyBudgets: true,
        ...importOptions
      };

      console.log('🔄 Starting trip import:', {
        originalTripId: originalTrip.id,
        originalTripName: originalTrip.name,
        destinationCount: originalDestinations.length,
        options
      });

      // Create new trip data
      const newTripData: Omit<Trip, 'id' | 'destinations' | 'createdAt' | 'updatedAt'> = {
        name: options.name,
        description: originalTrip.description ? 
          `${originalTrip.description}\n\n[Importiert von öffentlicher Reise]` : 
          '[Importiert von öffentlicher Reise]',
        startDate: originalTrip.startDate,
        endDate: originalTrip.endDate,
        budget: options.copyBudgets ? originalTrip.budget : undefined,
        actualCost: 0,
        participants: [], // Start with empty participants for imported trip
        status: TripStatus.PLANNING,
        tags: options.copyTags ? [...(originalTrip.tags || [])] : [],
        coverImage: undefined,
        privacy: options.privacy,
        ownerId: '', // Will be set by service
        taggedUsers: [], // Private by default
        vehicleConfig: originalTrip.vehicleConfig // Copy vehicle config if available
      };

      // Create the new trip
      const newTrip = await SupabaseService.createTrip(newTripData);
      console.log('✅ Trip created:', newTrip.id);

      // Import destinations
      const importedDestinations: Destination[] = [];
      
      for (let i = 0; i < originalDestinations.length; i++) {
        const originalDest = originalDestinations[i];
        
        const newDestData: Omit<Destination, 'id'> = {
          tripId: newTrip.id,
          name: originalDest.name,
          location: originalDest.location,
          coordinates: originalDest.coordinates,
          startDate: originalDest.startDate,
          endDate: originalDest.endDate,
          category: originalDest.category,
          budget: options.copyBudgets ? originalDest.budget : undefined,
          actualCost: undefined,
          notes: options.copyNotes ? originalDest.notes : undefined,
          photos: [], // Start with empty photos array
          bookingInfo: undefined,
          status: DestinationStatus.PLANNED, // Reset status to planned for imported destinations
          tags: options.copyTags ? [...originalDest.tags] : [],
          color: originalDest.color,
          startTime: originalDest.startTime,
          endTime: originalDest.endTime,
          weatherInfo: undefined,
          transportToNext: undefined,
          website: originalDest.website,
          phoneNumber: originalDest.phoneNumber,
          address: originalDest.address,
          openingHours: originalDest.openingHours,
          returnDestinationId: undefined, // Reset return destination references
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };

        const newDestination = await SupabaseService.createDestination(newDestData, newTrip.id);
        importedDestinations.push(newDestination);
        
        console.log(`✅ Destination ${i + 1}/${originalDestinations.length} imported:`, newDestination.name);
      }

      console.log('🎉 Trip import completed successfully:', {
        newTripId: newTrip.id,
        importedDestinations: importedDestinations.length
      });

      // Return the trip with destinations properly populated
      return {
        trip: { ...newTrip, destinations: importedDestinations.map(d => d.id) },
        destinations: importedDestinations
      };

    } catch (error) {
      console.error('❌ Trip import failed:', error);
      throw new Error(`Fehler beim Importieren der Reise: ${error instanceof Error ? error.message : 'Unbekannter Fehler'}`);
    }
  }

  /**
   * Clone a trip within the same user account (for duplicating existing trips)
   */
  static async cloneTrip(
    originalTrip: Trip,
    originalDestinations: Destination[],
    cloneOptions?: {
      name?: string;
      adjustDates?: boolean;
      dateOffset?: number; // Days to add to all dates
    }
  ): Promise<{ trip: Trip; destinations: Destination[] }> {
    try {
      const options = {
        name: originalTrip.name + ' (Klon)',
        adjustDates: false,
        dateOffset: 0,
        ...cloneOptions
      };

      console.log('🔄 Starting trip clone:', {
        originalTripId: originalTrip.id,
        options
      });

      // Calculate date adjustments if needed
      const adjustDate = (dateString: string): string => {
        if (!options.adjustDates || options.dateOffset === 0) return dateString;
        
        const date = new Date(dateString);
        date.setDate(date.getDate() + options.dateOffset);
        return date.toISOString().split('T')[0];
      };

      // Create cloned trip
      const clonedTripData: Omit<Trip, 'id' | 'destinations' | 'createdAt' | 'updatedAt'> = {
        name: options.name,
        description: originalTrip.description,
        startDate: adjustDate(originalTrip.startDate),
        endDate: adjustDate(originalTrip.endDate),
        budget: originalTrip.budget,
        actualCost: originalTrip.actualCost,
        participants: [...originalTrip.participants],
        status: originalTrip.status,
        tags: [...(originalTrip.tags || [])],
        coverImage: originalTrip.coverImage,
        privacy: originalTrip.privacy,
        ownerId: originalTrip.ownerId,
        taggedUsers: [...(originalTrip.taggedUsers || [])],
        vehicleConfig: originalTrip.vehicleConfig
      };

      const clonedTrip = await SupabaseService.createTrip(clonedTripData);
      console.log('✅ Trip cloned:', clonedTrip.id);

      // Clone destinations with date adjustments
      const clonedDestinations: Destination[] = [];
      
      for (const originalDest of originalDestinations) {
        const clonedDestData: Omit<Destination, 'id'> = {
          tripId: clonedTrip.id,
          name: originalDest.name,
          location: originalDest.location,
          coordinates: originalDest.coordinates,
          startDate: adjustDate(originalDest.startDate),
          endDate: adjustDate(originalDest.endDate),
          category: originalDest.category,
          budget: originalDest.budget,
          actualCost: originalDest.actualCost,
          notes: originalDest.notes,
          photos: [...originalDest.photos],
          bookingInfo: originalDest.bookingInfo,
          status: originalDest.status,
          tags: [...originalDest.tags],
          color: originalDest.color,
          startTime: originalDest.startTime,
          endTime: originalDest.endTime,
          weatherInfo: originalDest.weatherInfo,
          transportToNext: originalDest.transportToNext,
          website: originalDest.website,
          phoneNumber: originalDest.phoneNumber,
          address: originalDest.address,
          openingHours: originalDest.openingHours,
          returnDestinationId: originalDest.returnDestinationId,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };

        const clonedDestination = await SupabaseService.createDestination(clonedDestData, clonedTrip.id);
        clonedDestinations.push(clonedDestination);
      }

      return {
        trip: { ...clonedTrip, destinations: clonedDestinations.map(d => d.id) },
        destinations: clonedDestinations
      };

    } catch (error) {
      console.error('❌ Trip clone failed:', error);
      throw new Error(`Fehler beim Klonen der Reise: ${error instanceof Error ? error.message : 'Unbekannter Fehler'}`);
    }
  }

  /**
   * Get import preview information
   */
  static getImportPreview(trip: Trip, destinations: Destination[]) {
    const totalBudget = destinations.reduce((sum, dest) => sum + (dest.budget || 0), 0);
    const categoryCounts = destinations.reduce((acc, dest) => {
      acc[dest.category] = (acc[dest.category] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const tripDuration = Math.ceil(
      (new Date(trip.endDate).getTime() - new Date(trip.startDate).getTime()) / (1000 * 60 * 60 * 24)
    ) + 1;

    return {
      tripName: trip.name,
      description: trip.description,
      duration: tripDuration,
      destinationCount: destinations.length,
      totalBudget,
      categoryCounts,
      participants: trip.participants?.length || 0,
      tags: trip.tags?.length || 0,
      dateRange: {
        start: trip.startDate,
        end: trip.endDate
      },
      hasNotes: destinations.some(dest => dest.notes && dest.notes.trim()),
      hasBudgets: destinations.some(dest => dest.budget && dest.budget > 0),
      hasCoordinates: destinations.some(dest => dest.coordinates)
    };
  }

  /**
   * Validate if a trip can be imported
   */
  static validateImport(trip: Trip, destinations: Destination[]): {
    canImport: boolean;
    issues: string[];
    warnings: string[];
  } {
    const issues: string[] = [];
    const warnings: string[] = [];

    // Check if trip is public
    if (trip.privacy !== TripPrivacy.PUBLIC) {
      issues.push('Die Reise ist nicht öffentlich und kann nicht importiert werden.');
    }

    // Check if trip has destinations
    if (destinations.length === 0) {
      issues.push('Die Reise enthält keine Ziele.');
    }

    // Check for missing coordinates
    const destinationsWithoutCoordinates = destinations.filter(dest => !dest.coordinates);
    if (destinationsWithoutCoordinates.length > 0) {
      warnings.push(`${destinationsWithoutCoordinates.length} Ziel(e) haben keine Koordinaten.`);
    }

    // Check for very old trips
    const tripDate = new Date(trip.startDate);
    const twoYearsAgo = new Date();
    twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2);
    
    if (tripDate < twoYearsAgo) {
      warnings.push('Diese Reise ist älter als 2 Jahre. Informationen könnten veraltet sein.');
    }

    // Check for very large trips
    if (destinations.length > 50) {
      warnings.push('Diese Reise hat sehr viele Ziele. Der Import könnte etwas dauern.');
    }

    return {
      canImport: issues.length === 0,
      issues,
      warnings
    };
  }
}

export default TripImportService;