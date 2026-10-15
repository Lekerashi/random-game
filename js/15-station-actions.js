'use strict';

// ── Random Station ────────────────────────────────────────────────────────
function pickRandomStation() {
  const pool = state.wards23Only ? state.stationNames23 : state.stationNames;
  if (pool.length === 0) return;
  const name  = pool[Math.floor(Math.random() * pool.length)];
  setStationInput(name);
  gc('start-random');
  onStationSelected(name);
}

function resetGame() {
  state.currentStation  = null;
  state.platforms       = [];
  resetRoundState();
  state.stationsSinceDrink = 0;
  state.drankAt.clear();
  state.geoNearest = null;

  dom.stationInput.value = '';
  dom.stationInput.classList.remove('selected');

  showStep(null);
  hideAllCards();

  dom.randomStationBtn.innerHTML = `<span data-i18n="randomBtn">${t('randomBtn')}</span>`;
  dom.randomStationBtn.title     = t('pickRandom');
  store.remove(SESSION_KEY);
}

// ── Geolocation ───────────────────────────────────────────────────────────
function findNearestStation(lat, lng) {
  const CELL = state.spatialCell;
  const grid = state.spatialGrid;
  const cx = Math.floor(lat / CELL);
  const cy = Math.floor(lng / CELL);
  let bestName = null;
  let bestDist = Infinity;
  // Check 3×3 neighbourhood of grid cells
  for (let dx = -1; dx <= 1; dx++) {
    for (let dy = -1; dy <= 1; dy++) {
      const candidates = grid.get(`${cx + dx},${cy + dy}`);
      if (!candidates) continue;
      for (const stn of candidates) {
        if (state.wards23Only && !isIn23Wards(stn.lat, stn.lng)) continue;
        const d = haversineM(lat, lng, stn.lat, stn.lng);
        if (d < bestDist) { bestDist = d; bestName = stn.name; }
      }
    }
  }
  // Fallback to brute force if grid had no candidates (shouldn't happen in practice)
  if (!bestName) {
    for (const line of state.lines) {
      for (const stn of line.stations) {
        if (state.wards23Only && !isIn23Wards(stn.lat, stn.lng)) continue;
        const d = haversineM(lat, lng, stn.lat, stn.lng);
        if (d < bestDist) { bestDist = d; bestName = stn.name; }
      }
    }
  }
  return { name: bestName, dist: Math.round(bestDist) };
}

function setLocationHint(msg, isError = false) {
  dom.locationHint.textContent = msg;
  dom.locationHint.style.color = isError ? 'var(--muted)' : 'var(--accent2)';
}

function detectLocation() {
  const btn = dom.locateBtn;
  if (!navigator.geolocation) {
    setLocationHint(t('geoNotSupported'), true);
    return;
  }
  btn.disabled = true;
  btn.classList.add('locating');
  setLocationHint(t('geoDetecting'));

  navigator.geolocation.getCurrentPosition(
    ({ coords }) => {
      btn.disabled = false;
      btn.classList.remove('locating');
      // If user is outside the 23 wards with the filter on, auto-disable it
      if (state.wards23Only && !isIn23Wards(coords.latitude, coords.longitude)) {
        state.wards23Only = false;
        dom.wards23Check.checked = false;
      }
      const { name, dist } = findNearestStation(coords.latitude, coords.longitude);
      if (!name) { setLocationHint(t('geoNoStation'), true); return; }
      state.geoNearest = { name, dist };
      setLocationHint(t('geoNearest', { name: stationDisplayName(name), dist }));
      setStationInput(name);
      gc('start-geolocate');
      onStationSelected(name);
    },
    (err) => {
      btn.disabled = false;
      btn.classList.remove('locating');
      const msg = err.code === 1 ? t('geoDenied')
                : err.code === 2 ? t('geoUnavailable')
                :                  t('geoTimeout');
      setLocationHint(`📍 ${msg}`, true);
    },
    { timeout: 20000, maximumAge: 300000, enableHighAccuracy: false }
  );
}

