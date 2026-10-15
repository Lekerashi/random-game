'use strict';

// ── Pickers ───────────────────────────────────────────────────────────────
// ── Physical branches (Tsurumi, Marunouchi, Nambu) ──
// Returns { pickerShown: true } if picker displayed, { pickerShown: false } otherwise.
function handlePhysicalBranches(p) {
  if (!LINE_BRANCHES[p.lineName] || state.selectedBranch) return { pickerShown: false };
  const line = state.lines[p.lineIdx];
  const branches = getBranches(p.lineName, platformStation(p).ja, line, p.direction);
  if (!branches || branches.length === 0) return { pickerShown: false };

  // Filter to branches that have stations ahead in our direction
  const viable = branches.filter(b => {
    const pos = b.branchIndices.indexOf(p.fromIdx);
    if (pos === -1) return false;
    if (p.direction === 'start') return pos > 0;
    return pos < b.branchIndices.length - 1;
  });

  // Check if all viable branches produce the same reachable route (shared trunk)
  if (viable.length > 1) {
    const bestMax = Math.max(...viable.map(b => {
      const raw = getBranchMaxStops(p, b.branchIndices);
      return capStops(raw);
    }));
    const getAhead = b => {
      const pos = b.branchIndices.indexOf(p.fromIdx);
      const full = p.direction === 'start'
        ? b.branchIndices.slice(0, pos).reverse()
        : b.branchIndices.slice(pos + 1);
      return full.slice(0, bestMax).join(',');
    };
    const firstAhead = getAhead(viable[0]);
    if (viable.every(b => getAhead(b) === firstAhead)) {
      state.selectedBranch = viable[0];
      return { pickerShown: false };
    }
  }

  if (viable.length <= 1) {
    state.selectedBranch = viable[0] || branches[0] || null;
    return { pickerShown: false };
  }

  // Show branch picker buttons
  showBranchPickerUI(p, viable.map(b => ({
    name: b.name, ja: b.ja, color: b.color,
    effectiveMax: getEffectiveStops(p, { ei: null, bi: b.branchIndices }).validCount,
    onSelect: () => { state.selectedBranch = b; },
  })), !!EXPRESS_SERVICES[p.lineName], 'branch');
  return { pickerShown: true };
}

// ── Line destinations (trains terminating at different stations) ──
// Returns { pickerShown: true } if picker displayed, { pickerShown: false } otherwise.
function handleLineDestinations(p) {
  const lineDest = LINE_DESTINATIONS[p.lineName];
  if (!lineDest || p.direction !== lineDest.direction || state.selectedDestination) return { pickerShown: false };

  const line = state.lines[p.lineIdx];
  const dests = lineDest.destinations
    .map(d => {
      if (!scheduleActive(d.schedule)) return null;
      const untilIdx = line.stations.findIndex(s => s.ja === d.until);
      if (untilIdx === -1) return null;
      // Skip destinations not on the selected branch (e.g. Nambu Tachikawa dests on Hamakawasaki branch)
      if (state.selectedBranch?.branchIndices && !state.selectedBranch.branchIndices.includes(untilIdx)) return null;
      // Count stops from current position to destination
      const stopsToEnd = (untilIdx - p.fromIdx) * dirStep(lineDest.direction);
      if (stopsToEnd <= 0) return null;
      const effectiveMax = capStops(Math.min(stopsToEnd, p.maxStops));
      return { ...d, untilIdx, effectiveMax,
        _outOfWards: outOfWards(line, untilIdx), _connRef: null, _isLineDest: true,
        onSelect: () => { state.selectedDestination = { totalMax: effectiveMax, untilIdx, name: d.name, ja: d.ja,
          stopAt: { lineIdx: p.lineIdx, idx: untilIdx, dir: p.direction } }; } };
    })
    .filter(d => d && d.effectiveMax > 0);

  // Merge mid-line connection destinations, chained ones included
  // (e.g. Chuo → Ome at Tachikawa, Sobu → Narita → Narita Airport)
  for (const conn of p._connections || []) {
    if (!conn.destinations) continue;
    const stopsToJunction = (conn.fromJunctionIdx - p.fromIdx) * dirStep(p.direction);
    if (stopsToJunction <= 0) continue;
    for (const d of servedDests(conn, p)) dests.push(connDestChoice(p, conn, d, stopsToJunction));
    dests.push(...chainDestChoices(p, conn, stopsToJunction).filter(d => d.effectiveMax > 0));
  }

  const wardDests = collapseOutOfWardChoices(p, applyServiceRanges(p, dests));

  if (wardDests.length === 0) return { pickerShown: false };

  // If all destinations have the same effectiveMax (cap makes them equivalent),
  // auto-select the furthest one — no meaningful choice to make. Prefer a
  // within-line destination so a capped plain ride doesn't become a through-run.
  const allSameMax = wardDests.every(d => d.effectiveMax === wardDests[0].effectiveMax);
  if (allSameMax || wardDests.length === 1) {
    const lineOnly = wardDests.filter(d => d._isLineDest);
    const pool = lineOnly.length ? lineOnly : wardDests;
    pool[pool.length - 1].onSelect();
    return { pickerShown: false };
  }
  showBranchPickerUI(p, wardDests.map(d => ({
    name: d.name, ja: d.ja, color: d.color,
    effectiveMax: d.effectiveMax,
    onSelect: d.onSelect,
  })), !!EXPRESS_SERVICES[p.lineName], 'lineDestination');
  return { pickerShown: true };
}

