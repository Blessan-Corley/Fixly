// Enhanced Service Worker for Fixly - Production PWA with Advanced Features
const VERSION = '1.1.0';
const CACHE_NAME = `fixly-v${VERSION}`;
const STATIC_CACHE = `fixly-static-v${VERSION}`;
const DYNAMIC_CACHE = `fixly-dynamic-v${VERSION}`;
const IMAGES_CACHE = `fixly-images-v${VERSION}`;
const API_CACHE = `fixly-api-v${VERSION}`;
const FONTS_CACHE = `fixly-fonts-v${VERSION}`;

// Enhanced configuration
const CONFIG = {
  MAX_CACHE_SIZE: 100, // Maximum number of items per cache
  MAX_CACHE_AGE: 7 * 24 * 60 * 60 * 1000, // 7 days in milliseconds
  NETWORK_TIMEOUT: 10000, // 10 seconds
  BACKGROUND_SYNC_DELAY: 5000, // 5 seconds
  RETRY_ATTEMPTS: 3,
  NOTIFICATION_TTL: 24 * 60 * 60 * 1000 // 24 hours
};

// Performance monitoring
const performanceMetrics = {
  cacheHits: 0,
  cacheMisses: 0,
  networkRequests: 0,
  offlineRequests: 0,
  backgroundSyncs: 0
};

// Queue for offline actions
let offlineQueue = [];
let syncInProgress = false;

// Enhanced static assets with critical resources
const STATIC_ASSETS = [
  '/',
  '/favicon.ico',
  '/offline.html',
  '/icon-192x192.png',
  '/icon-512x512.png',
  '/apple-touch-icon.png'
];

// Critical pages for offline access
const CRITICAL_PAGES = [
  '/dashboard',
  '/dashboard/messages',
  '/dashboard/jobs',
  '/dashboard/notifications',
  '/auth/signin'
];

// Font files for offline access
const FONT_ASSETS = [
  // Add font URLs here if needed
];

// Enhanced API caching strategy
const CACHEABLE_APIS = {
  // Cache-first (long-lived data)
  CACHE_FIRST: [
    '/api/user/profile',
    '/api/search/suggestions',
    '/api/location',
    '/api/skills'
  ],
  // Network-first (dynamic data)
  NETWORK_FIRST: [
    '/api/user/notifications',
    '/api/jobs/browse',
    '/api/messages',
    '/api/dashboard/stats'
  ],
  // Stale-while-revalidate (balanced)
  STALE_WHILE_REVALIDATE: [
    '/api/jobs',
    '/api/user/earnings',
    '/api/applications'
  ]
};

// APIs that should never be cached
const NO_CACHE_APIS = [
  '/api/auth',
  '/api/admin',
  '/api/payment',
  '/api/upload'
];

// Network-first strategies for these paths
const NETWORK_FIRST = [
  '/api/auth',
  '/api/admin',
  '/api/jobs/post',
  '/api/user/privacy'
];

// Cache-first strategies for these paths
const CACHE_FIRST = [
  '/api/search/suggestions',
  '/api/location'
];

// Background sync tags
const SYNC_TAGS = {
  APPLY_JOB: 'apply-job',
  POST_JOB: 'post-job',
  UPDATE_PROFILE: 'update-profile',
  SEND_MESSAGE: 'send-message'
};

// Enhanced install event with improved caching strategy
self.addEventListener('install', (event) => {
  console.log(`Service Worker v${VERSION} installing...`);
  
  event.waitUntil(
    Promise.all([
      // Cache static assets
      cacheStaticAssets(),
      // Cache critical pages
      cacheCriticalPages(),
      // Cache fonts
      cacheFonts(),
      // Initialize offline queue
      initializeOfflineQueue(),
      // Skip waiting to activate immediately
      self.skipWaiting()
    ])
  );
});

// Cache static assets with enhanced error handling
async function cacheStaticAssets() {
  try {
    const cache = await caches.open(STATIC_CACHE);
    
    for (const asset of STATIC_ASSETS) {
      try {
        await cache.add(asset);
        console.log(`✅ Cached static asset: ${asset}`);
      } catch (error) {
        console.warn(`⚠️ Failed to cache static asset: ${asset}`, error);
        // Continue with other assets
      }
    }
  } catch (error) {
    console.error('❌ Static asset caching failed:', error);
  }
}

