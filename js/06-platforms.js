'use strict';

// ── Platform Logic ────────────────────────────────────────────────────────

// Walk ahead along a line and return the first station that's a major hub
// (served by 4+ directional platforms, i.e. a real transfer station).
// Falls back to the immediate next station if none found within lookahead.
// Well-known anchor stations for "toward" labels — the stations people actually navigate by
const ANCHOR_STATIONS = new Set([
  // Yamanote big 6
  'Tokyo', 'Shinagawa', 'Shibuya', 'Shinjuku', 'Ikebukuro', 'Ueno',
  // Major JR hubs outside central Tokyo
  'Yokohama', 'Kawasaki', 'Omiya', 'Tachikawa', 'Hachioji',
  'Ofuna', 'Chiba', 'Kashiwa', 'Funabashi', 'Machida', 'Kichijoji',
  // Secondary hubs for better direction labels
  'Akihabara', 'Nakano',
  'Kawagoe', 'Odawara', 'Fuchu', 'Urawa',
  'Tsudanuma', 'Tokorozawa', 'Chofu', 'Kasukabe',
  // Private railway hubs
  'Keikyu Kamata',
]);
// Matched by normalized name, so spelling/style changes in the data can't break it
const ANCHOR_KEYS = new Set([...ANCHOR_STATIONS].map(normalize));

// Oedo is a lollipop (see OEDO_LOOP_END): upstream flags it circular, but it has
// two ends, so it walks like a linear line everywhere except Tochomae.
function isOedoLine(line) {
  return line.name.includes('Oedo') || line.name.includes('\u014Cedo');
}

function findMajorStation(line, fromIdx, direction) {
  const N = line.stations.length;
  const LOOKAHEAD  = 30;
  const HUB_THRESHOLD = 4;
  const wrap = line.circular && !isOedoLine(line);

  const step = dirStep(direction);

  // First pass: look for a curated anchor station
  for (let i = 1; i <= Math.min(LOOKAHEAD, N - 1); i++) {
    let idx = wrap
      ? ((fromIdx + step * i) % N + N) % N
      : fromIdx + step * i;
    if (idx < 0 || idx >= N) break;
    if (ANCHOR_KEYS.has(normalize(line.stations[idx].name))) return line.stations[idx].name;
  }

  // Second pass: fall back to any hub station (4+ lines)
  for (let i = 1; i <= Math.min(LOOKAHEAD, N - 1); i++) {
    let idx = wrap
      ? ((fromIdx + step * i) % N + N) % N
      : fromIdx + step * i;
    if (idx < 0 || idx >= N) break;
    const stn     = line.stations[idx];
    const entries = state.stationIndex[normalize(stn.name)] || [];
    if (entries.length >= HUB_THRESHOLD) return stn.name;
  }

  // Fallback: terminus (end of line in this direction)
  if (wrap) {
    const fallback = ((fromIdx + step) % N + N) % N;
    return line.stations[fallback].name;
  }
  const terminus = step === -1 ? 0 : N - 1;
  if (terminus !== fromIdx) return line.stations[terminus].name;
  const nb = fromIdx + step;
  return (nb >= 0 && nb < N) ? line.stations[nb].name : null;
}

// In 23-wards mode: count how many consecutive stops from fromIdx in the given
// step direction stay within the ward boundary. Returns 0 if the first stop is outside.
function wardMaxStops(line, fromIdx, step) {
  const N = line.stations.length;
  const wrap = line.circular && !isOedoLine(line); // Oedo is flagged circular but has ends
  for (let i = 1; i < N; i++) {
    let idx = wrap
      ? ((fromIdx + step * i) % N + N) % N
      : fromIdx + step * i;
    if (!wrap && (idx < 0 || idx >= N)) return i - 1;
    if (!isIn23Wards(line.stations[idx].lat, line.stations[idx].lng)) return i - 1;
  }
  return N - 1;
}

