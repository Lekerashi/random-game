'use strict';

// ── Constants ─────────────────────────────────────────────────────────────
const DATA_URL  = './data-tokyo.json'; // pre-built — see .claude/build-data.js
const CACHE_KEY = 'random_game_v14';
const ODPT_DATA_DATE = '2026-10-16'; // last ODPT fetch used to check the train data; shown under How to Play › Advanced › License
const APP_VERSION = 'rg-v85'; // = sw.js CACHE_NAME; the pre-commit hook keeps them equal. Shown under How to Play › Advanced
const CACHE_TTL = 30 * 24 * 60 * 60 * 1000; // 30 days

// HERE Maps API key (developer.here.com) for the Bars & Cafes panels
const HERE_API_KEY = 'h3YRc3suzD_27R6E1lLU5uuCVAyN4odI5OKV57ZO0H4';

// CARTO basemap keys (carto.com/basemaps), each Referer-restricted to one host
const CARTO_KEY_PROD = 'cb1_4ivi_1_5e4887fc381a10aaa0b641b3'; // randomgame.tokyo
const CARTO_KEY_DEV = 'cb1_4ivi_2_450e7e6a88e16b448d1db168'; // localhost:5500
const CARTO_KEY = location.hostname === 'localhost' ? CARTO_KEY_DEV : CARTO_KEY_PROD;
const CARTO_ATTRIBUTION = '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors © <a href="https://carto.com/attributions">CARTO</a>';

// ── Game logic constants ─────────────────────────────────────────────────
const OEDO_LOOP_END     = 28;    // index of the second Tochomae entry (end of loop, start of stem)
const FLIGHT_PROBABILITY     = 0.05; // 5% chance to trigger flight at airport stations
const SHINKANSEN_PROBABILITY = 0.05; // 5% chance to roll shinkansen at shared stations
const SHINKANSEN_LINES = new Set(['Tokaido Shinkansen', 'Tohoku Shinkansen', 'Joetsu Shinkansen']);
const PLACES_RADIUS     = 500;   // meters — search radius for nearby bars/cafes
const EARTH_RADIUS_M    = 6371000;
const THIRST_THRESHOLD  = 5;     // stations without drinking before extra drink rolls kick in
const SHINKANSEN_THIRST = 3;     // thirst multiplier per shinkansen stop (longer distances)
const TRANSFER_DIE_SIDES = 5;    // base sides: 1-3 stay, 4 transfer, 5+ drink
const TRANSFER_DIE_FRAMES   = 8;     // number of animation frames for transfer die
const TRANSFER_DIE_FRAME_MS = 80;    // ms between transfer die animation frames
const TRANSFER_ARRIVE_DELAY = 200;   // ms pause before showing arrival after transfers
const TRANSFER_REDIRECT_DELAY = 400; // ms pause before redirecting after a transfer
const UNDO_TRANSFER_TIMEOUT = 3000;  // ms to show undo button before auto-dismissing
const FEEDBACK_RESET_DELAY  = 2000;  // ms before resetting copy/feedback button text
const NORMALIZE_CACHE_MAX = 20000;   // normalize() memo entries before it starts over
const LEG_SAME_STATION_M = 400;      // two names this close are one station (新線新宿 / Toei 新宿)
const LANG_KEY           = 'random_game_lang';
const SESSION_KEY        = 'random_game_session';
const SESSION_TTL        = 24 * 60 * 60 * 1000; // 24 hours
const LTW_KEY            = 'ltw_dismissed';  // last-train warning dismissal

