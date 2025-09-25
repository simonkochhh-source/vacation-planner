import { supabase } from '../lib/supabase';
import { Coordinates } from '../types';

export interface PhotoInfo {
  id: string;
  url: string;
  file?: File;
  name: string;
  size: number;
  type: string;
  uploadedAt: string;
  caption?: string;
  tags?: string[];
  location?: {
    lat: number;
    lng: number;
  };
  metadata?: {
    width?: number;
    height?: number;
    camera?: string;
    dateTaken?: string;
  };
}

// Supabase-compatible photo interface
export interface TripPhoto {
  id: string;
  trip_id: string;
  destination_id: string;
  user_id: string;
  file_name: string;
  file_size: number;
  file_type: string;
  storage_path: string;
  photo_url: string; // Public URL stored in database
  caption?: string;
  location_name?: string;
  coordinates?: Coordinates;
  taken_at?: string;
  privacy: 'private' | 'public';
  privacy_approved_at?: string;
  created_at: string;
  updated_at: string;
  url?: string; // Computed public URL (for backward compatibility)
}

export interface PhotoUploadOptions {
  tripId: string;
  destinationId: string;
  file: File;
  caption?: string;
  coordinates?: Coordinates;
  locationName?: string;
  takenAt?: Date;
}

export interface PhotoUploadProgress {
  photoId: string;
  progress: number;
  status: 'uploading' | 'completed' | 'error';
  error?: string;
}

export class PhotoService {
  private static readonly MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
  private static readonly ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/heic'];
  private static readonly STORAGE_KEY = 'vacation_planner_photos';
  private static readonly BUCKET_NAME = 'trip-photos';
  
  // Mode toggle for development vs production  
  private static readonly USE_SUPABASE = true; // Force Supabase for privacy features

  // Validate photo file
  static validatePhoto(file: File): { isValid: boolean; error?: string } {
    if (!this.ALLOWED_TYPES.includes(file.type)) {
      return {
        isValid: false,
        error: `Dateityp ${file.type} wird nicht unterstützt. Erlaubt: JPEG, PNG, WebP, HEIC`
      };
    }

    if (file.size > this.MAX_FILE_SIZE) {
      return {
        isValid: false,
        error: `Datei zu groß (${this.formatFileSize(file.size)}). Maximum: ${this.formatFileSize(this.MAX_FILE_SIZE)}`
      };
    }

    return { isValid: true };
  }

  // Upload photos (simulate cloud upload with localStorage for demo)
  static async uploadPhotos(
    files: FileList | File[],
    destinationId: string,
    onProgress?: (progress: PhotoUploadProgress) => void
  ): Promise<PhotoInfo[]> {
    const fileArray = Array.from(files);
    const uploadedPhotos: PhotoInfo[] = [];

    for (const file of fileArray) {
      const validation = this.validatePhoto(file);
      if (!validation.isValid) {
        onProgress?.({
          photoId: this.generatePhotoId(),
          progress: 0,
          status: 'error',
          error: validation.error
        });
        continue;
      }

      const photoId = this.generatePhotoId();
      
      onProgress?.({
        photoId,
        progress: 0,
        status: 'uploading'
      });

      try {
        // Immediate progress without artificial delays
        onProgress?.({
          photoId,
          progress: 50,
          status: 'uploading'
        });

        // Process image and create thumbnail
        const processedImage = await this.processImage(file);
        const metadata = await this.extractMetadata(file);

        const photoInfo: PhotoInfo = {
          id: photoId,
          url: processedImage.url,
          file,
          name: file.name,
          size: file.size,
          type: file.type,
          uploadedAt: new Date().toISOString(),
          metadata
        };

        // Save to localStorage (in production, this would be cloud storage)
        this.savePhotoToStorage(destinationId, photoInfo);
        uploadedPhotos.push(photoInfo);

        onProgress?.({
          photoId,
          progress: 100,
          status: 'completed'
        });

      } catch (error) {
        onProgress?.({
          photoId,
          progress: 0,
          status: 'error',
          error: 'Upload fehlgeschlagen'
        });
      }
    }

    return uploadedPhotos;
  }

