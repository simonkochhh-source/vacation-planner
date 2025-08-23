interface CachedTile {
  url: string;
  blob: Blob;
  timestamp: number;
  accessCount: number;
  lastAccessed: number;
}

interface CacheStats {
  totalSize: number;
  tileCount: number;
  hitRate: number;
  oldestTile: number;
  newestTile: number;
}

class TileCacheService {
  private cache: Map<string, CachedTile> = new Map();
  private maxCacheSize: number = 50 * 1024 * 1024; // 50MB
  private maxTileAge: number = 24 * 60 * 60 * 1000; // 24 hours
  private hitCount: number = 0;
  private missCount: number = 0;

  constructor(maxSizeMB: number = 50, maxAgeHours: number = 24) {
    this.maxCacheSize = maxSizeMB * 1024 * 1024;
    this.maxTileAge = maxAgeHours * 60 * 60 * 1000;
    
    // Initialize cache from IndexedDB if available
    this.initializeFromIndexedDB();
    
    // Cleanup old tiles periodically
    setInterval(() => this.cleanupOldTiles(), 5 * 60 * 1000); // Every 5 minutes
  }

  async getTile(url: string): Promise<Blob | null> {
    const cached = this.cache.get(url);
    
    if (cached && this.isTileValid(cached)) {
      // Update access statistics
      cached.accessCount++;
      cached.lastAccessed = Date.now();
      this.hitCount++;
      
      return cached.blob;
    }

    this.missCount++;
    return null;
  }

  async cacheTile(url: string, blob: Blob): Promise<void> {
    const now = Date.now();
    
    // Check if we need to make space
    await this.ensureSpace(blob.size);
    
    const cachedTile: CachedTile = {
      url,
      blob,
      timestamp: now,
      accessCount: 1,
      lastAccessed: now
    };
    
    this.cache.set(url, cachedTile);
    
    // Persist to IndexedDB for offline access
    await this.persistToIndexedDB(url, cachedTile);
  }

  private isTileValid(tile: CachedTile): boolean {
    const age = Date.now() - tile.timestamp;
    return age < this.maxTileAge;
  }

  private async ensureSpace(newTileSize: number): Promise<void> {
    let currentSize = this.getCurrentCacheSize();
    
    if (currentSize + newTileSize <= this.maxCacheSize) {
      return;
    }

    // Remove tiles using LRU strategy
    const sortedTiles: Array<[string, CachedTile]> = [];
    this.cache.forEach((tile, url) => {
      sortedTiles.push([url, tile]);
    });
    
    sortedTiles.sort(([, a], [, b]) => {
      // Sort by access frequency and recency
      const scoreA = a.accessCount * 0.7 + (Date.now() - a.lastAccessed) * 0.3;
      const scoreB = b.accessCount * 0.7 + (Date.now() - b.lastAccessed) * 0.3;
      return scoreA - scoreB;
    });

    // Remove tiles until we have enough space
    while (currentSize + newTileSize > this.maxCacheSize && sortedTiles.length > 0) {
      const [url, tile] = sortedTiles.shift()!;
      this.cache.delete(url);
      await this.removeFromIndexedDB(url);
      currentSize -= tile.blob.size;
    }
  }

  private getCurrentCacheSize(): number {
    let size = 0;
    this.cache.forEach(tile => {
      size += tile.blob.size;
    });
    return size;
  }

  private cleanupOldTiles(): void {
    const now = Date.now();
    const tilesToRemove: string[] = [];

    this.cache.forEach((tile, url) => {
      if (now - tile.timestamp > this.maxTileAge) {
        tilesToRemove.push(url);
      }
    });

    tilesToRemove.forEach(url => {
      this.cache.delete(url);
      this.removeFromIndexedDB(url).catch(console.error);
    });

    if (tilesToRemove.length > 0) {
      console.log(`Cleaned up ${tilesToRemove.length} expired tiles from cache`);
    }
  }

  getCacheStats(): CacheStats {
    const tiles: CachedTile[] = [];
    this.cache.forEach(tile => tiles.push(tile));
    const timestamps = tiles.map(t => t.timestamp);
    const totalRequests = this.hitCount + this.missCount;
    
    return {
      totalSize: this.getCurrentCacheSize(),
      tileCount: this.cache.size,
      hitRate: totalRequests > 0 ? this.hitCount / totalRequests : 0,
      oldestTile: timestamps.length > 0 ? Math.min(...timestamps) : 0,
      newestTile: timestamps.length > 0 ? Math.max(...timestamps) : 0
    };
  }

  clearCache(): void {
    this.cache.clear();
    this.clearIndexedDB().catch(console.error);
    this.hitCount = 0;
    this.missCount = 0;
  }

  // IndexedDB persistence for offline access
  private async initializeFromIndexedDB(): Promise<void> {
    if (!('indexedDB' in window)) return;

    try {
      const db = await this.openIndexedDB();
      const transaction = db.transaction(['tiles'], 'readonly');
      const store = transaction.objectStore('tiles');
      const request = store.getAll();

      request.onsuccess = () => {
        const tiles = request.result as Array<{url: string, data: CachedTile}>;
        for (let i = 0; i < tiles.length; i++) {
          const {url, data} = tiles[i];
          if (this.isTileValid(data)) {
            this.cache.set(url, data);
          }
        }
      };
    } catch (error) {
      console.warn('Failed to initialize tile cache from IndexedDB:', error);
    }
  }

