'use strict';

// ── Internationalization ──────────────────────────────────────────────────
let currentLang = store.get(LANG_KEY) || 'en';
if (currentLang === 'ja') document.documentElement.lang = 'ja';
function gc(path) { if (typeof goatcounter !== 'undefined') goatcounter.count({ path, title: path, event: true }); }

// Get display name for a line — Japanese when in JP mode
function lineDisplayName(englishName) {
  if (currentLang === 'ja' && LINE_NAMES_JA[englishName]) return LINE_NAMES_JA[englishName];
  return englishName;
}

// Line label for a platform: its displayName (through-service brand or
// shared-track combo, which carries its own JA label) or its line
function platformLineName(p) {
  if (currentLang === 'ja' && p.displayNameJa) return p.displayNameJa;
  return lineDisplayName(p.displayName || p.lineName);
}

function t(key, params) {
  let str = translations[currentLang]?.[key] || translations.en[key] || key;
  if (params) {
    // split/join: literal replacement ("$&" in a value stays as typed)
    for (const [k, v] of Object.entries(params)) str = str.split(`{${k}}`).join(String(v));
  }
  return str;
}

// Pluralization helper — returns '' or 's' based on n (only needed for EN)
function pl(n) { return currentLang === 'en' && n !== 1 ? 's' : ''; }

function applyLang() {
  // Static elements with data-i18n attribute
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    el.innerHTML = t(key);
  });
  // Placeholders
  document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
    el.placeholder = t(el.getAttribute('data-i18n-placeholder'));
  });
  // Title attributes
  document.querySelectorAll('[data-i18n-title]').forEach(el => {
    el.title = t(el.getAttribute('data-i18n-title'));
  });
  // Arbitrary attribute translations: data-i18n-attr="data-show:key1;data-hide:key2"
  document.querySelectorAll('[data-i18n-attr]').forEach(el => {
    for (const pair of el.getAttribute('data-i18n-attr').split(';')) {
      const [attr, key] = pair.split(':');
      if (attr && key) el.setAttribute(attr, t(key));
    }
  });
  // Page title
  document.title = t('pageTitle');
  // HTML lang
  document.getElementById('html-root').lang = currentLang === 'ja' ? 'ja' : 'en';
  // Update toggle buttons
  document.querySelectorAll('.lang-toggle button').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.lang === currentLang);
  });
}

function generateRNG() {
  const min = parseInt(document.getElementById('rng-min').value, 10) || 0;
  const max = parseInt(document.getElementById('rng-max').value, 10) || 0;
  const lo = Math.min(min, max);
  const hi = Math.max(min, max);
  const result = Math.floor(Math.random() * (hi - lo + 1)) + lo;
  document.getElementById('rng-result').textContent = result;
}

// ── Language refresh registry ────────────────────────────────────────────
// Each entry re-renders one piece of dynamic text when the language changes.
// Add new entries via _langRefreshers.push(() => { ... }) near the code that
// first renders the text — switchLang() will call them all automatically.
const _langRefreshers = [];

_langRefreshers.push(function refreshLocalizationCredit() {
  document.getElementById('localization-credit').style.display = currentLang === 'ja' ? 'block' : 'none';
});

_langRefreshers.push(function refreshRandomBtn() {
  if (state.currentStation) {
    dom.randomStationBtn.innerHTML = t('newGame');
    dom.randomStationBtn.title = t('newGameTitle');
  } else {
    dom.randomStationBtn.innerHTML = `<span data-i18n="randomBtn">${t('randomBtn')}</span>`;
    dom.randomStationBtn.title = t('pickRandom');
  }
});

_langRefreshers.push(function refreshStationInput() {
  if (state.currentStation && dom.stationInput.classList.contains('selected')) {
    setStationInput(state.currentStation.name);
  }
});

_langRefreshers.push(function refreshPlatforms() {
  if (state.currentStation && state.platforms.length > 0) {
    const lineCount = state.platforms.filter(p => !p.drinkHere && !p.takeFlight && !p.isShinkansen).length;
    const total = state.platforms.length + (state.extraDrinkNums || 0);
    dom.platformCountText.innerHTML = t('platformCount', { n: lineCount, s: pl(lineCount), name: stationDisplayName(state.currentStation.name), total });
    refreshPlatformGrid();
  }
});

_langRefreshers.push(function refreshSelectedPlatform() {
  if (!state.selectedPlatform || !state.rolledPlatformNum) return;
  const p = state.selectedPlatform;
  const roll = state.rolledPlatformNum;
  if (p.drinkHere) {
    const rk = eggRollKey(state.currentStation.ja);
    dom.diePlatformLabel.innerHTML = `<strong>${t(rk, { n: roll })}</strong>`;
    dom.selectedPlatformText.innerHTML = `<strong>${t(rk, { n: roll })}</strong>`;
  } else if (p.takeFlight) {
    dom.diePlatformLabel.innerHTML = `<strong>${t('flightRoll', { n: roll })}</strong>`;
  } else {
    renderPlatformBanner(p, roll);
  }
});

