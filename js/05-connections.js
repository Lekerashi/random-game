'use strict';

// ── Connection Resolution ─────────────────────────────────────────────────
// Resolves LINE_CONNECTIONS into runtime objects with line/station references.
// Called once from buildIndex after the station index is built.
function resolveConnections() {
  state.connections = [];
  state._connectionWarnings = [];
  if (typeof LINE_CONNECTIONS === 'undefined') return;
  const warn = (conn, field, value, reason) => {
    const label = (conn.from || '?') + ' → ' + (conn.to || '?');
    state._connectionWarnings.push({ conn: label, field, value, reason });
    console.warn(`[CONNECTION] ${reason}: ${field}="${value}" in ${label}`);
  };

  for (const conn of LINE_CONNECTIONS) {
    // Collect all matching lines (handles same-name segments like JR Hachiko Line).
    // fromLineHas/toLineHas (JA) pick the segment that contains that station.
    const hasStation = (l, ja) => !ja || l.stations.some(s => s.ja === ja);
    const fromMatches = [];
    const toMatches = [];
    state.lines.forEach((l, i) => {
      if (l.name === conn.from && hasStation(l, conn.fromLineHas)) fromMatches.push({ line: l, idx: i });
      if (l.name === conn.to && hasStation(l, conn.toLineHas)) toMatches.push({ line: l, idx: i });
    });
    if (fromMatches.length === 0 || toMatches.length === 0) {
      if (fromMatches.length === 0) warn(conn, 'from', conn.from, 'line not found');
      if (toMatches.length === 0) warn(conn, 'to', conn.to, 'line not found');
      continue;
    }

    for (const fromMatch of fromMatches) {
    for (const toMatch of toMatches) {
    const fromLine = fromMatch.line, fromLineIdx = fromMatch.idx;
    const toLine = toMatch.line, toLineIdx = toMatch.idx;

    // Resolve the junction station on the source line
    let fromJunctionIdx = -1;
    if (conn.fromEnd) {
      fromJunctionIdx = fromLine.stations.findIndex(s => s.ja === conn.fromEnd);
    } else if (conn.fromStation) {
      fromJunctionIdx = fromLine.stations.findIndex(s => s.ja === conn.fromStation);
    }

    // Resolve the junction station on the target line
    let toJunctionIdx = -1;
    if (conn.toEnd) {
      toJunctionIdx = toLine.stations.findIndex(s => s.ja === conn.toEnd);
    } else if (conn.toStation) {
      toJunctionIdx = toLine.stations.findIndex(s => s.ja === conn.toStation);
    }

    if (fromJunctionIdx === -1 || toJunctionIdx === -1) {
      if (fromJunctionIdx === -1) warn(conn, conn.fromEnd ? 'fromEnd' : 'fromStation', conn.fromEnd || conn.fromStation || '(none)', 'junction not found on source line');
      if (toJunctionIdx === -1) warn(conn, conn.toEnd ? 'toEnd' : 'toStation', conn.toEnd || conn.toStation || '(none)', 'junction not found on target line');
      continue;
    }

    // Determine which direction the source line approaches the junction from
    // 'start' means the junction is at index 0 (or near start), 'end' means at N-1
    const fromDir = conn.fromDir || (fromJunctionIdx === 0 ? 'start' : fromJunctionIdx === fromLine.stations.length - 1 ? 'end' : null);

    // Determine which direction to travel on the target line from the junction
    let toDir = conn.toDir || null;
    if (!toDir) {
      if (toJunctionIdx === 0) toDir = 'end';
      else if (toJunctionIdx === toLine.stations.length - 1) toDir = 'start';
      else { warn(conn, 'toDir', '(none)', 'mid-line target junction needs toDir'); continue; }
    }

    // Resolve via stations (intermediate stations between lines)
    const viaStations = [];
    if (conn.via) {
      for (const ja of conn.via) {
        let found = false;
        // The target junction as a via is the target line's own station (Tokyo on Tokaido)
        if (toLine.stations[toJunctionIdx].ja === ja) { viaStations.push(toLine.stations[toJunctionIdx]); continue; }
        for (const l of state.lines) {
          const s = l.stations.find(st => st.ja === ja);
          if (s) { viaStations.push(s); found = true; break; }
        }
        if (!found) warn(conn, 'via', ja, 'via station not found');
      }
    }

    // Resolve destinations (find target station indices for each until)
    let destinations = null;
    if (conn.destinations) {
      destinations = conn.destinations.map(d => {
        const untilIdx = toLine.stations.findIndex(s => s.ja === d.until);
        if (untilIdx === -1) warn(conn, 'destinations.until', d.until, 'destination not found on target line');
        return { ...d, untilIdx };
      }).filter(d => d.untilIdx !== -1);
      // No destination resolved: a picker would have zero buttons. An empty list is deliberate:
      // the connection's only destinations are chained ones (Narita Airport → Narita → Sobu)
      if (destinations.length === 0 && conn.destinations.length > 0) continue;
    }

    // Express services spanning both lines (stop indices are computed at platform time)
    const express = conn.express || null;

    // boardFrom: the connection is only offered from this source station onward
    let boardFromIdx = -1;
    if (conn.boardFrom) {
      boardFromIdx = fromLine.stations.findIndex(s => s.ja === conn.boardFrom);
      if (boardFromIdx === -1) warn(conn, 'boardFrom', conn.boardFrom, 'boardFrom station not found on source line');
    }

    let toUntilIdx = -1;
    if (conn.toUntil) {
      toUntilIdx = toLine.stations.findIndex(s => s.ja === conn.toUntil);
      if (toUntilIdx === -1) warn(conn, 'toUntil', conn.toUntil, 'toUntil station not found on target line');
    }

    // Connection type (see data-connections.js cheatsheet):
    //  'transparent'  — no picker, auto-extends route
    //  'destination'  — destination picker shown
    //  'express-only' — only express services differ (no destination choice)
    //  'named'        — has name/color for branch picker when grouped with others
    const _type = destinations ? 'destination'
      : conn.name ? 'named'
      : express ? 'express-only'
      : 'transparent';
    state.connections.push({
      from: conn.from, fromLineIdx, fromJunctionIdx, fromDir,
      to: conn.to, toLineIdx, toJunctionIdx, toDir,
      viaStations, _type,
      name: conn.name, ja: conn.ja, color: conn.color,
      displayName: conn.displayName,
      toUntilIdx, boardFromIdx, destinations, express,
      lineDests: conn.lineDests || null,
      impliedLines: conn.impliedLines || null,
      chainFrom: conn.chainFrom || null,
      boardAtJunction: !!conn.boardAtJunction,
    });
    } // end toMatch loop
    } // end fromMatch loop
  }
  if (state._connectionWarnings.length > 0) {
    console.warn(`[CONNECTION] ${state._connectionWarnings.length} warning(s) during resolution`);
  }
}

