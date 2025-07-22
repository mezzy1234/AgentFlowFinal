// Service Worker for AgentFlow.AI PWA
// Handles caching, offline functionality, and push notifications

const CACHE_NAME = 'agentflow-v1';
const STATIC_CACHE = 'agentflow-static-v1';
const DYNAMIC_CACHE = 'agentflow-dynamic-v1';

// Files to cache for offline functionality
const STATIC_ASSETS = [
  '/',
  '/dashboard',
  '/marketplace',
  '/offline',
  '/manifest.json',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png'
];

// API endpoints to cache
const CACHEABLE_APIS = [
  '/api/agents',
  '/api/user/profile',
  '/api/integrations'
];

self.addEventListener('install', event => {
  console.log('Service Worker: Install');
  
  event.waitUntil(
    (async () => {
      try {
        const staticCache = await caches.open(STATIC_CACHE);
        await staticCache.addAll(STATIC_ASSETS);
        console.log('Service Worker: Static assets cached');
        
        // Skip waiting to activate immediately
        self.skipWaiting();
      } catch (error) {
        console.error('Service Worker: Install failed', error);
      }
    })()
  );
});

self.addEventListener('activate', event => {
  console.log('Service Worker: Activate');
  
  event.waitUntil(
    (async () => {
      try {
        // Clear old caches
        const cacheNames = await caches.keys();
        await Promise.all(
          cacheNames
            .filter(cacheName => 
              cacheName !== STATIC_CACHE && 
              cacheName !== DYNAMIC_CACHE &&
              cacheName.startsWith('agentflow-')
            )
            .map(cacheName => caches.delete(cacheName))
        );
        
        console.log('Service Worker: Old caches cleared');
        
        // Take control of all clients
        self.clients.claim();
      } catch (error) {
        console.error('Service Worker: Activate failed', error);
      }
    })()
  );
});

self.addEventListener('fetch', event => {
  const { request } = event;
  
  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }
  
  // Handle different types of requests
  if (request.url.includes('/api/')) {
    event.respondWith(handleAPIRequest(request));
  } else {
    event.respondWith(handleStaticRequest(request));
  }
});

