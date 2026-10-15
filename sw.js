const CACHE_NAME = 'rg-v59';
// Leaflet: the page loads it on first map use (ensureLeaflet, same URLs);
// precached on install so maps open offline
const CDN_ASSETS = [
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css',
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js',
];

// Map tiles aren't pre-cached: CARTO needs a per-host API key, and tiles
// viewed online are cached on the fly below; offline maps fall back to
// the TOKYO_GEO vector layer. Tiles live in their own unversioned cache
// (they don't change with app releases), capped at MAX_TILES, oldest out first.
const TILE_CACHE = 'rg-tiles';
const MAX_TILES = 500;

async function putTile(key, res) {
  const cache = await caches.open(TILE_CACHE);
  await cache.put(key, res);
  const keys = await cache.keys(); // insertion order
  await Promise.all(keys.slice(0, Math.max(0, keys.length - MAX_TILES)).map(k => cache.delete(k)));
}

// App shell: precached on install so the game opens offline right after the
// first visit and right after an update (activate drops the old cache).
const APP_SHELL = [
  '/', '/index.html', '/manifest.json', '/data-tokyo.json',
  '/data-lines.js', '/data-i18n.js', '/data-transforms.js', '/data-connections.js', '/data-wards.js',
  '/style.css',
  '/js/01-core.js', '/js/02-i18n.js', '/js/03-schedule-services.js', '/js/04-data.js',
  '/js/05-connections.js', '/js/06-platforms.js', '/js/07-round.js', '/js/08-pickers.js',
  '/js/09-train-types.js', '/js/10-routing.js', '/js/11-transfers.js', '/js/12-places-map.js',
  '/js/13-history-session.js', '/js/14-stats-routemap.js', '/js/15-station-actions.js',
  '/js/16-save-image.js', '/js/17-init.js',
];

// Same-origin requests go to the network first, but a stalled connection
// (subway tunnels) falls back to the cached copy after this long.
const NETWORK_TIMEOUT_MS = 3000;

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_NAME)
      .then(c => Promise.all([
        // cache:'reload' skips the HTTP cache, so a fresh deploy can't precache a stale page
        c.addAll(APP_SHELL.map(u => new Request(u, { cache: 'reload' }))),
        // CDN is best-effort: a flaky unpkg must not block the install
        Promise.allSettled(CDN_ASSETS.map(u => c.add(u))),
      ]))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(k => k !== CACHE_NAME && k !== TILE_CACHE).map(k => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);

  // Network-first for same-origin (HTML, data), with a timeout fallback
  if (url.origin === location.origin) {
    if (e.request.method !== 'GET') return;
    // Only pages and files (paths with an extension). Extensionless paths are the
    // dev server's API (/state, /mtime, the /eval/stream bridge) under ?sw=1.
    if (e.request.mode !== 'navigate' && !/\.[a-z0-9]+$/i.test(url.pathname)) return;
    // Navigations (/, /index.html, /?utm=…) all resolve to the one cached page
    const cachedCopy = () => (e.request.mode === 'navigate'
      ? caches.match(e.request, { ignoreSearch: true })
          .then(r => r || caches.match('/', { ignoreSearch: true }))
          .then(r => r || caches.match('/index.html'))
      : caches.match(e.request));
    const network = fetch(e.request).then(res => {
      if (res.ok) {
        const clone = res.clone();
        caches.open(CACHE_NAME).then(c => c.put(e.request, clone));
      }
      return res;
    });
    const timedOut = new Promise(resolve => setTimeout(resolve, NETWORK_TIMEOUT_MS))
      .then(() => cachedCopy())
      .then(r => r || network);
    e.respondWith(
      Promise.race([network, timedOut])
        // Offline: cached copy, or a proper network error (not undefined)
        .catch(() => cachedCopy().then(r => r || Response.error()))
    );
    return;
  }

  // APIs and analytics (HERE places, GoatCounter) go straight to the
  // network — caching them would freeze a one-off error or stale result
  if (e.request.method !== 'GET' || /hereapi\.com|goatcounter\.com|zgo\.at/.test(url.hostname)) return;

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
          if (tileMatch) putTile(cacheKey, clone);
          else caches.open(CACHE_NAME).then(c => c.put(cacheKey, clone));
        }
        return res;
      }))
  );
});