// First station a ride over conn reaches after its source-line junction
function connFirstStop(c) {
  if (c.viaStations.length) return c.viaStations[0];
  return state.lines[c.toLineIdx].stations[c.toJunctionIdx + dirStep(c.toDir)] || null;
}

// Destination d runs now for riders boarding at station ja (schedule + boardSchedule)
const destRunsAt = (d, ja) => scheduleActive(d.schedule) && scheduleActive(d.boardSchedule?.[ja]);

// Whether a through-running chain past conn (none of whose own destinations runs now)
// still has a train: an onward connection (far-terminus hops, and the mid-line hops
// chained pickers offer) whose destination runs, or one with no destinations at all (a
// plain hop such as Toyoko → Minato Mirai), recursively with a cycle guard. Mirrors
// chainDestChoices: chainFrom limits the boarding line, and when conn's destinations
// declare `services`, only chained destinations with their own `services` are offered.
function chainRunsNow(conn, lineIdx, direction, fromIdx) {
  // The chained choices the destination picker would offer from this platform
  const p = { lineName: state.lines[lineIdx].name, lineIdx, direction, fromIdx, maxStops: Infinity, lineColor: null };
  if (chainDestChoices(p, conn, 0).length > 0) return true;
  // No chained destination, but a plain onward hop (no destinations) carries the full ride,
  // unless conn's own destinations declare `services` (then nothing undeclared is offered)
  if (conn.destinations.some(d => d.services)) return false;
  const plainHop = (c, visited) => getOnwardConnections(c).some(n => !visited.has(n.to)
    && (!n.chainFrom || n.chainFrom.includes(p.lineName))
    && (!n.destinations?.length || plainHop(n, new Set([...visited, n.to]))));
  return plainHop(conn, new Set([conn.from, conn.to]));
}

