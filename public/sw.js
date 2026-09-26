const CACHE_NAME = 'bible-journal-v2';

const STATIC_PRECACHE = [
  '/',
  '/index.html',
  '/app-icon.svg',
  '/manifest.json',
  '/strongs/hebrew.json',
  '/strongs/greek.json',
  '/bible/KJV/40.json', // Matthew
  '/bible/KJV/1.json',  // Genesis
  '/bible/KJV/19.json', // Psalms
  '/bible/KJV/43.json', // John
  '/bible/KJV/45.json', // Romans
  '/bible/NKJV/40.json',
  '/bible/ESV/40.json'
];

// Install event: Precache core assets & activate immediately
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      // Try to precache core assets gracefully (don't fail install if a non-critical file fails)
      for (const url of STATIC_PRECACHE) {
        try {
          await cache.add(url);
        } catch (err) {
          console.warn(`[SW] Precache failed for ${url}:`, err);
        }
      }
      return self.skipWaiting();
    })
  );
});

// Activate event: Clean up legacy caches & take immediate control
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch event: Network-first for navigations, Cache-first with stale-while-revalidate for assets
self.addEventListener('fetch', (event) => {
  const request = event.request;

  // Only handle GET requests
  if (request.method !== 'GET') {
    return;
  }

  const url = new URL(request.url);

  // Skip chrome-extension, non-http, or foreign external API URLs except fonts & bolls
  if (!url.protocol.startsWith('http')) {
    return;
  }

  // Navigation requests (HTML pages): Network-first with offline cache fallback
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          }
          return response;
        })
        .catch(async () => {
          const cached = await caches.match(request);
          if (cached) return cached;
          const rootCached = await caches.match('/');
          if (rootCached) return rootCached;
          return caches.match('/index.html');
        })
    );
    return;
  }

  // Static assets, fonts, Bible JSONs, Strong's dictionaries: Cache-first or Stale-While-Revalidate
  const isStaticOrData =
    url.pathname.startsWith('/bible/') ||
    url.pathname.startsWith('/strongs/') ||
    url.pathname.startsWith('/assets/') ||
    url.pathname.endsWith('.js') ||
    url.pathname.endsWith('.css') ||
    url.pathname.endsWith('.svg') ||
    url.pathname.endsWith('.json') ||
    url.hostname.includes('fonts.googleapis.com') ||
    url.hostname.includes('fonts.gstatic.com');

  if (isStaticOrData) {
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        // Fetch in background to update cache (stale-while-revalidate)
        const fetchPromise = fetch(request)
          .then((networkResponse) => {
            if (networkResponse && networkResponse.status === 200) {
              const clone = networkResponse.clone();
              caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
            }
            return networkResponse;
          })
          .catch(() => cachedResponse);

        return cachedResponse || fetchPromise;
      })
    );
    return;
  }

  // Default network fetch with fallback to cache
  event.respondWith(
    fetch(request)
      .then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200) {
          const clone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
        }
        return networkResponse;
      })
      .catch(() => caches.match(request))
  );
});
