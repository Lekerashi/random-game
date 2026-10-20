'use strict';

// ── Train types ───────────────────────────────────────────────────────────

// Build getEffectiveStops options from a train type descriptor.
// Maps the routing fields set by resolveConnectionExpress into the opts shape
// that getEffectiveStops expects (ei, _connTargetLineIdx, _terminatesAtJunction, _connTotalMax).
function trainTypeOpts(g) {
  return { ei: g.expressIndices, _connTargetLineIdx: g._connTargetLineIdx, _terminatesAtJunction: g._terminatesAtJunction, _connTotalMax: g._connTotalMax, _tt: g };
}

// The name a type carries where destination sd's `services` apply: a chained destination
// names types by its own connection's source line (the last hop of sd.chain), everything
// else by the boarding line. Past the last hop with a continuing entry the name carries
// over (hops without express keep it: Shonan-Shinjuku 快速 onto the Tokaido at 大船). An
// express that rides no connection entries (a line's own type) has no name on a chain.
// Services a chained destination inherits from the first hop are first-hop names.
function typeNameForDest(tt, sd, p = state.selectedPlatform) {
  if (!sd?.chain?.length || sd.servicesFirstHop) return tt.name;
  // A line's own type: an express never rides a chain; a Local does where the first hop's
  // entries (if any) include a Local calling here
  if (!tt._hopConns) return tt.expressIndices || (state.selectedConnection && !localRunsThrough(state.selectedConnection, p && platformStation(p))) ? null : tt.name;
  // Follow the destination's chain (the hops after the first) along the type's hops: the name on
  // a hop is the one the train enters it with. Where the chain leaves the type's hops (a Keikyu
  // 特急 bound for the Asakusa Line, asked about Haneda on the Airport hop) the type carries the
  // name it had on that line; a chain running past the type's hops keeps its final name
  const same = (a, b) => a.to === b.to && a.toDir === b.toDir;
  let m = 0;
  while (m < sd.chain.length && m + 1 < tt._hopConns.length && same(tt._hopConns[m + 1], sd.chain[m])) m++;
  return tt._hopNames[m === sd.chain.length ? m : m + 1];
}

// Whether a (possibly grouped) type is one of destination sd's `services`
function typeMatchesServices(g, sd, p) {
  const allowed = new Set(sd.services.map(s => normalize(s)));
  return (g._members || [g]).some(m => { const n = typeNameForDest(m, sd, p); return n != null && allowed.has(normalize(n)); });
}

