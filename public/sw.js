const SW_VERSION = 'v1';
const CACHE_NAMES = {
  appShell: `fixly-shell-${SW_VERSION}`,
  dynamic: `fixly-dynamic-${SW_VERSION}`,
  images: `fixly-images-${SW_VERSION}`,
};

const APP_SHELL_URLS = [
  '/',
  '/offline.html',
  '/manifest.json',
  '/favicon.ico',
  '/icon-192x192.png',
  '/icon-512x512.png',
];

const SYNC_TAGS = {
  analytics: 'analytics-queue',
  notifications: 'notification-read-queue',
  drafts: 'draft-save-queue',
};

const IMAGE_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const SYNC_DB_NAME = 'FixlyBackgroundSync';
const SYNC_DB_VERSION = 1;
const STORE_NAMES = {
  analytics: 'analyticsQueue',
  notifications: 'notificationReadQueue',
  drafts: 'draftSaveQueue',
};

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_NAMES.appShell);
      await cache.addAll(APP_SHELL_URLS);
      await self.skipWaiting();
      console.info('[SW] Installed version:', SW_VERSION);
    })()
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const validCaches = new Set(Object.values(CACHE_NAMES));
      const cacheNames = await caches.keys();
      await Promise.all(
        cacheNames
          .filter((cacheName) => !validCaches.has(cacheName))
          .map((cacheName) => caches.delete(cacheName))
      );
      await self.clients.claim();
      console.info('[SW] Activated, old caches cleared');
    })()
  );
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);

  if (request.method !== 'GET') {
    return;
  }

  if (request.mode === 'navigate') {
    event.respondWith(handleNavigationRequest(request));
    return;
  }

  if (url.pathname.includes('/api/')) {
    event.respondWith(handleApiRequest(request));
    return;
  }

  if (isImageRequest(request, url)) {
    event.respondWith(handleImageRequest(request));
    return;
  }

  if (url.pathname.startsWith('/_next/static/')) {
    event.respondWith(handleStaticAssetRequest(request));
    return;
  }

  event.respondWith(handleDynamicRequest(request));
});

self.addEventListener('sync', (event) => {
  if (event.tag === SYNC_TAGS.analytics) {
    event.waitUntil(flushAnalyticsQueue());
    return;
  }

  if (event.tag === SYNC_TAGS.notifications) {
    event.waitUntil(flushNotificationReadQueue());
    return;
  }

  if (event.tag === SYNC_TAGS.drafts) {
    event.waitUntil(flushDraftSaveQueue());
  }
});

self.addEventListener('push', (event) => {
  event.waitUntil(
    (async () => {
      let payload = {};

      try {
        payload = event.data ? event.data.json() : {};
      } catch {
        payload = {};
      }

      const safePayload = payload && typeof payload === 'object' ? payload : {};
      const title =
        typeof safePayload.title === 'string' && safePayload.title.trim().length > 0
          ? safePayload.title
          : 'Fixly';

      await self.registration.showNotification(title, {
        body: typeof safePayload.body === 'string' ? safePayload.body : '',
        icon: '/icon-192x192.png',
        badge: '/favicon-32x32.png',
        data: {
          url: typeof safePayload.url === 'string' ? safePayload.url : '/',
        },
      });
    })()
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  event.waitUntil(
    (async () => {
      const url =
        event.notification &&
        event.notification.data &&
        typeof event.notification.data.url === 'string'
          ? event.notification.data.url
          : '/';
      await self.clients.openWindow(url);
    })()
  );
});

self.addEventListener('message', (event) => {
  const data = event.data || {};

  if (data.type === 'SKIP_WAITING') {
    self.skipWaiting();
    return;
  }

  if (data.type === 'GET_VERSION' && event.ports && event.ports[0]) {
    event.ports[0].postMessage({ version: SW_VERSION });
    return;
  }

  if (data.type === 'RUN_SYNC' && typeof data.tag === 'string') {
    if (data.tag === SYNC_TAGS.analytics) {
      void flushAnalyticsQueue();
    } else if (data.tag === SYNC_TAGS.notifications) {
      void flushNotificationReadQueue();
    } else if (data.tag === SYNC_TAGS.drafts) {
      void flushDraftSaveQueue();
    }
  }
});

async function handleNavigationRequest(request) {
  try {
    return await fetch(request);
  } catch {
    const cache = await caches.open(CACHE_NAMES.appShell);
    const offlineResponse = await cache.match('/offline.html');
    return offlineResponse || new Response('Offline', { status: 503 });
  }
}

async function handleApiRequest(request) {
  try {
    return await fetch(request);
  } catch {
    return new Response(
      JSON.stringify({
        error: 'OFFLINE',
        message: 'No network connection',
      }),
      {
        status: 503,
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );
  }
}

async function handleImageRequest(request) {
  const cache = await caches.open(CACHE_NAMES.images);
  const cachedResponse = await cache.match(request);

  if (cachedResponse) {
    const cachedAt = Number(cachedResponse.headers.get('sw-fetched-at') || '0');
    if (cachedAt && Date.now() - cachedAt > IMAGE_TTL_MS) {
      void refreshImageCache(cache, request);
    }
    return cachedResponse;
  }

  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      await cache.put(request, await withTimestampHeader(networkResponse.clone()));
    }
    return networkResponse;
  } catch {
    return new Response(null, { status: 504 });
  }
}