  // Get photos for a destination
  static getPhotosForDestination(destinationId: string): PhotoInfo[] {
    const stored = localStorage.getItem(`${this.STORAGE_KEY}_${destinationId}`);
    return stored ? JSON.parse(stored) : [];
  }

  // Update photo (caption, tags, etc.)
  static updatePhoto(destinationId: string, photoId: string, updates: Partial<PhotoInfo>): void {
    const photos = this.getPhotosForDestination(destinationId);
    const photoIndex = photos.findIndex(p => p.id === photoId);
    
    if (photoIndex !== -1) {
      photos[photoIndex] = { ...photos[photoIndex], ...updates };
      localStorage.setItem(`${this.STORAGE_KEY}_${destinationId}`, JSON.stringify(photos));
    }
  }

  // Delete photo
  static deletePhoto(destinationId: string, photoId: string): void {
    const photos = this.getPhotosForDestination(destinationId);
    const filteredPhotos = photos.filter(p => p.id !== photoId);
    localStorage.setItem(`${this.STORAGE_KEY}_${destinationId}`, JSON.stringify(filteredPhotos));
  }

  // Reorder photos
  static reorderPhotos(destinationId: string, photoIds: string[]): void {
    const photos = this.getPhotosForDestination(destinationId);
    const reorderedPhotos = photoIds
      .map(id => photos.find(p => p.id === id))
      .filter(p => p) as PhotoInfo[];
    
    localStorage.setItem(`${this.STORAGE_KEY}_${destinationId}`, JSON.stringify(reorderedPhotos));
  }

