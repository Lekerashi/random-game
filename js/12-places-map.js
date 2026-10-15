'use strict';

// ── Map ───────────────────────────────────────────────────────────────────
// CARTO dark basemap used by every Leaflet map in the game
function cartoTileLayer() {
  return L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png?key=' + CARTO_KEY, {
    maxZoom: 19,
    // CORS tiles: the SW then caches readable copies that saveSessionImage's
    // canvas can draw (an opaque cached copy would taint it and be refused)
    crossOrigin: true,
    attribution: CARTO_ATTRIBUTION,
  });
}

function showMap() {
  if (typeof L === 'undefined') { showError(t('mapUnavailable')); return; } // Leaflet CDN unreachable
  dom.mapCard.style.display = 'block';
  dom.mapCard.scrollIntoView({ behavior: 'smooth', block: 'nearest' });

  const { lat, lng, name } = state.destination;

  if (!state.leafletMap) {
    state.leafletMap = L.map('map', { zoomControl: true }).setView([lat, lng], 15);
    cartoTileLayer().addTo(state.leafletMap);
  } else {
    state.leafletMap.invalidateSize(); // card was hidden; Leaflet cached a 0×0 size
    state.leafletMap.setView([lat, lng], 15);
    if (state.mapMarker) state.leafletMap.removeLayer(state.mapMarker);
  }

  state.mapMarker = L.marker([lat, lng])
    .addTo(state.leafletMap)
    .bindPopup(`<strong>${name}</strong>`)
    .openPopup();
}

// ── Bars & Cafes (HERE Maps) ──────────────────────────────────────────────
const PLACES_PAGE_SIZE = 5;
const _placesCache = { bars: null, cafes: null };

// Escape third-party text (HERE place names) before it goes into innerHTML
function escHtml(s) {
  return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
}

function renderPlaceItems(items, shown) {
  return items.slice(0, shown).map(p =>
    `<div class="bar-item">
      <span class="bar-icon">${p.icon}</span>
      <span class="bar-name"><a href="${p.mapsUrl}" target="_blank" rel="noopener">${escHtml(p.name)}</a>${p.placeType ? `<small class="text-muted" style="margin-left:6px">${escHtml(p.placeType)}</small>` : ''}</span>
      <span class="bar-dist">${Math.round(p.dist)} m</span>
    </div>`
  ).join('');
}

function renderPlacesContent(mode, items, shown) {
  const isBars = mode === 'bars';
  const content = isBars ? dom.barsContent : dom.cafesContent;
  let html = `<div class="bars-list">${renderPlaceItems(items, shown)}</div>`;
  if (shown < items.length) {
    html += `<button class="show-more-btn" id="show-more-${mode}">${isBars ? t('showMoreBars') : t('showMoreCafes')}</button>`;
  }
  content.innerHTML = html;
  if (shown < items.length) {
    document.getElementById(`show-more-${mode}`).addEventListener('click', () => {
      const next = shown + PLACES_PAGE_SIZE;
      renderPlacesContent(mode, items, next);
    });
  }
}

function hidePlaces(mode) {
  const isBars = mode === 'bars';
  const card = isBars ? dom.barsCard : dom.cafesCard;
  const btn  = isBars ? dom.showBarsBtn : dom.showCafesBtn;
  card.style.display = 'none';
  btn.textContent = t(isBars ? 'barsBtn' : 'cafesBtn');
}

