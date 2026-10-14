const LINE_NAME_FIXES = {
  'Toden Arakawa Line': 'Tokyo Sakura Tram',
  // Shin-Keisei was absorbed into Keisei in April 2025
  'Shin-Keisei Line': 'Keisei Matsudo Line',
  'Keio Takaoka Line': 'Keio Takao Line',
};

// Stations renamed after the upstream snapshot, keyed by old JA name. Applied to
// every line before the other transforms, so all tables use the new JA name.
// `name` overrides the EN name (omit when upstream EN is already current).
const STATION_RENAMES = {
  // Keikyu, March 2020
  '花月園前': { ja: '花月総持寺' },
  '仲木戸': { ja: '京急東神奈川' },
  '産業道路': { ja: '大師橋' },
  '羽田空港国際線ターミナル': { ja: '羽田空港第3ターミナル' },
  '羽田空港国内線ターミナル': { ja: '羽田空港第1・第2ターミナル' },
  // Tokyo Monorail, March 2020
  '羽田空港国際線ビル': { ja: '羽田空港第3ターミナル' },
  '羽田空港第１ビル': { ja: '羽田空港第1ターミナル' },
  '羽田空港第２ビル': { ja: '羽田空港第2ターミナル' },
  // Yurikamome, March 2019
  '船の科学館': { ja: '東京国際クルーズターミナル' },
  '国際展示場正門': { ja: '東京ビッグサイト' },
  // Seibu Tamako / Yamaguchi (Leo Liner), March 2021
  '西武遊園地': { ja: '多摩湖', name: 'Tamako' },
  '遊園地西': { ja: '西武園ゆうえんち', name: 'Seibuen-yuenchi' },
  // Tokyu Den-en-toshi, October 2019
  '南町田': { ja: '南町田グランベリーパーク', name: 'Minami-machida Grandberry Park' },
  // Hitachinaka Seaside Railway, 2021
  '日工前': { ja: '工機前', name: 'Koki-mae' },
  // Upstream quirk: stray 駅 suffix
  '獨協大学前駅〈草加松原〉': { ja: '獨協大学前〈草加松原〉' },
};