// ── Connection branches (through-running) ──
// Returns { pickerShown: true } if picker displayed, { pickerShown: false } otherwise.
function handleConnectionRouting(p) {
  if (!p._connections || p._connections.length === 0 || state.selectedConnection || state.selectedDestination) return { pickerShown: false };

  // A mid-line connection none of whose destinations is served from here right now
  // (off-hours, or its services don't call here) isn't a choice (Oimachi 急行 from 江田)
  const N = state.lines[p.lineIdx].stations.length;
  const conns = p._connections.filter(c => c.fromJunctionIdx === dirEnd(N, p.direction) || c.lineDests
    || !c.destinations?.length || c.destinations.some(d => scheduleActive(d.schedule) && destServesStation(c, d, p)));
  if (conns.length === 0) return { pickerShown: false };
  const onLineStops = p._onLineStops || 0;
  const rollableMax = capStops(p.maxStops);

  // If we can't even reach the junction, no connection matters
  // (but still show picker when connections have destinations — e.g. mid-line Y-junctions)
  if (rollableMax <= onLineStops && !conns.some(c => c.destinations || c.lineDests)) {
    state.selectedConnection = conns[0];
    return { pickerShown: false };
  }

  // Single connection with destinations = destination picker
  if (conns.length === 1 && conns[0].destinations) {
    return { pickerShown: showDestinationPicker(p, conns[0], onLineStops) };
  }

  // Single connection without destinations — auto-select
  if (conns.length === 1) {
    state.selectedConnection = conns[0];
    return { pickerShown: false };
  }

  // If all connections go to the same target line and any have destinations,
  // show a destination picker FIRST (before shared-trunk check)
  const allSameTarget = conns.every(c => c.toLineIdx === conns[0].toLineIdx && c.toDir === conns[0].toDir);
  const connWithDests = conns.find(c => c.destinations && c.destinations.length > 0);

  // Multiple connections without destinations — check for shared-trunk auto-select
  if (!connWithDests) {
    const getConnRoute = conn => {
      const available = rollableMax - onLineStops;
      const via = conn.viaStations.map(s => s.ja).join(',');
      const targetStops = getConnectionStations(conn, available - effectiveViaCount(conn, platformStation(p).name));
      return via + '|' + targetStops.map(s => s.ja).join(',');
    };
    const firstRoute = getConnRoute(conns[0]);
    if (conns.every(c => getConnRoute(c) === firstRoute)) {
      state.selectedConnection = conns[0];
      return { pickerShown: false };
    }
  }

  // If all connections go to the same target line and have destinations,
  // show a destination picker (e.g. merged UTL southbound at Ueno)
  if (allSameTarget && connWithDests) {
    const bestConn = conns.reduce((a, b) =>
      (b.destinations?.length || 0) > (a.destinations?.length || 0) ? b : a, conns[0]);
    return { pickerShown: showDestinationPicker(p, bestConn, onLineStops) };
  }

  // If all connections have destinations, merge into a flat destination picker
  // (e.g. Meguro → Hiyoshi / Shin-Yokohama / Ebina / Shonandai)
  if (conns.every(c => c.destinations)) {
    return { pickerShown: showMergedDestinationPicker(p, conns, onLineStops) };
  }

  // Show connection picker (different target lines)
  showBranchPickerUI(p, conns.map(conn => {
    const viaCount = effectiveViaCount(conn, platformStation(p).name);
    let targetMax = getConnectionMaxStops(conn);
    // Include chain extensions from onward connections (e.g. Keikyu→Asakusa→Keisei)
    const chainExtra = computeConnectionExtra(getOnwardConnections(conn), '', new Set([conn.to]));
    // If connection has express but no local (no stops:null entry),
    // cap targetMax to the express service with the most stops
    if (conn.express && !conn.express.some(e => e.stops === null)) {
      const toLine = state.lines[conn.toLineIdx];
      const jIdx = conn.toJunctionIdx;
      const step = dirStep(conn.toDir);
      const wardLimit = state.wards23Only ? wardMaxStops(toLine, jIdx, step) : Infinity;
      const maxExpStops = Math.max(...conn.express.map(e => {
        const indices = getExpressIndices(toLine, e.stops);
        return indices.filter(i => {
          const dist = (i - jIdx) * step;
          return dist > 0 && dist <= wardLimit;
        }).length;
      }));
      targetMax = Math.min(targetMax, maxExpStops);
    }
    // A mid-line junction is reached before the line's end
    const srcLine = state.lines[p.lineIdx];
    const isMidLine = conn.fromJunctionIdx !== dirEnd(srcLine.stations.length, p.direction);
    const srcStops = isMidLine ? Math.abs(conn.fromJunctionIdx - p.fromIdx) : onLineStops;
    let connMax = viaCount + targetMax + chainExtra + srcStops;
    // Express-only connection: no longer than its longest service (source-line part included)
    if (isMidLine && conn.express && !conn.express.some(e => e.stops === null)) {
      const svc = resolveConnectionExpress({ express: conn.express, targetLineIdx: conn.toLineIdx,
        targetLine: state.lines[conn.toLineIdx], connObj: conn }, p, srcLine);
      if (svc.length) connMax = Math.min(connMax, Math.max(...svc.map(t => t._connTotalMax)));
    }
    const effectiveMax = Math.min(capStops(connMax), p.maxStops);
    return {
      name: conn.name || conn.to, ja: conn.ja || LINE_NAMES_JA[conn.to] || conn.to, color: conn.color || p.lineColor,
      effectiveMax,
      onSelect: () => {
        if (conn.destinations) {
          state.selectedConnection = conn;
          if (showDestinationPicker(p, conn, onLineStops)) return 'subpicker';
          // Destinations auto-selected (all capped to same max) — continue flow
        } else {
          state.selectedConnection = conn;
          state.selectedDestination = { totalMax: onLineStops + viaCount + getConnectionMaxStops(conn) + chainExtra, name: conn.name || conn.to, ja: conn.ja || LINE_NAMES_JA[conn.to] || conn.to };
        }
      },
    };
  }), false, 'connectionBranch');
  return { pickerShown: true };
}

