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
// A destination's `services`: names, or { name, schedule } for a type that ends there only at some hours (one
// 急行 a day to 本厚木); the names allowed now (null: no list, every type)
const svcNames = services => services ? services.filter(s => typeof s === 'string' || scheduleActive(s.schedule)).map(s => typeof s === 'string' ? s : s.name) : null;
const destRunsAt = (d, ja) => scheduleActive(d.schedule) && scheduleActive(d.boardSchedule?.[ja]);

// A connection with express entries runs through from station fromIdx only while one of them runs now and calls
// there (an entry naming no source-line stop but the junction describes the target line: it boards everywhere)
function throughRunsHere(conn, lineIdx, direction, fromIdx) {
  if (!conn.express) return true;
  const src = state.lines[lineIdx], here = src.stations[fromIdx], tgt = state.lines[conn.toLineIdx];
  return conn.express.some(e => {
    const st = resolveServiceStops(e, tgt, direction);
    if (st === null) return true;
    const ss = new Set(st.map(normalize));
    return st.length > 0 && !noBoardAt(e, here) && (stopSetHas(ss, here) || !src.stations.some((x, i) => i !== conn.fromJunctionIdx && stopSetHas(ss, x)));
  });
}

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
  // ...and only while a through train runs from here (伊東's four through 普通)
  if (!throughRunsHere(conn, lineIdx, direction, fromIdx)) return false;
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

// A connection's local-class entries: `stops: null` ones, and a 'Local' with a stops list (its
// through locals board at those stations only: Keikyu 普通 run on to the Asakusa Line from 品川)
const isLocalEntry = e => e.stops === null || normalize(e.name) === 'local';
// An entry boards where it calls except at its `noBoard` stations (JA), where the board shows the
// train under another name (Keikyu's 品川 board calls the Haneda 急行 快速 / 特急 / 快特 / 普通)
const noBoardAt = (e, station) => !!e.noBoard && stopSetHas(new Set(e.noBoard.map(normalize)), station);
// A connection with express entries lists its through trains: the source line's own Local runs
// on only when one of them is a Local (none on Tobu → Hanzomon: only 急行 / 準急 run through).
// With `station` (a station object), one calling there and running now (none at 鮫洲, where the
// Keikyu → Asakusa 普通 entry starts at 品川; the Asakusa → Keikyu one runs at 23h only)
function localRunsThrough(conn, station) {
  if (!conn.express) return true;
  const locals = conn.express.filter(isLocalEntry);
  if (!station) return locals.length > 0;
  return locals.some(e => scheduleActive(e.schedule) && (e.stops === null || stopSetHas(new Set(e.stops.map(normalize)), station)));
}
// The station a ride over `conn` comes onto its target line at
const enteredAt = conn => state.lines[conn.toLineIdx]?.stations[conn.toJunctionIdx];
// How a ride over prevConn calling at `set` (normalized names; null = every station) runs on
// prevConn's target line up to where nextConn leaves it: the stations strictly between the two
// junctions (`range`) and those among them it calls at (`calls`); null when `set` names none of
// them (the entry ridden says nothing about that stretch). An entry of nextConn continues the
// train only when its own stops there agree: a 三崎口 特急 calling at 横浜 is not the Haneda 特急
// that runs on as 快速, while the エアポート快特 that skips 京急蒲田 is the one anchored at 品川
function rideOnLine(prevConn, set, nextConn) {
  const line = state.lines[prevConn.toLineIdx];
  if (!line || nextConn.fromLineIdx !== prevConn.toLineIdx) return null;
  const a = prevConn.toJunctionIdx, b = nextConn.fromJunctionIdx;
  const range = line.stations.slice(Math.min(a, b) + 1, Math.max(a, b));
  const calls = set === null ? range : range.filter(st => stopSetHas(set, st));
  return calls.length ? { range, calls, fwd: a < b } : null;
}
// The express entries of hop `conn` that continue a train named `name` on conn's source
// line and run now: one per distinct onward name and stop list (a Local entry continues
// it at every station). `fromLine`: the line the train came onto conn's source line from; an
// entry with `chainFrom` continues trains from those lines only (the Haneda 特急 that run on
// as 快速 came off the Airport Line; `[]`: boarded here only). `ride` (rideOnLine): how the
// train runs on conn's source line; an entry naming stops on that stretch continues it only
// when, from its first stop there on, they are the train's stations (one anchored at the
// junction, or at a station the train has passed, says nothing about the stretch before)
const namesTrain = (conn, name) => (conn.express || []).some(e => normalize(e.name) === normalize(name));
// An entry's `until` (JA): its trains end at that station, on its target line or one further along
// the chain (the Sat/hol evening Haneda 快特 end at 京成高砂): the chain takes no hop off that line and
// the ride stops there. Index of `until` on line lineIdx, -1 when it isn't there (or no until)
function untilIdxOn(lineIdx, until) {
  const line = until && state.lines[lineIdx];
  return line ? line.stations.findIndex(s => stopSetHas(new Set([normalize(until)]), s)) : -1;
}
// Whether a ride over conn can reach station `until`: on its target line, or past it over the
// far-terminus and mid-line hops. A train with an `until` takes only such hops at a fork (the
// Keisei 快速 that run on as 特急 to Haneda turn off at 京急蒲田, not on to 三崎口)
function leadsTo(conn, until, seen = new Set()) {
  if (untilIdxOn(conn.toLineIdx, until) >= 0) return true;
  const toLine = state.lines[conn.toLineIdx];
  if (!toLine || seen.has(conn)) return false;
  seen.add(conn);
  const farIdx = dirEnd(toLine.stations.length, conn.toDir);
  return [...state.connections.filter(c => c.fromLineIdx === conn.toLineIdx && c.fromJunctionIdx === farIdx), ...getMidLineOnward(conn)]
    .some(c => leadsTo(c, until, seen));
}
function continuingEntries(conn, name, ride, fromLine) {
  const line = state.lines[conn.toLineIdx];
  const seen = new Set(), out = [];
  for (const e of conn.express || []) {
    if (normalize(e.name) !== normalize(name)) continue;
    if (e.chainFrom && fromLine && !e.chainFrom.includes(fromLine)) continue;
    // (a Local entry resolves to null, or [] when its hours hide it now)
    const stops = line ? resolveServiceStops(e, line, conn.fromDir) : e.stops;
    if (stops && stops.length === 0) continue; // hidden now
    if (stops && ride) {
      const ss = new Set(stops.map(normalize));
      const calls = ride.range.filter(st => stopSetHas(ss, st));
      if (calls.length) {
        const first = ride.range.indexOf(ride.fwd ? calls[0] : calls[calls.length - 1]);
        const covered = ride.fwd ? ride.range.slice(first) : ride.range.slice(0, first + 1);
        const mine = ride.calls.filter(st => covered.includes(st));
        if (mine.length !== calls.length || mine.some((st, i) => st !== calls[i])) continue;
      }
    }
    const key = normalize(e.toName || e.name) + '|' + (stops ? stops.join(',') : '*');
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(e);
  }
  return out;
}

