const CACHE = 'geeLogistics-v3';
const ASSETS = [
  '/',
  '/index.html',
  '/shop.html',
  '/admin.html',
  '/styles.css',
  '/app.js',
  '/shop.js',
  '/admin.js',
  '/db.js',
  '/manifest.json',
  'https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/css/bootstrap.min.css'
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)));
});
self.addEventListener('fetch', e => {
  e.respondWith(
    caches.match(e.request).then(r => r || fetch(e.request))
  );
});