// Look up the Japanese name of a station from its English name
// The station a platform departs from. On alias/walkable platforms this is
// not state.currentStation (e.g. Fukutoshin at Meiji-jingumae when standing at Harajuku).
function platformStation(p) {
  return state.lines[p.lineIdx].stations[p.fromIdx];
}

function stationJa(englishName) {
  const entries = state.stationIndex[normalize(englishName)];
  if (!entries || !entries.length) return englishName;
  return state.lines[entries[0].lineIdx].stations[entries[0].stationIdx].ja || englishName;
}

// Display name for a station — Japanese when in JP mode, English otherwise
function stationDisplayName(englishName) {
  if (currentLang === 'ja') return stationJa(englishName);
  return englishName;
}

// Render station name with secondary in <small> tag (primary depends on current lang)
function formatStationName(name, ja) {
  const primary = currentLang === 'ja' && ja ? ja : name;
  const secondary = currentLang === 'ja' ? name : ja;
  if (!secondary || secondary === primary) return primary;
  return `${primary} <small class="text-muted">${secondary}</small>`;
}

// Pick the appropriate name from a history entry's from/to fields
function historyName(en, ja) {
  return currentLang === 'ja' && ja ? ja : en;
}

// Render history from/to with optional <small> secondary
function historyNameHtml(en, ja) {
  if (currentLang === 'ja') return en && ja ? ja : (en || '');
  return en + (ja ? ` <small class="dest-ja">${ja}</small>` : '');
}

function setStationInput(englishName) {
  dom.stationInput.value = stationDisplayName(englishName);
  dom.stationInput.classList.add('selected');
}

_langRefreshers.push(function refreshStationInput() {
  if (state.currentStation && dom.stationInput.classList.contains('selected')) {
    setStationInput(state.currentStation.name);
  }
});

// Compute display label and hint for a platform using i18n
function platformLabel(p) {
  const ln = platformLineName(p);
  if (p.dirKey === 'loopCCW')         return `${ln} — ${t('loopCCW')}`;
  if (p.dirKey === 'loopCW')          return `${ln} — ${t('loopCW')}`;
  if (p.dirKey === 'clockwise')       return `${ln} — ${t('clockwise')}`;
  if (p.dirKey === 'counterclockwise') return `${ln} — ${t('counterclockwise')}`;
  if (p.dirKey === 'toward')          return `${ln} — ${t('towardStation', { name: stationDisplayName(p.hintStation || p.dirStation) })}`;
  return ln;
}
function platformHint(p) {
  const arrow = dirStep(p.direction) === -1 ? '←' : '→';
  const target = p.hintStation || p.dirStation;
  return `${arrow} ${t('towardStation', { name: stationDisplayName(target) })}`;
}

function mergeShinkansenPlatforms(rawShinkansen) {
  const byTrack = {};
  for (const p of rawShinkansen) {
    const line = state.lines[p.lineIdx];
    const step = dirStep(p.direction);
    const nextIdx = p.fromIdx + step;
    const nextJa = (nextIdx >= 0 && nextIdx < line.stations.length) ? line.stations[nextIdx].ja : '';
    const key = p.direction + ':' + nextJa;
    (byTrack[key] ||= []).push(p);
  }
  return Object.values(byTrack).map(group => {
    // Every member: the roll rides one of a merged slot's lines (thirst ×SHINKANSEN_THIRST)
    for (const p of group) p.isShinkansen = true;
    if (group.length === 1) return group[0];
    const best = group.reduce((a, b) => b.maxStops > a.maxStops ? b : a, group[0]);
    return {
      isShinkansen: true, _shinkansenOptions: group,
      lineName: 'Shinkansen', lineColor: '#0073CF',
      direction: best.direction, fromIdx: best.fromIdx, lineIdx: best.lineIdx,
      dirKey: best.dirKey, dirStation: best.dirStation, hintStation: best.hintStation,
      maxStops: Math.max(...group.map(p => p.maxStops)), circular: false,
    };
  });
}

