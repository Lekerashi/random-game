const CACHE_NAME = 'rg-v7';
const CDN_ASSETS = [
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css',
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js',
];

// Pre-cache CartoDB dark tiles for greater Tokyo area (zoom 10-11)
// Covers the area where train routes go (~1MB total)
function tokyoTileUrls() {
  const urls = [];
  const ranges = [
    // zoom 10: broad view (Kofu to Chiba, bay to Saitama)
    { z: 10, xMin: 906, xMax: 911, yMin: 402, yMax: 405 },
    // zoom 11: core Tokyo metro area
    { z: 11, xMin: 1813, xMax: 1822, yMin: 805, yMax: 810 },
  ];
  for (const r of ranges) {
    for (let x = r.xMin; x <= r.xMax; x++) {
      for (let y = r.yMin; y <= r.yMax; y++) {
        urls.push(`https://a.basemaps.cartocdn.com/dark_all/${r.z}/${x}/${y}.png`);
      }
    }
  }
  return urls;
}

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_NAME)
      .then(c => c.addAll([...CDN_ASSETS, ...tokyoTileUrls()]))
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

  // Cache-first for CDN assets (Leaflet, map tiles)
  // Normalize tile subdomain (a/b/c) so cache hits regardless of subdomain
  const tileMatch = url.href.match(/^https:\/\/[abc]\.basemaps\.cartocdn\.com\/(.+)$/);
  const cacheKey = tileMatch
    ? new Request('https://a.basemaps.cartocdn.com/' + tileMatch[1])
    : e.request;

  e.respondWith(
    caches.match(cacheKey)
      .then(cached => cached || fetch(e.request).then(res => {
        const clone = res.clone();
        caches.open(CACHE_NAME).then(c => c.put(cacheKey, clone));
        return res;
      }))
  );
});
