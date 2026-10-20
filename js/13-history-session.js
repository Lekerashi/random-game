'use strict';

// ── History ───────────────────────────────────────────────────────────────
function buildHistoryItem(e, num) {
  let body;
  const fromH = historyNameHtml(e.from, e.fromJa);
  const toH   = historyNameHtml(e.to, e.toJa);
  if (e.flight) {
    body = `<strong>${fromH}</strong> <span class="text-flight">${t('tookFlight')}</span>`;
  } else if (e.drinkHere) {
    body = `<strong>${fromH}</strong> <span class="text-muted">${t(eggStayedKey(e.fromJa))}</span>`;
  } else if (e.drinkAtTransfer) {
    const tt = e.trainType ? ` ${e.trainType}` : '';
    body = `<strong>${fromH}</strong> &rarr; <span class="history-line-dot" style="background:${e.color}"></span>${lineDisplayName(e.line)}${tt} (${t('stopsResult', { n: e.stopsUsed, s: pl(e.stopsUsed) })}) &rarr; <strong>${toH}</strong> <span class="text-accent">${t('drinkRollHistory')}</span>`;
  } else if (e.transferred) {
    const tt = e.trainType ? ` ${e.trainType}` : '';
    body = `<strong>${fromH}</strong> &rarr; <span class="history-line-dot" style="background:${e.color}"></span>${lineDisplayName(e.line)}${tt} (${t('stopsResult', { n: e.stopsUsed, s: pl(e.stopsUsed) })}) &rarr; <strong>${toH}</strong> <span class="text-accent2">${t('transferHistory')}</span>`;
  } else {
    const tt = e.trainType ? ` ${e.trainType}` : '';
    body = `<strong>${fromH}</strong> &rarr; <span class="history-line-dot" style="background:${e.color}"></span>${lineDisplayName(e.line)}${tt} (${t('stopsResult', { n: e.stops, s: pl(e.stops) })}) &rarr; <strong>${toH}</strong>${e.drinkAtArrival ? ` <span class="text-accent">${eggDrinkAtArrival(e.toJa)}</span>` : ''}`;
  }
  const thirstTag = document.getElementById('debug-panel') && e.thirst != null
    ? ` <span class="text-muted" style="font-size:0.75em">🥵${e.thirst}</span>` : '';
  return `<div class="history-item">
      <span class="history-num">${num}.</span>
      <span class="history-text">${body}${thirstTag}</span>
    </div>`;
}