  private async persistToIndexedDB(url: string, tile: CachedTile): Promise<void> {
    if (!('indexedDB' in window)) return;

    try {
      const db = await this.openIndexedDB();
      const transaction = db.transaction(['tiles'], 'readwrite');
      const store = transaction.objectStore('tiles');
      await store.put({url, data: tile});
    } catch (error) {
      console.warn('Failed to persist tile to IndexedDB:', error);
    }
  }

  private async removeFromIndexedDB(url: string): Promise<void> {
    if (!('indexedDB' in window)) return;

    try {
      const db = await this.openIndexedDB();
      const transaction = db.transaction(['tiles'], 'readwrite');
      const store = transaction.objectStore('tiles');
      await store.delete(url);
    } catch (error) {
      console.warn('Failed to remove tile from IndexedDB:', error);
    }
  }

  private async clearIndexedDB(): Promise<void> {
    if (!('indexedDB' in window)) return;

    try {
      const db = await this.openIndexedDB();
      const transaction = db.transaction(['tiles'], 'readwrite');
      const store = transaction.objectStore('tiles');
      await store.clear();
    } catch (error) {
      console.warn('Failed to clear IndexedDB:', error);
    }
  }

  private openIndexedDB(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('VacationPlannerTileCache', 1);
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
      
      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains('tiles')) {
          const store = db.createObjectStore('tiles', { keyPath: 'url' });
          store.createIndex('timestamp', 'data.timestamp');
        }
      };
    });
  }

  // Preload tiles for a specific area
  async preloadTilesForBounds(
    bounds: {north: number, south: number, east: number, west: number},
    zoomLevels: number[],
    tileUrlTemplate: string
  ): Promise<void> {
    const tilesToPreload: string[] = [];

    for (let i = 0; i < zoomLevels.length; i++) {
      const zoom = zoomLevels[i];
      const tiles = this.getTileCoordinatesForBounds(bounds, zoom);
      for (let j = 0; j < tiles.length; j++) {
        const {x, y} = tiles[j];
        const url = tileUrlTemplate
          .replace('{z}', zoom.toString())
          .replace('{x}', x.toString())
          .replace('{y}', y.toString());
        
        if (!this.cache.has(url)) {
          tilesToPreload.push(url);
        }
      }
    }

    console.log(`Preloading ${tilesToPreload.length} tiles...`);
    
    // Preload tiles with rate limiting
    const batchSize = 5;
    for (let i = 0; i < tilesToPreload.length; i += batchSize) {
      const batch = tilesToPreload.slice(i, i + batchSize);
      
      await Promise.allSettled(
        batch.map(async url => {
          try {
            const response = await fetch(url);
            if (response.ok) {
              const blob = await response.blob();
              await this.cacheTile(url, blob);
            }
          } catch (error) {
            console.warn(`Failed to preload tile ${url}:`, error);
          }
        })
      );
      
      // Small delay between batches to avoid overwhelming the server
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    console.log('Tile preloading completed');
  }

  private getTileCoordinatesForBounds(
    bounds: {north: number, south: number, east: number, west: number},
    zoom: number
  ): Array<{x: number, y: number}> {
    const tiles: Array<{x: number, y: number}> = [];
    
    const minTileX = Math.floor((bounds.west + 180) / 360 * Math.pow(2, zoom));
    const maxTileX = Math.floor((bounds.east + 180) / 360 * Math.pow(2, zoom));
    
    const minTileY = Math.floor((1 - Math.log(Math.tan(bounds.north * Math.PI / 180) + 1 / Math.cos(bounds.north * Math.PI / 180)) / Math.PI) / 2 * Math.pow(2, zoom));
    const maxTileY = Math.floor((1 - Math.log(Math.tan(bounds.south * Math.PI / 180) + 1 / Math.cos(bounds.south * Math.PI / 180)) / Math.PI) / 2 * Math.pow(2, zoom));
    
    for (let x = minTileX; x <= maxTileX; x++) {
      for (let y = minTileY; y <= maxTileY; y++) {
        tiles.push({x, y});
      }
    }
    
    return tiles;
  }
}

// Export singleton instance
export const tileCacheService = new TileCacheService();

// Custom TileLayer with caching
export class CachedTileLayer {
  private tileUrlTemplate: string;
  private attribution: string;

  constructor(urlTemplate: string, attribution: string = '') {
    this.tileUrlTemplate = urlTemplate;
    this.attribution = attribution;
  }

  async loadTile(coords: {x: number, y: number, z: number}): Promise<HTMLImageElement> {
    const url = this.tileUrlTemplate
      .replace('{z}', coords.z.toString())
      .replace('{x}', coords.x.toString())
      .replace('{y}', coords.y.toString())
      .replace('{s}', ['a', 'b', 'c'][Math.floor(Math.random() * 3)]);

    // Try to get from cache first
    let blob = await tileCacheService.getTile(url);
    
    if (!blob) {
      // Fetch from network
      try {
        const response = await fetch(url);
        if (response.ok) {
          blob = await response.blob();
          await tileCacheService.cacheTile(url, blob);
        } else {
          throw new Error(`HTTP ${response.status}`);
        }
      } catch (error) {
        console.warn(`Failed to load tile ${url}:`, error);
        throw error;
      }
    }

    // Create image element
    return new Promise((resolve, reject) => {
      if (!blob) {
        reject(new Error('No blob available'));
        return;
      }
      
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = URL.createObjectURL(blob);
    });
  }
}

export default tileCacheService;