const CACHE_NAME = 'acessifood-shell-v10-accessibility-tools';
const APP_SHELL = [
  './', './index.html', './style.css', './app.js', './supabase-config.js', './supabase-sync.js', './manifest.webmanifest',
  './assets/icon-192.png', './assets/icon-512.png',
  './assets/food-table.jpg', './assets/burger.jpg', './assets/pizza.jpg', './assets/brazilian.jpg'
];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE_NAME).then(async cache => { for (const asset of APP_SHELL) { try { await cache.add(asset); } catch (error) { console.warn('Não foi possível armazenar em cache:', asset); } } }));
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(
    keys.filter(key => key.startsWith('acessifood-shell-') && key !== CACHE_NAME).map(key => caches.delete(key))
  )).then(() => self.clients.claim()));
});

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET' || new URL(request.url).origin !== self.location.origin) return;
  if (request.mode === 'navigate') {
    event.respondWith(fetch(request).then(response => {
      const copy = response.clone();
      caches.open(CACHE_NAME).then(cache => cache.put('./index.html', copy));
      return response;
    }).catch(() => caches.match('./index.html')));
    return;
  }
  event.respondWith(caches.match(request).then(cached => {
    if (cached) return cached;
    return fetch(request).then(response => {
      if (response && response.ok) {
        const copy = response.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(request, copy));
      }
      return response;
    });
  }));
});