// Merge platforms of lines that share one physical track at this station
// (SHARED_TRACKS). Two platforms head the same way when the first station
// ahead that both lines serve is the same (works for skip-stop lines like
// Sky Access). At a `splitAt` station the lines diverge right after the
// shared platform, so the first common station behind also counts.
// The roll lands on the merged platform, then picks a random train.
function mergeSharedTrackPlatforms(platforms, stnJa) {
  const groups = SHARED_TRACKS.filter(g => g.stations.includes(stnJa));
  if (!groups.length) return platforms;
  const out = platforms.map(p => {
    const g = groups.find(g => g.lines.includes(p.lineName));
    if (!g || p.circular) return p;
    const jas = state.lines[p.lineIdx].stations.map(s => s.ja);
    const ahead = p.direction === 'end' ? jas.slice(p.fromIdx + 1) : jas.slice(0, p.fromIdx).reverse();
    const behind = p.direction === 'end' ? jas.slice(0, p.fromIdx).reverse() : jas.slice(p.fromIdx + 1);
    return { g, options: [p], members: [{ ahead, behind, set: new Set(jas) }],
             split: !!g.splitAt?.includes(stnJa) };
  });
  const firstIn = (list, set) => list.find(ja => set.has(ja));
  const sameWay = (a, b, split) => {
    const ahead = firstIn(a.ahead, b.set);
    if (ahead && ahead === firstIn(b.ahead, a.set)) return true;
    if (!split) return false;
    const behind = firstIn(a.behind, b.set);
    return !!behind && behind === firstIn(b.behind, a.set);
  };
  // Join buckets with any same-way pair until stable (order-independent)
  for (let merged = true; merged;) {
    merged = false;
    for (let i = 0; i < out.length && !merged; i++) {
      for (let j = i + 1; j < out.length && !merged; j++) {
        const a = out[i], b = out[j];
        if (!a.options || !b.options || a.g !== b.g) continue;
        if (!a.members.some(x => b.members.some(y => sameWay(x, y, a.split)))) continue;
        a.options.push(...b.options);
        a.members.push(...b.members);
        out.splice(j, 1);
        merged = true;
      }
    }
  }
  return out.map(x => {
    if (!x.options) return x;
    const opts = x.options;
    if (opts.length === 1) return opts[0];
    const best = opts.reduce((a, b) => b.maxStops > a.maxStops ? b : a, opts[0]);
    // Keep a through-service name every train shares (e.g. "Ueno Tokyo Line")
    let displayName = opts[0].displayName, displayNameJa;
    if (!displayName || opts.some(o => o.displayName !== displayName)) {
      ({ en: displayName, ja: displayNameJa } = sharedTrackName(opts));
    }
    return {
      _sharedTrackOptions: opts,
      lineName: best.lineName, displayName, displayNameJa, lineColor: best.lineColor,
      direction: best.direction, fromIdx: best.fromIdx, lineIdx: best.lineIdx,
      dirKey: best.dirKey, dirStation: best.dirStation, hintStation: best.hintStation,
      maxStops: Math.max(...opts.map(o => o.maxStops)), circular: false,
    };
  });
}

// Combined pill label for a shared-track platform, e.g. "Yokosuka / Shonan Shinjuku"
function sharedTrackName(opts) {
  const OPERATOR = /^(JR|Tokyo Metro|Toei|Tokyu|Hokuso Railway) /;
  const OPERATOR_JA = /^(JR|東京メトロ|都営|東急)/;
  return {
    en: opts.map(o => o.lineName.replace(OPERATOR, '').replace(/ Line$/i, '')).join(' / '),
    ja: opts.map(o => (LINE_NAMES_JA[o.lineName] || state.lines[o.lineIdx].ja || o.lineName).replace(OPERATOR_JA, '')).join(' / '),
  };
}