// Lines upstream stores as several segments joined into one list. Each part
// lists its stations in travel order (JA); entries are copied from the original.
const LINE_SPLITS = {
  // Rapid tracks (上野–取手 + 中距離 beyond) vs local tracks (Chiyoda-through 各停, 綾瀬–取手)
  'JR Joban Line': [
    { name: 'JR Joban Line', stations: ['上野', '日暮里', '三河島', '南千住', '北千住', '松戸', '柏', '我孫子', '天王台', '取手',
      '藤代', '龍ケ崎市', '牛久', 'ひたち野うしく', '荒川沖', '土浦', '神立', '高浜', '石岡', '羽鳥', '岩間', '友部', '内原',
      '赤塚', '水戸', '勝田'] },
    { name: 'JR Joban Line (Local)', stations: ['綾瀬', '亀有', '金町', '松戸', '北松戸', '馬橋', '新松戸', '北小金', '南柏',
      '柏', '北柏', '我孫子', '天王台', '取手'] },
  ],
  'JR Narita Line': [
    { name: 'JR Narita Line', stations: ['佐倉', '酒々井', '成田', '久住', '滑河', '下総神崎', '大戸', '佐原',
      '香取', '水郷', '小見川', '笹川', '下総橘', '下総豊里', '椎柴', '松岸', '銚子'] },
    { name: 'JR Narita Line (Airport)', stations: ['成田', '空港第２ビル（第２旅客ターミナル）', '成田空港（第１旅客ターミナル）'] },
    { name: 'JR Narita Line (Abiko)', stations: ['我孫子', '東我孫子', '湖北', '新木', '布佐', '木下', '小林', '安食', '下総松崎', '成田'] },
  ],
  // 小川町–寄居 runs as a separate one-man shuttle (no through trains since 2005)
  'Tobu Tojo Line': [
    { name: 'Tobu Tojo Line', stations: ['池袋', '北池袋', '下板橋', '大山', '中板橋', 'ときわ台', '上板橋', '東武練馬',
      '下赤塚', '成増', '和光市', '朝霞', '朝霞台', '志木', '柳瀬川', 'みずほ台', '鶴瀬', 'ふじみ野', '上福岡', '新河岸',
      '川越', '川越市', '霞ヶ関', '鶴ヶ島', '若葉', '坂戸', '北坂戸', '高坂', '東松山', '森林公園', 'つきのわ', '武蔵嵐山',
      '小川町'] },
    { name: 'Tobu Tojo Line (Yorii)', stations: ['小川町', '東武竹沢', 'みなみ寄居', '男衾', '鉢形', '玉淀', '寄居'] },
  ],
  // Every non-limited-express train splits at 南栗橋 (no through 普通 north of it since 2017)
  'Tobu Nikko Line': [
    { name: 'Tobu Nikko Line', stations: ['東武動物公園', '杉戸高野台', '幸手', '南栗橋'] },
    { name: 'Tobu Nikko Line (Nikko)', stations: ['南栗橋', '栗橋', '新古河', '柳生', '板倉東洋大前', '藤岡', '静和',
      '新大平下', '栃木', '新栃木', '合戦場', '家中', '東武金崎', '楡木', '樅山', '新鹿沼', '北鹿沼', '板荷', '下小代',
      '明神', '下今市', '上今市', '東武日光'] },
  ],
  // 館林–伊勢崎 runs as a separate one-man section (no through 普通/区間急行 since 2020)
  'Tobu Isesaki Line': [
    { name: 'Tobu Isesaki Line', stations: ['浅草', 'とうきょうスカイツリー', '曳舟', '東向島', '鐘ヶ淵', '堀切', '牛田',
      '北千住', '小菅', '五反野', '梅島', '西新井', '竹ノ塚', '谷塚', '草加', '獨協大学前〈草加松原〉', '新田', '蒲生',
      '新越谷', '越谷', '北越谷', '大袋', 'せんげん台', '武里', '一ノ割', '春日部', '北春日部', '姫宮', '東武動物公園',
      '和戸', '久喜', '鷲宮', '花崎', '加須', '南羽生', '羽生', '川俣', '茂林寺前', '館林'] },
    { name: 'Tobu Isesaki Line (Isesaki)', stations: ['館林', '多々良', '県', '福居', '東武和泉', '足利市', '野州山辺',
      '韮川', '太田', '細谷', '木崎', '世良田', '境町', '剛志', '新伊勢崎', '伊勢崎'] },
  ],
  'Tobu Koizumi Line': [
    { name: 'Tobu Koizumi Line', stations: ['館林', '成島', '本中野', '篠塚', '東小泉', '小泉町', '西小泉'] },
    { name: 'Tobu Koizumi Line (Ota)', stations: ['東小泉', '竜舞', '太田'] },
  ],
  // One part = reorder: upstream lists Sasazuka second
  'Keio new line': [
    { name: 'Keio new line', stations: ['新線新宿', '初台', '幡ヶ谷', '笹塚'] },
  ],
  // Odakyu-stock trains run 小田原–箱根湯本; mountain cars run 箱根湯本–強羅 only
  'Hakone Tozan Railway': [
    { name: 'Hakone Tozan Railway', stations: ['小田原', '箱根板橋', '風祭', '入生田', '箱根湯本'] },
    { name: 'Hakone Tozan Railway (Mountain)', stations: ['箱根湯本', '塔ノ沢', '大平台', '宮ノ下', '小涌谷',
      '彫刻の森', '強羅'] },
  ],
};

// Stations upstream lists on a line whose trains no longer call there (JA names)
const LINE_REMOVE_STATIONS = {
  // Old Main Line terminus (成田空港 until 1991); now only on the Higashi-Narita branch
  'Keisei Main Line': ['東成田'],
  // Main line runs 市川塩浜 → 二俣新町; 西船橋 is on the branches (Musashino connections)
  'JR Keiyo Line': ['西船橋'],
  // Keio Line trains run 京王新宿 → 笹塚 nonstop; only Keio New Line trains call here
  'Keio Line': ['初台', '幡ヶ谷'],
  // Match-day-only temporary station
  'JR Kashima Line': ['鹿島サッカースタジアム（臨）'],
  'Kashima Rinkai Railway Oarai-Kashima Line': ['鹿島サッカースタジアム（臨）'],
  // Tobu's 押上 platforms serve only Hanzomon through trains (Hanzomon ↔ Tobu connections at 曳舟).
  // Raw upstream spelling: removal runs before the Oshiage bracket normalization.
  'Tobu Isesaki Line': ['押上〈スカイツリー前〉'],
};

