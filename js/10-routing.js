'use strict';

// ── Routing ───────────────────────────────────────────────────────────────

// Walk stations on a connected line, filtering by chain-express stops if active.
// Returns an array of station objects (up to maxStops). boundIdx (target-line
// index, optional): the ride leaves there for a mid-line hop (chainBoundIdx).
function walkConnectionStations(conn, maxStops, chainExpStops, boundIdx = null) {
  const step = dirStep(conn.toDir);
  if (chainExpStops) {
    const toLine = state.lines[conn.toLineIdx];
    const result = [];
    for (let k = conn.toJunctionIdx + step; result.length < maxStops; k += step) {
      if (k < 0 || k >= toLine.stations.length) break;
      if (boundIdx != null && (k - boundIdx) * step > 0) break;
      if (conn.toUntilIdx >= 0) {
        if (step === 1 && k > conn.toUntilIdx) break;
        if (step === -1 && k < conn.toUntilIdx) break;
      }
      if (stopSetHas(chainExpStops, toLine.stations[k])) {
        result.push(toLine.stations[k]);
      }
    }
    return result;
  }
  const bound = boundIdx != null ? (boundIdx - conn.toJunctionIdx) * step : Infinity;
  return getConnectionStations(conn, Math.min(maxStops, bound));
}

// Walk through a sparse indices array (express stops or branch stations) in a direction.
// Returns { stations, exhausted }. exhausted=true when the walker ran out of indices before stops.
// opts.boundIdx: stop walking when reaching this station index (e.g. junction).
function walkIndices(line, indices, fromIdx, dir, stops, opts) {
  const pos = indices.indexOf(fromIdx);
  if (pos === -1) return { stations: [], exhausted: false };
  const step = dirStep(dir);
  const stations = [];
  for (let i = 1; i <= stops; i++) {
    const p = pos + step * i;
    if (p < 0 || p >= indices.length) break; // past the last stop (never re-add the departure)
    stations.push(line.stations[indices[p]]);
    if (opts?.boundIdx != null && indices[p] === opts.boundIdx) break;
  }
  return { stations, exhausted: stations.length < stops };
}

// Resolve which connection to use for routing.
function findRouteConnection(platform, tt) {
  let conn = state.selectedConnection;
  if (!conn && platform._connections) {
    const connTargetLineIdx = tt?._connTargetLineIdx;
    if (connTargetLineIdx != null) {
      conn = platform._connections.find(c => c.toLineIdx === connTargetLineIdx) || null;
    }
    if (!conn) conn = platform._connections[0] || null;
  }
  return conn;
}

// Which connection this ride actually takes. A terminus connection always
// extends the ride; a mid-line one only when a connection train type targets
// it or the player picked it in a picker (pickers set selectedDestination).
// handleConnectionRouting also auto-sets selectedConnection just to skip a
// picker — that alone keeps the ride on the source line.
function routeConnectionFor(platform, conn, connTargetLineIdx) {
  if (!conn || platform.circular) return conn;
  const N = state.lines[platform.lineIdx].stations.length;
  if (conn.fromJunctionIdx === dirEnd(N, platform.direction)) return conn;
  const taken = connTargetLineIdx != null
    || (state.selectedConnection === conn && !!state.selectedDestination);
  return taken ? conn : null;
}

// Walk local stops on the source line, limited by terminus or mid-line junction.
// conn: the connection the ride takes (from routeConnectionFor), or null.
function routeOnLineLocal(platform, line, stops, conn) {
  const N = line.stations.length;
  let onLineMax = platform.circular ? N - 1
    : Math.abs(platform.fromIdx - dirEnd(N, platform.direction));
  // Taking a mid-line connection: stop at the junction station
  if (conn && conn.fromJunctionIdx !== dirEnd(N, platform.direction)) {
    onLineMax = Math.min(onLineMax, Math.abs(conn.fromJunctionIdx - platform.fromIdx));
  }
  const stations = [];
  for (let i = 1; i <= Math.min(stops, onLineMax); i++) {
    let idx;
    if (platform.circular) {
      idx = ((platform.fromIdx + dirStep(platform.direction) * i) % N + N) % N;
    } else {
      idx = platform.fromIdx + dirStep(platform.direction) * i;
    }
    stations.push(line.stations[idx]);
  }
  return stations;
}