// Real platforms behind the merged ones (shinkansen + shared-track)
function flatPlatforms(platforms) {
  return platforms.flatMap(p => p._sharedTrackOptions || p._shinkansenOptions || [p]);
}

// ── Platform builders (used by getPlatforms) ─────────────────────────────

function getOedoTochomaePlatforms(line, entry, N) {
  const platforms = [];
  // Tochomae is listed at 0 (loop start) and at loopEnd (loop end, stem start)
  const loopEnd = OEDO_LOOP_END;
  const loopMid = Math.floor(loopEnd / 2);  // = 14, half the loop
  const stemLen = N - 1 - loopEnd;           // = 10 (Nishi-Shinjuku-Gochome … Hikarigaoka)
  // The array runs clockwise on the map, so +1 from index 0 is clockwise
  const maxCW   = state.wards23Only ? Math.min(loopMid, wardMaxStops(line, 0, +1))       : loopMid;
  const maxCCW  = state.wards23Only ? Math.min(loopMid, wardMaxStops(line, loopEnd, -1)) : loopMid;
  const maxStem = state.wards23Only ? Math.min(stemLen, wardMaxStops(line, loopEnd, +1)) : stemLen;
  if (maxCW > 0) platforms.push({
    dirKey: 'loopCW', dirStation: line.stations[1].name,
    lineColor: line.color, lineName: line.name,
    circular: false, direction: 'end',
    fromIdx: 0, lineIdx: entry.lineIdx, maxStops: maxCW,
  });
  if (maxCCW > 0) platforms.push({
    dirKey: 'loopCCW', dirStation: line.stations[loopEnd - 1].name,
    lineColor: line.color, lineName: line.name,
    circular: false, direction: 'start',
    fromIdx: loopEnd, lineIdx: entry.lineIdx, maxStops: maxCCW,
  });
  if (maxStem > 0) platforms.push({
    dirKey: 'toward', dirStation: 'Hikarigaoka', hintStation: line.stations[N - 1].name,
    lineColor: line.color, lineName: line.name,
    circular: false, direction: 'end',
    fromIdx: loopEnd, lineIdx: entry.lineIdx, maxStops: maxStem,
  });
  return platforms;
}

// Shoelace sign of a loop's station order: true when increasing index turns clockwise on the map
function loopTurnsClockwise(stations) {
  return stations.reduce((a, p, i) => {
    const q = stations[(i + 1) % stations.length];
    return a + p.lng * q.lat - q.lng * p.lat;
  }, 0) < 0;
}

function getCircularPlatforms(line, entry, si, N) {
  const platforms = [];
  const majorA = findMajorStation(line, si, 'A');
  const majorB = findMajorStation(line, si, 'B');
  const maxA = state.wards23Only ? wardMaxStops(line, si, -1) : N - 1;
  const maxB = state.wards23Only ? wardMaxStops(line, si, +1) : N - 1;
  // Label each direction by how the station order turns on the map (Yamanote's array runs
  // clockwise, so B is clockwise; Disney's runs counterclockwise). oneWay drops the other direction.
  const bIsCW = loopTurnsClockwise(line.stations);
  if (maxA > 0 && line.oneWay !== 'B') platforms.push({
    dirKey: bIsCW ? 'counterclockwise' : 'clockwise', dirStation: majorA,
    lineColor: line.color, lineName: line.name,
    circular: true, direction: 'A',
    fromIdx: si, lineIdx: entry.lineIdx, maxStops: maxA,
  });
  if (maxB > 0 && line.oneWay !== 'A') platforms.push({
    dirKey: bIsCW ? 'clockwise' : 'counterclockwise', dirStation: majorB,
    lineColor: line.color, lineName: line.name,
    circular: true, direction: 'B',
    fromIdx: si, lineIdx: entry.lineIdx, maxStops: maxB,
  });
  return platforms;
}

