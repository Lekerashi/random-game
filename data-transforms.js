const LINE_NAME_FIXES = {};

// Stations prepended to the beginning of lines
const LINE_PREPEND_STATIONS = {};

// (Keikyu Airport through-running now handled by LINE_CONNECTIONS)

// Stations appended to the end of lines
const LINE_EXTRA_STATIONS = {
  // Chuo Main Line removed — extend Chuo Line (rapid) beyond Takao to Kofu
  'JR Chuo Line': [
    { name: 'Sagamiko',         ja: '相模湖',       lat: 35.6173, lng: 139.1885 },
    { name: 'Fujino',           ja: '藤野',         lat: 35.6159, lng: 139.1524 },
    { name: 'Uenohara',         ja: '上野原',       lat: 35.6187, lng: 139.1158 },
    { name: 'Shiotsu',          ja: '四方津',       lat: 35.6143, lng: 139.0726 },
    { name: 'Yanagawa',         ja: '梁川',         lat: 35.6053, lng: 139.0381 },
    { name: 'Torisawa',         ja: '鳥沢',         lat: 35.6081, lng: 139.0033 },
    { name: 'Saruhashi',        ja: '猿橋',         lat: 35.6129, lng: 138.9684 },
    { name: 'Otsuki',           ja: '大月',         lat: 35.6132, lng: 138.9427 },
    { name: 'Hatsukari',        ja: '初狩',         lat: 35.5943, lng: 138.8840 },
    { name: 'Sasago',           ja: '笹子',         lat: 35.6039, lng: 138.8252 },
    { name: 'Kai-Yamato',       ja: '甲斐大和',     lat: 35.6394, lng: 138.7816 },
    { name: 'Katsunumabudokyo', ja: '勝沼ぶどう郷', lat: 35.6728, lng: 138.7432 },
    { name: 'Enzan',            ja: '塩山',         lat: 35.7053, lng: 138.7348 },
    { name: 'Higashi-Yamanashi', ja: '東山梨',      lat: 35.6943, lng: 138.7030 },
    { name: 'Yamanashishi',     ja: '山梨市',       lat: 35.6850, lng: 138.6830 },
    { name: 'Kasugaicho',       ja: '春日居町',     lat: 35.6735, lng: 138.6590 },
    { name: 'Isawa-Onsen',      ja: '石和温泉',     lat: 35.6576, lng: 138.6346 },
    { name: 'Sakaori',          ja: '酒折',         lat: 35.6595, lng: 138.5989 },
    { name: 'Kofu',             ja: '甲府',         lat: 35.6671, lng: 138.5690 },
  ],
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
const LINE_TRIM_AFTER = {};

// Lines absorbed into other lines
// Ueno Tokyo Line is a brand name for Tokaido↔northern through-service (handled by connections)
const LINE_REMOVE = ['Ueno Tokyo Line', 'JR Chuo Main Line'];