// Show branch destination buttons for branching lines. Returns true if shown.
function showBranchButtons(p) {
  if (!p) return false;
  if (handlePhysicalBranches(p).pickerShown) return true;
  if (handleLineDestinations(p).pickerShown) return true;
  if (handleConnectionRouting(p).pickerShown) return true;
  return false;
}

// Ward-truncated max along a connection's route: source stops to the
// junction (bounded by the platform's ward cap), plus via, plus in-ward
// stops on the target line. p.maxStops follows the SOURCE line, so it
// under-counts branches that stay in the wards (e.g. Haneda: the main line
// leaves the wards at the Tama river, but the airport branch never does).
function wardConnCap(p, conn) {
  const stopsToJunction = (conn.fromJunctionIdx - p.fromIdx) * dirStep(p.direction);
  if (stopsToJunction > p.maxStops) return p.maxStops; // boundary before junction
  const via = effectiveViaCount(conn, platformStation(p).name);
  const target = wardMaxStops(state.lines[conn.toLineIdx], conn.toJunctionIdx, dirStep(conn.toDir));
  return stopsToJunction + via + target;
}

// Roll-range cap for a connection destination button. Mid-line connections
// don't extend p.maxStops, so a destination past the junction must not be
// clamped by it (e.g. Ayase from Machida via the Chiyoda branch at
// Yoyogi-Uehara). Terminus connections already include their extension in
// p.maxStops. In 23-wards mode, mid-line destinations clamp to the
// route-aware ward cap instead of the source-line one.
function destRollCap(p, conn, cappedMax) {
  const line = state.lines[p.lineIdx];
  const isMidLine = conn.fromJunctionIdx !== dirEnd(line.stations.length, p.direction);
  if (!isMidLine) return capStops(Math.min(cappedMax, p.maxStops));
  if (state.wards23Only) return capStops(Math.min(cappedMax, wardConnCap(p, conn)));
  return capStops(cappedMax);
}