// Cache critical pages for offline access
async function cacheCriticalPages() {
  try {
    const cache = await caches.open(STATIC_CACHE);
    
    for (const page of CRITICAL_PAGES) {
      try {
        const response = await fetch(page);
        if (response.ok) {
          await cache.put(page, response);
          console.log(`✅ Cached critical page: ${page}`);
        }
      } catch (error) {
        console.warn(`⚠️ Failed to cache critical page: ${page}`, error);
      }
    }
  } catch (error) {
    console.error('❌ Critical page caching failed:', error);
  }
}

// Cache font assets
async function cacheFonts() {
  if (FONT_ASSETS.length === 0) return;
  
  try {
    const cache = await caches.open(FONTS_CACHE);
    
    for (const font of FONT_ASSETS) {
      try {
        await cache.add(font);
        console.log(`✅ Cached font: ${font}`);
      } catch (error) {
        console.warn(`⚠️ Failed to cache font: ${font}`, error);
      }
    }
  } catch (error) {
    console.error('❌ Font caching failed:', error);
  }
}

// Initialize offline queue from IndexedDB
async function initializeOfflineQueue() {
  try {
    const stored = await getStoredOfflineQueue();
    offlineQueue = stored || [];
    console.log(`✅ Initialized offline queue with ${offlineQueue.length} items`);
  } catch (error) {
    console.error('❌ Failed to initialize offline queue:', error);
    offlineQueue = [];
  }
}

// Enhanced activate event with improved cache management
self.addEventListener('activate', (event) => {
  console.log(`Service Worker v${VERSION} activating...`);
  
  event.waitUntil(
    Promise.all([
      // Clean up old caches
      cleanupOldCaches(),
      // Initialize performance monitoring
      initializePerformanceMonitoring(),
      // Process any pending offline queue
      processOfflineQueue(),
      // Claim all clients immediately
      self.clients.claim()
    ])
  );
});

// Clean up old caches with version management
async function cleanupOldCaches() {
  try {
    const cacheNames = await caches.keys();
    const currentCaches = [STATIC_CACHE, DYNAMIC_CACHE, IMAGES_CACHE, API_CACHE, FONTS_CACHE];
    
    const deletePromises = cacheNames.map((cacheName) => {
      if (!currentCaches.includes(cacheName)) {
        console.log(`🖾 Deleting old cache: ${cacheName}`);
        return caches.delete(cacheName);
      }
    });
    
    await Promise.all(deletePromises);
    console.log('✅ Cache cleanup completed');
  } catch (error) {
    console.error('❌ Cache cleanup failed:', error);
  }
}

// Initialize performance monitoring
function initializePerformanceMonitoring() {
  // Reset metrics for new version
  Object.keys(performanceMetrics).forEach(key => {
    performanceMetrics[key] = 0;
  });
  
  // Set up periodic metrics reporting
  setInterval(() => {
    console.log('📊 SW Performance Metrics:', performanceMetrics);
  }, 5 * 60 * 1000); // Every 5 minutes
}

// Process offline queue on activation
async function processOfflineQueue() {
  if (offlineQueue.length > 0) {
    console.log(`🔄 Processing ${offlineQueue.length} offline actions...`);
    await syncOfflineActions();
  }
}

// Fetch event - handle all network requests
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  
  // Skip non-same-origin requests
  if (!url.origin.includes(self.location.origin)) {
    return;
  }
  
  // Skip non-GET requests for caching (except API requests)
  if (request.method !== 'GET') {
    // Handle POST requests for offline support
    if (isAPIRequest(url.pathname)) {
      event.respondWith(handleOfflineRequest(request));
    }
    return;
  }
  
  // Only handle specific request types, let others pass through
  if (isImageRequest(request)) {
    event.respondWith(handleImageRequest(request));
  } else if (isAPIRequest(url.pathname)) {
    event.respondWith(handleAPIRequest(request));
  } else if (url.pathname === '/' || url.pathname.startsWith('/dashboard') || url.pathname.startsWith('/auth')) {
    // Only handle specific navigation routes
    event.respondWith(handleNavigationRequest(request));
  }
  // Let all other requests (JS bundles, CSS, etc.) pass through normally
});

