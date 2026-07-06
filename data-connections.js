// ── Line Connections (through-running between lines) ─────────────────────
// Defines directed connections between lines resolved at runtime.
// No line mutation needed — lines stay as-is from upstream data.
//
// ── FIELD REFERENCE ──
//   ROUTING (required):
//     from              — source line name
//     fromEnd / fromStation — JA terminus or mid-line station on source line
//     fromDir           — 'start'|'end' (auto-inferred for terminus; required for mid-line)
//     to                — target line name
//     toEnd / toStation — JA terminus or mid-line station on target line
//     toDir             — 'start'|'end' travel direction on target (auto-inferred for terminus)
//     via               — intermediate station JA names between the two lines
//     toUntil           — JA name: limit traversal on target line (stops chaining)
//     impliedLines      — line names whose tracks the via stations ride over
//                         (excluded from mid-route transfer offers — you can't
//                         "transfer" to the train you're already on)
//
//   DISPLAY:
//     name, ja, color   — button label for branch picker (when multiple conns from same platform)
//     displayName       — override platform pill label (e.g. "Ueno Tokyo Line")
//
//   SERVICES:
//     destinations      — [{ until (JA), name, ja, color?, services?, localFrom? }] train terminus picker
//                         localFrom (JA, source line): with `services`, local-class services only
//                         feed this destination from that station onward toward the junction —
//                         the destination is hidden at earlier stations no allowed service calls at
//     lineDests         — [{ until (JA), name, ja, color? }] within-line short-turn picker
//     express           — [{ name, ja, color?, stops, schedule? }] cross-line express services
//
// ── PICKER BEHAVIOR (resolved as _type) ──
//   transparent    — no name/destinations/express → auto-extends (e.g. Hanzomon↔DET)
//   destination    — destinations present → destination picker (e.g. UTL southbound)
//   named          — name present, no destinations → branch picker label (e.g. Keikyu Kamata N/S)
//   express-only   — express present, no name/dest → custom train types only (e.g. F-Liner)
//
// ── FIELD EFFECTS ──
//   destinations + services   → filtered train types per destination
//   lineDests                 → within-line short-turn options in destination picker
//   express + stops:null      → local (all-stop) service through connection
//   express + stops:[...]     → express service with named stops across both lines
//   toUntil                   → limits route extent on target line, stops chaining
//   via                       → intermediate stations counted toward stops
//   displayName               → overrides platform pill label