// In 23-wards mode a terminus outside the wards is unreachable (routes
// truncate at the boundary), so its option shouldn't crowd the board.
function outOfWards(line, untilIdx) {
  if (!state.wards23Only) return false;
  const s = line && line.stations[untilIdx];
  return !!s && !isIn23Wards(s.lat, s.lng);
}

// Collapse out-of-ward destination choices into a single option per
// distinct clamped range — the direction stays rollable to the ward
// boundary without a board full of unreachable termini. Real trains still
// display out-of-ward termini on their signboards, so the button keeps the
// nearest signboard name and appends the last reachable station:
// "Yokohama (until Rokugodote)" / 横浜方面（六郷土手まで）. Falls back to
// "X & beyond" when the clamped ride crosses onto another line.
// A collapsed option is dropped when an in-ward choice of the same kind on
// the same connection already covers its range (UTL's Hiratsuka vs Shinagawa).
function collapseOutOfWardChoices(p, choices) {
  if (!state.wards23Only) return choices;
  const kept = choices.filter(c => !c._outOfWards);
  const out = choices.filter(c => c._outOfWards);
  if (!out.length) return choices;
  const line = state.lines[p.lineIdx];
  const step = dirStep(p.direction);
  const byMax = new Map();
  // Same range on the same connection: keep the choice allowing the most
  // train types (no `services` allowlist = all), e.g. 宇都宮 over 小金井
  const breadth = c => c._services ? c._services.length : Infinity;
  for (const c of out) {
    const covered = kept.some(k => k._connRef === c._connRef &&
      !!k._isLineDest === !!c._isLineDest && k.effectiveMax >= c.effectiveMax);
    if (covered) continue;
    const prev = byMax.get(c.effectiveMax);
    if (!prev || (prev._connRef === c._connRef && breadth(c) > breadth(prev))) byMax.set(c.effectiveMax, c);
  }
  for (const c of byMax.values()) {
    // Ride stays on the source line when it can't reach the junction —
    // label with the station the max roll actually lands at. Chained choices
    // measure to their first hop (_connRef is a later hop on another line).
    const leaveConn = c._sourceConn || c._connRef;
    const toJunction = leaveConn && !c._isLineDest
      ? (leaveConn.fromJunctionIdx - p.fromIdx) * step : Infinity;
    const boundaryStn = c.effectiveMax <= toJunction
      ? line.stations[p.fromIdx + c.effectiveMax * step] : null;
    // Label from the all-stations range; the button shows what its `services` ride
    const shown = serviceRange(p, c);
    if (!(shown.effectiveMax > 0)) continue;
    kept.push(boundaryStn
      ? { ...shown, name: `${c.name} (until ${boundaryStn.name})`, ja: `${c.ja}（${boundaryStn.ja}まで）` }
      : { ...shown, name: c.name + ' & beyond', ja: c.ja.replace(/方面$/, '') + '〜' });
  }
  return kept;
}

// A destination with a `services` allowlist only appears on the departure
// board at stations one of its allowed services actually calls at.
// Express-class services match when a stop list with their name (connection
// express or source-line EXPRESS_SERVICES) includes the current station.
// Local-class services (stops: null) count everywhere, unless the destination
// declares `localFrom` (JA station name on the source line): locals only feed
// the destination from that station onward toward the junction (e.g. locals
// to Zushi-Hayama start at Kanazawa-Bunko — Shinagawa's board never shows it).
// Chained destinations skip this check (their services describe a later hop).
function destServesStation(conn, d, p) {
  if (!d.services) return true;
  const line = state.lines[p.lineIdx];
  const curKeys = new Set([normalize(platformStation(p).name),
                           normalize(platformStation(p).ja || '')]);
  const lineDefs = EXPRESS_SERVICES[p.lineName] || [];
  for (const svc of d.services) {
    const n = normalize(svc);
    // The connection's own entry wins over a same-name source-line type (Odakyu 急行
    // runs at 18h, but not through to the Chiyoda Line)
    const named = defs => defs.filter(t => normalize(t.name) === n);
    const connMatches = named(conn.express || []);
    const matches = connMatches.length ? connMatches : named(lineDefs);
    // Express-class: allowed service stops at the current station (today's schedule)
    const stopsOf = t => t.stops ? resolveServiceStops(t, line, p.direction) : t.stops;
    if (matches.some(t => stopsOf(t)?.some(s => curKeys.has(normalize(s))))) return true;
    // Local-class: stops:null def, or an undefined "Local" name (implicit local)
    const runsLocal = t => t.stops === null && resolveServiceStops(t, line, p.direction)?.length !== 0; // [] = hidden now
    const isLocalClass = matches.length ? matches.some(runsLocal) : n === 'local';
    if (isLocalClass) {
      if (!d.localFrom) return true;
      const fromIdx = line.stations.findIndex(s => s.ja === d.localFrom);
      if (fromIdx === -1) return true;
      if ((p.fromIdx - fromIdx) * dirStep(p.direction) >= 0) return true;
    }
  }
  return false;
}

