const CACHE_NAME = 'rg-v30';
const CDN_ASSETS = [
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css',
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js',
];

// Map tiles aren't pre-cached: CARTO needs a per-host API key, and tiles
// viewed online are cached on the fly below; offline maps fall back to
// the TOKYO_GEO vector layer.
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_NAME)
      .then(c => c.addAll(CDN_ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);

  // Network-first for same-origin (HTML, data-tokyo.json)
  if (url.origin === location.origin) {
    e.respondWith(
      fetch(e.request)
        .then(res => {
          if (res.ok) {
            const clone = res.clone();
            caches.open(CACHE_NAME).then(c => c.put(e.request, clone));
          }
          return res;
        })
        .catch(() => caches.match(e.request))
    );
    return;
  }

  // APIs and analytics (HERE places, GoatCounter) go straight to the
  // network — caching them would freeze a one-off error or stale result
  if (e.request.method !== 'GET' || /hereapi\.com|goatcounter\.com/.test(url.hostname)) return;

  // Cache-first for CDN assets (Leaflet, map tiles)
  // Normalize tile subdomain (a/b/c) so cache hits regardless of subdomain
  const tileMatch = url.href.match(/^https:\/\/[abc]\.basemaps\.cartocdn\.com\/(.+)$/);
  const cacheKey = tileMatch
    ? new Request('https://a.basemaps.cartocdn.com/' + tileMatch[1])
    : e.request;

  // An opaque cached copy can't satisfy a CORS request (canvas export would
  // fail to load it) — fetch fresh instead
  const usable = cached => cached && !(cached.type === 'opaque' && e.request.mode === 'cors');

  e.respondWith(
    caches.match(cacheKey)
      .then(cached => usable(cached) ? cached : fetch(e.request).then(res => {
        // Opaque = no-cors tile <img>; its status is unreadable but it's normally fine
        if (res.ok || res.type === 'opaque') {
          const clone = res.clone();
          caches.open(CACHE_NAME).then(c => c.put(cacheKey, clone));
        }
        return res;
      }))
  );
});