// Resolve available train types for a platform, returning grouped/merged types
// with precomputed stop counts. Returns null if no picker needed, or:
//   { autoSelect: type } — single reachable express type (auto-select it)
//   { types: [...] }     — multiple choices for the picker (each has _count, _rawMax)
function resolveTrainTypes(p) {
  const hasLineExpress = !!EXPRESS_SERVICES[p.lineName];
  const conn = state.selectedConnection;
  const connTargetLine = conn ? state.lines[conn.toLineIdx] : null;
  const hasTargetExpress = connTargetLine && !!EXPRESS_SERVICES[conn.to];
  // Collect all connection express services (from selected connection + mid-line connections on platform)
  // Skip when a lineDest was selected (ride stays on source line, connection express is irrelevant)
  const isLineDest = state.selectedDestination?.untilIdx != null;
  const allConnExpress = [];
  if (conn?.express && !isLineDest) allConnExpress.push({ express: conn.express, targetLineIdx: conn.toLineIdx, targetLine: connTargetLine, connObj: conn });
  // Only add mid-line connection express when no branch connection or line destination is selected
  // (if user picked Yokohama branch, don't add Shinagawa branch's express)
  // (if user picked a line destination like Takao, don't add Ome connection express)
  const hasLineDest = !conn && state.selectedDestination;
  if (!conn && !hasLineDest && p._connections) {
    for (const c of p._connections) {
      if (!c.express) continue;
      allConnExpress.push({ express: c.express, targetLineIdx: c.toLineIdx, targetLine: state.lines[c.toLineIdx], connObj: c });
    }
  }
  const hasConnExpress = allConnExpress.length > 0;
  if (!hasLineExpress && !hasConnExpress && !hasTargetExpress) return null;

  const line = state.lines[p.lineIdx];
  let trainTypes = getTrainTypes(p.lineName, platformStation(p).name, line, p.direction) || [];
  // On a picked branch only express types calling somewhere ahead on it run
  // (no Nambu Rapid toward Hama-Kawasaki)
  const bi = state.selectedBranch?.branchIndices, biPos = bi ? bi.indexOf(p.fromIdx) : -1;
  if (biPos !== -1) {
    const ahead = new Set(dirStep(p.direction) > 0 ? bi.slice(biPos + 1) : bi.slice(0, biPos));
    trainTypes = trainTypes.filter(t => !t.expressIndices || t.expressIndices.some(i => ahead.has(i)));
  }
  // Every type the consulted lists declare, before hours/direction/stop filtering. A Local
  // entry of the connection being ridden replaces the line's own Local (below), so the line's
  // doesn't count as declared then (a lone 急行 → 普通 still applies while the connection's
  // through 各停 are off-hours)
  const connLocal = allConnExpress.some(a => a.connObj === conn && a.express.some(isLocalEntry));
  const declared = [...(EXPRESS_SERVICES[p.lineName] || []).filter(t => !(connLocal && t.stops === null)), ...allConnExpress.flatMap(a => a.express)];
  // Add connection express services (e.g. Keikyu Express spanning both lines)
  for (const connExInfo of allConnExpress) {
    trainTypes.push(...resolveConnectionExpress(connExInfo, p, line));
  }
  // Remove source-line services duplicated by connection express (connection version spans both lines)
  const connExpNames = new Set(trainTypes.filter(t => t._connTargetLineIdx != null).map(t => normalize(t.name)));
  // A connection service hidden by today's schedule still replaces its source-line
  // namesake (daytime Odakyu 急行 don't run on to Fujisawa as locals) — on the
  // connection being ridden only (weekday 中央特快 still run to 大月 when the
  // weekend-only Kawaguchiko one is off). So does one that calls at source-line
  // stations but not this one: the namesake boarded here doesn't run onto the
  // target either (no 特急 to 湘南台 from 横浜, only from 西谷)
  const here = line.stations[p.fromIdx];
  for (const a of allConnExpress) for (const e of a.express) {
    if (a.connObj !== conn || !e.stops) continue;
    const stops = resolveServiceStops(e, a.targetLine, p.direction);
    if (stops.length === 0) { connExpNames.add(normalize(e.name)); continue; }
    const names = new Set(stops.map(s => normalize(s)));
    const anchoredOnSource = line.stations.some((s, i) => i !== conn.fromJunctionIdx && stopSetHas(names, s));
    if (anchoredOnSource && (!stopSetHas(names, here) || noBoardAt(e, here))) connExpNames.add(normalize(e.name));
  }
  // A local-class entry of the connection being ridden replaces the source line's own
  // Local whatever its name (Ome 普通 run on to 東京 as the connection's 快速), also when
  // today's schedule hides it (no Asakusa 普通 runs through to Keikyu by day)
  const localPos = trainTypes.findIndex(t => t._connTargetLineIdx == null && t.stops === null && connLocal);
  trainTypes = trainTypes.filter(t => t._connTargetLineIdx != null
    || (!connExpNames.has(normalize(t.name)) && !(connLocal && t.stops === null)));
  // A connection's Local that replaced the line's takes the line's Local's place (the Local
  // button stays in front)
  if (localPos !== -1) {
    const connLocals = trainTypes.filter(t => t._connTargetLineIdx != null && isLocalEntry(t));
    const rest = trainTypes.filter(t => !connLocals.includes(t));
    rest.splice(Math.min(localPos, rest.length), 0, ...connLocals);
    trainTypes = rest;
  }

  // Add target line's express services (e.g. Den-en-toshi Semi-Exp/Express via Hanzomon)
  // Skip if connection express already covered this target line (avoid duplicates)
  // Skip if a lineDest was selected (ride stays on source line, target express irrelevant)
  const connAlreadyCovered = isLineDest || allConnExpress.some(a => a.targetLineIdx === conn?.toLineIdx);
  if (hasTargetExpress && connTargetLine && !connAlreadyCovered) {
    const junctionStn = connTargetLine.stations[conn.toJunctionIdx];
    const targetTypes = getTrainTypes(conn.to, junctionStn.name, connTargetLine, conn.toDir) || [];
    declared.push(...EXPRESS_SERVICES[conn.to]);
    // A mid-line connection with no destination picked (auto-selected) is only
    // ridden by the target's own types: the source local stays on its line
    // (Chuo-Sobu Local vs Tozai Local at 西船橋 / 中野)
    const staysOnLine = !state.selectedDestination &&
      conn.fromJunctionIdx !== dirEnd(line.stations.length, p.direction);
    // Add a "terminates at junction" option if the source line has no express of its own
    if (!hasLineExpress && trainTypes.length === 0) {
      trainTypes.push(staysOnLine
        ? { name: 'Local', ja: '各停', color: p.lineColor, stops: null, expressIndices: null }
        : { name: 'To ' + junctionStn.name, ja: junctionStn.ja + '行き',
            color: p.lineColor, stops: null, expressIndices: null, _terminatesAtJunction: true });
    }
    // Skip target Local if source already has one (through-run local covers both lines);
    // a "To <junction>" type ends at the junction, so the target Local still runs through
    const srcHasLocal = !staysOnLine && trainTypes.some(t => t.stops === null && !t._connTargetLineIdx && !t._terminatesAtJunction);
    const srcNames = new Set(trainTypes.map(t => normalize(t.name)));
    const shortTargetEn = conn.to.replace(/ Line$/, '').replace(/^Tokyo Metro /, '');
    const shortTargetJa = (LINE_NAMES_JA[conn.to] || shortTargetEn).replace(/線$/, '');
    for (const tt of targetTypes) {
      if (srcHasLocal && tt.stops === null) continue;
      const entry = { ...tt, _connTargetLineIdx: conn.toLineIdx };
      if (srcNames.has(normalize(tt.name))) {
        entry.name = shortTargetEn + ' ' + tt.name;
        entry.ja = shortTargetJa + ' ' + tt.ja;
      }
      trainTypes.push(entry);
    }
  }
  // A lone express-class type still applies when the lists declare no Local and
  // hours/direction/stops hid the others (a Rapid while its Special Rapid is
  // off-hours, or the Nikko → Isesaki 急行 while the through 普通 is). A single
  // declared type without a Local still runs local.
  const loneApplies = trainTypes.length === 1 && trainTypes[0].expressIndices
    && declared.length >= 2 && !declared.some(t => t.stops === null && resolveServiceStops(t, line, p.direction)?.length !== 0);
  if (trainTypes.length === 0 || (trainTypes.length === 1 && !loneApplies)) return null;

  // Group services with identical stop patterns (e.g. Yamabiko+Tsubasa, Hayabusa+Komachi).
  // Same-name entries (per-direction / per-segment hours) list their name once.
  const joinNames = (a, b) => [...new Set([...a.split(' / '), ...b.split(' / ')])].join(' / ');
  const grouped = [];
  for (const tt of trainTypes) {
    const key = (tt._terminatesAtJunction ? 'term:' : tt._connTargetLineIdx != null ? 'conn' + (tt._connTotalMax || '') + ':' : '')
      + (tt.expressIndices ? tt.expressIndices.join(',') : 'local')
      + (tt._hopNames ? '|' + tt._hopNames.join('>') + '|' + (tt._chainHops || []).map(h => h.to).join('>') : '');
    const existing = grouped.find(g => g._key === key);
    if (existing) {
      existing._members.push(tt);
      existing.name = joinNames(existing.name, tt.name);
      existing.ja = joinNames(existing.ja, tt.ja);
    } else {
      grouped.push({ ...tt, _key: key, _members: [tt] });
    }
  }

  // Remove types with 0 reachable stops (e.g. Hayabusa from Omiya toward Utsunomiya).
  // Each type's stop count is computed once here (a full route walk) and reused below.
  const effOf = new Map();
  const trace = window._routeDebug ? [] : null;
  const describe = m => m.name + (m._hopNames ? ' [' + m._hopNames.join(' > ') + ']' : '') + (m.expressIndices ? '' : ' (local)');
  let reachable = grouped.filter(g => {
    const eff = getEffectiveStops(p, trainTypeOpts(g));
    effOf.set(g, eff);
    trace?.push(describe(g) + ': validCount=' + eff.validCount + ' reachesDest=' + eff.reachesDest);
    // reachesDest: false when a picked destination is beyond where this type runs
    return eff.validCount > 0 && eff.reachesDest !== false;
  });
  if (trace) state._typesTrace = trace;
  // Filter train types to match the selected destination's real signboard.
  // When `services` is declared (connection destinations, lineDests and LINE_DESTINATIONS
  // entries alike), only show types whose name matches the allowlist.
  // Fallback heuristic for connection destinations without `services`: chain express
  // types that pass through (don't terminate at) the destination are filtered.
  if (state.selectedDestination?.services) {
    // Member by member: a group keeps only the members the destination's services name (its
    // members ride alike, so the group's count holds for whichever faces it)
    const sd = state.selectedDestination;
    reachable = reachable.flatMap(g => {
      const all = g._members || [g];
      const kept = all.filter(m => typeMatchesServices(m, sd, p));
      if (!kept.length) return [];
      if (kept.length === all.length) return [g];
      const ng = { ...kept[0], _key: g._key, _members: kept,
        name: kept.map(m => m.name).reduce(joinNames), ja: kept.map(m => m.ja).reduce(joinNames) };
      effOf.set(ng, effOf.get(g));
      return [ng];
    });
    trace?.push('services ' + sd.services.join('/') + ' keep: ' + reachable.map(describe).join(', '));
  } else if (state.selectedDestination && conn && !state.selectedDestination.chain?.length) {
    // Heuristic fallback: a type whose chain continues over named entries passes through the
    // destinations on the connection's own target line (a chained destination is reached by
    // the chain itself; a hop without express ridden on as a local says nothing)
    if (state.selectedDestination.totalMax <= (p._onLineStops || 0) + effectiveViaCount(conn, platformStation(p).name) + getConnectionMaxStops(conn)) {
      reachable = reachable.filter(g => !(g._chainHops || []).some(h => !h.implicit));
    }
  }

  // One type left: an express applies on its own; so does a group whose members ride differently
  // (Fukutoshin 各停 that run on as Toyoko 各停 or 急行: _rides counts the merged groups), since a
  // member must be boarded. None left while the lists declared types: no train serves this pick
  // ({ none: true }; the pickers drop such a choice rather than ride a plain local)
  const lone = g => g.expressIndices || (g._rides || 1) > 1 ? { autoSelect: g } : null;
  if (reachable.length === 0) return { none: true };
  if (reachable.length === 1) return lone(reachable[0]);

  // Same-name entries of one list whose rides differ (a quarter of the daytime Shonan-Shinjuku
  // 快速 call at 西大井 / 新川崎; Fukutoshin 各停 run on as Toyoko 各停 or 急行) are one signboard
  // type: one button faced by the longest member, the boarded train picked among the members
  // (pickTrainType keeps its own stops). Same list only: the line's own entries, or one
  // connection's (two connections' "Local" differ)
  const catOf = m => m._terminatesAtJunction ? 'term' : m._connTargetLineIdx != null ? 'conn' + m._connIdx : 'src';
  const sameList = [];
  for (const g of reachable) {
    const i = sameList.findIndex(m => normalize(m.name) === normalize(g.name) && catOf(m) === catOf(g));
    if (i === -1) { sameList.push(g); continue; }
    const face = effOf.get(sameList[i]).validCount >= effOf.get(g).validCount ? sameList[i] : g;
    face._members = [...sameList[i]._members, ...g._members];
    face._rides = (sameList[i]._rides || 1) + (g._rides || 1);
    sameList[i] = face;
  }
  reachable = sameList;

  // Merge express types with the same valid stop count (e.g. Semi-Exp/Express/Rapid Exp all 1-1)
  // Never merge local with express, or source-line with connection types — same count can mean different destinations
  const merged = [];
  const routeKey = g => {
    if (g._routeKey === undefined) g._routeKey = getStationsAlongRoute(p, g._cappedMax ?? effOf.get(g).cappedMax, g.expressIndices || null, g).map(s => s.ja).join(',');
    return g._routeKey;
  };
  for (const g of reachable) {
    const eff = effOf.get(g);
    const isLocal = !g.expressIndices;
    const cat = g._terminatesAtJunction ? 'term' : g._connTargetLineIdx != null ? 'conn' : 'src';
    const hasChain = !!g._chainExpressStops;
    // Same count and the same stations: a 各停 that runs on as 急行 and an 急行 with equal counts differ
    const existing = merged.find(m => {
      const mCat = m._terminatesAtJunction ? 'term' : m._connTargetLineIdx != null ? 'conn' : 'src';
      return m._count === eff.validCount && !m.expressIndices === isLocal && mCat === cat
        && !!m._chainExpressStops === hasChain && routeKey(m) === routeKey(g);
    });
    if (existing) {
      existing._members.push(...g._members);
      existing.name = joinNames(existing.name, g.name);
      existing.ja = joinNames(existing.ja, g.ja);
    } else {
      merged.push({ ...g, _count: eff.validCount, _rawMax: eff.rawMax, _cappedMax: eff.cappedMax });
    }
  }

  // Express types that merged into one button (準急 + 急行 to Shibuya at night) still apply
  if (merged.length <= 1) return merged.length === 1 ? lone(merged[0]) : null;
  return { types: merged };
}

