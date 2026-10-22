'use strict';

// ── Schedule-aware service stops ──────────────────────────────────────────
const SCHEDULE_DAY_BOUNDARY = 2; // schedule rolls over at 2am, not midnight
// The clock the schedule and game day read. Override with window._forceNow (timestamp or date string) for testing.
function scheduleNow() {
  return window._forceNow != null ? new Date(window._forceNow) : new Date();
}
// Returns 'weekday' or 'weekend'. Override with window._forceSchedule for testing.
function getScheduleType() {
  if (window._forceSchedule) return window._forceSchedule;
  // Shift back past the 2am boundary: 1am Saturday is still Friday night
  const d = new Date(scheduleNow().getTime() - SCHEDULE_DAY_BOUNDARY * 3600000);
  const day = d.getDay();
  return (day === 0 || day === 6 || runsHolidayTimetable(d)) ? 'weekend' : 'weekday';
}

// Japanese national holiday (rules valid 1980–2099). Railways run their
// weekend/holiday (土休日) timetable on these.
function isJapaneseHoliday(d) {
  const y = d.getFullYear(), m = d.getMonth() + 1, day = d.getDate();
  const base = (y, m, day) => {
    const nthMonday = n => { const first = new Date(y, m - 1, 1).getDay(); return 1 + ((8 - first) % 7) + (n - 1) * 7; };
    const leap = Math.floor((y - 1980) / 4);
    const fixed = { 1: [1], 2: [11, 23], 4: [29], 5: [3, 4, 5], 8: [11], 11: [3, 23] }[m] || [];
    if (fixed.includes(day)) return true;
    if ((m === 1 || m === 10) && day === nthMonday(2)) return true;   // Coming of Age, Sports Day
    if ((m === 7 || m === 9) && day === nthMonday(3)) return true;    // Marine Day, Respect for the Aged
    if (m === 3 && day === Math.floor(20.8431 + 0.242194 * (y - 1980) - leap)) return true; // spring equinox
    if (m === 9 && day === Math.floor(23.2488 + 0.242194 * (y - 1980) - leap)) return true; // autumn equinox
    return false;
  };
  if (base(y, m, day)) return true;
  // Substitute holiday: the first non-holiday after a holiday that fell on Sunday
  for (let back = 1; back <= 3; back++) {
    const prev = new Date(y, m - 1, day - back);
    if (!base(prev.getFullYear(), prev.getMonth() + 1, prev.getDate())) break;
    if (prev.getDay() === 0) return true;
  }
  // Citizens' holiday: a weekday sandwiched between two holidays
  const before = new Date(y, m - 1, day - 1), after = new Date(y, m - 1, day + 1);
  return base(before.getFullYear(), before.getMonth() + 1, before.getDate())
      && base(after.getFullYear(), after.getMonth() + 1, after.getDate());
}

// Holiday timetable days: national holidays plus the New Year break (Dec 30 – Jan 3)
function runsHolidayTimetable(d) {
  const m = d.getMonth() + 1, day = d.getDate();
  return (m === 12 && day >= 30) || (m === 1 && day <= 3) || isJapaneseHoliday(d);
}
// Returns current hour (0-23). Override with window._forceHour for testing.
function getCurrentHour() {
  if (window._forceHour != null) return window._forceHour;
  return scheduleNow().getHours();
}

