/**
 * Service Worker registration for offline support and performance optimization
 */

const isLocalhost = Boolean(
  window.location.hostname === 'localhost' ||
  window.location.hostname === '[::1]' ||
  window.location.hostname.match(
    /^127(?:\.(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)){3}$/
  )
);

interface Config {
  onSuccess?: (registration: ServiceWorkerRegistration) => void;
  onUpdate?: (registration: ServiceWorkerRegistration) => void;
  onOfflineReady?: () => void;
}

export function register(config?: Config) {
  if ('serviceWorker' in navigator) {
    // Only register in production or localhost
    if (process.env.NODE_ENV === 'production' || isLocalhost) {
      // The URL constructor is available in all browsers that support SW.
      const publicUrl = new URL(process.env.PUBLIC_URL!, window.location.href);
      if (publicUrl.origin !== window.location.origin) {
        // Our service worker won't work if PUBLIC_URL is on a different origin
        // from what our page is served on. This might happen if a CDN is used to
        // serve assets; see https://github.com/facebook/create-react-app/issues/2374
        return;
      }

      window.addEventListener('load', () => {
        const swUrl = `${process.env.PUBLIC_URL}/sw.js`;

        if (isLocalhost) {
          // This is running on localhost. Let's check if a service worker still exists or not.
          checkValidServiceWorker(swUrl, config);

          // Add some additional logging to localhost, pointing developers to the
          // service worker/PWA documentation.
          navigator.serviceWorker.ready.then(() => {
            console.log(
              'This web app is being served cache-first by a service worker. To learn more, visit https://cra.link/PWA'
            );
          });
        } else {
          // Is not localhost. Just register service worker
          registerValidSW(swUrl, config);
        }
      });
    }
  }
}

function registerValidSW(swUrl: string, config?: Config) {
  navigator.serviceWorker
    .register(swUrl)
    .then((registration) => {
      console.log('SW registered: ', registration);
      
      registration.onupdatefound = () => {
        const installingWorker = registration.installing;
        if (installingWorker == null) {
          return;
        }
        installingWorker.onstatechange = () => {
          if (installingWorker.state === 'installed') {
            if (navigator.serviceWorker.controller) {
              // At this point, the updated precached content has been fetched,
              // but the previous service worker will still serve the older
              // content until all client tabs are closed.
              console.log(
                'New content is available and will be used when all tabs for this page are closed. See https://cra.link/PWA.'
              );

              // Execute callback
              if (config && config.onUpdate) {
                config.onUpdate(registration);
              }
            } else {
              // At this point, everything has been precached.
              // It's the perfect time to display a
              // "Content is cached for offline use." message.
              console.log('Content is cached for offline use.');

              // Execute callback
              if (config && config.onSuccess) {
                config.onSuccess(registration);
              }
              
              if (config && config.onOfflineReady) {
                config.onOfflineReady();
              }
            }
          }
        };
      };
    })
    .catch((error) => {
      console.error('Error during service worker registration:', error);
    });
}

function checkValidServiceWorker(swUrl: string, config?: Config) {
  // Check if the service worker can be found. If it can't reload the page.
  fetch(swUrl, {
    headers: { 'Service-Worker': 'script' },
  })
    .then((response) => {
      // Ensure service worker exists, and that we really are getting a JS file.
      const contentType = response.headers.get('content-type');
      if (
        response.status === 404 ||
        (contentType != null && contentType.indexOf('javascript') === -1)
      ) {
        // No service worker found. Probably a different app. Reload the page.
        navigator.serviceWorker.ready.then((registration) => {
          registration.unregister().then(() => {
            window.location.reload();
          });
        });
      } else {
        // Service worker found. Proceed as normal.
        registerValidSW(swUrl, config);
      }
    })
    .catch(() => {
      console.log(
        'No internet connection found. App is running in offline mode.'
      );
      if (config && config.onOfflineReady) {
        config.onOfflineReady();
      }
    });
}

export function unregister() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.ready
      .then((registration) => {
        registration.unregister();
        console.log('SW unregistered');
      })
      .catch((error) => {
        console.error(error.message);
      });
  }
}

/**
 * Cache management utilities
 */
export class CacheManager {
  private static sendMessage(message: any): Promise<any> {
    return new Promise((resolve, reject) => {
      const messageChannel = new MessageChannel();
      messageChannel.port1.onmessage = (event) => {
        if (event.data.error) {
          reject(event.data.error);
        } else {
          resolve(event.data);
        }
      };

      if (navigator.serviceWorker && navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.postMessage(message, [messageChannel.port2]);
      } else {
        reject(new Error('No service worker controller available'));
      }
    });
  }