// Extend route onto connected lines: via stations, target line stops, chained connections.
// Mutates and returns the result array.
function routeConnectionExtension(platform, stops, result, tt, conn, ei) {
  if (!conn || result.length >= stops || tt?._terminatesAtJunction) return result;

  let stopsLeft = stops - result.length;
  const visitedLines = new Set([platform.lineName]);
  let currentConn = conn;

  // Add via stations (skip starting station or consecutive dupes)
  const startName = state.lines[platform.lineIdx].stations[platform.fromIdx]?.name;
  for (const vs of currentConn.viaStations) {
    if (stopsLeft <= 0) break;
    if (vs.name === startName) continue;
    if (result.length > 0 && vs.name === result[result.length - 1].name) continue;
    result.push(vs);
    stopsLeft--;
  }

  // The next chained hop: a mid-line one ends this target-line walk at its junction
  visitedLines.add(currentConn.to);
  let next = nextChainConn(currentConn, visitedLines, tt);

  // Add target line stations (express-filtered if target-line train type selected)
  if (stopsLeft > 0) {
    const connTargetEi = (tt?._connTargetLineIdx != null) ? ei : null;
    const bound = chainBoundIdx(currentConn, next);
    if (connTargetEi) {
      const toLine = state.lines[currentConn.toLineIdx];
      const step = dirStep(currentConn.toDir);
      // The express may run through the junction without stopping (passThrough)
      const start = firstExpressPos(connTargetEi, currentConn.toJunctionIdx, step, true);
      for (let ep = start, n = 0; start !== -1 && n < stopsLeft; ep += step, n++) {
        if (ep < 0 || ep >= connTargetEi.length) break;
        if (bound != null && (connTargetEi[ep] - bound) * step > 0) break;
        if (currentConn.toUntilIdx >= 0) {
          if (step === 1 && connTargetEi[ep] > currentConn.toUntilIdx) break;
          if (step === -1 && connTargetEi[ep] < currentConn.toUntilIdx) break;
        }
        result.push(toLine.stations[connTargetEi[ep]]);
      }
    } else {
      for (const cs of walkConnectionStations(currentConn, stopsLeft, tt?._chainExpressStops, bound)) result.push(cs);
    }
  }

  // Follow chained connections (e.g. Seibu → Fukutoshin → Toyoko)
  stopsLeft = stops - result.length;
  while (stopsLeft > 0 && next) {
    currentConn = next;
    visitedLines.add(currentConn.to);
    next = nextChainConn(currentConn, visitedLines, tt);
    for (const vs of currentConn.viaStations) {
      if (stopsLeft <= 0) break;
      if (result.length > 0 && vs.name === result[result.length - 1].name) continue;
      result.push(vs);
      stopsLeft--;
    }
    if (stopsLeft > 0) {
      for (const cs of walkConnectionStations(currentConn, stopsLeft, tt?._chainExpressStops, chainBoundIdx(currentConn, next))) result.push(cs);
      stopsLeft = stops - result.length;
    }
  }

  return result;
}