  // Create thumbnail
  static async createThumbnail(file: File, maxSize: number = 200): Promise<string> {
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d')!;
      const img = new Image();

      img.onload = () => {
        const { width, height } = this.calculateThumbnailSize(img.width, img.height, maxSize);
        
        canvas.width = width;
        canvas.height = height;
        
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', 0.8));
      };

      img.src = URL.createObjectURL(file);
    });
  }

  // Process image (create data URL for preview)
  private static async processImage(file: File): Promise<{ url: string; thumbnail: string }> {
    const url = URL.createObjectURL(file);
    const thumbnail = await this.createThumbnail(file);
    
    return { url, thumbnail };
  }

  // Extract image metadata
  private static async extractMetadata(file: File): Promise<PhotoInfo['metadata']> {
    return new Promise((resolve) => {
      const img = new Image();
      
      img.onload = () => {
        resolve({
          width: img.width,
          height: img.height,
          dateTaken: file.lastModified ? new Date(file.lastModified).toISOString() : undefined
        });
      };
      
      img.onerror = () => resolve({});
      img.src = URL.createObjectURL(file);
    });
  }

  // Calculate thumbnail dimensions
  private static calculateThumbnailSize(originalWidth: number, originalHeight: number, maxSize: number) {
    const aspectRatio = originalWidth / originalHeight;
    
    if (originalWidth > originalHeight) {
      return {
        width: maxSize,
        height: Math.round(maxSize / aspectRatio)
      };
    } else {
      return {
        width: Math.round(maxSize * aspectRatio),
        height: maxSize
      };
    }
  }

  // Save photo to localStorage
  private static savePhotoToStorage(destinationId: string, photo: PhotoInfo): void {
    const existingPhotos = this.getPhotosForDestination(destinationId);
    existingPhotos.push(photo);
    localStorage.setItem(`${this.STORAGE_KEY}_${destinationId}`, JSON.stringify(existingPhotos));
  }

  // Generate unique photo ID
  private static generatePhotoId(): string {
    return `photo_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
  }

  // Format file size
  static formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  // Get all photos for export
  static getAllPhotos(): Map<string, PhotoInfo[]> {
    const allPhotos = new Map<string, PhotoInfo[]>();
    
    // Scan localStorage for all photo collections
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith(this.STORAGE_KEY)) {
        const destinationId = key.replace(`${this.STORAGE_KEY}_`, '');
        const photos = this.getPhotosForDestination(destinationId);
        if (photos.length > 0) {
          allPhotos.set(destinationId, photos);
        }
      }
    }
    
    return allPhotos;
  }

  // Bulk photo operations
  static async bulkDeletePhotos(destinationId: string, photoIds: string[]): Promise<void> {
    const photos = this.getPhotosForDestination(destinationId);
    const remainingPhotos = photos.filter(p => !photoIds.includes(p.id));
    localStorage.setItem(`${this.STORAGE_KEY}_${destinationId}`, JSON.stringify(remainingPhotos));
  }

  static async bulkUpdatePhotos(
    destinationId: string, 
    updates: Array<{ photoId: string; data: Partial<PhotoInfo> }>
  ): Promise<void> {
    const photos = this.getPhotosForDestination(destinationId);
    
    updates.forEach(({ photoId, data }) => {
      const photoIndex = photos.findIndex(p => p.id === photoId);
      if (photoIndex !== -1) {
        photos[photoIndex] = { ...photos[photoIndex], ...data };
      }
    });
    
    localStorage.setItem(`${this.STORAGE_KEY}_${destinationId}`, JSON.stringify(photos));
  }

  // Photo search and filtering
  static searchPhotos(destinationId: string, query: string): PhotoInfo[] {
    const photos = this.getPhotosForDestination(destinationId);
    const searchTerm = query.toLowerCase();
    
    return photos.filter(photo => 
      photo.name.toLowerCase().includes(searchTerm) ||
      photo.caption?.toLowerCase().includes(searchTerm) ||
      photo.tags?.some(tag => tag.toLowerCase().includes(searchTerm))
    );
  }

  // Clear all photos (for cleanup/testing)
  static clearAllPhotos(): void {
    const keysToRemove: string[] = [];
    
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith(this.STORAGE_KEY)) {
        keysToRemove.push(key);
      }
    }
    
    keysToRemove.forEach(key => localStorage.removeItem(key));
  }

  // ===== SUPABASE INTEGRATION METHODS =====

  /**
   * Upload a photo to Supabase Storage and create database record
   */
  static async uploadPhotoToSupabase(options: PhotoUploadOptions): Promise<TripPhoto> {
    const { tripId, destinationId, file, caption, coordinates, locationName, takenAt } = options;
    
    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      throw new Error('User not authenticated');
    }

    // Validate file
    const validation = this.validatePhoto(file);
    if (!validation.isValid) {
      throw new Error(validation.error);
    }

    // Generate unique file path: userId/tripId/destinationId/timestamp_filename
    const timestamp = Date.now();
    const fileName = `${timestamp}_${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
    const storagePath = `${user.id}/${tripId}/${destinationId}/${fileName}`;

    try {
      // Upload file to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from(this.BUCKET_NAME)
        .upload(storagePath, file, {
          cacheControl: '3600',
          upsert: false,
          contentType: file.type
        });

      if (uploadError) {
        console.error('Photo upload error:', uploadError);
        throw new Error(`Failed to upload photo: ${uploadError.message}`);
      }

      // Generate the public URL for the uploaded photo
      const photoUrl = this.getSupabasePublicUrl(storagePath);

      // Create database record
      const photoData = {
        trip_id: tripId,
        destination_id: destinationId,
        user_id: user.id,
        file_name: file.name,
        file_size: file.size,
        file_type: file.type,
        storage_path: storagePath,
        photo_url: photoUrl,
        caption,
        location_name: locationName,
        coordinates: coordinates ? JSON.stringify(coordinates) : null,
        taken_at: takenAt?.toISOString()
      };

      const { data: photoRecord, error: dbError } = await supabase
        .from('trip_photos')
        .insert(photoData)
        .select()
        .single();

      if (dbError) {
        // Clean up uploaded file if database insert fails
        await this.deleteSupabaseStorageFile(storagePath);
        throw new Error(`Failed to save photo metadata: ${dbError.message}`);
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from(this.BUCKET_NAME)
        .getPublicUrl(storagePath);

      return {
        ...photoRecord,
        coordinates: photoRecord.coordinates ? JSON.parse(photoRecord.coordinates) : undefined,
        url: urlData.publicUrl
      };

    } catch (error) {
      console.error('PhotoService.uploadPhotoToSupabase error:', error);
      throw error;
    }
  }

  /**
   * Get all photos for a trip from Supabase
   */
  static async getSupabasePhotosForTrip(tripId: string): Promise<TripPhoto[]> {
    try {
      const { data, error } = await supabase
        .from('trip_photos')
        .select(`
          *,
          destinations!inner(name, location)
        `)
        .eq('trip_id', tripId)
        .order('taken_at', { ascending: false });

      if (error) {
        throw new Error(`Failed to fetch trip photos: ${error.message}`);
      }

      // Add public URLs and parse coordinates
      return data.map((photo: any) => ({
        ...photo,
        coordinates: photo.coordinates ? JSON.parse(photo.coordinates) : undefined,
        url: this.getSupabasePublicUrl(photo.storage_path)
      }));

    } catch (error) {
      console.error('PhotoService.getSupabasePhotosForTrip error:', error);
      throw error;
    }
  }

  /**
   * Get photos for a specific destination from Supabase
   */
  static async getSupabasePhotosForDestination(destinationId: string): Promise<TripPhoto[]> {
    try {
      const { data, error } = await supabase
        .from('trip_photos')
        .select('*')
        .eq('destination_id', destinationId)
        .order('taken_at', { ascending: false });

      if (error) {
        throw new Error(`Failed to fetch destination photos: ${error.message}`);
      }

      return data.map((photo: any) => ({
        ...photo,
        coordinates: photo.coordinates ? JSON.parse(photo.coordinates) : undefined,
        url: this.getSupabasePublicUrl(photo.storage_path)
      }));

    } catch (error) {
      console.error('PhotoService.getSupabasePhotosForDestination error:', error);
      throw error;
    }
  }

  /**
   * Update photo metadata in Supabase
   */
  static async updateSupabasePhoto(photoId: string, updates: Partial<Pick<TripPhoto, 'caption' | 'location_name' | 'coordinates' | 'privacy'>>): Promise<TripPhoto> {
    try {
      const updateData: any = { ...updates };
      
      // Convert coordinates to JSON string if provided
      if (updates.coordinates) {
        updateData.coordinates = JSON.stringify(updates.coordinates);
      }
      
      // Set privacy approval timestamp when changing to public
      if (updates.privacy === 'public') {
        updateData.privacy_approved_at = new Date().toISOString();
      }

      const { data, error } = await supabase
        .from('trip_photos')
        .update(updateData)
        .eq('id', photoId)
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to update photo: ${error.message}`);
      }

      return {
        ...data,
        coordinates: data.coordinates ? JSON.parse(data.coordinates) : undefined,
        url: this.getSupabasePublicUrl(data.storage_path)
      };

    } catch (error) {
      console.error('PhotoService.updateSupabasePhoto error:', error);
      throw error;
    }
  }

  /**
   * Delete a photo from Supabase
   */
  static async deleteSupabasePhoto(photoId: string): Promise<void> {
    try {
      // First get the photo record to get storage path
      const { data: photo, error: fetchError } = await supabase
        .from('trip_photos')
        .select('storage_path')
        .eq('id', photoId)
        .single();

      if (fetchError) {
        throw new Error(`Failed to fetch photo: ${fetchError.message}`);
      }

      // Delete from storage
      await this.deleteSupabaseStorageFile(photo.storage_path);

      // Delete database record
      const { error: deleteError } = await supabase
        .from('trip_photos')
        .delete()
        .eq('id', photoId);

      if (deleteError) {
        throw new Error(`Failed to delete photo record: ${deleteError.message}`);
      }

    } catch (error) {
      console.error('PhotoService.deleteSupabasePhoto error:', error);
      throw error;
    }
  }

  /**
   * Get photo statistics for a trip from Supabase
   */
  static async getSupabaseTripPhotoStats(tripId: string): Promise<{ totalPhotos: number; photosByDestination: Record<string, number> }> {
    try {
      const { data, error } = await supabase
        .from('trip_photos')
        .select('destination_id')
        .eq('trip_id', tripId);

      if (error) {
        throw new Error(`Failed to fetch photo stats: ${error.message}`);
      }

      const photosByDestination: Record<string, number> = {};
      data.forEach((photo: any) => {
        photosByDestination[photo.destination_id] = (photosByDestination[photo.destination_id] || 0) + 1;
      });

      return {
        totalPhotos: data.length,
        photosByDestination
      };

    } catch (error) {
      console.error('PhotoService.getSupabaseTripPhotoStats error:', error);
      throw error;
    }
  }

  /**
   * Upload multiple photos in batch to Supabase
   */
  static async uploadSupabasePhotos(photos: PhotoUploadOptions[]): Promise<TripPhoto[]> {
    const results: TripPhoto[] = [];
    const errors: string[] = [];

    for (const photoOptions of photos) {
      try {
        const uploadedPhoto = await this.uploadPhotoToSupabase(photoOptions);
        results.push(uploadedPhoto);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        errors.push(`${photoOptions.file.name}: ${errorMessage}`);
      }
    }

    if (errors.length > 0) {
      console.warn('Some photos failed to upload:', errors);
    }

    return results;
  }

  /**
   * Update privacy settings for multiple photos
   */
  static async updatePhotosPrivacy(photoIds: string[], privacy: 'private' | 'public'): Promise<void> {
    try {
      console.log('🔄 PhotoService.updatePhotosPrivacy called with:', { photoIds, privacy });
      
      const updateData: any = { privacy };
      
      // Set approval timestamp when making public
      if (privacy === 'public') {
        updateData.privacy_approved_at = new Date().toISOString();
      }

      console.log('📝 Update data:', updateData);

      const { data, error } = await supabase
        .from('trip_photos')
        .update(updateData)
        .in('id', photoIds)
        .select();

      console.log('📊 Supabase response:', { data, error });

      if (error) {
        console.error('❌ Supabase error:', error);
        throw new Error(`Failed to update photo privacy: ${error.message}`);
      }

      console.log('✅ Privacy update successful:', data);

    } catch (error) {
      console.error('💥 PhotoService.updatePhotosPrivacy error:', error);
      throw error;
    }
  }

  /**
   * Get photos filtered by privacy level
   */
  static async getPhotosByPrivacy(tripId: string, privacy?: 'private' | 'public'): Promise<TripPhoto[]> {
    try {
      let query = supabase
        .from('trip_photos')
        .select('*')
        .eq('trip_id', tripId);

      if (privacy) {
        query = query.eq('privacy', privacy);
      }

      const { data, error } = await query.order('taken_at', { ascending: false });

      if (error) {
        throw new Error(`Failed to fetch photos by privacy: ${error.message}`);
      }

      return data.map((photo: any) => ({
        ...photo,
        coordinates: photo.coordinates ? JSON.parse(photo.coordinates) : undefined,
        url: this.getSupabasePublicUrl(photo.storage_path)
      }));

    } catch (error) {
      console.error('PhotoService.getPhotosByPrivacy error:', error);
      throw error;
    }
  }

  /**
   * Get public photos for a specific public trip
   */
  static async getPublicPhotosForTrip(tripId: string): Promise<TripPhoto[]> {
    try {
      const { data, error } = await supabase
        .from('trip_photos')
        .select(`
          *,
          destinations!inner(name, location, category)
        `)
        .eq('trip_id', tripId)
        .eq('privacy', 'public')
        .order('taken_at', { ascending: false });

      if (error) {
        throw new Error(`Failed to fetch public trip photos: ${error.message}`);
      }

      return data.map((photo: any) => ({
        ...photo,
        coordinates: photo.coordinates ? JSON.parse(photo.coordinates) : undefined,
        url: this.getSupabasePublicUrl(photo.storage_path)
      }));

    } catch (error) {
      console.error('PhotoService.getPublicPhotosForTrip error:', error);
      throw error;
    }
  }

  /**
   * Get public photos grouped by destination for a public trip
   */
  static async getPublicPhotosGroupedByDestination(tripId: string): Promise<Record<string, TripPhoto[]>> {
    try {
      const photos = await this.getPublicPhotosForTrip(tripId);
      
      // Group photos by destination_id
      const grouped: Record<string, TripPhoto[]> = {};
      photos.forEach(photo => {
        if (!grouped[photo.destination_id]) {
          grouped[photo.destination_id] = [];
        }
        grouped[photo.destination_id].push(photo);
      });

      return grouped;

    } catch (error) {
      console.error('PhotoService.getPublicPhotosGroupedByDestination error:', error);
      throw error;
    }
  }

  /**
   * Get photo statistics for a public trip
   */
  static async getPublicTripPhotoStats(tripId: string): Promise<{ totalPhotos: number; photosByDestination: Record<string, number> }> {
    try {
      const { data, error } = await supabase
        .from('trip_photos')
        .select('destination_id')
        .eq('trip_id', tripId)
        .eq('privacy', 'public');

      if (error) {
        throw new Error(`Failed to fetch public photo stats: ${error.message}`);
      }

      const photosByDestination: Record<string, number> = {};
      data.forEach((photo: any) => {
        photosByDestination[photo.destination_id] = (photosByDestination[photo.destination_id] || 0) + 1;
      });

      return {
        totalPhotos: data.length,
        photosByDestination
      };

    } catch (error) {
      console.error('PhotoService.getPublicTripPhotoStats error:', error);
      throw error;
    }
  }

  /**
   * Get public URL for a storage path in Supabase
   */
  private static getSupabasePublicUrl(storagePath: string): string {
    const { data } = supabase.storage
      .from(this.BUCKET_NAME)
      .getPublicUrl(storagePath);
    
    return data.publicUrl;
  }

  /**
   * Delete file from Supabase storage
   */
  private static async deleteSupabaseStorageFile(storagePath: string): Promise<void> {
    const { error } = await supabase.storage
      .from(this.BUCKET_NAME)
      .remove([storagePath]);

    if (error) {
      console.error('Failed to delete storage file:', error);
      // Don't throw here as we want to continue with database cleanup
    }
  }

  // ===== UNIFIED API METHODS (localStorage or Supabase) =====

  /**
   * Upload photos using appropriate backend (localStorage or Supabase)
   */
  static async uploadPhotosUnified(
    files: FileList | File[],
    destinationId: string,
    tripId?: string,
    onProgress?: (progress: PhotoUploadProgress) => void
  ): Promise<PhotoInfo[] | TripPhoto[]> {
    if (this.USE_SUPABASE && tripId) {
      // Use Supabase storage
      const fileArray = Array.from(files);
      const uploadOptions: PhotoUploadOptions[] = fileArray.map(file => ({
        tripId,
        destinationId,
        file
      }));
      
      return await this.uploadSupabasePhotos(uploadOptions);
    } else {
      // Use localStorage (existing implementation)
      return await this.uploadPhotos(files, destinationId, onProgress);
    }
  }

  /**
   * Get photos for destination using appropriate backend
   */
  static async getPhotosForDestinationUnified(destinationId: string, tripId?: string): Promise<PhotoInfo[] | TripPhoto[]> {
    if (this.USE_SUPABASE && tripId) {
      return await this.getSupabasePhotosForDestination(destinationId);
    } else {
      return this.getPhotosForDestination(destinationId);
    }
  }
}