  static async cacheUrls(urls: string[]): Promise<void> {
    try {
      await this.sendMessage({
        type: 'CACHE_URLS',
        payload: urls
      });
      console.log('URLs cached successfully');
    } catch (error) {
      console.error('Failed to cache URLs:', error);
    }
  }

  static async clearCache(): Promise<void> {
    try {
      await this.sendMessage({
        type: 'CLEAR_CACHE'
      });
      console.log('Cache cleared successfully');
    } catch (error) {
      console.error('Failed to clear cache:', error);
    }
  }

  static async getCacheSize(): Promise<number> {
    if ('storage' in navigator && 'estimate' in navigator.storage) {
      const estimate = await navigator.storage.estimate();
      return estimate.usage || 0;
    }
    return 0;
  }

  static async getCacheQuota(): Promise<number> {
    if ('storage' in navigator && 'estimate' in navigator.storage) {
      const estimate = await navigator.storage.estimate();
      return estimate.quota || 0;
    }
    return 0;
  }
}

/**
 * Network status utilities
 */
export class NetworkManager {
  private static listeners: Array<(online: boolean) => void> = [];

  static isOnline(): boolean {
    return navigator.onLine;
  }

  static onNetworkChange(callback: (online: boolean) => void): () => void {
    this.listeners.push(callback);

    const handleOnline = () => callback(true);
    const handleOffline = () => callback(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Return cleanup function
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      this.listeners = this.listeners.filter(l => l !== callback);
    };
  }

  static async checkConnectivity(): Promise<boolean> {
    if (!navigator.onLine) {
      return false;
    }

    try {
      const response = await fetch('/ping', {
        method: 'HEAD',
        cache: 'no-cache',
      });
      return response.ok;
    } catch {
      try {
        const response = await fetch('https://www.google.com/favicon.ico', {
          method: 'HEAD',
          mode: 'no-cors',
          cache: 'no-cache',
        });
        return true;
      } catch {
        return false;
      }
    }
  }
}

/**
 * Background sync utilities
 */
export class BackgroundSync {
  static async register(tag: string): Promise<void> {
    if ('serviceWorker' in navigator && 'sync' in window.ServiceWorkerRegistration.prototype) {
      const registration = await navigator.serviceWorker.ready;
      await (registration as any).sync.register(tag); // Cast for experimental Background Sync API
      console.log(`Background sync registered: ${tag}`);
    } else {
      console.warn('Background sync not supported');
    }
  }

  static async scheduleAction(action: string, data: any): Promise<void> {
    // Store action in IndexedDB for processing when online
    const actionData = {
      id: Date.now().toString(),
      action,
      data,
      timestamp: Date.now(),
    };

    // Store in IndexedDB (implementation would depend on your database setup)
    console.log('Action scheduled for background sync:', actionData);
    
    // Register background sync
    await this.register('background-sync');
  }
}

/**
 * PWA update notification
 */
export function showUpdateAvailable(registration: ServiceWorkerRegistration) {
  // Create update notification
  const updateNotification = document.createElement('div');
  updateNotification.innerHTML = `
    <div style="
      position: fixed;
      top: 20px;
      right: 20px;
      background: #2563eb;
      color: white;
      padding: 16px;
      border-radius: 8px;
      box-shadow: 0 10px 25px rgba(0,0,0,0.1);
      z-index: 10000;
      max-width: 300px;
    ">
      <p style="margin: 0 0 12px 0; font-weight: 600;">
        New version available!
      </p>
      <p style="margin: 0 0 16px 0; font-size: 14px; opacity: 0.9;">
        A new version of the app is ready to install.
      </p>
      <button id="update-app-btn" style="
        background: white;
        color: #2563eb;
        border: none;
        padding: 8px 16px;
        border-radius: 4px;
        font-weight: 600;
        cursor: pointer;
        margin-right: 8px;
      ">
        Update Now
      </button>
      <button id="dismiss-update-btn" style="
        background: transparent;
        color: white;
        border: 1px solid rgba(255,255,255,0.3);
        padding: 8px 16px;
        border-radius: 4px;
        cursor: pointer;
      ">
        Later
      </button>
    </div>
  `;

  document.body.appendChild(updateNotification);

  // Handle update button click
  const updateBtn = document.getElementById('update-app-btn');
  const dismissBtn = document.getElementById('dismiss-update-btn');

  updateBtn?.addEventListener('click', () => {
    if (registration.waiting) {
      registration.waiting.postMessage({ type: 'SKIP_WAITING' });
      window.location.reload();
    }
  });

  dismissBtn?.addEventListener('click', () => {
    updateNotification.remove();
  });

  // Auto-dismiss after 30 seconds
  setTimeout(() => {
    if (document.body.contains(updateNotification)) {
      updateNotification.remove();
    }
  }, 30000);
}