function addHistory(transferInfo) {
  // Clear undo snapshot once new game activity starts
  if (state._undoSnapshot) {
    clearTimeout(_undoTimer);
    state._undoSnapshot = null;
    document.getElementById('undo-clear-wrap').style.display = 'none';
  }
  const drinkHere = state.selectedPlatform?.drinkHere && !(transferInfo?.transferred || transferInfo?.drinkAtTransfer || transferInfo?.drinkAtArrival || transferInfo?.flight);
  const flight    = transferInfo?.flight || false;
  // Compute effective arrival line/direction for backtracking prevention on resume.
  // For connections, the destination may be on the target line, not the source.
  const p = state.selectedPlatform;
  let _arrivalLine = null, _arrivalDir = null, _arrivalPrev = null;
  if (!drinkHere && !flight && p?.lineName) {
    if (transferInfo?.transferred) {
      // Transfer: the line the player was on (computed by handleRoundResult)
      _arrivalLine = transferInfo._transferLine || p.lineName;
    } else {
      const eff = getEffectiveArrival(p);
      _arrivalLine = eff.lineName;
      _arrivalDir = eff.direction;
      // Station just before the destination (tells Tochomae's two Oedo entries apart)
      const used = transferInfo?.stopsUsed || state.route?.length || 0;
      // (the platform's own station on a 1-stop ride: Daimon, not the alias Hamamatsucho)
      _arrivalPrev = used >= 2 ? state.route[used - 2].name : platformStation(p).name;
    }
  }
  const entry = {
    from:      state.currentStation.name,
    fromJa:    state.currentStation.ja || '',
    fromLat:   state.currentStation.lat,
    fromLng:   state.currentStation.lng,
    drinkHere: drinkHere || false,
    flight:    flight,
    line:      (drinkHere || flight) ? null : p.lineName,
    color:     (drinkHere || flight) ? null : p.lineColor,
    stops:     (drinkHere || flight) ? 0   : state.rolledStops,
    trainType: (drinkHere || flight) ? null : (state.selectedTrainType?.ja || null),
    to:        state.destination.name,
    toJa:      state.destination.ja,
    toLat:     state.destination.lat,
    toLng:     state.destination.lng,
    transferred:    transferInfo?.transferred || false,
    drinkAtTransfer: transferInfo?.drinkAtTransfer || false,
    drinkAtArrival:  transferInfo?.drinkAtArrival || false,
    stopsUsed:      transferInfo?.stopsUsed || null,
    routeCoords:    null,
    thirst:         transferInfo?.thirst != null ? transferInfo.thirst : state.stationsSinceDrink,
    _arrivalLine,    // internal line name at destination (for backtracking filter on resume)
    _arrivalDir,     // direction on that line (null for transfers — whole line filtered)
    _arrivalPrev,    // station ridden through just before arriving
  };
  // Save intermediate station coordinates for route map (prepend departure station)
  if (!drinkHere && !flight && state.route && state.route.length > 0) {
    const usedCount = transferInfo?.stopsUsed;
    const routeSlice = usedCount != null ? state.route.slice(0, usedCount) : state.route;
    const coords = routeSlice.map(s => [s.lat, s.lng]);
    // Prepend departure if route doesn't start there
    const depLat = state.currentStation.lat, depLng = state.currentStation.lng;
    if (coords.length === 0 || coords[0][0] !== depLat || coords[0][1] !== depLng) {
      coords.unshift([depLat, depLng]);
    }
    entry.routeCoords = coords;
  }
  state.history.push(entry);
  dom.historyEmpty.style.display = 'none';
  dom.historyList.insertAdjacentHTML('afterbegin', buildHistoryItem(entry, state.history.length));
  updateHistoryDistance();
  document.getElementById('inline-map-btn-wrap').style.display = '';
  refreshInlineRouteMap();
  saveSession();
  const s = getSessionStats();
  gc(`round-complete/rounds:${state.history.length}/stations:${s.stations}/lines:${s.lines}/stops:${s.totalStops}/km:${s.distKm}/drinks:${s.drinks}`);
}

function renderHistory() {
  const list  = dom.historyList;
  const empty = dom.historyEmpty;

  if (state.history.length === 0) {
    empty.style.display = '';
    list.innerHTML = '';
    document.getElementById('inline-map-btn-wrap').style.display = 'none';
    return;
  }

  empty.style.display = 'none';
  list.innerHTML = state.history.slice().reverse().map((e, i) =>
    buildHistoryItem(e, state.history.length - i)
  ).join('');
  document.getElementById('inline-map-btn-wrap').style.display = '';
  updateHistoryDistance();
}

_langRefreshers.push(function refreshHistory() {
  renderHistory();
  updateHistoryDistance();
});

let _undoTimer = null;
function clearHistory() {
  if (state.history.length > 0) {
    state._undoSnapshot = {
      history: [...state.history],
      drankAt: [...state.drankAt],
      stationsSinceDrink: state.stationsSinceDrink,
    };
  }
  state.history = [];
  state.drankAt.clear();
  state.stationsSinceDrink = 0;
  renderHistory();
  updateHistoryDistance();
  destroyMap('inlineRouteMap');
  document.getElementById('inline-route-map-wrap').style.display = 'none';
  document.getElementById('inline-map-btn').textContent = t('showRouteMap');
  document.getElementById('inline-map-btn-wrap').style.display = 'none';
  document.getElementById('inline-save-wrap').style.display = 'none';
  saveSession();
  // Show undo button if there was history to undo
  if (state._undoSnapshot) {
    document.getElementById('undo-clear-wrap').style.display = '';
    clearTimeout(_undoTimer);
    _undoTimer = setTimeout(() => {
      state._undoSnapshot = null;
      document.getElementById('undo-clear-wrap').style.display = 'none';
    }, 30000);
  }
}