// Stations opened after the upstream data snapshot, inserted mid-line
// (LINE_EXTRA_STATIONS only appends to line ends). `after` is the JA name
// of the preceding station in the line's station order.
const LINE_INSERT_STATIONS = {
  'JR Keiyo Line': [
    // Opened March 2023, between Shin-Narashino and Kaihin-Makuhari
    { after: '新習志野', name: 'Makuhari-Toyosuna', ja: '幕張豊砂', lat: 35.6597, lng: 140.0284 },
  ],
  'Toei Oedo Line': [
    // Trains run a 6-shape: Hikarigaoka ↔ Tochomae ↔ loop ↔ Tochomae. Listing
    // Tochomae again between Shinjuku and Nishi-Shinjuku-Gochome makes the array
    // follow the track; OEDO_LOOP_END points at this entry.
    { after: '新宿', ja: '都庁前', repeat: true },
  ],
  // Opened October 2020, between Tobu-Takezawa and Obusuma
  'Tobu Tojo Line': [
    { after: '東武竹沢', name: 'Minami-Yorii', ja: 'みなみ寄居', lat: 36.0924, lng: 139.2365 },
  ],
  // Opened October 2018, between Nagata and Obamada
  'Chichibu Railway Chichibu Line': [
    { after: '永田', name: 'Fukaya-Hanazono', ja: 'ふかや花園', lat: 36.1308, lng: 139.2481 },
  ],
  // Opened March 2021, between Isozaki and Hiraiso (line runs Ajigaura → Katsuta)
  'Hitachinaka Seaside Railway Minato Line': [
    { after: '磯崎', name: 'Minohama-Gakuen', ja: '美乃浜学園', lat: 36.3726, lng: 140.6169 },
  ],
};

// Override upstream line colors with official line colors
const LINE_COLOR_FIXES = {
  'Keisei Matsudo Line':      '#EF5BA1', // gentle pink (upstream #FF4400)
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
  'Keio Takao Line':          '#E3379F',
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
  // Joban Line beyond Toride (upstream's 取手～いわき segment falls outside the build bounds).
  // 偕楽園 (seasonal, down trains only) left out. 友部/水戸/勝田 coords match the existing lines.
  'JR Joban Line': [
    { name: 'Fujishiro',        ja: '藤代',           lat: 35.920565, lng: 140.118251 },
    { name: 'Ryugasakishi',     ja: '龍ケ崎市',       lat: 35.930066, lng: 140.138217 },
    { name: 'Ushiku',           ja: '牛久',           lat: 35.975314, lng: 140.141039 },
    { name: 'Hitachino-Ushiku', ja: 'ひたち野うしく', lat: 36.007996, lng: 140.158408 },
    { name: 'Arakawaoki',       ja: '荒川沖',         lat: 36.030552, lng: 140.165920 },
    { name: 'Tsuchiura',        ja: '土浦',           lat: 36.078644, lng: 140.206238 },
    { name: 'Kandatsu',         ja: '神立',           lat: 36.120424, lng: 140.248615 },
    { name: 'Takahama',         ja: '高浜',           lat: 36.163882, lng: 140.294745 },
    { name: 'Ishioka',          ja: '石岡',           lat: 36.191554, lng: 140.279709 },
    { name: 'Hatori',           ja: '羽鳥',           lat: 36.247661, lng: 140.286790 },
    { name: 'Iwama',            ja: '岩間',           lat: 36.295508, lng: 140.276493 },
    { name: 'Tomobe',           ja: '友部',           lat: 36.350597, lng: 140.306306 },
    { name: 'Uchihara',         ja: '内原',           lat: 36.370111, lng: 140.352820 },
    { name: 'Akatsuka',         ja: '赤塚',           lat: 36.381755, lng: 140.415248 },
    { name: 'Mito',             ja: '水戸',           lat: 36.370911, lng: 140.476760 },
    { name: 'Katsuta',          ja: '勝田',           lat: 36.394033, lng: 140.524482 },
  ],
};

// Trim lines at a given station (inclusive) — drop everything beyond it
const LINE_TRIM_AFTER = {};

// Lines absorbed into other lines
// Ueno Tokyo Line is a brand name for Tokaido↔northern through-service (handled by connections)
const LINE_REMOVE = ['Ueno Tokyo Line', 'JR Chuo Main Line'];
