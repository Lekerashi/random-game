'use strict';

// ── Save Session Image ────────────────────────────────────────────────────

// Compute lat/lng bounding box from route history entries
function computeRouteBounds(history) {
  let minLat = Infinity, maxLat = -Infinity, minLng = Infinity, maxLng = -Infinity;
  for (const e of history) {
    if (e.routeCoords) for (const c of e.routeCoords) {
      minLat = Math.min(minLat, c[0]); maxLat = Math.max(maxLat, c[0]);
      minLng = Math.min(minLng, c[1]); maxLng = Math.max(maxLng, c[1]);
    }
    if (e.fromLat != null) { minLat = Math.min(minLat, e.fromLat); maxLat = Math.max(maxLat, e.fromLat); minLng = Math.min(minLng, e.fromLng); maxLng = Math.max(maxLng, e.fromLng); }
    if (e.toLat != null) { minLat = Math.min(minLat, e.toLat); maxLat = Math.max(maxLat, e.toLat); minLng = Math.min(minLng, e.toLng); maxLng = Math.max(maxLng, e.toLng); }
  }
  if (!isFinite(minLat)) { minLat = 35.5; maxLat = 35.8; minLng = 139.5; maxLng = 139.9; }
  // Padding (25%)
  const lp = (maxLat - minLat) * 0.25 || 0.015, gp = (maxLng - minLng) * 0.25 || 0.015;
  return { minLat: minLat - lp, maxLat: maxLat + lp, minLng: minLng - gp, maxLng: maxLng + gp };
}

// Compute Web Mercator projection: zoom, tile range, and coordinate transform functions.
// Returns { zoom, toX, toY, originX, originY, DPR, txMin, txMax, tyMin, tyMax }
function computeMapProjection(bounds, mapW, mapH, DPR) {
  const mercY = (lat) => Math.log(Math.tan(Math.PI / 4 + lat * Math.PI / 360));
  const mMin = mercY(bounds.minLat), mMax = mercY(bounds.maxLat);
  let zoom = 8; // widest, if even that doesn't fit
  for (let z = 16; z >= 8; z--) {
    const n = Math.pow(2, z);
    const pxW = ((bounds.maxLng - bounds.minLng) / 360) * n * 256;
    const pxH = ((mMax - mMin) / (2 * Math.PI)) * n * 256;
    if (pxW <= mapW * DPR && pxH <= mapH * DPR) { zoom = z; break; }
  }
  // Expand bounds to fill map area at this zoom level
  const n = Math.pow(2, zoom);
  const neededLng = (mapW * DPR) / (n * 256) * 360;
  const neededMerc = (mapH * DPR) / (n * 256) * 2 * Math.PI;
  const midLng = (bounds.minLng + bounds.maxLng) / 2;
  const midM = (mMin + mMax) / 2;
  const minLng = midLng - neededLng / 2, maxLng = midLng + neededLng / 2;
  const invMerc = (y) => (2 * Math.atan(Math.exp(y)) - Math.PI / 2) * 180 / Math.PI;
  const minLat = invMerc(midM - neededMerc / 2), maxLat = invMerc(midM + neededMerc / 2);

  const lngToTile = (lng) => Math.floor((lng + 180) / 360 * n);
  const latToTile = (lat) => Math.floor((1 - Math.log(Math.tan(lat * Math.PI / 180) + 1 / Math.cos(lat * Math.PI / 180)) / Math.PI) / 2 * n);
  const lngToPx = (lng) => ((lng + 180) / 360) * n * 256;
  const latToPx = (lat) => ((1 - Math.log(Math.tan(lat * Math.PI / 180) + 1 / Math.cos(lat * Math.PI / 180)) / Math.PI) / 2) * n * 256;
  const originX = lngToPx(minLng), originY = latToPx(maxLat);
  return {
    zoom, DPR, originX, originY,
    toX: (lng) => (lngToPx(lng) - originX) / DPR,
    toY: (lat) => (latToPx(lat) - originY) / DPR,
    txMin: lngToTile(minLng), txMax: lngToTile(maxLng),
    tyMin: latToTile(maxLat), tyMax: latToTile(minLat),
  };
}

