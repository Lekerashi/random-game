'use strict';

// ── Session stats & route maps ────────────────────────────────────────────

function getSessionStats() {
  const h = state.history;
  const stations = new Set();
  const lines = new Set();
  let totalStops = 0;
  let totalDistM = 0;
  let drinks = 0;

  for (const e of h) {
    if (e.drinkHere) stations.add(e.from);
    else stations.add(e.to);
    if (e.line) lines.add(e.line);
    totalStops += e.stopsUsed || e.stops || 0;
    if (e.drinkHere || e.drinkAtTransfer || e.drinkAtArrival) drinks++;
    if (e.fromLat != null && e.toLat != null) {
      totalDistM += haversineM(e.fromLat, e.fromLng, e.toLat, e.toLng);
    }
  }
  return { stations: stations.size, lines: lines.size, totalStops, distKm: (totalDistM / 1000).toFixed(1), drinks };
}

function updateHistoryDistance() {
  if (state.history.length === 0) {
    dom.historyDist.textContent = '';
    return;
  }
  const stats = getSessionStats();
  dom.historyDist.textContent = t('distanceTraveled', { km: stats.distKm });
}

function showStats() {
  if (state.history.length === 0) return;
  const s = getSessionStats();
  const grid = document.getElementById('stats-grid');
  grid.innerHTML = `
    <div class="stat-box"><div class="stat-val">${s.stations}</div><div class="stat-label">${t('statStations')}</div></div>
    <div class="stat-box"><div class="stat-val">${s.lines}</div><div class="stat-label">${t('statLines')}</div></div>
    <div class="stat-box"><div class="stat-val">${s.totalStops}</div><div class="stat-label">${t('statStops')}</div></div>
    <div class="stat-box"><div class="stat-val">${s.drinks}</div><div class="stat-label">${t('statDrinks')}</div></div>
    <div class="stat-box full-width"><div class="stat-val">${s.distKm} km</div><div class="stat-label">${t('statDistance')}</div></div>
  `;
  document.getElementById('stats-overlay').classList.remove('hidden');
}

function hideStats() {
  document.getElementById('stats-overlay').classList.add('hidden');
  document.getElementById('route-map-wrap').style.display = 'none';
  document.getElementById('stats-save-wrap').style.display = 'none';
  document.getElementById('stats-map-btn').textContent = t('showRouteMap');
  destroyMap('routeMap');
}

function destroyMap(key) {
  if (state[key]) { state[key].remove(); state[key] = null; }
}

// Shared: create a Leaflet route map on the given element ID
const MARKER_TYPE_RANK = { start: 0, transfer: 1, drink: 2 };

function collectRouteMarkers(history) {
  const markers = new Map();
  function track(lat, lng, name, ja, type) {
    if (lat == null) return;
    const key = lat + ',' + lng;
    const existing = markers.get(key);
    if (!existing) markers.set(key, { lat, lng, name, ja, type });
    else if (MARKER_TYPE_RANK[type] > MARKER_TYPE_RANK[existing.type]) {
      existing.type = type; existing.name = name; existing.ja = ja;
    }
  }
  if (history.length > 0 && history[0].fromLat != null) {
    track(history[0].fromLat, history[0].fromLng, history[0].from, history[0].fromJa, 'start');
  }
  for (const e of history) {
    if (e.drinkHere) {
      track(e.fromLat, e.fromLng, e.from, e.fromJa, 'drink');
    } else if (e.flight) {
      track(e.fromLat, e.fromLng, e.from, e.fromJa, 'transfer'); // left from the airport, no drink
    } else if (e.transferred || e.drinkAtTransfer) {
      track(e.toLat, e.toLng, e.to, e.toJa, e.drinkAtTransfer ? 'drink' : 'transfer');
    } else if (e.toLat != null) {
      track(e.toLat, e.toLng, e.to, e.toJa, 'drink');
    }
  }
  return markers;
}

