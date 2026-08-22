/**
 * HandiMonde Service Worker
 * Enables offline support, asset caching, and instant map loads
 * © 2026 Studio Niko Design
 */

const CACHE_NAME = 'handimonde-v1';
const ASSETS = [
  '/',
  '/index.html',
  'https://fonts.googleapis.com/css2?family=Atkinson+Hyperlegible:wght@400;700&family=Lexend:wght@500;600;700&family=JetBrains+Mono:wght@500;700&display=swap',
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css',
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'
];

// Install event: cache critical assets
self.addEventListener('install', event => {
  console.log('ServiceWorker: installing v1');
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      console.log('ServiceWorker: caching assets');
      return cache.addAll(ASSETS).catch(err => {
        console.warn('ServiceWorker: could not cache all assets', err);
      });
    })
  );
  self.skipWaiting();
});

// Activate event: clean old caches
self.addEventListener('activate', event => {
  console.log('ServiceWorker: activating');
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames
          .filter(name => name !== CACHE_NAME)
          .map(name => {
            console.log('ServiceWorker: deleting old cache', name);
            return caches.delete(name);
          })
      );
    })
  );
  self.clients.claim();
});

// Fetch event: network-first strategy with cache fallback
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') return;

  // Handle Overpass API calls: network-first
  if (url.hostname.includes('overpass')) {
    event.respondWith(
      fetch(request)
        .then(response => {
          if (response.status === 200) {
            const cache = caches.open(CACHE_NAME);
            cache.then(c => c.put(request, response.clone()));
          }
          return response;
        })
        .catch(() => {
          // Offline: try cache, then offline page
          return caches.match(request).catch(() => {
            return new Response(
              JSON.stringify({ error: 'offline' }),
              { status: 503, headers: { 'Content-Type': 'application/json' } }
            );
          });
        })
    );
    return;
  }

  // Handle static assets: cache-first
  event.respondWith(
    caches.match(request).then(cachedResponse => {
      if (cachedResponse) return cachedResponse;

      return fetch(request)
        .then(response => {
          // Cache successful responses
          if (response && response.status === 200) {
            const responseToCache = response.clone();
            caches.open(CACHE_NAME).then(cache => {
              cache.put(request, responseToCache);
            });
          }
          return response;
        })
        .catch(() => {
          // Offline fallback
          console.warn('ServiceWorker: fetch failed for', request.url);
          return new Response(
            'Offline - content not available',
            { status: 503, statusText: 'Service Unavailable' }
          );
        });
    })
  );
});

// Background sync for contributions (future enhancement)
self.addEventListener('sync', event => {
  if (event.tag === 'sync-contributions') {
    event.waitUntil(
      caches.open(CACHE_NAME).then(cache => {
        // Retry pending contributions when back online
        console.log('ServiceWorker: syncing pending contributions');
      })
    );
  }
});
