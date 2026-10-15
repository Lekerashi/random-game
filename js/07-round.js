'use strict';

// ── Roll Animation ────────────────────────────────────────────────────────
function animateRoll(min, max, finalValue, el, onCompleteRaw) {
  // A reset mid-animation (New Game, new station) must not apply this roll
  // to the new board
  const gen = state._roundGen;
  const onComplete = () => { if (state._roundGen === gen) onCompleteRaw(); };
  if (window._skipAnimation) {
    el.textContent = finalValue;
    el.classList.remove('rolling');
    el.classList.add('landed');
    onComplete();
    return;
  }
  const steps   = [50, 70, 100, 140, 200, 280, 380, 500];
  let stepIdx   = 0;

  function tick() {
    el.textContent = Math.floor(Math.random() * (max - min + 1)) + min;
    el.classList.add('rolling');
    el.classList.remove('landed');

    if (stepIdx < steps.length) {
      setTimeout(tick, steps[stepIdx++]);
    } else {
      el.textContent = finalValue;
      el.classList.remove('rolling');
      el.classList.add('landed');
      onComplete();
    }
  }
  tick();
}

// ── UI Helpers ────────────────────────────────────────────────────────────
function setLoadingStatus(msg) {
  dom.loadingStatus.textContent = msg;
}

function hideLoading() {
  dom.loadingOverlay.classList.add('hidden');
  dom.app.style.display = 'block';
}

function hideAllCards() {
  dom.destCard.classList.remove('active');
  dom.destWard.textContent = '';
  state._destWard = null;
  dom.journeyCard.style.display = 'none';
  dom.mapCard.style.display     = 'none';
  dom.barsCard.style.display    = 'none';
  dom.cafesCard.style.display   = 'none';
  dom.showBarsBtn.textContent   = t('barsBtn');
  dom.showCafesBtn.textContent  = t('cafesBtn');
  _placesCache.bars = null;
  _placesCache.cafes = null;
}

function showError(msg) {
  dom.loadingOverlay.classList.add('hidden');
  dom.app.style.display = 'block';
  dom.errorBanner.textContent = '⚠ ' + msg;
  dom.errorBanner.style.display = 'block';
}

function showStep(id) {
  document.querySelectorAll('.step-card').forEach(el => el.classList.remove('active'));
  if (id) document.getElementById(id).classList.add('active');
}

// ── Autocomplete ──────────────────────────────────────────────────────────
function setupAutocomplete() {
  const input    = document.getElementById('station-input');
  const list     = document.getElementById('autocomplete-list');
  let activeIdx  = -1;
  let currentItems = [];
  let debounceTimer = null;

  function close() {
    list.classList.remove('open');
    list.innerHTML = '';
    activeIdx = -1;
    currentItems = [];
  }

  function openWith(names) {
    currentItems = names;
    list.innerHTML = names.map((n, i) => {
      const entries = [...(state.stationIndex[normalize(n)] || [])];
      for (const ak of getAliasKeys(n)) for (const e of (state.stationIndex[ak] || [])) entries.push(e);
      const lineNames = [...new Set(entries.map(e => lineDisplayName(state.lines[e.lineIdx].name)))].slice(0, 4).join(', ');
      const ja = stationJa(n);
      return `<div class="autocomplete-item" data-idx="${i}">
        ${formatStationName(n, ja)}<span class="station-sub">${lineNames}</span>
      </div>`;
    }).join('');
    list.classList.add('open');
  }

  function select(name) {
    setStationInput(name);
    close();
    gc('start-search');
    onStationSelected(name);
  }

  input.addEventListener('input', () => {
    input.classList.remove('selected');
    clearTimeout(debounceTimer);
    const q = normalize(input.value.trim());
    if (q.length < 1) { close(); return; }
    debounceTimer = setTimeout(() => {
      const names = state.wards23Only ? state.stationNames23 : state.stationNames;
      const norms = state.wards23Only ? state.stationNames23Norm : state.stationNamesNorm;
      const jaNames = state.wards23Only ? state.stationNames23Ja : state.stationNamesJa;
      const raw = input.value.trim();
      const matched = [];
      for (let i = 0; i < names.length; i++) {
        const posEn = norms[i].indexOf(q);
        const posJa = jaNames[i] ? jaNames[i].indexOf(raw) : -1;
        if (posEn !== -1) matched.push({ name: names[i], pos: posEn });
        else if (posJa !== -1) matched.push({ name: names[i], pos: posJa });
      }
      matched.sort((a, b) => a.pos - b.pos || a.name.localeCompare(b.name));
      const matches = matched.slice(0, 50).map(m => m.name);
      if (matches.length === 0) { close(); return; }
      openWith(matches);
    }, 100);
  });

  input.addEventListener('keydown', e => {
    if (!list.classList.contains('open')) return;
    const items = list.querySelectorAll('.autocomplete-item');
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      activeIdx = Math.min(activeIdx + 1, items.length - 1);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      activeIdx = Math.max(activeIdx - 1, 0);
    } else if (e.key === 'Enter' && activeIdx >= 0) {
      e.preventDefault();
      select(currentItems[activeIdx]);
      return;
    } else if (e.key === 'Escape') {
      close(); return;
    }
    items.forEach((el, i) => el.classList.toggle('active', i === activeIdx));
  });

  list.addEventListener('mousedown', e => {
    const item = e.target.closest('.autocomplete-item');
    if (!item) return;
    e.preventDefault();
    select(currentItems[+item.dataset.idx]);
  });

  document.addEventListener('click', e => {
    if (!document.getElementById('station-card').contains(e.target)) close();
  });
}

