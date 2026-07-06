const LINE_NAME_FIXES = {
  'Toden Arakawa Line': 'Tokyo Sakura Tram',
};

// Stations opened after the upstream data snapshot, inserted mid-line
// (LINE_EXTRA_STATIONS only appends to line ends). `after` is the JA name
// of the preceding station in the line's station order.
const LINE_INSERT_STATIONS = {
  'JR Keiyo Line': [
    // Opened March 2023, between Shin-Narashino and Kaihin-Makuhari
    { after: '新習志野', name: 'Makuhari-Toyosuna', ja: '幕張豊砂', lat: 35.6597, lng: 140.0284 },
  ],
};

// Override upstream line colors with official line colors
const LINE_COLOR_FIXES = {
  // ── Tokyu — upstream gives all a generic #0066B3 ──
  'Tokyu Toyoko Line':        '#DA0442', // red
  'Tokyu Den-en-toshi Line':  '#20A288', // green/teal
  'Tokyu Meguro Line':        '#009CD2', // light blue
  'Tokyu Oimachi Line':       '#F18C43', // orange
  'Tokyu Ikegami Line':       '#EE86A7', // pink
  'Tokyu Tamagawa Line':      '#AE0378', // magenta
  'Tokyu Setagaya Line':      '#FCC70D', // yellow
  'Tokyu Kodomo-no-kuni Line':'#0068B7', // blue
  'Tokyu Shin-Yokohama Line': '#890d84', // violet
  // ── Tokyo Metro ──
  'Tokyo Metro Hibiya Line':  '#B5B5AC', // silver/gray (upstream #9B7A00)
  // ── Toei — upstream shades are off ──
  'Toei Asakusa Line':        '#EC6E65', // rose/salmon (upstream #EE0011)
  'Toei Mita Line':           '#006CB6', // medium blue (upstream #2B50A1)
  'Toei Shinjuku Line':       '#B0C124', // leaf/yellow-green (upstream #6CBB5A)
  'Toei Oedo Line':           '#CE045B', // ruby (upstream #B6007A)
  // ── Keio — upstream gives all #800080 ──
  'Keio Line':                '#E3379F', // cherry pink
  'Keio new line':            '#E3379F',
  'Keio Sagamihara line':     '#E3379F',
  'Keio Dobutsuen Line':      '#E3379F',
  'Keio Racecourse Line':     '#E3379F',
  'Keio Takaoka Line':        '#E3379F',
  'Keio Inokashira line':     '#1A407B', // dark navy
  // ── Keikyu — upstream has random colors per line ──
  'Keikyu Main Line':         '#E4002B', // Keikyu red
  'Keikyu Airport Line':      '#E4002B',
  'Keikyu Daishi Line':       '#E4002B',
  'Keikyu Kurihama Line':     '#E4002B',
  'Keikyu Zushi Line':        '#E4002B',
  // ── Seibu — upstream gives generic greens ──
  'Seibu Ikebukuro Line':     '#ED772D', // orange
  'Seibu Chichibu Line':      '#ED772D',
  'Seibu Haijima Line':       '#ED772D',
  'Seibu Kokubunji Line':     '#ED772D',
  'Seibu Sayama Line':        '#ED772D',
  'Seibu Toshima Line':       '#ED772D',
  'Seibu Tama Lake Line':     '#ED772D',
  'Seibu Tamaegawa Line':     '#ED772D',
  'Seibu Seibu-en Line':      '#ED772D',
  'Seibu Yurakucho Line':     '#F9AA00', // gold (upstream #C9A800)
  // ── Tobu — upstream gives all #003087 ──
  'Tobu Isesaki Line':        '#005AAA', // blue
  'Tobu Kameido Line':        '#005AAA',
  'Tobu Tojo Line':           '#004098', // dark blue
  'Tobu Noda line':           '#00BFFF', // sky blue
  'Tobu Nikko Line':          '#FFA500', // orange
  'Tobu Utsunomiya Line':     '#FFA500',
  // ── JR — wrong upstream colors ──
  'JR Chuo-Sobu Line':        '#FFD400', // yellow (upstream #E85B0B = same as Chuo Rapid)
  'JR Yokosuka Line':         '#0068B7', // navy blue (upstream #7d654a brown)
  'JR Musashino Line':        '#F77321', // orange (upstream #f1f04d pale yellow)
  'JR Takasaki Line':         '#F68B1E', // orange (upstream #424d6d dark gray)
  'JR Negishi Line':          '#00B2E5', // sky blue, matches KT (upstream #d477d1 pink)
  'JR Sagami Line':           '#8BC31F', // green (upstream #003087 dark navy)
  // ── Other ──
  'Minato Mirai Line':        '#0068B7', // blue (upstream #f7fccc near-invisible)
  'Rinkai Line':              '#0065A6', // dark blue (upstream #767c78 gray)
};

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

// Trim lines at a given station (inclusive) — drop everything beyond it
const LINE_TRIM_AFTER = {};

// Lines absorbed into other lines
// Ueno Tokyo Line is a brand name for Tokaido↔northern through-service (handled by connections)
const LINE_REMOVE = ['Ueno Tokyo Line', 'JR Chuo Main Line'];
