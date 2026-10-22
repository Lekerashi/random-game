'use strict';

// ── Transfer check helpers ───────────────────────────────────────────────

function animateTransferDie(die, alreadyDrank, roll) {
  const emojis = alreadyDrank ? ['🚃', '🔀'] : ['🚃', '🍺', '🔀'];
  const resultEmoji = roll <= 3 ? '🚃' : roll === 4 ? '🔀' : '🍺';
  if (window._skipAnimation) {
    die.textContent = resultEmoji;
    die.classList.remove('rolling');
    return Promise.resolve();
  }
  die.classList.add('rolling');
  return new Promise(resolve => {
    let count = 0;
    const interval = setInterval(() => {
      die.textContent = emojis[Math.floor(Math.random() * emojis.length)];
      if (++count >= TRANSFER_DIE_FRAMES) {
        clearInterval(interval);
        die.textContent = resultEmoji;
        die.classList.remove('rolling');
        resolve();
      }
    }, TRANSFER_DIE_FRAME_MS);
  });
}

function applyOutcome(el, die, res, dieClass, i18nKey, labelClass, elClass) {
  die.classList.add(dieClass);
  res.textContent = t(i18nKey);
  res.setAttribute('data-i18n', i18nKey);
  res.classList.add(labelClass);
  el.classList.remove('checking');
  el.classList.add(elClass);
}

function waitForUndo(afterEl) {
  // Undo only available in debug mode (the dev server injects debug/, which sets window.game)
  if (window._skipAnimation || !window.game) { return Promise.resolve(false); }
  if (afterEl) afterEl.after(dom.undoTransferBtn);
  dom.undoTransferBtn.style.display = 'block';
  return new Promise(resolve => {
    const timeout = setTimeout(() => { dom.undoTransferBtn.onclick = null; dom.undoTransferBtn.style.display = 'none'; resolve(false); }, UNDO_TRANSFER_TIMEOUT);
    dom.undoTransferBtn.onclick = () => { clearTimeout(timeout); dom.undoTransferBtn.style.display = 'none'; resolve(true); };
  });
}

async function resetAndReroll(el, die, res, inlineBtn, elClass) {
  die.className = 'journey-die';
  die.textContent = '?';
  res.textContent = '';
  res.className = 'journey-result';
  el.classList.remove(elClass);
  el.classList.add('checking');
  inlineBtn.style.display = 'inline-block';
  await new Promise(resolve => {
    inlineBtn.onclick = () => { inlineBtn.onclick = null; resolve(); };
  });
  inlineBtn.style.display = 'none';
}

// Rows can be gone when a reset re-rendered the card while this round was finishing
function dimStations(start, end) {
  for (let j = start; j < end; j++) document.getElementById(`jstn-${j}`)?.classList.add('passed');
}

function undimStations(start, end) {
  for (let j = start; j < end; j++) document.getElementById(`jstn-${j}`)?.classList.remove('passed');
}

// ── Transfer check: thirst tracking ──────────────────────────────────────
// Returns a thirstBetween(a, b) function that counts local stations between
// two route indices, accounting for express/branch skips.
// Uses cumulative physical station counts so express→connection transitions
// count correctly (express portion = local stations skipped, connection = 1 each).
// route (the ride's stops) ends the express/branch count where the ride leaves
// the platform's line (a mid-line connection, e.g. Sotetsu → Shin-Yokohama at 西谷).
function buildThirstTracker(platform, rolledStops, route) {
  const ownStations = state.lines[platform.lineIdx]?.stations || [];
  const leftAt = route ? route.findIndex(stn => !ownStations.includes(stn)) : -1;
  const onLine = leftAt === -1 ? Infinity : leftAt; // stops ridden on the platform's line
  // Connection express: expressIndices are TARGET-line indices — use the
  // source-line ones (past the junction, each stop counts 1)
  const tt = state.selectedTrainType;
  const _ei = tt?._connTargetLineIdx != null ? tt._srcExpIndices : tt?.expressIndices;
  const _eiPos = _ei ? _ei.indexOf(platform.fromIdx) : -1;
  let _cumPhysical = null;
  if (_ei && _eiPos !== -1) {
    _cumPhysical = [0]; // departure = 0 stations passed
    let lastRaw = platform.fromIdx;
    let exhausted = false;
    for (let i = 1; i <= rolledStops; i++) {
      const prev = _cumPhysical[_cumPhysical.length - 1];
      if (i > onLine) exhausted = true;
      if (!exhausted) {
        const p = _eiPos + dirStep(platform.direction) * i;
        if (p < 0 || p >= _ei.length) {
          exhausted = true;
          _cumPhysical.push(prev + 1);
        } else {
          const raw = _ei[p];
          _cumPhysical.push(prev + Math.abs(raw - lastRaw));
          lastRaw = raw;
        }
      } else {
        _cumPhysical.push(prev + 1);
      }
    }
  }
  const _bi = state.selectedBranch?.branchIndices;
  if (!_cumPhysical && _bi) {
    const _biPos = _bi.indexOf(platform.fromIdx);
    if (_biPos !== -1) {
      _cumPhysical = [0];
      let lastBP = _biPos;
      for (let i = 1; i <= rolledStops; i++) {
        if (i > onLine) { _cumPhysical.push(_cumPhysical[_cumPhysical.length - 1] + 1); continue; }
        let p = _biPos + dirStep(platform.direction) * i;
        p = Math.max(0, Math.min(_bi.length - 1, p));
        _cumPhysical.push(_cumPhysical[_cumPhysical.length - 1] + Math.abs(p - lastBP));
        lastBP = p;
      }
    }
  }
  const _mult = platform.isShinkansen ? SHINKANSEN_THIRST : 1;
  function thirstBetween(a, b) {
    const raw = _cumPhysical ? _cumPhysical[b + 1] - _cumPhysical[a + 1] : b - a;
    return raw * _mult;
  }
  thirstBetween._cumPhysical = _cumPhysical;
  thirstBetween._mult = _mult;
  return thirstBetween;
}