// Get connections from a line at a given terminus direction.
// Returns connections where the source line terminus matches.
// direction: the platform direction ('start' or 'end')
// fromIdx: the station index we're standing at
function getConnections(lineName, lineIdx, direction, fromIdx) {
  const line = state.lines[lineIdx];
  const N = line.stations.length;
  const terminusIdx = dirEnd(N, direction);
  return state.connections.filter(c => {
    // Match by index: same-name segments (JR Hachiko Line) are different lines
    if (c.fromLineIdx !== lineIdx) return false;
    if (c.fromDir && c.fromDir !== direction) return false;
    // boardFrom: only stations from there toward the junction
    if (c.boardFromIdx >= 0 && (fromIdx - c.boardFromIdx) * dirStep(direction) < 0) return false;
    // ...and not at a terminus junction unless it is the boardFrom station (芝山千代田 →
    // 京成上野 trains: at 東成田 the Higashi-Narita Line platform carries them)
    if (c.boardFromIdx >= 0 && c.boardFromIdx !== fromIdx && c.fromJunctionIdx === fromIdx && fromIdx === terminusIdx) return false;
    // No train runs it now: every destination is off-hours (or not boarded here), no
    // real short-turn choice is left (a lineDest to the line's own end is the plain ride)
    // and nothing on its onward chain runs either (Fukutoshin → Toyoko trains end on the
    // Minato Mirai / Sotetsu chain, not on the Toyoko itself); a chained-only connection
    // (destinations: []) is offered only while its chain runs
    if (c.destinations && c.destinations.every(d => !destRunsAt(d, line.stations[fromIdx]?.ja))
        && (c.lineDests || []).every(ld => ld.until === line.stations[terminusIdx].ja || !scheduleActive(ld.schedule))
        && !chainRunsNow(c, lineIdx, direction, fromIdx)) return false;
    // Terminus junction: must be at the end of the line in our direction
    if (c.fromJunctionIdx === terminusIdx) return true;
    // Mid-line junction: must be ahead of us in the travel direction, or here when
    // the ride runs straight onto the via stations (boardAtJunction: 曳舟 → 押上)
    if (c.boardAtJunction && c.fromJunctionIdx === fromIdx) return true;
    if (direction === 'start' && c.fromJunctionIdx < fromIdx) return true;
    if (direction === 'end' && c.fromJunctionIdx > fromIdx) return true;
    return false;
  });
}

// Count how many stops on the target line from the junction
function getConnectionMaxStops(conn) {
  const toLine = state.lines[conn.toLineIdx];
  const N = toLine.stations.length;
  const jIdx = conn.toJunctionIdx;
  const step = dirStep(conn.toDir);
  const stopsToEnd = Math.abs(jIdx - dirEnd(N, conn.toDir));
  const limit = conn.toUntilIdx >= 0 ? Math.abs(conn.toUntilIdx - jIdx) : stopsToEnd;
  let count = Math.min(stopsToEnd, limit);
  if (state.wards23Only) count = Math.min(count, wardMaxStops(toLine, jIdx, step));
  return count;
}

// Get stations along the target line from a connection junction
function getConnectionStations(conn, maxStops) {
  const toLine = state.lines[conn.toLineIdx];
  const N = toLine.stations.length;
  const result = [];
  const step = dirStep(conn.toDir);
  for (let i = 1; i <= maxStops; i++) {
    const idx = conn.toJunctionIdx + step * i;
    if (idx < 0 || idx >= N) break;
    // Stop at toUntilIdx if set (inclusive — include the until station)
    if (conn.toUntilIdx >= 0) {
      if (step === 1 && idx > conn.toUntilIdx) break;
      if (step === -1 && idx < conn.toUntilIdx) break;
    }
    result.push(toLine.stations[idx]);
  }
  return result;
}

// Count effective via stations (skip any matching the starting station name)
function effectiveViaCount(conn, startStationName) {
  const vias = conn.viaStations.filter(v => v.name !== startStationName);
  if (!state.wards23Only) return vias.length;
  // In 23-wards mode, count only consecutive via stations within the wards
  let count = 0;
  for (const v of vias) {
    if (!isIn23Wards(v.lat, v.lng)) break;
    count++;
  }
  return count;
}

