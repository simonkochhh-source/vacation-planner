import { Trip, Destination } from '../types';
import { loadFromLocalStorage, saveToLocalStorage } from '../utils';

export class CrossAppSyncService {
  private static readonly SYNC_EVENT_PREFIX = 'cross_app_sync_';
  private static readonly TRIPS_UPDATED = 'trips_updated';
  private static readonly DESTINATIONS_UPDATED = 'destinations_updated';

  private static listeners: Set<(type: string, data: any) => void> = new Set();

  /**
   * Initialize cross-app synchronization
   * Listen for localStorage changes from other apps/tabs AND postMessage from other windows
   */
  static initialize() {
    if (typeof window === 'undefined') return; // Server-side rendering guard

    // Listen for localStorage events (same domain)
    window.addEventListener('storage', (e) => {
      if (!e.key?.startsWith(this.SYNC_EVENT_PREFIX)) return;
      
      const eventType = e.key.replace(this.SYNC_EVENT_PREFIX, '');
      const newData = e.newValue ? JSON.parse(e.newValue) : null;
      
      console.log('🔄 Cross-app sync event received (storage):', eventType, newData);
      
      // Notify all listeners
      this.listeners.forEach(listener => {
        listener(eventType, newData);
      });
    });

    // Listen for postMessage events (cross-domain/port)
    window.addEventListener('message', (event) => {
      // Security check: only accept messages from localhost
      if (!event.origin.startsWith('http://localhost')) return;
      
      if (event.data && event.data.type && event.data.type.startsWith(this.SYNC_EVENT_PREFIX)) {
        const eventType = event.data.type.replace(this.SYNC_EVENT_PREFIX, '');
        const eventData = event.data.payload;
        
        console.log('🔄 Cross-app sync event received (postMessage):', eventType, eventData);
        
        // Notify all listeners
        this.listeners.forEach(listener => {
          listener(eventType, eventData);
        });
      }
    });

    // Listen for BroadcastChannel events (cross-tab communication)
    CrossAppSyncService.initBroadcastChannelListener();

    console.log('🔄 CrossAppSyncService initialized with localStorage + postMessage + BroadcastChannel support');
  }

  /**
   * Subscribe to cross-app sync events
   */
  static subscribe(callback: (type: string, data: any) => void) {
    this.listeners.add(callback);
    
    return () => {
      this.listeners.delete(callback);
    };
  }

  /**
   * Emit a cross-app sync event
   */
  private static emitEvent(eventType: string, data: any) {
    if (typeof window === 'undefined') return;

    const eventKey = `${this.SYNC_EVENT_PREFIX}${eventType}`;
    const eventData = {
      timestamp: Date.now(),
      data: data
    };

    // Method 1: Trigger localStorage event (same-domain tabs)
    localStorage.setItem(eventKey, JSON.stringify(eventData));
    setTimeout(() => {
      localStorage.removeItem(eventKey);
    }, 100);

    // Method 2: Send postMessage to all other windows (cross-domain/port)
    this.broadcastToOtherWindows({
      type: eventKey,
      payload: eventData
    });
  }

  /**
   * Broadcast message to other windows/tabs
   */
  private static broadcastToOtherWindows(message: any) {
    // Try to find and communicate with other localhost windows
    const ports = [3001, 8080]; // Known ports for our apps
    
    ports.forEach(port => {
      try {
        // We can't directly access other windows, but if they're opened by this window
        // or we have references to them, we could send messages
        // For now, we'll use a different approach with BroadcastChannel
        
        // Create a temporary iframe to communicate cross-origin
        const targetOrigin = `http://localhost:${port}`;
        if (window.location.origin !== targetOrigin) {
          // Use BroadcastChannel as an alternative
          this.tryBroadcastChannel(message);
        }
      } catch (e) {
        console.debug('Could not broadcast to port', port, e);
      }
    });
  }

  /**
   * Use BroadcastChannel as fallback for cross-tab communication
   */
  private static tryBroadcastChannel(message: any) {
    try {
      if (typeof BroadcastChannel !== 'undefined') {
        const channel = new BroadcastChannel('vacation_planner_sync');
        channel.postMessage(message);
        channel.close();
      }
    } catch (e) {
      console.debug('BroadcastChannel not available', e);
    }
  }

  /**
   * Initialize BroadcastChannel listener
   */
  private static initBroadcastChannelListener() {
    try {
      if (typeof BroadcastChannel !== 'undefined') {
        const channel = new BroadcastChannel('vacation_planner_sync');
        channel.onmessage = (event) => {
          if (event.data && event.data.type && event.data.type.startsWith(this.SYNC_EVENT_PREFIX)) {
            const eventType = event.data.type.replace(this.SYNC_EVENT_PREFIX, '');
            const eventData = event.data.payload;
            
            console.log('🔄 Cross-app sync event received (BroadcastChannel):', eventType, eventData);
            
            // Notify all listeners
            this.listeners.forEach(listener => {
              listener(eventType, eventData);
            });
          }
        };
      }
    } catch (e) {
      console.debug('BroadcastChannel listener setup failed', e);
    }
  }

  /**
   * Notify other apps that trips have been updated
   */
  static notifyTripsUpdated(trips: Trip[]) {
    console.log('🔄 Notifying other apps: trips updated', trips.length);
    
    // Update the shared localStorage
    saveToLocalStorage('trips', trips);
    
    // Emit the sync event
    this.emitEvent(this.TRIPS_UPDATED, trips);
  }

  /**
   * Notify other apps that destinations have been updated
   */
  static notifyDestinationsUpdated(destinations: Destination[]) {
    console.log('🔄 Notifying other apps: destinations updated', destinations.length);
    
    // Update the shared localStorage
    saveToLocalStorage('destinations', destinations);
    
    // Emit the sync event
    this.emitEvent(this.DESTINATIONS_UPDATED, destinations);
  }

  /**
   * Load trips from shared storage
   */
  static loadSharedTrips(): Trip[] {
    return loadFromLocalStorage('trips') || [];
  }

  /**
   * Load destinations from shared storage
   */
  static loadSharedDestinations(): Destination[] {
    return loadFromLocalStorage('destinations') || [];
  }
}