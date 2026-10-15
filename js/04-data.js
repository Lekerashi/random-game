'use strict';

// ── Data Loading ──────────────────────────────────────────────────────────
// Station names come only from data-tokyo.json (build-data.js bakes in the
// fixes, including the OSM name:en values); nothing is fetched at runtime.

async function loadData() {
  setLoadingStatus(t('checkingCache'));
  store.remove('random_game_v12'); // previous cache format (lines + OSM names)

  // ── Try localStorage cache ─────────────────────────────────────────────
  try {
    const parsed = JSON.parse(store.get(CACHE_KEY) || 'null');
    if (parsed && Date.now() - parsed.timestamp < CACHE_TTL && parsed.lines?.length > 0) {
      setLoadingStatus(t('loadingCache'));
      buildIndex(parsed.lines);
      return;
    }
  } catch (_) { /* corrupt cache: fetch fresh */ }

  // ── Fetch fresh ───────────────────────────────────────────────────────
  setLoadingStatus(t('loadingTrain'));
  let lines;
  try {
    lines = await fetch(DATA_URL).then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); });
  } catch (err) {
    showError(t('errorLoad', { msg: err.message }));
    return;
  }

  if (!lines?.length) {
    showError(t('errorEmpty'));
    return;
  }

  store.set(CACHE_KEY, JSON.stringify({ timestamp: Date.now(), lines })); // full storage: no problem
  buildIndex(lines);
}

// Stations are looked up by normalized EN name, so two different stations
// with the same name (Iriya on the Hibiya vs the Sagami Line) would merge and
// offer each other's lines. The station nearest central Tokyo keeps the plain
// name; each other distinct station (entries > 1 km apart) gets its line
// appended: "Iriya (JR Sagami)". Returns the new names.
const SAME_STATION_KM = 1;
function disambiguateSharedNames(lines) {
  const km = (a, b) => Math.hypot((a.lat - b.lat) * 111, (a.lng - b.lng) * 91);
  const TOKYO = { lat: 35.681, lng: 139.767 };
  const added = [];
  for (const [key, entries] of Object.entries(state.stationIndex)) {
    if (entries.length < 2) continue;
    const stnOf = e => lines[e.lineIdx].stations[e.stationIdx];
    // Group entries into physical stations
    const clusters = [];
    for (const e of entries) {
      const c = clusters.find(c => km(stnOf(c[0]), stnOf(e)) <= SAME_STATION_KM);
      if (c) c.push(e); else clusters.push([e]);
    }
    if (clusters.length < 2) continue;
    clusters.sort((a, b) => km(stnOf(a[0]), TOKYO) - km(stnOf(b[0]), TOKYO));
    state.stationIndex[key] = clusters[0];
    for (const c of clusters.slice(1)) {
      const name = `${stnOf(c[0]).name} (${c[0].lineName.replace(/ Line$/i, '')})`;
      for (const e of c) stnOf(e).name = name;
      (state.stationIndex[normalize(name)] ||= []).push(...c);
      added.push(name);
    }
  }
  return added;
}