// Handle static asset requests (HTML, CSS, JS, images)
async function handleStaticRequest(request) {
  try {
    // Try cache first (cache-first strategy for static assets)
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // Fetch from network
    const networkResponse = await fetch(request);
    
    // Cache successful responses
    if (networkResponse.ok) {
      const cache = await caches.open(STATIC_CACHE);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
    
  } catch (error) {
    console.error('Service Worker: Static request failed', error);
    
    // Return offline page for HTML requests
    if (request.destination === 'document') {
      const offlineResponse = await caches.match('/offline');
      return offlineResponse || new Response('Offline', { status: 503 });
    }
    
    // Return placeholder for other requests
    return new Response('Offline', { status: 503 });
  }
}

// Handle API requests
async function handleAPIRequest(request) {
  try {
    // Network-first strategy for API requests
    const networkResponse = await fetch(request);
    
    // Cache successful API responses for offline access
    if (networkResponse.ok && shouldCacheAPI(request.url)) {
      const cache = await caches.open(DYNAMIC_CACHE);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
    
  } catch (error) {
    console.error('Service Worker: API request failed', error);
    
    // Try to return cached version
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      // Add a header to indicate this is from cache
      const response = cachedResponse.clone();
      response.headers.set('X-From-Cache', 'true');
      return response;
    }
    
    // Return error response for API requests
    return new Response(
      JSON.stringify({
        error: 'Network unavailable',
        message: 'This feature requires an internet connection',
        offline: true
      }),
      {
        status: 503,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}

// Check if API endpoint should be cached
function shouldCacheAPI(url) {
  return CACHEABLE_APIS.some(api => url.includes(api));
}

// Handle push notifications
self.addEventListener('push', event => {
  console.log('Service Worker: Push received');
  
  if (!event.data) {
    return;
  }
  
  try {
    const data = event.data.json();
    const options = {
      body: data.body,
      icon: data.icon || '/icons/icon-192x192.png',
      badge: data.badge || '/icons/badge-72x72.png',
      tag: data.tag || 'default',
      data: data.data || {},
      actions: data.actions || [],
      requireInteraction: data.requireInteraction || false,
      silent: data.silent || false,
      timestamp: Date.now(),
      vibrate: [200, 100, 200] // Vibration pattern
    };
    
    event.waitUntil(
      self.registration.showNotification(data.title, options)
    );
  } catch (error) {
    console.error('Service Worker: Push notification error', error);
  }
});

// Handle notification clicks
self.addEventListener('notificationclick', event => {
  console.log('Service Worker: Notification click');
  
  event.notification.close();
  
  const action = event.action;
  const data = event.notification.data;
  
  event.waitUntil(
    (async () => {
      try {
        // Handle different notification actions
        let urlToOpen = '/';
        
        if (action === 'view') {
          urlToOpen = data.url || '/dashboard';
        } else if (action === 'dismiss') {
          return; // Just close the notification
        } else if (data.url) {
          urlToOpen = data.url;
        }
        
        // Check if app is already open
        const clients = await self.clients.matchAll({
          type: 'window',
          includeUncontrolled: true
        });
        
        // Focus existing window if found
        for (let client of clients) {
          if (client.url.includes(self.location.origin)) {
            await client.navigate(urlToOpen);
            return client.focus();
          }
        }
        
        // Open new window
        return self.clients.openWindow(urlToOpen);
        
      } catch (error) {
        console.error('Service Worker: Notification click error', error);
      }
    })()
  );
});

// Handle background sync
self.addEventListener('sync', event => {
  console.log('Service Worker: Background sync');
  
  if (event.tag === 'background-sync') {
    event.waitUntil(syncData());
  }
});

// Sync data when back online
async function syncData() {
  try {
    console.log('Service Worker: Syncing offline data');
    
    // Get pending data from IndexedDB or localStorage
    // This would sync any actions performed while offline
    
    // Example: Sync pending agent runs, user actions, etc.
    const clients = await self.clients.matchAll();
    clients.forEach(client => {
      client.postMessage({
        type: 'SYNC_COMPLETE',
        timestamp: Date.now()
      });
    });
    
  } catch (error) {
    console.error('Service Worker: Sync failed', error);
  }
}

// Handle message from main thread
self.addEventListener('message', event => {
  console.log('Service Worker: Message received', event.data);
  
  const { type, data } = event.data;
  
  switch (type) {
    case 'SKIP_WAITING':
      self.skipWaiting();
      break;
      
    case 'GET_VERSION':
      event.ports[0].postMessage({ version: CACHE_NAME });
      break;
      
    case 'CLEAR_CACHE':
      clearAllCaches().then(() => {
        event.ports[0].postMessage({ success: true });
      });
      break;
      
    case 'SYNC_DATA':
      syncData();
      break;
      
    default:
      console.warn('Service Worker: Unknown message type', type);
  }
});

// Clear all caches
async function clearAllCaches() {
  try {
    const cacheNames = await caches.keys();
    await Promise.all(
      cacheNames.map(cacheName => caches.delete(cacheName))
    );
    console.log('Service Worker: All caches cleared');
  } catch (error) {
    console.error('Service Worker: Clear cache failed', error);
  }
}

// Periodic background task (if supported)
if ('periodicSync' in self.registration) {
  self.addEventListener('periodicsync', event => {
    if (event.tag === 'health-check') {
      event.waitUntil(performHealthCheck());
    }
  });
}

// Perform health check
async function performHealthCheck() {
  try {
    const response = await fetch('/api/health');
    if (response.ok) {
      console.log('Service Worker: Health check passed');
    }
  } catch (error) {
    console.error('Service Worker: Health check failed', error);
  }
}

console.log('Service Worker: Loaded successfully');