_langRefreshers.push(function refreshPickerButtons() {
  if (!state.selectedPlatform || state.selectedTrainType || dom.trainTypeRow.style.display === 'none') return;
  // Re-render the open picker exactly as it was (same choices and handlers)
  if (state._pickerArgs && state._pickerType && state._pickerType !== 'trainType') {
    showBranchPickerUI(...state._pickerArgs);
  } else {
    showTrainTypeButtons(state.selectedPlatform);
  }
});

_langRefreshers.push(function refreshStopsRange() {
  // Skip when branch/train-type picker is visible — refreshTrainTypeButtons handles that.
  if (state.selectedPlatform && !state.selectedPlatform.drinkHere && !state.selectedPlatform.takeFlight
      && state.selectedTrainType) {
    refreshStopsLabel();
  }
});

_langRefreshers.push(function refreshStopsDie() {
  if (state.rolledStops != null) {
    dom.dieStopsLabel.innerHTML = `<strong>${t('stopsResult', { n: state.rolledStops, s: pl(state.rolledStops) })}</strong>`;
  }
});

_langRefreshers.push(function refreshDestSub() {
  if (state._destSubRender && dom.destCard.classList.contains('active')) {
    dom.destSub.innerHTML = state._destSubRender();
  }
});

_langRefreshers.push(function refreshDestWard() {
  if (state._destWard) {
    const ws = state._destWard.isWard ? ' Ward' : state._destWard.ja.endsWith('市') ? ' City' : '';
    dom.destWard.textContent = currentLang === 'ja' ? state._destWard.ja : state._destWard.name + ws;
  }
});

_langRefreshers.push(function refreshGeoHint() {
  if (state.geoNearest) {
    setLocationHint(t('geoNearest', { name: stationDisplayName(state.geoNearest.name), dist: state.geoNearest.dist }));
  }
});

_langRefreshers.push(function refreshJourneyNames() {
  document.querySelectorAll('.journey-name').forEach(el => {
    const stn = el.closest('.journey-station');
    if (!stn) return;
    const idx = parseInt(stn.id.replace('jstn-', ''), 10);
    const route = state.route;
    if (!route || !route[idx]) return;
    const s = route[idx];
    el.innerHTML = currentLang === 'ja'
      ? `${s.ja || s.name} <small class="text-muted">${s.ja ? s.name : ''}</small>`
      : `${s.name}${s.ja ? ` <small class="text-muted">${s.ja}</small>` : ''}`;
  });
});

_langRefreshers.push(function refreshHistory() {
  renderHistory();
  updateHistoryDistance();
});

_langRefreshers.push(function refreshRouteMapBtn() {
  const btn = document.getElementById('stats-map-btn');
  const wrap = document.getElementById('route-map-wrap');
  if (btn) btn.textContent = t(wrap && wrap.style.display !== 'none' ? 'hideRouteMap' : 'showRouteMap');
  const inBtn = document.getElementById('inline-map-btn');
  const inWrap = document.getElementById('inline-route-map-wrap');
  if (inBtn) inBtn.textContent = t(inWrap && inWrap.style.display !== 'none' ? 'hideRouteMap' : 'showRouteMap');
});

_langRefreshers.push(function refreshPlacesBtns() {
  const barsOpen  = dom.barsCard.style.display === 'block';
  const cafesOpen = dom.cafesCard.style.display === 'block';
  dom.showBarsBtn.textContent  = t(barsOpen  ? 'hideBarsBtn'  : 'barsBtn');
  dom.showCafesBtn.textContent = t(cafesOpen ? 'hideCafesBtn' : 'cafesBtn');
});

function switchLang(lang) {
  if (lang === currentLang) return;
  currentLang = lang;
  store.set(LANG_KEY, lang);
  document.documentElement.lang = lang === 'ja' ? 'ja' : 'en';
  applyLang();
  for (const fn of _langRefreshers) fn();
}

function refreshPlatformGrid() {
  const extraDrinkNums = state.extraDrinkNums || 0;
  dom.platformGrid.innerHTML = state.platforms.map((p, i) =>
    p.drinkHere
      ? `<div class="platform-pill drink-here">
           <span class="platform-num">${extraDrinkNums > 0 ? `${i + 1}–${i + 1 + extraDrinkNums}` : i + 1}</span>
           <span>${eggEmoji(state.currentStation?.ja)}</span>
           <span>${t(eggLabelKey(state.currentStation?.ja))}</span>
         </div>`
      : p.takeFlight
      ? `<div class="platform-pill take-flight">
           <span class="platform-num">${i + 1}</span>
           <span>✈️</span>
           <span>${t('takeFlightLabel')}</span>
         </div>`
      : p.isShinkansen
      ? `<div class="platform-pill shinkansen">
           <span class="platform-num">${i + 1}</span>
           <span>🚅</span>
           <span>${t('shinkansenLabel')}<br><small class="text-muted">${platformHint(p)}</small></span>
         </div>`
      : `<div class="platform-pill">
           <span class="platform-num">${i + 1}</span>
           <span class="line-dot" style="background:${p.lineColor}"></span>
           <span>${platformLineName(p)}<br><small class="text-muted">${platformHint(p)}</small></span>
         </div>`
  ).join('');
}