function buildRouteMap(elId) {
  const map = L.map(elId, {
    zoomControl: true,
    scrollWheelZoom: false,
  }).setView([35.681, 139.767], 11);

  // Vector base layer (below tiles — visible offline, covered by tiles online)
  map.createPane('vectorBase');
  map.getPane('vectorBase').style.zIndex = 150;

  if (typeof TOKYO_GEO !== 'undefined') {
    // Land + boundaries first
    L.geoJSON(TOKYO_GEO, {
      pane: 'vectorBase',
      filter: function(f) { return f.properties.type !== 'water'; },
      style: function(feature) {
        const t = feature.properties.type;
        if (t === 'river') return { color: '#2a6090', weight: 2, opacity: 0.8, fill: false };
        if (t === 'prefecture') return { color: '#3a4450', weight: 1.5, opacity: 0.6, fillColor: '#161b22', fillOpacity: 0.8 };
        if (t === 'ward') return { color: '#3a4450', weight: 1, opacity: 0.5, fillColor: '#1c2230', fillOpacity: 0.3 };
        return { color: '#2a3240', weight: 0.7, opacity: 0.4, fillColor: '#161b22', fillOpacity: 0.25 };
      },
      interactive: false,
    }).addTo(map);
    // Water on top — masks bay area where prefecture polygons extend into water
    L.geoJSON(TOKYO_GEO, {
      pane: 'vectorBase',
      filter: function(f) { return f.properties.type === 'water'; },
      style: function() { return { color: '#1a4570', weight: 1, opacity: 0.5, fillColor: '#0d1520', fillOpacity: 1 }; },
      interactive: false,
    }).addTo(map);
  }

  // Tile layer (covers vector base when online)
  cartoTileLayer().addTo(map);

  const bounds = L.latLngBounds();
  const stopMarkers = collectRouteMarkers(state.history);

  for (const e of state.history) {
    if (e.fromLat == null) continue;

    if (e.routeCoords && e.routeCoords.length >= 2) {
      const latlngs = e.routeCoords.map(c => L.latLng(c[0], c[1]));
      L.polyline(latlngs, { color: e.color || '#8b949e', weight: 3, opacity: 0.85 }).addTo(map);
      for (const ll of latlngs) bounds.extend(ll);
    } else if (!e.drinkHere && !e.flight && e.toLat != null) {
      const from = L.latLng(e.fromLat, e.fromLng);
      const to   = L.latLng(e.toLat, e.toLng);
      L.polyline([from, to], { color: e.color || '#8b949e', weight: 3, opacity: 0.85 }).addTo(map);
      bounds.extend(from); bounds.extend(to);
    }
  }
  for (const [, s] of stopMarkers) bounds.extend(L.latLng(s.lat, s.lng));

  const TRANSFER_MARKER = { radius: 3.5, fillColor: '#58a6ff', color: '#30363d', weight: 1, fillOpacity: 0.9 };
  const START_MARKER    = { radius: 5,   fillColor: '#e6edf3', color: '#30363d', weight: 1.5, fillOpacity: 0.9 };
  const drinkIcon = L.divIcon({ className: 'route-map-drink', html: '🍺', iconSize: [18, 18], iconAnchor: [9, 9] });

  for (const [, s] of stopMarkers) {
    const label = s.ja ? s.name + ' / ' + s.ja : s.name;
    const pt = L.latLng(s.lat, s.lng);
    if (s.type === 'drink') {
      L.marker(pt, { icon: drinkIcon }).bindTooltip(label, { direction: 'top', className: 'route-map-tooltip' }).addTo(map);
    } else {
      const opts = s.type === 'transfer' ? TRANSFER_MARKER : START_MARKER;
      L.circleMarker(pt, opts).bindTooltip(label, { direction: 'top', className: 'route-map-tooltip' }).addTo(map);
    }
  }

  // No animation: a zoom animation still running when the map is closed
  // (destroyMap) throws inside Leaflet (_leaflet_pos of a removed pane)
  if (bounds.isValid()) {
    map.fitBounds(bounds.pad(0.15), { animate: false });
  } else {
    map.setView([35.681, 139.767], 12, { animate: false });
  }

  setTimeout(() => { if (map._mapPane) map.invalidateSize(); }, 100); // map may be removed by then
  return map;
}

function toggleRouteMap(stateKey, wrapId, mapElId, btnId, saveWrapId) {
  const wrap = document.getElementById(wrapId);
  const btn  = document.getElementById(btnId);
  const showing = wrap.style.display !== 'none';
  wrap.style.display = showing ? 'none' : 'block';
  btn.textContent = t(showing ? 'showRouteMap' : 'hideRouteMap');
  if (saveWrapId) document.getElementById(saveWrapId).style.display = showing ? 'none' : '';
  destroyMap(stateKey);
  if (!showing) state[stateKey] = buildRouteMap(mapElId);
}

function showRouteMap()        { toggleRouteMap('routeMap',       'route-map-wrap',        'route-map',        'stats-map-btn', 'stats-save-wrap'); }
function toggleInlineRouteMap() { toggleRouteMap('inlineRouteMap', 'inline-route-map-wrap', 'inline-route-map', 'inline-map-btn', 'inline-save-wrap'); }

_langRefreshers.push(function refreshRouteMapBtn() {
  const btn = document.getElementById('stats-map-btn');
  const wrap = document.getElementById('route-map-wrap');
  if (btn) btn.textContent = t(wrap && wrap.style.display !== 'none' ? 'hideRouteMap' : 'showRouteMap');
  const inBtn = document.getElementById('inline-map-btn');
  const inWrap = document.getElementById('inline-route-map-wrap');
  if (inBtn) inBtn.textContent = t(inWrap && inWrap.style.display !== 'none' ? 'hideRouteMap' : 'showRouteMap');
});

function refreshInlineRouteMap() {
  if (!state.inlineRouteMap) return;
  destroyMap('inlineRouteMap');
  state.inlineRouteMap = buildRouteMap('inline-route-map');
}