// ── Handlers ──────────────────────────────────────────────────────────────
// Platforms at name after arriving by arrivedVia, without the way back.
// Transfer: not the line just left. Normal arrival: not the arrival line's
// reverse direction (on a line listing the station twice, the platform whose
// next stop is prevName). Arrival over a connection leg (prevName is not on the
// arrival line, e.g. 西船橋 → 南船橋 on a Musashino train): only what leads
// straight back to prevName goes (connections boarding here, platforms whose
// next stop it is) and the line's other tracks stay; when nothing leads there
// the reverse-direction rule applies. The way back stays when it is the only
// way out ("dead end" = no other rideable platform, not just one platform of
// the arriving line: Chuo-Rinkan → Odakyu Enoshima must route onto the other line).
// Returns { platforms, removed, deadEnd? } (removed: platforms dropped or left with fewer connections).
function arrivalPlatforms(name, arrivedVia) {
  const all = getPlatforms(name, !!arrivedVia);
  if (!arrivedVia) return { platforms: all, removed: [] };
  // A merged connection-only platform (Ueno Tokyo Line) carries every member line
  if (arrivedVia.isTransfer) return { platforms: all.filter(p => p.lineName !== arrivedVia.lineName && !p._mergedLines?.includes(arrivedVia.lineName)), removed: [] };
  const reverseDir = { start: 'end', end: 'start', A: 'B', B: 'A' }[arrivedVia.direction];
  if (!reverseDir) return { platforms: all, removed: [] };
  const prev = arrivedVia.prevName;
  const nextStop = p => state.lines[p.lineIdx]?.stations[p.fromIdx + dirStep(p.direction)];
  const onLine = (stnName, lineName) => (state.stationIndex[normalize(stnName)] || [])
    .some(e => state.lines[e.lineIdx].name === lineName);
  const pk = p => p.lineIdx + '|' + p.direction + '|' + p.fromIdx + '|' + (p.displayName || '');
  const lostConns = (p, byKey) => !byKey.has(pk(p)) || (byKey.get(pk(p))._connections?.length || 0) < (p._connections?.length || 0);
  let kept = null;
  if (prev && !onLine(prev, arrivedVia.lineName)) {
    // A Shinkansen next to prev is another track (Tokyo → Ueno), never the way back
    const kind = SHINKANSEN_LINES.has(arrivedVia.lineName);
    const back = getPlatforms(name, true, prev)
      .filter(p => nextStop(p)?.name !== prev || SHINKANSEN_LINES.has(p.lineName) !== kind);
    const byKey = new Map(back.map(p => [pk(p), p]));
    if (all.some(p => lostConns(p, byKey))) kept = back;
  }
  if (!kept) {
    const twice = (state.stationIndex[normalize(name)] || [])
      .filter(e => state.lines[e.lineIdx].name === arrivedVia.lineName).length > 1;
    const onArrivalLine = p => p.lineName === arrivedVia.lineName || !!p._mergedLines?.includes(arrivedVia.lineName);
    const isBacktrack = p => onArrivalLine(p) && (twice && prev
      ? nextStop(p)?.name === prev
      : p.direction === reverseDir);
    kept = all.filter(p => !isBacktrack(p));
  }
  if (!kept.some(p => getEffectiveStops(p, { ei: null, bi: null }).validCount > 0)) return { platforms: all, removed: [], deadEnd: true };
  const keptByKey = new Map(kept.map(p => [pk(p), p]));
  return { platforms: kept, removed: all.filter(p => lostConns(p, keptByKey)) };
}