// backPrev: leave out connections boarding here whose first stop is this
// station (the way back after arriving over that connection leg)
function getLinearPlatforms(line, entry, si, N, backPrev) {
  const platforms = [];
  const branchConfig = LINE_BRANCHES[line.name];
  const stnJa = line.stations[si].ja;

  for (const dir of ['start', 'end']) {
    const atTerminus = si === dirEnd(N, dir);
    if (!lineScheduleActive(line.name, stnJa, dir)) continue;

    const step = dirStep(dir);
    let maxStops = atTerminus ? 0 : (state.wards23Only
      ? wardMaxStops(line, si, step)
      : Math.abs(si - dirEnd(N, dir)));
    // Oedo stem toward Tochomae: the train passes Tochomae, rounds the loop and
    // ends there again — stop the ride one short so no station is reached twice
    if (isOedoLine(line) && dir === 'start' && si > OEDO_LOOP_END) maxStops = Math.min(maxStops, si - 1);

    if (branchConfig && !atTerminus) {
      const branches = getBranches(line.name, stnJa, line, dir);
      if (branches.length > 0) {
        maxStops = 0;
        for (const b of branches) {
          const fakeP = { fromIdx: si, direction: dir, lineIdx: entry.lineIdx };
          maxStops = Math.max(maxStops, getBranchMaxStops(fakeP, b.branchIndices));
        }
      } else if (getBranches(line.name, stnJa, line, dir, true).length > 0) {
        maxStops = 0; // every branch through here is off-hours (Tsurumi 大川 by day)
      }
    }

    // Check for connections in this direction.
    // Terminus connections extend maxStops (route continues onto connected line).
    // Mid-line connections create branch choices via express services only.
    // At a terminus, skip connections without via at shared stations (handled by other line).
    let conns = getConnections(line.name, entry.lineIdx, dir, si);
    if (atTerminus) conns = conns.filter(c => c.viaStations.length > 0);
    if (backPrev) conns = conns.filter(c => c.fromJunctionIdx !== si || connFirstStop(c)?.name !== backPrev);
    // Separate terminus connections (extend route) from mid-line (express branch only)
    const tidx = dirEnd(N, dir);
    const terminusConns = conns.filter(c => c.fromJunctionIdx === tidx);
    const midLineConns = conns.filter(c => c.fromJunctionIdx !== tidx);
    let connExtra = 0;
    if (terminusConns.length > 0 && !branchConfig) {
      connExtra = computeConnectionExtra(terminusConns, line.stations[si].name, undefined, line.name);
      maxStops += connExtra;
    }

    if (maxStops <= 0) continue;

    // Compute hint station
    let hint = atTerminus ? null : findMajorStation(line, si, dir);
    if (branchConfig && !atTerminus) {
      const dirBranches = getBranches(line.name, stnJa, line, dir);
      if (dirBranches.length === 1) {
        const bIdx = dir === 'start'
          ? dirBranches[0].branchIndices[0]
          : dirBranches[0].branchIndices[dirBranches[0].branchIndices.length - 1];
        hint = line.stations[bIdx]?.name || hint;
      }
    } else if (connExtra > 0) {
      if (conns.length === 1 || conns.every(c => c.destinations)) {
        // Keep the on-line hint when single transparent connection or all
        // connections have destinations (picker will show the branching)
      } else {
        // Multiple connections: hint to the target line's junction station
        const toLine = state.lines[conns[0].toLineIdx];
        hint = toLine.stations[conns[0].toJunctionIdx]?.name || hint;
      }
    }

    let dirStation = line.stations[dirEnd(N, dir)].name;
    // At terminus with connections, dirStation is the target line's junction (not where we stand)
    if (atTerminus && conns.length > 0) {
      const toLine = state.lines[conns[0].toLineIdx];
      dirStation = toLine.stations[conns[0].toJunctionIdx]?.name || dirStation;
    }
    const p = {
      dirKey: 'toward', dirStation, hintStation: hint,
      lineColor: line.color, lineName: line.name,
      circular: false, direction: dir,
      fromIdx: si, lineIdx: entry.lineIdx, maxStops,
    };

    // Connection metadata for downstream use
    const allConns = [...terminusConns, ...midLineConns];
    if (allConns.length > 0 && !branchConfig) {
      p._connections = allConns;
      p._onLineStops = maxStops - connExtra; // stops on the source line only
    }

    // Connection displayName overrides line name (if all connections share same displayName)
    if (conns.length > 0 && !branchConfig) {
      const connDn = conns[0].displayName;
      if (connDn && conns.every(c => c.displayName === connDn)) {
        p.displayName = connDn;
      }
    }

    platforms.push(p);
  }
  return platforms;
}

