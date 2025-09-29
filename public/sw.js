// Service Worker for Performance Optimization
const CACHE_NAME = 'vacation-planner-v1';
const RUNTIME_CACHE = 'vacation-planner-runtime';

// Static assets to cache
const STATIC_CACHE_URLS = [
  '/',
  '/static/js/bundle.js',
  '/static/css/main.css',
  '/manifest.json',
  // Add other static assets
];

// API endpoints to cache
const API_CACHE_PATTERNS = [
  /^https:\/\/api\.openweathermap\.org\//,
  /^https:\/\/.*\.supabase\.co\/rest\//,
  /^https:\/\/nominatim\.openstreetmap\.org\//,
];

// Image patterns to cache
const IMAGE_CACHE_PATTERNS = [
  /\.(?:png|jpg|jpeg|svg|gif|webp|avif)$/,
  /^https:\/\/images\.unsplash\.com\//,
  /^https:\/\/.*\.googleapis\.com\/.*\.(png|jpg|jpeg|webp)$/,
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('SW: Caching static assets');
        return cache.addAll(STATIC_CACHE_URLS);
      })
      .then(() => {
        console.log('SW: Installation complete');
        return self.skipWaiting();
      })
      .catch((error) => {
        console.error('SW: Installation failed', error);
      })
  );
});

// Activate event - cleanup old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== CACHE_NAME && cacheName !== RUNTIME_CACHE) {
              console.log('SW: Deleting old cache', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        console.log('SW: Activation complete');
        return self.clients.claim();
      })
  );
});

// Fetch event - implement caching strategies
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // Skip chrome-extension and similar requests
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    return;
  }

  // Different strategies based on request type
  if (isStaticAsset(request)) {
    // Cache First strategy for static assets
    event.respondWith(cacheFirst(request));
  } else if (isAPIRequest(request)) {
    // Network First with cache fallback for API requests
    event.respondWith(networkFirst(request));
  } else if (isImageRequest(request)) {
    // Cache First for images with long expiry
    event.respondWith(cacheFirst(request, { maxAge: 30 * 24 * 60 * 60 * 1000 })); // 30 days
  } else if (isHTMLRequest(request)) {
    // Network First for HTML pages
    event.respondWith(networkFirst(request));
  } else {
    // Default: Network First
    event.respondWith(networkFirst(request));
  }
});

// Helper functions for request type detection
function isStaticAsset(request) {
  const url = new URL(request.url);
  return url.pathname.startsWith('/static/') ||
         url.pathname.endsWith('.js') ||
         url.pathname.endsWith('.css') ||
         url.pathname.endsWith('.woff2') ||
         url.pathname.endsWith('.woff');
}

function isAPIRequest(request) {
  const url = new URL(request.url);
  return API_CACHE_PATTERNS.some(pattern => pattern.test(request.url)) ||
         url.pathname.startsWith('/api/');
}

function isImageRequest(request) {
  const url = new URL(request.url);
  return IMAGE_CACHE_PATTERNS.some(pattern => pattern.test(request.url));
}

function isHTMLRequest(request) {
  return request.destination === 'document' ||
         (request.headers.get('Accept') && request.headers.get('Accept').includes('text/html'));
}

// Cache First strategy
async function cacheFirst(request, options = {}) {
  const cache = await caches.open(RUNTIME_CACHE);
  const cached = await cache.match(request);
  
  if (cached) {
    // Check if cache is expired
    const cachedDate = cached.headers.get('sw-cached-date');
    if (cachedDate && options.maxAge) {
      const age = Date.now() - parseInt(cachedDate);
      if (age > options.maxAge) {
        // Cache expired, fetch fresh
        return fetchAndCache(request, cache);
      }
    }
    return cached;
  }
  
  return fetchAndCache(request, cache);
}

