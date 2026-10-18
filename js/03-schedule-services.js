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

// Resolve a service's effective stops for the current schedule.
// Applies schedule.skip (remove stations), schedule.stops (full override),
// and schedule.timeRange ([startHour, endHour], or a list of them for several
// windows a day) for time-of-day filtering.
function timeRangeWindows(tr) {
  return Array.isArray(tr[0]) ? tr : [tr];
}
function inTimeRange(tr) {
  const hour = getCurrentHour();
  const inWindow = ([start, end]) => start <= end ? (hour >= start && hour < end) : (hour >= start || hour < end);
  return timeRangeWindows(tr).some(inWindow);
}
// Whether a destination / branch with a `schedule` runs now: today's entry hides
// it with `stops: []` or outside every `timeRange` window.
function scheduleActive(schedule) {
  const sched = schedule?.[getScheduleType()];
  if (!sched) return true;
  if (Array.isArray(sched.stops) && sched.stops.length === 0) return false;
  return !sched.timeRange || inTimeRange(sched.timeRange);
}
// dir (optional): the platform's travel direction; a service with
// `direction: 'start'|'end'` runs only that way (hidden = []).
function resolveServiceStops(service, line, dir) {
  if (service.direction && dir && service.direction !== dir) return [];
  if (!service.schedule) return service.stops;
  const sched = service.schedule[getScheduleType()];
  if (!sched) return service.stops;
  // Time-of-day filter: hide service outside every specified hour range
  if (sched.timeRange && !inTimeRange(sched.timeRange)) return []; // empty = hidden
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
function getTrainTypes(lineName, stationName, line, dir) {
  const services = EXPRESS_SERVICES[lineName];
  if (!services) return null;
  // Stop lists may name stations in EN or JA — match the station object on
  // this line by either (stopSetHas), as routing does
  const norm = normalize(stationName);
  const stn = line.stations.find(s => normalize(s.name) === norm) || { name: stationName };
  return services
    .filter(svc => {
      const stops = resolveServiceStops(svc, line, dir);
      return stops === null || stopSetHas(new Set(stops.map(normalize)), stn);
    })
    .map(svc => {
      const stops = resolveServiceStops(svc, line, dir);
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
  return config
    .filter(b => b.stations.includes(stationJa))
    .filter(b => !direction || !b.direction || b.direction === direction)
    .filter(b => anyHour || scheduleActive(b.schedule))
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
// only while the entry's schedule does (Sky Access trains from 京成上野)
function lineScheduleActive(lineName, stnJa, dir) {
  return (LINE_SCHEDULES[lineName] || []).every(g =>
    (g.direction && g.direction !== dir) || !g.stations.includes(stnJa) || scheduleActive(g.schedule));
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