async function handleStaticAssetRequest(request) {
  const cache = await caches.open(CACHE_NAMES.appShell);
  const cachedResponse = await cache.match(request);

  if (cachedResponse) {
    return cachedResponse;
  }

  const networkResponse = await fetch(request);
  if (networkResponse.ok) {
    await cache.put(request, networkResponse.clone());
  }
  return networkResponse;
}

async function handleDynamicRequest(request) {
  const cache = await caches.open(CACHE_NAMES.dynamic);

  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      await cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch {
    const cachedResponse = await cache.match(request);
    return cachedResponse || new Response('Offline', { status: 503 });
  }
}

function isImageRequest(request, url) {
  return (
    request.destination === 'image' ||
    /\.(png|jpg|jpeg|gif|webp|svg|avif|ico)$/i.test(url.pathname)
  );
}

async function refreshImageCache(cache, request) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      await cache.put(request, await withTimestampHeader(response.clone()));
    }
  } catch {
    return;
  }
}

async function withTimestampHeader(response) {
  const body = await response.blob();
  const headers = new Headers(response.headers);
  headers.set('sw-fetched-at', String(Date.now()));
  return new Response(body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

function openSyncDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(SYNC_DB_NAME, SYNC_DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = () => {
      const db = request.result;
      Object.values(STORE_NAMES).forEach((storeName) => {
        if (!db.objectStoreNames.contains(storeName)) {
          db.createObjectStore(storeName, { keyPath: 'id' });
        }
      });
    };
  });
}

async function getAllQueuedItems(storeName) {
  const db = await openSyncDatabase();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, 'readonly');
    const store = transaction.objectStore(storeName);
    const request = store.getAll();

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(Array.isArray(request.result) ? request.result : []);
  });
}

async function deleteQueuedItem(storeName, id) {
  const db = await openSyncDatabase();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, 'readwrite');
    const store = transaction.objectStore(storeName);
    const request = store.delete(id);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(true);
  });
}

async function flushAnalyticsQueue() {
  const events = await getAllQueuedItems(STORE_NAMES.analytics);
  if (!events.length) {
    return;
  }

  const response = await fetch('/api/analytics/batch', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      events: events.map((event) => event.payload).filter(Boolean),
    }),
  });

  if (!response.ok) {
    return;
  }

  await Promise.all(events.map((event) => deleteQueuedItem(STORE_NAMES.analytics, event.id)));
}

async function flushNotificationReadQueue() {
  const queue = await getAllQueuedItems(STORE_NAMES.notifications);
  if (!queue.length) {
    return;
  }

  const results = await Promise.allSettled(
    queue.map((item) =>
      fetch('/api/user/notifications/read', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(item.payload || {}),
      })
    )
  );

  await Promise.all(
    results.map((result, index) => {
      if (result.status === 'fulfilled' && result.value.ok) {
        return deleteQueuedItem(STORE_NAMES.notifications, queue[index].id);
      }
      return Promise.resolve();
    })
  );
}

async function flushDraftSaveQueue() {
  const drafts = await getAllQueuedItems(STORE_NAMES.drafts);
  if (!drafts.length) {
    return;
  }

  const results = await Promise.allSettled(
    drafts.map((item) =>
      fetch('/api/jobs/drafts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(item.payload || {}),
      })
    )
  );

  await Promise.all(
    results.map((result, index) => {
      if (result.status === 'fulfilled' && result.value.ok) {
        return deleteQueuedItem(STORE_NAMES.drafts, drafts[index].id);
      }
      return Promise.resolve();
    })
  );
}