function undoClearHistory() {
  const snap = state._undoSnapshot;
  if (!snap) return;
  clearTimeout(_undoTimer);
  state.history = snap.history;
  state.drankAt = new Set(snap.drankAt);
  state.stationsSinceDrink = snap.stationsSinceDrink;
  state._undoSnapshot = null;
  document.getElementById('undo-clear-wrap').style.display = 'none';
  renderHistory();
  updateHistoryDistance();
  saveSession();
}

// ── Session save/resume ───────────────────────────────────────────────────

function saveSession() {
  // Until the saved session is resumed or declined, saving would delete or
  // overwrite it (e.g. app backgrounded while the Resume prompt is up)
  if (!state._sessionSettled) return;
  // After New Game (no station) there's nothing to resume until a station is picked
  if (!state.currentStation && !state._pendingRound) { store.remove(SESSION_KEY); return; }
  const mrP = state.selectedPlatform;
  const hasMidRound = mrP && mrP.lineName && !mrP.drinkHere && !mrP.takeFlight && state.rolledPlatformNum
    && state.currentStation; // a reset can leave a stale platform with no station
  if (state.history.length === 0 && !state._pendingRound && !hasMidRound) {
    store.remove(SESSION_KEY);
    return;
  }
  const last = state.history.length > 0 ? state.history[state.history.length - 1] : null;
  const currentStation = state._pendingRound
    ? state._pendingRound.currentStation
    : hasMidRound // a platform rolled here (possibly after a manual station pick)
      ? { name: state.currentStation.name, ja: state.currentStation.ja,
          lat: state.currentStation.lat, lng: state.currentStation.lng }
      : last.drinkHere
      ? { name: last.from, ja: last.fromJa, lat: last.fromLat, lng: last.fromLng }
      : { name: last.to,   ja: last.toJa,   lat: last.toLat,   lng: last.toLng };
  // Save mid-round platform/picker state so it survives page unload
  const midRound = hasMidRound
    ? {
      lineName: mrP.lineName, direction: mrP.direction,
      fromIdx: mrP.fromIdx, // Tochomae has two Oedo platforms with the same direction
      rolledNum: state.rolledPlatformNum,
      branch: state.selectedBranch?.name || null,
      connectionTo: state.selectedConnection?.to || null,
      connectionToDir: state.selectedConnection?.toDir || null,
      destination: state.selectedDestination,
      trainType: state.selectedTrainType?.name || null,
      trainTypeKey: state.selectedTrainType ? trainTypeKey(state.selectedTrainType) : null,
    } : null;

  store.set(SESSION_KEY, JSON.stringify({
    timestamp: Date.now(),
    history: state.history,
    drankAt: [...state.drankAt],
    stationsSinceDrink: state.stationsSinceDrink,
    currentStation,
    wards23Only: state.wards23Only,
    stopsCap: state.stopsCap,
    stopsCapValue: state.stopsCapValue,
    pendingRound: state._pendingRound || null,
    midRound,
  }));
}