// ── Transfer check: journey card rendering ───────────────────────────────
function renderJourneyCard(route, transferIndices) {
  dom.journeyCard.style.display = 'block';
  dom.journeyContent.innerHTML = route.map((stn, i) => {
    const isLast = i === route.length - 1;
    const isTransfer = transferIndices.includes(i);
    return `<div class="journey-station" id="jstn-${i}">
      <span class="journey-num">${i + 1}</span>
      <span class="journey-name">${formatStationName(stn.name, stn.ja)}</span>
      ${isTransfer ? `<span class="transfer-badge" data-i18n="transferBadge">${t('transferBadge')}</span>` : ''}
      ${isLast ? `<span class="dest-badge" data-i18n="destBadge">${t('destBadge')}</span>` : ''}
      ${isTransfer ? `<button class="journey-roll-btn" id="jroll-${i}" data-i18n="rollBtnLabel">${t('rollBtnLabel')}</button><span class="journey-die" id="jdie-${i}">?</span><span class="journey-result" id="jres-${i}"></span>` : ''}
    </div>`;
  }).join('');
  dom.journeyCard.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  dimStations(0, transferIndices[0]);
}

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

// ── Transfer check: resolve one transfer station ─────────────────────────
// Returns { outcome: 'stay' } | { outcome: 'transfer'|'drink', station, stopsUsed }
async function resolveTransfer(route, i, ti, transferIndices) {
  // A reset during a wait re-renders the card with the same row ids: stop touching it
  // (callers see the _roundGen change and abort the round)
  const gen = state._roundGen;
  const gone = () => state._roundGen !== gen;
  const el = document.getElementById(`jstn-${i}`);
  el.classList.add('checking');

  const inlineBtn = document.getElementById(`jroll-${i}`);
  if (!window._skipAnimation) {
    inlineBtn.style.display = 'inline-block';
    el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    await new Promise(resolve => {
      inlineBtn.onclick = () => { inlineBtn.onclick = null; resolve(); };
    });
    if (gone()) return { outcome: 'stay' };
    inlineBtn.style.display = 'none';
  }

  const die = document.getElementById(`jdie-${i}`);
  const res = document.getElementById(`jres-${i}`);
  const nextTI = ti + 1 < transferIndices.length ? transferIndices[ti + 1] : route.length;

  let undoRequested = true;
  while (undoRequested) {
    undoRequested = false;

    const alreadyDrank = state.drankAt.has(normalize(route[i].name));
    const extraDrink = Math.max(0, state.stationsSinceDrink - THIRST_THRESHOLD);
    const sides = alreadyDrank ? (TRANSFER_DIE_SIDES - 1) : TRANSFER_DIE_SIDES + extraDrink;
    let roll;
    if (window._forceNextRoll != null) {
      roll = Math.max(1, Math.min(sides, window._forceNextRoll));
      window._forceNextRoll = null;
    } else if (window._forceTransferQueue?.length) {
      roll = Math.max(1, Math.min(sides, window._forceTransferQueue.shift()));
    } else {
      roll = Math.floor(Math.random() * sides) + 1;
    }

    await animateTransferDie(die, alreadyDrank, roll);
    if (gone()) return { outcome: 'stay' };

    if (roll <= 3) {
      applyOutcome(el, die, res, 'stay', 'stayResult', 'stay-label', 'passed');
      dimStations(i + 1, nextTI);
      if (await waitForUndo(el)) {
        undimStations(i + 1, nextTI);
        await resetAndReroll(el, die, res, inlineBtn, 'passed');
        undoRequested = true;
        continue;
      }
      return { outcome: 'stay' };
    } else if (roll === 4) {
      applyOutcome(el, die, res, 'transfer', 'transferResult', 'transfer-label', 'transferred');
      if (await waitForUndo(el)) {
        await resetAndReroll(el, die, res, inlineBtn, 'transferred');
        undoRequested = true;
        continue;
      }
      dimStations(i + 1, route.length);
      return { outcome: 'transfer', station: route[i], stopsUsed: i + 1 };
    } else {
      applyOutcome(el, die, res, 'drink-roll', 'drinkResult', 'drink-label', 'drink');
      if (await waitForUndo(el)) {
        await resetAndReroll(el, die, res, inlineBtn, 'drink');
        undoRequested = true;
        continue;
      }
      dimStations(i + 1, route.length);
      return { outcome: 'drink', station: route[i], stopsUsed: i + 1 };
    }
  }
}