// Show destination picker for a connection with destinations.
// Returns true if picker shown, false if auto-selected.
// ── Destination choice builders (shared by the destination pickers) ──

// Source-line short-turn destination (conn.lineDests): trains that terminate
// before the junction (e.g. Hashimoto, Machida on the Yokohama Line). The ride
// stays on the source line: sets selectedDestination but NOT selectedConnection.
function lineDestChoice(p, conn, d) {
  if (!scheduleActive(d.schedule)) return null;
  const line = state.lines[p.lineIdx];
  const untilIdx = line.stations.findIndex(s => s.ja === d.until);
  if (untilIdx === -1) return null;
  const stopsToEnd = (untilIdx - p.fromIdx) * dirStep(p.direction);
  if (stopsToEnd <= 0) return null;
  return {
    name: d.name, ja: d.ja, color: d.color || p.lineColor,
    effectiveMax: capStops(Math.min(stopsToEnd, p.maxStops)), _fullMax: stopsToEnd,
    _outOfWards: outOfWards(line, untilIdx), _connRef: conn, _isLineDest: true,
    onSelect: () => { state.selectedDestination = { totalMax: stopsToEnd, untilIdx, name: d.name, ja: d.ja,
      stopAt: { lineIdx: p.lineIdx, idx: untilIdx, dir: p.direction } }; },
  };
}

// Through-running destination d on conn, reached after `onLine` source-line
// stops. Its range is capped by this connection's own reach, not the
// platform's overall max (which another connection may set).
function connDestChoice(p, conn, d, onLine) {
  const via = effectiveViaCount(conn, platformStation(p).name);
  const stopsOnTarget = conn.toDir === 'start'
    ? conn.toJunctionIdx - d.untilIdx
    : d.untilIdx - conn.toJunctionIdx;
  const cappedMax = Math.min(onLine + via + Math.max(0, stopsOnTarget),
                             onLine + via + getConnectionMaxStops(conn));
  return {
    name: d.name, ja: d.ja, color: d.color || p.lineColor,
    effectiveMax: destRollCap(p, conn, cappedMax), _fullMax: cappedMax,
    _services: d.services || null,
    _outOfWards: outOfWards(state.lines[conn.toLineIdx], d.untilIdx), _connRef: conn,
    onSelect: () => {
      state.selectedConnection = conn;
      state.selectedDestination = { totalMax: cappedMax, services: d.services || null, name: d.name, ja: d.ja,
        stopAt: { lineIdx: conn.toLineIdx, idx: d.untilIdx, dir: conn.toDir } };
    },
  };
}

// A destination shows the range the train types serving it actually ride, not
// the all-stations count its builder estimates (Kita-Senju → Shibuya on 急行/準急:
// 1–15, not the local 1–19; Hanzomon → Kuki has no through 各停). Each choice
// is answered on a scratch selection, then the selection is put back.
// Out-of-ward choices keep the estimate here, so collapseOutOfWardChoices still
// folds them into one ward-capped option per range; it then applies the range to
// the option it keeps.
function serviceRange(p, c) {
  if (!(c.effectiveMax > 0)) return c;
  const saved = [state.selectedBranch, state.selectedConnection, state.selectedDestination, state.selectedTrainType];
  try {
    state.selectedTrainType = null;
    c.onSelect();
    const r = resolveTrainTypes(p);
    const effs = r?.types ? r.types.map(g => ({ validCount: g._count, rawMax: g._rawMax }))
      : [getEffectiveStops(p, r?.autoSelect ? trainTypeOpts(r.autoSelect) : undefined)];
    return { ...c, effectiveMax: Math.max(...effs.map(e => e.validCount)),
      _fullMax: Math.max(...effs.map(e => e.rawMax)) };
  } finally {
    [state.selectedBranch, state.selectedConnection, state.selectedDestination, state.selectedTrainType] = saved;
  }
}
function applyServiceRanges(p, choices) {
  return choices.map(c => c._outOfWards ? c : serviceRange(p, c));
}