function savePendingRound(route, transferIndices, resolvedCount, thirstBetween, platform, rolledStops) {
  state._pendingRound = {
    currentStation: { name: state.currentStation.name, ja: state.currentStation.ja,
                      lat: state.currentStation.lat, lng: state.currentStation.lng },
    route: route.map(s => ({ name: s.name, ja: s.ja, lat: s.lat, lng: s.lng })),
    transferIndices,
    resolvedCount,
    stationsSinceDrink: state.stationsSinceDrink,
    thirstCum: thirstBetween._cumPhysical,
    thirstMult: thirstBetween._mult,
    rolledStops,
    rolledPlatformNum: state.rolledPlatformNum,
    preRollThirst: state._preRollThirst, // so a reroll after resuming restores thirst
    platform: {
      lineName: platform.lineName, lineColor: platform.lineColor,
      lineIdx: platform.lineIdx, direction: platform.direction,
      fromIdx: platform.fromIdx, maxStops: platform.maxStops,
      _onLineStops: platform._onLineStops, isShinkansen: platform.isShinkansen || false,
    },
    trainType: state.selectedTrainType ? { name: state.selectedTrainType.name, ja: state.selectedTrainType.ja } : null,
    connectionTo: state.selectedConnection?.to || null,
    connectionToDir: state.selectedConnection?.toDir || null,
    destination: state.selectedDestination,
  };
  saveSession();
}

function clearPendingRound() {
  state._pendingRound = null;
  saveSession();
}

// Resume a transfer check that was interrupted by page unload
async function resumePendingRound(pr) {
  const route = pr.route;
  const transferIndices = pr.transferIndices;
  const resolvedCount = pr.resolvedCount;
  const roundGen = state._roundGen; // a reset mid-journey aborts this round

  // Restore game state
  state.currentStation = pr.currentStation;
  // The saved platform is a minimal copy; use the rebuilt one when it still exists
  state.selectedPlatform = flatPlatforms(state.platforms).find(q => q.lineName === pr.platform.lineName
    && q.direction === pr.platform.direction && q.fromIdx === pr.platform.fromIdx) || pr.platform;
  state.rolledPlatformNum = pr.rolledPlatformNum ?? null;
  state._preRollThirst = pr.preRollThirst ?? null;
  state.selectedTrainType = pr.trainType;
  // Re-find the real connection object: arrival-line and backtracking logic
  // walk its toLineIdx/toDir and onward chain
  const p0 = pr.platform;
  state.selectedConnection = pr.connectionTo
    ? getConnections(p0.lineName, p0.lineIdx, p0.direction, p0.fromIdx)
        .find(c => c.to === pr.connectionTo && (!pr.connectionToDir || c.toDir === pr.connectionToDir)) || null
    : null;
  state.selectedDestination = pr.destination || null;
  state.rolledStops = pr.rolledStops;
  state.route = route;
  state.stationsSinceDrink = pr.stationsSinceDrink;
  state._pendingRound = pr;

  // Mirror the rolled state: step 1 stays locked while this round is live
  dom.rollPlatformBtn.disabled = true;
  dom.rerollPlatformBtn.style.display = 'none';
  dom.rollStopsBtn.disabled = true;
  dom.rerollStopsBtn.style.display = 'none';
  // (saved platform is a minimal copy, so a simple banner instead of renderPlatformBanner)
  dom.selectedPlatformDot.style.background = p0.lineColor;
  showPlatformBanner(() => {
    dom.selectedPlatformText.innerHTML =
      `<strong>${pr.rolledPlatformNum ? '#' + pr.rolledPlatformNum + ' — ' : ''}${lineDisplayName(p0.lineName)}</strong>`;
  });
  showStep('step-stops');

  // Reconstruct thirst tracker from saved data
  const _cumPhysical = pr.thirstCum;
  const _mult = pr.thirstMult;
  function thirstBetween(a, b) {
    const raw = _cumPhysical ? _cumPhysical[b + 1] - _cumPhysical[a + 1] : b - a;
    return raw * _mult;
  }
  thirstBetween._cumPhysical = _cumPhysical;
  thirstBetween._mult = _mult;

  // Render journey card and replay resolved "stay" outcomes
  renderJourneyCard(route, transferIndices);
  for (let ti = 0; ti < resolvedCount; ti++) {
    const i = transferIndices[ti];
    const el = document.getElementById(`jstn-${i}`);
    const die = document.getElementById(`jdie-${i}`);
    const res = document.getElementById(`jres-${i}`);
    const nextTI = ti + 1 < transferIndices.length ? transferIndices[ti + 1] : route.length;
    applyOutcome(el, die, res, 'stay', 'stayResult', 'stay-label', 'passed');
    dimStations(i + 1, nextTI);
  }

  // Continue from remaining transfers
  for (let ti = resolvedCount; ti < transferIndices.length; ti++) {
    const i = transferIndices[ti];
    const prevTransferIdx = ti > 0 ? transferIndices[ti - 1] : -1;
    state.stationsSinceDrink += thirstBetween(prevTransferIdx, i);

    const result = await resolveTransfer(route, i, ti, transferIndices);
    if (state._roundGen !== roundGen) return; // New Game mid-journey

    if (result.outcome === 'transfer') {
      clearPendingRound();
      await handleRoundResult({ type: 'transfer', station: result.station, stopsUsed: result.stopsUsed }, pr.platform, pr.rolledStops);
      return;
    }
    if (result.outcome === 'drink') {
      clearPendingRound();
      await handleRoundResult({ type: 'drink', station: result.station, stopsUsed: result.stopsUsed }, pr.platform, pr.rolledStops);
      showRerollButtons();
      return;
    }
    // Stay — update checkpoint
    savePendingRound(route, transferIndices, ti + 1, thirstBetween, pr.platform, pr.rolledStops);
  }

  // All transfers resolved — arrive at destination
  clearPendingRound();
  const lastChecked = transferIndices[transferIndices.length - 1];
  state.stationsSinceDrink += thirstBetween(lastChecked, route.length - 1);
  if (!window._skipAnimation) await new Promise(r => setTimeout(r, TRANSFER_ARRIVE_DELAY));
  if (state._roundGen !== roundGen) return;
  await handleRoundResult({ type: 'arrive', station: route[route.length - 1] }, pr.platform, pr.rolledStops);
  showRerollButtons();
}