// The names a first-hop express entry (of connection `from`) can carry onto the source line of
// the last of `hops` (connections ridden after `from` in order), following continuing entries;
// a hop with no express keeps the name. Empty when a hop with express has no continuing entry
// (the train does not run on). A Local entry rides every hop as is.
function namesAlongHops(ex, hops, from) {
  // Each train: its name on the next hop's source line, the connection it rode last and the
  // stops it has called at (null: every station)
  // (a train whose `until` lies on the line it rode last ends there: it rides no further hop)
  const ends = t => t.until && t.prev && untilIdxOn(t.prev.toLineIdx, t.until) >= 0;
  const away = (t, c) => !!t.until && !leadsTo(c, t.until);
  let trains = [{ name: ex.toName || ex.name, prev: from, until: ex.until || null, set: ex.stops === null ? null : new Set(ex.stops.map(normalize)) }];
  for (let i = 0; i < hops.length - 1 && trains.length; i++) {
    trains = trains.filter(t => !ends(t) && !away(t, hops[i]));
    if (!hops[i].express || ex.stops === null) continue;
    trains = trains.flatMap(t => continuingEntries(hops[i], t.name, t.prev && rideOnLine(t.prev, t.set, hops[i]), t.prev && t.prev.from).map(e => ({
      name: e.toName || e.name, prev: hops[i], until: t.until || e.until || null, set: e.stops === null ? null : new Set([...(t.set || []), ...e.stops.map(normalize)]) })));
  }
  return [...new Set(trains.filter(t => !ends(t) && !(hops.length && away(t, hops[hops.length - 1]))).map(t => t.name))];
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
    if (noBoardAt(ex, here)) continue;
    // Target line express indices
    let targetIndices = [];
    for (let i = 0; i < targetLine.stations.length; i++) {
      if (stopSetHas(joinedNames, targetLine.stations[i])) targetIndices.push(i);
    }
    // A train ending on the target line (`until`) calls nowhere past it
    const u0 = connObj ? untilIdxOn(targetLineIdx, ex.until) : -1;
    if (u0 >= 0) targetIndices = targetIndices.filter(i => (i - u0) * dirStep(connObj.toDir) <= 0);
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
      const extend = (chainConn, visited, name, stops, hops, conns, names, max, until) => {
        // A train ending on chainConn's target line (its `until`) takes no hop off it
        const ui = untilIdxOn(chainConn.toLineIdx, until);
        if (ui >= 0) {
          chains.push({ stops: stops || new Set(resolvedStops.map(x => normalize(x))), hops, conns, names: [...names, name], max,
            untilAt: { lineIdx: chainConn.toLineIdx, idx: ui } });
          return;
        }
        const onward = getOnwardConnections(chainConn).filter(c => !visited.has(c.to));
        // Prefer the hop a picked chained destination names (as nextChainConn does)
        const destHops = state.selectedDestination?.chain;
        const ordered0 = destHops ? [...onward.filter(c => chainNames(destHops, c)), ...onward.filter(c => !chainNames(destHops, c))] : onward;
        // (a train bound for `until` takes only the hops toward it)
        const ordered = until ? ordered0.filter(c => leadsTo(c, until)) : ordered0;
        // The hop the train takes: the first onward connection with an entry of its name running
        // now; else a hop without express carries it on at every station, name unchanged; else
        // (every hop names its through trains and none runs this one now) it does not run through
        // and the chain set yields no stop past the junction
        const cur = stops || new Set(resolvedStops.map(x => normalize(x)));
        const conts0f = c => continuingEntries(c, name, rideOnLine(chainConn, cur, c), chainConn.from);
        let nextConn = ordered.find(c => conts0f(c).length);
        let conts = nextConn ? conts0f(nextConn) : null;
        let implicit = false;
        if (!nextConn && !ordered.some(c => namesTrain(c, name))) {
          nextConn = ordered.find(c => !c.express);
          if (nextConn) { conts = [{ stops: null, name }]; implicit = true; }
        }
        if (nextConn) {
          const nextLine = state.lines[nextConn.toLineIdx];
          for (const nextEx of conts) {
            // The chain stops set: the first hop's schedule-resolved stops, then each hop's (a Local
            // continuation calls at every station of its line)
            const s = new Set(stops || resolvedStops.map(x => normalize(x)));
            const add = nextEx.stops === null ? (nextLine ? nextLine.stations.map(x => x.ja) : [])
              : nextLine ? resolveServiceStops(nextEx, nextLine, nextConn.fromDir) : nextEx.stops;
            add.forEach(x => s.add(normalize(x)));
            let m = max;
            const until2 = until || nextEx.until || null, ui2 = untilIdxOn(nextConn.toLineIdx, until2);
            // (a train ending where it enters the line, over via stations, rides those: 熱海 → 上野)
            if (ui2 >= 0 && ui2 === nextConn.toJunctionIdx) m += nextConn.viaStations?.length || 0;
            if (nextLine) {
              const step = dirStep(nextConn.toDir);
              for (let k = nextConn.toJunctionIdx + step; k >= 0 && k < nextLine.stations.length; k += step) {
                if (nextConn.toUntilIdx >= 0 && (step === 1 ? k > nextConn.toUntilIdx : k < nextConn.toUntilIdx)) break;
                if (ui2 >= 0 && (k - ui2) * step > 0) break;
                if (stopSetHas(s, nextLine.stations[k])) m++;
              }
            }
            // implicit: a hop without express ridden at every station (no entry named the train)
            extend(nextConn, new Set([...visited, nextConn.to]), nextEx.toName || nextEx.name, s,
              [...hops, { to: nextConn.to, toDir: nextConn.toDir, implicit }], [...conns, nextConn], [...names, name], m, until2);
          }
          return;
        }
        // Onward hops that all name their through trains without this one: a dead end (the chain
        // set, non-null, yields no stop past the junction); no onward hop: the ride simply ends
        chains.push({ stops: ordered0.length ? stops || new Set(resolvedStops.map(x => normalize(x))) : stops, hops, conns, names: [...names, name], max });
      };
      extend(connObj, new Set([connObj.from, connObj.to]), curName, null, [], [connObj], [ex.name], totalMax, ex.until || null);
      for (const ch of chains) {
        const entry = { ...ex, expressIndices: targetIndices.length > 0 ? targetIndices : null, _connTargetLineIdx: targetLineIdx, _connTotalMax: ch.max,
          _connIdx: state.connections.indexOf(connObj), _hopConns: ch.conns, _hopNames: ch.names };
        if (ch.untilAt) entry._untilAt = ch.untilAt;
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
