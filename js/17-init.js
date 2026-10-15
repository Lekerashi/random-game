'use strict';

// ── Init ──────────────────────────────────────────────────────────────────
function onWards23Change(checked) {
  state.wards23Only = checked;
  saveSession();
  if (!state.currentStation) return;

  if (state.wards23Only && !isIn23Wards(state.currentStation.lat, state.currentStation.lng)) {
    // Current station is outside the wards — clear it and prompt to pick again
    state.currentStation = null;
    dom.stationInput.value = '';
    dom.stationInput.classList.remove('selected');
    dom.randomStationBtn.innerHTML = `<span data-i18n="randomBtn">${t('randomBtn')}</span>`;
    dom.randomStationBtn.title     = t('pickRandom');
    showStep(null);
    hideAllCards();
    setLocationHint(t('outsideWards'), true);
    state._wards23Hint = true;
    return;
  }

  // Stops already rolled (riding or arrived): the setting applies from the next round
  if (state.rolledStops != null || state.destination) return;

  // Rebuild the board the normal way (same filters as arriving here), then put
  // a rolled platform back if it still exists; its pickers are rebuilt fresh.
  const p = state.selectedPlatform;
  const keep = p && p.lineName && !p.drinkHere && !p.takeFlight && state.rolledPlatformNum
    ? { lineName: p.lineName, direction: p.direction, fromIdx: p.fromIdx, rolledNum: state.rolledPlatformNum }
    : null;
  onStationSelected(state.currentStation.name, state._arrivedVia);
  if (keep) restoreMidRound(keep);
}

function setupStationPicker() {
  setupAutocomplete();
  // Sync state from checkbox — browsers may restore form values from cache
  state.wards23Only = dom.wards23Check.checked;
  dom.randomStationBtn.addEventListener('click', () => {
    if (state.currentStation) resetGame(); else pickRandomStation();
  });
  dom.locateBtn.addEventListener('click', detectLocation);
  dom.wards23Check.addEventListener('change', e => onWards23Change(e.target.checked));
}

function setupGameControls() {
  // Arrow wrappers look the function up at click time, so debug.js patches apply
  dom.rollPlatformBtn.addEventListener('click', () => rollPlatform());
  dom.rerollPlatformBtn.addEventListener('click', () => rerollPlatform());
  dom.rollStopsBtn.addEventListener('click', () => rollStops());
  dom.rerollStopsBtn.addEventListener('click', () => rerollStops());
  dom.showMapBtn.addEventListener('click', showMap);
  dom.showBarsBtn.addEventListener('click', () => togglePlaces('bars'));
  dom.showCafesBtn.addEventListener('click', () => togglePlaces('cafes'));
  dom.rollAgainBtn.addEventListener('click', () => rollAgainFromHere());
  dom.clearHistoryBtn.addEventListener('click', clearHistory);
  dom.copyRouteBtn.addEventListener('click', () => copyRoute()); // not the MouseEvent as feedbackBtn
  dom.statsBtn.addEventListener('click', showStats);
  document.getElementById('inline-map-btn').addEventListener('click', toggleInlineRouteMap);
  const statsCopyBtn = document.getElementById('stats-copy-btn');
  statsCopyBtn.addEventListener('click', () => copyRoute(statsCopyBtn));
  document.getElementById('stats-map-btn').addEventListener('click', showRouteMap);
  // Overlays, language toggle, RNG, undo/save buttons: one delegated handler
  // (no inline onclick globals)
  const closeOverlay = ov => { if (ov.id === 'stats-overlay') hideStats(); else ov.classList.add('hidden'); };
  document.addEventListener('click', e => {
    const tgt = e.target;
    if (tgt.matches?.('.htp-overlay[data-backdrop-close]')) return closeOverlay(tgt);
    const el = tgt.closest?.('[data-action], [data-open], .htp-close, .lang-toggle [data-lang]');
    if (!el) return;
    if (el.matches('.htp-close')) return closeOverlay(el.closest('.htp-overlay'));
    if (el.dataset.open) return document.getElementById(el.dataset.open).classList.remove('hidden');
    if (el.dataset.lang) return switchLang(el.dataset.lang);
    switch (el.dataset.action) {
      case 'undo-clear': return undoClearHistory();
      case 'save-image': return saveSessionImage();
      case 'rng': return generateRNG();
      case 'toggle-advanced': {
        const adv = el.nextElementSibling;
        adv.classList.toggle('hidden');
        el.textContent = el.getAttribute(adv.classList.contains('hidden') ? 'data-show' : 'data-hide');
      }
    }
  });
  // Escape closes the open popup (the morning recap needs an explicit choice)
  document.addEventListener('keydown', e => {
    if (e.key !== 'Escape') return;
    for (const el of document.querySelectorAll('.htp-overlay:not(.hidden)')) {
      if (el.id !== 'recap-overlay') closeOverlay(el);
    }
  });
}