// Destinations of conn that resolved and whose trains serve this station now
// (boardSchedule: per-boarding-station hours)
function servedDests(conn, p) {
  return conn.destinations.filter(d => d.untilIdx !== -1 && scheduleActive(d.schedule)
    && scheduleActive(d.boardSchedule?.[platformStation(p).ja]) && destServesStation(conn, d, p));
}

// Source-line stops ridden before conn's junction (mid-line junctions use
// stops-to-junction instead of the full on-line count)
function stopsBeforeJunction(p, conn, onLineStops) {
  const stopsToJunction = (conn.fromJunctionIdx - p.fromIdx) * dirStep(p.direction);
  return Math.min(onLineStops, Math.max(0, stopsToJunction));
}

// Chained destinations of conn, reached after `effectiveOnLine` source-line stops:
// follow onward connections recursively for through-running beyond the target
// line (e.g. Keikyu Airport → Keikyu Main → Asakusa → Keisei Oshiage)
function chainDestChoices(p, conn, effectiveOnLine) {
  const choices = [];
  const viaCount = effectiveViaCount(conn, platformStation(p).name);
  let chainConn = conn;
  let chainBase = effectiveOnLine + viaCount + getConnectionMaxStops(conn);
  const chainVisited = new Set([conn.from, conn.to]);
  const chainPath = []; // hops after conn that lead to chainConn
  // chainFrom: a connection chained rides only continue onto when boarded on one of these lines
  const chainAllowed = c => !c.chainFrom || c.chainFrom.includes(p.lineName);
  // Chained rides board one of conn's through trains: a chained destination
  // without its own `services` keeps the ones the first hop allows (e.g. Odakyu
  // 準急/急行 to Joban), so none when no conn destination is served here.
  // One with its own `services` only needs them to run (firstHopRunsNow).
  const served = servedDests(conn, p);
  const chainBlocked = served.length === 0 && conn.destinations.some(d => d.services);
  const inheritedServices = served.length && served.every(d => d.services)
    ? [...new Set(served.flatMap(d => d.services))] : null;
  // A chained destination's services that the first hop declares must run now
  // (Haneda → Sky Access needs an エアポート快特: none in the morning). A Local the
  // first hop doesn't declare still runs through (Toyoko → Tojo locals run after
  // the F-Liner, the hop's only declared type, stops at 17h)
  const firstHopRunsNow = services => {
    if (!services || !conn.express) return true;
    const declares = s => conn.express.some(e => normalize(e.name) === s || (e.chainName && normalize(e.chainName) === s));
    const want = services.map(normalize);
    if (want.some(s => s === normalize('Local') && !declares(s))) return true;
    const declared = conn.express.filter(e => want.includes(normalize(e.name)) || (e.chainName && want.includes(normalize(e.chainName))));
    return declared.some(e => resolveServiceStops(e, state.lines[conn.toLineIdx], p.direction)?.length !== 0);
  };
  // Destination choices of a chained hop reached after `base` stops (through its via).
  // Mid-line hops (midLine) aren't in p.maxStops, so only the ward cap clamps them.
  const pushChainDests = (nextConn, base, path, midLine) => {
    for (const d0 of nextConn.destinations.filter(d => d.untilIdx !== -1 && chainAllowed(d) && scheduleActive(d.schedule))) {
      if (chainBlocked && !d0.services) continue;
      const d = d0.services || !inheritedServices ? d0 : { ...d0, services: inheritedServices };
      if (!firstHopRunsNow(d.services)) continue;
      const stopsOnNext = nextConn.toDir === 'start'
        ? nextConn.toJunctionIdx - d.untilIdx
        : d.untilIdx - nextConn.toJunctionIdx;
      const totalMax = base + Math.max(0, stopsOnNext);
      const cappedMax = midLine && !state.wards23Only ? totalMax : Math.min(totalMax, p.maxStops);
      // Hops routing must follow to reach this destination (see nextChainConn)
      const chain = [...path, nextConn].map(c => ({ to: c.to, toDir: c.toDir }));
      choices.push({
        name: d.name, ja: d.ja, color: d.color || p.lineColor,
        effectiveMax: capStops(cappedMax), _fullMax: totalMax,
        _services: d.services || null,
        _outOfWards: outOfWards(state.lines[nextConn.toLineIdx], d.untilIdx), _connRef: nextConn,
        _sourceConn: conn, // first hop: the one that leaves the boarding line
        onSelect: () => {
          state.selectedConnection = conn;
          state.selectedDestination = { totalMax: cappedMax, services: d.services || null, name: d.name, ja: d.ja, chain,
            stopAt: { lineIdx: nextConn.toLineIdx, idx: d.untilIdx, dir: nextConn.toDir } };
        },
      });
    }
  };
  // Mid-line hops off hop's target line (e.g. Keio Line → Toei Shinjuku at
  // Sasazuka), recursively. `base`: stops ridden up to hop's target junction.
  const addMidLineHops = (hop, base, path, visited) => {
    for (const m of getMidLineOnward(hop)) {
      if (visited.has(m.to) || !chainAllowed(m)) continue;
      const mBase = base + Math.abs(m.fromJunctionIdx - hop.toJunctionIdx) + effectiveViaCount(m, '');
      pushChainDests(m, mBase, path, true);
      addMidLineHops(m, mBase, [...path, m], new Set([...visited, m.to]));
    }
  };
  addMidLineHops(conn, effectiveOnLine + viaCount, [], chainVisited);
  while (chainConn) {
    const onward = getOnwardConnections(chainConn).filter(c => !chainVisited.has(c.to) && chainAllowed(c));
    let nextChain = null;
    for (const nextConn of onward) {
      if (!nextConn.destinations) { nextChain = nextConn; chainVisited.add(nextConn.to); continue; }
      if (!nextConn.destinations.some(d => d.untilIdx !== -1)) continue;
      pushChainDests(nextConn, chainBase + effectiveViaCount(nextConn, ''), chainPath, false);
      nextChain = nextConn;
      chainVisited.add(nextConn.to);
    }
    if (!nextChain) break;
    const junctionBase = chainBase + effectiveViaCount(nextChain, '');
    chainBase = junctionBase + getConnectionMaxStops(nextChain);
    chainPath.push(nextChain);
    addMidLineHops(nextChain, junctionBase, chainPath.slice(), chainVisited);
    chainConn = nextChain;
  }
  return choices;
}