// Load map tiles as images (CORS-enabled). Returns Promise<tiles[]>.
function loadMapTiles(proj) {
  const tileUrls = [];
  for (let tx = proj.txMin; tx <= proj.txMax; tx++) {
    for (let ty = proj.tyMin; ty <= proj.tyMax; ty++) {
      tileUrls.push({ tx, ty, url: 'https://a.basemaps.cartocdn.com/dark_all/' + proj.zoom + '/' + tx + '/' + ty + '.png?key=' + CARTO_KEY });
    }
  }
  const loadTile = (t) => new Promise((res) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => res({ ...t, img });
    img.onerror = () => res({ ...t, img: null });
    img.src = t.url;
  });
  return Promise.all(tileUrls.map(loadTile));
}

// Draw tile images or TOKYO_GEO vector fallback onto clipped map area
function renderMapBase(ctx, tiles, proj, mapY) {
  let tilesDrawn = 0;
  for (const t of tiles) {
    if (!t.img) continue;
    const tx = t.tx * 256, ty = t.ty * 256;
    const dx = (tx - proj.originX) / proj.DPR, dy = (ty - proj.originY) / proj.DPR + mapY;
    ctx.drawImage(t.img, dx, dy, 256 / proj.DPR, 256 / proj.DPR);
    tilesDrawn++;
  }
  if (tilesDrawn === 0 && typeof TOKYO_GEO !== 'undefined') {
    for (const feat of TOKYO_GEO.features) {
      const ft = feat.properties.type, geom = feat.geometry;
      if (geom.type === 'Polygon') {
        const ring = geom.coordinates[0];
        ctx.beginPath();
        for (let i = 0; i < ring.length; i++) {
          const x = proj.toX(ring[i][0]), y = proj.toY(ring[i][1]) + mapY;
          if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        }
        ctx.closePath();
        if (ft === 'water') { ctx.fillStyle = '#0f2a45'; ctx.fill(); }
        else if (ft === 'prefecture') { ctx.fillStyle = '#161b22'; ctx.fill(); ctx.strokeStyle = '#2a3545'; ctx.lineWidth = 1; ctx.stroke(); }
        else if (ft === 'ward') { ctx.strokeStyle = '#2a3545'; ctx.lineWidth = 0.5; ctx.stroke(); }
      } else if (geom.type === 'LineString' && ft === 'river') {
        ctx.beginPath();
        for (let i = 0; i < geom.coordinates.length; i++) {
          const x = proj.toX(geom.coordinates[i][0]), y = proj.toY(geom.coordinates[i][1]) + mapY;
          if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        }
        ctx.strokeStyle = '#2a6090'; ctx.lineWidth = 1.5; ctx.stroke();
      }
    }
  }
}