function getStationsAlongRoute(platform, stops, expressIndicesOverride, trainType, branchIndicesOverride) {
  const tt = trainType || state.selectedTrainType;
  const line = state.lines[platform.lineIdx];
  const ei = expressIndicesOverride !== undefined ? expressIndicesOverride : tt?.expressIndices;
  const trace = window._routeDebug ? [] : null;

  // Express routing on source line (skip if express targets a connected line)
  if (ei && tt?._connTargetLineIdx == null) {
    trace?.push('strategy: source-line express (' + (ei.length) + ' indices)');
    const conn = platform._connections ? routeConnectionFor(platform, findRouteConnection(platform, tt), null) : null;
    // A taken mid-line connection ends the express run at the junction
    const midLine = conn && conn.fromJunctionIdx !== dirEnd(line.stations.length, platform.direction);
    const r = walkIndices(line, ei, platform.fromIdx, platform.direction, stops,
      midLine ? { boundIdx: conn.fromJunctionIdx } : undefined);
    trace?.push('walkIndices(express): ' + r.stations.length + ' stops, exhausted=' + r.exhausted);
    if (!r.exhausted || !conn) { if (trace) r.stations._trace = trace; return r.stations; }
    trace?.push('findRouteConnection: ' + conn.from + ' → ' + conn.to);
    const result = routeConnectionExtension(platform, stops, r.stations, tt, conn, ei);
    trace?.push('routeConnectionExtension: total ' + result.length + ' stops');
    if (trace) result._trace = trace;
    return result;
  }

  // Branch routing
  const bi = branchIndicesOverride || state.selectedBranch?.branchIndices;
  if (bi) {
    trace?.push('strategy: branch routing (' + bi.length + ' indices)');
    const r = walkIndices(line, bi, platform.fromIdx, platform.direction, stops);
    if (r.stations.length > 0) { if (trace) { trace.push('walkIndices(branch): ' + r.stations.length + ' stops'); r.stations._trace = trace; } return r.stations; }
    trace?.push('walkIndices(branch): not on branch, falling through');
  }

  // Normal routing with optional connection extension
  const conn = routeConnectionFor(platform, findRouteConnection(platform, tt), tt?._connTargetLineIdx);
  trace?.push('strategy: local' + (conn ? ' + connection (' + conn.from + ' → ' + conn.to + ')' : ''));
  let result = [];

  // Source-line express for connection services (e.g. Yokohama Line Rapid, Ome Sp. Rapid)
  const srcEi = tt?._srcExpIndices;
  if (srcEi && tt?._connTargetLineIdx != null && conn) {
    trace?.push('walkIndices(srcExpress→junction): srcEi has ' + srcEi.length + ' indices');
    result = walkIndices(line, srcEi, platform.fromIdx, platform.direction, stops, { boundIdx: conn.fromJunctionIdx }).stations;
  }
  // A service calling here with no further source-line stop runs non-stop to
  // the junction (e.g. Airport Rapid from Haneda T3 past Keikyu Kamata)
  const nonStopToJunction = result.length === 0 && srcEi && tt?._connTargetLineIdx != null && conn
    && srcEi.includes(platform.fromIdx) && platform.fromIdx !== conn.fromJunctionIdx;
  if (result.length === 0 && !nonStopToJunction) {
    trace?.push('routeOnLineLocal' + (tt?._connTargetLineIdx != null ? ' (connTarget)' : ''));
    result = routeOnLineLocal(platform, line, stops, conn);
  }
  trace?.push('on-line: ' + result.length + ' stops');

  result = routeConnectionExtension(platform, stops, result, tt, conn, ei);
  trace?.push('final: ' + result.length + ' total stops');
  if (trace) result._trace = trace;
  return result;
}

function capStops(max) {
  return state.stopsCap ? Math.min(max, state.stopsCapValue) : max;
}

// Returns 'color:#000;' for light backgrounds, '' for dark (white text is default via CSS)
function pillTextStyle(hex) {
  if (!hex || hex[0] !== '#') return '';
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  // Relative luminance (sRGB)
  return (0.299 * r + 0.587 * g + 0.114 * b) > 160 ? 'color:#000;' : '';
}

function showRollStopsUI() {
  dom.trainTypeRow.style.display = 'none';
  dom.rollStopsRow.style.display = 'flex';
}

function showTrainTypeUI() {
  dom.rollStopsRow.style.display = 'none';
  dom.trainTypeRow.style.display = 'flex';
}