function onStationSelected(name, arrivedVia) {
  // Playing on without answering the Resume prompt = new game: hide the prompt
  // so its Resume button can't later replace this game with the old one
  state._settleResume?.();
  state._sessionSettled = true;
  state._arrivedVia = arrivedVia || null;
  const key   = normalize(name);
  const entries = state.stationIndex[key] || [];
  if (!entries.length) return;

  // A name is one physical station (disambiguateSharedNames splits distant
  // namesakes); prefer the arrival line's entry for its exact JA/coords
  const first = entries.find(e => state.lines[e.lineIdx].name === arrivedVia?.lineName) || entries[0];

  const stn   = state.lines[first.lineIdx].stations[first.stationIdx];
  state.currentStation = { name, ja: stn.ja, lat: stn.lat, lng: stn.lng };

  // Clear any ward-restriction warning now that a valid station is chosen
  if (state._wards23Hint) { dom.locationHint.textContent = ''; state._wards23Hint = false; }

  // Switch button to "New Game" mode
  dom.randomStationBtn.innerHTML = t('newGame');
  dom.randomStationBtn.title = t('newGameTitle');

  // Capture whether the last roll was a drink before resetting
  const lastWasDrink = state.selectedPlatform?.drinkHere || false;

  // Reset downstream steps
  resetRoundState();
  hideAllCards();
  dom.rollAgainBtn.style.display = '';
  dom.showBarsBtn.style.display = '';
  dom.showCafesBtn.style.display = '';
  showRollStopsUI();
  resetDiceUI();
  dom.rollPlatformBtn.disabled = false;
  dom.rerollPlatformBtn.style.display = 'none';
  dom.rerollStopsBtn.style.display = 'none';

  // Compute platforms + add drink-here as last option
  // (not if last roll was already a drink, already drank here, or arrived via transfer
  //  — the transfer die already covered the drink chance)
  const canDrinkHere = !lastWasDrink && !state.drankAt.has(normalize(name)) && !arrivedVia?.isTransfer;
  let allPlatforms = arrivalPlatforms(name, arrivedVia).platforms;
  // Filter out platforms with 0 reachable stops (e.g. wards boundary, all-drunk destinations)
  const reachable = allPlatforms.filter(p => getEffectiveStops(p, { ei: null, bi: null }).validCount > 0);
  if (reachable.length > 0) {
    allPlatforms = reachable;
  } else {
    // Dead end: all directions have 0 stops — rebuild without the via filter so player can go back
    allPlatforms = getPlatforms(name, !!arrivedVia);
  }
  // Separate shinkansen platforms — they get 5% roll treatment like flights
  // Merge platforms sharing the same next station (same track section)
  const rawShinkansen = allPlatforms.filter(p => SHINKANSEN_LINES.has(p.lineName));
  allPlatforms = allPlatforms.filter(p => !SHINKANSEN_LINES.has(p.lineName));
  const shinkansenPlatforms = mergeShinkansenPlatforms(rawShinkansen);
  allPlatforms = mergeSharedTrackPlatforms(allPlatforms, stn.ja);
  // Thirst: after 5 stations without drinking, extra roll numbers map to drink
  const extraDrinkNums = canDrinkHere ? Math.max(0, state.stationsSinceDrink - THIRST_THRESHOLD) : 0;
  // Airport stations always show a flight option (5% chance when rolled)
  const isAirport = /airport/i.test(name) || stn.ja === '東成田';
  // Drink-here must stay last: extra thirst numbers extend past the end of the list
  state.platforms = [
    ...allPlatforms,
    ...shinkansenPlatforms,
    ...(isAirport ? [{ takeFlight: true }] : []),
    ...(canDrinkHere ? [{ drinkHere: true }] : []),
  ];
  state.extraDrinkNums = extraDrinkNums;
  const lineCount = state.platforms.filter(p => !p.drinkHere && !p.takeFlight && !p.isShinkansen).length;
  const total     = state.platforms.length + extraDrinkNums;

  // Render platform grid
  refreshPlatformGrid();

  dom.platformCountText.innerHTML = t('platformCount', { n: lineCount, s: pl(lineCount), name: stationDisplayName(name), total });

  showStep('step-platforms');
}