async function togglePlaces(mode) {
  const isBars  = mode === 'bars';
  const other   = isBars ? 'cafes' : 'bars';
  const card    = isBars ? dom.barsCard    : dom.cafesCard;
  const content = isBars ? dom.barsContent : dom.cafesContent;
  const btn     = isBars ? dom.showBarsBtn : dom.showCafesBtn;

  // Toggle off if already visible
  if (card.style.display === 'block') {
    hidePlaces(mode);
    return;
  }

  // Close the other panel first
  const otherCard = isBars ? dom.cafesCard : dom.barsCard;
  if (otherCard.style.display === 'block') hidePlaces(other);

  // Show card and update button text
  card.style.display = 'block';
  btn.textContent = t(isBars ? 'hideBarsBtn' : 'hideCafesBtn');
  card.scrollIntoView({ behavior: 'smooth', block: 'nearest' });

  // Use cache if we already fetched for this destination
  if (_placesCache[mode]) {
    renderPlacesContent(mode, _placesCache[mode], PLACES_PAGE_SIZE);
    return;
  }

  content.innerHTML = `<div class="bars-empty">${isBars ? t('searchingBars') : t('searchingCafes')}</div>`;

  const dest = state.destination;
  const { lat, lng } = dest;
  const circle = `circle:${lat},${lng};r=${PLACES_RADIUS}`;
  // The player may roll on while HERE responds — drop results for an old stop
  const stale = () => state.destination !== dest;

  try {
    let items;
    if (isBars) {
      const [browseRes, izakayaRes] = await Promise.all([
        fetch(`https://browse.search.hereapi.com/v1/browse?at=${lat},${lng}&categories=200-2000-0011&in=${encodeURIComponent(circle)}&limit=50&apiKey=${HERE_API_KEY}`),
        fetch(`https://discover.search.hereapi.com/v1/discover?at=${lat},${lng}&q=%E5%B1%85%E9%85%92%E5%B1%8B&in=${encodeURIComponent(circle)}&limit=50&apiKey=${HERE_API_KEY}`),
      ]);
      if (!browseRes.ok) throw new Error(`HERE HTTP ${browseRes.status}`);
      const [browseData, izakayaData] = await Promise.all([
        browseRes.json(),
        izakayaRes.ok ? izakayaRes.json() : { items: [] },
      ]);
      const seen = new Set();
      items = [...(browseData.items || []), ...(izakayaData.items || [])]
        .filter(p => {
          const key = `${p.title}|${p.position?.lat?.toFixed(4)}|${p.position?.lng?.toFixed(4)}`;
          return !seen.has(key) && seen.add(key);
        })
        .map(p => {
          const catName    = (p.categories?.[0]?.name || '').toLowerCase();
          const nameLow    = p.title.toLowerCase();
          const isIzakaya  = nameLow.includes('izakaya') || p.title.includes('居酒屋') || catName.includes('izakaya');
          const isPub      = catName.includes('pub');
          const icon       = isIzakaya ? '🏮' : isPub ? '🍻' : '🍺';
          const placeType  = isIzakaya ? 'Izakaya' : isPub ? 'Pub' : 'Bar';
          const vLat = p.position?.lat;
          const vLng = p.position?.lng;
          return { name: p.title, dist: p.distance, icon, placeType,
                   mapsUrl: `https://www.google.com/maps/search/${encodeURIComponent(p.title)}/@${vLat},${vLng},17z` };
        })
        .sort((a, b) => a.dist - b.dist);
    } else {
      const res = await fetch(`https://browse.search.hereapi.com/v1/browse?at=${lat},${lng}&categories=100-1100-0010&in=${encodeURIComponent(circle)}&limit=50&apiKey=${HERE_API_KEY}`);
      if (!res.ok) throw new Error(`HERE HTTP ${res.status}`);
      const data = await res.json();
      items = (data.items || [])
        .map(p => {
          const vLat = p.position?.lat;
          const vLng = p.position?.lng;
          return { name: p.title, dist: p.distance, icon: '☕',
                   mapsUrl: `https://www.google.com/maps/search/${encodeURIComponent(p.title)}/@${vLat},${vLng},17z` };
        })
        .sort((a, b) => a.dist - b.dist);
    }

    if (stale()) return;
    if (items.length === 0) {
      content.innerHTML = `<div class="bars-empty">${isBars ? t('noBars') : t('noCafes')}</div>`;
      return;
    }

    _placesCache[mode] = items;
    renderPlacesContent(mode, items, PLACES_PAGE_SIZE);
  } catch (err) {
    if (stale()) return;
    content.innerHTML = `<div class="bars-empty">${isBars ? t('fetchBarFail', { msg: err.message }) : t('fetchCafeFail', { msg: err.message })}</div>`;
  }
}

_langRefreshers.push(function refreshPlacesBtns() {
  const barsOpen  = dom.barsCard.style.display === 'block';
  const cafesOpen = dom.cafesCard.style.display === 'block';
  dom.showBarsBtn.textContent  = t(barsOpen  ? 'hideBarsBtn'  : 'barsBtn');
  dom.showCafesBtn.textContent = t(cafesOpen ? 'hideCafesBtn' : 'cafesBtn');
});