function resetDiceUI() {
  dom.diePlatform.textContent = '?';
  dom.diePlatform.className = 'die-face';
  dom.dieStops.textContent = '?';
  dom.dieStops.className = 'die-face';
  dom.dieStops.parentElement.style.display = '';
  dom.diePlatformLabel.innerHTML = t('rollTrainLabel');
  dom.dieStopsLabel.innerHTML = t('rollStopsLabel');
  dom.rollStopsBtn.disabled = true;
  resetStopsBtn();
}

// renderSub: () => html for the line under the name; kept so a language
// switch can re-render it (refreshDestSub).
function showDestCard(station, renderSub) {
  dom.destName.textContent = station.name;
  dom.destName.href = `https://www.google.com/maps/search/?api=1&query=${station.lat},${station.lng}`;
  dom.destNameJa.textContent = station.ja || '';
  // Ward / city context
  const ward = station.lat != null ? getWardOrCity(station.lat, station.lng) : null;
  if (ward) {
    state._destWard = ward;
    const wardSuffix = ward.isWard ? ' Ward' : ward.ja.endsWith('市') ? ' City' : '';
    dom.destWard.textContent = currentLang === 'ja' ? ward.ja : ward.name + wardSuffix;
    dom.destWard.style.display = '';
  } else {
    state._destWard = null;
    dom.destWard.textContent = '';
    dom.destWard.style.display = 'none';
  }
  state._destSubRender = renderSub;
  dom.destSub.innerHTML = renderSub();
  dom.destCard.classList.add('active');
  dom.destCard.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

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

function resetStopsBtn() {
  dom.rollStopsBtn.style.display = '';
  dom.rollStopsBtn.style.flex = '';
  dom.rollStopsBtn.style.width = '';
}

function clearSelectionState() {
  state.selectedTrainType = null;
  state.selectedBranch = null;
  state.selectedConnection = null;
  state.selectedDestination = null;
  state._pickerType = null;
  state._pickerArgs = null;
}

function rebuildPickers(p, opts) {
  if (showBranchButtons(p)) return true;
  if (showTrainTypeButtons(p)) return true;
  // Same count rollStops will use (includes an auto-selected express type)
  const effectiveMax = getEffectiveStops(p).validCount;
  dom.stopsRangeText.textContent = t('rollingStops', { dest: destLabel(), max: effectiveMax, s: pl(effectiveMax) });
  showRollStopsUI();
  dom.rollStopsBtn.disabled = false;
  if (opts && opts.autoRoll) rollStops();
  return false;
}

function resetRoundState() {
  state._roundGen = (state._roundGen || 0) + 1; // orphans any dice animation still running
  state.selectedPlatform = null;
  clearSelectionState();
  state.rolledStops = null;
  state.rolledPlatformNum = null;
  state._rerollExcludePlatform = null;
  state._rerollExcludeStops = null;
  state._preRollThirst = null;
  state.destination = null;
  state._pendingRound = null;
}

// emoji: 'wrap' = always show emoji in <span> (normal arrival),
//        'inline' = show egg emoji only for egg stations (drinkHere), falsy = no emoji (drink at transfer)
function destSubHints(station, emoji) {
  const egg = getEgg(station.ja);
  const drinkEmoji = eggEmoji(station.ja);
  const hintText = t(egg?.position === 'replace' && egg.hintKey ? egg.hintKey : 'drinkHint');
  let prefix = '';
  if (emoji === 'wrap') {
    prefix = `<span style="font-size:1.1rem">${drinkEmoji}</span> `;
  } else if (emoji === 'inline' && egg?.emoji) {
    prefix = drinkEmoji + ' ';
  }
  const prepend = egg?.position === 'prepend' && egg.hintKey
    ? `<div class="drink-hint">${egg.hintEmoji} ${t(egg.hintKey)}</div>` : '';
  const append = egg?.position === 'append' && egg.hintKey
    ? `<div class="drink-hint">${egg.hintEmoji} ${t(egg.hintKey)}</div>` : '';
  return prepend
    + `<div class="drink-hint">${prefix}${hintText}</div>`
    + append;
}

// Given a platform and optional express indices, compute the valid (non-drunk-at)
// destinations along the route. Returns { validCount, physicalStopsMap } where
// physicalStopsMap[i] = physical stop number for the ith valid destination.
function getValidRouteInfo(platform, expressIndices, maxPhysical, branchIndicesOverride, trainType) {
  const bi = branchIndicesOverride || state.selectedBranch?.branchIndices;
  if (maxPhysical === undefined) {
    maxPhysical = expressIndices
      ? getExpressMaxStops(platform, expressIndices)
      : bi
        ? getBranchMaxStops(platform, bi)
        : platform.maxStops;
  }
  if (maxPhysical === 0) return { validCount: 0, physicalStopsMap: [] };
  const fullRoute = getStationsAlongRoute(platform, maxPhysical, expressIndices || null, trainType, bi);
  const physicalStopsMap = [];
  for (let i = 0; i < fullRoute.length; i++) {
    if (!state.drankAt.has(normalize(fullRoute[i].name))) {
      physicalStopsMap.push(i + 1);
    }
  }
  return { validCount: physicalStopsMap.length, physicalStopsMap };
}

// Compute the effective (valid, non-drunk-at) max stops for a platform,
// accounting for express indices, branch indices, and the stops cap setting.
// opts fields (all optional, default to state.selectedTrainType / state.selectedBranch):
//   ei                   — express indices array
//   bi                   — branch indices array
//   _connTargetLineIdx   — target line for connection express
//   _terminatesAtJunction — type only reaches junction, not beyond
//   _connTotalMax        — pre-computed total max across source+via+target
// Returns { validCount, physicalStopsMap, rawMax, cappedMax }
function getEffectiveStops(platform, opts = {}) {
  const ei = opts.ei !== undefined ? opts.ei : state.selectedTrainType?.expressIndices;
  const bi = opts.bi !== undefined ? opts.bi : state.selectedBranch?.branchIndices;
  const connTargetLineIdx = opts._connTargetLineIdx !== undefined
    ? opts._connTargetLineIdx
    : state.selectedTrainType?._connTargetLineIdx;
  const trace = window._routeDebug ? [] : null;

  let rawMax;
  const terminates = opts._terminatesAtJunction || state.selectedTrainType?._terminatesAtJunction;
  if (terminates) {
    rawMax = platform._onLineStops != null ? platform._onLineStops : platform.maxStops;
    trace?.push('path: terminatesAtJunction, rawMax=' + rawMax);
  } else if (connTargetLineIdx != null) {
    // Express on connected target line: source on-line + via + target express stops
    let conn = state.selectedConnection;
    if (!conn && platform._connections) {
      conn = platform._connections.find(c => c.toLineIdx === connTargetLineIdx)
        || platform._connections[0];
    }
    if (conn) {
      const terminusIdx = dirEnd(state.lines[platform.lineIdx].stations.length, platform.direction);
      const isMidLine = conn.fromJunctionIdx !== terminusIdx;
      const onLine = isMidLine
        ? Math.abs(conn.fromJunctionIdx - platform.fromIdx)
        : (platform._onLineStops || 0);
      const startName = state.lines[platform.lineIdx].stations[platform.fromIdx]?.name;
      const via = effectiveViaCount(conn, startName);
      const targetStops = ei
        ? getExpressMaxStops({ fromIdx: conn.toJunctionIdx, direction: conn.toDir, lineIdx: connTargetLineIdx, passThrough: true }, ei)
        : getConnectionMaxStops(conn);
      // For mid-line express, onLine is raw (local) distance — the actual express
      // source-line count is handled by getStationsAlongRoute which stops at the junction.
      // Use the pre-computed _connTotalMax if available (set by showTrainTypeButtons).
      const connMax = opts._connTotalMax !== undefined ? opts._connTotalMax : state.selectedTrainType?._connTotalMax;
      rawMax = connMax || (onLine + via + targetStops);
      trace?.push('path: connTarget (line ' + connTargetLineIdx + '), onLine=' + onLine + ' via=' + via + ' target=' + targetStops + ' rawMax=' + rawMax);
    } else {
      rawMax = platform.maxStops;
      trace?.push('path: connTarget but no conn found, rawMax=' + rawMax);
    }
  } else if (ei) {
    rawMax = getExpressMaxStops(platform, ei);
    trace?.push('path: source express, baseMax=' + rawMax);
    // Source-line express can continue as local onto connected lines
    // (e.g. Den-en-toshi Express → Hanzomon local at Shibuya)
    // But not when the target line has its own express services — those handle through-running
    if (platform._connections && platform._onLineStops != null) {
      const line = state.lines[platform.lineIdx];
      const terminusIdx = dirEnd(line.stations.length, platform.direction);
      if (ei.includes(terminusIdx)) {
        const conn = state.selectedConnection || platform._connections?.[0];
        const targetHasExpress = conn && EXPRESS_SERVICES[conn.to];
        if (!targetHasExpress) {
          rawMax += (platform.maxStops - platform._onLineStops);
          trace?.push('express extends as local onto connection, rawMax=' + rawMax);
        } else {
          trace?.push('target has express — no extension');
        }
      }
    }
  } else if (bi) {
    rawMax = getBranchMaxStops(platform, bi);
    trace?.push('path: branch (' + bi.length + ' indices), rawMax=' + rawMax);
  } else {
    rawMax = platform.maxStops;
    trace?.push('path: default local, rawMax=' + rawMax);
  }

  // Apply destination limit (from selectedDestination) before cap.
  // When untilIdx is set (LINE_DESTINATIONS) and express indices are active,
  // compute the express stop count to that index — totalMax is in local terms.
  const destLimit = state.selectedDestination?.totalMax;
  const destUntilIdx = state.selectedDestination?.untilIdx;
  if (destLimit != null) {
    trace?.push('destLimit=' + destLimit + ', destUntilIdx=' + destUntilIdx);
    if (destUntilIdx != null && ei && connTargetLineIdx == null) {
      const expToLimit = ei.filter(i =>
        platform.direction === 'end' ? (i > platform.fromIdx && i <= destUntilIdx)
                                     : (i < platform.fromIdx && i >= destUntilIdx)
      ).length;
      rawMax = Math.min(rawMax, expToLimit);
      trace?.push('destLimit (express to untilIdx): rawMax=' + rawMax);
    } else if (ei && connTargetLineIdx == null && platform._onLineStops != null && destLimit > platform._onLineStops) {
      const line = state.lines[platform.lineIdx];
      const terminusIdx = dirEnd(line.stations.length, platform.direction);
      const expOnLine = ei.filter(i =>
        platform.direction === 'end' ? (i > platform.fromIdx && i <= terminusIdx)
                                     : (i < platform.fromIdx && i >= terminusIdx)
      ).length;
      const connStops = destLimit - platform._onLineStops;
      rawMax = Math.min(rawMax, expOnLine + connStops);
      trace?.push('destLimit (express+conn): expOnLine=' + expOnLine + ' connStops=' + connStops + ' rawMax=' + rawMax);
    } else {
      // Mid-line connection destinations extend past the platform's on-line
      // max (which mid-line conns don't extend) — on the plain-local path
      // (rawMax = platform.maxStops) the destination's own range is
      // authoritative. Type-aware paths (connTargetLineIdx/ei) already exceed
      // the platform max when appropriate and must still be clamped DOWN by
      // destLimit. In 23-wards mode use the route-aware ward cap (the
      // source-line cap under-counts in-ward branches like Haneda).
      const dConn = state.selectedConnection;
      const dMidLine = dConn && dConn.fromJunctionIdx !==
        dirEnd(state.lines[platform.lineIdx].stations.length, platform.direction);
      const plainLocal = connTargetLineIdx == null && !ei && !terminates;
      if (dMidLine && plainLocal) {
        rawMax = Math.min(destLimit, state.wards23Only ? wardConnCap(platform, dConn) : Infinity);
        trace?.push('destLimit (mid-line local): rawMax=' + rawMax);
      } else {
        rawMax = Math.min(rawMax, destLimit);
        trace?.push('destLimit (simple): rawMax=' + rawMax);
      }
    }
  }
  // Pass train type context through to route computation instead of mutating state.
  // Keep the type's routing fields (_srcExpIndices, _chainExpressStops) so validity
  // is checked on the same route the ride takes.
  // { ei: null } asks for the plain local count: don't carry the selected type's routing
  const tt = opts._tt !== undefined ? opts._tt : (opts.ei === null ? null : state.selectedTrainType);
  const ttOverride = (connTargetLineIdx != null || terminates)
    ? { ...(tt || {}), expressIndices: ei, _connTargetLineIdx: connTargetLineIdx, _terminatesAtJunction: terminates }
    : undefined;

  // A picked destination station (stopAt): end the ride there, or at the last stop
  // before the type passes it. Counting along the actual route keeps express types
  // right, which the local-stop totalMax above can't.
  const stopAt = state.selectedDestination?.stopAt;
  let reachesDest = true;
  if (stopAt) {
    const full = getStationsAlongRoute(platform, 999, ei || null, ttOverride, bi);
    const sl = state.lines[stopAt.lineIdx].stations, step = dirStep(stopAt.dir);
    let pos = -1;
    for (let k = 0; k < full.length; k++) {
      const i = sl.indexOf(full[k]);
      if (i === -1) continue;
      if (i === stopAt.idx) { pos = k + 1; break; }
      if ((i - stopAt.idx) * step > 0) { pos = k; break; } // passed it without stopping
    }
    if (pos > 0) rawMax = pos;
    else reachesDest = false; // this type never gets to the destination
    trace?.push('stopAt: route pos=' + pos + ', rawMax=' + rawMax);
  }
  // 23-wards mode: end at the last in-ward stop of the route actually ridden.
  // The per-path maxima above are ward-capped only on some paths (a connection
  // express total like Seibu → Fukutoshin → Toyoko F-Liner is not).
  if (state.wards23Only && rawMax > 0) {
    const route = getStationsAlongRoute(platform, rawMax, ei || null, ttOverride, bi);
    const out = route.findIndex(s => !isIn23Wards(s.lat, s.lng));
    if (out !== -1) { rawMax = out; trace?.push('wards: route leaves the 23 wards after ' + out + ' stop(s)'); }
  }

  const cappedMax = capStops(rawMax);
  trace?.push('cappedMax=' + cappedMax);
  const info = getValidRouteInfo(platform, ei || null, cappedMax, bi, ttOverride);

  const result = { validCount: info.validCount, physicalStopsMap: info.physicalStopsMap, rawMax, cappedMax, reachesDest };
  if (trace) { trace.push('validCount=' + info.validCount); result._trace = trace; }
  return result;
}

function hasTransferLines(stationName, currentLineNames) {
  const entries = [...(state.stationIndex[normalize(stationName)] || [])];
  for (const aliasKey of getAliasKeys(stationName)) {
    for (const e of (state.stationIndex[aliasKey] || [])) entries.push(e);
  }
  // currentLineNames can be a string or a Set of line names
  if (typeof currentLineNames === 'string') {
    return entries.some(e => state.lines[e.lineIdx].name !== currentLineNames);
  }
  return entries.some(e => !currentLineNames.has(state.lines[e.lineIdx].name));
}