_langRefreshers.push(function refreshRandomBtn() {
  if (state.currentStation) {
    dom.randomStationBtn.innerHTML = t('newGame');
    dom.randomStationBtn.title = t('newGameTitle');
  } else {
    dom.randomStationBtn.innerHTML = `<span data-i18n="randomBtn">${t('randomBtn')}</span>`;
    dom.randomStationBtn.title = t('pickRandom');
  }
});

function rollPlatform() {
  state._preRollThirst = state.stationsSinceDrink;
  gc('roll-platform');
  dom.rollPlatformBtn.disabled = true;
  const n    = state.platforms.length + (state.extraDrinkNums || 0);
  // Special platforms: shinkansen (5%) and flight (5%) — excluded from normal pool
  const shinkansenIdxs = state.platforms.map((p, i) => p.isShinkansen ? i : -1).filter(i => i !== -1);
  const flightIdx = state.platforms.findIndex(p => p.takeFlight);
  let roll;
  if (window._forceNextRoll != null) {
    roll = Math.max(1, Math.min(n, window._forceNextRoll));
    window._forceNextRoll = null;
  } else if (shinkansenIdxs.length && Math.random() < SHINKANSEN_PROBABILITY) {
    const pick = shinkansenIdxs[Math.floor(Math.random() * shinkansenIdxs.length)];
    roll = pick + 1;
  } else if (flightIdx !== -1 && Math.random() < FLIGHT_PROBABILITY) {
    roll = flightIdx + 1;
  } else {
    const pool = [];
    const excludeRoll = state._rerollExcludePlatform;
    const excludeSet = new Set([
      ...(flightIdx !== -1 ? [flightIdx + 1] : []),
      ...shinkansenIdxs.map(i => i + 1),
    ]);
    for (let i = 1; i <= n; i++) if (!excludeSet.has(i) && i !== excludeRoll) pool.push(i);
    roll = pool.length ? pool[Math.floor(Math.random() * pool.length)] : Math.floor(Math.random() * n) + 1;
  }
  state._rerollExcludePlatform = null;

  animateRoll(1, n, roll, dom.diePlatform, () => {
    // Extra drink numbers map to the drink-here platform
    const idx = roll > state.platforms.length ? state.platforms.length - 1 : roll - 1;
    state.selectedPlatform = state.platforms[idx];
    state.rolledPlatformNum = roll;

    // ── Resolve merged shinkansen → pick a random underlying line ────────
    if (state.selectedPlatform._shinkansenOptions) {
      const opts = state.selectedPlatform._shinkansenOptions;
      let pick;
      if (window._forceNextShinkansenLine != null) {
        const fi = typeof window._forceNextShinkansenLine === 'number'
          ? window._forceNextShinkansenLine
          : opts.findIndex(o => o.lineName.toLowerCase().includes(String(window._forceNextShinkansenLine).toLowerCase()));
        pick = opts[Math.max(0, Math.min(opts.length - 1, fi))];
        window._forceNextShinkansenLine = null;
      } else {
        pick = opts[Math.floor(Math.random() * opts.length)];
      }
      state.selectedPlatform = pick;
    }
    // ── Resolve shared-track platform → pick a random train ───────────────
    const sharedOpts = state.selectedPlatform._sharedTrackOptions;
    if (sharedOpts) {
      const forced = window._forceNextSharedLine;
      window._forceNextSharedLine = null;
      state.selectedPlatform = (forced && sharedOpts.find(o => o.lineName === forced))
        || sharedOpts[Math.floor(Math.random() * sharedOpts.length)];
    }
    const p = state.selectedPlatform;

    // ── Take a flight! ────────────────────────────────────────────────────
    if (p.takeFlight) {
      dom.diePlatformLabel.innerHTML = `<strong>${t('flightRoll', { n: roll })}</strong>`;
      // No reroll — game over!

      state.destination = state.currentStation;
      state.rolledStops = 0;

      showDestCard(state.currentStation,
        () => `<span class="flight-msg">${t('flightMsg')}</span>`);
      // Hide all action buttons — no rolling from here
      dom.rollAgainBtn.style.display = 'none';
      dom.showBarsBtn.style.display = 'none';
      dom.showCafesBtn.style.display = 'none';
      addHistory({ flight: true });
      return;
    }

    // ── Drink here! ──────────────────────────────────────────────────────
    if (p.drinkHere) {
      const rk = eggRollKey(state.currentStation.ja);
      dom.diePlatformLabel.innerHTML = `<strong>${t(rk, { n: roll })}</strong>`;
      dom.rerollPlatformBtn.style.display = 'block';
      // Hide stops UI but keep step-stops visible (reroll button lives there)
      dom.rollStopsRow.style.display = 'none';
      dom.stopsRangeText.textContent = '';
      dom.trainTypeRow.style.display = 'none';
      dom.dieStops.parentElement.style.display = 'none';
      dom.selectedPlatformText.innerHTML = `<strong>${t(rk, { n: roll })}</strong>`;
      dom.selectedPlatformDot.style.background = 'transparent';
      showStep('step-stops');

      // Use current station as destination
      state.destination = state.currentStation;
      state.rolledStops = 0;

      const here = state.currentStation;
      showDestCard(here, () => t(eggStayingKey(here.ja)) + destSubHints(here, 'inline'));

      markDrankAt(state.currentStation.name);
      const drinkHereThirst = state.stationsSinceDrink;
      state.stationsSinceDrink = 0;
      addHistory({ thirst: drinkHereThirst });
      return;
    }

    // ── Normal train line (or shinkansen) ──────────────────────────────────
    renderPlatformBanner(p, roll);
    dom.rerollPlatformBtn.style.display = 'block';
    clearSelectionState();
    rebuildPickers(p);

    showStep('step-stops');
    saveSession(); // mid-round checkpoint (tab close may skip visibilitychange)
  });
}

