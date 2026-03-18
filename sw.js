const CACHE_NAME = 'video-vault-v1';
const BASE = '/Safari-app-motivational-/';
const ASSETS = [BASE, BASE + 'index.html', BASE + 'manifest.json', BASE + 'icons/icon-192.png', BASE + 'icons/icon-512.png'];

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
  if (e.request.url.includes('blob:')) return;
  e.respondWith(
    caches.match(e.request).then(r => r || fetch(e.request))
  );
});