// ── Utilities ─────────────────────────────────────────────────────────────
// Pure, and run on every name match of every route walk: memoized (most of a
// validate sweep's time was these regexes). Bounded, as search input passes too.
function normalize(s) {
  const cache = normalize._cache || (normalize._cache = new Map());
  let v = cache.get(s);
  if (v === undefined) {
    v = (s || '').toLowerCase()
      .replace(/[ōô]/g, 'o').replace(/[ūû]/g, 'u')
      .replace(/[āâ]/g, 'a').replace(/[ēê]/g, 'e').replace(/[īî]/g, 'i')
      .replace(/[\s\-'・]+/g, '')
      .replace(/station$/, '');
    if (cache.size >= NORMALIZE_CACHE_MAX) cache.clear();
    cache.set(s, v);
  }
  return v;
}

function haversineM(lat1, lng1, lat2, lng2) {
  const R = EARTH_RADIUS_M, toR = Math.PI / 180;
  const dLat = (lat2 - lat1) * toR, dLng = (lng2 - lng1) * toR;
  const a = Math.sin(dLat/2)**2 + Math.cos(lat1*toR)*Math.cos(lat2*toR)*Math.sin(dLng/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

// Direction helpers — centralize start/end index math used throughout routing.
// 'A' (circular CCW) maps to the same step as 'start'; 'B' (CW) maps to 'end'.
function dirStep(dir) { return (dir === 'start' || dir === 'A') ? -1 : 1; }
function dirEnd(N, dir) { return (dir === 'start' || dir === 'A') ? 0 : N - 1; }

// ── Easter egg stations ──────────────────────────────────────────────────
// Each entry defines the special behavior for a station.
//   emoji:       replaces 🍻 in platform pills, history, copy, and arrival card
//   hintKey:     i18n key for the hint on the arrival card (replaces drinkHint)
//   hintEmoji:   emoji prefix for the hint line (only for append/prepend eggs)
//   rollKey:     i18n key for the die label (replaces drinkRoll)
//   stayingKey:  i18n key for "staying for..." subtitle (replaces stayingForDrink)
//   stayedKey:   i18n key for history/copy text (replaces stayedForDrink)
//   labelKey:    i18n key for platform pill label (replaces drinkHereLabel)
//   position:    'replace' = swap the main drink hint, 'append'/'prepend' = add extra hint
// Tokyo Disneyland / DisneySea stations: go into the park instead of drinking
const DISNEY_PARK_EGG = {
  emoji: '🏰', hintKey: 'disneyHint', rollKey: 'disneyRoll',
  stayingKey: 'stayingForDisney', stayedKey: 'stayedForDisney',
  labelKey: 'disneyHereLabel', position: 'replace',
};
const EASTER_EGGS = {
  '海芝浦': {  // Umi-Shibaura — waterfront park, no bars
    emoji: '🌊', hintKey: 'parkHint', rollKey: 'parkRoll',
    stayingKey: 'stayingForPark', stayedKey: 'stayedForPark',
    labelKey: 'parkHereLabel', position: 'replace',
  },
  '舞浜': {  // Maihama — Disney Resort
    emoji: '🏰🐭🎀👑👸🏻', position: 'replace',
  },
  '東京ディズニーランド・ステーション': DISNEY_PARK_EGG,  // Tokyo Disneyland
  '東京ディズニーシー・ステーション': DISNEY_PARK_EGG,  // Tokyo DisneySea
  '梶が谷': {  // Kajigaya — Say hi to Shane
    hintKey: 'kajigayaHint', hintEmoji: '👋', position: 'append',
  },
  '西ケ原': {  // Nishigahara — least-used Tokyo Metro station
    hintKey: 'nishigaharaHint', hintEmoji: '🚇', position: 'prepend',
  },
  '幕張豊砂': {  // Makuhari-Toyosuna — Costco at the doorstep
    emoji: '🌭', hintKey: 'hotdogHint', rollKey: 'hotdogRoll',
    stayingKey: 'stayingForHotdog', stayedKey: 'stayedForHotdog',
    labelKey: 'hotdogHereLabel', position: 'replace',
  },
};

function getEgg(stationJa) { return EASTER_EGGS[stationJa]; }
function eggEmoji(stationJa) { return getEgg(stationJa)?.emoji || '🍻'; }
function eggRollKey(stationJa) { return getEgg(stationJa)?.rollKey || 'drinkRoll'; }
function eggStayingKey(stationJa) { return getEgg(stationJa)?.stayingKey || 'stayingForDrink'; }
function eggStayedKey(stationJa) { return getEgg(stationJa)?.stayedKey || 'stayedForDrink'; }
function eggLabelKey(stationJa) { return getEgg(stationJa)?.labelKey || 'drinkHereLabel'; }
function eggDrinkAtArrival(stationJa) { return getEgg(stationJa)?.emoji || t('drinkAtArrivalHist'); }



// 23 Special Wards of Tokyo — outer edge of the data-wards.js ward polygons
// (raster union, ~150 m simplification), inlined because data-wards.js loads
// deferred. Edges: Tama River (Kanagawa), Arakawa/Saitama border, Edogawa
// (Chiba). game.validateWards() checks every station against those polygons.
const WARDS_23_RING = [  // [lng, lat]
  [139.855,35.483], [139.858,35.483], [139.858,35.603], [139.869,35.621], [139.872,35.638], [139.884,35.645], [139.886,35.65], [139.887,35.679],
  [139.892,35.682], [139.907,35.684], [139.919,35.698], [139.916,35.709], [139.911,35.711], [139.898,35.725], [139.897,35.73], [139.901,35.737],
  [139.9,35.744], [139.889,35.751], [139.88,35.766], [139.881,35.773], [139.892,35.777], [139.894,35.783], [139.872,35.783], [139.871,35.787],
  [139.877,35.793], [139.875,35.797], [139.859,35.795], [139.853,35.792], [139.844,35.8], [139.837,35.801], [139.834,35.796], [139.826,35.794],
  [139.82,35.799], [139.82,35.804], [139.825,35.811], [139.822,35.815], [139.816,35.809], [139.803,35.809], [139.795,35.805], [139.78,35.808],
  [139.772,35.817], [139.766,35.817], [139.76,35.812], [139.755,35.813], [139.751,35.811], [139.751,35.806], [139.759,35.799], [139.76,35.795],
  [139.754,35.787], [139.746,35.786], [139.743,35.782], [139.74,35.783], [139.737,35.789], [139.725,35.788], [139.72,35.792], [139.706,35.793],
  [139.693,35.801], [139.684,35.799], [139.653,35.8], [139.649,35.798], [139.64,35.798], [139.639,35.792], [139.627,35.784], [139.624,35.78],
  [139.625,35.77], [139.622,35.767], [139.617,35.768], [139.615,35.771], [139.607,35.77], [139.603,35.772], [139.603,35.776], [139.589,35.779],
  [139.588,35.776], [139.57,35.766], [139.569,35.763], [139.563,35.763], [139.5694,35.7512], [139.5679,35.7502], [139.5691,35.7478], [139.5684,35.7416],
  [139.565,35.721], [139.579,35.717], [139.595,35.705], [139.591,35.696], [139.587,35.695], [139.591,35.691], [139.592,35.685], [139.586,35.682],
  [139.588,35.678], [139.582,35.674], [139.589,35.67], [139.59,35.667], [139.587,35.663], [139.589,35.663], [139.59,35.656], [139.593,35.654],
  [139.591,35.647], [139.587,35.646], [139.585,35.642], [139.587,35.635], [139.591,35.633], [139.593,35.627], [139.589,35.623], [139.59,35.618],
  [139.612,35.616], [139.615,35.613], [139.619,35.614], [139.631,35.608], [139.632,35.605], [139.653,35.591], [139.663,35.59], [139.668,35.587],
  [139.678,35.563], [139.689,35.557], [139.702,35.554], [139.703,35.55], [139.698,35.545], [139.7,35.538], [139.71,35.536], [139.719,35.538],
  [139.725,35.543], [139.735,35.541], [139.739,35.545], [139.757,35.545], [139.808,35.517], [139.818,35.507],
];
const WARDS_23_BOUNDS = WARDS_23_RING.reduce((b, [lng, lat]) => ({
  minLng: Math.min(b.minLng, lng), maxLng: Math.max(b.maxLng, lng),
  minLat: Math.min(b.minLat, lat), maxLat: Math.max(b.maxLat, lat),
}), { minLng: Infinity, maxLng: -Infinity, minLat: Infinity, maxLat: -Infinity });
function isIn23Wards(lat, lng) {
  if (lat > WARDS_23_BOUNDS.maxLat || lat < WARDS_23_BOUNDS.minLat ||
      lng > WARDS_23_BOUNDS.maxLng || lng < WARDS_23_BOUNDS.minLng) return false;
  return pointInPolygon(lat, lng, WARDS_23_RING);
}

// ── Point-in-polygon (ray casting) ───────────────────────────────────────
function pointInPolygon(lat, lng, ring) {
  // ring is GeoJSON [lng, lat] pairs
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const xi = ring[i][0], yi = ring[i][1];
    const xj = ring[j][0], yj = ring[j][1];
    if ((yi > lat) !== (yj > lat) && lng < (xj - xi) * (lat - yi) / (yj - yi) + xi) {
      inside = !inside;
    }
  }
  return inside;
}

function getWardOrCity(lat, lng) {
  if (typeof TOKYO_GEO === 'undefined') return null;
  // Wards first (23 special wards — more specific)
  for (const feat of TOKYO_GEO.features) {
    if (feat.properties.type === 'ward' && feat.geometry.type === 'Polygon') {
      if (pointInPolygon(lat, lng, feat.geometry.coordinates[0])) {
        return { name: feat.properties.name, ja: feat.properties.ja, isWard: true };
      }
    }
  }
  // Fallback to cities (greater Tokyo municipalities)
  for (const feat of TOKYO_GEO.features) {
    if (feat.properties.type === 'city' && feat.geometry.type === 'Polygon') {
      if (pointInPolygon(lat, lng, feat.geometry.coordinates[0])) {
        return { name: feat.properties.name, ja: feat.properties.ja, isWard: false };
      }
    }
  }
  return null;
}

// STATION_ALIASES / WALKABLE_STATIONS keyed by normalized name: station EN
// spellings change with data updates ("Oji-ekimae" → "Oji Ekimae"), and an
// exact-string lookup would silently drop the link
const byNormalizedKey = obj => new Map(Object.entries(obj).map(([k, v]) => [normalize(k), v]));
const ALIASES_BY_KEY  = byNormalizedKey(STATION_ALIASES);
const WALKABLE_BY_KEY = byNormalizedKey(WALKABLE_STATIONS);

function getAliasKeys(stationName) {
  const aliases = ALIASES_BY_KEY.get(normalize(stationName));
  return aliases ? aliases.map(a => normalize(a)) : [];
}

function markDrankAt(stationName) {
  state.drankAt.add(normalize(stationName));
  for (const ak of getAliasKeys(stationName)) state.drankAt.add(ak);
}

function unmarkDrankAt(stationName) {
  state.drankAt.delete(normalize(stationName));
  for (const ak of getAliasKeys(stationName)) state.drankAt.delete(ak);
}

// Reroll undo: drop the finished round's history entry and the drink mark at
// the station it ended on (arrival, drink-here, or drink-at-transfer all set
// state.destination to the station they marked)
function undoLastRound() {
  if (state.history.length === 0 || !state.destination) return;
  state.history.pop();
  renderHistory();
  // Keep the mark when an earlier round also drank here (or at an alias of it)
  const keys = new Set([normalize(state.destination.name), ...getAliasKeys(state.destination.name)]);
  const drankThere = h => !h.flight && (!h.transferred || h.drinkAtTransfer)
    && (keys.has(normalize(h.to)) || getAliasKeys(h.to).some(k => keys.has(k)));
  if (!state.history.some(drankThere)) unmarkDrankAt(state.destination.name);
  // The undone round's destination is gone: a second reroll must not undo another round
  state.destination = null;
}

// ── State ─────────────────────────────────────────────────────────────────
const state = {
  lines: [],          // [{id, name, color, circular, stations:[{name,ja,lat,lng}]}]
  stationIndex: {},   // {normalizedName: [{lineName, lineColor, lineIdx, stationIdx}]}
  stationNames: [],       // unique English names sorted (all)
  stationNamesNorm: [],   // pre-normalized parallel to stationNames
  stationNamesJa: [],     // parallel Japanese names for search
  stationNames23: [],     // unique English names within 23 wards
  stationNames23Norm: [], // pre-normalized parallel to stationNames23
  stationNames23Ja: [],   // parallel Japanese names for 23-ward search
  wards23Only: true, // restrict to 23 special wards
  stopsCap: false,    // cap maximum stops rolled
  stopsCapValue: 10,  // cap value
  currentStation: null,    // {name, ja, lat, lng}
  platforms: [],           // [{label, line, lineColor, direction, fromIdx, maxStops}]
  selectedPlatform: null,
  selectedTrainType: null, // {name, ja, color, stops, expressIndices} or null
  selectedBranch: null,    // {name, ja, color, stations, branchIndices} or null
  selectedConnection: null, // resolved connection object or null
  selectedDestination: null, // { totalMax } — limits maxStops for destination-limited connections
  rolledStops: null,
  destination: null,       // {name, ja, lat, lng}
  drankAt: new Set(),          // station names where player already drank
  stationsSinceDrink: 0,       // thirst counter: stations passed since last drink
  history: [],
  leafletMap: null,
  mapMarker: null,
  connections: [],     // resolved LINE_CONNECTIONS (see resolveConnections)
  spatialGrid: null,
  spatialCell: 0.04,
  geoNearest: null,     // {name, dist} from last geolocation
};
window._state = state; // expose for the debug tools (debug/)

// localStorage that never throws: it can raise SecurityError (site data
// blocked) or QuotaExceededError (full) — the game must keep running
const store = {
  get(k)    { try { return localStorage.getItem(k); } catch { return null; } },
  set(k, v) { try { localStorage.setItem(k, v); } catch (e) { console.warn('storage write failed:', k, e); } },
  remove(k) { try { localStorage.removeItem(k); } catch { /* ignore */ } },
};

// ── Cached DOM references ─────────────────────────────────────────────────
const dom = {
  // Loading
  loadingOverlay:  document.getElementById('loading-overlay'),
  loadingStatus:   document.getElementById('loading-status'),
  app:             document.getElementById('app'),
  errorBanner:     document.getElementById('error-banner'),
  // Station picker
  stationInput:    document.getElementById('station-input'),
  locationHint:    document.getElementById('location-hint'),
  lastTrainWarning: document.getElementById('last-train-warning'),
  randomStationBtn: document.getElementById('random-station-btn'),
  locateBtn:       document.getElementById('locate-btn'),
  // Step 1
  platformGrid:       document.getElementById('platform-grid'),
  platformCountText:  document.getElementById('platform-count-text'),
  diePlatform:        document.getElementById('die-platform'),
  diePlatformLabel:   document.getElementById('die-platform-label'),
  rollPlatformBtn:    document.getElementById('roll-platform-btn'),
  rerollPlatformBtn:  document.getElementById('reroll-platform-btn'),
  // Step 2
  selectedPlatformDot:  document.getElementById('selected-platform-dot'),
  selectedPlatformText: document.getElementById('selected-platform-text'),
  stopsRangeText:       document.getElementById('stops-range-text'),
  dieStops:             document.getElementById('die-stops'),
  dieStopsLabel:        document.getElementById('die-stops-label'),
  rollStopsBtn:         document.getElementById('roll-stops-btn'),
  rerollStopsBtn:       document.getElementById('reroll-stops-btn'),
  trainTypeRow:         document.getElementById('train-type-row'),
  rollStopsRow:         document.getElementById('roll-stops-row'),
  // Journey / Destination
  journeyCard:    document.getElementById('journey-card'),
  journeyContent: document.getElementById('journey-content'),
  undoTransferBtn: document.getElementById('undo-transfer-btn'),
  destCard:       document.getElementById('destination-card'),
  destName:       document.getElementById('dest-name'),
  destNameJa:     document.getElementById('dest-name-ja'),
  destSub:        document.getElementById('dest-sub'),
  destWard:       document.getElementById('dest-ward'),
  rollAgainBtn:   document.getElementById('roll-again-btn'),
  showBarsBtn:    document.getElementById('show-bars-btn'),
  showCafesBtn:   document.getElementById('show-cafes-btn'),
  // Cards
  mapCard:      document.getElementById('map-card'),
  barsCard:     document.getElementById('bars-card'),
  barsContent:  document.getElementById('bars-content'),
  cafesCard:    document.getElementById('cafes-card'),
  cafesContent: document.getElementById('cafes-content'),
  // History
  historyList:  document.getElementById('history-list'),
  historyEmpty: document.getElementById('history-empty'),
  copyRouteBtn: document.getElementById('copy-route-btn'),
  statsBtn:     document.getElementById('stats-btn'),
  historyDist:  document.getElementById('history-distance'),
  // Controls (used in init)
  showMapBtn:          document.getElementById('show-map-btn'),
  clearHistoryBtn:     document.getElementById('clear-history-btn'),
  dismissTrainWarning: document.getElementById('dismiss-train-warning'),
  stopsCap:            document.getElementById('stops-cap-check'),
  stopsCapValue:       document.getElementById('stops-cap-value'),
  wards23Check:        document.getElementById('wards23-check'),
};