// ── getPlatforms ─────────────────────────────────────────────────────────

function getPlatforms(stationName, includeAliases = true, backPrev = null) {
  const key = normalize(stationName);
  const entries = [...(state.stationIndex[key] || [])];
  if (includeAliases) {
    for (const aliasKey of getAliasKeys(stationName)) {
      for (const e of (state.stationIndex[aliasKey] || [])) entries.push(e);
    }
    for (const walkName of (WALKABLE_BY_KEY.get(normalize(stationName)) || [])) {
      for (const e of (state.stationIndex[normalize(walkName)] || [])) entries.push(e);
    }
  }
  const platforms = [];

  for (const entry of entries) {
    const line = state.lines[entry.lineIdx];
    const si   = entry.stationIdx;
    const N    = line.stations.length;
    const isOedo = isOedoLine(line);

    if (isOedo && si === 0) {
      platforms.push(...getOedoTochomaePlatforms(line, entry, N));
    } else if (isOedo && si === OEDO_LOOP_END) {
      // Second Tochomae entry: its platforms come from getOedoTochomaePlatforms
    } else if (line.circular && !isOedo) {
      platforms.push(...getCircularPlatforms(line, entry, si, N));
    } else {
      platforms.push(...getLinearPlatforms(line, entry, si, N, backPrev));
    }
  }

  // Merge connection-only platforms with the same displayName + direction.
  // E.g. at Ueno, three lines (Utsunomiya/Takasaki/Joban) all show "Ueno Tokyo Line"
  // toward Tokyo — merge into one platform with combined connections.
  return mergeConnectionPlatforms(platforms);
}

function mergeConnectionPlatforms(platforms) {
  const merged = [];
  const used = new Set();

  for (let i = 0; i < platforms.length; i++) {
    if (used.has(i)) continue;
    const p = platforms[i];
    // Only merge connection-only platforms (on-line stops = 0) with a displayName
    if (!p._connections || !p.displayName || p._onLineStops > 0) {
      merged.push(p);
      continue;
    }

    // Find all other platforms with same displayName + direction
    const group = [p];
    for (let j = i + 1; j < platforms.length; j++) {
      if (used.has(j)) continue;
      const q = platforms[j];
      if (q.displayName === p.displayName && q.direction === p.direction
          && q._connections && q._onLineStops === 0) {
        group.push(q);
        used.add(j);
      }
    }

    if (group.length === 1) {
      merged.push(p);
      continue;
    }

    // Merge: combine all connections, take the best maxStops
    const allConns = [];
    for (const g of group) allConns.push(...g._connections);
    const best = group.reduce((a, b) => b.maxStops > a.maxStops ? b : a, group[0]);
    // Use the target line's color (e.g. Tokaido orange for UTL)
    const targetColor = state.lines[allConns[0].toLineIdx]?.color || best.lineColor;
    merged.push({
      ...best,
      _connections: allConns,
      _mergedLines: group.map(g => g.lineName), // every member line (backtracking matches any)
      lineColor: targetColor,
      maxStops: Math.max(...group.map(g => g.maxStops)),
    });
  }

  return merged;
}