function buildIndex(lines) {
  state.lines = lines = lines.filter(l => !LINE_REMOVE.includes(l.name));
  for (const l of lines) {
    if (LINE_NAME_FIXES[l.name]) l.name = LINE_NAME_FIXES[l.name];
    if (LINE_COLOR_FIXES[l.name]) l.color = LINE_COLOR_FIXES[l.name];
    // Renamed stations first, so every later table uses the current JA name
    for (const s of l.stations) {
      const r = STATION_RENAMES[s.ja];
      if (r) { s.ja = r.ja; if (r.name) s.name = r.name; }
    }
    if (LINE_PREPEND_STATIONS[l.name]) l.stations.unshift(...LINE_PREPEND_STATIONS[l.name]);
    if (LINE_EXTRA_STATIONS[l.name]) l.stations.push(...LINE_EXTRA_STATIONS[l.name]);
    const removeJa = LINE_REMOVE_STATIONS[l.name];
    if (removeJa) l.stations = l.stations.filter(s => !removeJa.includes(s.ja));
    for (const ins of (LINE_INSERT_STATIONS[l.name] || [])) {
      const idx = l.stations.findIndex(s => s.ja === ins.after);
      const existing = l.stations.find(s => s.ja === ins.ja);
      // repeat: a station the line passes twice — copy the existing entry
      if (idx === -1 || (existing && !ins.repeat) || (ins.repeat && !existing)) continue;
      if (ins.repeat && l.stations[idx + 1]?.ja === ins.ja) continue; // already applied
      l.stations.splice(idx + 1, 0, ins.repeat
        ? { ...existing }
        : { name: ins.name, ja: ins.ja, lat: ins.lat, lng: ins.lng });
    }
    const trimJa = LINE_TRIM_AFTER[l.name];
    if (trimJa) {
      const idx = l.stations.findIndex(s => s.ja === trimJa);
      if (idx >= 0) l.stations.splice(idx + 1);
    }
    // Deduplicate consecutive stations with the same ja name (e.g. Sotetsu Main Line duplicate Nishiya)
    l.stations = l.stations.filter((s, i) => i === 0 || s.ja !== l.stations[i - 1].ja);
  }

  // Split lines that upstream stores as joined segments (LINE_SPLITS)
  for (const [name, parts] of Object.entries(LINE_SPLITS)) {
    const i = lines.findIndex(l => l.name === name);
    if (i === -1) continue;
    const src = lines[i];
    const pieces = parts.map(part => ({ ...src, name: part.name,
      stations: part.stations.map(ja => src.stations.find(s => s.ja === ja)).filter(Boolean).map(s => ({ ...s })) }));
    if (pieces.some((p, k) => p.stations.length !== parts[k].stations.length)) {
      console.warn(`[LINE_SPLITS] a listed station is missing from ${name}; left unsplit`);
      continue;
    }
    lines.splice(i, 1, ...pieces);
  }

  // Fix upstream station name quirks
  for (const l of lines) {
    for (const s of l.stations) {
      // Normalize Oshiage bracket styles to one canonical form
      if (s.ja === '押上（スカイツリー前）' || s.ja === '押上〈スカイツリー前〉') {
        s.name = 'Oshiage (Skytree)';
        s.ja = '押上(スカイツリー前)';
      }
    }
  }

  // Fix upstream bad translation: 東成田 is "Higashi-Narita", not "Higashidada"
  const shibayamaLine = lines.find(l => l.name === 'Shibayama Railway Line');
  const higashiNaritaStn = shibayamaLine?.stations.find(s => s.ja === '東成田');
  if (higashiNaritaStn) higashiNaritaStn.name = 'Higashi-Narita';

  // 新逗子 was renamed 逗子・葉山 in March 2020 (upstream EN name already updated).
  const zushiHayamaStn = lines.find(l => l.name === 'Keikyu Zushi Line')
    ?.stations.find(s => s.ja === '新逗子');
  if (zushiHayamaStn) zushiHayamaStn.ja = '逗子・葉山';

  // Keisei Higashi-Narita Line (京成東成田線) — short branch not in upstream data
  // Shares Keisei Narita with the Main Line; Shibayama Railway covers the onward leg
  const keiseiNarita = lines.find(l => l.name === 'Keisei Main Line')
    ?.stations.find(s => s.ja === '京成成田');
  if (keiseiNarita && higashiNaritaStn) {
    lines.push({
      name: 'Keisei Higashi-Narita Line', color: '#8B6DAF',
      stations: [
        { name: keiseiNarita.name, ja: '京成成田', lat: keiseiNarita.lat,     lng: keiseiNarita.lng },
        { name: 'Higashi-Narita', ja: '東成田',   lat: higashiNaritaStn.lat, lng: higashiNaritaStn.lng },
      ],
    });
  }

  // Reuse existing station coords where possible for transfer detection
  const _findStn = (ja) => {
    for (const l of lines) for (const s of l.stations) if (s.ja === ja) return s;
    return null;
  };

  // (Keikyu Airport through-running now handled by LINE_CONNECTIONS)

  // Tokaido Shinkansen (東海道新幹線) — Tokyo to Shizuoka
  const _stnCoord = (ja, fallback) => {
    const s = _findStn(ja);
    return s ? { lat: s.lat, lng: s.lng } : fallback;
  };
  lines.push({
    name: 'Tokaido Shinkansen', color: '#0073CF',
    stations: [
      { name: 'Tokyo',         ja: '東京',   ..._stnCoord('東京',   { lat: 35.6812, lng: 139.7671 }) },
      { name: 'Shinagawa',     ja: '品川',   ..._stnCoord('品川',   { lat: 35.6284, lng: 139.7387 }) },
      { name: 'Shin-Yokohama', ja: '新横浜', ..._stnCoord('新横浜', { lat: 35.5064, lng: 139.6176 }) },
      { name: 'Odawara',       ja: '小田原', ..._stnCoord('小田原', { lat: 35.2564, lng: 139.1551 }) },
      { name: 'Atami',         ja: '熱海',   ..._stnCoord('熱海',   { lat: 35.1041, lng: 139.0779 }) },
      { name: 'Mishima',       ja: '三島',   ..._stnCoord('三島',   { lat: 35.1276, lng: 138.9110 }) },
      { name: 'Shin-Fuji',     ja: '新富士', lat: 35.1415, lng: 138.6654 },
      { name: 'Shizuoka',      ja: '静岡',   ..._stnCoord('静岡',   { lat: 34.9717, lng: 138.3890 }) },
    ],
  });

  // Tohoku Shinkansen (東北新幹線) — Tokyo to Utsunomiya
  lines.push({
    name: 'Tohoku Shinkansen', color: '#00B261',
    stations: [
      { name: 'Tokyo',      ja: '東京',   ..._stnCoord('東京',   { lat: 35.6812, lng: 139.7671 }) },
      { name: 'Ueno',       ja: '上野',   ..._stnCoord('上野',   { lat: 35.7138, lng: 139.7770 }) },
      { name: 'Omiya',      ja: '大宮',   ..._stnCoord('大宮',   { lat: 35.9064, lng: 139.6241 }) },
      { name: 'Oyama (Tochigi)', ja: '小山',   ..._stnCoord('小山',   { lat: 36.3127, lng: 139.8062 }) },
      { name: 'Utsunomiya', ja: '宇都宮', ..._stnCoord('宇都宮', { lat: 36.5592, lng: 139.8984 }) },
    ],
  });

  // Joetsu Shinkansen (上越新幹線) — Tokyo to Takasaki
  lines.push({
    name: 'Joetsu Shinkansen', color: '#E44D93',
    stations: [
      { name: 'Tokyo',        ja: '東京',     ..._stnCoord('東京',   { lat: 35.6812, lng: 139.7671 }) },
      { name: 'Ueno',         ja: '上野',     ..._stnCoord('上野',   { lat: 35.7138, lng: 139.7770 }) },
      { name: 'Omiya',        ja: '大宮',     ..._stnCoord('大宮',   { lat: 35.9064, lng: 139.6241 }) },
      { name: 'Kumagaya',     ja: '熊谷',     ..._stnCoord('熊谷',   { lat: 36.1396, lng: 139.3895 }) },
      { name: 'Honjo-Waseda', ja: '本庄早稲田', lat: 36.2336, lng: 139.1736 },
      { name: 'Takasaki',     ja: '高崎',     ..._stnCoord('高崎',   { lat: 36.3222, lng: 139.0124 }) },
    ],
  });

  // Sotetsu–JR Direct Line (相鉄・JR直通線) — opened 2019, not in upstream data.
  // Saikyo through-trains run Osaki–Hazawa over the Tokaido freight tracks,
  // continuing onto the Sotetsu Main Line at Nishiya toward Ebina.
  lines.push({
    name: 'Sotetsu-JR Direct Line', ja: '相鉄・JR直通線', color: '#003087',
    stations: [
      { name: 'Osaki',                   ja: '大崎',         ..._stnCoord('大崎',         { lat: 35.6197, lng: 139.7286 }) },
      { name: 'Nishi-Oi',                ja: '西大井',       ..._stnCoord('西大井',       { lat: 35.6017, lng: 139.7217 }) },
      { name: 'Musashi-Kosugi',          ja: '武蔵小杉',     ..._stnCoord('武蔵小杉',     { lat: 35.5766, lng: 139.6597 }) },
      { name: 'Hazawa Yokohama-Kokudai', ja: '羽沢横浜国大', ..._stnCoord('羽沢横浜国大', { lat: 35.4801, lng: 139.5934 }) },
    ],
  });

  // Disney Resort Line (ディズニーリゾートライン) — monorail loop, not in upstream data.
  // Trains run one way only (counterclockwise): stations in travel order, oneWay keeps direction B (+1).
  lines.push({
    name: 'Disney Resort Line', ja: 'ディズニーリゾートライン', color: '#38B6E8',
    circular: true, oneWay: 'B',
    stations: [
      { name: 'Resort Gateway',   ja: 'リゾートゲートウェイ・ステーション', lat: 35.635222, lng: 139.885083 },
      { name: 'Tokyo Disneyland', ja: '東京ディズニーランド・ステーション', lat: 35.635889, lng: 139.878639 },
      { name: 'Bayside',          ja: 'ベイサイド・ステーション',           lat: 35.627944, lng: 139.876417 },
      { name: 'Tokyo DisneySea',  ja: '東京ディズニーシー・ステーション',   lat: 35.627389, lng: 139.889472 },
    ],
  });

  const nameSet = new Set();

  for (let li = 0; li < lines.length; li++) {
    for (let si = 0; si < lines[li].stations.length; si++) {
      const stn = lines[li].stations[si];

      // Strip "Station" suffix from bad upstream translations
      if (stn.name.endsWith(' Station')) stn.name = stn.name.slice(0, -8);

      const key = normalize(stn.name);
      nameSet.add(stn.name);

      if (!state.stationIndex[key]) state.stationIndex[key] = [];
      state.stationIndex[key].push({ lineName: lines[li].name, lineColor: lines[li].color, lineIdx: li, stationIdx: si });
    }
  }

  for (const renamed of disambiguateSharedNames(lines)) nameSet.add(renamed);
  for (const name of [...nameSet]) if (!state.stationIndex[normalize(name)]) nameSet.delete(name);

  state.stationNames = Array.from(nameSet).sort();
  state.stationNamesNorm = state.stationNames.map(normalize);
  state.stationNamesJa = state.stationNames.map(name => {
    const entries = state.stationIndex[normalize(name)] || [];
    if (!entries.length) return '';
    return state.lines[entries[0].lineIdx].stations[entries[0].stationIdx].ja || '';
  });
  state.stationNames23 = state.stationNames.filter(name => {
    const entries = state.stationIndex[normalize(name)] || [];
    if (!entries.length) return false;
    const stn = state.lines[entries[0].lineIdx].stations[entries[0].stationIdx];
    return isIn23Wards(stn.lat, stn.lng);
  });
  state.stationNames23Norm = state.stationNames23.map(normalize);
  state.stationNames23Ja = state.stationNames23.map(name => {
    const entries = state.stationIndex[normalize(name)] || [];
    if (!entries.length) return '';
    return state.lines[entries[0].lineIdx].stations[entries[0].stationIdx].ja || '';
  });
  buildSpatialIndex();
  resolveConnections();
  setLoadingStatus('');
  hideLoading();
}

function buildSpatialIndex() {
  const CELL = state.spatialCell;
  const grid = new Map();
  for (const line of state.lines) {
    for (const stn of line.stations) {
      const key = `${Math.floor(stn.lat / CELL)},${Math.floor(stn.lng / CELL)}`;
      if (!grid.has(key)) grid.set(key, []);
      grid.get(key).push({ name: stn.name, lat: stn.lat, lng: stn.lng });
    }
  }
  state.spatialGrid = grid;
}