// Handle image requests with cache-first strategy
async function handleImageRequest(request) {
  try {
    const cache = await caches.open(IMAGES_CACHE);
    const cachedResponse = await cache.match(request);
    
    if (cachedResponse) {
      return cachedResponse;
    }
    
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      // Cache successful responses
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    console.error('Image request failed:', error);
    // Return a fallback image
    return new Response('', { status: 404 });
  }
}

// Enhanced API request handling with intelligent caching
async function handleAPIRequest(request) {
  const url = new URL(request.url);
  const pathname = url.pathname;
  
  // Check if API should not be cached
  if (NO_CACHE_APIS.some(path => pathname.includes(path))) {
    return handleNetworkOnly(request);
  }
  
  // Determine caching strategy
  if (CACHEABLE_APIS.CACHE_FIRST.some(path => pathname.includes(path))) {
    return handleCacheFirst(request);
  }
  
  if (CACHEABLE_APIS.NETWORK_FIRST.some(path => pathname.includes(path))) {
    return handleNetworkFirst(request);
  }
  
  if (CACHEABLE_APIS.STALE_WHILE_REVALIDATE.some(path => pathname.includes(path))) {
    return handleStaleWhileRevalidate(request);
  }
  
  // Default: Network-first for uncategorized APIs
  return handleNetworkFirst(request);
}

// Network-only strategy (no caching)
async function handleNetworkOnly(request) {
  try {
    performanceMetrics.networkRequests++;
    const response = await fetch(request);
    return response;
  } catch (error) {
    performanceMetrics.offlineRequests++;
    return new Response(JSON.stringify({
      error: 'Network Error',
      message: 'This request requires an internet connection',
      offline: true
    }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// Enhanced network-first strategy with timeout and better error handling
async function handleNetworkFirst(request) {
  const cache = await caches.open(isAPIRequest(request.url) ? API_CACHE : DYNAMIC_CACHE);
  
  try {
    // Add timeout to network requests
    const networkResponse = await Promise.race([
      fetch(request),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Network timeout')), CONFIG.NETWORK_TIMEOUT)
      )
    ]);
    
    performanceMetrics.networkRequests++;
    
    if (networkResponse.ok) {
      // Cache successful responses with TTL
      const responseClone = networkResponse.clone();
      await cacheWithTTL(cache, request, responseClone);
    }
    
    return networkResponse;
  } catch (error) {
    console.log('Network failed, trying cache:', request.url, error.message);
    
    const cachedResponse = await cache.match(request);
    
    if (cachedResponse) {
      performanceMetrics.cacheHits++;
      
      // Check if cached response is still valid
      if (await isCacheValid(cachedResponse)) {
        return cachedResponse;
      }
    }
    
    performanceMetrics.cacheMisses++;
    performanceMetrics.offlineRequests++;
    
    // Return enhanced offline response
    return createOfflineResponse(request);
  }
}

// Create contextual offline response
function createOfflineResponse(request) {
  const isAPI = isAPIRequest(request.url);
  
  if (isAPI) {
    return new Response(JSON.stringify({
      error: 'Offline',
      message: 'You are currently offline. This action will be synced when you reconnect.',
      offline: true,
      timestamp: new Date().toISOString(),
      requestUrl: request.url
    }), {
      status: 503,
      headers: { 
        'Content-Type': 'application/json',
        'X-Offline-Response': 'true'
      }
    });
  }
  
  // For page requests, return cached page or offline page
  return caches.match('/offline.html').then(response => 
    response || new Response('Offline', { status: 503 })
  );
}

// Enhanced cache-first strategy with background updates and TTL
async function handleCacheFirst(request) {
  const cache = await caches.open(isAPIRequest(request.url) ? API_CACHE : DYNAMIC_CACHE);
  const cachedResponse = await cache.match(request);
  
  if (cachedResponse && await isCacheValid(cachedResponse)) {
    performanceMetrics.cacheHits++;
    
    // Update cache in background (don't wait for it)
    updateCacheInBackground(cache, request);
    
    return cachedResponse;
  }
  
  // If no valid cache, try network
  try {
    const networkResponse = await Promise.race([
      fetch(request),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Network timeout')), CONFIG.NETWORK_TIMEOUT)
      )
    ]);
    
    performanceMetrics.networkRequests++;
    
    if (networkResponse.ok) {
      await cacheWithTTL(cache, request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    performanceMetrics.cacheMisses++;
    performanceMetrics.offlineRequests++;
    
    // Return stale cache if available, even if expired
    if (cachedResponse) {
      console.log('Returning stale cache due to network failure:', request.url);
      return cachedResponse;
    }
    
    return createOfflineResponse(request);
  }
}

// Update cache in background without blocking the response
async function updateCacheInBackground(cache, request) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      await cacheWithTTL(cache, request, response.clone());
      console.log('Background cache update completed:', request.url);
    }
  } catch (error) {
    // Silent fail for background updates
    console.log('Background cache update failed:', request.url, error.message);
  }
}

// Enhanced stale-while-revalidate strategy
async function handleStaleWhileRevalidate(request) {
  const cache = await caches.open(isAPIRequest(request.url) ? API_CACHE : DYNAMIC_CACHE);
  const cachedResponse = await cache.match(request);
  
  // Always try to fetch and update cache (with timeout)
  const fetchPromise = Promise.race([
    fetch(request),
    new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Network timeout')), CONFIG.NETWORK_TIMEOUT)
    )
  ]).then(async response => {
    performanceMetrics.networkRequests++;
    
    if (response.ok) {
      await cacheWithTTL(cache, request, response.clone());
    }
    return response;
  }).catch(error => {
    console.log('Background fetch failed:', request.url, error.message);
    return null;
  });
  
  // Return cached response immediately if available and valid
  if (cachedResponse) {
    performanceMetrics.cacheHits++;
    
    // Don't wait for background update
    fetchPromise;
    
    // Check if cache is still reasonably fresh
    if (await isCacheValid(cachedResponse)) {
      return cachedResponse;
    }
  }
  
  // Wait for network if no cached version or cache is very stale
  try {
    const networkResponse = await fetchPromise;
    if (networkResponse) {
      return networkResponse;
    }
  } catch (error) {
    // Network failed
  }
  
  // Fallback to stale cache or offline response
  if (cachedResponse) {
    console.log('Returning stale cache as fallback:', request.url);
    return cachedResponse;
  }
  
  performanceMetrics.cacheMisses++;
  performanceMetrics.offlineRequests++;
  
  return createOfflineResponse(request);
}