// ── Roll Again ────────────────────────────────────────────────────────────
// Determine the effective line/direction at the destination, accounting for connections.
// If the player rode through a connection, the destination may be on the target line (or a
// chained onward line), not the source line they started on.
function getEffectiveArrival(p) {
  const fallback = { lineName: p.lineName, direction: p.direction };
  const dest = state.destination;
  if (!dest) return fallback;
  // The connection the ride actually takes (picked, auto-taken terminus, or a connection type's)
  const tt = state.selectedTrainType;
  const conn = routeConnectionFor(p, state.selectedConnection || findRouteConnection(p, tt), tt?._connTargetLineIdx);
  if (!conn) return fallback;

  // If destination is on the source line, use source line/direction, unless it is
  // one of the connection's via stations (Keio → via 新宿 is not Keio's Shinjuku),
  // or it lies past the junction where the ride left the source line (Chuo-Sobu
  // → Tozai at 中野 arrives at the Tozai 飯田橋, not the Chuo-Sobu one)
  const step = dirStep(p.direction);
  const beforeJunction = i => p.circular || ((i - p.fromIdx) * step > 0 && (conn.fromJunctionIdx - i) * step >= 0);
  const onSource = state.lines[p.lineIdx].stations.some((s, i) => s.name === dest.name && beforeJunction(i));
  if (onSource && !conn.viaStations.some(v => v.name === dest.name)) return fallback;

  const route = state.route || [];
  const di = route.findIndex(s => s.name === dest.name);

  // A via station sits on its own line (e.g. Shin-Tsunashima on the Tokyu
  // Shin-Yokohama Line): find the line through it and the station ridden just before
  const prev = di > 0 ? route[di - 1] : platformStation(p);
  // Never a Shinkansen for a normal ride (Tohoku Shinkansen has 東京 next to 上野) or vice versa
  const sameKind = l => SHINKANSEN_LINES.has(l.name) === SHINKANSEN_LINES.has(p.lineName);
  const lineThrough = () => {
    for (const l of state.lines) {
      if (!sameKind(l)) continue;
      const ib = l.stations.findIndex(s => s.name === dest.name);
      if (ib === -1) continue;
      const ia = l.stations.findIndex((s, k) => s.name === prev.name && Math.abs(k - ib) === 1);
      if (ia !== -1) return { lineName: l.name, direction: ib > ia ? 'end' : 'start' };
    }
    return null;
  };
  // Fallback when the previous stop is on another line (e.g. Toei 新宿 → 初台):
  // the line through the destination and its neighbour in the via list
  const viaLine = vias => {
    const k = vias.findIndex(v => v.name === dest.name);
    const forward = k + 1 < vias.length;
    const nb = forward ? vias[k + 1] : vias[k - 1];
    if (!nb) return null;
    for (const l of state.lines) {
      if (!sameKind(l)) continue;
      const ib = l.stations.findIndex(s => s.name === dest.name);
      const inb = l.stations.findIndex((s, j) => s.name === nb.name && Math.abs(j - ib) === 1);
      if (ib !== -1 && inb !== -1) return { lineName: l.name, direction: (forward ? inb > ib : ib > inb) ? 'end' : 'start' };
    }
    return null;
  };

  // Walk connection chain to find which line the destination is on
  let effConn = conn;
  const visited = new Set([p.lineName]);
  while (effConn) {
    visited.add(effConn.to);
    if (effConn.viaStations.some(v => v.name === dest.name)) {
      return lineThrough() || viaLine(effConn.viaStations) || { lineName: effConn.to, direction: effConn.toDir };
    }
    const toLine = state.lines[effConn.toLineIdx];
    if (toLine && toLine.stations.some(s => s.name === dest.name)) {
      return { lineName: effConn.to, direction: effConn.toDir };
    }
    effConn = nextChainConn(effConn, visited);
  }
  return fallback;
}

function rollAgainFromHere() {
  const dest = state.destination;
  if (!dest) return;

  // Reset UI
  hideAllCards();

  // Set current station to destination
  setStationInput(dest.name);
  window.scrollTo({ top: 0, behavior: 'smooth' });
  const via = state.selectedPlatform?.lineName
    ? { ...getEffectiveArrival(state.selectedPlatform),
        prevName: state.history[state.history.length - 1]?._arrivalPrev || null }
    : null;
  onStationSelected(dest.name, via);
}

// ── Last train warning ────────────────────────────────────────────────────
function checkLastTrainWarning() {
  const now   = new Date();
  const h     = now.getHours();
  const m     = now.getMinutes();
  // Game day (2am boundary) so a warning dismissed at 23:45 stays dismissed after midnight
  const today = gameDay(now.getTime());
  // Last trains run until ~1am: warn from 23:30 until the game-day boundary
  const lateNight = (h === 23 && m >= 30) || h < SCHEDULE_DAY_BOUNDARY;
  if (lateNight && store.get(LTW_KEY) !== today) {
    dom.lastTrainWarning.style.display = 'block';
  } else if (!lateNight) {
    dom.lastTrainWarning.style.display = 'none'; // reset before 11:30pm so it can show again tonight
  }
}

// ── Copy route ────────────────────────────────────────────────────────────
function copyRoute(feedbackBtn) {
  feedbackBtn = feedbackBtn || dom.copyRouteBtn;
  if (state.history.length === 0) return;
  const locale = currentLang === 'ja' ? 'ja-JP' : 'en-US';
  const date = new Date().toLocaleDateString(locale, { weekday: 'short', month: 'short', day: 'numeric' });
  const lines = [t('copyRouteHeader', { date }), ''];
  state.history.forEach((e, i) => {
    const from = historyName(e.from, e.fromJa);
    const to   = historyName(e.to, e.toJa);
    if (e.flight) {
      lines.push(`${i + 1}. ${from} ${t('tookFlight')}`);
    } else if (e.drinkHere) {
      lines.push(`${i + 1}. ${from} ${t(eggStayedKey(e.fromJa))}`);
    } else if (e.drinkAtTransfer) {
      lines.push(`${i + 1}. ${from} → ${lineDisplayName(e.line)} (+${e.stopsUsed}) → ${to} ${t('drinkRollHistory')}`);
    } else if (e.transferred) {
      lines.push(`${i + 1}. ${from} → ${lineDisplayName(e.line)} (+${e.stopsUsed}) → ${to} ${t('transferHistory')}`);
    } else {
      lines.push(`${i + 1}. ${from} → ${lineDisplayName(e.line)} (+${e.stops}) → ${to}${e.drinkAtArrival ? ` ${eggDrinkAtArrival(e.toJa)}` : ''}`);
    }
  });
  lines.push('', formatStatsText());
  copyToClipboard(lines.join('\n'), feedbackBtn);
}

function formatStatsText() {
  const s = getSessionStats();
  return `📊 ${t('statStations')}: ${s.stations} · ${t('statLines')}: ${s.lines} · ${t('statStops')}: ${s.totalStops} · ${t('statDrinks')}: ${s.drinks} · ${t('statDistance')}: ${s.distKm} km`;
}