// ── Windows that follow the train ─────────────────────────────────────────
// A schedule entry's `at: '<JA station>'` (on the entry or its weekday / weekend part) makes its timeRange the times
// trains of that type leave that station. At the player's station the window is shifted by the estimated run time
// from `at` (runMinutes) and widened by SCHEDULE_LEAD_MIN before and SCHEDULE_DELAY_GRACE_MIN after. The callers pass
// the boarding context ctx = { line, stationIdx, dir, conn?, stops?, extra? } (platformCtx(p)); without one, or when
// `at` is on neither the line nor the connection's route, the window is read unshifted. timeRange bounds may be
// hours (as before) or 'HH:MM' strings (past midnight as '24:40', inside the 2am day boundary).
// Minutes of the game day (0:30 → 24:30)
const gameDayMinutes = m => (m < SCHEDULE_DAY_BOUNDARY * 60 ? m + 1440 : m);
function getCurrentMinutes() {
  if (window._forceHour != null) return gameDayMinutes(window._forceHour * 60);
  const d = scheduleNow();
  return gameDayMinutes(d.getHours() * 60 + d.getMinutes());
}
// A timeRange bound: an hour or 'HH:MM' → minutes of the game day (NaN when malformed)
function timeBoundMinutes(v) {
  if (typeof v === 'number') return gameDayMinutes(v * 60);
  const m = /^(\d{1,2}):(\d{2})$/.exec(String(v));
  return m ? gameDayMinutes(+m[1] * 60 + +m[2]) : NaN;
}
const minutesText = m => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(Math.floor(m % 60)).padStart(2, '0')}`;
const hasMinuteBounds = tr => timeRangeWindows(tr).some(w => typeof w[0] === 'string' || typeof w[1] === 'string');

// The class whose RUN_SPEED_KMH / RUN_STOP_MIN a line runs at
function runLineClass(line) {
  const name = line.name;
  if (RUN_LINE_CLASS[name]) return RUN_LINE_CLASS[name];
  if (/Sakura Tram|Setagaya|Enoshima Railway|Cable/i.test(name)) return 'tram';
  if (/Monorail|Yurikamome|Nippori-Toneri|Seaside|Disney|New shuttle|Leo Liner|Kodomo/i.test(name)) return 'agt';
  if (/^Tokyo Metro|^Toei|^Blue Line|^Green line|Rinkai|Minato Mirai|Saitama high-speed|Toyo Rapid/i.test(name)) return 'subway';
  if (/^JR|Sotetsu-JR|Shinkansen/.test(name)) return 'jr';
  return 'private';
}
// Estimated minutes from the departure at fromIdx to the departure at toIdx riding `dir`; negative when toIdx lies
// behind fromIdx (the time the train took from toIdx to fromIdx). stopIdxs: the indices the train stops at (null:
// every station); each stop after the start, the end included, costs RUN_STOP_MIN. null when unreachable.
function runMinutes(line, fromIdx, toIdx, dir, stopIdxs) {
  if (fromIdx === toIdx) return 0;
  const N = line.stations.length, step = dirStep(dir);
  const cls = runLineClass(line), speed = RUN_SPEED_KMH[cls], perStop = RUN_STOP_MIN[cls];
  const stopsAt = stopIdxs ? new Set(stopIdxs) : null;
  const loop = line.circular && !isOedoLine(line);
  const walk = (a, b) => {
    let km = 0, stops = 0;
    for (let i = a, n = 0; i !== b; n++) {
      if (n > N) return null;
      const j = loop ? (i + step + N) % N : i + step;
      if (j < 0 || j >= N) return null;
      km += haversineM(line.stations[i].lat, line.stations[i].lng, line.stations[j].lat, line.stations[j].lng) / 1000;
      if (!stopsAt || stopsAt.has(j)) stops++;
      i = j;
    }
    return km / speed * 60 + stops * perStop;
  };
  if (loop || (toIdx - fromIdx) * step > 0) return walk(fromIdx, toIdx);
  const back = walk(toIdx, fromIdx);
  return back == null ? null : -back;
}
// Minutes a ride over conn spends between leaving its source line at the junction and the target junction: the via
// stations, each a stop (0 when the junction is one station on both lines)
function viaMinutes(conn, line) {
  const src = line.stations[conn.fromJunctionIdx], tgt = state.lines[conn.toLineIdx]?.stations[conn.toJunctionIdx];
  const path = [src, ...(conn.viaStations || [])];
  if (tgt && normalize(tgt.ja) !== normalize(path[path.length - 1].ja)) path.push(tgt);
  const cls = runLineClass(line);
  let min = 0;
  for (let i = 1; i < path.length; i++) min += haversineM(path[i - 1].lat, path[i - 1].lng, path[i].lat, path[i].lng) / 1000 / RUN_SPEED_KMH[cls] * 60 + RUN_STOP_MIN[cls];
  return min;
}
// The boarding context for a platform (the connection ridden, when known)
function platformCtx(p, conn) {
  const line = state.lines[p.lineIdx];
  return line ? { line, stationIdx: p.fromIdx, dir: p.direction, conn: conn && conn.toLineIdx != null ? conn : null } : null;
}
// Index of station `ja` (EN or JA) on line; a station listed twice (Oedo 都庁前) takes the occurrence a train riding
// `dir` to nearIdx passes first (behind or at it), else the nearest
function stationIdxOn(line, ja, nearIdx, dir) {
  const key = new Set([normalize(ja)]);
  const hits = [];
  line.stations.forEach((s, i) => { if (stopSetHas(key, s)) hits.push(i); });
  if (hits.length <= 1) return hits.length ? hits[0] : -1;
  const behind = hits.filter(i => (nearIdx - i) * dirStep(dir) >= 0);
  return (behind.length ? behind : hits).sort((a, b) => Math.abs(a - nearIdx) - Math.abs(b - nearIdx))[0];
}
// Minutes between a train's departure from `at` (JA) and its departure from ctx's boarding station: positive when the
// station is down the line from `at`, negative up the line (also for a connection entry's `at` on its via or target
// line, reached after the junction). ctx.stops (names; null or absent = every station) sets the dwell, ctx.extra
// adds minutes (a ride onto the line before it). null when `at` is on neither the line nor the connection's route.
function scheduleOffset(at, ctx) {
  const { line, stationIdx, dir, conn } = ctx;
  const stopsOn = l => (ctx.stops == null ? null : getExpressIndices(l, ctx.stops));
  const extra = ctx.extra || 0;
  const i = stationIdxOn(line, at, stationIdx, dir);
  if (i >= 0) { const m = runMinutes(line, i, stationIdx, dir, stopsOn(line)); return m == null ? null : m + extra; }
  if (!conn || state.lines[conn.fromLineIdx] !== line) return null;
  const toLine = state.lines[conn.toLineIdx];
  if (!toLine) return null;
  const onVia = (conn.viaStations || []).some(v => stopSetHas(new Set([normalize(at)]), v));
  const tIdx = onVia ? -1 : stationIdxOn(toLine, at, conn.toJunctionIdx, conn.toDir);
  if (!onVia && tIdx < 0) return null;
  const toJunction = runMinutes(line, stationIdx, conn.fromJunctionIdx, dir, stopsOn(line));
  if (toJunction == null || toJunction < 0) return null;
  // (a via `at`: the ride up to it is counted as the whole via leg: via stations are a few minutes apart)
  let onTarget = 0;
  if (!onVia && tIdx !== conn.toJunctionIdx) {
    onTarget = runMinutes(toLine, conn.toJunctionIdx, tIdx, conn.toDir, stopsOn(toLine));
    if (onTarget == null || onTarget < 0) return null;
  }
  return -(toJunction + viaMinutes(conn, line) + onTarget) + extra;
}
// Today's windows of a schedule as seen from ctx: [{ at, offset, from, to, shiftedFrom, shiftedTo, active }] in
// minutes of the game day (null without a timeRange). For game.explain and the dev tools.
function scheduleWindowsAt(schedule, ctx) {
  const sched = schedule?.[getScheduleType()];
  if (!sched || !sched.timeRange) return null;
  const at = sched.at ?? schedule.at ?? null;
  const off = at != null && ctx ? scheduleOffset(at, ctx) : null;
  const now = getCurrentMinutes();
  return timeRangeWindows(sched.timeRange).map(([a, b]) => {
    const from = timeBoundMinutes(a), to = timeBoundMinutes(b);
    const shiftedFrom = off != null ? from + off - SCHEDULE_LEAD_MIN : from, shiftedTo = off != null ? to + off + SCHEDULE_DELAY_GRACE_MIN : to;
    return { at, offset: off, from, to, shiftedFrom, shiftedTo, active: shiftedFrom <= shiftedTo ? now >= shiftedFrom && now < shiftedTo : now >= shiftedFrom || now < shiftedTo };
  });
}

// Resolve a service's effective stops for the current schedule.
// Applies schedule.skip (remove stations), schedule.stops (full override),
// and schedule.timeRange ([startHour, endHour], or a list of them for several
// windows a day) for time-of-day filtering.
function timeRangeWindows(tr) {
  return Array.isArray(tr[0]) ? tr : [tr];
}
// ctx + at: an `at` window is shifted for the boarding context (see above); hour windows without `at` are read as
// clock hours at any station, unchanged
function inTimeRange(tr, ctx, at) {
  if (at == null && !hasMinuteBounds(tr)) {
    const hour = getCurrentHour();
    const inWindow = ([start, end]) => start <= end ? (hour >= start && hour < end) : (hour >= start || hour < end);
    return timeRangeWindows(tr).some(inWindow);
  }
  const now = getCurrentMinutes();
  const off = at != null && ctx ? scheduleOffset(at, ctx) : null;
  return timeRangeWindows(tr).some(([a, b]) => {
    let s = timeBoundMinutes(a), e = timeBoundMinutes(b);
    if (off != null) { s += off - SCHEDULE_LEAD_MIN; e += off + SCHEDULE_DELAY_GRACE_MIN; }
    return s <= e ? (now >= s && now < e) : (now >= s || now < e);
  });
}
// Whether a destination / branch with a `schedule` runs now: today's entry hides
// it with `stops: []` or outside every `timeRange` window.
function scheduleActive(schedule, ctx) {
  const sched = schedule?.[getScheduleType()];
  if (!sched) return true;
  if (Array.isArray(sched.stops) && sched.stops.length === 0) return false;
  return !sched.timeRange || inTimeRange(sched.timeRange, ctx, sched.at ?? schedule.at);
}
// dir (optional): the platform's travel direction; a service with
// `direction: 'start'|'end'` runs only that way (hidden = []).
// ctx (optional): the boarding context an `at` window is shifted for (the service's own stops set the dwell)
function resolveServiceStops(service, line, dir, ctx) {
  if (service.direction && dir && service.direction !== dir) return [];
  if (!service.schedule) return service.stops;
  const sched = service.schedule[getScheduleType()];
  if (!sched) return service.stops;
  // Time-of-day filter: hide service outside every specified hour range
  if (sched.timeRange) {
    const at = sched.at ?? service.schedule.at;
    if (!inTimeRange(sched.timeRange, at != null && ctx ? { ...ctx, stops: service.stops } : ctx, at)) return []; // empty = hidden
  }
  if (sched.skip) {
    // Names may be EN or JA on either side: match against the line's stations
    const skipSet = new Set(sched.skip.map(n => normalize(n)));
    if (service.stops === null) {
      return line.stations.filter(s => !stopSetHas(skipSet, s)).map(s => s.name);
    }
    const stationOf = n => line?.stations.find(s => normalize(s.name) === normalize(n) || normalize(s.ja) === normalize(n));
    return service.stops.filter(n => {
      const s = stationOf(n);
      return !(s ? stopSetHas(skipSet, s) : skipSet.has(normalize(n)));
    });
  }
  if (sched.stops !== undefined) return sched.stops;
  return service.stops;
}

// ── Express Service Helpers ───────────────────────────────────────────────
// Convert stop names to sorted station indices for a line
// Stop lists may name stations in English or Japanese — JA entries are
// immune to upstream/OSM English-name drift and can be pasted straight
// from Japanese timetable sources.
function stopSetHas(nameSet, stn) {
  return nameSet.has(normalize(stn.name)) || (stn.ja && nameSet.has(normalize(stn.ja)));
}

function getExpressIndices(line, stopNames) {
  if (!stopNames) return null;
  const nameSet = new Set(stopNames.map(n => normalize(n)));
  return line.stations
    .map((s, i) => stopSetHas(nameSet, s) ? i : -1)
    .filter(i => i >= 0);
}

// Get train types available at a station on a given line (dir: travel direction,
// for one-way services)
// ctx: the boarding context for `at` windows (platformCtx)
function getTrainTypes(lineName, stationName, line, dir, ctx) {
  const services = EXPRESS_SERVICES[lineName];
  if (!services) return null;
  // Stop lists may name stations in EN or JA — match the station object on
  // this line by either (stopSetHas), as routing does
  const norm = normalize(stationName);
  const stn = line.stations.find(s => normalize(s.name) === norm) || { name: stationName };
  return services
    .filter(svc => {
      const stops = resolveServiceStops(svc, line, dir, ctx);
      return stops === null || stopSetHas(new Set(stops.map(normalize)), stn);
    })
    .map(svc => {
      const stops = resolveServiceStops(svc, line, dir, ctx);
      return {
        ...svc,
        expressIndices: getExpressIndices(line, stops),
      };
    });
}

// Compute maxStops for an express type on a platform
// Position in a (sorted) express index list of the first stop after fromIdx in
// direction step. passThrough: fromIdx needn't be a stop itself (a connection
// junction the express runs through); otherwise -1 when it isn't.
function firstExpressPos(indices, fromIdx, step, passThrough) {
  const pos = indices.indexOf(fromIdx);
  if (pos !== -1) return pos + step;
  if (!passThrough) return -1;
  if (step > 0) return indices.findIndex(x => x > fromIdx);
  for (let i = indices.length - 1; i >= 0; i--) if (indices[i] < fromIdx) return i;
  return -1;
}

function getExpressMaxStops(platform, expressIndices) {
  const line = state.lines[platform.lineIdx];
  const step = dirStep(platform.direction);
  const start = firstExpressPos(expressIndices, platform.fromIdx, step, platform.passThrough);
  if (start === -1) return 0;
  let count = 0;
  for (let i = start; i >= 0 && i < expressIndices.length; i += step) {
    const stn = line.stations[expressIndices[i]];
    if (state.wards23Only && !isIn23Wards(stn.lat, stn.lng)) break;
    count++;
  }
  return count;
}

// Convert branch station ja names to indices into line.stations[]
function getBranchIndices(line, branchJaNames) {
  const jaToIdx = {};
  line.stations.forEach((s, i) => { jaToIdx[s.ja] = i; });
  return branchJaNames.map(ja => jaToIdx[ja]).filter(i => i !== undefined);
}

// Get branches available at a station, with precomputed indices.
// Branches whose `schedule` is off now are left out unless anyHour.
function getBranches(lineName, stationJa, line, direction, anyHour) {
  const config = LINE_BRANCHES[lineName];
  if (!config) return null;
  const stationIdx = line.stations.findIndex(s => s.ja === stationJa);
  const ctx = direction && stationIdx >= 0 ? { line, stationIdx, dir: direction } : null;
  return config
    .filter(b => b.stations.includes(stationJa))
    .filter(b => !direction || !b.direction || b.direction === direction)
    .filter(b => anyHour || scheduleActive(b.schedule, ctx))
    .map(b => ({ ...b, branchIndices: getBranchIndices(line, b.stations) }));
}

// LINE_DESTINATIONS[line] is one { direction, destinations } config or an array of them
// (one per direction); lineDestFor() picks the one for a platform's direction
function lineDestConfigs(lineName) {
  const cfg = LINE_DESTINATIONS[lineName];
  return !cfg ? [] : Array.isArray(cfg) ? cfg : [cfg];
}
function lineDestFor(lineName, direction) {
  return lineDestConfigs(lineName).find(c => c.direction === direction) || null;
}

// LINE_SCHEDULES: boarding a line at a listed station toward `direction` runs
// only while the entry's schedule does (Sky Access trains from 京成上野). line (optional): the line object, for `at` windows
function lineScheduleActive(lineName, stnJa, dir, line) {
  const groups = LINE_SCHEDULES[lineName] || [];
  if (!groups.length) return true;
  const stationIdx = line ? line.stations.findIndex(s => s.ja === stnJa) : -1;
  const ctx = line && stationIdx >= 0 ? { line, stationIdx, dir } : null;
  return groups.every(g =>
    (g.direction && g.direction !== dir) || !g.stations.includes(stnJa) || scheduleActive(g.schedule, ctx));
}

// Compute maxStops along a branch from a platform (same pattern as getExpressMaxStops)
function getBranchMaxStops(platform, branchIndices) {
  const line = state.lines[platform.lineIdx];
  const pos = branchIndices.indexOf(platform.fromIdx);
  if (pos === -1) return 0;
  const step = dirStep(platform.direction);
  let count = 0;
  for (let i = pos + step; i >= 0 && i < branchIndices.length; i += step) {
    const stn = line.stations[branchIndices[i]];
    if (state.wards23Only && !isIn23Wards(stn.lat, stn.lng)) break;
    count++;
  }
  return count;
}