function setupSettings() {
  // Sync cap state from DOM — browsers may restore form values from cache
  state.stopsCap = dom.stopsCap.checked;
  const capVal = parseInt(dom.stopsCapValue.value, 10);
  if (!isNaN(capVal) && capVal >= 1) state.stopsCapValue = capVal;

  dom.dismissTrainWarning.addEventListener('click', () => {
    dom.lastTrainWarning.style.display = 'none';
    store.set(LTW_KEY, gameDay());
  });
  function onCapChange() {
    saveSession();
    if (state.selectedPlatform && !state.selectedPlatform.drinkHere && !state.selectedPlatform.takeFlight) {
      const p = state.selectedPlatform;
      clearSelectionState();
      if (!rebuildPickers(p)) refreshStopsLabel();
    }
  }
  dom.stopsCap.addEventListener('change', e => {
    state.stopsCap = e.target.checked;
    onCapChange();
  });
  // 'change', not 'input': typing "15" must not rebuild pickers for a cap of 1 first
  dom.stopsCapValue.addEventListener('change', e => {
    const v = parseInt(e.target.value, 10);
    if (!isNaN(v) && v >= 1) {
      state.stopsCapValue = v;
      onCapChange();
    }
  });
  checkLastTrainWarning();
  setInterval(checkLastTrainWarning, 5 * 60 * 1000);
}

// "Game day" of a timestamp: the day boundary is 2am, so 1am still counts as last night
function gameDay(timestamp = Date.now()) {
  return new Date(timestamp - SCHEDULE_DAY_BOUNDARY * 3600000).toDateString();
}

// Check if a timestamp is on the same game day as now
function sameGameDay(timestamp) {
  return gameDay() === gameDay(timestamp);
}

function setupSessionResume() {
  const saved = loadSession();
  const settle = () => { state._sessionSettled = true; state._settleResume = null; };
  if (!saved) return settle();
  // Session with only mid-round state (no completed rounds yet): restore silently
  if ((!saved.history || saved.history.length === 0) && (saved.midRound || saved.pendingRound)) {
    settle();
    resumeSession(saved);
    return;
  }
  if (!saved.history || saved.history.length === 0) return settle();

  // Same evening → lightweight inline prompt; next morning → full recap overlay
  if (sameGameDay(saved.timestamp)) {
    const inlineEl = document.getElementById('resume-inline');
    inlineEl.style.display = '';
    state._settleResume = () => { inlineEl.style.display = 'none'; settle(); };
    document.getElementById('resume-inline-btn').addEventListener('click', () => {
      inlineEl.style.display = 'none';
      settle();
      resumeSession(saved);
    }, { once: true });
    document.getElementById('new-game-inline-btn').addEventListener('click', () => {
      inlineEl.style.display = 'none';
      settle();
      store.remove(SESSION_KEY);
    }, { once: true });
    return;
  }

  // Full recap overlay for next-morning returns
  const overlay = document.getElementById('recap-overlay');

  // Temporarily populate state.history so stats + map functions work
  state.history = saved.history;

  // Title — formatted date from session timestamp
  const locale = currentLang === 'ja' ? 'ja-JP' : 'en-US';
  const sessionDate = new Date(saved.timestamp);
  const dateStr = sessionDate.toLocaleDateString(locale, { weekday: 'short', month: 'short', day: 'numeric' });
  document.getElementById('recap-title').textContent = t('copyRouteHeader', { date: dateStr }).replace(/^🗼\s*/, '');

  // Stats grid
  const s = getSessionStats();
  document.getElementById('recap-stats').innerHTML = `
    <div class="stat-box"><div class="stat-val">${s.stations}</div><div class="stat-label">${t('statStations')}</div></div>
    <div class="stat-box"><div class="stat-val">${s.lines}</div><div class="stat-label">${t('statLines')}</div></div>
    <div class="stat-box"><div class="stat-val">${s.totalStops}</div><div class="stat-label">${t('statStops')}</div></div>
    <div class="stat-box"><div class="stat-val">${s.drinks}</div><div class="stat-label">${t('statDrinks')}</div></div>
    <div class="stat-box full-width"><div class="stat-val">${s.distKm} km</div><div class="stat-label">${t('statDistance')}</div></div>
  `;

  // Wire up buttons FIRST — must always work even if map fails
  function dismissRecap() {
    destroyMap('recapMap');
    overlay.classList.add('hidden');
  }

  document.getElementById('recap-save-btn').onclick = () => saveSessionImage();
  const copyBtn = document.getElementById('recap-copy-btn');
  copyBtn.addEventListener('click', () => copyRoute(copyBtn));

  document.getElementById('resume-btn').addEventListener('click', () => {
    dismissRecap();
    settle();
    resumeSession(saved);
  }, { once: true });
  document.getElementById('dismiss-resume-btn').addEventListener('click', () => {
    dismissRecap();
    settle();
    state.history = [];
    store.remove(SESSION_KEY);
  }, { once: true });

  // Show overlay BEFORE building map — Leaflet needs a visible container for bounds
  overlay.classList.remove('hidden');
  document.activeElement?.blur(); // prevent typing behind overlay
  overlay.offsetHeight; // force reflow so Leaflet gets correct container size

  // Route map once Leaflet has loaded, unless the recap was dismissed meanwhile
  buildRouteMapWhenReady('recapMap', 'recap-map', () => !overlay.classList.contains('hidden'))
    .catch(e => console.warn('Recap map failed:', e));
}

// Save session when page is backgrounded (iOS Safari may evict otherwise)
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') saveSession();
});
window.addEventListener('pagehide', saveSession); // desktop tab close

(async function init() {
  if (currentLang !== 'en') {
    applyLang();
    document.getElementById('localization-credit').style.display = 'block';
  }
  setupStationPicker();
  setupGameControls();
  setupSettings();
  await loadData();
  setupSessionResume();
})();