// Board one train from a (possibly grouped) train-type button: a random member
// ("Yamabiko" from "Yamabiko / Tsubasa") — a member rides its own stops (same-name
// entries may differ by a stop or two), the group's when it has none of its own.
// `name` / `key` pick a specific member (session restore; trainTypeKey tells same-name
// members apart).
function pickTrainType(g, name, key) {
  const members = g._members || [g];
  const pick = (key && members.find(m => trainTypeKey(m) === key))
    || members.find(m => m.name === name)
    || members[Math.floor(Math.random() * members.length)];
  return { ...pick, expressIndices: pick.expressIndices !== undefined ? pick.expressIndices : g.expressIndices };
}

// A member's identity across reloads (data order is stable): name, connection, names along
// its chain and stop count
function trainTypeKey(m) {
  return [m.name, m._connIdx ?? '', (m._hopNames || []).join('>'), m.expressIndices ? m.expressIndices.length : 'L'].join('|');
}

function showTrainTypeButtons(p) {
  if (!p) { showRollStopsUI(); return false; }
  const resolved = resolveTrainTypes(p);
  if (!resolved || resolved.none) { showRollStopsUI(); return false; }
  if (resolved.autoSelect) {
    state.selectedTrainType = pickTrainType(resolved.autoSelect);
    showRollStopsUI();
    return false;
  }
  const types = resolved.types;
  state._pickerType = 'trainType';
  showTrainTypeUI();
  dom.trainTypeRow.innerHTML = types.map((g, i) => {
    const fullWidth = i === 0 && types.length === 3 ? 'flex:1 1 100%;min-width:100%;' : '';
    return `<button class="train-type-btn" style="background:${g.color};${pillTextStyle(g.color)}${fullWidth}"
      data-type-name="${g.name}" data-max="${g._rawMax}">
      ${currentLang === 'ja'
        ? `${g.ja}<small>${g.name} · 1–${g._count}</small>`
        : `${g.name}<small>${g.ja} · 1–${g._count}</small>`}
    </button>`;
  }).join('');
  dom.trainTypeRow.querySelectorAll('.train-type-btn').forEach((btn, i) => {
    btn.onclick = () => {
      const pick = state.selectedTrainType = pickTrainType(types[i]);
      const effectiveMax = getEffectiveStops(p).validCount;
      dom.stopsRangeText.textContent = t('trainTypeStops', { name: pick.name, ja: pick.ja, dest: destLabel(), max: effectiveMax, s: pl(effectiveMax) });
      dom.trainTypeRow.querySelectorAll('.train-type-btn').forEach(b => b.disabled = true);
      // Players roll stops right away; the debug tools pause here so scripted tests
      // can force the stop roll first (window._pauseBeforeStops)
      if (window._pauseBeforeStops) {
        showRollStopsUI();
        dom.stopsRangeText.textContent = t('rollingStops', { dest: destLabel(), max: effectiveMax, s: pl(effectiveMax) });
        dom.rollStopsBtn.disabled = false;
      } else {
        rollStops();
      }
    };
  });
  const hasLocal = types.some(g => !g.expressIndices);
  const headerMax = hasLocal
    ? getEffectiveStops(p, { ei: null, bi: null }).validCount
    : Math.max(...types.map(g => g._count));
  dom.stopsRangeText.textContent = t('selectTrainType', { dest: destLabel(), max: headerMax });
  return true;
}

function destLabel() {
  const d = state.selectedDestination;
  if (!d || !d.name) return '';
  return currentLang === 'ja' ? ' · ' + (d.ja || d.name).replace(/方面$/, '') + '行き' : ' towards ' + d.name;
}

function refreshStopsLabel() {
  if (!state.selectedPlatform) return;
  const max = getEffectiveStops(state.selectedPlatform).validCount;
  dom.stopsRangeText.textContent = t('rollingStops', { dest: destLabel(), max, s: pl(max) });
}

_langRefreshers.push(function refreshStopsRange() {
  // Skip when branch/train-type picker is visible — refreshPickerButtons handles that.
  if (state.selectedPlatform && !state.selectedPlatform.drinkHere && !state.selectedPlatform.takeFlight
      && state.selectedTrainType) {
    refreshStopsLabel();
  }
});