// ── Transfer check main ─────────────────────────────────────────────────

// Lines the ride itself runs on: the platform's line plus the whole connection
// chain (onward hops included). impliedLines: lines whose tracks the via stations
// ride over (e.g. Sotetsu-JR Direct for Saikyo↔Sotetsu) — not "transfers" from
// the very train running on them. A station served only by these offers no transfer.
function rideLineNames(platform) {
  const names = new Set([platform.lineName]);
  // The connection the ride takes (routeConnectionFor): an auto-taken terminus one
  // too, never one handleConnectionRouting only set to skip a picker
  const tt = state.selectedTrainType;
  let chainConn = routeConnectionFor(platform, findRouteConnection(platform, tt), tt?._connTargetLineIdx);
  const chainVisited = new Set();
  while (chainConn && !chainVisited.has(chainConn.to)) {
    names.add(chainConn.to);
    for (const l of (chainConn.impliedLines || [])) names.add(l);
    chainVisited.add(chainConn.to);
    chainConn = nextChainConn(chainConn, chainVisited, undefined, platform.lineName);
  }
  return names;
}

async function checkTransfers(platform, rolledStops) {
  const roundGen = state._roundGen; // a reset mid-journey aborts this round
  const route = getStationsAlongRoute(platform, rolledStops);
  state.route = route;

  const thirstBetween = buildThirstTracker(platform, rolledStops, route);

  const routeLineNames = rideLineNames(platform);

  // Find intermediate stations with transfer lines
  const transferIndices = [];
  for (let i = 0; i < route.length - 1; i++) {
    if (hasTransferLines(route[i].name, routeLineNames)) {
      transferIndices.push(i);
    }
  }

  // No transfer stations → skip journey animation
  if (transferIndices.length === 0) {
    state.stationsSinceDrink += thirstBetween(-1, route.length - 1);
    return { type: 'arrive', station: route[route.length - 1] };
  }

  renderJourneyCard(route, transferIndices);

  // Save initial checkpoint so page unload during first transfer is recoverable
  savePendingRound(route, transferIndices, 0, thirstBetween, platform, rolledStops);

  // Walk through each transfer station
  for (let ti = 0; ti < transferIndices.length; ti++) {
    const i = transferIndices[ti];

    // Count LOCAL stations passed since last transfer
    const prevTransferIdx = ti > 0 ? transferIndices[ti - 1] : -1;
    state.stationsSinceDrink += thirstBetween(prevTransferIdx, i);

    const result = await resolveTransfer(route, i, ti, transferIndices);
    if (state._roundGen !== roundGen) return { type: 'aborted' }; // New Game mid-journey

    if (result.outcome === 'transfer') {
      clearPendingRound();
      return { type: 'transfer', station: result.station, stopsUsed: result.stopsUsed };
    }
    if (result.outcome === 'drink') {
      clearPendingRound();
      return { type: 'drink', station: result.station, stopsUsed: result.stopsUsed };
    }
    // Stay — save checkpoint after each resolved transfer
    savePendingRound(route, transferIndices, ti + 1, thirstBetween, platform, rolledStops);
  }

  // No transfer triggered — count remaining stations to destination
  clearPendingRound();
  const lastChecked = transferIndices[transferIndices.length - 1];
  state.stationsSinceDrink += thirstBetween(lastChecked, route.length - 1);
  if (!window._skipAnimation) await new Promise(r => setTimeout(r, TRANSFER_ARRIVE_DELAY));
  if (state._roundGen !== roundGen) return { type: 'aborted' };
  return { type: 'arrive', station: route[route.length - 1] };
}