// Handle static assets
async function handleStaticRequest(request) {
  const cache = await caches.open(STATIC_CACHE);
  const cachedResponse = await cache.match(request);
  
  if (cachedResponse) {
    return cachedResponse;
  }
  
  try {
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    // Return offline page for navigation requests
    if (request.destination === 'document') {
      return caches.match('/offline.html');
    }
    
    return new Response('Offline', { status: 503 });
  }
}

// Handle navigation requests  
async function handleNavigationRequest(request) {
  const url = new URL(request.url);
  
  // Skip offline page to prevent redirect loops
  if (url.pathname === '/offline.html') {
    try {
      return await fetch(request);
    } catch (error) {
      // Return a basic offline page if even the offline.html fails
      return new Response(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Offline - Fixly</title>
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <style>
            body { 
              font-family: system-ui, -apple-system, sans-serif; 
              text-align: center; 
              padding: 2rem; 
              background: #f7f8fa;
              color: #1c1f26;
              min-height: 100vh;
              display: flex;
              align-items: center;
              justify-content: center;
              margin: 0;
            }
            .container { background: white; padding: 2rem; border-radius: 1rem; box-shadow: 0 4px 20px rgba(0,0,0,0.1); }
            .icon { font-size: 3rem; margin-bottom: 1rem; }
            h1 { margin: 0 0 1rem 0; color: #1c1f26; }
            p { color: #718096; }
            button {
              background: #0d9488;
              color: white;
              border: none;
              padding: 0.75rem 2rem;
              border-radius: 0.5rem;
              font-weight: bold;
              cursor: pointer;
              margin-top: 1rem;
            }
            button:hover { background: #0f766e; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="icon">📡</div>
            <h1>You're Offline</h1>
            <p>Please check your internet connection and try again.</p>
            <button onclick="window.location.reload()">Retry</button>
          </div>
        </body>
        </html>
      `, {
        status: 200,
        headers: { 'Content-Type': 'text/html' }
      });
    }
  }

  try {
    // Try network first
    const networkResponse = await fetch(request);
    
    // Cache successful responses for faster subsequent loads
    if (networkResponse.ok) {
      const cache = await caches.open(STATIC_CACHE);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    console.log('Network failed for navigation:', request.url);
    
    // Try cached version first
    const cache = await caches.open(STATIC_CACHE);
    const cachedResponse = await cache.match(request);
    
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // Only show offline page for main navigation (document requests)
    if (request.destination === 'document') {
      const offlineResponse = await cache.match('/offline.html');
      if (offlineResponse) {
        return offlineResponse;
      }
    }
    
    // For non-document requests, just let them fail naturally
    throw error;
  }
}

// Helper function to detect if running in PWA mode
async function isPWAMode() {
  try {
    const clients = await self.clients.matchAll();
    return clients.some(client => {
      const url = new URL(client.url);
      return url.searchParams.get('utm_source') === 'pwa' || 
             client.url.includes('utm_source=pwa');
    });
  } catch {
    return false;
  }
}

// Handle offline requests (POST, PUT, DELETE)
async function handleOfflineRequest(request) {
  try {
    return await fetch(request);
  } catch (error) {
    // Store request for background sync
    const requestData = {
      url: request.url,
      method: request.method,
      headers: Object.fromEntries(request.headers.entries()),
      body: request.method !== 'GET' ? await request.text() : null,
      timestamp: Date.now()
    };
    
    // Store in IndexedDB for background sync
    await storeOfflineRequest(requestData);
    
    // Determine sync tag based on URL
    let syncTag = 'generic-sync';
    if (request.url.includes('/apply')) {
      syncTag = SYNC_TAGS.APPLY_JOB;
    } else if (request.url.includes('/jobs') && request.method === 'POST') {
      syncTag = SYNC_TAGS.POST_JOB;
    } else if (request.url.includes('/profile')) {
      syncTag = SYNC_TAGS.UPDATE_PROFILE;
    } else if (request.url.includes('/messages')) {
      syncTag = SYNC_TAGS.SEND_MESSAGE;
    }
    
    // Register background sync
    if ('serviceWorker' in navigator && 'sync' in window.ServiceWorkerRegistration.prototype) {
      self.registration.sync.register(syncTag);
    }
    
    return new Response(JSON.stringify({
      success: true,
      message: 'Request queued for when you\'re back online',
      queued: true,
      syncTag
    }), {
      status: 202,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// Enhanced background sync with retry logic
self.addEventListener('sync', (event) => {
  console.log('Background sync triggered:', event.tag);
  performanceMetrics.backgroundSyncs++;
  
  if (Object.values(SYNC_TAGS).includes(event.tag)) {
    event.waitUntil(syncOfflineRequests(event.tag));
  } else if (event.tag === 'offline-actions') {
    event.waitUntil(syncOfflineActions());
  }
});

// Sync offline actions with enhanced retry logic
async function syncOfflineActions() {
  if (syncInProgress || offlineQueue.length === 0) {
    return;
  }
  
  syncInProgress = true;
  console.log(`🔄 Syncing ${offlineQueue.length} offline actions...`);
  
  const successfulSyncs = [];
  const failedSyncs = [];
  
  for (const action of offlineQueue) {
    try {
      const success = await retryAction(action);
      if (success) {
        successfulSyncs.push(action.id);
      } else {
        failedSyncs.push(action);
      }
    } catch (error) {
      console.error('Sync action failed:', error);
      failedSyncs.push(action);
    }
  }
  
  // Update queue with only failed actions
  offlineQueue = failedSyncs;
  await storeOfflineQueue(offlineQueue);
  
  // Notify clients of successful syncs
  if (successfulSyncs.length > 0) {
    const clients = await self.clients.matchAll();
    clients.forEach(client => {
      client.postMessage({
        type: 'SYNC_SUCCESS',
        syncedActions: successfulSyncs,
        remainingActions: offlineQueue.length
      });
    });
  }
  
  syncInProgress = false;
  console.log(`✅ Sync completed: ${successfulSyncs.length} successful, ${failedSyncs.length} remaining`);
}

// Retry action with exponential backoff
async function retryAction(action) {
  for (let attempt = 1; attempt <= CONFIG.RETRY_ATTEMPTS; attempt++) {
    try {
      const response = await fetch(action.url, {
        method: action.method,
        headers: action.headers,
        body: action.body
      });
      
      if (response.ok) {
        return true;
      } else if (response.status >= 400 && response.status < 500) {
        // Client error - don't retry
        console.log(`Client error ${response.status} for action ${action.id} - not retrying`);
        return false;
      }
    } catch (error) {
      if (attempt === CONFIG.RETRY_ATTEMPTS) {
        console.error(`Final retry failed for action ${action.id}:`, error);
        return false;
      }
      
      // Wait before retry with exponential backoff
      const delay = Math.pow(2, attempt - 1) * 1000;
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  return false;
}

// Sync offline requests
async function syncOfflineRequests(tag) {
  try {
    const requests = await getOfflineRequests(tag);
    
    for (const requestData of requests) {
      try {
        const response = await fetch(requestData.url, {
          method: requestData.method,
          headers: requestData.headers,
          body: requestData.body
        });
        
        if (response.ok) {
          // Remove successful request from storage
          await removeOfflineRequest(requestData.id);
          
          // Notify client of successful sync
          const clients = await self.clients.matchAll();
          clients.forEach(client => {
            client.postMessage({
              type: 'SYNC_SUCCESS',
              tag,
              requestData
            });
          });
        }
      } catch (error) {
        console.error('Failed to sync request:', error);
        // Keep request in storage for next sync attempt
      }
    }
  } catch (error) {
    console.error('Background sync failed:', error);
  }
}

// Push notification event
self.addEventListener('push', (event) => {
  if (!event.data) {
    return;
  }
  
  const data = event.data.json();
  const options = {
    body: data.body,
    icon: '/icon-192x192.png',
    badge: '/icon-192x192.png',
    image: data.image,
    vibrate: [200, 100, 200],
    requireInteraction: data.requireInteraction || false,
    silent: false,
    data: {
      url: data.url || '/dashboard',
      notificationId: data.notificationId,
      category: data.category,
      timestamp: Date.now()
    },
    actions: [
      {
        action: 'view',
        title: 'View',
        icon: '/icon-192x192.png'
      },
      {
        action: 'dismiss',
        title: 'Dismiss',
        icon: '/icon-192x192.png'
      }
    ],
    tag: data.tag || `fixly_${data.category || 'general'}`,
    renotify: true,
    timestamp: Date.now()
  };
  
  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

// Notification click event
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  const action = event.action;
  const notificationData = event.notification.data;
  const url = notificationData?.url || '/dashboard';
  
  if (action === 'dismiss') {
    // Just close the notification
    return;
  }
  
  // Handle view action or notification click
  event.waitUntil(
    (async () => {
      // Mark notification as read if we have the ID
      if (notificationData?.notificationId) {
        try {
          // Try to mark as read via API
          const response = await fetch('/api/user/notifications/read', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              notificationId: notificationData.notificationId
            })
          });
        } catch (error) {
          console.log('Could not mark notification as read:', error);
        }
      }
      
      // Find existing client or open new window
      const clients = await self.clients.matchAll({
        type: 'window',
        includeUncontrolled: true
      });
      
      // Check if there's already a window open to the target URL
      for (const client of clients) {
        if (client.url.includes(url.split('?')[0]) && 'focus' in client) {
          client.postMessage({
            type: 'NOTIFICATION_CLICKED',
            data: notificationData
          });
          return client.focus();
        }
      }
      
      // Check if there's any Fixly window open
      for (const client of clients) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.postMessage({
            type: 'NOTIFICATION_CLICKED',
            data: notificationData,
            navigate: url
          });
          return client.focus();
        }
      }
      
      // Open new window
      if (self.clients.openWindow) {
        return self.clients.openWindow(url);
      }
    })()
  );
});

// Utility functions
function isImageRequest(request) {
  return request.destination === 'image' || 
         /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(new URL(request.url).pathname);
}

function isAPIRequest(pathname) {
  return pathname.startsWith('/api/');
}

function isStaticAsset(pathname) {
  return /\.(js|css|html|woff|woff2|ttf|eot)$/i.test(pathname);
}

// Enhanced IndexedDB operations with better error handling
async function storeOfflineRequest(requestData) {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('FixlyOfflineDB', 2);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const db = request.result;
      const transaction = db.transaction(['requests', 'queue'], 'readwrite');
      const store = transaction.objectStore('requests');
      
      requestData.id = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      requestData.attempts = 0;
      requestData.maxAttempts = CONFIG.RETRY_ATTEMPTS;
      
      const addRequest = store.add(requestData);
      
      addRequest.onsuccess = () => {
        // Also add to offline queue
        offlineQueue.push(requestData);
        storeOfflineQueue(offlineQueue);
        resolve(requestData.id);
      };
      addRequest.onerror = () => reject(addRequest.error);
    };
    
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      
      // Requests store
      if (!db.objectStoreNames.contains('requests')) {
        const store = db.createObjectStore('requests', { keyPath: 'id' });
        store.createIndex('timestamp', 'timestamp');
        store.createIndex('url', 'url');
        store.createIndex('syncTag', 'syncTag');
      }
      
      // Offline queue store
      if (!db.objectStoreNames.contains('queue')) {
        const queueStore = db.createObjectStore('queue', { keyPath: 'id' });
        queueStore.createIndex('timestamp', 'timestamp');
      }
      
      // Cache metadata store
      if (!db.objectStoreNames.contains('cache_metadata')) {
        const metaStore = db.createObjectStore('cache_metadata', { keyPath: 'url' });
        metaStore.createIndex('timestamp', 'timestamp');
        metaStore.createIndex('ttl', 'ttl');
      }
    };
  });
}

// Store offline queue
async function storeOfflineQueue(queue) {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('FixlyOfflineDB', 2);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const db = request.result;
      const transaction = db.transaction(['queue'], 'readwrite');
      const store = transaction.objectStore('queue');
      
      // Clear existing queue
      store.clear();
      
      // Add all queue items
      queue.forEach(item => {
        store.add(item);
      });
      
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    };
  });
}

// Get stored offline queue
async function getStoredOfflineQueue() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('FixlyOfflineDB', 2);
    
    request.onerror = () => resolve([]); // Return empty array on error
    request.onsuccess = () => {
      const db = request.result;
      
      if (!db.objectStoreNames.contains('queue')) {
        resolve([]);
        return;
      }
      
      const transaction = db.transaction(['queue'], 'readonly');
      const store = transaction.objectStore('queue');
      const getAllRequest = store.getAll();
      
      getAllRequest.onsuccess = () => resolve(getAllRequest.result || []);
      getAllRequest.onerror = () => resolve([]);
    };
  });
}

// Cache with TTL support
async function cacheWithTTL(cache, request, response) {
  try {
    // Store response in cache
    await cache.put(request, response.clone());
    
    // Store metadata with TTL
    await storeCacheMetadata(request.url, {
      timestamp: Date.now(),
      ttl: Date.now() + CONFIG.MAX_CACHE_AGE,
      headers: Object.fromEntries(response.headers.entries())
    });
  } catch (error) {
    console.error('Failed to cache with TTL:', error);
  }
}

// Check if cache is still valid
async function isCacheValid(response) {
  try {
    const metadata = await getCacheMetadata(response.url);
    if (!metadata) return false;
    
    const now = Date.now();
    return now < metadata.ttl;
  } catch (error) {
    console.error('Failed to check cache validity:', error);
    return false;
  }
}

// Store cache metadata
async function storeCacheMetadata(url, metadata) {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('FixlyOfflineDB', 2);
    
    request.onerror = () => resolve(); // Silent fail
    request.onsuccess = () => {
      const db = request.result;
      
      if (!db.objectStoreNames.contains('cache_metadata')) {
        resolve();
        return;
      }
      
      const transaction = db.transaction(['cache_metadata'], 'readwrite');
      const store = transaction.objectStore('cache_metadata');
      
      store.put({ url, ...metadata });
      
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => resolve(); // Silent fail
    };
  });
}

// Get cache metadata
async function getCacheMetadata(url) {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('FixlyOfflineDB', 2);
    
    request.onerror = () => resolve(null);
    request.onsuccess = () => {
      const db = request.result;
      
      if (!db.objectStoreNames.contains('cache_metadata')) {
        resolve(null);
        return;
      }
      
      const transaction = db.transaction(['cache_metadata'], 'readonly');
      const store = transaction.objectStore('cache_metadata');
      const getRequest = store.get(url);
      
      getRequest.onsuccess = () => resolve(getRequest.result || null);
      getRequest.onerror = () => resolve(null);
    };
  });
}

async function getOfflineRequests(tag) {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('FixlyOfflineDB', 1);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const db = request.result;
      const transaction = db.transaction(['requests'], 'readonly');
      const store = transaction.objectStore('requests');
      const getAllRequest = store.getAll();
      
      getAllRequest.onsuccess = () => {
        const allRequests = getAllRequest.result;
        // Filter by tag if needed
        const filteredRequests = tag ? 
          allRequests.filter(req => req.syncTag === tag) : 
          allRequests;
        resolve(filteredRequests);
      };
      getAllRequest.onerror = () => reject(getAllRequest.error);
    };
  });
}

async function removeOfflineRequest(id) {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('FixlyOfflineDB', 2);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const db = request.result;
      const transaction = db.transaction(['requests', 'queue'], 'readwrite');
      
      // Remove from requests store
      const requestsStore = transaction.objectStore('requests');
      requestsStore.delete(id);
      
      // Remove from queue store
      const queueStore = transaction.objectStore('queue');
      queueStore.delete(id);
      
      // Update in-memory queue
      offlineQueue = offlineQueue.filter(item => item.id !== id);
      
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    };
  });
}

// Enhanced message handling
self.addEventListener('message', (event) => {
  const { data } = event;
  
  if (!data) return;
  
  switch (data.type) {
    case 'SKIP_WAITING':
      self.skipWaiting();
      break;
      
    case 'GET_PERFORMANCE_METRICS':
      event.ports[0]?.postMessage({
        type: 'PERFORMANCE_METRICS',
        metrics: performanceMetrics,
        version: VERSION,
        cacheStats: {
          offlineQueueLength: offlineQueue.length,
          syncInProgress
        }
      });
      break;
      
    case 'FORCE_SYNC':
      if ('serviceWorker' in navigator && 'sync' in window.ServiceWorkerRegistration.prototype) {
        self.registration.sync.register('offline-actions');
      } else {
        // Fallback for browsers without background sync
        syncOfflineActions();
      }
      break;
      
    case 'CLEAR_CACHE':
      clearAllCaches().then(() => {
        event.ports[0]?.postMessage({ type: 'CACHE_CLEARED' });
      });
      break;
      
    default:
      console.log('Unknown message type:', data.type);
  }
});

// Clear all caches
async function clearAllCaches() {
  try {
    const cacheNames = await caches.keys();
    await Promise.all(cacheNames.map(name => caches.delete(name)));
    console.log('🖾 All caches cleared');
  } catch (error) {
    console.error('Failed to clear caches:', error);
  }
}

// Enhanced utility functions
function isAPIRequest(url) {
  return url.includes('/api/');
}

function isImageRequest(request) {
  return request.destination === 'image' || 
         /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(new URL(request.url).pathname);
}

function isStaticAsset(pathname) {
  return /\.(js|css|html|woff|woff2|ttf|eot)$/i.test(pathname);
}

// Periodic cache cleanup
setInterval(async () => {
  try {
    await cleanupExpiredCaches();
  } catch (error) {
    console.error('Cache cleanup failed:', error);
  }
}, 60 * 60 * 1000); // Every hour

// Clean up expired caches
async function cleanupExpiredCaches() {
  const cacheNames = [API_CACHE, DYNAMIC_CACHE, IMAGES_CACHE];
  
  for (const cacheName of cacheNames) {
    try {
      const cache = await caches.open(cacheName);
      const requests = await cache.keys();
      
      for (const request of requests) {
        const metadata = await getCacheMetadata(request.url);
        if (metadata && Date.now() > metadata.ttl) {
          await cache.delete(request);
          console.log(`🖾 Removed expired cache: ${request.url}`);
        }
      }
    } catch (error) {
      console.error(`Failed to cleanup cache ${cacheName}:`, error);
    }
  }
}

// Service worker lifecycle logging
console.log(`🚀 Fixly Service Worker v${VERSION} loaded successfully!`);
console.log('📊 Enhanced features: TTL caching, background sync, performance monitoring');