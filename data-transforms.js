const LINE_NAME_FIXES = {};

// Stations prepended to the beginning of lines
const LINE_PREPEND_STATIONS = {};

// (Keikyu Airport through-running now handled by LINE_CONNECTIONS)

// Stations appended to the end of lines
const LINE_EXTRA_STATIONS = {
  'JR Tokaido Main Line': [
    { name: 'Kannami',           ja: '函南',      lat: 35.0873, lng: 139.0044 },
    { name: 'Mishima',           ja: '三島',      lat: 35.1276, lng: 138.9110 },
    { name: 'Numazu',            ja: '沼津',      lat: 35.1015, lng: 138.8635 },
    { name: 'Katahama',          ja: '片浜',      lat: 35.1180, lng: 138.8195 },
    { name: 'Hara',              ja: '原',        lat: 35.1248, lng: 138.7937 },
    { name: 'Higashi-Tagonoura', ja: '東田子の浦', lat: 35.1361, lng: 138.7461 },
    { name: 'Yoshiwara',         ja: '吉原',      lat: 35.1439, lng: 138.7023 },
    { name: 'Fuji',              ja: '富士',      lat: 35.1515, lng: 138.6512 },
    { name: 'Fujikawa',          ja: '富士川',    lat: 35.1283, lng: 138.6187 },
    { name: 'Shin-Kambara',      ja: '新蒲原',    lat: 35.1101, lng: 138.5775 },
    { name: 'Kambara',           ja: '蒲原',      lat: 35.1062, lng: 138.5615 },
    { name: 'Yui',               ja: '由比',      lat: 35.1026, lng: 138.5247 },
    { name: 'Okitsu',            ja: '興津',      lat: 35.0615, lng: 138.4870 },
    { name: 'Shimizu',           ja: '清水',      lat: 35.0164, lng: 138.4882 },
    { name: 'Kusanagi',          ja: '草薙',      lat: 34.9904, lng: 138.4341 },
    { name: 'Higashi-Shizuoka',  ja: '東静岡',    lat: 34.9805, lng: 138.4144 },
    { name: 'Shizuoka',          ja: '静岡',      lat: 34.9717, lng: 138.3890 },
  ],
};

// (LINE_REVERSE removed — Tokaido through-running now handled by LINE_CONNECTIONS)
const LINE_REVERSE = [];

// (LINE_THROUGH_STATIONS removed — through-running now handled by LINE_CONNECTIONS)
const LINE_THROUGH_STATIONS = {};

// Trim lines at a given station (inclusive) — drop everything beyond it
const LINE_TRIM_AFTER = {
  'JR Chuo Main Line': '甲府',
};

// Lines absorbed into other lines
// Ueno Tokyo Line is a brand name for Tokaido↔northern through-service (handled by connections)
const LINE_REMOVE = ['Ueno Tokyo Line'];