function showDestinationPicker(p, conn, onLineStops) {
  const choices = [];
  for (const d of conn.lineDests || []) {
    const c = lineDestChoice(p, conn, d);
    if (c) choices.push(c);
  }
  const effectiveOnLine = stopsBeforeJunction(p, conn, onLineStops);
  for (const d of servedDests(conn, p)) choices.push(connDestChoice(p, conn, d, effectiveOnLine));
  choices.push(...chainDestChoices(p, conn, effectiveOnLine));

  const filtered = collapseOutOfWardChoices(p, applyServiceRanges(p, choices).filter(c => c.effectiveMax > 0));

  // Deduplicate choices with the same effectiveMax (cap makes them equivalent).
  // Keep the last (connection destination) when a lineDests and connection dest collide,
  // since connection destinations have richer routing (express, through-running).
  // When multiple entries collapse, label as "Nearest & beyond" to indicate a group.
  const grouped = new Map();
  for (const c of filtered) {
    if (!grouped.has(c.effectiveMax)) grouped.set(c.effectiveMax, []);
    grouped.get(c.effectiveMax).push(c);
  }
  const mergeGroup = group => {
    if (group.length <= 1) return group;
    // Only a cap makes rides equivalent: two that really end at that count are different trips
    if (group.filter(c => c._fullMax === c.effectiveMax).length > 1) return group;
    // Don't merge destinations with different services — they represent different trains
    const svcKey = c => c._services ? c._services.slice().sort().join(',') : '';
    if (!group.every(c => svcKey(c) === svcKey(group[0]))) return group;
    const kept = group[group.length - 1];
    const nearest = group[0];
    return [{ ...kept,
      name: nearest.name + ' & beyond', ja: nearest.ja.replace(/方面$/, '') + '〜' }];
  };
  // Keep board order: unmerged choices stay in place, a merged one takes its group's first slot
  const mergedOf = new Map([...grouped.values()].map(g => [g, mergeGroup(g)]));
  const unique = filtered.flatMap(c => {
    const group = grouped.get(c.effectiveMax), out = mergedOf.get(group);
    return out === group ? [c] : c === group[0] ? out : [];
  });

  if (unique.length <= 1) {
    if (unique.length === 1) {
      unique[0].onSelect();
    } else {
      // No valid choices — set connection for full range
      state.selectedConnection = conn;
    }
    return false;
  }
  return showBranchPickerUI(p, unique, conn.express && conn.express.some(e => e.stops !== null), 'destination');
}