const LINE_CONNECTIONS = [

  // ── Hanzomon ↔ Den-en-toshi at Shibuya ──────────────────────────────────
  // Simple 1:1 through-running — no picker needed, route extends transparently
  { from: 'Tokyo Metro Hanzomon Line', fromEnd: '渋谷',
    to:   'Tokyu Den-en-toshi Line',   toEnd:   '渋谷' },
  { from: 'Tokyu Den-en-toshi Line',   fromEnd: '渋谷',
    to:   'Tokyo Metro Hanzomon Line', toEnd:   '渋谷' },

  // ── Keikyu Airport Line Y-junction at Keikyu Kamata ─────────────────────
  // From Haneda side (toward start = toward Keikyu Kamata):
  // trains split at Keikyu Kamata onto Main Line north or south
  { from: 'Keikyu Airport Line',  fromEnd: '京急蒲田',
    to:   'Keikyu Main Line',     toStation: '京急蒲田', toDir: 'start',
    name: 'Shinagawa', ja: '品川方面', color: '#e57053',
    lineDests: [
      { until: '京急蒲田', name: 'Keikyu Kamata', ja: '京急蒲田方面', color: '#e57053' },
    ],
    destinations: [
      { until: '品川', name: 'Shinagawa', ja: '品川方面', color: '#0073CF',
        services: ['Local', 'Express', 'Ltd. Express', 'Rapid Ltd. Exp'] },
    ],
    express: [
      { stops: null, name: 'Local', ja: '各停', color: '#00a0e8' },
      { name: 'Express', ja: '急行', color: '#e83030',
        stops: ['Sengakuji','Shinagawa','Aomono-yokocho','Tachiaigawa','Heiwajima','Keikyu Kamata',
                'Kojiya','Otorii','Anamori-Inari','Tenkubashi',
                'Haneda Airport Terminal 3','Haneda Airport Terminal 1 & 2'] },
      { name: 'Ltd. Express', ja: '特急', color: '#e84040',
        stops: ['Sengakuji','Shinagawa','Aomono-yokocho','Heiwajima','Keikyu Kamata',
                'Haneda Airport Terminal 3','Haneda Airport Terminal 1 & 2'] },
      { name: 'Rapid Ltd. Exp', ja: '快特', color: '#e83080',
        stops: ['Sengakuji','Shinagawa','Keikyu Kamata',
                'Haneda Airport Terminal 1 & 2'] },
      { name: 'Airport Rapid', ja: 'エアポート快特', color: '#e83080',
        stops: ['Shinagawa',
                'Haneda Airport Terminal 3','Haneda Airport Terminal 1 & 2'] },
    ] },
  { from: 'Keikyu Airport Line',  fromEnd: '京急蒲田',
    to:   'Keikyu Main Line',     toStation: '京急蒲田', toDir: 'end',
    toUntil: '横浜',
    name: 'Yokohama', ja: '横浜方面', color: '#1a8fe8',
    express: [
      { stops: null, name: 'Local', ja: '各停', color: '#00a0e8' },
      { name: 'Express', ja: '急行', color: '#e83030',
        stops: ['Keikyu Kamata','Keikyu Kawasaki','Keikyu Tsurumi','Kanagawa-shimmachi',
                'Keikyu-Higashi-Kanagawa','Yokohama',
                'Kojiya','Otorii','Anamori-Inari','Tenkubashi',
                'Haneda Airport Terminal 3','Haneda Airport Terminal 1 & 2'] },
      { name: 'Ltd. Express', ja: '特急', color: '#e84040',
        stops: ['Yokohama','Keikyu Kawasaki','Keikyu Kamata',
                'Haneda Airport Terminal 3','Haneda Airport Terminal 1 & 2'] },
      { name: 'Rapid Ltd. Exp', ja: '快特', color: '#e83080',
        stops: ['Yokohama','Keikyu Kamata',
                'Haneda Airport Terminal 1 & 2'] },
    ] },

  // From Main Line past Keikyu Kamata → branch onto Airport Line (both directions)
  { from: 'Keikyu Main Line',     fromStation: '京急蒲田', fromDir: 'end',
    to:   'Keikyu Airport Line',   toEnd: '京急蒲田',
    name: 'Airport', ja: '羽田空港方面', color: '#1a8fe8',
    lineDests: [
      { until: '京急蒲田', name: 'Keikyu Kamata', ja: '京急蒲田方面', color: '#e57053' },
      { until: '横浜', name: 'Yokohama', ja: '横浜方面', color: '#c83030' },
    ],
    destinations: [
      { until: '羽田空港国内線ターミナル', name: 'Haneda Airport', ja: '羽田空港方面', color: '#1a8fe8' },
    ],
    express: [
      { name: 'Airport Local', ja: '空港各停', color: '#00a0e8', stops: null },
      { name: 'Express', ja: '急行', color: '#e83030',
        stops: ['Sengakuji','Shinagawa','Aomono-yokocho','Tachiaigawa','Heiwajima','Keikyu Kamata',
                'Kojiya','Otorii','Anamori-Inari','Tenkubashi',
                'Haneda Airport Terminal 3','Haneda Airport Terminal 1 & 2'] },
      { name: 'Ltd. Express', ja: '特急', color: '#e84040',
        stops: ['Sengakuji','Shinagawa','Aomono-yokocho','Heiwajima','Keikyu Kamata',
                'Haneda Airport Terminal 3','Haneda Airport Terminal 1 & 2'] },
      { name: 'Rapid Ltd. Exp', ja: '快特', color: '#e83080',
        stops: ['Sengakuji','Shinagawa','Keikyu Kamata',
                'Haneda Airport Terminal 1 & 2'] },
      { name: 'Airport Rapid', ja: 'エアポート快特', color: '#e83080',
        stops: ['Shinagawa',
                'Haneda Airport Terminal 3','Haneda Airport Terminal 1 & 2'] },
    ] },
  { from: 'Keikyu Main Line',     fromStation: '京急蒲田', fromDir: 'start',
    to:   'Keikyu Airport Line',   toEnd: '京急蒲田',
    name: 'Airport', ja: '羽田空港方面', color: '#1a8fe8',
    lineDests: [
      { until: '京急蒲田', name: 'Keikyu Kamata', ja: '京急蒲田方面', color: '#e57053' },
      { until: '品川', name: 'Shinagawa', ja: '品川方面', color: '#c83030' },
    ],
    destinations: [
      { until: '羽田空港国内線ターミナル', name: 'Haneda Airport', ja: '羽田空港方面', color: '#1a8fe8' },
    ],
    express: [
      { name: 'Airport Local', ja: '空港各停', color: '#00a0e8', stops: null },
      { name: 'Express', ja: '急行', color: '#e83030',
        stops: ['Yokohama','Keikyu-Higashi-Kanagawa','Kanagawa-shimmachi','Keikyu Tsurumi',
                'Keikyu Kawasaki','Keikyu Kamata',
                'Kojiya','Otorii','Anamori-Inari','Tenkubashi',
                'Haneda Airport Terminal 3','Haneda Airport Terminal 1 & 2'] },
      { name: 'Ltd. Express', ja: '特急', color: '#e84040',
        stops: ['Yokohama','Keikyu Kawasaki','Keikyu Kamata',
                'Haneda Airport Terminal 3','Haneda Airport Terminal 1 & 2'] },
      { name: 'Rapid Ltd. Exp', ja: '快特', color: '#e83080',
        stops: ['Yokohama','Keikyu Kamata',
                'Haneda Airport Terminal 1 & 2'] },
    ] },

  // ── Keikyu Main → Kurihama Line at Horinouchi ───────────────────────────
  // Most 快特/特急 through-run to Keikyu Kurihama / Misakiguchi (all stations
  // within the Kurihama Line since 1999). Uraga is the Main Line stub beyond.
  // Locals to Misakiguchi don't exist — services filter keeps it 特急/快特.
  { from: 'Keikyu Main Line',     fromStation: '堀ノ内', fromDir: 'end',
    to:   'Keikyu Kurihama Line', toEnd: '堀ノ内',
    lineDests: [
      { until: '浦賀', name: 'Uraga', ja: '浦賀方面', color: '#8a2020' },
    ],
    destinations: [
      { until: '京急久里浜', name: 'Keikyu Kurihama', ja: '京急久里浜方面', color: '#00539f' },
      { until: '三崎口', name: 'Misakiguchi', ja: '三崎口方面', color: '#e83080',
        services: ['Ltd. Express', 'Rapid Ltd. Exp'] },
    ],
    express: [
      { stops: null, name: 'Local', ja: '各停', color: '#00a0e8' },
      { name: 'Ltd. Express', ja: '特急', color: '#e84040',
        stops: ['Sengakuji','Shinagawa','Aomono-yokocho','Heiwajima','Keikyu Kamata',
                'Keikyu Kawasaki','Kanagawa-shimmachi','Yokohama','Kamiooka',
                'Kanazawa-bunko','Kanazawa-Hakkei','Oppama','Shioiri','Yokosuka-chuo',
                'Horinouchi','Shin-otsu','Kitakurihama','Keikyu Kurihama','YRP Nobi',
                'Keikyu Nagasawa','Tsukuihama','Miurakaigan','Misakiguchi'] },
      { name: 'Rapid Ltd. Exp', ja: '快特', color: '#e83080',
        stops: ['Sengakuji','Shinagawa','Keikyu Kamata','Keikyu Kawasaki','Yokohama',
                'Kamiooka','Kanazawa-bunko','Kanazawa-Hakkei','Yokosuka-chuo',
                'Horinouchi','Shin-otsu','Kitakurihama','Keikyu Kurihama','YRP Nobi',
                'Keikyu Nagasawa','Tsukuihama','Miurakaigan','Misakiguchi'] },
    ] },
  { from: 'Keikyu Kurihama Line', fromEnd: '堀ノ内',
    to:   'Keikyu Main Line',     toStation: '堀ノ内', toDir: 'start' },

  // ── Keikyu Main → Zushi Line at Kanazawa-Hakkei ──────────────────────────
  // 急行 (former エアポート急行, renamed Nov 2023) runs Haneda→Zushi-Hayama via
  // the Main Line, all stations within the Zushi Line. 特急/快特 never enter
  // the Zushi Line — services filter restricts the destination to Local/急行.
  { from: 'Keikyu Main Line',  fromStation: '金沢八景', fromDir: 'end',
    to:   'Keikyu Zushi Line', toEnd: '金沢八景',
    lineDests: [
      { until: '金沢文庫', name: 'Kanazawa-bunko', ja: '金沢文庫方面', color: '#c83030' },
    ],
    destinations: [
      { until: '逗子・葉山', name: 'Zushi-Hayama', ja: '逗子・葉山方面', color: '#00a662',
        services: ['Local', 'Express'], localFrom: '金沢文庫' },
    ],
    express: [
      { stops: null, name: 'Local', ja: '各停', color: '#00a0e8' },
      { name: 'Express', ja: '急行', color: '#e83030',
        stops: ['Keikyu Kamata','Keikyu Kawasaki','Keikyu Tsurumi','Kanagawa-shimmachi',
                'Keikyu-Higashi-Kanagawa','Yokohama','Hinodecho','Idogaya','Gumyoji',
                'Kamiooka','Sugita','Nokendai','Kanazawa-bunko','Kanazawa-Hakkei',
                'Mutsuura','Jimmuji','Zushi-Hayama'] },
    ] },
  { from: 'Keikyu Zushi Line', fromEnd: '金沢八景',
    to:   'Keikyu Main Line',  toStation: '金沢八景', toDir: 'start',
    toUntil: '京急蒲田',
    express: [
      { stops: null, name: 'Local', ja: '各停', color: '#00a0e8' },
      { name: 'Express', ja: '急行', color: '#e83030',
        stops: ['Zushi-Hayama','Jimmuji','Mutsuura','Kanazawa-Hakkei','Kanazawa-bunko',
                'Nokendai','Sugita','Kamiooka','Gumyoji','Idogaya','Hinodecho','Yokohama',
                'Keikyu-Higashi-Kanagawa','Kanagawa-shimmachi','Keikyu Tsurumi',
                'Keikyu Kawasaki','Keikyu Kamata'] },
    ] },

  // ── Tokaido UTL northbound ──────────────────────────────────────────────
  // Multiple connections from Tokaido terminus at Tokyo = branch picker
  { from: 'JR Tokaido Main Line', fromEnd: '東京',
    to:   'Utsunomiya Line',      toEnd:   '上野',
    via:  ['上野'],
    name: 'Utsunomiya', ja: '宇都宮線', color: '#40d46e',
    displayName: 'Ueno Tokyo Line',
    toUntil: '宇都宮',
    destinations: [
      { until: '小金井', name: 'Koganei', ja: '小金井方面', color: '#5ebc6e' },
      { until: '宇都宮', name: 'Utsunomiya', ja: '宇都宮方面', color: '#2a8848' },
    ] },
  { from: 'JR Tokaido Main Line', fromEnd: '東京',
    to:   'JR Takasaki Line',     toEnd:   '上野',
    via:  ['上野'],
    name: 'Takasaki', ja: '高崎線', color: '#424d6d',
    displayName: 'Ueno Tokyo Line',
    destinations: [
      { until: '籠原', name: 'Kagohara', ja: '籠原方面', color: '#6a7a9d' },
      { until: '高崎', name: 'Takasaki', ja: '高崎方面', color: '#424d6d' },
    ] },
  { from: 'JR Tokaido Main Line', fromEnd: '東京',
    to:   'JR Joban Line',        toEnd:   '上野',
    via:  ['上野'],
    name: 'Joban', ja: '常磐線', color: '#009BBF',
    displayName: 'Ueno Tokyo Line',
    express: [
      { name: 'Rapid', ja: '快速', color: '#009BBF',
        stops: ['Ueno','Nippori','Mikawashima','Minami-Senju','Kita-Senju',
                'Matsudo','Kashiwa','Abiko','Tennodai','Toride'] },
      { name: 'Special Rapid', ja: '特別快速', color: '#e85050',
        stops: ['Ueno','Nippori','Kita-Senju',
                'Matsudo','Kashiwa','Toride'] },
    ] },
  // Some trains terminate at Ueno
  { from: 'JR Tokaido Main Line', fromEnd: '東京',
    to:   'Utsunomiya Line',      toEnd:   '上野',
    via:  ['上野'],
    toUntil: '上野',
    name: 'Ueno', ja: '上野方面', color: '#E78B54',
    displayName: 'Ueno Tokyo Line' },

  // ── Tokaido UTL southbound ──────────────────────────────────────────────
  // From northern lines heading south onto Tokaido
  { from: 'Utsunomiya Line',      fromEnd: '上野',
    to:   'JR Tokaido Main Line',  toEnd:   '東京',
    via:  ['東京'],
    displayName: 'Ueno Tokyo Line',
    destinations: [
      { until: '東京',   name: 'Tokyo',     ja: '東京方面', color: '#F7A600' },
      { until: '品川',   name: 'Shinagawa', ja: '品川方面', color: '#009BBF' },
      { until: '平塚',   name: 'Hiratsuka', ja: '平塚方面', color: '#48a842' },
      { until: '国府津', name: 'Kozu',      ja: '国府津方面', color: '#1a8fe8' },
      { until: '小田原', name: 'Odawara',   ja: '小田原方面', color: '#e87830' },
      { until: '熱海',   name: 'Atami',     ja: '熱海方面', color: '#e85050' },
      { until: '沼津',   name: 'Numazu',    ja: '沼津方面', color: '#9060c0' },
    ] },
  { from: 'JR Takasaki Line',     fromEnd: '上野',
    to:   'JR Tokaido Main Line',  toEnd:   '東京',
    via:  ['東京'],
    displayName: 'Ueno Tokyo Line',
    destinations: [
      { until: '東京',   name: 'Tokyo',     ja: '東京方面', color: '#F7A600' },
      { until: '品川',   name: 'Shinagawa', ja: '品川方面', color: '#009BBF' },
      { until: '平塚',   name: 'Hiratsuka', ja: '平塚方面', color: '#48a842' },
      { until: '国府津', name: 'Kozu',      ja: '国府津方面', color: '#1a8fe8' },
      { until: '小田原', name: 'Odawara',   ja: '小田原方面', color: '#e87830' },
      { until: '熱海',   name: 'Atami',     ja: '熱海方面', color: '#e85050' },
      { until: '沼津',   name: 'Numazu',    ja: '沼津方面', color: '#9060c0' },
    ] },
  { from: 'JR Joban Line',        fromEnd: '上野',
    to:   'JR Tokaido Main Line',  toEnd:   '東京',
    via:  ['東京'],
    displayName: 'Ueno Tokyo Line',
    destinations: [
      { until: '東京',   name: 'Tokyo',     ja: '東京方面', color: '#F7A600' },
      { until: '品川',   name: 'Shinagawa', ja: '品川方面', color: '#009BBF' },
    ] },

  // ── Shonan-Shinjuku Line southbound at Ofuna ─────────────────────────
  // SS Line through-runs onto Yokosuka Line (Zushi) or Tokaido Line (Odawara).
  // Utsunomiya-Yokosuka system = local only; Takasaki-Tokaido = Rapid/Special Rapid.
  { from: 'JR Shonan Shinjuku Line', fromEnd: '大船',
    to:   'JR Yokosuka Line',        toStation: '大船', toDir: 'end',
    name: 'Zushi', ja: '逗子方面', color: '#0068B7',
    lineDests: [
      { until: '大船', name: 'Ofuna', ja: '大船方面', color: '#E9003F' },
    ],
    destinations: [
      { until: '逗子', name: 'Zushi', ja: '逗子方面', color: '#0068B7',
        services: ['Local'] },
    ] },
  { from: 'JR Shonan Shinjuku Line', fromEnd: '大船',
    to:   'JR Tokaido Main Line',    toStation: '大船', toDir: 'end',
    name: 'Odawara', ja: '小田原方面', color: '#F7A600',
    destinations: [
      { until: '平塚',   name: 'Hiratsuka', ja: '平塚方面', color: '#48a842' },
      { until: '国府津', name: 'Kozu',      ja: '国府津方面', color: '#1a8fe8' },
      { until: '小田原', name: 'Odawara',   ja: '小田原方面', color: '#e87830' },
    ] },

  // ── Shonan-Shinjuku Line northbound at Omiya ───────────────────────────
  // SS Line through-runs onto Utsunomiya Line or Takasaki Line.
  { from: 'JR Shonan Shinjuku Line', fromEnd: '大宮',
    to:   'Utsunomiya Line',         toStation: '大宮', toDir: 'end',
    name: 'Utsunomiya', ja: '宇都宮線', color: '#40d46e',
    toUntil: '宇都宮',
    lineDests: [
      { until: '大宮', name: 'Omiya', ja: '大宮方面', color: '#E9003F' },
    ],
    destinations: [
      { until: '古河',   name: 'Koga',       ja: '古河方面',   color: '#6ebc5e',
        services: ['Local'] },
      { until: '小金井', name: 'Koganei',    ja: '小金井方面', color: '#5ebc6e',
        services: ['Local'] },
      { until: '宇都宮', name: 'Utsunomiya', ja: '宇都宮方面', color: '#2a8848',
        services: ['Local'] },
    ] },
  { from: 'JR Shonan Shinjuku Line', fromEnd: '大宮',
    to:   'JR Takasaki Line',        toStation: '大宮', toDir: 'end',
    name: 'Takasaki', ja: '高崎線', color: '#F68B1E',
    destinations: [
      { until: '籠原', name: 'Kagohara', ja: '籠原方面', color: '#6a7a9d' },
      { until: '高崎', name: 'Takasaki', ja: '高崎方面', color: '#424d6d' },
    ] },

  // ── Yokosuka ↔ Sobu Rapid at Tokyo (横須賀・総武快速線) ──────────────
  // Nearly all Yokosuka trains continue onto Sobu Rapid at Tokyo and vice versa.
  { from: 'JR Yokosuka Line', fromEnd: '東京',
    to:   'JR Sobu Line',     toEnd: '東京',
    lineDests: [
      { until: '東京', name: 'Tokyo', ja: '東京方面', color: '#0068B7' },
    ],
    destinations: [
      { until: '津田沼', name: 'Tsudanuma', ja: '津田沼方面', color: '#F7C948' },
      { until: '千葉',   name: 'Chiba',     ja: '千葉方面',   color: '#E85830' },
    ] },
  { from: 'JR Sobu Line',     fromEnd: '東京',
    to:   'JR Yokosuka Line', toEnd: '東京',
    lineDests: [
      { until: '東京', name: 'Tokyo', ja: '東京方面', color: '#F7C948' },
    ],
    destinations: [
      { until: '大船', name: 'Ofuna',    ja: '大船方面',   color: '#4a9ec0' },
      { until: '逗子', name: 'Zushi',    ja: '逗子方面',   color: '#0068B7' },
      { until: '久里浜', name: 'Kurihama', ja: '久里浜方面', color: '#003868' },
    ] },

  // ── Hanzomon → Tobu Skytree / Nikko at Oshiage ──────────────────────
  // Hanzomon through-runs to Tobu Skytree Line. Express services apply.
  // Trains terminate at Kuki (Isesaki) or Minami-Kurihashi (Nikko).
  { from: 'Tokyo Metro Hanzomon Line', fromEnd: '押上(スカイツリー前)',
    to:   'Tobu Isesaki Line',         toStation: '押上(スカイツリー前)', toDir: 'end',
    toUntil: '久喜',
    lineDests: [
      { until: '押上(スカイツリー前)', name: 'Oshiage', ja: '押上方面', color: '#8F76D6' },
    ],
    destinations: [
      { until: '東武動物公園', name: 'Tobu-Dobutsu-Koen', ja: '東武動物公園方面', color: '#003878' },
      { until: '久喜', name: 'Kuki', ja: '久喜方面', color: '#005AAA' },
    ] },
  { from: 'Tokyo Metro Hanzomon Line', fromEnd: '押上(スカイツリー前)',
    to:   'Tobu Nikko Line',           toEnd: '東武動物公園',
    via: ['曳舟', '東向島', '鐘ヶ淵', '堀切', '牛田', '北千住',
          '小菅', '五反野', '梅島', '西新井', '竹ノ塚', '谷塚', '草加',
          '獨協大学前駅〈草加松原〉', '新田', '蒲生', '新越谷', '越谷', '北越谷',
          '大袋', 'せんげん台', '武里', '一ノ割', '春日部', '北春日部', '姫宮',
          '東武動物公園'],
    impliedLines: ['Tobu Isesaki Line'],
    toUntil: '南栗橋',
    destinations: [
      { until: '南栗橋', name: 'Minami-Kurihashi', ja: '南栗橋方面', color: '#FFA500' },
    ] },
  { from: 'Tobu Isesaki Line',         fromStation: '押上(スカイツリー前)', fromDir: 'start',
    to:   'Tokyo Metro Hanzomon Line', toEnd: '押上(スカイツリー前)',
    name: 'Shibuya', ja: '渋谷方面', color: '#8F76D6',
    lineDests: [
      { until: '浅草', name: 'Asakusa', ja: '浅草方面', color: '#003087' },
    ],
    destinations: [
      { until: '渋谷', name: 'Shibuya', ja: '渋谷方面', color: '#8F76D6' },
    ] },

  // ── Hibiya → Tobu Skytree / Nikko at Kita-Senju ────────────────────────
  // Hibiya through-runs to Tobu Skytree Line (= Isesaki southern section).
  // Trains terminate at Takenotsuka, Kita-Koshigaya, or Tobu-Dobutsu-Koen,
  // with some extending to Minami-Kurihashi on the Nikko Line.
  { from: 'Tokyo Metro Hibiya Line', fromEnd: '北千住',
    to:   'Tobu Isesaki Line',       toStation: '北千住', toDir: 'end',
    toUntil: '東武動物公園',
    lineDests: [
      { until: '北千住', name: 'Kita-Senju', ja: '北千住方面', color: '#9B7A00' },
    ],
    destinations: [
      { until: '竹ノ塚', name: 'Takenotsuka', ja: '竹ノ塚方面', color: '#3890c8' },
      { until: '北越谷', name: 'Kita-Koshigaya', ja: '北越谷方面', color: '#005AAA' },
      { until: '東武動物公園', name: 'Tobu-Dobutsu-Koen', ja: '東武動物公園方面', color: '#003878' },
    ],
    // Hibiya through-trains are all-station Local only
    express: [{ stops: null, name: 'Local', ja: '各停' }] },
  { from: 'Tokyo Metro Hibiya Line', fromEnd: '北千住',
    to:   'Tobu Nikko Line',        toEnd: '東武動物公園',
    via: ['小菅', '五反野', '梅島', '西新井', '竹ノ塚', '谷塚', '草加',
          '獨協大学前駅〈草加松原〉', '新田', '蒲生', '新越谷', '越谷', '北越谷',
          '大袋', 'せんげん台', '武里', '一ノ割', '春日部', '北春日部', '姫宮',
          '東武動物公園'],
    impliedLines: ['Tobu Isesaki Line'],
    toUntil: '南栗橋',
    destinations: [
      { until: '南栗橋', name: 'Minami-Kurihashi', ja: '南栗橋方面', color: '#FFA500' },
    ] },
  { from: 'Tobu Isesaki Line',       fromStation: '北千住', fromDir: 'start',
    to:   'Tokyo Metro Hibiya Line', toEnd: '北千住',
    name: 'Naka-meguro', ja: '中目黒方面', color: '#9B7A00',
    lineDests: [
      { until: '浅草', name: 'Asakusa', ja: '浅草方面', color: '#003087' },
    ],
    destinations: [
      { until: '中目黒', name: 'Naka-meguro', ja: '中目黒方面', color: '#9B7A00' },
    ] },

  // ── Asakusa ↔ Keikyu at Sengakuji (toward Haneda) ──────────────────────
  // Sengakuji is mid-line on Asakusa (idx 6), start of Keikyu Main (idx 0)
  // Asakusa trains heading toward Nishi-magome (start) pass Sengakuji → branch onto Keikyu
  // Through-trains terminate at Kanazawa-bunko, Uraga, or onto Kurihama Line
  { from: 'Toei Asakusa Line', fromStation: '泉岳寺', fromDir: 'start',
    to:   'Keikyu Main Line',  toEnd: '泉岳寺',
    destinations: [
      { until: '神奈川新町', name: 'Kanagawa-shimmachi', ja: '神奈川新町方面', color: '#e57053' },
      { until: '金沢文庫', name: 'Kanazawa-bunko', ja: '金沢文庫方面', color: '#c83030' },
      { until: '浦賀', name: 'Uraga', ja: '浦賀方面', color: '#8a2020' },
    ] },
  // Keikyu trains from Haneda arrive at Sengakuji → continue onto Asakusa toward Oshiage/Aoto (end)
  { from: 'Keikyu Main Line',  fromEnd: '泉岳寺',
    to:   'Toei Asakusa Line', toStation: '泉岳寺', toDir: 'end',
    name: 'Aoto', ja: '青砥方面', color: '#0073CF',
    lineDests: [
      { until: '京急蒲田', name: 'Keikyu Kamata', ja: '京急蒲田方面', color: '#e57053' },
      { until: '品川', name: 'Shinagawa', ja: '品川方面', color: '#c83030' },
    ],
    destinations: [
      { until: '押上(スカイツリー前)', name: 'Aoto', ja: '青砥方面', color: '#0073CF',
        services: ['Local', 'Express', 'Ltd. Express', 'Rapid Ltd. Exp'] },
    ],
    express: [
      { name: 'Airport Rapid', ja: 'エアポート快特', color: '#e83080',
        stops: ['Shinagawa','Sengakuji','Mita','Daimon','Shimbashi','Nihombashi',
                'Higashi-nihombashi','Asakusa','Oshiage (Skytree)'] },
    ] },

  // ── Asakusa ↔ Keisei Oshiage at Oshiage (toward Narita) ──────────────
  // Oshiage is end of Asakusa (idx 19), start of Keisei Oshiage (idx 0)
  // Airport Rapid (エアポート快特) chains from Keikyu→Asakusa→Oshiage→Keisei Main.
  // Local entry needed since Asakusa has no EXPRESS_SERVICES of its own.
  { from: 'Toei Asakusa Line',  fromEnd: '押上(スカイツリー前)',
    to:   'Keisei Oshiage Line', toEnd: '押上(スカイツリー前)',
    destinations: [
      { until: '京成高砂', name: 'Keisei Takasago', ja: '京成高砂方面', color: '#0073CF',
        services: ['Local', 'Rapid Ltd. Exp'] },
    ],
    express: [
      { stops: null, name: 'Local', ja: '各停' },
      { name: 'Airport Rapid', ja: 'エアポート快特', color: '#e83080',
        stops: ['Sengakuji','Mita','Daimon','Shimbashi','Nihombashi',
                'Higashi-nihombashi','Asakusa','Oshiage (Skytree)',
                'Aoto','Keisei Takasago'] },
    ] },
  { from: 'Keisei Oshiage Line', fromEnd: '押上(スカイツリー前)',
    to:   'Toei Asakusa Line',  toEnd: '押上(スカイツリー前)',
    express: [
      { stops: null, name: 'Local', ja: '各停' },
      { name: 'Airport Rapid', ja: 'エアポート快特', color: '#e83080',
        stops: ['Keisei Takasago','Aoto','Oshiage (Skytree)',
                'Asakusa','Higashi-nihombashi','Nihombashi',
                'Shimbashi','Daimon','Mita','Sengakuji'] },
    ] },

  // ── Chiyoda ↔ Odakyu at Yoyogi-Uehara ─────────────────────────────────
  // 1:1 through-running with rich Odakyu express services.
  // Anchored at Yoyogi-Uehara (mid-line on Odakyu, idx 4) — NOT Shinjuku:
  // through-trains never pass Minami-Shinjuku/Sangubashi/Yoyogi-Hachiman.
  // Real through-types are 準急/急行 only (all-stations within the Chiyoda
  // Line, hence every Chiyoda station in the stop lists — Kamata pattern).
  // The explicit express list suppresses Odakyu's 快速急行, which never runs
  // through. Through-急行 terminate at Isehara at the furthest.
  { from: 'Tokyo Metro Chiyoda Line', fromEnd: '代々木上原',
    to:   'Odakyu Line',              toStation: '代々木上原', toDir: 'end',
    express: [
      { name: 'Semi-Exp', ja: '準急', color: '#00b900',
        stops: ['Kita-ayase','Ayase','Kita-Senju','Machiya','Nishi-nippori','Sendagi',
                'Nezu','Yushima','Shin-ochanomizu','Otemachi','Nijubashimae','Hibiya',
                'Kasumigaseki','Kokkai-gijidomae','Akasaka','Nogizaka','Omote-sando',
                "Meiji-jingumae 'Harajuku'",'Yoyogi-koen','Yoyogi-Uehara',
                'Shimo-Kitazawa','Kyodo','Chitose-Funabashi','Soshigaya-Okura',
                'Seijogakuen-mae','Kitami','Komae','Izumi-Tamagawa','Noborito',
                'Mukogaoka-Yuen','Ikuta','Yomiuriland-mae','Yurigaoka','Shin-Yurigaoka',
                'Kakio','Tsurukawa','Tamagawagakuen-mae','Machida','Sagami-Ono',
                'Odakyu-Sagamihara','Soubudai-Mae','Zama','Ebina','Atsugi','Hon-Atsugi'] },
      { name: 'Express', ja: '急行', color: '#e83030',
        stops: ['Kita-ayase','Ayase','Kita-Senju','Machiya','Nishi-nippori','Sendagi',
                'Nezu','Yushima','Shin-ochanomizu','Otemachi','Nijubashimae','Hibiya',
                'Kasumigaseki','Kokkai-gijidomae','Akasaka','Nogizaka','Omote-sando',
                "Meiji-jingumae 'Harajuku'",'Yoyogi-koen','Yoyogi-Uehara',
                'Shimo-Kitazawa','Kyodo','Seijogakuen-mae','Noborito','Mukogaoka-Yuen',
                'Shin-Yurigaoka','Machida','Sagami-Ono','Ebina','Hon-Atsugi',
                'Aiko-Ishida','Isehara'] },
    ] },
  { from: 'Odakyu Line',              fromStation: '代々木上原', fromDir: 'start',
    to:   'Tokyo Metro Chiyoda Line', toEnd:   '代々木上原',
    name: 'Ayase', ja: '綾瀬方面', color: '#00BB85',
    lineDests: [
      { until: '新宿', name: 'Shinjuku', ja: '新宿方面', color: '#0099DD' },
    ],
    destinations: [
      { until: '綾瀬', name: 'Ayase', ja: '綾瀬方面', color: '#00BB85',
        services: ['Semi-Exp', 'Express'] },
    ],
    express: [
      { name: 'Semi-Exp', ja: '準急', color: '#00b900',
        stops: ['Hon-Atsugi','Atsugi','Ebina','Zama','Soubudai-Mae','Odakyu-Sagamihara',
                'Sagami-Ono','Machida','Tamagawagakuen-mae','Tsurukawa','Kakio',
                'Shin-Yurigaoka','Yurigaoka','Yomiuriland-mae','Ikuta','Mukogaoka-Yuen',
                'Noborito','Izumi-Tamagawa','Komae','Kitami','Seijogakuen-mae',
                'Soshigaya-Okura','Chitose-Funabashi','Kyodo','Shimo-Kitazawa','Yoyogi-Uehara',
                'Yoyogi-koen',"Meiji-jingumae 'Harajuku'",'Omote-sando','Nogizaka','Akasaka',
                'Kokkai-gijidomae','Kasumigaseki','Hibiya','Nijubashimae','Otemachi',
                'Shin-ochanomizu','Yushima','Nezu','Sendagi','Nishi-nippori','Machiya',
                'Kita-Senju','Ayase','Kita-ayase'] },
      { name: 'Express', ja: '急行', color: '#e83030',
        stops: ['Isehara','Aiko-Ishida','Hon-Atsugi','Ebina','Sagami-Ono','Machida',
                'Shin-Yurigaoka','Mukogaoka-Yuen','Noborito','Seijogakuen-mae','Kyodo',
                'Shimo-Kitazawa','Yoyogi-Uehara',
                'Yoyogi-koen',"Meiji-jingumae 'Harajuku'",'Omote-sando','Nogizaka','Akasaka',
                'Kokkai-gijidomae','Kasumigaseki','Hibiya','Nijubashimae','Otemachi',
                'Shin-ochanomizu','Yushima','Nezu','Sendagi','Nishi-nippori','Machiya',
                'Kita-Senju','Ayase','Kita-ayase'] },
    ] },

  // ── Tozai ↔ Chuo-Sobu at Nakano and Nishi-Funabashi ───────────────────
  // Two junction points, both local-only
  // Nakano: Tozai start terminus ↔ Chuo-Sobu mid-line
  { from: 'Tokyo Metro Tozai Line', fromEnd: '中野',
    to:   'JR Chuo-Sobu Line',      toStation: '中野', toDir: 'start' },
  { from: 'JR Chuo-Sobu Line',      fromStation: '中野', fromDir: 'start',
    to:   'Tokyo Metro Tozai Line', toEnd: '中野' },
  // Nishi-Funabashi: Tozai end terminus ↔ Chuo-Sobu mid-line
  { from: 'Tokyo Metro Tozai Line', fromEnd: '西船橋',
    to:   'JR Chuo-Sobu Line',      toStation: '西船橋', toDir: 'end' },
  { from: 'JR Chuo-Sobu Line',      fromStation: '西船橋', fromDir: 'end',
    to:   'Tokyo Metro Tozai Line', toEnd: '西船橋' },

  // ── Tozai ↔ Toyo Rapid Railway at Nishi-Funabashi ─────────────────────
  { from: 'Tokyo Metro Tozai Line',   fromEnd: '西船橋',
    to:   'Toyo Rapid Railway Line',  toEnd: '西船橋' },
  { from: 'Toyo Rapid Railway Line',  fromEnd: '西船橋',
    to:   'Tokyo Metro Tozai Line',   toEnd: '西船橋' },

  // ── Seibu Yurakucho ↔ Fukutoshin at Kotake-mukaihara ──────────────────
  // Seibu Yurakucho connects to Fukutoshin for through-running to Shibuya/Toyoko
  // F-Liner: Seibu Rapid Exp → Fukutoshin Express → Toyoko Express (all-express through-service)
  { from: 'Seibu Yurakucho Line',       fromEnd: '小竹向原',
    to:   'Tokyo Metro Fukutoshin Line', toStation: '小竹向原', toDir: 'end',
    express: [
      { name: 'F-Liner', ja: 'Fライナー', color: '#e83030',
        stops: ['Kotake-mukaihara','Ikebukuro','Shinjuku-sanchome',
                "Meiji-jingumae 'Harajuku'",'Shibuya'] },
    ] },
  // (No Fukutoshin→Seibu connection needed: at Kotake-mukaihara the Seibu platform is available directly)

  // ── Seibu Yurakucho → Seibu Ikebukuro at Nerima (terminus through-running) ──
  // Yurakucho terminates at Nerima (idx 2), continues onto Ikebukuro toward Kotesashi/Hanno
  { from: 'Seibu Yurakucho Line',  fromEnd: '練馬',
    to:   'Seibu Ikebukuro Line',  toStation: '練馬', toDir: 'end' },

  // ── Seibu Ikebukuro → Seibu Yurakucho at Nerima (mid-line junction) ───
  // Nerima is mid-line on Ikebukuro (idx 5), end on Yurakucho (idx 2)
  // F-Liner runs express on Seibu Ikebukuro, doesn't go to Ikebukuro station
  { from: 'Seibu Ikebukuro Line', fromStation: '練馬', fromDir: 'start',
    to:   'Seibu Yurakucho Line', toEnd: '練馬',
    express: [
      { name: 'F-Liner', ja: 'Fライナー', color: '#e83030',
        stops: ['Hanno','Kotesashi','Nishi-Tokorozawa','Tokorozawa',
                'Hibarigaoka','Shakujii-kōen','Nerima','Kotake-mukaihara'] },
    ] },
  { from: 'Seibu Ikebukuro Line', fromStation: '練馬', fromDir: 'end',
    to:   'Seibu Yurakucho Line', toEnd: '練馬',
    express: [
      { name: 'F-Liner', ja: 'Fライナー', color: '#e83030',
        stops: ['Hanno','Kotesashi','Nishi-Tokorozawa','Tokorozawa',
                'Hibarigaoka','Shakujii-kōen','Nerima','Kotake-mukaihara'] },
    ] },

  // ── Fukutoshin ↔ Tokyu Toyoko at Shibuya ──────────────────────────────
  // Through-running to Toyoko (chains with Seibu Yurakucho above)
  { from: 'Tokyo Metro Fukutoshin Line', fromEnd: '渋谷',
    to:   'Tokyu Toyoko Line',           toEnd:   '渋谷',
    express: [
      { name: 'F-Liner', ja: 'Fライナー', color: '#e83030',
        stops: ['Wakoshi','Kotake-mukaihara','Ikebukuro','Shinjuku-sanchome',
                "Meiji-jingumae 'Harajuku'",'Shibuya',
                'Naka-meguro','Jiyugaoka','Musashi-Kosugi','Hiyoshi','Kikuna','Yokohama'] },
    ] },
  { from: 'Tokyu Toyoko Line',           fromEnd: '渋谷',
    to:   'Tokyo Metro Fukutoshin Line', toEnd:   '渋谷',
    name: 'Wakoshi', ja: '和光市方面', color: '#9C5E31',
    destinations: [
      { until: '和光市', name: 'Wakoshi', ja: '和光市方面', color: '#9C5E31' },
    ],
    express: [
      { name: 'F-Liner', ja: 'Fライナー', color: '#e83030',
        stops: ['Yokohama','Kikuna','Hiyoshi','Musashi-Kosugi','Jiyugaoka','Naka-meguro',
                'Shibuya',"Meiji-jingumae 'Harajuku'",'Shinjuku-sanchome','Ikebukuro',
                'Kotake-mukaihara','Wakoshi'] },
    ] },

  // ── Tokyu Toyoko ↔ Minato Mirai at Yokohama ──────────────────────────
  // Through-running to Motomachi-chukagai (chains with Fukutoshin/Seibu above)
  { from: 'Tokyu Toyoko Line',  fromEnd: '横浜',
    to:   'Minato Mirai Line',  toEnd:   '横浜',
    name: 'Motomachi-Chukagai', ja: '元町・中華街方面', color: '#015193',
    lineDests: [
      { until: '横浜', name: 'Yokohama', ja: '横浜方面', color: '#0066B3' },
    ],
    destinations: [
      { until: '元町・中華街', name: 'Motomachi-Chukagai', ja: '元町・中華街方面', color: '#015193' },
    ] },
  { from: 'Minato Mirai Line',  fromEnd: '横浜',
    to:   'Tokyu Toyoko Line',  toEnd:   '横浜' },

  // ── Namboku ↔ Tokyu Meguro at Meguro ──────────────────────────────────
  { from: 'Tokyo Metro Namboku Line', fromEnd: '目黒',
    to:   'Tokyu Meguro Line',        toEnd:   '目黒',
    lineDests: [
      { until: '目黒', name: 'Meguro', ja: '目黒方面', color: '#6CBB5A' },
    ],
    destinations: [
      { until: '日吉', name: 'Hiyoshi', ja: '日吉方面', color: '#0066B3' },
    ] },
  { from: 'Tokyu Meguro Line',        fromEnd: '目黒',
    to:   'Tokyo Metro Namboku Line', toEnd:   '目黒',
    name: 'Akabane-Iwabuchi', ja: '赤羽岩淵方面', color: '#00AC9B',
    lineDests: [
      { until: '目黒', name: 'Meguro', ja: '目黒方面', color: '#6CBB5A' },
    ],
    destinations: [
      { until: '赤羽岩淵', name: 'Akabane-Iwabuchi', ja: '赤羽岩淵方面', color: '#00AC9B' },
    ] },

  // ── Namboku ↔ Saitama Railway at Akabane-iwabuchi ─────────────────────
  // Chains with Meguro → Namboku above for through-running to Urawa-misono.
  { from: 'Tokyo Metro Namboku Line',     fromEnd: '赤羽岩淵',
    to:   'Saitama high-speed rail line', toEnd: '赤羽岩淵' },
  { from: 'Saitama high-speed rail line', fromEnd: '赤羽岩淵',
    to:   'Tokyo Metro Namboku Line',     toEnd: '赤羽岩淵' },

  // ── Mita ↔ Tokyu Meguro at Meguro ─────────────────────────────────────
  { from: 'Toei Mita Line',    fromEnd: '目黒',
    to:   'Tokyu Meguro Line', toEnd:   '目黒',
    lineDests: [
      { until: '目黒', name: 'Meguro', ja: '目黒方面', color: '#6CBB5A' },
    ],
    destinations: [
      { until: '日吉', name: 'Hiyoshi', ja: '日吉方面', color: '#0066B3' },
    ] },
  { from: 'Tokyu Meguro Line', fromEnd: '目黒',
    to:   'Toei Mita Line',   toEnd:   '目黒',
    name: 'Nishi-Takashimadaira', ja: '西高島平方面', color: '#2B50A1',
    lineDests: [
      { until: '目黒', name: 'Meguro', ja: '目黒方面', color: '#6CBB5A' },
    ],
    destinations: [
      { until: '西高島平', name: 'Nishi-Takashimadaira', ja: '西高島平方面', color: '#2B50A1' },
    ] },

  // ── Tokyu Meguro → Sotetsu at Hiyoshi ──────────────────────────────────
  // Through-running: Meguro Line trains continue from Hiyoshi via
  // Shin-Yokohama to Sotetsu Main Line (Ebina) or Izumino Line (Shonandai).
  // Two connections model the Y-branch at Futamatagawa.
  { from: 'Tokyu Meguro Line',          fromEnd: '日吉',
    to:   'Tokyu Shin-Yokohama Line',   toEnd: '日吉',
    name: 'Shin-Yokohama', ja: '新横浜方面', color: '#7b4e9e',
    lineDests: [
      { until: '日吉', name: 'Hiyoshi', ja: '日吉方面', color: '#0066B3' },
    ],
    destinations: [
      { until: '新横浜', name: 'Shin-Yokohama', ja: '新横浜方面', color: '#7b4e9e' },
    ] },
  { from: 'Tokyu Meguro Line',          fromEnd: '日吉',
    to:   'Sotetsu Main Line',           toStation: '西谷', toDir: 'end',
    via:  ['新綱島', '新横浜', '羽沢横浜国大', '西谷'],
    impliedLines: ['Tokyu Shin-Yokohama Line', 'Sotetsu Shin-Yokohama Line'],
    name: 'Ebina', ja: '海老名方面', color: '#003087',
    lineDests: [
      { until: '日吉', name: 'Hiyoshi', ja: '日吉方面', color: '#0066B3' },
    ],
    destinations: [
      { until: '海老名', name: 'Ebina', ja: '海老名方面', color: '#003087' },
    ] },
  { from: 'Tokyu Meguro Line',          fromEnd: '日吉',
    to:   'Sotetsu Izumino Line',        toEnd: '二俣川',
    via:  ['新綱島', '新横浜', '羽沢横浜国大', '西谷', '鶴ヶ峰', '二俣川'],
    impliedLines: ['Tokyu Shin-Yokohama Line', 'Sotetsu Shin-Yokohama Line', 'Sotetsu Main Line'],
    name: 'Shonandai', ja: '湘南台方面', color: '#003087',
    lineDests: [
      { until: '日吉', name: 'Hiyoshi', ja: '日吉方面', color: '#0066B3' },
    ],
    destinations: [
      { until: '湘南台', name: 'Shonandai', ja: '湘南台方面', color: '#003087' },
    ] },
  // Reverse: Shin-Yokohama Line → Meguro / Toyoko at Hiyoshi
  { from: 'Tokyu Shin-Yokohama Line',   fromEnd: '日吉',
    to:   'Tokyu Meguro Line',           toEnd:   '日吉',
    name: 'Meguro', ja: '目黒方面', color: '#6CBB5A',
    lineDests: [
      { until: '日吉', name: 'Hiyoshi', ja: '日吉方面', color: '#890d84' },
    ],
    destinations: [
      { until: '目黒', name: 'Meguro', ja: '目黒方面', color: '#6CBB5A' },
    ] },

  // ── Tokyu Toyoko ↔ Tokyu Shin-Yokohama / Sotetsu at Hiyoshi (mid-line) ──
  // Hiyoshi is mid-line on Toyoko (idx 12). Toward-Yokohama direction has
  // destinations (Shin-Yokohama, Futamatagawa) merged with terminus Minato Mirai.
  // Toward-Shibuya direction: Shin-Yokohama Line appears as its own platform.
  { from: 'Tokyu Toyoko Line',          fromStation: '日吉', fromDir: 'end',
    to:   'Tokyu Shin-Yokohama Line',   toEnd: '日吉',
    name: 'Shin-Yokohama', ja: '新横浜方面', color: '#7b4e9e',
    lineDests: [
      { until: '横浜', name: 'Yokohama', ja: '横浜方面', color: '#0066B3' },
    ],
    destinations: [
      { until: '新横浜', name: 'Shin-Yokohama', ja: '新横浜方面', color: '#7b4e9e' },
    ] },
  { from: 'Tokyu Toyoko Line',          fromStation: '日吉', fromDir: 'end',
    to:   'Sotetsu Main Line',           toStation: '西谷', toDir: 'end',
    toUntil: '二俣川',
    via:  ['新綱島', '新横浜', '羽沢横浜国大'],
    name: 'Futamatagawa', ja: '二俣川方面', color: '#003087',
    lineDests: [
      { until: '横浜', name: 'Yokohama', ja: '横浜方面', color: '#0066B3' },
    ],
    destinations: [
      { until: '二俣川', name: 'Futamatagawa', ja: '二俣川方面', color: '#003087' },
    ] },
  { from: 'Tokyu Toyoko Line',          fromStation: '日吉', fromDir: 'start',
    to:   'Tokyu Shin-Yokohama Line',   toEnd: '日吉',
    name: 'Shin-Yokohama', ja: '新横浜方面', color: '#890d84',
    lineDests: [
      { until: '渋谷', name: 'Shibuya', ja: '渋谷方面', color: '#0066B3' },
    ],
    destinations: [
      { until: '新横浜', name: 'Shin-Yokohama', ja: '新横浜方面', color: '#890d84' },
    ] },
  { from: 'Tokyu Shin-Yokohama Line',   fromEnd: '日吉',
    to:   'Tokyu Toyoko Line',          toStation: '日吉', toDir: 'start',
    name: 'Shibuya', ja: '渋谷方面', color: '#0066B3',
    lineDests: [
      { until: '日吉', name: 'Hiyoshi', ja: '日吉方面', color: '#890d84' },
    ],
    destinations: [
      { until: '渋谷', name: 'Shibuya', ja: '渋谷方面', color: '#0066B3' },
    ] },
  { from: 'Tokyu Shin-Yokohama Line',   fromEnd: '日吉',
    to:   'Tokyu Toyoko Line',          toStation: '日吉', toDir: 'end',
    name: 'Yokohama', ja: '横浜方面', color: '#da0442',
    lineDests: [
      { until: '日吉', name: 'Hiyoshi', ja: '日吉方面', color: '#890d84' },
    ],
    destinations: [
      { until: '横浜', name: 'Yokohama', ja: '横浜方面', color: '#da0442' },
    ] },

  // ── Tokyu Shin-Yokohama ↔ Sotetsu Shin-Yokohama at Shin-Yokohama ────
  { from: 'Tokyu Shin-Yokohama Line',   fromEnd: '新横浜',
    to:   'Sotetsu Shin-Yokohama Line',  toEnd:   '新横浜' },
  { from: 'Sotetsu Shin-Yokohama Line',  fromEnd: '新横浜',
    to:   'Tokyu Shin-Yokohama Line',    toEnd:   '新横浜' },

  // ── Sotetsu Shin-Yokohama ↔ Sotetsu Main at Nishiya ──────────────────
  // Through-trains enter Main Line at Nishiya heading toward Ebina.
  { from: 'Sotetsu Shin-Yokohama Line',  fromEnd: '西谷',
    to:   'Sotetsu Main Line',           toStation: '西谷', toDir: 'end' },
  { from: 'Sotetsu Main Line',           fromStation: '西谷', fromDir: 'start',
    to:   'Sotetsu Shin-Yokohama Line',  toEnd: '西谷',
    name: 'Shin-Yokohama', ja: '新横浜方面', color: '#890d84',
    lineDests: [
      { until: '横浜', name: 'Yokohama', ja: '横浜方面', color: '#003087' },
    ],
    destinations: [
      { until: '新横浜', name: 'Shin-Yokohama', ja: '新横浜方面', color: '#890d84' },
    ] },

  // ── Sotetsu Main ↔ Sotetsu Izumino at Futamatagawa ───────────────────
  // Mid-line on Main, start of Izumino. Trains can branch in both directions.
  { from: 'Sotetsu Main Line',     fromStation: '二俣川', fromDir: 'end',
    to:   'Sotetsu Izumino Line',  toEnd: '二俣川',
    name: 'Shonandai', ja: '湘南台方面', color: '#003087',
    lineDests: [
      { until: '海老名', name: 'Ebina', ja: '海老名方面', color: '#003087' },
    ],
    destinations: [
      { until: '湘南台', name: 'Shonandai', ja: '湘南台方面', color: '#4a9b4a' },
    ] },
  { from: 'Sotetsu Main Line',     fromStation: '二俣川', fromDir: 'start',
    to:   'Sotetsu Izumino Line',  toEnd: '二俣川',
    name: 'Shonandai', ja: '湘南台方面', color: '#003087',
    lineDests: [
      { until: '横浜', name: 'Yokohama', ja: '横浜方面', color: '#003087' },
    ],
    destinations: [
      { until: '湘南台', name: 'Shonandai', ja: '湘南台方面', color: '#4a9b4a' },
    ] },
  { from: 'Sotetsu Izumino Line',  fromEnd: '二俣川',
    to:   'Sotetsu Main Line',     toStation: '二俣川', toDir: 'start',
    name: 'Yokohama', ja: '横浜方面', color: '#003087',
    lineDests: [
      { until: '湘南台', name: 'Shonandai', ja: '湘南台方面', color: '#4a9b4a' },
    ],
    destinations: [
      { until: '横浜', name: 'Yokohama', ja: '横浜方面', color: '#003087' },
    ] },
  { from: 'Sotetsu Izumino Line',  fromEnd: '二俣川',
    to:   'Sotetsu Main Line',     toStation: '二俣川', toDir: 'end',
    name: 'Ebina', ja: '海老名方面', color: '#003087',
    lineDests: [
      { until: '湘南台', name: 'Shonandai', ja: '湘南台方面', color: '#4a9b4a' },
    ],
    destinations: [
      { until: '海老名', name: 'Ebina', ja: '海老名方面', color: '#003087' },
    ] },

  // ── Toei Shinjuku ↔ Keio at Shinjuku ──────────────────────────────────
  // Keio has express services (Sub-Exp, Express, Ltd. Exp)
  { from: 'Toei Shinjuku Line', fromEnd: '新宿',
    to:   'Keio Line',          toEnd:   '新宿' },
  { from: 'Keio Line',          fromEnd: '新宿',
    to:   'Toei Shinjuku Line', toEnd:   '新宿',
    name: 'Moto-Yawata', ja: '本八幡方面', color: '#6CBB5A',
    lineDests: [
      { until: '新宿', name: 'Shinjuku', ja: '新宿方面', color: '#800080' },
    ],
    destinations: [
      { until: '本八幡', name: 'Moto-Yawata', ja: '本八幡方面', color: '#6CBB5A' },
    ] },

  // ── Tobu Tojo ↔ Fukutoshin/Yurakucho at Wakoshi ──────────────────────
  // Wakoshi is mid-line on Tobu Tojo (idx 10), start of Fukutoshin and Yurakucho
  // Both travel directions: heading toward Ikebukuro or away
  { from: 'Tobu Tojo Line',             fromStation: '和光市', fromDir: 'start',
    to:   'Tokyo Metro Fukutoshin Line', toEnd: '和光市',
    name: 'Shibuya', ja: '渋谷方面', color: '#9C5E31',
    lineDests: [
      { until: '池袋', name: 'Ikebukuro', ja: '池袋方面', color: '#003087' },
    ],
    destinations: [
      { until: '渋谷', name: 'Shibuya', ja: '渋谷方面', color: '#9C5E31' },
    ] },
  { from: 'Tobu Tojo Line',             fromStation: '和光市', fromDir: 'start',
    to:   'Tokyo Metro Yurakucho Line',  toEnd: '和光市',
    name: 'Shin-kiba', ja: '新木場方面', color: '#C9A800',
    lineDests: [
      { until: '池袋', name: 'Ikebukuro', ja: '池袋方面', color: '#003087' },
    ],
    destinations: [
      { until: '新木場', name: 'Shin-kiba', ja: '新木場方面', color: '#C9A800' },
    ] },
  { from: 'Tobu Tojo Line',             fromStation: '和光市', fromDir: 'end',
    to:   'Tokyo Metro Fukutoshin Line', toEnd: '和光市',
    name: 'Shibuya', ja: '渋谷方面', color: '#9C5E31',
    lineDests: [
      { until: '寄居', name: 'Yorii', ja: '寄居方面', color: '#003087' },
    ],
    destinations: [
      { until: '渋谷', name: 'Shibuya', ja: '渋谷方面', color: '#9C5E31' },
    ] },
  { from: 'Tobu Tojo Line',             fromStation: '和光市', fromDir: 'end',
    to:   'Tokyo Metro Yurakucho Line',  toEnd: '和光市',
    name: 'Shin-kiba', ja: '新木場方面', color: '#C9A800',
    lineDests: [
      { until: '寄居', name: 'Yorii', ja: '寄居方面', color: '#003087' },
    ],
    destinations: [
      { until: '新木場', name: 'Shin-kiba', ja: '新木場方面', color: '#C9A800' },
    ] },
  // Return: Fukutoshin/Yurakucho terminus → Tobu Tojo
  // Through-trains terminate at Kawagoe-shi, Shinrin-Koen, or Ogawamachi
  { from: 'Tokyo Metro Fukutoshin Line', fromEnd: '和光市',
    to:   'Tobu Tojo Line',             toStation: '和光市', toDir: 'end',
    toUntil: '小川町',
    destinations: [
      { until: '川越市', name: 'Kawagoeshi', ja: '川越市方面', color: '#4890c8' },
      { until: '森林公園', name: 'Shinrin-Koen', ja: '森林公園方面', color: '#0068B7' },
      { until: '小川町', name: 'Ogawamachi', ja: '小川町方面', color: '#003878' },
    ] },
  // Yurakucho through-trains are local only (no express on Tojo)
  { from: 'Tokyo Metro Yurakucho Line',  fromEnd: '和光市',
    to:   'Tobu Tojo Line',             toStation: '和光市', toDir: 'end',
    toUntil: '森林公園',
    destinations: [
      { until: '川越市', name: 'Kawagoeshi', ja: '川越市方面', color: '#4890c8' },
      { until: '森林公園', name: 'Shinrin-Koen', ja: '森林公園方面', color: '#0068B7' },
    ],
    express: [{ stops: null, name: 'Local', ja: '各停' }] },

  // ── Chuo → Ome at Tachikawa ─────────────────────────────────────────
  // Mid-line connection: some Chuo rapid trains through-run onto Ome Line.
  // Destinations merged into Chuo LINE_DESTINATIONS picker via handleLineDestinations.
  { from: 'JR Chuo Line',  fromStation: '立川', fromDir: 'end',
    to:   'JR Ome Line',   toStation: '立川', toDir: 'end',
    toUntil: '青梅',
    destinations: [
      { until: '青梅', name: 'Ome', ja: '青梅方面', color: '#6a5020' },
    ],
    express: [
      { name: 'Ome Sp. Rapid', ja: '青梅特快', color: '#f07000',
        stops: ['Tokyo','Kanda','Ochanomizu','Yotsuya','Shinjuku',
                'Nakano','Mitaka','Kokubunji','Tachikawa',
                'Nishi-Tachikawa','Higashi-Nakagami','Nakagami','Akishima',
                'Haijima','Ushihama','Fussa','Hamura','Ozaku','Kabe',
                'Higashi-Ome','Ome'] },
    ] },

  // ── Chuo → Fuji Express at Otsuki ────────────────────────────────────
  // 2 weekday evening Commuter Rapid trains through-run to Kawaguchiko.
  // Destinations merged into Chuo LINE_DESTINATIONS picker via handleLineDestinations.
  { from: 'JR Chuo Line',      fromStation: '大月', fromDir: 'end',
    to:   'Fuji Express Line', toStation: '大月', toDir: 'end',
    destinations: [
      { until: '河口湖', name: 'Kawaguchiko', ja: '河口湖方面', color: '#67db56',
        services: ['Commuter Rapid'] },
    ],
    express: [
      { name: 'Commuter Rapid', ja: '通勤快速', color: '#e83030',
        schedule: { weekend: { stops: [] }, weekday: { timeRange: [17, 20] } },
        stops: ['Tokyo','Kanda','Ochanomizu','Yotsuya','Shinjuku',
                'Nakano','Ogikubo','Kichijoji','Mitaka','Kokubunji',
                'Tachikawa','Hino','Toyoda','Hachioji','Nishi-Hachioji','Takao',
                'Sagamiko','Fujino','Uenohara','Shiotsu','Yanagawa',
                'Torisawa','Saruhashi','Otsuki',
                'Kamiotsuki','Tanokura','Kasei','Akasaka','Tsurushi',
                'Yamuramachi','Tsurubunkadaigakumae','Tokaichiba','Higashikatsura',
                'Mitsutouge','Kotobuki','Yoshiikeonsenmae','Shimoyoshida',
                'Gekkoji','Mt Fuji','Fujikyu Highland','Kawaguchiko'] },
    ] },

  // ── Chiyoda ↔ JR Joban at Ayase ───────────────────────────────────────
  // Ayase is idx 1 on Chiyoda (near start, Kita-ayase is a 1-station stub)
  // Ayase is idx 5 on Joban (mid-line)
  { from: 'Tokyo Metro Chiyoda Line', fromStation: '綾瀬', fromDir: 'start',
    to:   'JR Joban Line',            toStation: '綾瀬', toDir: 'end',
    destinations: [
      { until: '我孫子', name: 'Abiko',  ja: '我孫子方面', color: '#1aa260' },
      { until: '取手',   name: 'Toride', ja: '取手方面',   color: '#009BBF' },
    ] },
  { from: 'JR Joban Line',            fromStation: '綾瀬', fromDir: 'end',
    to:   'Tokyo Metro Chiyoda Line', toStation: '綾瀬', toDir: 'end' },

  // ── Rinkai ↔ Saikyo at Osaki ──────────────────────────────────────────
  // Saikyo southbound: some trains terminate at Shinjuku, others continue to Osaki or Shin-Kiba
  { from: 'Rinkai Line',    fromEnd: '大崎',
    to:   'JR Saikyo Line', toEnd:   '大崎' },
  { from: 'JR Saikyo Line', fromEnd: '大崎',
    to:   'Rinkai Line',    toEnd:   '大崎',
    lineDests: [
      { until: '新宿', name: 'Shinjuku', ja: '新宿行き', color: '#007540' },
      { until: '大崎', name: 'Osaki',    ja: '大崎方面', color: '#007540' },
    ],
    destinations: [
      { until: '新木場', name: 'Shin-Kiba', ja: '新木場方面', color: '#767c78' },
    ] },

  // ── Sotetsu–JR Direct (相鉄・JR直通線) at Osaki / Nishiya ─────────────
  // Saikyo trains continue south of Osaki over the Tokaido freight tracks
  // (Nishi-Oi, Musashi-Kosugi, Hazawa Yokohama-Kokudai), entering the Sotetsu
  // Main Line at Nishiya and running through to Ebina. Through-riding uses
  // via-waypoint connections; the injected Sotetsu-JR Direct Line segment
  // (buildIndex) makes the link boardable at its four stations.
  { from: 'JR Saikyo Line',    fromEnd: '大崎',
    to:   'Sotetsu Main Line', toStation: '西谷', toDir: 'end',
    via:  ['西大井', '武蔵小杉', '羽沢横浜国大', '西谷'],
    impliedLines: ['Sotetsu-JR Direct Line'],
    name: 'Ebina', ja: '海老名方面', color: '#003087',
    destinations: [
      { until: '海老名', name: 'Ebina', ja: '海老名方面', color: '#003087' },
    ] },
  { from: 'Sotetsu Main Line', fromStation: '西谷', fromDir: 'start',
    to:   'JR Saikyo Line',    toEnd: '大崎',
    via:  ['羽沢横浜国大', '武蔵小杉', '西大井', '大崎'],
    impliedLines: ['Sotetsu-JR Direct Line'],
    name: 'Shinjuku', ja: '新宿方面', color: '#007540',
    lineDests: [
      { until: '横浜', name: 'Yokohama', ja: '横浜方面', color: '#003087' },
    ],
    destinations: [
      { until: '新宿', name: 'Shinjuku', ja: '新宿方面', color: '#007540' },
      { until: '大宮', name: 'Omiya',    ja: '大宮方面', color: '#007540' },
    ] },
  // Boardable segment (injected in buildIndex): Osaki–Hazawa Yokohama-Kokudai
  { from: 'Sotetsu-JR Direct Line', fromEnd: '大崎',
    to:   'JR Saikyo Line',         toEnd:   '大崎',
    destinations: [
      { until: '新宿', name: 'Shinjuku', ja: '新宿方面', color: '#007540' },
      { until: '大宮', name: 'Omiya',    ja: '大宮方面', color: '#007540' },
    ] },
  { from: 'Sotetsu-JR Direct Line', fromEnd: '羽沢横浜国大',
    to:   'Sotetsu Main Line',      toStation: '西谷', toDir: 'end',
    via:  ['西谷'],
    destinations: [
      { until: '海老名', name: 'Ebina', ja: '海老名方面', color: '#003087' },
    ] },

  // ── Saikyo ↔ Kawagoe Line at Omiya ────────────────────────────────────
  // Nearly all Saikyo trains through-run onto the Kawagoe Line to Kawagoe.
  // Beyond Kawagoe (toward Komagawa) is a separate shuttle — toUntil stops there.
  { from: 'JR Saikyo Line',  fromEnd: '大宮',
    to:   'JR Kawagoe Line', toEnd:   '大宮',
    toUntil: '川越',
    lineDests: [
      { until: '大宮', name: 'Omiya', ja: '大宮方面', color: '#007540' },
    ],
    destinations: [
      { until: '川越', name: 'Kawagoe', ja: '川越方面', color: '#4a786f' },
    ] },
  { from: 'JR Kawagoe Line', fromEnd: '大宮',
    to:   'JR Saikyo Line',  toEnd:   '大宮',
    lineDests: [
      { until: '大宮', name: 'Omiya', ja: '大宮方面', color: '#4a786f' },
    ],
    destinations: [
      { until: '新宿', name: 'Shinjuku', ja: '新宿方面', color: '#007540' },
      { until: '大崎', name: 'Osaki',    ja: '大崎方面', color: '#007540' },
    ] },

  // ── Keisei Main ↔ Keisei Oshiage at Keisei Takasago ─────────────────
  // Terminus on Oshiage side (idx 6) so chains extend to Keisei Main (Haneda→Narita)
  // Aoto (on both lines) still provides Y-junction platforms naturally
  { from: 'Keisei Oshiage Line', fromEnd: '京成高砂',
    to:   'Keisei Main Line',    toStation: '京成高砂', toDir: 'end',
    destinations: [
      { until: '成田空港（第１旅客ターミナル）', name: 'Narita Airport', ja: '成田空港方面', color: '#003878',
        services: ['Local', 'Airport Rapid'] },
    ],
    express: [
      { name: 'Airport Rapid', ja: 'エアポート快特', color: '#e83080',
        stops: ['Oshiage (Skytree)','Aoto','Keisei Takasago',
                'Keisei Yawata','Keisei Funabashi','Keisei Tsudanuma',
                'Yachiyodai','Katsutadai','Keisei-Sakura','Keisei-Narita',
                'Airport Second Building (NRT Terminal 2)','Narita Airport (NRT Terminal 1)'] },
    ] },
  { from: 'Keisei Main Line',    fromStation: '京成高砂', fromDir: 'start',
    to:   'Keisei Oshiage Line', toEnd: '京成高砂' },

  // ── Keisei Matsudo ↔ Keisei Chiba at Keisei-Tsudanuma ─────────────────
  // Through service (Matsudo↔Chiba-Chuo) continues post-2025 merger.
  // All-local on both lines — transparent 1:1 through-running.
  { from: 'Keisei Matsudo Line', fromEnd: '京成津田沼',
    to:   'Keisei Chiba Line',   toEnd:   '京成津田沼' },
  { from: 'Keisei Chiba Line',   fromEnd: '京成津田沼',
    to:   'Keisei Matsudo Line', toEnd:   '京成津田沼' },

  // ── Keio ↔ Keio Sagamihara at Chofu ───────────────────────────────────
  // Chofu is mid-line on Keio (idx 17), start of Sagamihara (idx 0)
  { from: 'Keio Line',            fromStation: '調布', fromDir: 'start',
    to:   'Keio Sagamihara line', toEnd: '調布',
    name: 'Hashimoto', ja: '橋本方面', color: '#dd44aa',
    lineDests: [
      { until: '新宿', name: 'Shinjuku', ja: '新宿方面', color: '#800080' },
    ],
    destinations: [
      { until: '橋本', name: 'Hashimoto', ja: '橋本方面', color: '#dd44aa' },
    ] },
  { from: 'Keio Line',            fromStation: '調布', fromDir: 'end',
    to:   'Keio Sagamihara line', toEnd: '調布',
    name: 'Hashimoto', ja: '橋本方面', color: '#dd44aa',
    lineDests: [
      { until: '京王八王子', name: 'Keio-Hachioji', ja: '京王八王子方面', color: '#800080' },
    ],
    destinations: [
      { until: '橋本', name: 'Hashimoto', ja: '橋本方面', color: '#dd44aa' },
    ] },
  { from: 'Keio Sagamihara line', fromEnd: '調布',
    to:   'Keio Line',            toStation: '調布', toDir: 'start' },

  // ── Odakyu ↔ Odakyu Enoshima at Sagami-Ono ───────────────────────────
  // Sagami-Ono is mid-line on Odakyu (idx 27), start of Enoshima (idx 0)
  { from: 'Odakyu Line',          fromStation: '相模大野', fromDir: 'start',
    to:   'Odakyu Enoshima Line', toEnd: '相模大野',
    name: 'Katase-Enoshima', ja: '片瀬江ノ島方面', color: '#e87830',
    lineDests: [
      { until: '新宿', name: 'Shinjuku', ja: '新宿方面', color: '#0099DD' },
    ],
    destinations: [
      { until: '片瀬江ノ島', name: 'Katase-Enoshima', ja: '片瀬江ノ島方面', color: '#e87830' },
    ] },
  { from: 'Odakyu Line',          fromStation: '相模大野', fromDir: 'end',
    to:   'Odakyu Enoshima Line', toEnd: '相模大野',
    name: 'Katase-Enoshima', ja: '片瀬江ノ島方面', color: '#e87830',
    lineDests: [
      { until: '小田原', name: 'Odawara', ja: '小田原方面', color: '#0099DD' },
    ],
    destinations: [
      { until: '片瀬江ノ島', name: 'Katase-Enoshima', ja: '片瀬江ノ島方面', color: '#e87830' },
    ] },
  { from: 'Odakyu Enoshima Line', fromEnd: '相模大野',
    to:   'Odakyu Line',          toStation: '相模大野', toDir: 'start' },

  // ── Odakyu ↔ Odakyu Tama at Shin-Yurigaoka ───────────────────────────
  // Shin-Yurigaoka is mid-line on Odakyu (idx 22), start of Tama (idx 0)
  { from: 'Odakyu Line',      fromStation: '新百合ヶ丘', fromDir: 'start',
    to:   'Odakyu Tama Line', toEnd: '新百合ヶ丘',
    name: 'Karakida', ja: '唐木田方面', color: '#1a8fe8',
    lineDests: [
      { until: '新宿', name: 'Shinjuku', ja: '新宿方面', color: '#0099DD' },
    ],
    destinations: [
      { until: '唐木田', name: 'Karakida', ja: '唐木田方面', color: '#1a8fe8' },
    ] },
  { from: 'Odakyu Line',      fromStation: '新百合ヶ丘', fromDir: 'end',
    to:   'Odakyu Tama Line', toEnd: '新百合ヶ丘',
    name: 'Karakida', ja: '唐木田方面', color: '#1a8fe8',
    lineDests: [
      { until: '小田原', name: 'Odawara', ja: '小田原方面', color: '#0099DD' },
    ],
    destinations: [
      { until: '唐木田', name: 'Karakida', ja: '唐木田方面', color: '#1a8fe8' },
    ] },
  { from: 'Odakyu Tama Line', fromEnd: '新百合ヶ丘',
    to:   'Odakyu Line',      toStation: '新百合ヶ丘', toDir: 'start' },

  // ── Musashino ↔ Keiyo at Nishi-Funabashi ──────────────────────────────
  // Musashino trains continue onto the Keiyo Line over the two freight legs:
  // toward Tokyo via Ichikawa-Shiohama, toward Kaihin-Makuhari via
  // Minami-Funabashi. Junction stations aren't on the source line → in via.
  { from: 'JR Musashino Line', fromEnd: '西船橋',
    to:   'JR Keiyo Line',     toStation: '市川塩浜', toDir: 'start',
    via:  ['市川塩浜'],
    name: 'Tokyo', ja: '東京方面', color: '#DC143C',
    lineDests: [
      { until: '西船橋', name: 'Nishi-Funabashi', ja: '西船橋方面', color: '#F77321' },
    ],
    destinations: [
      { until: '東京', name: 'Tokyo', ja: '東京方面', color: '#DC143C' },
    ] },
  { from: 'JR Musashino Line', fromEnd: '西船橋',
    to:   'JR Keiyo Line',     toStation: '南船橋', toDir: 'end',
    toUntil: '海浜幕張',
    via:  ['南船橋'],
    name: 'Kaihin-Makuhari', ja: '海浜幕張方面', color: '#DC143C',
    lineDests: [
      { until: '西船橋', name: 'Nishi-Funabashi', ja: '西船橋方面', color: '#F77321' },
    ],
    destinations: [
      { until: '海浜幕張', name: 'Kaihin-Makuhari', ja: '海浜幕張方面', color: '#DC143C' },
    ] },
  // Reverse: Keiyo riders branch onto the Musashino Line at both junctions
  { from: 'JR Keiyo Line',     fromStation: '市川塩浜', fromDir: 'end',
    to:   'JR Musashino Line', toEnd: '西船橋',
    via:  ['西船橋'],
    name: 'Fuchu-Hommachi', ja: '府中本町方面', color: '#F77321',
    lineDests: [
      { until: '蘇我', name: 'Soga', ja: '蘇我方面', color: '#DC143C' },
    ],
    destinations: [
      { until: '府中本町', name: 'Fuchu-Hommachi', ja: '府中本町方面', color: '#F77321' },
    ] },
  { from: 'JR Keiyo Line',     fromStation: '南船橋', fromDir: 'start',
    to:   'JR Musashino Line', toEnd: '西船橋',
    via:  ['西船橋'],
    name: 'Fuchu-Hommachi', ja: '府中本町方面', color: '#F77321',
    lineDests: [
      { until: '東京', name: 'Tokyo', ja: '東京方面', color: '#DC143C' },
    ],
    destinations: [
      { until: '府中本町', name: 'Fuchu-Hommachi', ja: '府中本町方面', color: '#F77321' },
    ] },

  // ── Yokohama Line ↔ Negishi Line at Higashi-Kanagawa/Yokohama ────────
  // Through-running: Yokohama Line trains continue from Higashi-Kanagawa
  // via Yokohama onto the Negishi Line toward Sakuragicho/Isogo/Ofuna.
  // lineDests = within-line short-turn destinations (Hashimoto, Machida, H-Kanagawa)
  // Rapid only runs on Sakuragicho-bound through-running trains.
  { from: 'JR Yokohama Line', fromEnd: '東神奈川',
    to:   'JR Negishi Line',  toEnd:   '横浜',
    via:  ['横浜'],
    lineDests: [
      { until: '橋本',     name: 'Hashimoto',        ja: '橋本方面',     color: '#6aba6a' },
      { until: '町田',     name: 'Machida',          ja: '町田方面',     color: '#3da03d' },
      { until: '東神奈川', name: 'Higashi-Kanagawa', ja: '東神奈川方面', color: '#00AD53' },
    ],
    destinations: [
      { until: '桜木町', name: 'Sakuragicho', ja: '桜木町方面', color: '#d477d1',
        services: ['Local', 'Rapid'] },
      { until: '磯子',   name: 'Isogo',       ja: '磯子方面',   color: '#b050b0',
        services: ['Local'] },
      { until: '大船',   name: 'Ofuna',       ja: '大船方面',   color: '#904090',
        services: ['Local'] },
    ],
    express: [
      { name: 'Local', ja: '各停', color: '#00a0e8', stops: null },
      { name: 'Rapid', ja: '快速', color: '#00b900',
        stops: ['Higashi-Kanagawa','Kikuna','Shin-Yokohama','Kamoi','Nakayama',
                'Nagatsuta','Machida','Sagamihara','Hashimoto',
                'Aihara','Hachiojiminamino','Katakura','Hachioji',
                'Yokohama','Sakuragicho'] },
    ] },
  { from: 'JR Negishi Line',  fromEnd: '横浜',
    to:   'JR Yokohama Line', toEnd:   '東神奈川',
    via:  ['東神奈川'],
    name: 'Hachioji', ja: '八王子方面', color: '#00AD53',
    lineDests: [
      { until: '横浜', name: 'Yokohama', ja: '横浜方面', color: '#d477d1' },
    ],
    destinations: [
      { until: '八王子', name: 'Hachioji', ja: '八王子方面', color: '#00AD53' },
    ] },

  // ── Hachiko Line ↔ Kawagoe Line at Komagawa ──────────────────────────
  // Through-running: Hachiko Line trains from Hachioji continue onto
  // the Kawagoe Line toward Kawagoe. Komagawa is shared terminus.
  { from: 'JR Hachiko Line', fromEnd: '高麗川',
    to:   'JR Kawagoe Line',  toEnd:   '高麗川',
    lineDests: [
      { until: '拝島',     name: 'Haijima',      ja: '拝島方面',     color: '#b8956a' },
      { until: '箱根ケ崎', name: 'Hakonegasaki', ja: '箱根ケ崎方面', color: '#a67d52' },
      { until: '高麗川',   name: 'Komagawa',     ja: '高麗川方面',   color: '#996633' },
    ],
    destinations: [
      { until: '川越', name: 'Kawagoe', ja: '川越方面', color: '#4a786f' },
    ] },
  { from: 'JR Kawagoe Line',  fromEnd: '高麗川',
    to:   'JR Hachiko Line',  toEnd:   '高麗川',
    name: 'Takasaki', ja: '高崎方面', color: '#996633',
    lineDests: [
      { until: '高麗川', name: 'Komagawa', ja: '高麗川方面', color: '#4a786f' },
    ],
    destinations: [
      { until: '高崎', name: 'Takasaki', ja: '高崎方面', color: '#996633' },
    ] },

  // ── Keihin-Tohoku Line ↔ Negishi Line at Yokohama ────────────────────
  // Through-running: KT Line trains continue from Yokohama onto the Negishi
  // Line toward Sakuragicho/Isogo/Ofuna. Rapid skips 7 stations in the
  // Tabata–Hamamatsucho section; Okachimachi added back on weekends.
  { from: 'JR Keihin Tohoku Line', fromEnd: '横浜',
    to:   'JR Negishi Line',       toEnd:   '横浜',
    lineDests: [
      { until: '赤羽',     name: 'Akabane',          ja: '赤羽方面',     color: '#48b8d0' },
      { until: '蒲田',     name: 'Kamata',            ja: '蒲田方面',     color: '#30a0b8' },
      { until: '鶴見',     name: 'Tsurumi',           ja: '鶴見方面',     color: '#2090a0' },
      { until: '東神奈川', name: 'Higashi-Kanagawa',  ja: '東神奈川方面', color: '#108088' },
      { until: '横浜',     name: 'Yokohama',          ja: '横浜方面',     color: '#00B2E5' },
    ],
    destinations: [
      { until: '桜木町', name: 'Sakuragicho', ja: '桜木町方面', color: '#d477d1' },
      { until: '磯子',   name: 'Isogo',       ja: '磯子方面',   color: '#b050b0' },
      { until: '大船',   name: 'Ofuna',       ja: '大船方面',   color: '#904090' },
    ],
    express: [
      { name: 'Local', ja: '各停', color: '#00a0e8', stops: null },
      { name: 'Rapid', ja: '快速', color: '#00b900', stops: [
        'Omiya','Saitama-Shintoshin','Yono','Kita-Urawa','Urawa',
        'Minami-Urawa','Warabi','Nishi-Kawaguchi','Kawaguchi','Akabane',
        'Higashi-Jūjō','Oji','Kami-Nakazato','Tabata',
        'Okachimachi','Akihabara','Kanda','Tokyo',
        'Hamamatsucho','Tamachi','Takanawa Gateway','Shinagawa',
        'Oimachi','Ōmori','Kamata','Kawasaki','Tsurumi',
        'Shin-Koyasu','Higashi-Kanagawa','Yokohama',
        'Sakuragicho','Kannai','Ishikawacho','Yamate','Negishi',
        'Isogo','Shin-Sugita','Yokodai','Konandai','Hongodai','Ōfuna'],
        schedule: { weekday: { skip: ['Okachimachi'] } } },
    ] },
  { from: 'JR Negishi Line',       fromEnd: '横浜',
    to:   'JR Keihin Tohoku Line', toEnd:   '横浜',
    name: 'Omiya', ja: '大宮方面', color: '#00B2E5',
    lineDests: [
      { until: '横浜', name: 'Yokohama', ja: '横浜方面', color: '#d477d1' },
    ],
    destinations: [
      { until: '大宮', name: 'Omiya', ja: '大宮方面', color: '#00B2E5' },
    ] },
];