// The round resolved without a transfer: it can be rerolled (as in rollStops)
function showRerollButtons() {
  dom.rerollStopsBtn.style.display = 'inline-flex';
  if (state.selectedPlatform?.lineName) dom.rerollPlatformBtn.style.display = 'block';
}

function loadSession() {
  try {
    const raw = store.get(SESSION_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    // Expired, or a shape resumeSession can't use (older format, partial write)
    const usable = data && Array.isArray(data.history)
      && typeof data.currentStation?.name === 'string';
    if (!usable || Date.now() - data.timestamp > SESSION_TTL) {
      store.remove(SESSION_KEY);
      return null;
    }
    return data;
  } catch { return null; }
}

function resumeSession(data) {
  state.history = data.history;
  state.drankAt = new Set(data.drankAt || []);
  state.stationsSinceDrink = data.stationsSinceDrink || 0;
  if (data.wards23Only !== undefined) {
    state.wards23Only = data.wards23Only;
    dom.wards23Check.checked = data.wards23Only;
  }
  if (data.stopsCap !== undefined) {
    state.stopsCap = data.stopsCap;
    dom.stopsCap.checked = data.stopsCap;
  }
  if (data.stopsCapValue !== undefined) {
    state.stopsCapValue = data.stopsCapValue;
    dom.stopsCapValue.value = data.stopsCapValue;
  }
  renderHistory();

  // Reconstruct arrivedVia from last history entry to prevent backtracking on resume
  const last = data.history[data.history.length - 1];
  let arrivedVia = null;
  if (last && last._arrivalLine) {
    arrivedVia = last.transferred
      ? { lineName: last._arrivalLine, isTransfer: true }
      : { lineName: last._arrivalLine, direction: last._arrivalDir, prevName: last._arrivalPrev || null };
  }

  // Set up current station so the player can roll again
  const stn = data.currentStation;
  const name = resolveSavedStationName(stn);
  if (!name) return; // station gone from the data: keep history, let the player pick again
  setStationInput(name);

  // A renamed station invalidates the saved mid-round state (it stores names),
  // and a pending round's line index must still point at the same line
  const pp = data.pendingRound?.platform;
  const renamed = name !== stn.name || (pp && state.lines[pp.lineIdx]?.name !== pp.lineName);
  if (data.pendingRound && !renamed) {
    // Resume interrupted transfer check
    onStationSelected(name, arrivedVia);
    resumePendingRound(data.pendingRound);
  } else {
    onStationSelected(name, arrivedVia);
    if (data.midRound && !renamed) restoreMidRound(data.midRound);
  }
}

// Current EN name for a saved station. Saved names can go stale when station
// names change between visits (data update, OSM rename) — fall back to the
// JA name, nearest to the saved coordinates. Returns null if not found.
function resolveSavedStationName(stn) {
  // Same EN name still pointing at the same station (a data update can move a
  // shared name to a different station, so check the JA name too)
  const hits = state.stationIndex[normalize(stn.name)] || [];
  if (hits.some(e => !stn.ja || state.lines[e.lineIdx].stations[e.stationIdx].ja === stn.ja)) return stn.name;
  let best = null, bestDist = Infinity;
  for (const l of state.lines) for (const s of l.stations) {
    if (s.ja !== stn.ja) continue;
    const d = (Math.abs(s.lat - stn.lat) + Math.abs(s.lng - stn.lng)) || 0; // NaN if coords missing
    if (d < bestDist) { bestDist = d; best = s; }
  }
  return best?.name || null;
}

// Restore a platform selection that was interrupted by page unload.
// Finds the matching platform in the rebuilt list, pre-sets any saved picker
// selections, and shows the roll-stops UI.
function restoreMidRound(mr) {
  const matchP = flatPlatforms(state.platforms).find(p => p.lineName === mr.lineName && p.direction === mr.direction
    && (mr.fromIdx == null || p.fromIdx === mr.fromIdx));
  if (!matchP) return;

  // Grid number on the board as rebuilt now (a wards toggle can reorder it)
  const gridIdx = state.platforms.findIndex(g => g === matchP || flatPlatforms([g]).includes(matchP));
  const rolledNum = gridIdx >= 0 ? gridIdx + 1 : mr.rolledNum;
  state.selectedPlatform = matchP;
  state.rolledPlatformNum = rolledNum;
  state._preRollThirst = state.stationsSinceDrink; // a reroll after restoring keeps thirst
  // Platform die + banner (same UI as the rollPlatform callback, before any selection)
  dom.diePlatform.textContent = rolledNum;
  renderPlatformBanner(matchP, rolledNum);

  // Restore picker selections so re-entry guards skip them
  if (mr.branch) {
    const line = state.lines[matchP.lineIdx];
    const branches = getBranches(matchP.lineName, platformStation(matchP).ja, line, matchP.direction);
    state.selectedBranch = branches.find(b => b.name === mr.branch) || null;
  }
  if (mr.connectionTo && matchP._connections) {
    // Match direction too: a line can connect to the same line both ways
    // (Keikyu Airport → Main toward Shinagawa vs toward Yokohama)
    const conn = matchP._connections.find(c => c.to === mr.connectionTo
      && (!mr.connectionToDir || c.toDir === mr.connectionToDir)) || null;
    // A connection whose destination wasn't picked yet: let its picker ask again
    state.selectedConnection = conn && conn.destinations && !mr.destination ? null : conn;
  }
  if (mr.destination) {
    state.selectedDestination = mr.destination;
  }
  if (mr.trainType) {
    // Saved name is the boarded member ("Yamabiko"), not the button's group name
    const resolved = resolveTrainTypes(matchP);
    const candidates = resolved?.types || (resolved?.autoSelect ? [resolved.autoSelect] : []);
    const g = candidates.find(t => (t._members || [t]).some(m => m.name === mr.trainType));
    state.selectedTrainType = g ? pickTrainType(g, mr.trainType, mr.trainTypeKey) : null;
  }

  dom.rollPlatformBtn.disabled = true;
  dom.rerollPlatformBtn.style.display = 'block';

  // Rebuild pickers — guards skip already-selected ones, falls through to roll stops
  rebuildPickers(matchP);
  showStep('step-stops');
}