// Merge destinations from multiple connections into a flat picker.
// Used when terminus connections to different target lines all have destinations
// (e.g. Meguro → Hiyoshi / Shin-Yokohama / Ebina / Shonandai).
function showMergedDestinationPicker(p, conns, onLineStops) {
  const choices = [];
  const seenNames = new Set();

  for (let ci = 0; ci < conns.length; ci++) {
    const conn = conns[ci];
    // lineDests (within-line short-turns, deduplicated across connections)
    for (const d of conn.lineDests || []) {
      if (seenNames.has(d.name)) continue;
      const c = lineDestChoice(p, conn, d);
      if (!c) continue;
      seenNames.add(d.name);
      choices.push(c);
    }
    // destinations (through-running to target line)
    if (conn.destinations) {
      const effectiveOnLine = stopsBeforeJunction(p, conn, onLineStops);
      for (const d of servedDests(conn, p)) {
        if (seenNames.has(d.name)) continue;
        seenNames.add(d.name);
        choices.push({ ...connDestChoice(p, conn, d, effectiveOnLine), _isConnDest: true, _connIdx: ci });
      }
    }
  }

  const filtered = collapseOutOfWardChoices(p, applyServiceRanges(p, choices).filter(c => c.effectiveMax > 0));

  if (filtered.length <= 1) {
    if (filtered.length === 1) {
      filtered[0].onSelect();
    } else {
      state.selectedConnection = conns[0];
    }
    return false;
  }
  // Auto-select when all choices have the same effectiveMax and routing is
  // equivalent: either all are lineDests (same line), or the cap keeps the
  // route entirely on the source line (can't reach any junction).
  const allSameMax = filtered.every(c => c.effectiveMax === filtered[0].effectiveMax);
  const allLineDests = filtered.every(c => !c._isConnDest);
  const withinSourceLine = filtered[0].effectiveMax <= capStops(onLineStops);
  if (allSameMax && (allLineDests || withinSourceLine)) {
    filtered[filtered.length - 1].onSelect();
    return false;
  }
  return showBranchPickerUI(p, filtered, !!EXPRESS_SERVICES[p.lineName] || conns.some(c => c.express && c.express.some(e => e.stops !== null)), 'destination');
}

// Shared UI for branch/connection picker buttons
function showBranchPickerUI(p, choices, hasExpress, pickerType) {
  state._pickerType = pickerType || 'branch';
  state._pickerArgs = [p, choices, hasExpress, pickerType]; // for the language refresher
  showTrainTypeUI();
  dom.trainTypeRow.innerHTML = choices.map((c, i) => {
    const fullWidth = i === 0 && choices.length % 2 === 1 && choices.length >= 3 ? 'flex:1 1 100%;min-width:100%;' : '';
    const stopLabel = hasExpress ? '' : ` · ${c.effectiveMax > 0 ? '1\u2013' + c.effectiveMax : '\u2014'}`;
    return `<button class="train-type-btn" style="background:${c.color};${pillTextStyle(c.color)}${fullWidth}"
      ${c.effectiveMax === 0 ? ' disabled' : ''}>
      ${currentLang === 'ja'
        ? `${c.ja}<small>${c.name}${stopLabel}</small>`
        : `${c.name}<small>${c.ja}${stopLabel}</small>`}
    </button>`;
  }).join('');

  dom.trainTypeRow.querySelectorAll('.train-type-btn').forEach((btn, i) => {
    btn.onclick = () => {
      const result = choices[i].onSelect();
      if (result === 'subpicker') return; // saved once the sub-picker is answered
      saveSession(); // keep the answer in midRound
      dom.trainTypeRow.querySelectorAll('.train-type-btn').forEach(b => b.disabled = true);
      // After branch/destination/connection selection, check for further pickers
      // (e.g. Nambu Line: branch → destination → train type)
      if (showBranchButtons(p)) return;
      if (!showTrainTypeButtons(p)) {
        const ei = state.selectedTrainType?.expressIndices || null;
        const effectiveMax = getEffectiveStops(p, { ei }).validCount;
        dom.stopsRangeText.textContent = t('rollingStops', { dest: destLabel(), max: effectiveMax, s: pl(effectiveMax) });
        dom.rollStopsBtn.disabled = false;
        resetStopsBtn();
        // Players roll right away; debug.js game.journey pauses here to force the roll
        if (!window._pauseAfterPick) rollStops();
      }
    };
  });

  dom.stopsRangeText.textContent = t('selectBranch');
  return true;
}
