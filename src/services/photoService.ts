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
        // Simulate upload progress
        for (let progress = 0; progress <= 100; progress += 20) {
          await new Promise(resolve => setTimeout(resolve, 100));
          onProgress?.({
            photoId,
            progress,
            status: 'uploading'
          });
        }

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
    return `photo_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
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
}