// Network First strategy
async function networkFirst(request, timeout = 3000) {
  const cache = await caches.open(RUNTIME_CACHE);
  
  try {
    // Try network first with timeout
    const networkResponse = await Promise.race([
      fetch(request),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Network timeout')), timeout)
      )
    ]);
    
    // Cache successful responses
    if (networkResponse.ok) {
      const responseClone = networkResponse.clone();
      // Add cache timestamp
      const headers = new Headers(responseClone.headers);
      headers.set('sw-cached-date', Date.now().toString());
      
      const modifiedResponse = new Response(responseClone.body, {
        status: responseClone.status,
        statusText: responseClone.statusText,
        headers: headers
      });
      
      cache.put(request, modifiedResponse);
    }
    
    return networkResponse;
  } catch (error) {
    console.log('SW: Network failed, trying cache', error.message);
    
    // Fall back to cache
    const cached = await cache.match(request);
    if (cached) {
      return cached;
    }
    
    // If no cache, return error response
    return new Response('Network error and no cached version available', {
      status: 503,
      statusText: 'Service Unavailable'
    });
  }
}

// Fetch and cache helper
async function fetchAndCache(request, cache) {
  try {
    const response = await fetch(request);
    
    if (response.ok) {
      // Add cache timestamp
      const headers = new Headers(response.headers);
      headers.set('sw-cached-date', Date.now().toString());
      
      const modifiedResponse = new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers: headers
      });
      
      // Cache the response
      cache.put(request, modifiedResponse.clone());
      return modifiedResponse;
    }
    
    return response;
  } catch (error) {
    console.error('SW: Fetch failed', error);
    throw error;
  }
}

// Background sync for offline actions
self.addEventListener('sync', (event) => {
  if (event.tag === 'background-sync') {
    event.waitUntil(
      // Process any queued offline actions
      processOfflineActions()
    );
  }
});

async function processOfflineActions() {
  // Implementation for processing offline actions
  console.log('SW: Processing background sync');
}

// Push notifications (if needed)
self.addEventListener('push', (event) => {
  const options = {
    body: event.data ? event.data.text() : 'New notification',
    icon: '/icon-192x192.png',
    badge: '/badge-72x72.png',
    vibrate: [100, 50, 100],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: 1
    },
    actions: [
      {
        action: 'explore',
        title: 'View Details',
        icon: '/icon-192x192.png'
      },
      {
        action: 'close',
        title: 'Close',
        icon: '/icon-192x192.png'
      }
    ]
  };
  
  event.waitUntil(
    self.registration.showNotification('Vacation Planner', options)
  );
});

// Notification click handler
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  if (event.action === 'explore') {
    event.waitUntil(
      clients.openWindow('/')
    );
  }
});

// Periodic background sync for cache updates
self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'cache-update') {
    event.waitUntil(updateCaches());
  }
});

async function updateCaches() {
  console.log('SW: Updating caches in background');
  
  const cache = await caches.open(RUNTIME_CACHE);
  const keys = await cache.keys();
  
  // Update critical cached resources
  for (const request of keys) {
    if (isAPIRequest(request)) {
      try {
        const response = await fetch(request);
        if (response.ok) {
          await cache.put(request, response);
        }
      } catch (error) {
        console.log('SW: Failed to update cache for', request.url);
      }
    }
  }
}

// Message handler for communication with main thread
self.addEventListener('message', (event) => {
  if (event.data && event.data.type) {
    switch (event.data.type) {
      case 'SKIP_WAITING':
        self.skipWaiting();
        break;
      case 'CACHE_URLS':
        event.waitUntil(cacheUrls(event.data.payload));
        break;
      case 'CLEAR_CACHE':
        event.waitUntil(clearCache());
        break;
      default:
        console.log('SW: Unknown message type', event.data.type);
    }
  }
});

async function cacheUrls(urls) {
  const cache = await caches.open(RUNTIME_CACHE);
  await cache.addAll(urls);
}

async function clearCache() {
  const cacheNames = await caches.keys();
  await Promise.all(
    cacheNames.map(cacheName => caches.delete(cacheName))
  );
}