// Die label + "selected platform" banner for a rolled train platform.
// Shared by rollPlatform, restoreMidRound, and the language refresher.
function renderPlatformBanner(p, roll) {
  const pLabel = platformLabel(p);
  const dirPart = pLabel.includes('—') ? pLabel.split('—').slice(1).join('—').trim() : '';
  const ln = platformLineName(p);
  const effectiveHintMax = getEffectiveStops(p, { ei: null, bi: null }).validCount;
  const head = p.isShinkansen ? `<strong>${t('shinkansenRoll', { n: roll })}</strong> ` : `<strong>#${roll} → ${ln}</strong>`;
  dom.diePlatformLabel.innerHTML = `${head}${dirPart ? ` ${dirPart}` : ''}
    <br><small class="text-muted">${t('maxStopsHint', { n: effectiveHintMax })}</small>`;
  dom.selectedPlatformDot.style.background = p.lineColor;
  dom.selectedPlatformText.innerHTML =
    `<strong>#${roll} — ${ln}</strong><br><span class="text-muted">${dirPart}</span>`;
}

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

function rerollPlatform() {
  state._roundGen = (state._roundGen || 0) + 1; // drop a stops roll still animating
  undoLastRound();
  state.stationsSinceDrink = state._preRollThirst ?? state.stationsSinceDrink;
  // Exclude the just-rolled platform from the next roll (alternates on repeated rerolls)
  state._rerollExcludePlatform = state.rolledPlatformNum;
  // Hide reroll, reset step 2 content, and fire a fresh roll
  dom.rerollPlatformBtn.style.display = 'none';
  hideAllCards();
  resetDiceUI();
  dom.rerollStopsBtn.style.display = 'none';
  showRollStopsUI();
  clearSelectionState();
  rollPlatform();
}

function rerollStops() {
  undoLastRound();
  state.stationsSinceDrink = state._preRollThirst ?? state.stationsSinceDrink;
  // Exclude the just-rolled stop count from the next roll (alternates on repeated rerolls)
  state._rerollExcludeStops = state.rolledStops;
  dom.rerollStopsBtn.style.display = 'none';
  dom.rollStopsBtn.style.display = '';
  dom.rollStopsBtn.style.flex = '1';
  dom.rollStopsBtn.style.width = '';
  hideAllCards();
  dom.dieStops.textContent = '?';
  dom.dieStops.className = 'die-face';
  dom.dieStopsLabel.innerHTML = t('rollStopsLabel');

  // If branches or express services, show buttons again; otherwise just reroll
  clearSelectionState();
  rebuildPickers(state.selectedPlatform, { autoRoll: true });
}
