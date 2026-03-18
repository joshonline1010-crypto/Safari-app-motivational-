const CACHE_NAME = 'video-vault-v2';
const BASE = '/Safari-app-motivational-/';
const ASSETS = [BASE, BASE + 'index.html', BASE + 'manifest.json', BASE + 'icons/icon-192.png', BASE + 'icons/icon-512.png'];

// Max age for cached responses (7 days)
const MAX_AGE = 7 * 24 * 60 * 60 * 1000;

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE_NAME).then(c => c.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  const url = e.request.url;

  // Skip blob URLs and non-GET requests
  if (url.includes('blob:') || e.request.method !== 'GET') return;

  // Skip external embed URLs (YouTube, TikTok) — don't cache them
  if (url.includes('youtube.com') || url.includes('tiktok.com') || url.includes('img.youtube.com')) return;

  // Stale-while-revalidate for app assets
  e.respondWith(
    caches.open(CACHE_NAME).then(async cache => {
      const cached = await cache.match(e.request);

      // Fetch fresh copy in background
      const fetchPromise = fetch(e.request).then(response => {
        if (response && response.status === 200) {
          // Store with timestamp header for expiry tracking
          const cloned = response.clone();
          const headers = new Headers(cloned.headers);
          headers.set('sw-cached-at', Date.now().toString());
          const timedResponse = new Response(cloned.body, {
            status: cloned.status,
            statusText: cloned.statusText,
            headers
          });
          cache.put(e.request, timedResponse);
        }
        return response;
      }).catch(() => cached); // Fall back to cache if offline

      if (cached) {
        // Check if cached response is expired
        const cachedAt = parseInt(cached.headers.get('sw-cached-at') || '0');
        if (cachedAt && Date.now() - cachedAt > MAX_AGE) {
          // Expired — wait for fresh response
          return fetchPromise;
        }
        // Fresh cache — return immediately, revalidate in background
        return cached;
      }

      return fetchPromise;
    })
  );
});