// Find onward connections from a connection's target line far terminus.
// Used for chained through-running (e.g. Seibu → Fukutoshin → Toyoko).
// Far-terminus hops are dropped when the connection has a toUntil limit
// (chain stops there). Mid-line hops on the target line join only when the
// picked destination's chain names them (e.g. Keio Sagamihara → Keio Line →
// Toei Shinjuku at Sasazuka).
function getOnwardConnections(conn) {
  const toLine = state.lines[conn.toLineIdx];
  if (!toLine) return [];
  const hops = state.selectedDestination?.chain;
  const mid = hops ? getMidLineOnward(conn).filter(c => chainNames(hops, c)) : [];
  if (conn.toUntilIdx >= 0) return mid;
  const farIdx = dirEnd(toLine.stations.length, conn.toDir);
  return [...state.connections.filter(c =>
    c.fromLineIdx === conn.toLineIdx && c.fromJunctionIdx === farIdx), ...mid];
}

const chainNames = (hops, c) => hops.some(h => h.to === c.to && h.toDir === c.toDir);

// Mid-line connections with destinations that leave conn's target line
// strictly between its junction and its far end (or toUntil), heading the
// same way. Chained destination pickers offer them; rides follow one only
// when the picked destination's chain names it.
function getMidLineOnward(conn) {
  const toLine = state.lines[conn.toLineIdx];
  if (!toLine) return [];
  const step = dirStep(conn.toDir);
  const limitIdx = conn.toUntilIdx >= 0 ? conn.toUntilIdx : dirEnd(toLine.stations.length, conn.toDir);
  return state.connections.filter(c => c.fromLineIdx === conn.toLineIdx && c.fromDir === conn.toDir
    && c.destinations && (c.fromJunctionIdx - conn.toJunctionIdx) * step > 0
    && (limitIdx - c.fromJunctionIdx) * step > 0);
}

// Target-line index where a ride on conn leaves for the mid-line hop next
// (null when next is a far-terminus hop or there is none)
function chainBoundIdx(conn, next) {
  if (!next) return null;
  const N = state.lines[conn.toLineIdx].stations.length;
  return next.fromJunctionIdx === dirEnd(N, conn.toDir) ? null : next.fromJunctionIdx;
}

// Next hop when following a through-running chain past conn: the hop the
// chosen destination needs (selectedDestination.chain, set by chained picks
// like Meguro → Hiyoshi → Shonandai), else the hop a chain express runs on
// (tt._chainHops, e.g. Airport Rapid onto Sky Access), else the first
// onward connection.
function nextChainConn(conn, visited, tt = state.selectedTrainType) {
  const onward = getOnwardConnections(conn).filter(c => !visited.has(c.to));
  const hops = state.selectedDestination?.chain || tt?._chainHops;
  return (hops && onward.find(c => chainNames(hops, c))) || onward[0] || null;
}

// Compute max additional stops available through terminus connections.
// Follows chained connections recursively (with cycle detection).
function computeConnectionExtra(connections, stationName, visited) {
  if (!visited) visited = new Set();
  let extra = 0;
  for (const conn of connections) {
    if (visited.has(conn.to)) continue;
    const via = effectiveViaCount(conn, stationName);
    const target = getConnectionMaxStops(conn);
    let chainExtra = 0;
    const nextVisited = new Set(visited);
    nextVisited.add(conn.to);
    const onward = getOnwardConnections(conn);
    if (onward.length > 0) {
      chainExtra = computeConnectionExtra(onward, '', nextVisited);
    }
    extra = Math.max(extra, via + target + chainExtra);
  }
  return extra;
}

// The express entries of hop `conn` that continue a train named `name` on conn's source
// line and run now: one per distinct onward name and stop list (a Local entry continues
// it at every station). `firstName`: the train's boarding-line name, which a `chainName`
// on the entry may still name (older data).
const namesTrain = (conn, name, firstName) => (conn.express || []).some(e => normalize(e.name) === normalize(name)
  || (e.chainName && normalize(e.chainName) === normalize(firstName)));
function continuingEntries(conn, name, firstName) {
  const line = state.lines[conn.toLineIdx];
  const seen = new Set(), out = [];
  for (const e of conn.express || []) {
    if (!namesTrain({ express: [e] }, name, firstName)) continue;
    const stops = e.stops === null ? null : line ? resolveServiceStops(e, line, conn.fromDir) : e.stops;
    if (stops && stops.length === 0) continue; // hidden now
    const key = normalize(e.toName || e.name) + '|' + (stops ? stops.join(',') : '*');
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(e);
  }
  return out;
}