// Draw route polylines from history onto the map
function renderRoutePolylines(ctx, history, proj, mapY) {
  for (const e of history) {
    if (e.drinkHere || e.flight) continue;
    ctx.beginPath();
    if (e.routeCoords && e.routeCoords.length >= 2) {
      for (let i = 0; i < e.routeCoords.length; i++) {
        const x = proj.toX(e.routeCoords[i][1]), y = proj.toY(e.routeCoords[i][0]) + mapY;
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
    } else if (e.fromLat != null && e.toLat != null) {
      ctx.moveTo(proj.toX(e.fromLng), proj.toY(e.fromLat) + mapY);
      ctx.lineTo(proj.toX(e.toLng), proj.toY(e.toLat) + mapY);
    } else { continue; }
    ctx.strokeStyle = e.color || '#8b949e'; ctx.lineWidth = 3; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.stroke();
  }
}

// Draw markers and labels with collision avoidance onto the map
function renderMapMarkers(ctx, history, proj, mapY) {
  const markers = collectRouteMarkers(history);
  for (const [, m] of markers) m.name = currentLang === 'ja' && m.ja ? m.ja : m.name;
  for (const [, m] of markers) {
    const x = proj.toX(m.lng), y = proj.toY(m.lat) + mapY;
    if (m.type === 'drink') {
      ctx.font = '14px serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText('\uD83C\uDF7A', x, y);
    } else if (m.type === 'start') {
      ctx.fillStyle = '#e6edf3'; ctx.beginPath(); ctx.arc(x, y, 5, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#30363d'; ctx.lineWidth = 1.5; ctx.stroke();
    } else {
      ctx.fillStyle = '#58a6ff'; ctx.beginPath(); ctx.arc(x, y, 3.5, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#30363d'; ctx.lineWidth = 1; ctx.stroke();
    }
  }
  // Labels with collision avoidance (try above, below, right, left)
  const labels = [];
  function lblCollides(lx, ly, tw) {
    return labels.some(function(p) { return Math.abs(lx - p.x) < (tw + p.w) / 2 + 4 && Math.abs(ly - p.y) < 12; });
  }
  for (const [, m] of markers) {
    if (m.type !== 'start' && m.type !== 'drink') continue;
    const x = proj.toX(m.lng), y = proj.toY(m.lat) + mapY;
    ctx.font = 'bold 9px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
    const tw = ctx.measureText(m.name).width;
    const gap = m.type === 'drink' ? 12 : 10;
    const candidates = [
      { lx: x, ly: y - gap, align: 'center', base: 'bottom' },
      { lx: x, ly: y + gap + 4, align: 'center', base: 'top' },
      { lx: x + gap + 2, ly: y, align: 'left', base: 'middle' },
      { lx: x - gap - 2, ly: y, align: 'right', base: 'middle' },
    ];
    for (const c of candidates) {
      if (!lblCollides(c.lx, c.ly, tw)) {
        ctx.textAlign = c.align; ctx.textBaseline = c.base;
        ctx.strokeStyle = '#0d1117'; ctx.lineWidth = 3; ctx.lineJoin = 'round';
        ctx.strokeText(m.name, c.lx, c.ly);
        ctx.fillStyle = '#e6edf3'; ctx.fillText(m.name, c.lx, c.ly);
        labels.push({ x: c.lx, y: c.ly, w: tw });
        break;
      }
    }
  }
}

// Draw stats grid (stations, lines, stops, drinks, distance) below the map
function renderSessionStats(ctx, W, PAD, statsY) {
  const s = getSessionStats();
  ctx.strokeStyle = '#30363d'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(PAD, statsY); ctx.lineTo(W - PAD, statsY); ctx.stroke();

  const colW = (W - PAD * 2) / 2;
  const statItems = [
    { val: String(s.stations), label: t('statStations') },
    { val: String(s.lines),    label: t('statLines') },
    { val: String(s.totalStops), label: t('statStops') },
    { val: String(s.drinks),   label: t('statDrinks') },
  ];
  ctx.textBaseline = 'alphabetic';
  for (let i = 0; i < 4; i++) {
    const col = i % 2, row = Math.floor(i / 2);
    const cx = PAD + col * colW + colW / 2, cy = statsY + 14 + row * 46;
    ctx.fillStyle = '#e6edf3'; ctx.font = 'bold 20px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'; ctx.textAlign = 'center';
    ctx.fillText(statItems[i].val, cx, cy + 16);
    ctx.fillStyle = '#8b949e'; ctx.font = '10px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
    ctx.fillText(statItems[i].label, cx, cy + 30);
  }
  ctx.fillStyle = '#e6edf3'; ctx.font = 'bold 18px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'; ctx.textAlign = 'center';
  ctx.fillText(s.distKm + ' km', W / 2, statsY + 112);
  ctx.fillStyle = '#8b949e'; ctx.font = '10px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
  ctx.fillText(t('statDistance'), W / 2, statsY + 126);
}

function saveSessionImage() {
  if (state.history.length === 0) return;

  const DPR = 2;
  const W = 360, MAP_H = 340, STAT_H = 140, PAD = 16;
  const TITLE_H = 56, FOOTER_H = 28;
  const H = TITLE_H + MAP_H + STAT_H + FOOTER_H;
  const mapY = TITLE_H;

  const bounds = computeRouteBounds(state.history);
  const proj = computeMapProjection(bounds, W, MAP_H, DPR);

  loadMapTiles(proj).then(function(tiles) {
    const canvas = document.createElement('canvas');
    canvas.width = W * DPR; canvas.height = H * DPR;
    const ctx = canvas.getContext('2d');
    ctx.scale(DPR, DPR);

    // Background + Title
    ctx.fillStyle = '#0d1117';
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#e6edf3';
    ctx.font = 'bold 16px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(t('copyRouteHeader', { date: '' }).replace(/\s*—\s*$/, ''), W / 2, 26);
    const locale = currentLang === 'ja' ? 'ja-JP' : 'en-US';
    const dateStr = new Date().toLocaleDateString(locale, { weekday: 'short', month: 'short', day: 'numeric' });
    ctx.fillStyle = '#8b949e'; ctx.font = '12px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
    ctx.fillText(dateStr, W / 2, 44);

    // Map (clipped)
    ctx.save();
    ctx.beginPath(); ctx.rect(0, mapY, W, MAP_H); ctx.clip();
    renderMapBase(ctx, tiles, proj, mapY);
    renderRoutePolylines(ctx, state.history, proj, mapY);
    renderMapMarkers(ctx, state.history, proj, mapY);
    ctx.restore();
    ctx.fillStyle = '#8b949e'; ctx.font = '9px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'; ctx.textAlign = 'right';
    ctx.fillText('© OpenStreetMap contributors © CARTO', W - 4, mapY + MAP_H - 4);

    // Stats + Footer
    renderSessionStats(ctx, W, PAD, TITLE_H + MAP_H);
    ctx.fillStyle = '#484f58'; ctx.font = '11px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'; ctx.textAlign = 'center';
    ctx.fillText('randomgame.tokyo', W / 2, H - 8);

    // Export
    canvas.toBlob(function(blob) {
      if (!blob) return;
      const d = new Date();
      const filename = 'tokyo-random-game-' + d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0') + '-' + String(d.getHours()).padStart(2, '0') + String(d.getMinutes()).padStart(2, '0') + '.png';
      exportSessionImage(blob, filename);
    }, 'image/png');
  });
}

// Phones get the share sheet (save to photos, send to friends); desktops and
// browsers that can't share files download it. A share the browser refuses
// (the tap's activation can expire while tiles load) falls back to the download.
function exportSessionImage(blob, filename) {
  const file = new File([blob], filename, { type: 'image/png' });
  const isPhone = window.matchMedia?.('(pointer: coarse)').matches;
  if (isPhone && navigator.canShare?.({ files: [file] })) {
    navigator.share({ files: [file], title: document.title, text: 'randomgame.tokyo' })
      .catch(err => { if (err.name !== 'AbortError') downloadBlob(blob, filename); }); // AbortError: player closed the sheet
    return;
  }
  downloadBlob(blob, filename);
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function copyToClipboard(text, feedbackBtn) {
  navigator.clipboard.writeText(text).then(() => {
    const orig = feedbackBtn.textContent;
    feedbackBtn.textContent = t('copied');
    setTimeout(() => { feedbackBtn.textContent = orig; }, FEEDBACK_RESET_DELAY);
  }).catch(() => {
    const orig = feedbackBtn.textContent;
    feedbackBtn.textContent = t('copyFailed');
    setTimeout(() => { feedbackBtn.textContent = orig; }, FEEDBACK_RESET_DELAY);
  });
}