// ── Post-transfer result handling (shared by rollStops and resume) ──────
async function handleRoundResult(result, p, roll) {
  if (result.type === 'transfer') {
    state.destination = result.station;
    // Line the rider is actually on at the transfer station (walks the
    // connection chain, so mid-line hops like Chuo→Ome count)
    const transferLine = getEffectiveArrival(p).lineName;
    addHistory({ transferred: true, stopsUsed: result.stopsUsed, _transferLine: transferLine });
    const roundGen = state._roundGen;
    if (!window._skipAnimation) await new Promise(r => setTimeout(r, TRANSFER_REDIRECT_DELAY));
    if (state._roundGen !== roundGen) return; // New Game during the redirect pause
    setStationInput(result.station.name);
    window.scrollTo({ top: 0, behavior: 'smooth' });
    onStationSelected(result.station.name, { lineName: transferLine, isTransfer: true });
    return;
  }
  if (result.type === 'drink') {
    state.destination = result.station;
    state.selectedPlatform = { ...p, drinkHere: true };
    const stn = result.station;
    showDestCard(stn, () => t(eggStayingKey(stn.ja)) + destSubHints(stn, 'inline'));
    markDrankAt(result.station.name);
    const drinkTransferThirst = state.stationsSinceDrink;
    state.stationsSinceDrink = 0;
    addHistory({ drinkAtTransfer: true, stopsUsed: result.stopsUsed, thirst: drinkTransferThirst });
    return;
  }
  // Normal arrival
  const dest = result.station;
  state.destination = dest;
  const trainTypeLabel = state.selectedTrainType ? ` (${state.selectedTrainType.ja})` : '';
  const fromName = state.currentStation.name;
  showDestCard(dest, () =>
    `${lineDisplayName(p.lineName)}${trainTypeLabel} &nbsp;·&nbsp; ${t('stopsFrom', { n: roll, s: pl(roll), station: stationDisplayName(fromName) })}`
    + destSubHints(dest, 'wrap'));
  markDrankAt(dest.name);
  const arrivalThirst = state.stationsSinceDrink;
  state.stationsSinceDrink = 0;
  addHistory({ drinkAtArrival: true, thirst: arrivalThirst });
}

function rollStops() {
  dom.rollStopsBtn.disabled = true;
  const routeInfo = getEffectiveStops(state.selectedPlatform);
  const max = routeInfo.validCount;

  if (max === 0) {
    // No valid destinations (all drunk-at) — show message and allow reroll
    dom.dieStops.textContent = '—';
    dom.dieStopsLabel.innerHTML = `<strong>${t('noValidStops')}</strong>`;
    dom.rollStopsBtn.disabled = false;
    dom.rerollStopsBtn.style.display = 'inline-flex';
    return;
  }

  let roll;
  if (window._forceNextRoll != null) {
    roll = Math.max(1, Math.min(max, window._forceNextRoll));
    window._forceNextRoll = null;
  } else {
    const excludeStop = state._rerollExcludeStops;
    state._rerollExcludeStops = null;
    if (excludeStop != null && max > 1) {
      const pool = [];
      for (let i = 1; i <= max; i++) if (i !== excludeStop) pool.push(i);
      roll = pool[Math.floor(Math.random() * pool.length)];
    } else {
      roll = Math.floor(Math.random() * max) + 1;
    }
  }

  // Rerolls stay hidden until the round resolves — rerolling while the die
  // spins or mid-transfer would start a second round that races this one
  dom.rerollStopsBtn.style.display = 'none';
  const showRerollPlatform = dom.rerollPlatformBtn.style.display;
  dom.rerollPlatformBtn.style.display = 'none';

  animateRoll(1, max, roll, dom.dieStops, async () => {
    const physicalStops = routeInfo.physicalStopsMap[roll - 1];
    state.rolledStops = roll;

    dom.dieStopsLabel.innerHTML = `<strong>${t('stopsResult', { n: roll, s: pl(roll) })}</strong>`;
    if (dom.trainTypeRow.style.display !== 'none') {
      dom.rollStopsBtn.style.display = 'none';
    } else {
      dom.rollStopsBtn.style.width = 'auto';
    }
    dom.rollStopsRow.style.display = 'flex';

    // Capture platform before async transfer checks (state may change during await)
    const p = state.selectedPlatform;

    // Check for transfers along the route (using physical stop count)
    const result = await checkTransfers(p, physicalStops);
    if (result.type === 'aborted') return; // reset mid-journey: this round is gone
    await handleRoundResult(result, p, roll);
    if (result.type !== 'transfer') {
      dom.rerollStopsBtn.style.display = 'inline-flex';
      dom.rerollPlatformBtn.style.display = showRerollPlatform;
    }
  });
}

_langRefreshers.push(function refreshStopsDie() {
  if (state.rolledStops != null) {
    dom.dieStopsLabel.innerHTML = `<strong>${t('stopsResult', { n: state.rolledStops, s: pl(state.rolledStops) })}</strong>`;
  }
});