// The names a first-hop express entry can carry onto the source line of the last of `hops`
// (connections ridden after conn in order), following continuing entries; a hop with no
// express keeps the name. Empty when a hop with express has no continuing entry (the train
// does not run on).
function namesAlongHops(ex, hops) {
  let names = [ex.toName || ex.name];
  for (let i = 0; i < hops.length - 1 && names.length; i++) {
    if (!hops[i].express || ex.stops === null) continue; // a Local rides the chain as is
    names = [...new Set(names.flatMap(n => continuingEntries(hops[i], n, ex.name).map(e => e.toName || e.name)))];
  }
  return names;
}

// Resolve connection express services to train types with target-line indices.
// Returns array of resolved types ready for the trainTypes list.
//
// Each returned entry extends the raw express definition with routing fields:
//   expressIndices      — stop indices on the target line (null for local)
//   _connTargetLineIdx  — target line index (signals routing to use connection path)
//   _connTotalMax       — total reachable stops: source + via + target (+ chain)
//   _chainExpressStops  — Set<normalized name> for multi-line chain filtering (optional)
//   _srcExpIndices      — source-line express indices for junction routing (optional)
//   _connIdx            — index of the connection in state.connections (same-name grouping)
//   _hopConns / _hopNames — the connections the train rides and its name entering each
//                         (index 0: the boarding line; `toName` renames it at a border)
//
// These fields are read by getStationsAlongRoute, getEffectiveStops, and
// resolveTrainTypes (via trainTypeOpts). The _terminatesAtJunction field is
// set later by resolveTrainTypes for types that can only reach the junction.
function resolveConnectionExpress(connExInfo, platform, line) {
  const { express, targetLineIdx, targetLine, connObj } = connExInfo;
  if (!targetLine) return [];
  const results = [];
  // The platform's own station (differs from currentStation on alias platforms)
  const here = line.stations[platform.fromIdx];
  const currentName = here.name;

  for (const ex of express) {
    // Resolve schedule/direction-aware stops ([] = hidden now; e.g. KT Rapid skips Okachimachi on weekdays)
    const resolvedStops = resolveServiceStops(ex, targetLine, platform.direction);
    if (resolvedStops?.length === 0) continue;
    if (ex.stops === null) {
      // Local service — all stations, no express filtering on target line
      let localMax = connObj
        ? Math.abs(connObj.fromJunctionIdx - platform.fromIdx) + effectiveViaCount(connObj, currentName) + getConnectionMaxStops(connObj)
        : platform.maxStops;
      // Include chain extensions from onward connections
      if (connObj) localMax += computeConnectionExtra(getOnwardConnections(connObj), '', new Set([connObj.to]));
      results.push({ ...ex, expressIndices: null, _connTargetLineIdx: targetLineIdx, _connTotalMax: localMax, _connIdx: state.connections.indexOf(connObj) });
      continue;
    }
    const joinedNames = new Set(resolvedStops.map(s => normalize(s)));
    // Source-line stops of this service
    const srcEi = [];
    if (connObj) {
      for (let i = 0; i < line.stations.length; i++) {
        if (stopSetHas(joinedNames, line.stations[i])) srcEi.push(i);
      }
    }
    // The service must call at this station. Exception: a terminus connection
    // whose list names no source-line stop besides the junction (it only
    // describes the target line, so every source station feeds it).
    const isTerminusConn = connObj && connObj.fromJunctionIdx === dirEnd(line.stations.length, platform.direction);
    const anchoredOnSource = srcEi.some(i => i !== connObj.fromJunctionIdx);
    if ((!isTerminusConn || anchoredOnSource) && !stopSetHas(joinedNames, here)) continue;
    // Target line express indices
    const targetIndices = [];
    for (let i = 0; i < targetLine.stations.length; i++) {
      if (stopSetHas(joinedNames, targetLine.stations[i])) targetIndices.push(i);
    }
    // Compute total max: source-line express to junction + target express from junction
    let totalMax = platform.maxStops; // fallback
    const curName = ex.toName || ex.name;
    if (connObj) {
      const pos = srcEi.indexOf(platform.fromIdx);
      let srcExpStops = Math.abs(connObj.fromJunctionIdx - platform.fromIdx); // fallback to raw
      if (pos !== -1) {
        srcExpStops = 0;
        const step = dirStep(platform.direction);
        for (let i = pos + step; i >= 0 && i < srcEi.length; i += step) {
          if ((srcEi[i] - connObj.fromJunctionIdx) * step > 0) break;
          srcExpStops++;
        }
      }
      const tgtExpStops = targetIndices.length > 0
        ? getExpressMaxStops({ fromIdx: connObj.toJunctionIdx, direction: connObj.toDir, lineIdx: targetLineIdx, passThrough: true }, targetIndices)
        : getConnectionMaxStops(connObj);
      const viaCount = effectiveViaCount(connObj, currentName);
      totalMax = srcExpStops + viaCount + tgtExpStops;

      // Follow chain: merge express stops from onward connections the train runs on
      // under its current name, hop by hop (an entry continues it when its `name` is the
      // name the train carries onto that hop's source line: the previous entry's
      // `toName || name`, so a train may rename at every border, e.g. Toyoko 特急 →
      // Fukutoshin 急行 → Seibu 快速急行). The hops are kept in _chainHops so routing
      // follows the same connections; _hopConns / _hopNames record the name on each
      // hop's source line (index 0: the boarding line), for destination `services`.
      // Several continuations of one name (a Fukutoshin 普通 runs on as Seibu 各停 or 準急) fork
      // into rides of their own: same button, one member each
      const chains = [];
      const extend = (chainConn, visited, name, stops, hops, conns, names, max) => {
        const onward = getOnwardConnections(chainConn).filter(c => !visited.has(c.to));
        // Prefer the hop a picked chained destination names (as nextChainConn does)
        const destHops = state.selectedDestination?.chain;
        const ordered = destHops ? [...onward.filter(c => chainNames(destHops, c)), ...onward.filter(c => !chainNames(destHops, c))] : onward;
        for (const nextConn of ordered) {
          const conts = continuingEntries(nextConn, name, ex.name);
          if (!conts.length) {
            // The hop names the train but none of its entries runs now: it does not run through
            // (the chain set then yields no stop past the junction); an unnamed hop carries it on
            if (namesTrain(nextConn, name, ex.name)) { chains.push({ stops: stops || new Set(resolvedStops.map(x => normalize(x))), hops, conns, names: [...names, name], max }); return; }
            continue;
          }
          const nextLine = state.lines[nextConn.toLineIdx];
          for (const nextEx of conts) {
            // The chain stops set: the first hop's schedule-resolved stops, then each hop's (a Local
            // continuation calls at every station of its line)
            const s = new Set(stops || resolvedStops.map(x => normalize(x)));
            const add = nextEx.stops === null ? (nextLine ? nextLine.stations.map(x => x.ja) : [])
              : nextLine ? resolveServiceStops(nextEx, nextLine, nextConn.fromDir) : nextEx.stops;
            add.forEach(x => s.add(normalize(x)));
            let m = max;
            if (nextLine) {
              const step = dirStep(nextConn.toDir);
              for (let k = nextConn.toJunctionIdx + step; k >= 0 && k < nextLine.stations.length; k += step) {
                if (nextConn.toUntilIdx >= 0 && (step === 1 ? k > nextConn.toUntilIdx : k < nextConn.toUntilIdx)) break;
                if (stopSetHas(s, nextLine.stations[k])) m++;
              }
            }
            extend(nextConn, new Set([...visited, nextConn.to]), nextEx.toName || nextEx.name, s,
              [...hops, { to: nextConn.to, toDir: nextConn.toDir }], [...conns, nextConn], [...names, name], m);
          }
          return; // the first onward connection with a continuation carries the train
        }
        chains.push({ stops, hops, conns, names: [...names, name], max });
      };
      extend(connObj, new Set([connObj.from, connObj.to]), curName, null, [], [connObj], [ex.name], totalMax);
      for (const ch of chains) {
        const entry = { ...ex, expressIndices: targetIndices.length > 0 ? targetIndices : null, _connTargetLineIdx: targetLineIdx, _connTotalMax: ch.max,
          _connIdx: state.connections.indexOf(connObj), _hopConns: ch.conns, _hopNames: ch.names };
        // Attach chain express stops for downstream filtering in getStationsAlongRoute
        if (ch.stops) { entry._chainExpressStops = ch.stops; entry._chainHops = ch.hops; }
        // Attach source-line express indices for routing (e.g. Yokohama Line Rapid)
        if (srcEi.length > 0) entry._srcExpIndices = srcEi;
        results.push(entry);
      }
      continue;
    }
    results.push({ ...ex, expressIndices: targetIndices.length > 0 ? targetIndices : null, _connTargetLineIdx: targetLineIdx, _connTotalMax: totalMax,
      _connIdx: state.connections.indexOf(connObj) });
  }
  return results;
}
