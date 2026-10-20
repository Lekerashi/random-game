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
//     fromLineHas / toLineHas — JA station that the source / target segment must contain,
//                         to pick one of several same-name segments (JR Hachiko Line)
//     impliedLines      — line names whose tracks the via stations ride over
//                         (excluded from mid-route transfer offers — you can't
//                         "transfer" to the train you're already on)
//     chainFrom         — boarding lines whose chained rides may continue onto this
//                         connection (e.g. Hokuso only from the Asakusa Line); [] = never
//     boardFrom         — JA source station: offered only from there toward the junction,
//                         not at the junction itself (Chuo-Sobu → Tozai trains start at 津田沼)
//     destinations[].boardSchedule — { JA source station: schedule }: at a listed station the
//                         destination is offered only while that schedule runs (Musashino
//                         trains leave 海浜幕張 only mornings/evenings); other stations: always
//
//   DISPLAY:
//     name, ja, color   — button label for branch picker (when multiple conns from same platform)
//     displayName       — override platform pill label (e.g. "Ueno Tokyo Line")
//
//   SERVICES:
//     destinations      — [{ until (JA), name, ja, color?, services?, localFrom?, chainFrom? }] train terminus picker
//                         chainFrom (per destination): boarding lines whose chained pickers may offer it
//                         localFrom (JA, source line): with `services`, local-class services only
//                         feed this destination from that station onward toward the junction —
//                         the destination is hidden at earlier stations no allowed service calls at
//     lineDests         — [{ until (JA), name, ja, color?, services?, schedule? }] within-line short-turn picker
//     express           — [{ name, ja, color?, stops, schedule?, chainName? }] cross-line express services
//                         schedule as in EXPRESS_SERVICES (connections are already one-way);
//                         same-name entries with different stops give per-segment hours
//     destinations / lineDests entries and LINE_BRANCHES / LINE_DESTINATIONS entries take
//                         schedule too (timeRange, or stops: [] to hide that day type)
//                         chainName: an earlier hop's service that continues as this one
//                         (Airport Rapid → Access Express onto Sky Access)
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
//   chained destinations      → onward hops at the target line's far end, plus mid-line
//                               connections with destinations further along it (taken
//                               only when the picked destination's chain names them)
//   via                       → intermediate stations counted toward stops
//   displayName               → overrides platform pill label

// Stop lists shared by the 横須賀・総武快速線 connections below (express lists run in travel order)
const SOBU_RAPID_WEST = ['東京', '新日本橋', '馬喰町', '錦糸町', '新小岩', '市川', '船橋', '津田沼', '稲毛', '千葉']; // 快速 stops 東京–千葉
const SOBU_RAPID_WEST_UP = [...SOBU_RAPID_WEST].reverse();                                                      // 千葉–東京
const YOKOSUKA_PAST_TOKYO = ['新橋', '品川', '西大井', '武蔵小杉', '新川崎', '横浜', '保土ケ谷', '東戸塚', '戸塚', '大船',
  '北鎌倉', '鎌倉', '逗子', '東逗子', '田浦', '横須賀', '衣笠', '久里浜'];
const UCHIBO_RAPID_PAST_CHIBA = ['本千葉', '蘇我', '浜野', '八幡宿', '五井', '姉ケ崎', '長浦', '袖ケ浦', '木更津', '君津']; // passes 巌根
const KEIYO_RAPID = ['東京', '八丁堀', '新木場', '舞浜', '新浦安', '南船橋', '海浜幕張', '検見川浜', '稲毛海岸', '千葉みなと', '蘇我'];

const LINE_CONNECTIONS = [

  // ── Hanzomon ↔ Den-en-toshi at Shibuya ──────────────────────────────────
  // Simple 1:1 through-running — no picker needed, route extends transparently
  // Toward 渋谷 the through trains end at 中央林間, 長津田 (50 wd, all types) or 鷺沼
  // (9 wd 各停, mornings and the last ones); 1 a day ends at 渋谷 (ODPT 2026-03)
  { from: 'Tokyo Metro Hanzomon Line', fromEnd: '渋谷',
    to:   'Tokyu Den-en-toshi Line',   toEnd:   '渋谷',
    destinations: [
      // chainFrom []: the 鷺沼 trains start on the Hanzomon, none comes through from Tobu
      { until: '鷺沼',     name: 'Saginuma',    ja: '鷺沼方面',     color: '#50b8a0', services: ['Local'], chainFrom: [],
        schedule: { weekday: { timeRange: [[7, 11], [23, 1]] }, weekend: { timeRange: [23, 1] } } },
      { until: '長津田',   name: 'Nagatsuta',   ja: '長津田方面',   color: '#30a890',
        schedule: { weekday: { timeRange: [[6, 12], [15, 1]] }, weekend: { timeRange: [[8, 11], [16, 21], [22, 1]] } } },
      { until: '中央林間', name: 'Chuo-Rinkan', ja: '中央林間方面', color: '#20a288' },
    ] },
  // Toward 渋谷 the late 各停 from 中央林間 turn at 長津田, a few at 渋谷; through trains end at
  // 押上 (161 wd), 清澄白河 (17 wd, mornings and the last ones) or on Tobu (chained: 久喜,
  // 南栗橋, 北越谷) (ODPT 2026-03)
  { from: 'Tokyu Den-en-toshi Line',   fromEnd: '渋谷',
    to:   'Tokyo Metro Hanzomon Line', toEnd:   '渋谷',
    lineDests: [
      { until: '長津田', name: 'Nagatsuta', ja: '長津田方面', color: '#30a890', services: ['Local'],
        schedule: { weekday: { timeRange: [21, 1] }, weekend: { timeRange: [[17, 18], [21, 1]] } } },
      { until: '渋谷',   name: 'Shibuya',   ja: '渋谷方面',   color: '#20a288',
        schedule: { weekday: { timeRange: [[5, 7], [23, 1]] }, weekend: { timeRange: [[5, 7], [22, 1]] } } },
    ],
    destinations: [
      { until: '清澄白河', name: 'Kiyosumi-shirakawa', ja: '清澄白河方面', color: '#8F76D6',
        schedule: { weekday: { timeRange: [[6, 11], [22, 1]] }, weekend: { timeRange: [20, 24] } } },
      { until: '押上(スカイツリー前)', name: 'Oshiage', ja: '押上方面', color: '#8F76D6' },
    ] },

  // ── Oimachi → Den-en-toshi at Mizonokuchi ───────────────────────────────
  // About half the Oimachi 急行 run on as Den-en-toshi 急行 to Nagatsuta or
  // Chuo-Rinkan (more often midday/weekends). Locals terminate at Mizonokuchi.
  { from: 'Tokyu Oimachi Line',      fromEnd: '溝の口',
    to:   'Tokyu Den-en-toshi Line', toStation: '溝の口', toDir: 'end',
    lineDests: [
      { until: '溝の口', name: 'Mizonokuchi', ja: '溝の口方面' },
    ],
    destinations: [
      // The evening green 各停 run on to 鷺沼 (5 wd / 8 Sat/hol, ODPT 2026-03)
      { until: '鷺沼',     name: 'Saginuma',    ja: '鷺沼方面',     color: '#50b8a0', services: ['Local (G)'],
        schedule: { weekday: { timeRange: [21, 1] }, weekend: { timeRange: [19, 1] } } },
      { until: '長津田',   name: 'Nagatsuta',   ja: '長津田方面',   services: ['Express'],
        schedule: { weekday: { timeRange: [[15, 16], [17, 23]] }, weekend: { timeRange: [[16, 17], [19, 22]] } } },
      { until: '中央林間', name: 'Chuo-Rinkan', ja: '中央林間方面', services: ['Express'],
        schedule: { weekday: { timeRange: [[11, 16], [23, 24]] }, weekend: { timeRange: [[9, 16], [17, 20]] } } },
    ],
    express: [
      { name: 'Express', ja: '急行', color: '#e83030', stops: [
        '大井町','旗の台','大岡山','自由が丘','二子玉川','溝の口',
        '鷺沼','たまプラーザ','あざみ野','青葉台','長津田','南町田グランベリーパーク','中央林間',
      ], schedule: { weekday: { timeRange: [[11, 16], [17, 24]] }, weekend: { timeRange: [9, 22] } } },
    ] },

  // ...and back: by day some Oimachi 急行 start at 長津田/中央林間 (jawiki 東急大井町線)
  { from: 'Tokyu Den-en-toshi Line', fromStation: '溝の口', fromDir: 'start',
    to:   'Tokyu Oimachi Line',      toEnd: '溝の口',
    name: 'Oimachi', ja: '大井町方面', color: '#f18c43',
    destinations: [
      { until: '大井町', name: 'Oimachi', ja: '大井町方面', color: '#f18c43', services: ['Oimachi Line Express', 'Local (G)'],
        schedule: { weekday: { timeRange: [[5, 7], [11, 17]] }, weekend: { timeRange: [5, 17] } } },
    ],
    express: [
      // The first trains of the day are green 各停 from 鷺沼 (5 wd / 8 Sat/hol, ODPT 2026-03)
      { name: 'Local (G)', ja: '各停（緑）', color: '#00a870', stops: [
        '鷺沼','宮前平','宮崎台','梶が谷','溝の口','高津','二子新地','二子玉川','上野毛','等々力','尾山台',
        '九品仏','自由が丘','緑が丘','大岡山','北千束','旗の台','荏原町','中延','戸越公園','下神明','大井町',
      ], schedule: { weekday: { timeRange: [5, 6] }, weekend: { timeRange: [5, 9] } } },
      { name: 'Oimachi Line Express', ja: '大井町線 急行', color: '#f18c43', stops: [
        '中央林間','南町田グランベリーパーク','長津田','青葉台','あざみ野','たまプラーザ','鷺沼',
        '溝の口','二子玉川','自由が丘','大岡山','旗の台','大井町',
      ], schedule: { weekday: { timeRange: [[6, 7], [11, 17]] }, weekend: { timeRange: [9, 17] } } },
    ] },

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
        stops: ['泉岳寺','品川','青物横丁','立会川','平和島','京急蒲田',
                '糀谷','大鳥居','穴守稲荷','天空橋',
                '羽田空港第3ターミナル','羽田空港第1・第2ターミナル'] },
      // 特急 call at every Airport Line station; 快特 at both Haneda stations
      { name: 'Ltd. Express', ja: '特急', color: '#e84040',
        stops: ['泉岳寺','品川','青物横丁','平和島','京急蒲田',
                '糀谷','大鳥居','穴守稲荷','天空橋',
                '羽田空港第3ターミナル','羽田空港第1・第2ターミナル'] },
      { name: 'Rapid Ltd. Exp', ja: '快特', color: '#e83080',
        stops: ['泉岳寺','品川','京急蒲田',
                '羽田空港第3ターミナル','羽田空港第1・第2ターミナル'] },
      { name: 'Airport Rapid', ja: 'エアポート快特', color: '#e83080',
        stops: ['泉岳寺','品川',
                '羽田空港第3ターミナル','羽田空港第1・第2ターミナル'],
        schedule: { weekday: { timeRange: [[10, 16], [20, 23]] }, weekend: { timeRange: [10, 19] } } },
    ] },
  { from: 'Keikyu Airport Line',  fromEnd: '京急蒲田',
    to:   'Keikyu Main Line',     toStation: '京急蒲田', toDir: 'end',
    toUntil: '横浜',
    name: 'Yokohama', ja: '横浜方面', color: '#1a8fe8',
    express: [
      { stops: null, name: 'Local', ja: '各停', color: '#00a0e8' },
      { name: 'Express', ja: '急行', color: '#e83030',
        stops: ['京急蒲田','京急川崎','京急鶴見','神奈川新町',
                '京急東神奈川','横浜',
                '糀谷','大鳥居','穴守稲荷','天空橋',
                '羽田空港第3ターミナル','羽田空港第1・第2ターミナル'] },
      { name: 'Ltd. Express', ja: '特急', color: '#e84040',
        stops: ['横浜','京急川崎','京急蒲田',
                '糀谷','大鳥居','穴守稲荷','天空橋',
                '羽田空港第3ターミナル','羽田空港第1・第2ターミナル'] },
      { name: 'Rapid Ltd. Exp', ja: '快特', color: '#e83080',
        stops: ['横浜','京急川崎','京急蒲田',
                '羽田空港第3ターミナル','羽田空港第1・第2ターミナル'] },
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
      // services: chained Asakusa/Sky Access riders board express-class trains only
      { until: '羽田空港第1・第2ターミナル', name: 'Haneda Airport', ja: '羽田空港方面', color: '#1a8fe8',
        services: ['Airport Local', 'Express', 'Ltd. Express', 'Rapid Ltd. Exp', 'Airport Rapid', 'Access Express'] },
    ],
    express: [
      { name: 'Airport Local', ja: '空港各停', color: '#00a0e8', stops: null },
      { name: 'Express', ja: '急行', color: '#e83030',
        stops: ['泉岳寺','品川','青物横丁','立会川','平和島','京急蒲田',
                '糀谷','大鳥居','穴守稲荷','天空橋',
                '羽田空港第3ターミナル','羽田空港第1・第2ターミナル'] },
      { name: 'Ltd. Express', ja: '特急', color: '#e84040',
        stops: ['泉岳寺','品川','青物横丁','平和島','京急蒲田',
                '糀谷','大鳥居','穴守稲荷','天空橋',
                '羽田空港第3ターミナル','羽田空港第1・第2ターミナル'] },
      { name: 'Rapid Ltd. Exp', ja: '快特', color: '#e83080',
        stops: ['泉岳寺','品川','京急蒲田',
                '羽田空港第3ターミナル','羽田空港第1・第2ターミナル'] },
      { name: 'Airport Rapid', ja: 'エアポート快特', color: '#e83080', chainName: 'Access Express',
        stops: ['品川',
                '羽田空港第3ターミナル','羽田空港第1・第2ターミナル'],
        schedule: { weekday: { timeRange: [[6, 7], [9, 16]] }, weekend: { timeRange: [[6, 7], [9, 19]] } } },
    ] },
  { from: 'Keikyu Main Line',     fromStation: '京急蒲田', fromDir: 'start',
    to:   'Keikyu Airport Line',   toEnd: '京急蒲田',
    name: 'Airport', ja: '羽田空港方面', color: '#1a8fe8',
    lineDests: [
      { until: '京急蒲田', name: 'Keikyu Kamata', ja: '京急蒲田方面', color: '#e57053' },
      { until: '品川', name: 'Shinagawa', ja: '品川方面', color: '#c83030' },
    ],
    destinations: [
      { until: '羽田空港第1・第2ターミナル', name: 'Haneda Airport', ja: '羽田空港方面', color: '#1a8fe8' },
    ],
    express: [
      { name: 'Airport Local', ja: '空港各停', color: '#00a0e8', stops: null },
      { name: 'Express', ja: '急行', color: '#e83030',
        stops: ['横浜','京急東神奈川','神奈川新町','京急鶴見',
                '京急川崎','京急蒲田',
                '糀谷','大鳥居','穴守稲荷','天空橋',
                '羽田空港第3ターミナル','羽田空港第1・第2ターミナル'] },
      { name: 'Ltd. Express', ja: '特急', color: '#e84040',
        stops: ['横浜','京急川崎','京急蒲田',
                '糀谷','大鳥居','穴守稲荷','天空橋',
                '羽田空港第3ターミナル','羽田空港第1・第2ターミナル'] },
      { name: 'Rapid Ltd. Exp', ja: '快特', color: '#e83080',
        stops: ['横浜','京急川崎','京急蒲田',
                '羽田空港第3ターミナル','羽田空港第1・第2ターミナル'] },
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
      { until: '京急久里浜', name: 'Keikyu Kurihama', ja: '京急久里浜方面', color: '#00539f',
        services: ['Local', 'Ltd. Express', 'Rapid Ltd. Exp'], chainFrom: ['Toei Asakusa Line', 'Keisei Oshiage Line', 'Keisei Main Line', 'Hokuso Railway Hokuso Line'] },
      { until: '三崎口', name: 'Misakiguchi', ja: '三崎口方面', color: '#e83080',
        services: ['Ltd. Express', 'Rapid Ltd. Exp'], chainFrom: ['Toei Asakusa Line', 'Keisei Oshiage Line', 'Keisei Main Line', 'Hokuso Railway Hokuso Line'] },
    ],
    express: [
      { stops: null, name: 'Local', ja: '各停', color: '#00a0e8' },
      { name: 'Ltd. Express', ja: '特急', color: '#e84040',
        stops: ['泉岳寺','品川','青物横丁','平和島','京急蒲田',
                '京急川崎','神奈川新町','横浜','上大岡',
                '金沢文庫','金沢八景','追浜','汐入','横須賀中央',
                '堀ノ内','新大津','北久里浜','京急久里浜','ＹＲＰ野比',
                '京急長沢','津久井浜','三浦海岸','三崎口'] },
      { name: 'Rapid Ltd. Exp', ja: '快特', color: '#e83080',
        stops: ['泉岳寺','品川','京急蒲田','京急川崎','横浜',
                '上大岡','金沢文庫','金沢八景','横須賀中央',
                '堀ノ内','新大津','北久里浜','京急久里浜','ＹＲＰ野比',
                '京急長沢','津久井浜','三浦海岸','三崎口'] },
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
      // chainFrom: no Asakusa-line train ends here (ODPT 2025-12); the Haneda 急行 do (Airport Line boarders)
      { until: '逗子・葉山', name: 'Zushi-Hayama', ja: '逗子・葉山方面', color: '#00a662',
        services: ['Local', 'Express'], localFrom: '金沢文庫', chainFrom: ['Keikyu Airport Line'] },
    ],
    express: [
      { stops: null, name: 'Local', ja: '各停', color: '#00a0e8' },
      { name: 'Express', ja: '急行', color: '#e83030',
        stops: ['京急蒲田','京急川崎','京急鶴見','神奈川新町',
                '京急東神奈川','横浜','日ノ出町','井土ヶ谷','弘明寺',
                '上大岡','杉田','能見台','金沢文庫','金沢八景',
                '六浦','神武寺','逗子・葉山'] },
    ] },
  { from: 'Keikyu Zushi Line', fromEnd: '金沢八景',
    to:   'Keikyu Main Line',  toStation: '金沢八景', toDir: 'start',
    toUntil: '京急蒲田',
    express: [
      { stops: null, name: 'Local', ja: '各停', color: '#00a0e8' },
      { name: 'Express', ja: '急行', color: '#e83030',
        stops: ['逗子・葉山','神武寺','六浦','金沢八景','金沢文庫',
                '能見台','杉田','上大岡','弘明寺','井土ヶ谷','日ノ出町','横浜',
                '京急東神奈川','神奈川新町','京急鶴見',
                '京急川崎','京急蒲田'] },
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
      { until: '古河',   name: 'Koga',       ja: '古河方面',   color: '#6ebc5e', services: ['Local'],
        schedule: { weekday: { timeRange: [7, 20] }, weekend: { timeRange: [9, 21] } } },
      { until: '小金井', name: 'Koganei', ja: '小金井方面', color: '#5ebc6e', services: ['Local'] },
      { until: '宇都宮', name: 'Utsunomiya', ja: '宇都宮方面', color: '#2a8848' },
    ],
    // ラビット through trains: 2 a morning from 小田原/熱海/国府津, every Tokaido station
    // (the evening ラビット start at 上野, so the Utsunomiya Line's own type is hidden here);
    // hours as seen on the Utsunomiya side (ODPT 2026-03)
    express: [
      { stops: null, name: 'Local', ja: '普通' },
      { name: 'Rapid Rabbit', ja: '快速ラビット', color: '#e85050',
        stops: ['上野','赤羽','浦和','大宮','東大宮','蓮田','久喜','古河',
                '小山','小金井','自治医大','石橋','雀宮','宇都宮'],
        schedule: { weekday: { timeRange: [6, 10] }, weekend: { timeRange: [6, 10] } } },
    ] },
  { from: 'JR Tokaido Main Line', fromEnd: '東京',
    to:   'JR Takasaki Line',     toEnd:   '上野',
    via:  ['上野'],
    name: 'Takasaki', ja: '高崎線', color: '#424d6d',
    displayName: 'Ueno Tokyo Line',
    destinations: [
      { until: '籠原', name: 'Kagohara', ja: '籠原方面', color: '#6a7a9d', services: ['Local'] },
      { until: '高崎', name: 'Takasaki', ja: '高崎方面', color: '#424d6d' },
    ],
    // アーバン through trains: 2 a morning from 小田原/国府津, every Tokaido station
    // (the evening アーバン start at 上野, so the Takasaki Line's own type is hidden here)
    express: [
      { stops: null, name: 'Local', ja: '普通' },
      { name: 'Rapid Urban', ja: '快速アーバン', color: '#f07000',
        stops: ['上野','赤羽','浦和','大宮','上尾','桶川','鴻巣','熊谷','籠原',
                '深谷','岡部','本庄','神保原','新町','倉賀野','高崎'],
        schedule: { weekday: { timeRange: [8, 11] }, weekend: { timeRange: [8, 12] } } },
    ] },
  { from: 'JR Tokaido Main Line', fromEnd: '東京',
    to:   'JR Joban Line',        toEnd:   '上野',
    via:  ['上野'],
    name: 'Joban', ja: '常磐線', color: '#009BBF',
    displayName: 'Ueno Tokyo Line',
    // On the rapid tracks every train calls at every station: 快速 to 取手, 普通 (中距離) beyond
    destinations: [
      { until: '取手', name: 'Toride',    ja: '取手方面', color: '#009BBF', services: ['Local'] },
      { until: '土浦', name: 'Tsuchiura', ja: '土浦方面', color: '#0a7fa0', services: ['Local', 'Special Rapid'] },
      { until: '水戸', name: 'Mito',      ja: '水戸方面', color: '#086080', services: ['Local'] },
      { until: '勝田', name: 'Katsuta',   ja: '勝田方面', color: '#064860', services: ['Local'] },
    ],
    express: [
      { stops: null, name: 'Local', ja: '普通' },
      // Only 2 down trains a day since 2022 (品川 14:55, 15:55 → 土浦; 15–17h on the Joban side)
      { name: 'Special Rapid', ja: '特別快速', color: '#e85050',
        stops: ['品川','新橋','東京','上野','日暮里','北千住','松戸','柏','取手',
                '藤代','龍ケ崎市','牛久','ひたち野うしく','荒川沖','土浦'],
        schedule: { weekday: { timeRange: [15, 18] }, weekend: { timeRange: [15, 18] } } },
    ] },
  // Some trains terminate at Ueno
  { from: 'JR Tokaido Main Line', fromEnd: '東京',
    to:   'Utsunomiya Line',      toEnd:   '上野',
    via:  ['上野'],
    toUntil: '上野',
    name: 'Ueno', ja: '上野方面', color: '#E78B54',
    displayName: 'Ueno Tokyo Line',
    express: [{ stops: null, name: 'Local', ja: '普通' }] }, // no ラビット terminates at 上野

  // ── Tokaido UTL southbound ──────────────────────────────────────────────
  // From northern lines heading south onto Tokaido
  // Half the trains from 黒磯 end at 宇都宮, a few at 上野; none at 東京 (ODPT 2026-03)
  { from: 'Utsunomiya Line',      fromEnd: '上野',
    to:   'JR Tokaido Main Line',  toEnd:   '東京',
    via:  ['東京'],
    displayName: 'Ueno Tokyo Line',
    lineDests: [
      { until: '宇都宮', name: 'Utsunomiya', ja: '宇都宮方面', color: '#2a8848', services: ['Local'],
        schedule: { weekday: { timeRange: [5, 23] }, weekend: { timeRange: [5, 23] } } },
      { until: '上野',   name: 'Ueno',       ja: '上野方面',   color: '#F7A600' },
    ],
    destinations: [
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
    lineDests: [
      { until: '上野', name: 'Ueno', ja: '上野方面', color: '#F7A600' },
    ],
    destinations: [
      { until: '東京',   name: 'Tokyo',     ja: '東京方面', color: '#F7A600' },
      { until: '品川',   name: 'Shinagawa', ja: '品川方面', color: '#009BBF' },
      { until: '平塚',   name: 'Hiratsuka', ja: '平塚方面', color: '#48a842' },
      { until: '国府津', name: 'Kozu',      ja: '国府津方面', color: '#1a8fe8' },
      { until: '小田原', name: 'Odawara',   ja: '小田原方面', color: '#e87830' },
      { until: '熱海',   name: 'Atami',     ja: '熱海方面', color: '#e85050' },
      { until: '沼津',   name: 'Numazu',    ja: '沼津方面', color: '#9060c0' },
    ] },
  // No Joban train terminates at Tokyo: all through trains run to Shinagawa. Half the
  // trains from 勝田 end at 水戸, the next stop (ODPT 2026-03)
  { from: 'JR Joban Line',        fromEnd: '上野',
    to:   'JR Tokaido Main Line',  toEnd:   '東京',
    via:  ['東京'],
    displayName: 'Ueno Tokyo Line',
    lineDests: [
      { until: '水戸', name: 'Mito', ja: '水戸方面', color: '#086080', services: ['Local'],
        schedule: { weekday: { timeRange: [5, 24] }, weekend: { timeRange: [5, 24] } } },
      { until: '上野', name: 'Ueno', ja: '上野方面', color: '#009BBF', services: ['Local'] },
    ],
    destinations: [
      { until: '品川',   name: 'Shinagawa', ja: '品川方面', color: '#009BBF' },
    ],
    // The 2 morning 特別快速 from 土浦 run through to 品川
    express: [
      { stops: null, name: 'Local', ja: '普通' },
      { name: 'Special Rapid', ja: '特別快速', color: '#e85050',
        stops: ['土浦','荒川沖','ひたち野うしく','牛久','龍ケ崎市','藤代','取手','柏','松戸','北千住','日暮里','上野','東京','品川'],
        schedule: { weekday: { timeRange: [9, 11] }, weekend: { timeRange: [9, 11] } } },
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
        services: ['Local', 'Rapid (Utsunomiya–Yokosuka)'] },
    ],
    // Utsunomiya-Yokosuka system 快速 all day, all stations past 大船; most skip 西大井 / 新川崎,
    // the daytime ones (a quarter) call there (ODPT 2026-03)
    express: [
      { name: 'Rapid (Utsunomiya–Yokosuka)', ja: '快速（宇都宮・横須賀線系統）', color: '#40a060',
        stops: ['大宮','浦和','赤羽','池袋','新宿','渋谷','恵比寿','大崎','武蔵小杉','横浜','保土ケ谷','東戸塚','戸塚','大船','北鎌倉','鎌倉','逗子'] },
      { name: 'Rapid (Utsunomiya–Yokosuka)', ja: '快速（宇都宮・横須賀線系統）', color: '#40a060',
        stops: ['大宮','浦和','赤羽','池袋','新宿','渋谷','恵比寿','大崎','西大井','武蔵小杉','新川崎','横浜','保土ケ谷','東戸塚','戸塚','大船','北鎌倉','鎌倉','逗子'],
        schedule: { weekday: { timeRange: [10, 18] }, weekend: { timeRange: [9, 18] } } },
    ] },
  { from: 'JR Shonan Shinjuku Line', fromEnd: '大船',
    to:   'JR Tokaido Main Line',    toStation: '大船', toDir: 'end',
    chainFrom: ['JR Shonan Shinjuku Line'], // Utsunomiya-system trains go to Zushi
    name: 'Odawara', ja: '小田原方面', color: '#F7A600',
    destinations: [
      { until: '平塚',   name: 'Hiratsuka', ja: '平塚方面', color: '#48a842' },
      { until: '国府津', name: 'Kozu',      ja: '国府津方面', color: '#1a8fe8' },
      { until: '小田原', name: 'Odawara',   ja: '小田原方面', color: '#e87830' },
    ],
    // 特別快速 skip 辻堂/大磯/二宮/鴨宮 (快速 run all stations past 大船);
    // 特別快速 hourly by day only (新宿 11:00–17:00 southbound)
    express: [
      { name: 'Special Rapid', ja: '特別快速', color: '#e83080',
        stops: ['大宮','浦和','赤羽','池袋','新宿','渋谷','大崎','武蔵小杉','横浜','戸塚','大船',
                '藤沢','茅ケ崎','平塚','国府津','小田原'],
        schedule: { weekday: { timeRange: [10, 18] }, weekend: { timeRange: [8, 18] } } },
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
        services: ['Local', 'Rapid (Utsunomiya–Yokosuka)'] },
    ],
    // Utsunomiya-Yokosuka system 快速 all day: skips 土呂/白岡/新白岡/東鷲宮/栗橋/野木/間々田; most
    // skip 西大井 / 新川崎, the daytime ones (a quarter) call there (ODPT 2026-03)
    express: [
      { name: 'Rapid (Utsunomiya–Yokosuka)', ja: '快速（宇都宮・横須賀線系統）', color: '#40a060',
        stops: ['大船','戸塚','東戸塚','保土ケ谷','横浜','武蔵小杉','大崎','恵比寿','渋谷','新宿','池袋','赤羽','浦和','大宮',
                '東大宮','蓮田','久喜','古河','小山','小金井','自治医大','石橋','雀宮','宇都宮'] },
      { name: 'Rapid (Utsunomiya–Yokosuka)', ja: '快速（宇都宮・横須賀線系統）', color: '#40a060',
        stops: ['大船','戸塚','東戸塚','保土ケ谷','横浜','新川崎','武蔵小杉','西大井','大崎','恵比寿','渋谷','新宿','池袋','赤羽','浦和','大宮',
                '東大宮','蓮田','久喜','古河','小山','小金井','自治医大','石橋','雀宮','宇都宮'],
        schedule: { weekday: { timeRange: [8, 17] }, weekend: { timeRange: [8, 17] } } },
    ] },
  { from: 'JR Shonan Shinjuku Line', fromEnd: '大宮',
    to:   'JR Takasaki Line',        toStation: '大宮', toDir: 'end',
    name: 'Takasaki', ja: '高崎線', color: '#F68B1E',
    destinations: [
      { until: '籠原', name: 'Kagohara', ja: '籠原方面', color: '#6a7a9d' },
      { until: '高崎', name: 'Takasaki', ja: '高崎方面', color: '#424d6d' },
    ],
    // 特別快速 skip 宮原/北上尾/北鴻巣/吹上/行田 (快速 run all stations past 大宮,
    // listed because the Takasaki Line's own アーバン would otherwise replace them)
    express: [
      { name: 'Rapid', ja: '快速', color: '#00b900',
        stops: ['大船','戸塚','横浜','武蔵小杉','大崎','恵比寿','渋谷','新宿','池袋','赤羽','浦和','大宮',
                '宮原','上尾','北上尾','桶川','北本','鴻巣','北鴻巣','吹上','行田','熊谷','籠原',
                '深谷','岡部','本庄','神保原','新町','倉賀野','高崎'] },
      // 特別快速 by day only (新宿 10:11–17:23 northbound)
      { name: 'Special Rapid', ja: '特別快速', color: '#e83080',
        stops: ['大船','戸塚','横浜','武蔵小杉','大崎','渋谷','新宿','池袋','赤羽','浦和','大宮',
                '上尾','桶川','北本','鴻巣','熊谷','籠原','深谷','岡部','本庄','神保原',
                '新町','倉賀野','高崎'],
        schedule: { weekday: { timeRange: [9, 18] }, weekend: { timeRange: [9, 18] } } },
    ] },
  // Utsunomiya-Yokosuka system trains run on from the Utsunomiya Line at 大宮
  { from: 'Utsunomiya Line',         fromStation: '大宮', fromDir: 'start',
    to:   'JR Shonan Shinjuku Line', toEnd: '大宮',
    name: 'Shonan-Shinjuku', ja: '湘南新宿ライン', color: '#E9003F',
    // (逗子 comes in as a chained destination over the Yokosuka connection at 大船)
    destinations: [
      { until: '大船', name: 'Ofuna', ja: '大船方面', color: '#E9003F',
        services: ['Local', 'Rapid (Utsunomiya–Yokosuka)'] },
    ],
    // 快速 from 宇都宮 9–17h weekdays, 8–17h weekends; the daytime ones call at 西大井 / 新川崎 (ODPT 2026-03)
    express: [
      { stops: null, name: 'Local', ja: '普通' },
      { name: 'Rapid (Utsunomiya–Yokosuka)', ja: '快速（宇都宮・横須賀線系統）', color: '#40a060',
        stops: ['宇都宮','雀宮','石橋','自治医大','小金井','小山','古河','久喜','蓮田','東大宮',
                '大宮','浦和','赤羽','池袋','新宿','渋谷','恵比寿','大崎','武蔵小杉','横浜','保土ケ谷','東戸塚','戸塚','大船'],
        schedule: { weekday: { timeRange: [9, 18] }, weekend: { timeRange: [8, 18] } } },
      { name: 'Rapid (Utsunomiya–Yokosuka)', ja: '快速（宇都宮・横須賀線系統）', color: '#40a060',
        stops: ['宇都宮','雀宮','石橋','自治医大','小金井','小山','古河','久喜','蓮田','東大宮',
                '大宮','浦和','赤羽','池袋','新宿','渋谷','恵比寿','大崎','西大井','武蔵小杉','新川崎','横浜','保土ケ谷','東戸塚','戸塚','大船'],
        schedule: { weekday: { timeRange: [10, 18] }, weekend: { timeRange: [9, 18] } } },
    ] },

  // Takasaki–Tokaido system trains run on from the Takasaki Line at 大宮 (to 小田原
  // past 大船: chained destinations over the Tokaido connection at 大船)
  { from: 'JR Takasaki Line',        fromStation: '大宮', fromDir: 'start',
    to:   'JR Shonan Shinjuku Line', toEnd: '大宮',
    name: 'Shonan-Shinjuku', ja: '湘南新宿ライン', color: '#E9003F',
    destinations: [
      { until: '大船', name: 'Ofuna', ja: '大船方面', color: '#E9003F',
        services: ['Local', 'Rapid', 'Special Rapid'] },
    ],
    express: [
      { stops: null, name: 'Local', ja: '普通' },
      { name: 'Rapid', ja: '快速', color: '#00b900',
        stops: ['高崎','倉賀野','新町','神保原','本庄','岡部','深谷','籠原','熊谷','行田','吹上',
                '北鴻巣','鴻巣','北本','桶川','北上尾','上尾','宮原',
                '大宮','浦和','赤羽','池袋','新宿','渋谷','恵比寿','大崎','武蔵小杉','横浜','戸塚','大船'] },
      { name: 'Special Rapid', ja: '特別快速', color: '#e83080',
        stops: ['高崎','倉賀野','新町','神保原','本庄','岡部','深谷','籠原','熊谷','鴻巣','北本','桶川','上尾',
                '大宮','浦和','赤羽','池袋','新宿','渋谷','大崎','武蔵小杉','横浜','戸塚','大船'],
        schedule: { weekday: { timeRange: [9, 17] }, weekend: { timeRange: [7, 17] } } }, // 高崎 9:15–15:14, later downstream
    ] },

  // ── Yokosuka ↔ Sobu Rapid at Tokyo (横須賀・総武快速線) ──────────────
  // Nearly all Yokosuka trains continue onto Sobu Rapid at Tokyo and vice versa.
  // Daytime trains from 久里浜 end at 逗子 (ODPT 2026-03)
  { from: 'JR Yokosuka Line', fromEnd: '東京',
    to:   'JR Sobu Line',     toEnd: '東京',
    lineDests: [
      { until: '逗子', name: 'Zushi', ja: '逗子方面', color: '#0068B7',
        schedule: { weekday: { timeRange: [8, 18] }, weekend: { timeRange: [8, 18] } } },
      { until: '東京', name: 'Tokyo', ja: '東京方面', color: '#0068B7' },
    ],
    destinations: [
      { until: '津田沼', name: 'Tsudanuma', ja: '津田沼方面', color: '#F7C948' },
      { until: '千葉',   name: 'Chiba',     ja: '千葉方面',   color: '#E85830' },
    ] },
  // The 普通 from the east end at 千葉; every through train is a 快速, all stations past 東京
  // (the 快速 entry lets the Narita Line's through 快速 chain onto it). 5 weekday 快速 end at 品川
  { from: 'JR Sobu Line',     fromEnd: '東京',
    to:   'JR Yokosuka Line', toEnd: '東京',
    lineDests: [
      { until: '千葉', name: 'Chiba', ja: '千葉方面', color: '#E85830', services: ['Local'] },
      { until: '東京', name: 'Tokyo', ja: '東京方面', color: '#F7C948', services: ['Rapid'] }, // only where a 快速 calls
    ],
    destinations: [
      { until: '品川',   name: 'Shinagawa', ja: '品川方面',   color: '#4a9ec0', services: ['Rapid'],
        schedule: { weekday: { timeRange: [[7, 10], [17, 18]] }, weekend: { stops: [] } } },
      { until: '大船',   name: 'Ofuna',     ja: '大船方面',   color: '#4a9ec0', services: ['Rapid'] },
      { until: '逗子',   name: 'Zushi',     ja: '逗子方面',   color: '#0068B7', services: ['Rapid'] },
      { until: '久里浜', name: 'Kurihama',  ja: '久里浜方面', color: '#003868', services: ['Rapid'] },
    ],
    express: [
      { name: 'Rapid', ja: '快速', color: '#00b900', stops: [...SOBU_RAPID_WEST_UP, ...YOKOSUKA_PAST_TOKYO] },
    ] },

  // ── Hanzomon → Tobu Skytree / Nikko at Oshiage ──────────────────────
  // Through trains leave Hanzomon's Oshiage over Tobu's own Oshiage platforms and join
  // the Skytree Line at Hikifune (曳舟 is on neither line's array → via).
  // All through trains are 急行 or 準急, to Kuki (Isesaki) or Minami-Kurihashi (Nikko);
  // Hanzomon trains also terminate at Oshiage.
  { from: 'Tokyo Metro Hanzomon Line', fromEnd: '押上(スカイツリー前)',
    to:   'Tobu Isesaki Line',         toStation: '曳舟', toDir: 'end',
    via:  ['曳舟'],
    toUntil: '久喜',
    lineDests: [
      // 17 weekday trains (mornings and the last ones) turn back at 清澄白河 (ODPT 2026-03)
      { until: '清澄白河', name: 'Kiyosumi-shirakawa', ja: '清澄白河方面', color: '#8F76D6',
        schedule: { weekday: { timeRange: [[6, 11], [23, 1]] }, weekend: { timeRange: [21, 1] } } },
      { until: '押上(スカイツリー前)', name: 'Oshiage', ja: '押上方面', color: '#8F76D6' },
    ],
    destinations: [
      // Evening 準急 (and 2 weekday early ones) end at 北越谷
      { until: '北越谷', name: 'Kita-Koshigaya', ja: '北越谷方面', color: '#3a72c0', services: ['Semi-Exp'],
        schedule: { weekday: { timeRange: [[6, 8], [20, 1]] }, weekend: { timeRange: [19, 1] } } },
      { until: '東武動物公園', name: 'Tobu-Dobutsu-Koen', ja: '東武動物公園方面', color: '#003878' },
      { until: '久喜', name: 'Kuki', ja: '久喜方面', color: '#005AAA' },
    ],
    express: [
      // Early morning and evening (from 19h), as the Isesaki Line's own 準急
      { name: 'Semi-Exp', ja: '準急', color: '#00b900',
        stops: ['渋谷','表参道','青山一丁目','永田町','半蔵門','九段下','神保町','大手町',
                '三越前','水天宮前','清澄白河','住吉','錦糸町','押上(スカイツリー前)',
                '曳舟','北千住','西新井','草加','新越谷','越谷','北越谷','大袋','せんげん台',
                '武里','一ノ割','春日部','北春日部','姫宮','東武動物公園','和戸','久喜'],
        schedule: { weekday: { timeRange: [19, 9] }, weekend: { timeRange: [19, 10] } } },
      { name: 'Express', ja: '急行', color: '#e83030',
        stops: ['渋谷','表参道','青山一丁目','永田町','半蔵門','九段下','神保町','大手町',
                '三越前','水天宮前','清澄白河','住吉','錦糸町','押上(スカイツリー前)',
                '曳舟','北千住','西新井','草加','新越谷','越谷','せんげん台','春日部',
                '東武動物公園','和戸','久喜'] },
    ] },
  // Minami-Kurihashi: the chained Isesaki → Nikko destination below (same 急行/準急)
  { from: 'Tobu Isesaki Line',         fromStation: '曳舟', fromDir: 'start',
    to:   'Tokyo Metro Hanzomon Line', toEnd: '押上(スカイツリー前)',
    via:  ['押上(スカイツリー前)'],
    boardAtJunction: true, // 曳舟 boarders ride straight to 押上
    name: 'Shibuya', ja: '渋谷方面', color: '#8F76D6',
    // (浅草 and the up short turns come from LINE_DESTINATIONS["Tobu Isesaki Line"], which merges this)
    destinations: [
      // Through trains are 急行/準急 only: hidden at stations they skip (小菅, 牛田, …)
      { until: '渋谷', name: 'Shibuya', ja: '渋谷方面', color: '#8F76D6',
        services: ['Semi-Exp', 'Express'] },
      // Nikko Line riders' weekday 23:06 準急 ends at 押上 (chained from Nikko → Isesaki)
      { until: '押上(スカイツリー前)', name: 'Oshiage', ja: '押上方面', color: '#8F76D6',
        services: ['Semi-Exp (Oshiage)'], schedule: { weekday: { timeRange: [23, 24] }, weekend: { stops: [] } } },
    ] },

  // ── Tobu Isesaki → Nikko at Tobu-Dobutsu-Koen ──────────────────────────
  // Hanzomon through 急行/準急 alternate between Kuki and Minami-Kurihashi all day (they
  // board from 曳舟 on, and Hanzomon riders reach this as a chained destination); some
  // 区間急行/区間準急 from Asakusa run on in the mornings/evenings (their own schedules).
  // Every train calls at every Nikko Line station to Minami-Kurihashi.
  { from: 'Tobu Isesaki Line', fromStation: '東武動物公園', fromDir: 'end',
    to:   'Tobu Nikko Line',   toEnd: '東武動物公園',
    toUntil: '南栗橋',
    name: 'Minami-Kurihashi', ja: '南栗橋方面', color: '#FFA500',
    destinations: [
      // Hibiya through 普通 (from 北千住) run on to 南栗橋 too (11 wd / 13 Sat/hol; ODPT 2026-03)
      { until: '南栗橋', name: 'Minami-Kurihashi', ja: '南栗橋方面', color: '#FFA500',
        services: ['Local', 'Express', 'Semi-Exp', 'Sub-Exp', 'Sec. Semi-Exp'], localFrom: '北千住' },
    ] },
  // Southbound, every train from Minami-Kurihashi runs through (none terminate at
  // 東武動物公園): Hanzomon 急行/準急 (chained Shibuya), Hibiya 普通 at rush hours
  // (chained Naka-meguro) and a few 区間急行/区間準急 to Asakusa. The last trains end
  // short: 普通/区間準急 to 北千住, 準急 to 押上 (weekdays), 普通 to 南千住 (weekends);
  // named "(Kita-Senju)" etc. so the through destinations don't count them. Hours:
  // 杉戸高野台 departures (Yahoo! timetable 2026; Saturday = Sunday).
  { from: 'Tobu Nikko Line',   fromEnd: '東武動物公園',
    to:   'Tobu Isesaki Line', toStation: '東武動物公園', toDir: 'start',
    destinations: [
      { until: '北千住', name: 'Kita-Senju', ja: '北千住方面', color: '#9B7A00',
        services: ['Local (Kita-Senju)', 'Sec. Semi-Exp (Kita-Senju)'] },
      { until: '浅草', name: 'Asakusa', ja: '浅草方面', color: '#003087',
        services: ['Sub-Exp', 'Sec. Semi-Exp'] },
    ],
    express: [
      { stops: null, name: 'Local', ja: '普通', color: '#00a0e8',
        schedule: { weekday: { timeRange: [[6, 10], [16, 17], [19, 20]] }, weekend: { timeRange: [[6, 9], [16, 17], [19, 24]] } } },
      { stops: null, name: 'Local (Kita-Senju)', ja: '普通（北千住行き）', color: '#00a0e8',
        schedule: { weekday: { timeRange: [22, 23] }, weekend: { stops: [] } } },
      { stops: null, name: 'Local (Minami-Senju)', ja: '普通（南千住行き）', color: '#00a0e8',
        schedule: { weekday: { stops: [] }, weekend: { timeRange: [23, 24] } } },
      { name: 'Sec. Semi-Exp (Kita-Senju)', ja: '区間準急（北千住行き）', color: '#7fbf3f',
        stops: ['南栗橋','幸手','杉戸高野台','東武動物公園','姫宮','北春日部','春日部','一ノ割','武里',
                'せんげん台','大袋','北越谷','越谷','新越谷','草加','西新井','北千住'],
        schedule: { weekday: { timeRange: [23, 24] }, weekend: { timeRange: [23, 24] } } },
      { name: 'Semi-Exp (Oshiage)', ja: '準急（押上行き）', color: '#00b900',
        stops: ['南栗橋','幸手','杉戸高野台','東武動物公園','姫宮','北春日部','春日部','一ノ割','武里',
                'せんげん台','大袋','北越谷','越谷','新越谷','草加','西新井','北千住','曳舟'],
        schedule: { weekday: { timeRange: [23, 24] }, weekend: { stops: [] } } },
      { name: 'Sub-Exp', ja: '区間急行', color: '#f0c000',
        stops: ['南栗橋','幸手','杉戸高野台','東武動物公園','春日部','せんげん台','越谷','新越谷',
                '草加','西新井','北千住','牛田','堀切','鐘ヶ淵','東向島','曳舟','とうきょうスカイツリー','浅草'],
        schedule: { weekday: { timeRange: [7, 9] }, weekend: { timeRange: [6, 9] } } },
      { name: 'Sec. Semi-Exp', ja: '区間準急', color: '#7fbf3f',
        stops: ['南栗橋','幸手','杉戸高野台','東武動物公園','姫宮','北春日部','春日部','一ノ割','武里',
                'せんげん台','大袋','北越谷','越谷','新越谷','草加','西新井','北千住',
                '牛田','堀切','鐘ヶ淵','東向島','曳舟','とうきょうスカイツリー','浅草'],
        schedule: { weekday: { timeRange: [17, 18] }, weekend: { timeRange: [21, 22] } } },
      // (the first train of the day, 南栗橋 4:59, is a 準急 too)
      { name: 'Semi-Exp', ja: '準急', color: '#00b900',
        stops: ['南栗橋','幸手','杉戸高野台','東武動物公園','姫宮','北春日部','春日部','一ノ割','武里',
                'せんげん台','大袋','北越谷','越谷','新越谷','草加','西新井','北千住','曳舟'],
        schedule: { weekday: { timeRange: [[4, 7], [8, 10], [20, 23]] }, weekend: { timeRange: [[4, 8], [9, 11], [20, 23]] } } },
      { name: 'Express', ja: '急行', color: '#e83030',
        stops: ['南栗橋','幸手','杉戸高野台','東武動物公園','春日部','せんげん台','越谷','新越谷',
                '草加','西新井','北千住','曳舟'],
        schedule: { weekday: { timeRange: [[5, 8], [9, 22]] }, weekend: { timeRange: [5, 22] } } },
    ] },

  // ── Tobu Utsunomiya → Nikko at Tochigi ─────────────────────────────────
  // The game's Utsunomiya Line starts at 栃木 (real trains run 新栃木–栃木 on Nikko Line
  // track); toward 栃木 every train either turns at 新栃木 or runs on to 南栗橋, none ends
  // at 栃木 (ODPT 2026-03). The other way (南栗橋 → 東武宇都宮) branches at 新栃木, where
  // the Utsunomiya Line is its own platform (Y-junction).
  { from: 'Tobu Utsunomiya Line',    fromEnd: '栃木',
    to:   'Tobu Nikko Line (Nikko)', toStation: '栃木', toDir: 'start',
    toUntil: '南栗橋',
    name: 'Minami-Kurihashi', ja: '南栗橋方面', color: '#FFA500',
    lineDests: [
      { until: '新栃木', name: 'Shin-Tochigi', ja: '新栃木方面', color: '#e0a040',
        schedule: { weekday: { timeRange: [[6, 10], [11, 24]] }, weekend: { timeRange: [[6, 10], [11, 24]] } } },
    ],
    destinations: [
      { until: '南栗橋', name: 'Minami-Kurihashi', ja: '南栗橋方面', color: '#FFA500',
        schedule: { weekday: { timeRange: [4, 23] }, weekend: { timeRange: [4, 23] } } },
    ],
    express: [{ stops: null, name: 'Local', ja: '普通' }] },

  // ── Tobu Kiryu ↔ Koizumi (Ota) at Ota ──────────────────────────────────
  // Every 赤城 train runs through 太田 to 東小泉 and back (21–22 a day each way; ODPT 2026-03)
  { from: 'Tobu Kiryu Line',          fromEnd: '太田',
    to:   'Tobu Koizumi Line (Ota)',  toEnd:   '太田' },
  { from: 'Tobu Koizumi Line (Ota)',  fromEnd: '太田',
    to:   'Tobu Kiryu Line',          toEnd:   '太田' },

  // ── Tobu Tojo ↔ Tojo (Yorii) at Ogawamachi ──────────────────────────────
  // 10 各停 a day each way run through 小川町: 森林公園 ↔ 寄居 by day and late (ODPT 2026-03)
  { from: 'Tobu Tojo Line',         fromEnd: '小川町',
    to:   'Tobu Tojo Line (Yorii)', toEnd:   '小川町',
    name: 'Yorii', ja: '寄居方面', color: '#004098',
    destinations: [
      { until: '寄居', name: 'Yorii', ja: '寄居方面', color: '#004098', services: ['Local'],
        schedule: { weekday: { timeRange: [[11, 16], [23, 24]] }, weekend: { timeRange: [[10, 11], [12, 16], [21, 22]] } } },
    ],
    express: [{ stops: null, name: 'Local', ja: '各停',
      schedule: { weekday: { timeRange: [[11, 16], [23, 24]] }, weekend: { timeRange: [[10, 11], [12, 16], [21, 22]] } } }] },
  { from: 'Tobu Tojo Line (Yorii)', fromEnd: '小川町',
    to:   'Tobu Tojo Line',         toEnd:   '小川町',
    toUntil: '森林公園',
    name: 'Shinrin-Koen', ja: '森林公園方面', color: '#0068B7',
    lineDests: [
      { until: '小川町', name: 'Ogawamachi', ja: '小川町方面', color: '#003878' },
    ],
    destinations: [
      { until: '森林公園', name: 'Shinrin-Koen', ja: '森林公園方面', color: '#0068B7', services: ['Local'],
        schedule: { weekday: { timeRange: [[11, 16], [22, 23], [0, 1]] }, weekend: { timeRange: [[9, 10], [11, 17], [0, 1]] } } },
    ],
    express: [{ stops: null, name: 'Local', ja: '各停',
      schedule: { weekday: { timeRange: [[11, 16], [22, 23], [0, 1]] }, weekend: { timeRange: [[9, 10], [11, 17], [0, 1]] } } }] },

  // ── Hibiya → Tobu Skytree / Nikko at Kita-Senju ────────────────────────
  // Hibiya through-runs to Tobu Skytree Line (= Isesaki southern section).
  // Trains terminate at Takenotsuka, Kita-Koshigaya, or Tobu-Dobutsu-Koen,
  // with some extending to Minami-Kurihashi on the Nikko Line.
  { from: 'Tokyo Metro Hibiya Line', fromEnd: '北千住',
    to:   'Tobu Isesaki Line',       toStation: '北千住', toDir: 'end',
    toUntil: '東武動物公園',
    lineDests: [
      // 10 weekday-morning trains turn back at 南千住 (ODPT 2026-03)
      { until: '南千住', name: 'Minami-Senju', ja: '南千住方面', color: '#9B7A00',
        schedule: { weekday: { timeRange: [8, 12] }, weekend: { stops: [] } } },
      { until: '北千住', name: 'Kita-Senju', ja: '北千住方面', color: '#9B7A00' },
    ],
    destinations: [
      { until: '竹ノ塚', name: 'Takenotsuka', ja: '竹ノ塚方面', color: '#3890c8' },
      { until: '草加', name: 'Soka', ja: '草加方面', color: '#2a80c0',
        schedule: { weekday: { timeRange: [[6, 9], [16, 19]] }, weekend: { timeRange: [18, 20] } } },
      { until: '北越谷', name: 'Kita-Koshigaya', ja: '北越谷方面', color: '#005AAA' },
      { until: '北春日部', name: 'Kita-Kasukabe', ja: '北春日部方面', color: '#004890',
        schedule: { weekday: { timeRange: [[9, 16], [17, 1]] }, weekend: { timeRange: [[9, 16], [18, 20], [21, 1]] } } },
      { until: '東武動物公園', name: 'Tobu-Dobutsu-Koen', ja: '東武動物公園方面', color: '#003878' },
    ],
    // Hibiya through-trains are all-station Local only
    express: [{ stops: null, name: 'Local', ja: '各停' }] },
  { from: 'Tokyo Metro Hibiya Line', fromEnd: '北千住',
    to:   'Tobu Nikko Line',        toEnd: '東武動物公園',
    via: ['小菅', '五反野', '梅島', '西新井', '竹ノ塚', '谷塚', '草加',
          '獨協大学前〈草加松原〉', '新田', '蒲生', '新越谷', '越谷', '北越谷',
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
    destinations: [
      // Hibiya through trains are all 普通 (THライナー is paid-seat)
      { until: '中目黒', name: 'Naka-meguro', ja: '中目黒方面', color: '#9B7A00',
        services: ['Local'] },
      // Nikko Line riders' weekend 23:06 普通 ends at 南千住 (chained from Nikko → Isesaki)
      { until: '南千住', name: 'Minami-Senju', ja: '南千住方面', color: '#9B7A00',
        services: ['Local (Minami-Senju)'] },
    ] },

  // ── Asakusa ↔ Keikyu at Sengakuji (toward Haneda) ──────────────────────
  // Sengakuji is mid-line on Asakusa (idx 6), start of Keikyu Main (idx 0)
  // Asakusa trains heading toward Nishi-magome (start) pass Sengakuji → branch onto Keikyu
  // Through-trains terminate at Kanazawa-bunko, Uraga, or onto Kurihama Line
  { from: 'Toei Asakusa Line', fromStation: '泉岳寺', fromDir: 'start',
    to:   'Keikyu Main Line',  toEnd: '泉岳寺',
    // Through trains end at 羽田空港 (急行, 特急, 快特, エアポート快特), 三崎口 / 京急久里浜
    // (chained); the last 特急 of the night ends at 神奈川新町 (weekdays) or 金沢文庫
    // (weekends), none at 浦賀 (ODPT 2025-12). chainFrom: Sky Access アクセス特急 riders
    // only chain on to Haneda
    lineDests: [
      { until: '西馬込', name: 'Nishi-magome', ja: '西馬込方面', color: '#e85298' },
    ],
    destinations: [
      { until: '神奈川新町', name: 'Kanagawa-shimmachi', ja: '神奈川新町方面', color: '#e57053', services: ['Ltd. Express'],
        schedule: { weekday: { timeRange: [23, 24] }, weekend: { stops: [] } }, chainFrom: ['Keisei Oshiage Line', 'Keisei Main Line', 'Hokuso Railway Hokuso Line'] },
      { until: '金沢文庫', name: 'Kanazawa-bunko', ja: '金沢文庫方面', color: '#c83030', services: ['Ltd. Express'],
        schedule: { weekday: { stops: [] }, weekend: { timeRange: [23, 24] } }, chainFrom: ['Keisei Oshiage Line', 'Keisei Main Line', 'Hokuso Railway Hokuso Line'] },
    ],
    // Asakusa trains continue as Keikyu 急行 (to Haneda, rushes), 特急/快特; エアポート快特
    // (and アクセス特急 from Narita, chainName) run on to Haneda via the Airport Line hop
    express: [
      // one 普通 a day runs through (23h); the other through trains are 急行 or better
      { stops: null, name: 'Local', ja: '各停', schedule: { weekday: { timeRange: [23, 1] }, weekend: { timeRange: [23, 24] } } },
      // 急行 to Haneda: 54 weekday / 32 weekend trains, mornings and evenings; the Airport Line
      // stops come from the same-name entry on the Keikyu Main → Airport hop
      { name: 'Express', ja: '急行', color: '#e83030',
        stops: ['押上(スカイツリー前)','本所吾妻橋','浅草','蔵前','浅草橋','東日本橋','人形町','日本橋','宝町','東銀座','新橋','大門','三田','泉岳寺',
                '品川','青物横丁','立会川','平和島','京急蒲田'],
        schedule: { weekday: { timeRange: [[5, 11], [15, 24]] }, weekend: { timeRange: [[5, 10], [18, 24]] } } },
      { name: 'Ltd. Express', ja: '特急', color: '#e84040',
        stops: ['押上(スカイツリー前)','本所吾妻橋','浅草','蔵前','浅草橋','東日本橋','人形町','日本橋','宝町','東銀座','新橋','大門','三田','泉岳寺',
                '品川','青物横丁','平和島','京急蒲田','京急川崎','神奈川新町','横浜','上大岡','金沢文庫','金沢八景','追浜','汐入','横須賀中央','堀ノ内'] },
      { name: 'Rapid Ltd. Exp', ja: '快特', color: '#e83080',
        stops: ['押上(スカイツリー前)','本所吾妻橋','浅草','蔵前','浅草橋','東日本橋','人形町','日本橋','宝町','東銀座','新橋','大門','三田','泉岳寺',
                '品川','京急蒲田','京急川崎','横浜','上大岡','金沢文庫','金沢八景','横須賀中央','堀ノ内'] }, // 快特 never run to 浦賀
      { name: 'Airport Rapid', ja: 'エアポート快特', color: '#e83080', chainName: 'Access Express',
        stops: ['押上(スカイツリー前)','浅草','東日本橋','日本橋','新橋','大門','三田','泉岳寺','品川'],
        schedule: { weekday: { timeRange: [[6, 7], [9, 16]] }, weekend: { timeRange: [[6, 7], [9, 20]] } } }, // southbound hours at 押上
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
    // 特急/快特 run all stations on the Asakusa Line, then on as Keisei 快速
    // (特急, Haneda ↔ Narita via the Main Line) or 快速特急 (快特, to Aoto/Takasago)
    express: [
      { name: 'Ltd. Express', ja: '特急', color: '#e84040',
        stops: ['堀ノ内','横須賀中央','汐入','追浜','金沢八景','金沢文庫','上大岡','横浜','神奈川新町','京急川崎','京急蒲田','平和島','青物横丁','品川','泉岳寺',
                '三田','大門','新橋','東銀座','宝町','日本橋','人形町','東日本橋','浅草橋','蔵前','浅草','本所吾妻橋','押上(スカイツリー前)'] },
      { name: 'Ltd. Express', ja: '特急', color: '#e84040',
        stops: ['浦賀','馬堀海岸','京急大津','堀ノ内','横須賀中央','汐入','追浜','金沢八景','金沢文庫','上大岡','横浜','神奈川新町','京急川崎','京急蒲田','平和島','青物横丁','品川','泉岳寺',
                '三田','大門','新橋','東銀座','宝町','日本橋','人形町','東日本橋','浅草橋','蔵前','浅草','本所吾妻橋','押上(スカイツリー前)'],
        schedule: { weekend: { stops: [] }, weekday: { timeRange: [6, 9] } } },
      { name: 'Rapid Ltd. Exp', ja: '快特', color: '#e83080',
        stops: ['堀ノ内','横須賀中央','金沢八景','金沢文庫','上大岡','横浜','京急川崎','京急蒲田','品川','泉岳寺',
                '三田','大門','新橋','東銀座','宝町','日本橋','人形町','東日本橋','浅草橋','蔵前','浅草','本所吾妻橋','押上(スカイツリー前)'] },
      { name: 'Airport Rapid', ja: 'エアポート快特', color: '#e83080',
        stops: ['品川','泉岳寺','三田','大門','新橋','日本橋',
                '東日本橋','浅草','押上(スカイツリー前)'],
        schedule: { weekday: { timeRange: [[10, 16], [20, 23]] }, weekend: { timeRange: [10, 19] } } }, // northbound hours at 泉岳寺
    ] },

  // ── Asakusa ↔ Keisei Oshiage at Oshiage (toward Narita) ──────────────
  // Oshiage is end of Asakusa (idx 19), start of Keisei Oshiage (idx 0)
  // Airport Rapid (エアポート快特) chains from Keikyu→Asakusa→Oshiage→Sky Access
  // (as アクセス特急); 快速 (all stations on the Asakusa Line) chains onto the
  // Keisei Main Line 快速. Local entry needed since Asakusa has no EXPRESS_SERVICES.
  // Half the trains from 西馬込 turn back at 泉岳寺, a few at 押上; through trains end at
  // 青砥 (各停, 100 a day), 京成高砂 (各停, 快速, 快特) or beyond (chained) (ODPT 2025-12)
  { from: 'Toei Asakusa Line',  fromEnd: '押上(スカイツリー前)',
    to:   'Keisei Oshiage Line', toEnd: '押上(スカイツリー前)',
    lineDests: [
      { until: '泉岳寺', name: 'Sengakuji', ja: '泉岳寺方面', color: '#e85298' },
      { until: '押上(スカイツリー前)', name: 'Oshiage', ja: '押上方面', color: '#e85298',
        schedule: { weekday: { timeRange: [[6, 10], [11, 15], [16, 18]] }, weekend: { timeRange: [9, 19] } } },
    ],
    destinations: [
      { until: '青砥', name: 'Aoto', ja: '青砥方面', color: '#0073CF', services: ['Local'] },
      { until: '京成高砂', name: 'Keisei Takasago', ja: '京成高砂方面', color: '#0073CF',
        services: ['Local', 'Rapid', 'Rapid Ltd. Exp'] },
    ],
    express: [
      { stops: null, name: 'Local', ja: '各停' },
      // chainName: Keikyu 特急 from Haneda continue as this (Haneda ↔ Narita 快速)
      { name: 'Rapid', ja: '快速', color: '#00b900', chainName: 'Ltd. Express',
        stops: ['西馬込','馬込','中延','戸越','五反田','高輪台','泉岳寺','三田','大門','新橋',
                '東銀座','宝町','日本橋','人形町','東日本橋','浅草橋','蔵前','浅草','本所吾妻橋',
                '押上(スカイツリー前)','青砥','京成高砂'] },
      // Keikyu 快特 through trains run as Keisei 快速特急 (押上, 青砥 only) to 京成高砂
      // (押上 wd 12–15h and 17–19h, we 10–18h)
      { name: 'Rapid Ltd. Exp', ja: '快速特急', color: '#f07000',
        stops: ['泉岳寺','三田','大門','新橋','東銀座','宝町','日本橋','人形町','東日本橋','浅草橋','蔵前','浅草','本所吾妻橋','押上(スカイツリー前)','青砥','京成高砂'],
        schedule: { weekday: { timeRange: [12, 20] }, weekend: { timeRange: [10, 19] } } },
      { name: 'Airport Rapid', ja: 'エアポート快特', color: '#e83080',
        stops: ['泉岳寺','三田','大門','新橋','日本橋',
                '東日本橋','浅草','押上(スカイツリー前)',
                '青砥','京成高砂'],
        schedule: { weekday: { timeRange: [[10, 16], [20, 23]] }, weekend: { timeRange: [10, 20] } } },
    ] },
  { from: 'Keisei Oshiage Line', fromEnd: '押上(スカイツリー前)',
    to:   'Toei Asakusa Line',  toEnd: '押上(スカイツリー前)',
    express: [
      { stops: null, name: 'Local', ja: '各停' },
      // Keisei/Hokuso 特急 run all stations on the Asakusa Line
      { name: 'Ltd. Express', ja: '特急', color: '#e83030',
        stops: ['京成高砂','青砥','押上(スカイツリー前)','本所吾妻橋','浅草','蔵前','浅草橋','東日本橋',
                '人形町','日本橋','宝町','東銀座','新橋','大門','三田','泉岳寺',
                '高輪台','五反田','戸越','中延','馬込','西馬込'] },
      { name: 'Airport Rapid', ja: 'エアポート快特', color: '#e83080', chainName: 'Access Express',
        stops: ['京成高砂','青砥','押上(スカイツリー前)',
                '浅草','東日本橋','日本橋',
                '新橋','大門','三田','泉岳寺'],
        schedule: { weekday: { timeRange: [[6, 7], [9, 16]] }, weekend: { timeRange: [[6, 7], [9, 20]] } } },
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
    lineDests: [
      // 北綾瀬 shuttles turn back at 綾瀬 all day; 7 weekday-morning trains end at 明治神宮前
      { until: '綾瀬', name: 'Ayase', ja: '綾瀬方面', color: '#00BB85' },
      { until: '明治神宮前〈原宿〉', name: 'Meiji-jingumae', ja: '明治神宮前方面', color: '#00BB85',
        schedule: { weekday: { timeRange: [7, 11] }, weekend: { stops: [] } } },
      { until: '代々木上原', name: 'Yoyogi-Uehara', ja: '代々木上原方面', color: '#00BB85' },
    ],
    // Signboard termini; daytime 急行 also run on to 唐木田 (chained Odakyu → Tama hop).
    // Through 各停 end at 成城学園前 (16 wd) and 向ヶ丘遊園 (5 wd) (ODPT 2026-03)
    destinations: [
      { until: '成城学園前', name: 'Seijogakuen-mae', ja: '成城学園前方面', color: '#3aa0e0',
        services: ['Local', 'Semi-Exp'] },
      { until: '向ヶ丘遊園', name: 'Mukogaoka-Yuen', ja: '向ヶ丘遊園方面', color: '#1a8fe8',
        services: ['Local', 'Semi-Exp', 'Express'] },
      // 急行 from the Chiyoda Line run to 唐木田 by day and to 伊勢原 in the evening; one
      // train a day ends at 本厚木 (a weekday 準急 20:17, a weekend 急行 around 20h)
      { until: '本厚木', name: 'Hon-Atsugi', ja: '本厚木方面', color: '#0070c0',
        services: ['Semi-Exp', 'Express'], schedule: { weekday: { timeRange: [20, 21] }, weekend: { timeRange: [20, 21] } } },
      { until: '伊勢原', name: 'Isehara', ja: '伊勢原方面', color: '#005090',
        services: ['Express'], schedule: { weekday: { timeRange: [17, 23] }, weekend: { timeRange: [18, 23] } } },
    ],
    express: [
      // Through 各停 to 成城学園前 / 向ヶ丘遊園: weekday mornings and 15h, one weekend train at 19h (ODPT 2026-03)
      { stops: null, name: 'Local', ja: '各停', color: '#00a0e8',
        schedule: { weekday: { timeRange: [[6, 11], [15, 17]] }, weekend: { timeRange: [19, 20] } } },
      // 準急 end at 向ヶ丘遊園 / 成城学園前 (one late train to 本厚木 ignored);
      // mornings and evenings only since daytime 準急 became 急行 in 2022
      { name: 'Semi-Exp', ja: '準急', color: '#00b900',
        stops: ['北綾瀬','綾瀬','北千住','町屋','西日暮里','千駄木',
                '根津','湯島','新御茶ノ水','大手町','二重橋前','日比谷',
                '霞ケ関','国会議事堂前','赤坂','乃木坂','表参道',
                "明治神宮前〈原宿〉",'代々木公園','代々木上原',
                '下北沢','経堂','千歳船橋','祖師ヶ谷大蔵',
                '成城学園前','喜多見','狛江','和泉多摩川','登戸',
                '向ヶ丘遊園'],
        schedule: { weekday: { timeRange: [[5, 11], [15, 24]] }, weekend: { timeRange: [[8, 12], [15, 19]] } } },
      { name: 'Express', ja: '急行', color: '#e83030',
        stops: ['北綾瀬','綾瀬','北千住','町屋','西日暮里','千駄木',
                '根津','湯島','新御茶ノ水','大手町','二重橋前','日比谷',
                '霞ケ関','国会議事堂前','赤坂','乃木坂','表参道',
                "明治神宮前〈原宿〉",'代々木公園','代々木上原',
                '下北沢','経堂','成城学園前','登戸','向ヶ丘遊園',
                '新百合ヶ丘','町田','相模大野','海老名','本厚木',
                '愛甲石田','伊勢原'],
        // None weekday 5–8h (各停/準急) or 16h (準急); windows include the trailing hour (ODPT 2026-03)
        schedule: { weekday: { timeRange: [[9, 16], [17, 23]] }, weekend: { timeRange: [[6, 16], [18, 23]] } } },
    ] },
  { from: 'Odakyu Line',              fromStation: '代々木上原', fromDir: 'start',
    to:   'Tokyo Metro Chiyoda Line', toEnd:   '代々木上原',
    name: 'Ayase', ja: '綾瀬方面', color: '#00BB85',
    // (新宿 and the up short turns come from LINE_DESTINATIONS["Odakyu Line"], which merges this);
    // chainFrom: Tama Line 急行 run through to 我孫子 by day, Enoshima Line trains never do
    chainFrom: ['Odakyu Tama Line'],
    destinations: [
      // 14 weekday 各停 run through in the rushes (ODPT 2026-03)
      { until: '綾瀬', name: 'Ayase', ja: '綾瀬方面', color: '#00BB85',
        services: ['Local', 'Semi-Exp', 'Express', 'Commuter Semi-Exp'] },
    ],
    express: [
      { stops: null, name: 'Local', ja: '各停', color: '#00a0e8',
        schedule: { weekday: { timeRange: [[5, 10], [17, 23]] }, weekend: { timeRange: [[9, 10], [21, 23]] } } },
      // Weekday mornings: all stations 伊勢原–登戸, then 成城学園前/経堂/下北沢
      { name: 'Commuter Semi-Exp', ja: '通勤準急', color: '#3aa0c8',
        stops: ['伊勢原','愛甲石田','本厚木','厚木','海老名','座間','相武台前','小田急相模原',
                '相模大野','町田','玉川学園前','鶴川','柿生','新百合ヶ丘','百合ヶ丘','読売ランド前',
                '生田','向ヶ丘遊園','登戸','成城学園前','経堂','下北沢','代々木上原',
                '代々木公園',"明治神宮前〈原宿〉",'表参道','乃木坂','赤坂',
                '国会議事堂前','霞ケ関','日比谷','二重橋前','大手町',
                '新御茶ノ水','湯島','根津','千駄木','西日暮里','町屋',
                '北千住','綾瀬','北綾瀬'],
        schedule: { weekend: { stops: [] }, weekday: { timeRange: [5, 9] } } },
      { name: 'Semi-Exp', ja: '準急', color: '#00b900',
        stops: ['向ヶ丘遊園',
                '登戸','和泉多摩川','狛江','喜多見','成城学園前',
                '祖師ヶ谷大蔵','千歳船橋','経堂','下北沢','代々木上原',
                '代々木公園',"明治神宮前〈原宿〉",'表参道','乃木坂','赤坂',
                '国会議事堂前','霞ケ関','日比谷','二重橋前','大手町',
                '新御茶ノ水','湯島','根津','千駄木','西日暮里','町屋',
                '北千住','綾瀬','北綾瀬'],
        schedule: { weekday: { timeRange: [[8, 11], [16, 22]] }, weekend: { timeRange: [[10, 12], [18, 22]] } } }, // not by day
      { name: 'Express', ja: '急行', color: '#e83030',
        stops: ['伊勢原','愛甲石田','本厚木','海老名','相模大野','町田',
                '新百合ヶ丘','向ヶ丘遊園','登戸','成城学園前','経堂',
                '下北沢','代々木上原',
                '代々木公園',"明治神宮前〈原宿〉",'表参道','乃木坂','赤坂',
                '国会議事堂前','霞ケ関','日比谷','二重橋前','大手町',
                '新御茶ノ水','湯島','根津','千駄木','西日暮里','町屋',
                '北千住','綾瀬','北綾瀬'],
        // None in the weekday rushes (通勤準急 7–9h, 準急 16–20h)
        schedule: { weekday: { timeRange: [[5, 7], [9, 16], [21, 22]] }, weekend: { timeRange: [[5, 10], [11, 22]] } } },
    ] },

  // ── Tozai ↔ Chuo-Sobu at Nakano and Nishi-Funabashi ───────────────────
  // Two junction points, both local-only
  // Nakano: Tozai start terminus ↔ Chuo-Sobu mid-line
  { from: 'Tokyo Metro Tozai Line', fromEnd: '中野',
    to:   'JR Chuo-Sobu Line',      toStation: '中野', toDir: 'start' },
  { from: 'JR Chuo-Sobu Line',      fromStation: '中野', fromDir: 'end',
    to:   'Tokyo Metro Tozai Line', toEnd: '中野' },
  // Nishi-Funabashi: Tozai end terminus ↔ Chuo-Sobu mid-line. Through trains run
  // as far as 津田沼 only, 17 a day on weekdays (rushes) (ODPT 2026-03)
  { from: 'Tokyo Metro Tozai Line', fromEnd: '西船橋',
    to:   'JR Chuo-Sobu Line',      toStation: '西船橋', toDir: 'end',
    toUntil: '津田沼',
    // the same lineDests as the Toyo Rapid connection below, so the merged picker lists them first
    lineDests: [
      { until: '東陽町', name: 'Toyocho', ja: '東陽町方面', color: '#009BBF',
        schedule: { weekday: { timeRange: [8, 11] }, weekend: { timeRange: [8, 9] } } },
      { until: '妙典',   name: 'Myoden',  ja: '妙典方面',   color: '#009BBF',
        schedule: { weekday: { timeRange: [[7, 12], [23, 1]] }, weekend: { timeRange: [23, 1] } } },
      { until: '西船橋', name: 'Nishi-Funabashi', ja: '西船橋方面', color: '#009BBF' },
    ],
    destinations: [
      { until: '津田沼', name: 'Tsudanuma', ja: '津田沼方面', color: '#F7C948',
        schedule: { weekday: { timeRange: [[6, 9], [16, 20]] }, weekend: { stops: [] } } },
    ] },
  { from: 'JR Chuo-Sobu Line',      fromStation: '西船橋', fromDir: 'start',
    to:   'Tokyo Metro Tozai Line', toEnd: '西船橋',
    boardFrom: '津田沼' },

  // ── Tozai ↔ Toyo Rapid Railway at Nishi-Funabashi ─────────────────────
  // Half the Tozai trains end at 西船橋; weekday-rush short turns at 東陽町 and 妙典. The
  // lineDests sit on this always-running connection (the Chuo-Sobu one is weekday-only)
  { from: 'Tokyo Metro Tozai Line',   fromEnd: '西船橋',
    to:   'Toyo Rapid Railway Line',  toEnd: '西船橋',
    lineDests: [
      { until: '東陽町', name: 'Toyocho', ja: '東陽町方面', color: '#009BBF',
        schedule: { weekday: { timeRange: [8, 11] }, weekend: { timeRange: [8, 9] } } },
      { until: '妙典',   name: 'Myoden',  ja: '妙典方面',   color: '#009BBF',
        schedule: { weekday: { timeRange: [[7, 12], [23, 1]] }, weekend: { timeRange: [23, 1] } } },
      { until: '西船橋', name: 'Nishi-Funabashi', ja: '西船橋方面', color: '#009BBF' },
    ],
    destinations: [
      { until: '東葉勝田台', name: 'Toyo-Katsutadai', ja: '東葉勝田台方面', color: '#00a48c' },
    ] },
  { from: 'Toyo Rapid Railway Line',  fromEnd: '西船橋',
    to:   'Tokyo Metro Tozai Line',   toEnd: '西船橋' },

  // ── Seibu Yurakucho ↔ Fukutoshin at Kotake-mukaihara ──────────────────
  // Seibu Yurakucho connects to Fukutoshin for through-running to Shibuya/Toyoko
  // F-Liner: Seibu Rapid Exp → Fukutoshin Express → Toyoko Express (all-express through-service)
  { from: 'Seibu Yurakucho Line',       fromEnd: '小竹向原',
    to:   'Tokyo Metro Fukutoshin Line', toStation: '小竹向原', toDir: 'end',
    name: 'Shibuya', ja: '渋谷方面', color: '#9C5E31',
    express: [
      { stops: null, name: 'Local', ja: '各停' },
      { name: 'F-Liner', ja: 'Fライナー', color: '#e83030',
        stops: ['小竹向原','池袋','新宿三丁目',
                "明治神宮前〈原宿〉",'渋谷'],
        schedule: { weekday: { timeRange: [9, 17] }, weekend: { timeRange: [9, 17] } } }, // daytime only
    ] },
  // All-day Seibu Ikebukuro through trains also run onto the Yurakucho Line
  { from: 'Seibu Yurakucho Line',       fromEnd: '小竹向原',
    to:   'Tokyo Metro Yurakucho Line',  toStation: '小竹向原', toDir: 'end',
    name: 'Shin-kiba', ja: '新木場方面', color: '#C9A800' },
  // (No Fukutoshin/Yurakucho→Seibu connection needed: at Kotake-mukaihara the
  // Seibu platform is available directly — see Pitfalls → Y-junctions)

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
        stops: ['飯能','入間市','小手指','所沢',
                'ひばりヶ丘','石神井公園','練馬','小竹向原'],
        schedule: { weekday: { timeRange: [9, 17] }, weekend: { timeRange: [9, 17] } } },
    ] },
  { from: 'Seibu Ikebukuro Line', fromStation: '練馬', fromDir: 'end',
    to:   'Seibu Yurakucho Line', toEnd: '練馬',
    express: [
      { name: 'F-Liner', ja: 'Fライナー', color: '#e83030',
        stops: ['飯能','入間市','小手指','所沢',
                'ひばりヶ丘','石神井公園','練馬','小竹向原'],
        schedule: { weekday: { timeRange: [9, 17] }, weekend: { timeRange: [9, 17] } } },
    ] },

  // ── Fukutoshin ↔ Tokyu Toyoko at Shibuya ──────────────────────────────
  // Through-running to Toyoko (chains with Seibu Yurakucho above)
  { from: 'Tokyo Metro Fukutoshin Line', fromEnd: '渋谷',
    to:   'Tokyu Toyoko Line',           toEnd:   '渋谷',
    // Nearly every train runs through (1 a day ends at 渋谷) to the chained termini
    // (元町・中華街, Sotetsu); 13 weekday 各停 end at 武蔵小杉 in the rushes (ODPT 2026-03).
    // No `services` on 武蔵小杉: declaring them would narrow the chained termini to those types
    destinations: [
      { until: '武蔵小杉', name: 'Musashi-Kosugi', ja: '武蔵小杉方面', color: '#da0442',
        schedule: { weekday: { timeRange: [[7, 12], [17, 24]] }, weekend: { timeRange: [20, 24] } } },
    ],
    // 急行 run on as Toyoko 急行; 通勤急行 mostly as 通勤特急
    express: [
      { name: 'Express', ja: '急行', color: '#e83030',
        stops: ['和光市','小竹向原','池袋','新宿三丁目',
                "明治神宮前〈原宿〉",'渋谷',
                '中目黒','学芸大学','自由が丘','田園調布',
                '多摩川','武蔵小杉','日吉','綱島','菊名','横浜'] },
      { name: 'Commuter Exp', ja: '通勤急行', color: '#3a6fd8',
        stops: ['和光市','地下鉄成増','地下鉄赤塚','平和台','氷川台','小竹向原','池袋','新宿三丁目',
                "明治神宮前〈原宿〉",'渋谷',
                '中目黒','自由が丘','武蔵小杉','日吉','菊名','横浜'],
        schedule: { weekend: { stops: [] }, weekday: { timeRange: [[6, 11], [16, 23]] } } },
      { name: 'F-Liner', ja: 'Fライナー', color: '#e83030',
        stops: ['和光市','小竹向原','池袋','新宿三丁目',
                "明治神宮前〈原宿〉",'渋谷',
                '中目黒','自由が丘','武蔵小杉','菊名','横浜'],
        schedule: { weekday: { timeRange: [10, 17] }, weekend: { timeRange: [8, 19] } } },
    ] },
  { from: 'Tokyu Toyoko Line',           fromEnd: '渋谷',
    to:   'Tokyo Metro Fukutoshin Line', toEnd:   '渋谷',
    name: 'Wakoshi', ja: '和光市方面', color: '#9C5E31',
    lineDests: [
      // 10 late 各停/急行 from 横浜 turn at 武蔵小杉 (ODPT 2026-03)
      { until: '武蔵小杉', name: 'Musashi-Kosugi', ja: '武蔵小杉方面', color: '#da0442', services: ['Local', 'Express'],
        schedule: { weekday: { timeRange: [22, 1] }, weekend: { timeRange: [21, 1] } } },
      { until: '渋谷', name: 'Shibuya', ja: '渋谷方面', color: '#0066B3' },
    ],
    destinations: [
      { until: '和光市', name: 'Wakoshi', ja: '和光市方面', color: '#9C5E31' },
    ],
    express: [
      { name: 'F-Liner', ja: 'Fライナー', color: '#e83030',
        stops: ['横浜','菊名','武蔵小杉','自由が丘','中目黒',
                '渋谷',"明治神宮前〈原宿〉",'新宿三丁目','池袋',
                '小竹向原','和光市'],
        schedule: { weekday: { timeRange: [9, 17] }, weekend: { timeRange: [7, 17] } } },
    ] },

  // ── Tokyu Toyoko ↔ Minato Mirai at Yokohama ──────────────────────────
  // Through-running to Motomachi-chukagai (chains with Fukutoshin/Seibu above)
  { from: 'Tokyu Toyoko Line',  fromEnd: '横浜',
    to:   'Minato Mirai Line',  toEnd:   '横浜',
    name: 'Motomachi-Chukagai', ja: '元町・中華街方面', color: '#015193',
    lineDests: [
      // 武蔵小杉 (20 wd 各停/急行, rushes and evenings) and 菊名 (各停, evenings) short turns (ODPT 2026-03)
      { until: '武蔵小杉', name: 'Musashi-Kosugi', ja: '武蔵小杉方面', color: '#da0442', services: ['Local', 'Express'],
        schedule: { weekday: { timeRange: [[7, 12], [18, 19], [20, 1]] }, weekend: { timeRange: [[16, 18], [19, 22], [23, 1]] } } },
      { until: '菊名',     name: 'Kikuna',         ja: '菊名方面',     color: '#c0304a', services: ['Local'],
        schedule: { weekday: { timeRange: [[18, 19], [21, 1]] }, weekend: { timeRange: [[7, 8], [18, 22], [23, 1]] } } },
      { until: '横浜', name: 'Yokohama', ja: '横浜方面', color: '#0066B3' },
    ],
    destinations: [
      { until: '元町・中華街', name: 'Motomachi-Chukagai', ja: '元町・中華街方面', color: '#015193' },
    ],
    // Types carry on unchanged: 特急 skip 新高島/馬車道/日本大通り, 急行 skip 新高島
    express: [
      { name: 'Express', ja: '急行', color: '#e83030', stops: [
        '渋谷','中目黒','学芸大学','自由が丘','田園調布',
        '多摩川','武蔵小杉','日吉','綱島','菊名','横浜',
        'みなとみらい','馬車道','日本大通り','元町・中華街'] },
      { name: 'Ltd. Express', ja: '特急', color: '#e83080', stops: [
        '渋谷','中目黒','自由が丘','武蔵小杉','菊名','横浜',
        'みなとみらい','元町・中華街'], schedule: { weekday: { timeRange: [[9, 12], [16, 17]] }, weekend: { timeRange: [[6, 12], [18, 24]] } } },
      // 通勤特急 pass only 新高島; Fukutoshin 通勤急行 continue as these
      { name: 'Commuter Ltd. Exp', ja: '通勤特急', color: '#3a6fd8', chainName: 'Commuter Exp', stops: [
        '渋谷','中目黒','自由が丘','武蔵小杉','日吉','菊名','横浜',
        'みなとみらい','馬車道','日本大通り','元町・中華街'],
        schedule: { weekend: { stops: [] }, weekday: { timeRange: [[7, 10], [17, 24]] } } },
    ] },
  // Hours follow the Toyoko toward 渋谷 (EXPRESS_SERVICES["Tokyu Toyoko Line"] / conn 57)
  { from: 'Minato Mirai Line',  fromEnd: '横浜',
    to:   'Tokyu Toyoko Line',  toEnd:   '横浜',
    express: [
      { stops: null, name: 'Local', ja: '各停' },
      { name: 'Express', ja: '急行', color: '#e83030', stops: [
        '元町・中華街','日本大通り','馬車道','みなとみらい',
        '横浜','菊名','綱島','日吉','武蔵小杉','多摩川',
        '田園調布','自由が丘','学芸大学','中目黒','渋谷'] },
      { name: 'Ltd. Express', ja: '特急', color: '#e83080', stops: [
        '元町・中華街','みなとみらい',
        '横浜','菊名','武蔵小杉','自由が丘','中目黒','渋谷'], schedule: { weekday: { timeRange: [[6, 7], [9, 11], [16, 18]] }, weekend: { timeRange: [[6, 11], [15, 1]] } } },
      { name: 'Commuter Ltd. Exp', ja: '通勤特急', color: '#3a6fd8', stops: [
        '元町・中華街','日本大通り','馬車道','みなとみらい',
        '横浜','菊名','日吉','武蔵小杉','自由が丘','中目黒','渋谷'],
        schedule: { weekend: { stops: [] }, weekday: { timeRange: [[6, 10], [17, 1]] } } },
      { name: 'F-Liner', ja: 'Fライナー', color: '#e83030', stops: [
        '元町・中華街','みなとみらい',
        '横浜','菊名','武蔵小杉','自由が丘','中目黒','渋谷'], schedule: { weekday: { timeRange: [9, 17] }, weekend: { timeRange: [7, 17] } } },
    ] },

  // ── Namboku ↔ Tokyu Meguro at Meguro ──────────────────────────────────
  // Half the trains turn back at 白金高輪; 16 weekday 各停 end at 武蔵小杉 (ODPT 2026-03)
  { from: 'Tokyo Metro Namboku Line', fromEnd: '目黒',
    to:   'Tokyu Meguro Line',        toEnd:   '目黒',
    lineDests: [
      { until: '白金高輪', name: 'Shirokane-takanawa', ja: '白金高輪方面', color: '#00AC9B',
        schedule: { weekday: { timeRange: [[5, 6], [7, 1]] }, weekend: { timeRange: [5, 1] } } },
      { until: '目黒', name: 'Meguro', ja: '目黒方面', color: '#6CBB5A' },
    ],
    destinations: [
      { until: '武蔵小杉', name: 'Musashi-Kosugi', ja: '武蔵小杉方面', color: '#3a8fd0', services: ['Local'],
        schedule: { weekday: { timeRange: [[7, 11], [17, 20], [23, 1]] }, weekend: { timeRange: [[7, 9], [20, 21], [22, 1]] } } },
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
  // Most trains run through to 浦和美園; 赤羽岩淵 turn-backs by day and at night (all
  // day on weekends), 王子神谷 in the rushes, 鳩ヶ谷 13 weekday trains (ODPT 2026-03)
  { from: 'Tokyo Metro Namboku Line',     fromEnd: '赤羽岩淵',
    to:   'Saitama high-speed rail line', toEnd: '赤羽岩淵',
    lineDests: [
      { until: '王子神谷', name: 'Oji-kamiya', ja: '王子神谷方面', color: '#00AC9B',
        schedule: { weekday: { timeRange: [[8, 10], [19, 22]] }, weekend: { timeRange: [8, 10] } } },
      { until: '赤羽岩淵', name: 'Akabane-Iwabuchi', ja: '赤羽岩淵方面', color: '#00AC9B',
        schedule: { weekday: { timeRange: [[10, 17], [21, 24]] }, weekend: { timeRange: [8, 1] } } },
    ],
    destinations: [
      { until: '鳩ヶ谷', name: 'Hatogaya', ja: '鳩ヶ谷方面', color: '#2a7fb8', services: ['Local'],
        schedule: { weekday: { timeRange: [[7, 10], [23, 1]] }, weekend: { timeRange: [7, 9] } } },
      { until: '浦和美園', name: 'Urawa-Misono', ja: '浦和美園方面', color: '#0a5a98' },
    ] },
  { from: 'Saitama high-speed rail line', fromEnd: '赤羽岩淵',
    to:   'Tokyo Metro Namboku Line',     toEnd: '赤羽岩淵' },

  // ── Mita ↔ Tokyu Meguro at Meguro ─────────────────────────────────────
  // Half the trains turn back at 白金高輪; 13 weekday 各停 end at 武蔵小杉 (ODPT 2026-03)
  { from: 'Toei Mita Line',    fromEnd: '目黒',
    to:   'Tokyu Meguro Line', toEnd:   '目黒',
    lineDests: [
      { until: '白金高輪', name: 'Shirokane-takanawa', ja: '白金高輪方面', color: '#2B50A1' },
      { until: '目黒', name: 'Meguro', ja: '目黒方面', color: '#6CBB5A' },
    ],
    destinations: [
      { until: '武蔵小杉', name: 'Musashi-Kosugi', ja: '武蔵小杉方面', color: '#3a8fd0', services: ['Local'],
        schedule: { weekday: { timeRange: [[6, 11], [16, 21], [22, 24]] }, weekend: { timeRange: [19, 23] } } },
      { until: '日吉', name: 'Hiyoshi', ja: '日吉方面', color: '#0066B3' },
    ] },
  { from: 'Tokyu Meguro Line', fromEnd: '目黒',
    to:   'Toei Mita Line',   toEnd:   '目黒',
    name: 'Nishi-Takashimadaira', ja: '西高島平方面', color: '#2B50A1',
    lineDests: [
      { until: '目黒', name: 'Meguro', ja: '目黒方面', color: '#6CBB5A' },
    ],
    destinations: [
      // 13 weekday trains (rushes, 15h, 23h) end at 高島平 (ODPT 2026-03)
      { until: '高島平',   name: 'Takashimadaira',       ja: '高島平方面',   color: '#4a70b8', services: ['Local', 'Express'],
        schedule: { weekday: { timeRange: [[7, 10], [15, 16], [17, 20], [23, 24]] }, weekend: { timeRange: [[8, 9], [17, 19], [23, 24]] } } },
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
      // 29 weekday 各停 (rushes and evenings) end at 武蔵小杉 (ODPT 2026-03); listed on each
      // Hiyoshi connection so the merged picker keeps it whichever is shown
      { until: '武蔵小杉', name: 'Musashi-Kosugi', ja: '武蔵小杉方面', color: '#3a8fd0', services: ['Local'],
        schedule: { weekday: { timeRange: [[7, 12], [17, 22], [23, 1]] }, weekend: { timeRange: [[5, 6], [8, 9], [20, 1]] } } },
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
      { until: '武蔵小杉', name: 'Musashi-Kosugi', ja: '武蔵小杉方面', color: '#3a8fd0', services: ['Local'],
        schedule: { weekday: { timeRange: [[7, 12], [17, 22], [23, 1]] }, weekend: { timeRange: [[5, 6], [8, 9], [20, 1]] } } },
      { until: '日吉', name: 'Hiyoshi', ja: '日吉方面', color: '#0066B3' },
    ],
    destinations: [
      { until: '海老名', name: 'Ebina', ja: '海老名方面', color: '#003087' },
    ],
    // Meguro 急行 mostly run on as Sotetsu 各停 (Sotetsu 快速 never run through)
    express: [
      { stops: null, name: 'Local', ja: '各停' },
      { name: 'Express', ja: '急行', color: '#e83030', stops: [
        '目黒','武蔵小山','大岡山','田園調布','多摩川','武蔵小杉','日吉',
        '西谷','鶴ヶ峰','二俣川','希望ヶ丘','三ツ境','瀬谷',
        '大和','相模大塚','さがみ野','かしわ台','海老名'] },
    ] },
  { from: 'Tokyu Meguro Line',          fromEnd: '日吉',
    to:   'Sotetsu Izumino Line',        toEnd: '二俣川',
    via:  ['新綱島', '新横浜', '羽沢横浜国大', '西谷', '鶴ヶ峰', '二俣川'],
    impliedLines: ['Tokyu Shin-Yokohama Line', 'Sotetsu Shin-Yokohama Line', 'Sotetsu Main Line'],
    name: 'Shonandai', ja: '湘南台方面', color: '#003087',
    lineDests: [
      { until: '武蔵小杉', name: 'Musashi-Kosugi', ja: '武蔵小杉方面', color: '#3a8fd0', services: ['Local'],
        schedule: { weekday: { timeRange: [[7, 12], [17, 22], [23, 1]] }, weekend: { timeRange: [[5, 6], [8, 9], [20, 1]] } } },
      { until: '日吉', name: 'Hiyoshi', ja: '日吉方面', color: '#0066B3' },
    ],
    destinations: [
      { until: '湘南台', name: 'Shonandai', ja: '湘南台方面', color: '#003087' },
    ],
    // Meguro 急行 run on as Sotetsu 各停 or, in the rushes, as the Izumino 特急 (the Sotetsu
    // segment's name is the type-name engine's job); listed so the Izumino's own 特急 isn't
    // offered as a Meguro-local ride
    express: [
      { stops: null, name: 'Local', ja: '各停' },
      { name: 'Express', ja: '急行', color: '#e83030', stops: [
        '目黒','武蔵小山','大岡山','田園調布','多摩川','武蔵小杉','日吉',
        '二俣川','南万騎が原','緑園都市','弥生台','いずみ野','いずみ中央','ゆめが丘','湘南台'] },
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
  // Toward-Shibuya direction: Shin-Yokohama Line appears as its own platform at
  // Hiyoshi; the junction faces Shibuya, so no Yokohama-side train runs onto it.
  { from: 'Tokyu Toyoko Line',          fromStation: '日吉', fromDir: 'end',
    to:   'Tokyu Shin-Yokohama Line',   toEnd: '日吉',
    name: 'Shin-Yokohama', ja: '新横浜方面', color: '#7b4e9e',
    lineDests: [
      { until: '横浜', name: 'Yokohama', ja: '横浜方面', color: '#0066B3' },
    ],
    // Toyoko through trains are all 急行 (no 各停/特急 onto the Shin-Yokohama Line)
    destinations: [
      { until: '新横浜', name: 'Shin-Yokohama', ja: '新横浜方面', color: '#7b4e9e',
        services: ['Express'] },
    ],
    express: [
      { name: 'Express', ja: '急行', color: '#e83030', stops: ['渋谷','中目黒','学芸大学','自由が丘','田園調布','多摩川','武蔵小杉','日吉','新綱島','新横浜'] },
    ] },
  // Toyoko 急行 run on to 湘南台 (35 wd, all day), 海老名 (3 wd / 8 Sat/hol) or 西谷 (5 wd,
  // rushes) (ODPT 2026-03); two connections model the Y at 二俣川
  { from: 'Tokyu Toyoko Line',          fromStation: '日吉', fromDir: 'end',
    to:   'Sotetsu Main Line',           toStation: '西谷', toDir: 'end',
    via:  ['新綱島', '新横浜', '羽沢横浜国大', '西谷'],
    impliedLines: ['Tokyu Shin-Yokohama Line', 'Sotetsu Shin-Yokohama Line'],
    name: 'Ebina', ja: '海老名方面', color: '#003087',
    lineDests: [
      { until: '横浜', name: 'Yokohama', ja: '横浜方面', color: '#0066B3' },
    ],
    destinations: [
      { until: '西谷',   name: 'Nishiya', ja: '西谷方面',   color: '#4a90d8', services: ['Express'],
        schedule: { weekday: { timeRange: [[8, 11], [17, 18]] }, weekend: { timeRange: [8, 10] } } },
      { until: '海老名', name: 'Ebina',   ja: '海老名方面', color: '#003087', services: ['Express'],
        schedule: { weekday: { timeRange: [[5, 6], [23, 1]] }, weekend: { timeRange: [[6, 8], [16, 17], [18, 20], [21, 24]] } } },
    ],
    express: [
      { name: 'Express', ja: '急行', color: '#e83030', stops: ['渋谷','中目黒','学芸大学','自由が丘','田園調布','多摩川','武蔵小杉','日吉',
        '西谷','鶴ヶ峰','二俣川','希望ヶ丘','三ツ境','瀬谷','大和','相模大塚','さがみ野','かしわ台','海老名'] },
    ] },
  { from: 'Tokyu Toyoko Line',          fromStation: '日吉', fromDir: 'end',
    to:   'Sotetsu Izumino Line',        toEnd: '二俣川',
    via:  ['新綱島', '新横浜', '羽沢横浜国大', '西谷', '鶴ヶ峰', '二俣川'],
    impliedLines: ['Tokyu Shin-Yokohama Line', 'Sotetsu Shin-Yokohama Line', 'Sotetsu Main Line'],
    name: 'Shonandai', ja: '湘南台方面', color: '#003087',
    lineDests: [
      { until: '横浜', name: 'Yokohama', ja: '横浜方面', color: '#0066B3' },
    ],
    destinations: [
      { until: '湘南台', name: 'Shonandai', ja: '湘南台方面', color: '#003087', services: ['Express'],
        schedule: { weekday: { timeRange: [7, 24] }, weekend: { timeRange: [[5, 6], [7, 24]] } } },
    ],
    express: [
      { name: 'Express', ja: '急行', color: '#e83030', stops: ['渋谷','中目黒','学芸大学','自由が丘','田園調布','多摩川','武蔵小杉','日吉',
        '二俣川','南万騎が原','緑園都市','弥生台','いずみ野','いずみ中央','ゆめが丘','湘南台'] },
    ] },
  { from: 'Tokyu Shin-Yokohama Line',   fromEnd: '日吉',
    to:   'Tokyu Toyoko Line',          toStation: '日吉', toDir: 'start',
    name: 'Shibuya', ja: '渋谷方面', color: '#0066B3',
    lineDests: [
      { until: '日吉', name: 'Hiyoshi', ja: '日吉方面', color: '#890d84' },
    ],
    // Toyoko through trains are all 急行; 5 late trains end at 武蔵小杉 (ODPT 2026-03)
    destinations: [
      { until: '武蔵小杉', name: 'Musashi-Kosugi', ja: '武蔵小杉方面', color: '#da0442', services: ['Local', 'Express'],
        schedule: { weekday: { timeRange: [21, 1] }, weekend: { timeRange: [21, 24] } } },
      { until: '渋谷', name: 'Shibuya', ja: '渋谷方面', color: '#0066B3', services: ['Express'] },
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
      { until: '新横浜', name: 'Shin-Yokohama', ja: '新横浜方面', color: '#890d84',
        services: ['Local', 'Ltd. Express'] }, // Sotetsu 快速 don't run through
    ] },

  // ── Sotetsu Main ↔ Sotetsu Izumino at Futamatagawa ───────────────────
  // Mid-line on Main, start of Izumino; the junction faces 横浜.
  // Chained rides reach 湘南台 only from the Tokyu side (Sotetsu-JR Direct
  // trains all run to Ebina).
  { from: 'Sotetsu Main Line',     fromStation: '二俣川', fromDir: 'end',
    to:   'Sotetsu Izumino Line',  toEnd: '二俣川',
    chainFrom: ['Tokyu Shin-Yokohama Line', 'Sotetsu Shin-Yokohama Line', 'Tokyu Toyoko Line', 'Tokyu Meguro Line'],
    name: 'Shonandai', ja: '湘南台方面', color: '#003087',
    // 西谷 / 大和 / 海老名 come from LINE_DESTINATIONS["Sotetsu Main Line"], which merges this one
    destinations: [
      { until: '湘南台', name: 'Shonandai', ja: '湘南台方面', color: '#4a9b4a',
        services: ['Local', 'Rapid', 'Ltd. Express'] },
    ],
    express: [
      // 快速 by day and in the evening on weekdays, all day Sat/hol (ODPT 2026-03)
      { name: 'Rapid', ja: '快速', color: '#00b900', stops: [
        '横浜','星川','西谷','鶴ヶ峰','二俣川',
        '南万騎が原','緑園都市','弥生台','いずみ野','いずみ中央','ゆめが丘','湘南台'],
        schedule: { weekday: { timeRange: [[6, 11], [14, 20]] } } },
      // Izumino 特急 all run through from Tokyu via 西谷, none from 横浜 (10 wd, 1 Sat/hol)
      { name: 'Ltd. Express', ja: '特急', color: '#e83080', stops: [
        '西谷','二俣川','いずみ野','湘南台'],
        schedule: { weekday: { timeRange: [[5, 9], [18, 21]] }, weekend: { timeRange: [7, 8] } } },
    ] },
  // (No 海老名-side → Izumino connection, nor Izumino → 海老名: the junction faces
  // 横浜, so those trains would have to reverse; at 二俣川 each line is its own platform)
  { from: 'Sotetsu Izumino Line',  fromEnd: '二俣川',
    to:   'Sotetsu Main Line',     toStation: '二俣川', toDir: 'start',
    name: 'Yokohama', ja: '横浜方面', color: '#003087',
    // The first and the late 各停 end at the junction itself (5 wd / 7 Sat/hol; ODPT 2026-03)
    lineDests: [
      { until: '二俣川', name: 'Futamatagawa', ja: '二俣川方面', color: '#4a9b4a',
        schedule: { weekday: { timeRange: [22, 5] }, weekend: { timeRange: [21, 5] } } },
    ],
    destinations: [
      { until: '横浜', name: 'Yokohama', ja: '横浜方面', color: '#003087' },
    ],
    express: [
      { stops: null, name: 'Local', ja: '各停' },
      // 快速: weekday mornings, afternoons and the last one; Sat/hol in waves (ODPT 2026-03)
      { name: 'Rapid', ja: '快速', color: '#00b900', stops: [
        '湘南台','ゆめが丘','いずみ中央','いずみ野','弥生台','緑園都市','南万騎が原',
        '二俣川','鶴ヶ峰','西谷','星川','横浜'],
        schedule: { weekday: { timeRange: [[8, 11], [15, 20], [23, 24]] }, weekend: { timeRange: [[6, 11], [13, 15], [17, 19], [22, 24]] } } },
      // Weekday mornings (湘南台 6:26–7:47); Izumino 特急/通勤特急 run to Tokyu, not 横浜
      { name: 'Commuter Exp', ja: '通勤急行', color: '#3a6fd8', stops: [
        '湘南台','ゆめが丘','いずみ中央','いずみ野','弥生台','緑園都市','南万騎が原',
        '二俣川','鶴ヶ峰','西谷','横浜'],
        schedule: { weekend: { stops: [] }, weekday: { timeRange: [6, 9] } } },
    ] },
  // Izumino trains through-running to Tokyu via 羽沢横浜国大 (各停, evening 特急,
  // weekday-morning 通勤特急), mirroring Tokyu → Izumino
  { from: 'Sotetsu Izumino Line',       fromEnd: '二俣川',
    to:   'Sotetsu Shin-Yokohama Line',  toEnd: '西谷',
    via:  ['鶴ヶ峰', '西谷'],
    impliedLines: ['Sotetsu Main Line'],
    name: 'Shin-Yokohama', ja: '新横浜方面', color: '#890d84',
    destinations: [
      { until: '新横浜', name: 'Shin-Yokohama', ja: '新横浜方面', color: '#890d84' },
    ],
    express: [
      { stops: null, name: 'Local', ja: '各停' },
      { name: 'Ltd. Express', ja: '特急', color: '#e83080', stops: [
        '湘南台','いずみ野','二俣川','西谷','羽沢横浜国大','新横浜'],
        schedule: { weekday: { timeRange: [18, 22] }, weekend: { timeRange: [[8, 9], [21, 22]] } } },
      { name: 'Commuter Ltd. Exp', ja: '通勤特急', color: '#3a6fd8', stops: [
        '湘南台','いずみ野','二俣川','西谷','羽沢横浜国大','新横浜'], // also calls at 鶴ヶ峰 (via)
        schedule: { weekend: { stops: [] }, weekday: { timeRange: [6, 9] } } },
    ] },

  // ── Toei Shinjuku ↔ Keio at Shinjuku ──────────────────────────────────
  // Through trains use the Keio New Line (every train stops at 初台/幡ヶ谷)
  // and join the Keio Line at 笹塚; Keio Line trains don't call there.
  // They run on the Keio Line as 各停 / 区間急行 / 急行 (Toei 急行 → Keio 急行);
  // 特急 never runs through, so the express lists replace the Keio types.
  // 区間急行 run on to the Sagamihara Line (not west of 調布) since 2025-03.
  // Hashimoto (Sagamihara Line) and Takaosanguchi are chained mid-line hops.
  { from: 'Toei Shinjuku Line', fromEnd: '新宿',
    to:   'Keio Line',          toStation: '笹塚', toDir: 'end',
    via:  ['初台', '幡ヶ谷', '笹塚'],
    impliedLines: ['Keio new line'],
    // Through trains end at 笹塚 or run on to the Sagamihara Line (橋本 / 京王多摩センター,
    // chained); none reaches 京王八王子 (ODPT 2025-03)
    destinations: [
      { until: '笹塚',       name: 'Sasazuka',      ja: '笹塚方面',       color: '#B0C800' },
    ],
    express: [
      { stops: null, name: 'Local', ja: '各停' },
      { name: 'Sub-Exp', ja: '区間急行', color: '#f0c000', stops: [
        '新宿','笹塚','明大前','桜上水','千歳烏山','仙川','つつじヶ丘','調布'] },
      // 急行: weekday mornings and one evening train, weekend mornings; on to the Sagamihara Line
      { name: 'Express', ja: '急行', color: '#e83030', stops: [
        '本八幡','船堀','大島','森下','馬喰横山','神保町','市ヶ谷','新宿',
        '笹塚','明大前','桜上水','千歳烏山','つつじヶ丘','調布'],
        schedule: { weekday: { timeRange: [[7, 8], [9, 11], [17, 18]] }, weekend: { timeRange: [7, 11] } } },
      // 快速 (local on Toei): runs on toward 橋本 / 京王多摩センター; weekdays by day only
      { name: 'Rapid', ja: '快速', color: '#00a0a0', stops: [
        '本八幡','篠崎','瑞江','一之江','船堀','東大島','大島','西大島','住吉','菊川','森下',
        '浜町','馬喰横山','岩本町','小川町','神保町','九段下','市ヶ谷','曙橋','新宿三丁目','新宿',
        '笹塚','明大前','下高井戸','桜上水','八幡山','千歳烏山','仙川','つつじヶ丘','調布'],
        schedule: { weekday: { timeRange: [[10, 18], [23, 24]] } } },
    ] },
  { from: 'Keio Line',          fromStation: '笹塚', fromDir: 'start',
    to:   'Toei Shinjuku Line', toEnd:   '新宿',
    via:  ['幡ヶ谷', '初台', '新宿'],
    impliedLines: ['Keio new line'],
    name: 'Moto-Yawata', ja: '本八幡方面', color: '#6CBB5A',
    // Chained from the Sagamihara Line only (Takao Line trains end at Keio 新宿)
    chainFrom: ['Keio Sagamihara line'],
    // 新宿 / 高幡不動 / 桜上水 come from LINE_DESTINATIONS["Keio Line"], which merges this one
    destinations: [
      // Keio 特急 never run through to Toei
      { until: '本八幡', name: 'Moto-Yawata', ja: '本八幡方面', color: '#6CBB5A',
        services: ['Local', 'Sub-Exp', 'Express', 'Rapid'] },
      // 6 weekday-morning trains from 調布 end at 大島 (ODPT 2026-08)
      { until: '大島', name: 'Ojima', ja: '大島方面', color: '#6CBB5A',
        services: ['Local', 'Sub-Exp', 'Rapid'],
        schedule: { weekday: { timeRange: [8, 10] }, weekend: { stops: [] } } },
    ],
    express: [
      // Through 各停: early mornings and the last trains (Sat/hol also 19–20h); by day the through
      // trains are 区間急行 / 快速 (ODPT 2026-08)
      { stops: null, name: 'Local', ja: '各停',
        schedule: { weekday: { timeRange: [[4, 10], [23, 1]] }, weekend: { timeRange: [[4, 10], [19, 21], [23, 1]] } } },
      { name: 'Sub-Exp', ja: '区間急行', color: '#f0c000', stops: [
        '調布','つつじヶ丘','仙川','千歳烏山',
        '桜上水','明大前','笹塚',
        '新宿','新宿三丁目','曙橋','市ヶ谷','九段下','神保町','小川町','岩本町','馬喰横山','浜町',
        '森下','菊川','住吉','西大島','大島','東大島','船堀','一之江','瑞江','篠崎','本八幡'] },
      // 急行: weekday morning and evening peaks, Sat/hol mornings and the late afternoon (ODPT 2026-08)
      { name: 'Express', ja: '急行', color: '#e83030', stops: [
        '京王八王子','北野','高幡不動','聖蹟桜ヶ丘','分倍河原','府中','東府中','調布',
        'つつじヶ丘','千歳烏山','桜上水','明大前','笹塚',
        '新宿','市ヶ谷','神保町','馬喰横山','森下','大島','船堀','本八幡'],
        schedule: { weekday: { timeRange: [[7, 9], [17, 21]] }, weekend: { timeRange: [[8, 11], [16, 18]] } } },
      // 快速: weekday first train, daytime, 21h and 23h (Sat/hol all day; ODPT 2026-08)
      { name: 'Rapid', ja: '快速', color: '#00a0a0', stops: [
        '調布','つつじヶ丘','仙川','千歳烏山','八幡山','桜上水','下高井戸','明大前','笹塚',
        '新宿','新宿三丁目','曙橋','市ヶ谷','九段下','神保町','小川町','岩本町','馬喰横山','浜町',
        '森下','菊川','住吉','西大島','大島','東大島','船堀','一之江','瑞江','篠崎','本八幡'],
        schedule: { weekday: { timeRange: [[5, 6], [9, 18], [21, 22], [23, 24]] } } },
    ] },
  // Keio New Line trains from 初台/幡ヶ谷 continue onto the Keio Line past 笹塚
  { from: 'Keio new line', fromEnd: '笹塚',
    to:   'Keio Line',     toStation: '笹塚', toDir: 'end',
    destinations: [
      { until: '京王八王子', name: 'Keio-Hachioji', ja: '京王八王子方面', color: '#800080' },
    ],
    express: [
      { stops: null, name: 'Local', ja: '各停' },
      { name: 'Sub-Exp', ja: '区間急行', color: '#f0c000', stops: [
        '笹塚','明大前','桜上水','千歳烏山','仙川','つつじヶ丘','調布'] },
      // 急行 call at every New Line station; weekday 7h, 9h and 17–19h, Sat/hol mornings (ODPT 2026-08)
      { name: 'Express', ja: '急行', color: '#e83030', stops: [
        '新線新宿','初台','幡ヶ谷','笹塚','明大前','桜上水','千歳烏山','つつじヶ丘','調布','東府中','府中',
        '分倍河原','聖蹟桜ヶ丘','高幡不動','北野','京王八王子'],
        schedule: { weekday: { timeRange: [[7, 8], [9, 10], [17, 20]] }, weekend: { timeRange: [7, 12] } } },
      // 快速: weekday daytime and the last one; all day Sat/hol
      { name: 'Rapid', ja: '快速', color: '#00a0a0', stops: [
        '初台','幡ヶ谷','笹塚','明大前','下高井戸','桜上水','八幡山','千歳烏山','仙川','つつじヶ丘','調布'],
        schedule: { weekday: { timeRange: [[10, 18], [23, 24]] } } },
    ] },
  // ...and from 笹塚/幡ヶ谷 onto Toei. 新線新宿 is the same platform as Toei's
  // 新宿, which (as the junction) must be in via to stay landable.
  { from: 'Keio new line',      fromStation: '初台', fromDir: 'start',
    to:   'Toei Shinjuku Line', toEnd: '新宿',
    via:  ['新宿'],
    lineDests: [
      { until: '新線新宿', name: 'Shinsen-Shinjuku', ja: '新線新宿方面', color: '#800080' },
    ],
    destinations: [
      { until: '本八幡', name: 'Moto-Yawata', ja: '本八幡方面', color: '#6CBB5A' },
      // 大島 short turns in the rushes and late (8 wd / 4 Sat/hol; ODPT 2026-08)
      { until: '大島',   name: 'Ojima',       ja: '大島方面',   color: '#6CBB5A',
        schedule: { weekday: { timeRange: [[8, 10], [23, 24]] }, weekend: { timeRange: [[17, 19], [23, 24]] } } },
    ] },

  // ── Tobu Tojo ↔ Fukutoshin/Yurakucho at Wakoshi ──────────────────────
  // Wakoshi is mid-line on Tobu Tojo (idx 10), start of Fukutoshin and Yurakucho.
  // Only riders heading toward Ikebukuro switch here (trains from Ikebukuro never reverse onto the Metro).
  // (池袋 and the 森林公園 short turn come from LINE_DESTINATIONS["Tobu Tojo Line"], which merges these)
  { from: 'Tobu Tojo Line',             fromStation: '和光市', fromDir: 'start',
    to:   'Tokyo Metro Fukutoshin Line', toEnd: '和光市',
    name: 'Shibuya', ja: '渋谷方面', color: '#9C5E31',
    destinations: [
      // Through trains are 普通 and 快速急行 (F-Liner); 準急, 急行 and 川越特急 run only to
      // 池袋 (ja.wikipedia.org/wiki/東武東上本線)
      { until: '渋谷', name: 'Shibuya', ja: '渋谷方面', color: '#9C5E31',
        services: ['Local', 'F-Liner', 'Fukutoshin Express'] },
    ] },
  { from: 'Tobu Tojo Line',             fromStation: '和光市', fromDir: 'start',
    to:   'Tokyo Metro Yurakucho Line',  toEnd: '和光市',
    name: 'Shin-kiba', ja: '新木場方面', color: '#C9A800',
    destinations: [
      // Yurakucho through trains are all 普通
      { until: '新木場', name: 'Shin-kiba', ja: '新木場方面', color: '#C9A800',
        services: ['Local'] },
    ] },
  // Return: Fukutoshin/Yurakucho terminus → Tobu Tojo
  // Half the trains end at 和光市; short turns at 池袋 (daytime) and 新宿三丁目 (weekday
  // rushes). Through trains end at 志木 (各停), 川越市 (各停, 通勤急行), 森林公園 (all types)
  // and, 3 weekend-morning trains, 小川町: never the Tojo's own 準急/急行 (ODPT 2026-03)
  { from: 'Tokyo Metro Fukutoshin Line', fromEnd: '和光市',
    to:   'Tobu Tojo Line',             toStation: '和光市', toDir: 'end',
    toUntil: '小川町',
    lineDests: [
      { until: '和光市', name: 'Wakoshi', ja: '和光市方面', color: '#9C5E31' },
      { until: '池袋', name: 'Ikebukuro', ja: '池袋方面', color: '#9C5E31',
        schedule: { weekday: { timeRange: [[8, 18], [0, 1]] }, weekend: { timeRange: [[7, 19], [0, 1]] } } },
      { until: '新宿三丁目', name: 'Shinjuku-sanchome', ja: '新宿三丁目方面', color: '#9C5E31',
        schedule: { weekday: { timeRange: [[7, 10], [17, 22], [0, 1]] }, weekend: { timeRange: [0, 1] } } },
    ],
    destinations: [
      { until: '志木', name: 'Shiki', ja: '志木方面', color: '#5aa0d8', services: ['Local'],
        schedule: { weekday: { timeRange: [[5, 8], [9, 10], [14, 23]] }, weekend: { timeRange: [[7, 9], [15, 17], [19, 21]] } } },
      { until: '川越市', name: 'Kawagoeshi', ja: '川越市方面', color: '#4890c8', services: ['Local', 'Commuter Exp'] },
      { until: '森林公園', name: 'Shinrin-Koen', ja: '森林公園方面', color: '#0068B7', services: ['Local', 'Express', 'F-Liner', 'Commuter Exp'] },
      { until: '小川町', name: 'Ogawamachi', ja: '小川町方面', color: '#003878', services: ['Express', 'F-Liner'],
        schedule: { weekday: { stops: [] }, weekend: { timeRange: [6, 9] } } },
    ] },
  // Yurakucho through-trains are local only (no express on Tojo); 5 weekday trains end
  // at 志木, 5 at 池袋 (mornings and the last ones) (ODPT 2026-03)
  { from: 'Tokyo Metro Yurakucho Line',  fromEnd: '和光市',
    to:   'Tobu Tojo Line',             toStation: '和光市', toDir: 'end',
    toUntil: '森林公園',
    lineDests: [
      { until: '和光市', name: 'Wakoshi', ja: '和光市方面', color: '#C9A800' },
      { until: '池袋', name: 'Ikebukuro', ja: '池袋方面', color: '#C9A800',
        schedule: { weekday: { timeRange: [[7, 10], [23, 1]] }, weekend: { timeRange: [23, 1] } } },
    ],
    destinations: [
      { until: '志木', name: 'Shiki', ja: '志木方面', color: '#5aa0d8',
        schedule: { weekday: { timeRange: [[5, 7], [8, 10], [18, 22]] }, weekend: { timeRange: [[6, 7], [14, 16]] } } },
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
      // 通勤快速: weekday evenings, all stations on the Ome Line
      { until: '青梅', name: 'Ome', ja: '青梅方面', color: '#6a5020', services: ['Rapid', 'Ome Sp. Rapid', 'Commuter Rapid', 'Holiday Rapid Okutama'] },
    ],
    express: [
      { name: 'Ome Sp. Rapid', ja: '青梅特快', color: '#f07000',
        stops: ['東京','神田','御茶ノ水','四ツ谷','新宿',
                '中野','三鷹','国分寺','立川',
                '西立川','東中神','中神','昭島',
                '拝島','牛浜','福生','羽村','小作','河辺',
                '東青梅','青梅'],
        schedule: { weekday: { timeRange: [[10, 16], [22, 23]] }, weekend: { timeRange: [[7, 18], [20, 22]] } } },
      // ホリデー快速おくたま: weekends, 東京 6:30, 7:29, 8:22 (the 奥多摩 extension runs on set days only)
      { name: 'Holiday Rapid Okutama', ja: 'ホリデー快速おくたま', color: '#2a8a4a',
        stops: ['東京','神田','御茶ノ水','四ツ谷','新宿',
                '中野','三鷹','国分寺','立川',
                '西立川','拝島','福生','青梅'],
        schedule: { weekday: { stops: [] }, weekend: { timeRange: [6, 9] } } },
    ] },

  // ── Ome → Chuo at Tachikawa ─────────────────────────────────────────
  // Ome trains run on to Tokyo all day as 快速 / 青梅特快; others end at Tachikawa.
  // Half the trains from 奥多摩 end at 青梅 (ODPT 2026-03)
  { from: 'JR Ome Line',  fromEnd: '立川',
    to:   'JR Chuo Line', toStation: '立川', toDir: 'start',
    lineDests: [
      { until: '青梅', name: 'Ome',       ja: '青梅方面', color: '#6a5020' },
      { until: '立川', name: 'Tachikawa', ja: '立川方面', color: '#b8a060' },
    ],
    destinations: [
      { until: '東京', name: 'Tokyo', ja: '東京方面', color: '#f15a22' },
    ],
    express: [
      { stops: null, name: 'Rapid', ja: '快速', color: '#00b900' },
      { name: 'Ome Sp. Rapid', ja: '青梅特快', color: '#f07000',
        stops: ['青梅','東青梅','河辺','小作','羽村','福生','牛浜',
                '拝島','昭島','中神','東中神','西立川','立川',
                '国分寺','三鷹','中野','新宿','四ツ谷','御茶ノ水','神田','東京'],
        schedule: { weekday: { timeRange: [[5, 7], [9, 16], [18, 19]] }, weekend: { timeRange: [[6, 16], [18, 19]] } } },
      // 2 weekday-morning trains (青梅 6:35, 7:51): all stations to 立川, then 通勤特快
      // ホリデー快速おくたま: weekends, 青梅 15:42, 16:54, 17:27
      { name: 'Holiday Rapid Okutama', ja: 'ホリデー快速おくたま', color: '#2a8a4a',
        stops: ['青梅','福生','拝島','西立川','立川',
                '国分寺','三鷹','中野','新宿','四ツ谷','御茶ノ水','神田','東京'],
        schedule: { weekday: { stops: [] }, weekend: { timeRange: [15, 18] } } },
      { name: 'Commuter Sp. Rapid', ja: '通勤特快', color: '#1a6fd8',
        stops: ['青梅','東青梅','河辺','小作','羽村','福生','牛浜',
                '拝島','昭島','中神','東中神','西立川','立川',
                '国分寺','新宿','四ツ谷','御茶ノ水','神田','東京'],
        schedule: { weekend: { stops: [] }, weekday: { timeRange: [6, 9] } } },
    ] },

  // ── Itsukaichi → Ome at Haijima ──────────────────────────────────────
  // A third of the trains from 武蔵五日市 run on to 立川 (28 wd / 13 we, rushes and the
  // last one), the rest end at 拝島 (ODPT 2026-03). The Ome → Itsukaichi direction is the
  // Itsukaichi Line's own platform at 拝島 (Y-junction).
  { from: 'JR Itsukaichi Line', fromEnd: '拝島',
    to:   'JR Ome Line',        toStation: '拝島', toDir: 'start',
    toUntil: '立川',
    lineDests: [
      { until: '拝島', name: 'Haijima', ja: '拝島方面', color: '#b8a060' },
    ],
    destinations: [
      { until: '立川', name: 'Tachikawa', ja: '立川方面', color: '#b8a060',
        schedule: { weekday: { timeRange: [[5, 10], [15, 22], [23, 24]] }, weekend: { timeRange: [[5, 9], [15, 18], [19, 21]] } } },
    ],
    express: [{ stops: null, name: 'Local', ja: '普通',
      schedule: { weekday: { timeRange: [[5, 10], [15, 22], [23, 24]] }, weekend: { timeRange: [[5, 9], [15, 18], [19, 21]] } } }] },

  // ── Chuo → Fuji Express at Otsuki ────────────────────────────────────
  // 2 evening trains through-run to Kawaguchiko: weekday Commuter Rapid, weekend
  // 中央特快 (東京 18:21, 19:09). Destinations merged into Chuo LINE_DESTINATIONS
  // picker via handleLineDestinations.
  { from: 'JR Chuo Line',      fromStation: '大月', fromDir: 'end',
    to:   'Fuji Express Line', toStation: '大月', toDir: 'end',
    destinations: [
      { until: '河口湖', name: 'Kawaguchiko', ja: '河口湖方面', color: '#67db56',
        services: ['Commuter Rapid', 'Chuo Sp. Rapid'],
        schedule: { weekday: { timeRange: [18, 21] }, weekend: { timeRange: [18, 21] } } },
    ],
    express: [
      { name: 'Chuo Sp. Rapid', ja: '中央特快', color: '#f07000',
        schedule: { weekday: { stops: [] }, weekend: { timeRange: [18, 21] } },
        stops: ['東京','神田','御茶ノ水','四ツ谷','新宿',
                '中野','三鷹','国分寺',
                '立川','日野','豊田','八王子','西八王子','高尾',
                '相模湖','藤野','上野原','四方津','梁川',
                '鳥沢','猿橋','大月',
                '上大月','田野倉','禾生','赤坂','都留市',
                '谷村町','都留文科大学前','十日市場','東桂',
                '三つ峠','寿','葭池温泉前','下吉田',
                '月江寺','富士山','富士急ハイランド','河口湖'] },
      { name: 'Commuter Rapid', ja: '通勤快速', color: '#e83030',
        schedule: { weekend: { stops: [] }, weekday: { timeRange: [18, 21] } },
        stops: ['東京','神田','御茶ノ水','四ツ谷','新宿',
                '中野','荻窪','吉祥寺','三鷹','国分寺',
                '立川','日野','豊田','八王子','西八王子','高尾',
                '相模湖','藤野','上野原','四方津','梁川',
                '鳥沢','猿橋','大月',
                '上大月','田野倉','禾生','赤坂','都留市',
                '谷村町','都留文科大学前','十日市場','東桂',
                '三つ峠','寿','葭池温泉前','下吉田',
                '月江寺','富士山','富士急ハイランド','河口湖'] },
    ] },

  // ── Fuji Express → Chuo at Otsuki ────────────────────────────────────
  // 2 morning trains a day run on to 東京 (河口湖 05:49, 06:15), all stations to
  // 高尾: weekday 快速 (all stations), weekend 中央特快 east of 高尾
  { from: 'Fuji Express Line', fromEnd: '大月',
    to:   'JR Chuo Line',      toStation: '大月', toDir: 'start',
    lineDests: [
      { until: '大月', name: 'Otsuki', ja: '大月方面', color: '#67db56' },
    ],
    destinations: [
      { until: '東京', name: 'Tokyo', ja: '東京方面', color: '#f15a22',
        schedule: { weekday: { timeRange: [5, 7] }, weekend: { timeRange: [5, 7] } } },
    ],
    express: [
      { stops: null, name: 'Rapid', ja: '快速', color: '#00b900',
        schedule: { weekend: { stops: [] } } },
      { name: 'Chuo Sp. Rapid', ja: '中央特快', color: '#f07000',
        schedule: { weekday: { stops: [] } },
        stops: ['河口湖','富士急ハイランド','富士山','月江寺','下吉田','葭池温泉前','寿','三つ峠',
                '東桂','十日市場','都留文科大学前','谷村町','都留市','赤坂','禾生','田野倉','上大月',
                '大月','猿橋','鳥沢','梁川','四方津','上野原','藤野','相模湖',
                '高尾','西八王子','八王子','豊田','日野','立川',
                '国分寺','三鷹','中野','新宿','四ツ谷','御茶ノ水','神田','東京'] },
    ] },

  // ── Chiyoda ↔ JR Joban Local at Ayase ─────────────────────────────────
  // Ayase is idx 1 on Chiyoda (Kita-ayase is a 1-station stub) and the start of the
  // Joban local tracks; rapid trains never call here.
  // 北綾瀬 trains (half of them) and 綾瀬 short turns stay on the line; through trains
  // end at 我孫子 all day, 松戸/柏 mornings and evenings, 取手 weekdays only (ODPT 2026-03)
  { from: 'Tokyo Metro Chiyoda Line', fromStation: '綾瀬', fromDir: 'start',
    to:   'JR Joban Line (Local)',    toEnd: '綾瀬',
    lineDests: [
      { until: '北綾瀬', name: 'Kita-ayase', ja: '北綾瀬方面', color: '#00BB85' },
      { until: '綾瀬',   name: 'Ayase',      ja: '綾瀬方面',   color: '#00BB85',
        schedule: { weekday: { timeRange: [6, 1] }, weekend: { timeRange: [[7, 21], [22, 24]] } } },
    ],
    destinations: [
      { until: '松戸',   name: 'Matsudo', ja: '松戸方面',   color: '#3ab070',
        schedule: { weekday: { timeRange: [[6, 10], [0, 1]] }, weekend: { timeRange: [[9, 10], [23, 1]] } } },
      { until: '柏',     name: 'Kashiwa', ja: '柏方面',     color: '#2a9a68',
        schedule: { weekday: { timeRange: [[5, 8], [17, 21]] }, weekend: { stops: [] } } },
      { until: '我孫子', name: 'Abiko',   ja: '我孫子方面', color: '#1aa260' },
      { until: '取手',   name: 'Toride',  ja: '取手方面',   color: '#009BBF',
        schedule: { weekday: { timeRange: [[5, 8], [16, 20]] }, weekend: { stops: [] } } },
    ] },
  // Joban locals run on to 代々木上原 all day; a third continue onto the Odakyu (唐木田 by day,
  // 向ヶ丘遊園 / 成城学園前 in the rushes, 伊勢原 evenings), reached as the Chiyoda → Odakyu
  // connection's chained destinations. On the JR and Metro stretch every one is a 普通; the
  // 準急 / 急行 entries carry the Odakyu names so the chain merges their stops (ODPT 2026-03)
  { from: 'JR Joban Line (Local)',    fromEnd: '綾瀬',
    to:   'Tokyo Metro Chiyoda Line', toStation: '綾瀬', toDir: 'end',
    lineDests: [
      { until: '綾瀬', name: 'Ayase', ja: '綾瀬方面', color: '#00BB85' },
    ],
    destinations: [
      { until: '代々木上原', name: 'Yoyogi-Uehara', ja: '代々木上原方面', color: '#00BB85' },
    ],
    express: [
      { stops: null, name: 'Local', ja: '各停', color: '#00a0e8' },
      { name: 'Semi-Exp', ja: '準急', color: '#00b900',
        stops: ['綾瀬','北千住','町屋','西日暮里','千駄木','根津','湯島','新御茶ノ水','大手町','二重橋前','日比谷',
                '霞ケ関','国会議事堂前','赤坂','乃木坂','表参道','明治神宮前〈原宿〉','代々木公園','代々木上原'],
        schedule: { weekday: { timeRange: [[6, 10], [15, 22]] }, weekend: { timeRange: [[8, 11], [15, 19]] } } },
      { name: 'Express', ja: '急行', color: '#e83030',
        stops: ['綾瀬','北千住','町屋','西日暮里','千駄木','根津','湯島','新御茶ノ水','大手町','二重橋前','日比谷',
                '霞ケ関','国会議事堂前','赤坂','乃木坂','表参道','明治神宮前〈原宿〉','代々木公園','代々木上原'],
        schedule: { weekday: { timeRange: [[10, 16], [17, 23]] }, weekend: { timeRange: [[6, 16], [19, 23]] } } },
    ] },

  // ── JR Mito Line ↔ Joban at Tomobe ────────────────────────────────────
  // About a third of Mito Line trains run on from Tomobe to Mito, most to Katsuta.
  { from: 'JR Mito Line',  fromEnd: '友部',
    to:   'JR Joban Line', toStation: '友部', toDir: 'end',
    toUntil: '勝田',
    name: 'Mito', ja: '水戸方面', color: '#00b261',
    lineDests: [
      { until: '友部', name: 'Tomobe', ja: '友部方面', color: '#5a8f5a' },
    ],
    destinations: [
      { until: '水戸', name: 'Mito',    ja: '水戸方面', color: '#086080' },
      { until: '勝田', name: 'Katsuta', ja: '勝田方面', color: '#064860' },
    ] },
  { from: 'JR Joban Line', fromStation: '友部', fromDir: 'start',
    to:   'JR Mito Line',  toEnd: '友部',
    name: 'Oyama', ja: '小山方面', color: '#00b261',
    lineDests: [
      { until: '土浦', name: 'Tsuchiura', ja: '土浦方面', color: '#0a7fa0' },
      { until: '上野', name: 'Ueno',      ja: '上野方面', color: '#009BBF' },
    ],
    destinations: [
      { until: '小山', name: 'Oyama', ja: '小山方面', color: '#00b261' },
    ] },

  // ── Joban → Narita Line at Abiko ──────────────────────────────────────
  // Some 快速 from Ueno run on to Narita
  { from: 'JR Joban Line',          fromStation: '我孫子', fromDir: 'end',
    to:   'JR Narita Line (Abiko)', toEnd: '我孫子',
    name: 'Narita', ja: '成田方面', color: '#00b261',
    destinations: [
      { until: '成田', name: 'Narita', ja: '成田方面', color: '#00b261' },
    ] },
  // ...and back: 16 a day from 成田 run on to 上野 (a few to 品川 over the Ueno Tokyo Line, a
  // chained destination); the rest end at 我孫子 (ODPT 2026-03)
  { from: 'JR Narita Line (Abiko)', fromEnd: '我孫子',
    to:   'JR Joban Line',          toStation: '我孫子', toDir: 'start',
    lineDests: [
      { until: '我孫子', name: 'Abiko', ja: '我孫子方面', color: '#00b261' },
    ],
    destinations: [
      { until: '上野', name: 'Ueno', ja: '上野方面', color: '#009BBF', services: ['Local'],
        schedule: { weekday: { timeRange: [[4, 16], [17, 19], [21, 23]] }, weekend: { timeRange: [[4, 19], [21, 23]] } } },
    ],
    express: [{ stops: null, name: 'Local', ja: '普通' }] },

  // ── Rinkai ↔ Saikyo at Osaki ──────────────────────────────────────────
  // Saikyo southbound: some trains terminate at Shinjuku, others continue to Osaki or Shin-Kiba
  // Rinkai trains end at 大崎 (half), 川越 (chained, all day), 大宮 and 赤羽 (各停, rushes),
  // 東京テレポート (a few) (ODPT 2026-03). No `services`: they would narrow the chained 川越 types
  { from: 'Rinkai Line',    fromEnd: '大崎',
    to:   'JR Saikyo Line', toEnd:   '大崎',
    lineDests: [
      { until: '東京テレポート', name: 'Tokyo Teleport', ja: '東京テレポート方面', color: '#767c78',
        schedule: { weekday: { timeRange: [[9, 10], [21, 23]] }, weekend: { timeRange: [[10, 11], [22, 24]] } } },
      { until: '大崎', name: 'Osaki', ja: '大崎方面', color: '#767c78',
        schedule: { weekday: { timeRange: [[5, 22], [23, 1]] }, weekend: { timeRange: [5, 1] } } },
    ],
    destinations: [
      { until: '赤羽', name: 'Akabane', ja: '赤羽方面', color: '#2a9a60',
        schedule: { weekday: { timeRange: [[8, 9], [19, 23]] }, weekend: { timeRange: [22, 23] } } },
      { until: '大宮', name: 'Omiya', ja: '大宮方面', color: '#007540',
        schedule: { weekday: { timeRange: [[7, 11], [16, 20], [22, 23]] }, weekend: { timeRange: [[6, 10], [16, 21], [22, 23]] } } },
    ] },
  // 8 a day end at 池袋 (the first and last trains) (ODPT 2026-03)
  { from: 'JR Saikyo Line', fromEnd: '大崎',
    to:   'Rinkai Line',    toEnd:   '大崎',
    lineDests: [
      { until: '池袋', name: 'Ikebukuro', ja: '池袋方面', color: '#007540', services: ['Local'],
        schedule: { weekday: { timeRange: [[4, 6], [23, 1]] }, weekend: { timeRange: [[4, 6], [23, 1]] } } },
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
    impliedLines: ['Sotetsu-JR Direct Line', 'Sotetsu Shin-Yokohama Line'], // 羽沢横浜国大–西谷 is Sotetsu Shin-Yokohama Line track
    name: 'Ebina', ja: '海老名方面', color: '#003087',
    destinations: [
      { until: '海老名', name: 'Ebina', ja: '海老名方面', color: '#003087',
        services: ['Local', 'Ltd. Express'] },
    ],
    // JR-direct trains are 各停 or Sotetsu 特急 (local on the JR side)
    express: [
      { stops: null, name: 'Local', ja: '各停' },
      // 特急: mornings and evenings (各停 only by day)
      // (hours at 西谷, ODPT 2026-03: boarding on the Saikyo is earlier)
      { name: 'Ltd. Express', ja: '特急', color: '#e83080', stops: ['大宮','北与野','与野本町','南与野','中浦和','武蔵浦和','北戸田','戸田','戸田公園','浮間舟渡','北赤羽','赤羽','十条','板橋','池袋','新宿','渋谷','恵比寿','大崎',
        '西谷','二俣川','大和','海老名'], schedule: { weekday: { timeRange: [[5, 9], [10, 12], [18, 1]] }, weekend: { timeRange: [[5, 13], [17, 1]] } } },
    ] },
  { from: 'Sotetsu Main Line', fromStation: '西谷', fromDir: 'start',
    to:   'JR Saikyo Line',    toEnd: '大崎',
    via:  ['羽沢横浜国大', '武蔵小杉', '西大井', '大崎'],
    impliedLines: ['Sotetsu-JR Direct Line', 'Sotetsu Shin-Yokohama Line'],
    name: 'Shinjuku', ja: '新宿方面', color: '#007540',
    lineDests: [
      { until: '横浜', name: 'Yokohama', ja: '横浜方面', color: '#003087' },
    ],
    destinations: [
      { until: '新宿', name: 'Shinjuku', ja: '新宿方面', color: '#007540',
        services: ['Local', 'Ltd. Express'] },
      { until: '大宮', name: 'Omiya',    ja: '大宮方面', color: '#007540',
        services: ['Local', 'Ltd. Express'] },
    ],
    express: [
      { stops: null, name: 'Local', ja: '各停' },
      { name: 'Ltd. Express', ja: '特急', color: '#e83080', stops: [
        '海老名','大和','二俣川','西谷','大崎','恵比寿','渋谷','新宿','池袋','板橋','十条','赤羽','北赤羽','浮間舟渡','戸田公園','戸田','北戸田','武蔵浦和','中浦和','南与野','与野本町','北与野','大宮'],
        // Up hours differ from the down ones (wd 5–8h, 10h, 15–23h; Sat/hol 5–10h, 16–22h; ODPT 2026-03)
        schedule: { weekday: { timeRange: [[5, 9], [10, 11], [15, 24]] }, weekend: { timeRange: [[5, 11], [16, 19], [20, 23]] } } },
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
    impliedLines: ['Sotetsu Shin-Yokohama Line'],
    destinations: [
      { until: '海老名', name: 'Ebina', ja: '海老名方面', color: '#003087' },
    ],
    express: [
      { stops: null, name: 'Local', ja: '各停' },
      { name: 'Ltd. Express', ja: '特急', color: '#e83080', stops: [
        '大崎','西大井','武蔵小杉','羽沢横浜国大','西谷','二俣川','大和','海老名'], schedule: { weekday: { timeRange: [[5, 9], [10, 12], [18, 1]] }, weekend: { timeRange: [[5, 13], [17, 1]] } } },
    ] },

  // ── Saikyo ↔ Kawagoe Line at Omiya ────────────────────────────────────
  // Nearly all Saikyo trains through-run onto the Kawagoe Line to Kawagoe.
  // Beyond Kawagoe (toward Komagawa) is a separate shuttle — toUntil stops there.
  // Toward 大宮 the 各停 from 大崎 end at 新宿 (by day), 池袋 (3 mornings), 赤羽 (rushes,
  // late) or 武蔵浦和 (half of them); the 快速 all run to 川越 (ODPT 2026-03)
  { from: 'JR Saikyo Line',  fromEnd: '大宮',
    to:   'JR Kawagoe Line', toEnd:   '大宮',
    toUntil: '川越',
    lineDests: [
      { until: '新宿',     name: 'Shinjuku',      ja: '新宿方面',     color: '#007540', services: ['Local'],
        schedule: { weekday: { timeRange: [[6, 8], [9, 24]] }, weekend: { timeRange: [[6, 8], [9, 24]] } } },
      { until: '池袋',     name: 'Ikebukuro',     ja: '池袋方面',     color: '#007540', services: ['Local'],
        schedule: { weekday: { timeRange: [8, 10] }, weekend: { timeRange: [8, 10] } } },
      { until: '赤羽',     name: 'Akabane',       ja: '赤羽方面',     color: '#2a9a60', services: ['Local'],
        schedule: { weekday: { timeRange: [[4, 5], [7, 10], [19, 1]] }, weekend: { timeRange: [[4, 5], [22, 1]] } } },
      { until: '武蔵浦和', name: 'Musashi-Urawa', ja: '武蔵浦和方面', color: '#1a8a50', services: ['Local'],
        schedule: { weekday: { timeRange: [6, 20] }, weekend: { timeRange: [6, 23] } } },
      { until: '大宮',     name: 'Omiya',         ja: '大宮方面',     color: '#007540' },
    ],
    destinations: [
      { until: '川越', name: 'Kawagoe', ja: '川越方面', color: '#4a786f' },
    ] },
  // Half the trains from 高麗川 end at 川越 (ODPT 2026-03)
  { from: 'JR Kawagoe Line', fromEnd: '大宮',
    to:   'JR Saikyo Line',  toEnd:   '大宮',
    lineDests: [
      { until: '川越', name: 'Kawagoe', ja: '川越方面', color: '#4a786f' },
      { until: '大宮', name: 'Omiya',   ja: '大宮方面', color: '#4a786f' },
    ],
    destinations: [
      { until: '新宿', name: 'Shinjuku', ja: '新宿方面', color: '#007540' },
      { until: '大崎', name: 'Osaki',    ja: '大崎方面', color: '#007540' },
    ] },

  // ── Seibu Shinjuku ↔ Seibu Haijima at Kodaira ──────────────────────
  // 急行 run 西武新宿–拝島 all day (3/hour by day); every train calls at every
  // Haijima Line station.
  { from: 'Seibu Shinjuku Line', fromStation: '小平', fromDir: 'end',
    to:   'Seibu Haijima Line',  toEnd: '小平',
    name: 'Haijima', ja: '拝島方面', color: '#36a9e1',
    lineDests: [
      { until: '本川越', name: 'Hon-Kawagoe', ja: '本川越方面', color: '#00a0e8' },
    ],
    destinations: [
      { until: '拝島', name: 'Haijima', ja: '拝島方面', color: '#36a9e1',
        services: ['Local', 'Express', 'Semi-Exp'] }, // no 快速急行 to 拝島
    ],
    express: [
      { stops: null, name: 'Local', ja: '各停' },
      { name: 'Express', ja: '急行', color: '#e83030',
        stops: ['西武新宿','高田馬場','鷺ノ宮','上石神井','田無','花小金井','小平',
                '萩山','小川','東大和市','玉川上水','武蔵砂川','西武立川','拝島'] },
      // Weekday mornings and evenings (weekends only a handful)
      { name: 'Semi-Exp', ja: '準急', color: '#00b900',
        stops: ['西武新宿','高田馬場','鷺ノ宮','上石神井','武蔵関','東伏見','西武柳沢','田無','花小金井','小平',
                '萩山','小川','東大和市','玉川上水','武蔵砂川','西武立川','拝島'],
        schedule: { weekend: { stops: [] }, weekday: { timeRange: [[7, 10], [16, 23]] } } },
    ] },
  { from: 'Seibu Haijima Line',  fromEnd: '小平',
    to:   'Seibu Shinjuku Line', toStation: '小平', toDir: 'start',
    lineDests: [
      { until: '小平', name: 'Kodaira', ja: '小平方面', color: '#36a9e1' },
    ],
    destinations: [
      { until: '西武新宿', name: 'Seibu-Shinjuku', ja: '西武新宿方面', color: '#00a0e8' },
    ],
    express: [
      { stops: null, name: 'Local', ja: '各停' },
      { name: 'Express', ja: '急行', color: '#e83030',
        stops: ['拝島','西武立川','武蔵砂川','玉川上水','東大和市','小川','萩山','小平',
                '花小金井','田無','上石神井','鷺ノ宮','高田馬場','西武新宿'] },
    ] },

  // ── Sobu ↔ Uchibo at Chiba ──────────────────────────────────────────
  // Hourly Sobu rapids run 東京 ↔ 君津 (the regular timetable: 姉ケ崎–長浦 is suspended
  // after the Sept 2026 typhoon), passing 巌根; the 普通 end at 千葉 (ODPT 2026-03)
  { from: 'JR Sobu Line',   fromStation: '千葉', fromDir: 'end',
    to:   'JR Uchibo Line', toEnd: '千葉',
    toUntil: '君津',
    name: 'Kimitsu', ja: '君津方面', color: '#00b2e5',
    destinations: [
      { until: '君津', name: 'Kimitsu', ja: '君津方面', color: '#00b2e5', services: ['Rapid'] },
    ],
    express: [
      { name: 'Rapid', ja: '快速', color: '#00b900', stops: [...SOBU_RAPID_WEST, ...UCHIBO_RAPID_PAST_CHIBA] },
    ] },
  { from: 'JR Uchibo Line', fromEnd: '千葉',
    to:   'JR Sobu Line',   toStation: '千葉', toDir: 'start',
    boardFrom: '君津',
    lineDests: [
      { until: '千葉', name: 'Chiba', ja: '千葉方面', color: '#00b2e5' },
    ],
    destinations: [
      { until: '東京', name: 'Tokyo', ja: '東京方面', color: '#0068B7', services: ['Rapid'] },
    ],
    express: [
      { name: 'Rapid', ja: '快速', color: '#00b900', stops: [...[...UCHIBO_RAPID_PAST_CHIBA].reverse(), ...SOBU_RAPID_WEST_UP] },
    ] },

  // ── Sobu → Narita Line at Sakura ────────────────────────────────────
  // Hourly Sobu rapids (many from the Yokosuka Line) run 東京 → 成田空港; the
  // airport branch is a chained mid-line hop at 成田 (Narita Line → Airport).
  { from: 'JR Sobu Line',   fromStation: '佐倉', fromDir: 'end',
    to:   'JR Narita Line', toEnd: '佐倉',
    name: 'Narita', ja: '成田方面', color: '#00b261',
    destinations: [
      { until: '成田', name: 'Narita', ja: '成田方面', color: '#00b261' },
      // ~15 locals a day each way run Chiba ↔ Sawara/Choshi via Narita
      { until: '佐原', name: 'Sawara', ja: '佐原方面', color: '#00894a',
        services: ['Local'], localFrom: '千葉', chainFrom: [] },
      { until: '銚子', name: 'Choshi (Narita Line)', ja: '銚子方面（成田線）', color: '#006a3a',
        services: ['Local'], localFrom: '千葉', chainFrom: [] },
    ],
    express: [
      { stops: null, name: 'Local', ja: '普通' },
      { name: 'Rapid', ja: '快速', color: '#00b900', stops: [...SOBU_RAPID_WEST, '都賀', '四街道', '物井', '佐倉', '酒々井', '成田'] },
    ] },
  // ...and back: the 普通 from 銚子 / 佐原 run on to 千葉 (27 a day) or end at 成田 (7); the
  // 快速 from 成田空港 run to 東京 and on over the Yokosuka Line (chained) (ODPT 2026-03)
  { from: 'JR Narita Line', fromEnd: '佐倉',
    to:   'JR Sobu Line',   toStation: '佐倉', toDir: 'start',
    lineDests: [
      { until: '成田', name: 'Narita', ja: '成田方面', color: '#00b261', services: ['Local'],
        schedule: { weekday: { timeRange: [[6, 10], [11, 15], [16, 19], [22, 24]] }, weekend: { timeRange: [[6, 10], [11, 15], [16, 19], [22, 24]] } } },
      { until: '佐倉', name: 'Sakura', ja: '佐倉方面', color: '#00b261' },
    ],
    destinations: [
      { until: '千葉', name: 'Chiba', ja: '千葉方面', color: '#E85830', services: ['Local'],
        schedule: { weekday: { timeRange: [4, 1] }, weekend: { timeRange: [4, 1] } } },
      { until: '東京', name: 'Tokyo', ja: '東京方面', color: '#0068B7', services: ['Rapid'],
        schedule: { weekday: { timeRange: [[7, 8], [19, 22], [23, 24]] }, weekend: { timeRange: [[7, 8], [10, 11], [16, 17], [18, 19], [23, 24]] } } },
    ],
    express: [
      { stops: null, name: 'Local', ja: '普通' },
      { name: 'Rapid', ja: '快速', color: '#00b900', stops: ['成田', '酒々井', '佐倉', '物井', '四街道', '都賀', ...SOBU_RAPID_WEST_UP] },
    ] },

  // ── Keisei Oshiage → Keisei Main / Sky Access / Hokuso at Keisei Takasago ──
  // Terminus on Oshiage side (idx 6) so chains from Keikyu/Asakusa extend past it.
  // Aoto (on both lines) still provides Y-junction platforms naturally.
  // Since Dec 2025 through trains onto the Main Line run as 快速 (Haneda/Nishi-
  // magome → Narita Airport); エアポート快特 continues as アクセス特急 via Sky Access.
  // Both reach 成田空港, so the buttons name the route like the signboards do.
  { from: 'Keisei Oshiage Line', fromEnd: '京成高砂',
    to:   'Keisei Main Line',    toStation: '京成高砂', toDir: 'end',
    lineDests: [
      { until: '京成高砂', name: 'Keisei Takasago', ja: '京成高砂方面', color: '#0073CF' },
    ],
    destinations: [
      // Asakusa-line 快速 end at 京成佐倉 (9 wd) and mixed types at 京成成田 (11 wd / 5 we,
      // evenings) (ODPT 2025-12)
      { until: '京成佐倉', name: 'Keisei Sakura', ja: '京成佐倉方面', color: '#1a5aa8', services: ['Rapid'],
        schedule: { weekday: { timeRange: [[7, 11], [14, 18], [19, 21]] }, weekend: { stops: [] } } },
      { until: '京成成田', name: 'Keisei Narita', ja: '京成成田方面', color: '#0a4890', services: ['Rapid', 'Ltd. Express'],
        schedule: { weekday: { timeRange: [17, 24] }, weekend: { timeRange: [[17, 20], [21, 23]] } } },
      { until: '成田空港（第１旅客ターミナル）', name: 'Narita Airport (Main Line)', ja: '成田空港方面（本線経由）', color: '#003878',
        services: ['Local', 'Rapid', 'Ltd. Express', 'Commuter Ltd. Exp'] },
    ],
    express: [
      // 2 weekday-evening trains from Haneda (押上 21:49, 22:26)
      { name: 'Commuter Ltd. Exp', ja: '通勤特急', color: '#3a6fd8',
        stops: ['押上(スカイツリー前)','青砥','京成高砂','京成八幡','京成船橋','京成津田沼',
                '八千代台','勝田台','志津','ユーカリが丘','京成臼井','京成佐倉','大佐倉',
                '京成酒々井','宗吾参道','公津の杜','京成成田',
                '空港第２ビル（第２旅客ターミナル）','成田空港（第１旅客ターミナル）'],
        schedule: { weekend: { stops: [] }, weekday: { timeRange: [21, 23] } } },
      { name: 'Rapid', ja: '快速', color: '#00b900', chainName: 'Ltd. Express',
        stops: ['押上(スカイツリー前)','青砥','京成高砂',
                '京成小岩','京成八幡','東中山','京成船橋','船橋競馬場','京成津田沼',
                '京成大久保','実籾','八千代台','京成大和田','勝田台','志津',
                'ユーカリが丘','京成臼井','京成佐倉','大佐倉','京成酒々井',
                '宗吾参道','公津の杜','京成成田',
                '空港第２ビル（第２旅客ターミナル）','成田空港（第１旅客ターミナル）'] },
    ] },
  { from: 'Keisei Oshiage Line', fromEnd: '京成高砂',
    to:   'Narita Sky Access',   toStation: '京成高砂', toDir: 'end',
    destinations: [
      { until: '成田空港（第１旅客ターミナル）', name: 'Narita Airport (Sky Access)', ja: '成田空港方面（スカイアクセス経由）', color: '#f08300',
        services: ['Access Express', 'Airport Rapid'] },
    ],
    express: [
      // chainName: Airport Rapid trains from Haneda/Asakusa continue as this
      { name: 'Access Express', ja: 'アクセス特急', color: '#f08300', chainName: 'Airport Rapid',
        stops: ['押上(スカイツリー前)','青砥','京成高砂',
                '東松戸','新鎌ヶ谷','千葉ニュータウン中央','印旛日本医大','成田湯川',
                '空港第２ビル（第２旅客ターミナル）','成田空港（第１旅客ターミナル）'] },
    ] },
  // Hokuso trains run through Keisei Oshiage onto the Asakusa Line (to Nishi-
  // magome since Dec 2025; none to Haneda), so chained rides only offer
  // Hokuso when boarded on the Asakusa Line.
  { from: 'Keisei Oshiage Line', fromEnd: '京成高砂',
    to:   'Hokuso Railway Hokuso Line', toEnd: '京成高砂',
    chainFrom: ['Toei Asakusa Line'],
    destinations: [
      // 19 weekday 各停 end at 印西牧の原 (rushes and the last one) (ODPT 2025-12)
      { until: '印西牧の原', name: 'Inzai-Makinohara', ja: '印西牧の原方面', color: '#30b8e8', services: ['Local'],
        schedule: { weekday: { timeRange: [[6, 11], [16, 21], [23, 24]] }, weekend: { timeRange: [[7, 10], [22, 23]] } } },
      { until: '印旛日本医大', name: 'Inba-Nihon-Idai', ja: '印旛日本医大方面', color: '#00a7db',
        services: ['Local', 'Ltd. Express'] },
    ],
    express: [
      { stops: null, name: 'Local', ja: '各停' },
      // 2 weekday-evening trains (押上 20:36, 21:26)
      { name: 'Ltd. Express', ja: '特急', color: '#e83030',
        stops: ['押上(スカイツリー前)','青砥','京成高砂','東松戸','新鎌ヶ谷','西白井','白井','小室',
                '千葉ニュータウン中央','印西牧の原','印旛日本医大'],
        schedule: { weekend: { stops: [] }, weekday: { timeRange: [20, 22] } } },
    ] },
  { from: 'Hokuso Railway Hokuso Line', fromEnd: '京成高砂',
    to:   'Keisei Oshiage Line',        toEnd: '京成高砂',
    // Keisei Oshiage 特急 aren't Hokuso trains; Hokuso's own weekday-morning 特急 keep
    // the name to 押上 (青砥 only), then run all stations on the Asakusa Line
    express: [
      { stops: null, name: 'Local', ja: '各停' },
      { name: 'Ltd. Express', ja: '特急', color: '#e83030',
        stops: ['印旛日本医大','印西牧の原','千葉ニュータウン中央','小室','白井','西白井',
                '新鎌ヶ谷','東松戸','京成高砂','青砥','押上(スカイツリー前)'],
        schedule: { weekend: { stops: [] }, weekday: { timeRange: [6, 9] } } },
    ] },
  { from: 'Keisei Main Line',    fromStation: '京成高砂', fromDir: 'start',
    to:   'Keisei Oshiage Line', toEnd: '京成高砂' },
  // アクセス特急 from Narita run on via Oshiage as エアポート快特 to Haneda
  // (the Asakusa → Keikyu and Keikyu → Airport hops carry chainName for it)
  { from: 'Narita Sky Access',   fromStation: '京成高砂', fromDir: 'start',
    to:   'Keisei Oshiage Line', toEnd: '京成高砂',
    name: 'Haneda Airport', ja: '羽田空港方面', color: '#e83080',
    lineDests: [
      // 3 weekday trains a day (成田空港 about 18:45, 19:30, 22:05)
      { until: '京成上野', name: 'Keisei Ueno', ja: '京成上野方面', color: '#f08300',
        schedule: { weekend: { stops: [] }, weekday: { timeRange: [[18, 20], [22, 23]] } } },
    ],
    destinations: [
      { until: '押上(スカイツリー前)', name: 'Oshiage', ja: '押上方面', color: '#0073CF',
        services: ['Access Express'] },
    ],
    express: [
      { stops: null, name: 'Local', ja: '普通' }, // keeps the picker logic two-typed; filtered by services
      { name: 'Access Express', ja: 'アクセス特急', color: '#f08300',
        stops: ['成田空港（第１旅客ターミナル）','空港第２ビル（第２旅客ターミナル）','成田湯川','印旛日本医大',
                '千葉ニュータウン中央','新鎌ヶ谷','東松戸','京成高砂','青砥','押上(スカイツリー前)'] },
    ] },

  // ── Keisei Matsudo ↔ Keisei Chiba at Keisei-Tsudanuma ─────────────────
  // Through service (Matsudo↔Chiba-Chuo) continues post-2025 merger.
  // All-local on both lines — transparent 1:1 through-running.
  { from: 'Keisei Matsudo Line', fromEnd: '京成津田沼',
    to:   'Keisei Chiba Line',   toEnd:   '京成津田沼',
    toUntil: '千葉中央' }, // they end at Chiba-Chuo (no chaining onto the Chihara Line)
  { from: 'Keisei Chiba Line',   fromEnd: '京成津田沼',
    to:   'Keisei Matsudo Line', toEnd:   '京成津田沼' },

  // ── Keisei Chihara ↔ Keisei Chiba at Chiba-Chuo ──────────────────────
  // Every Chihara Line train runs through to Keisei-Tsudanuma (all-local).
  { from: 'Keisei Chihara Line', fromEnd: '千葉中央',
    to:   'Keisei Chiba Line',   toEnd:   '千葉中央',
    toUntil: '京成津田沼' }, // ends there (no chaining onto the Matsudo Line)
  { from: 'Keisei Chiba Line',   fromEnd: '千葉中央',
    to:   'Keisei Chihara Line', toEnd:   '千葉中央',
    lineDests: [
      { until: '千葉中央', name: 'Chiba-Chuo', ja: '千葉中央方面', color: '#0073CF' },
    ],
    destinations: [
      { until: 'ちはら台', name: 'Chiharadai', ja: 'ちはら台方面', color: '#00a0e8' },
    ] },

  // ── Keio ↔ Keio Sagamihara at Chofu ───────────────────────────────────
  // Chofu is mid-line on Keio (idx 17), start of Sagamihara (idx 0). The branch
  // faces Shinjuku, so only riders heading away from Shinjuku can take it.
  { from: 'Keio Line',            fromStation: '調布', fromDir: 'end',
    to:   'Keio Sagamihara line', toEnd: '調布',
    name: 'Hashimoto', ja: '橋本方面', color: '#dd44aa',
    // 京王八王子 and the Keio Line short turns come from LINE_DESTINATIONS["Keio Line"]
    destinations: [
      // 京王多摩センター: 73 Keio and 54 Toei through trains a day end there, none a 各停 (ODPT 2026-08)
      { until: '京王多摩センター', name: 'Keio-Tama-Center', ja: '京王多摩センター方面', color: '#e070b8',
        services: ['Ltd. Express', 'Express', 'Sub-Exp', 'Rapid'] },
      { until: '橋本', name: 'Hashimoto', ja: '橋本方面', color: '#dd44aa',
        services: ['Local', 'Ltd. Express', 'Express', 'Sub-Exp', 'Rapid'] },
    ],
    // 特急/急行 share the Sagamihara stops; 区間急行/快速 call everywhere past 調布
    // (快速 and most 区間急行 are Toei through trains — see Toei → Keio)
    express: [
      { name: 'Ltd. Express', ja: '特急', color: '#e83080', stops: [
        '新宿','笹塚','明大前','千歳烏山','調布','京王稲田堤','京王永山','京王多摩センター','南大沢','橋本'] },
      // 急行: weekday morning and evening peaks, Sat/hol mornings (ODPT 2026-08)
      { name: 'Express', ja: '急行', color: '#e83030', stops: [
        '新宿','笹塚','明大前','桜上水','千歳烏山','つつじヶ丘','調布','京王稲田堤','京王永山','京王多摩センター','南大沢','橋本'],
        schedule: { weekday: { timeRange: [[8, 10], [17, 21]] }, weekend: { timeRange: [7, 12] } } },
      // 区間急行 pass 笹塚 all day (from Toei); from 京王線新宿 only mornings and late night
      { name: 'Sub-Exp', ja: '区間急行', color: '#f0c000', stops: [
        '笹塚','明大前','桜上水','千歳烏山','仙川','つつじヶ丘','調布','京王多摩川','京王稲田堤','京王よみうりランド','稲城','若葉台','京王永山','京王多摩センター','京王堀之内','南大沢','多摩境','橋本'] },
      { name: 'Sub-Exp', ja: '区間急行', color: '#f0c000', stops: [
        '新宿','笹塚','明大前','桜上水','千歳烏山','仙川','つつじヶ丘','調布','京王多摩川','京王稲田堤','京王よみうりランド','稲城','若葉台','京王永山','京王多摩センター','京王堀之内','南大沢','多摩境','橋本'],
        schedule: { weekday: { timeRange: [[5, 9], [22, 1]] }, weekend: { timeRange: [[5, 9], [22, 1]] } } },
      // 快速: weekday daytime and late evening (Sat/hol all day; ODPT 2026-08)
      { name: 'Rapid', ja: '快速', color: '#00a0a0', stops: [
        '新宿','笹塚','明大前','下高井戸','桜上水','八幡山','千歳烏山','仙川','つつじヶ丘','調布','京王多摩川','京王稲田堤','京王よみうりランド','稲城','若葉台','京王永山','京王多摩センター','京王堀之内','南大沢','多摩境','橋本'],
        schedule: { weekday: { timeRange: [[10, 18], [23, 1]] } } },
    ] },
  // Toward Shinjuku: Keio Line to 京王新宿, or through to Toei Shinjuku via the
  // Keio New Line (Moto-Yawata: a chained mid-line hop, Keio Line → Toei at 笹塚)
  { from: 'Keio Sagamihara line', fromEnd: '調布',
    to:   'Keio Line',            toStation: '調布', toDir: 'start',
    // 快速 short turns at 若葉台 (depot) and 京王多摩センター (ODPT 2026-08)
    lineDests: [
      { until: '若葉台',           name: 'Wakabadai',        ja: '若葉台方面',           color: '#e070b8', services: ['Rapid'],
        schedule: { weekday: { timeRange: [[8, 9], [10, 11], [19, 1]] }, weekend: { timeRange: [[9, 10], [18, 19], [21, 1]] } } },
      { until: '京王多摩センター', name: 'Keio-Tama-Center', ja: '京王多摩センター方面', color: '#e070b8', services: ['Rapid'],
        schedule: { weekday: { timeRange: [[9, 16], [18, 19], [20, 21]] }, weekend: { timeRange: [[8, 9], [10, 17], [19, 22]] } } },
    ],
    destinations: [
      // 区間急行 from 橋本 ending one stop past 調布 in the evening (9 wd / 2 Sat/hol)
      { until: 'つつじヶ丘', name: 'Tsutsujigaoka', ja: 'つつじヶ丘方面', color: '#a060c0', services: ['Sub-Exp'],
        schedule: { weekday: { timeRange: [[17, 20], [23, 1]] }, weekend: { timeRange: [23, 1] } } },
      { until: '新宿', name: 'Shinjuku', ja: '新宿方面', color: '#800080' },
    ],
    express: [
      { stops: null, name: 'Local', ja: '各停' },
      { name: 'Ltd. Express', ja: '特急', color: '#e83080', stops: [
        '橋本','南大沢','京王多摩センター','京王永山','京王稲田堤','調布','千歳烏山','明大前','笹塚','新宿'] },
      // 急行: weekday 7h and 16–19h, Sat/hol 6h, 8–10h and 16h (ODPT 2026-08)
      { name: 'Express', ja: '急行', color: '#e83030', stops: [
        '橋本','南大沢','京王多摩センター','京王永山','京王稲田堤','調布','つつじヶ丘','千歳烏山','桜上水','明大前','笹塚','新宿'],
        schedule: { weekday: { timeRange: [[7, 8], [16, 20]] }, weekend: { timeRange: [[6, 7], [8, 11], [16, 17]] } } },
      { name: 'Sub-Exp', ja: '区間急行', color: '#f0c000', stops: [
        '橋本','多摩境','南大沢','京王堀之内','京王多摩センター','京王永山','若葉台','稲城','京王よみうりランド','京王稲田堤','京王多摩川','調布','つつじヶ丘','仙川','千歳烏山','桜上水','明大前','笹塚','新宿'] },
      { name: 'Rapid', ja: '快速', color: '#00a0a0', stops: [
        '橋本','多摩境','南大沢','京王堀之内','京王多摩センター','京王永山','若葉台','稲城','京王よみうりランド','京王稲田堤','京王多摩川','調布','つつじヶ丘','仙川','千歳烏山','八幡山','桜上水','下高井戸','明大前','笹塚','新宿'] },
    ] },

  // ── Keio ↔ Keio Takao at Kitano ─────────────────────────────────────
  // Since 2022 特急 run through to 高尾山口, calling at every Takao Line station.
  { from: 'Keio Line',       fromStation: '北野', fromDir: 'end',
    to:   'Keio Takao Line', toEnd: '北野',
    name: 'Takaosanguchi', ja: '高尾山口方面', color: '#3a8c3a',
    // 京王八王子 comes from LINE_DESTINATIONS["Keio Line"], which merges this one
    destinations: [
      { until: '高尾山口', name: 'Takaosanguchi', ja: '高尾山口方面', color: '#3a8c3a',
        services: ['Local', 'Ltd. Express'] },
    ],
    express: [
      { stops: null, name: 'Local', ja: '各停' },
      // 特急 to 高尾山口 by day on weekdays, all day Sat/hol (ODPT 2026-08)
      { name: 'Ltd. Express', ja: '特急', color: '#e83080', stops: [
        '新宿','笹塚','明大前','千歳烏山','調布','府中','分倍河原',
        '聖蹟桜ヶ丘','高幡不動','北野',
        '京王片倉','山田','めじろ台','狭間','高尾','高尾山口'],
        schedule: { weekday: { timeRange: [7, 17] } } },
    ] },
  // Takao Line trains end at Keio 新宿 (none runs on to Toei); 8 各停 a day turn at 高幡不動
  { from: 'Keio Takao Line', fromEnd: '北野',
    to:   'Keio Line',       toStation: '北野', toDir: 'start',
    destinations: [
      { until: '高幡不動', name: 'Takahatafudo', ja: '高幡不動方面', color: '#a060c0', services: ['Local'],
        schedule: { weekday: { timeRange: [[6, 7], [9, 11], [15, 17], [23, 24]] }, weekend: { timeRange: [[18, 20], [23, 24]] } } },
      { until: '新宿',     name: 'Shinjuku',     ja: '新宿方面',     color: '#800080' },
    ],
    express: [
      { stops: null, name: 'Local', ja: '各停' },
      { name: 'Ltd. Express', ja: '特急', color: '#e83080', stops: [
        '高尾山口','高尾','狭間','めじろ台','山田','京王片倉','北野',
        '高幡不動','聖蹟桜ヶ丘','分倍河原','府中','調布','千歳烏山',
        '明大前','笹塚','新宿'],
        schedule: { weekday: { timeRange: [5, 17] } } },
    ] },

  // ── Odakyu ↔ Odakyu Enoshima at Sagami-Ono ───────────────────────────
  // Sagami-Ono is mid-line on Odakyu (idx 27), start of Enoshima (idx 0)
  // (No 小田原-side → Enoshima connection: the junction faces 新宿, so trains from
  // the 小田原 side would have to reverse; at 相模大野 the Enoshima Line is its own platform)
  { from: 'Odakyu Line',          fromStation: '相模大野', fromDir: 'end',
    to:   'Odakyu Enoshima Line', toEnd: '相模大野',
    chainFrom: [], // Chiyoda through trains never run onto the Enoshima Line
    name: 'Fujisawa', ja: '藤沢方面', color: '#c86020',
    // (小田原 and the down short turns come from LINE_DESTINATIONS["Odakyu Line"], which merges this.)
    // Since 2022 快速急行/急行 terminate at 藤沢; 藤沢–片瀬江ノ島 is a local shuttle, and no
    // Odawara Line train runs to 片瀬江ノ島; the through 各停 start at 町田 (ODPT 2026-03)
    destinations: [
      { until: '藤沢', name: 'Fujisawa', ja: '藤沢方面', color: '#c86020',
        services: ['Local', 'Express', 'Rapid Exp'], localFrom: '町田' },
    ],
    express: [
      { name: 'Rapid Exp', ja: '快速急行', color: '#f07000', stops: [
        '新宿','代々木上原','下北沢','登戸','新百合ヶ丘','町田','相模大野',
        '中央林間','大和','湘南台','藤沢'] },
      // Early-morning 急行 only (ODPT 2026-03)
      { name: 'Express', ja: '急行', color: '#e83030', stops: [
        '新宿','代々木上原','下北沢','経堂','成城学園前','登戸','向ヶ丘遊園','新百合ヶ丘','町田','相模大野',
        '中央林間','南林間','大和','長後','湘南台','藤沢'],
        schedule: { weekday: { timeRange: [6, 9] }, weekend: { timeRange: [5, 8] } } },
    ] },
  // Toward 相模大野: the 各停 end at 相模大野 (or 町田, 9–10 a day); 急行 / 快速急行 run on to
  // 新宿; from the 片瀬江ノ島 end the shuttle 各停 turn at 藤沢 (ODPT 2026-03)
  { from: 'Odakyu Enoshima Line', fromEnd: '相模大野',
    to:   'Odakyu Line',          toStation: '相模大野', toDir: 'start',
    name: 'Shinjuku', ja: '新宿方面', color: '#0099DD',
    lineDests: [
      { until: '藤沢',     name: 'Fujisawa',   ja: '藤沢方面',     color: '#c86020',
        schedule: { weekday: { timeRange: [6, 1] }, weekend: { timeRange: [6, 1] } } },
      { until: '相模大野', name: 'Sagami-Ono', ja: '相模大野方面', color: '#2a80d0' },
    ],
    destinations: [
      { until: '町田', name: 'Machida',  ja: '町田方面', color: '#1a8fe8', services: ['Local'],
        schedule: { weekday: { timeRange: [[7, 10], [21, 1]] }, weekend: { timeRange: [[7, 11], [12, 15], [17, 19], [22, 1]] } } },
      { until: '新宿', name: 'Shinjuku', ja: '新宿方面', color: '#0099DD', services: ['Express', 'Rapid Exp'] },
    ],
    express: [
      // the through 各停 are the 町田 ones
      { stops: null, name: 'Local', ja: '各停',
        schedule: { weekday: { timeRange: [[7, 10], [21, 1]] }, weekend: { timeRange: [[7, 11], [12, 15], [17, 19], [22, 1]] } } },
      { name: 'Rapid Exp', ja: '快速急行', color: '#f07000', stops: [
        '藤沢','湘南台','大和','中央林間',
        '相模大野','町田','新百合ヶ丘','登戸','下北沢','代々木上原','新宿'] },
      { name: 'Express', ja: '急行', color: '#e83030', stops: [
        '藤沢','湘南台','長後','大和','南林間','中央林間',
        '相模大野','町田','新百合ヶ丘','向ヶ丘遊園','登戸','成城学園前','経堂','下北沢','代々木上原','新宿'],
        schedule: { weekday: { timeRange: [[5, 10], [21, 24]] }, weekend: { timeRange: [[5, 6], [20, 24]] } } },
    ] },

  // ── Odakyu ↔ Odakyu Tama at Shin-Yurigaoka ───────────────────────────
  // Shin-Yurigaoka is mid-line on Odakyu (idx 22), start of Tama (idx 0)
  // (No 小田原-side → Tama connection: the junction faces 新宿; at 新百合ヶ丘 the Tama
  // Line is its own platform)
  { from: 'Odakyu Line',      fromStation: '新百合ヶ丘', fromDir: 'end',
    to:   'Odakyu Tama Line', toEnd: '新百合ヶ丘',
    name: 'Karakida', ja: '唐木田方面', color: '#1a8fe8',
    // (小田原 and the down short turns come from LINE_DESTINATIONS["Odakyu Line"], which merges this)
    destinations: [
      { until: '唐木田', name: 'Karakida', ja: '唐木田方面', color: '#1a8fe8',
        services: ['Local', 'Express', 'Rapid Exp'] },
    ],
    express: [
      { name: 'Express', ja: '急行', color: '#e83030', stops: [
        '新宿','代々木上原','下北沢','経堂','成城学園前','登戸','向ヶ丘遊園','新百合ヶ丘','五月台','栗平','黒川','はるひ野','小田急永山','小田急多摩センター','唐木田'] },
      // 5 weekday 快速急行 (morning rush, 22h) pass 五月台 / 黒川 / はるひ野 (ODPT 2026-03)
      { name: 'Rapid Exp', ja: '快速急行', color: '#f07000', stops: [
        '新宿','代々木上原','下北沢','登戸','新百合ヶ丘','栗平','小田急永山','小田急多摩センター','唐木田'],
        schedule: { weekend: { stops: [] }, weekday: { timeRange: [[7, 9], [22, 23]] } } },
    ] },
  // Toward 新百合ヶ丘: 各停 end there (41–49 a day; 3 early ones run on to 新宿), 急行 run on to
  // 新宿 or, by day, to 我孫子 over the Chiyoda Line (chained) (ODPT 2026-03)
  { from: 'Odakyu Tama Line', fromEnd: '新百合ヶ丘',
    to:   'Odakyu Line',      toStation: '新百合ヶ丘', toDir: 'start',
    name: 'Shinjuku', ja: '新宿方面', color: '#0099DD',
    lineDests: [
      { until: '新百合ヶ丘', name: 'Shin-Yurigaoka', ja: '新百合ヶ丘方面', color: '#1a8fe8',
        schedule: { weekday: { timeRange: [[5, 11], [16, 1]] }, weekend: { timeRange: [[5, 12], [16, 1]] } } },
    ],
    destinations: [
      { until: '新宿', name: 'Shinjuku', ja: '新宿方面', color: '#0099DD' },
    ],
    express: [
      { stops: null, name: 'Local', ja: '各停',
        schedule: { weekday: { timeRange: [4, 7] }, weekend: { timeRange: [[4, 7], [11, 12]] } } },
      { name: 'Express', ja: '急行', color: '#e83030', stops: [
        '唐木田','小田急多摩センター','小田急永山','はるひ野','黒川','栗平','五月台','新百合ヶ丘','向ヶ丘遊園','登戸','成城学園前','経堂','下北沢','代々木上原','新宿'] },
      // Weekday mornings: passes 五月台 / 黒川 / はるひ野, 登戸 and 経堂
      { name: 'Commuter Exp', ja: '通勤急行', color: '#e8508a', stops: [
        '唐木田','小田急多摩センター','小田急永山','栗平','新百合ヶ丘','向ヶ丘遊園','成城学園前','下北沢','代々木上原','新宿'],
        schedule: { weekend: { stops: [] }, weekday: { timeRange: [6, 9] } } },
      // Two Sat/hol 快速急行 at 6h
      { name: 'Rapid Exp', ja: '快速急行', color: '#f07000', stops: [
        '唐木田','小田急多摩センター','小田急永山','栗平','新百合ヶ丘','登戸','下北沢','代々木上原','新宿'],
        schedule: { weekday: { stops: [] }, weekend: { timeRange: [6, 7] } } },
    ] },

  // ── Musashino ↔ Keiyo at Nishi-Funabashi ──────────────────────────────
  // Musashino trains continue onto the Keiyo Line over the two freight legs:
  // toward Tokyo via Ichikawa-Shiohama, toward Kaihin-Makuhari via
  // Minami-Funabashi. Junction stations aren't on the source line → in via.
  // Evening and late trains from 府中本町 end at 東所沢 (ODPT 2026-03)
  { from: 'JR Musashino Line', fromEnd: '西船橋',
    to:   'JR Keiyo Line',     toStation: '市川塩浜', toDir: 'start',
    via:  ['市川塩浜'],
    name: 'Tokyo', ja: '東京方面', color: '#DC143C',
    lineDests: [
      { until: '東所沢', name: 'Higashi-Tokorozawa', ja: '東所沢方面', color: '#F77321',
        schedule: { weekday: { timeRange: [19, 1] }, weekend: { timeRange: [18, 24] } } },
      { until: '西船橋', name: 'Nishi-Funabashi', ja: '西船橋方面', color: '#F77321' },
    ],
    destinations: [
      { until: '東京', name: 'Tokyo', ja: '東京方面', color: '#DC143C' },
    ],
    express: [{ stops: null, name: 'Local', ja: '各停' }] }, // Musashino trains: local on the Keiyo Line
  { from: 'JR Musashino Line', fromEnd: '西船橋',
    to:   'JR Keiyo Line',     toStation: '南船橋', toDir: 'end',
    toUntil: '海浜幕張',
    via:  ['南船橋'],
    name: 'Kaihin-Makuhari', ja: '海浜幕張方面', color: '#DC143C',
    lineDests: [
      { until: '西船橋', name: 'Nishi-Funabashi', ja: '西船橋方面', color: '#F77321' },
    ],
    // Daytime trains end at 南船橋; 新習志野 / 海浜幕張 mostly at rush hours and late
    // (hours over the whole line, ODPT 2026-03)
    destinations: [
      { until: '南船橋', name: 'Minami-Funabashi', ja: '南船橋方面', color: '#E8606A',
        schedule: { weekday: { timeRange: [[4, 7], [8, 24]] } } },
      { until: '新習志野', name: 'Shin-Narashino', ja: '新習志野方面', color: '#B01030',
        schedule: { weekday: { timeRange: [[7, 11], [20, 1]] }, weekend: { timeRange: [[17, 19], [21, 1]] } } },
      { until: '海浜幕張', name: 'Kaihin-Makuhari', ja: '海浜幕張方面', color: '#DC143C',
        schedule: { weekday: { timeRange: [[5, 11], [14, 22]] }, weekend: { timeRange: [[5, 11], [15, 21]] } } },
    ],
    express: [{ stops: null, name: 'Local', ja: '各停' }] },
  // Reverse: Keiyo riders branch onto the Musashino Line at both junctions. A few trains a
  // day end at 西船橋 or 東所沢 (mornings, evenings, late) (ODPT 2026-03). The explicit Local
  // keeps the Keiyo 各停 from being read as the しもうさ号 (which ODPT also types 普通).
  { from: 'JR Keiyo Line',     fromStation: '市川塩浜', fromDir: 'end',
    to:   'JR Musashino Line', toEnd: '西船橋',
    via:  ['西船橋'],
    boardAtJunction: true, // Tokyo → Musashino trains call at 市川塩浜
    name: 'Fuchu-Hommachi', ja: '府中本町方面', color: '#F77321',
    lineDests: [
      { until: '蘇我', name: 'Soga', ja: '蘇我方面', color: '#DC143C' },
    ],
    destinations: [
      { until: '西船橋',   name: 'Nishi-Funabashi',    ja: '西船橋方面',   color: '#F77321', services: ['Local'],
        schedule: { weekday: { timeRange: [[6, 9], [18, 20], [21, 22]] }, weekend: { timeRange: [[6, 9], [18, 20], [21, 22]] } } },
      { until: '東所沢',   name: 'Higashi-Tokorozawa', ja: '東所沢方面',   color: '#F77321', services: ['Local'],
        schedule: { weekday: { timeRange: [[7, 10], [22, 24]] }, weekend: { timeRange: [[7, 9], [22, 24]] } } },
      { until: '府中本町', name: 'Fuchu-Hommachi',     ja: '府中本町方面', color: '#F77321',
        services: ['Local'] }, // Keiyo 快速 never run onto the Musashino Line
    ],
    express: [{ stops: null, name: 'Local', ja: '各停' }] },
  { from: 'JR Keiyo Line',     fromStation: '南船橋', fromDir: 'start',
    to:   'JR Musashino Line', toEnd: '西船橋',
    via:  ['西船橋'],
    boardAtJunction: true, // 南船橋/海浜幕張 → Musashino trains start or call here
    boardFrom: '海浜幕張', // southernmost Musashino start
    name: 'Fuchu-Hommachi', ja: '府中本町方面', color: '#F77321',
    lineDests: [
      { until: '東京', name: 'Tokyo', ja: '東京方面', color: '#DC143C' },
    ],
    destinations: [
      { until: '西船橋',   name: 'Nishi-Funabashi',    ja: '西船橋方面',   color: '#F77321', services: ['Local'],
        schedule: { weekday: { timeRange: [[7, 8], [9, 10], [17, 19], [20, 23]] }, weekend: { timeRange: [[7, 8], [9, 10], [17, 19], [20, 23]] } } },
      { until: '東所沢',   name: 'Higashi-Tokorozawa', ja: '東所沢方面',   color: '#F77321', services: ['Local'],
        schedule: { weekday: { timeRange: [[7, 10], [20, 21]] }, weekend: { timeRange: [8, 10] } } },
      { until: '府中本町', name: 'Fuchu-Hommachi',     ja: '府中本町方面', color: '#F77321',
        services: ['Local'], // Keiyo 快速 never run onto the Musashino Line
        // Daytime trains start at 南船橋 (all day on weekdays, mornings and evenings on
        // weekends); from 新習志野 / 海浜幕張 only mornings and evenings (ODPT 2026-03)
        schedule: { weekend: { timeRange: [[5, 10], [16, 21]] } },
        boardSchedule: {
          '新習志野': { weekday: { timeRange: [[5, 10], [15, 23]] }, weekend: { timeRange: [[5, 10], [16, 21]] } },
          '幕張豊砂': { weekday: { timeRange: [[7, 10], [16, 23]] }, weekend: { timeRange: [[7, 10], [16, 21]] } },
          '海浜幕張': { weekday: { timeRange: [[6, 10], [16, 22]] }, weekend: { timeRange: [[6, 10], [16, 21]] } },
        } },
    ],
    express: [{ stops: null, name: 'Local', ja: '各停', schedule: { weekend: { timeRange: [[5, 10], [16, 22]] } } }] },

  // ── むさしの号 / しもうさ号 (named 普通 over the Musashino freight curves) ──
  // むさしの号: 八王子/府中本町 ↔ 大宮 over the 国立支線 (国立–新小平, no stations) and the
  // 大宮支線 (passes 西浦和 on the outer tracks; no stop at 西浦和, 与野, さいたま新都心).
  // しもうさ号: 大宮 ↔ 西船橋 / 新習志野 / 海浜幕張 over the 西浦和支線 (武蔵浦和 side).
  // 大宮 departures leave from 3番線 (the Utsunomiya Line's up side; Takasaki shares the
  // dice slot, so both carry them); arrivals end at 11番線, so rides to 大宮 land on the
  // Shonan-Shinjuku Line's 大宮 (its terminus: arriving closes no other platform).
  // Stop lists name source/target-line stations only (via stations are always stops).
  // chainFrom: [] keeps them out of other lines' chained pickers (Keiyo → Musashino → 武蔵浦和,
  // Ome → Chuo → 国立). Hours: JR East timetable 2026-10 (timetables.jreast.co.jp/2610).

  // 八王子 → 大宮 (八王子 wd 16:55, 18:48; we 7:21, 9:50, 16:56, 17:47)
  { from: 'JR Chuo Line', fromStation: '国立', fromDir: 'start',
    to:   'JR Shonan Shinjuku Line', toEnd: '大宮',
    via:  ['新小平', '新秋津', '東所沢', '新座', '北朝霞', '大宮'],
    toUntil: '大宮',
    boardAtJunction: true, // the train calls at 国立, then takes the 国立支線
    boardFrom: '八王子',
    impliedLines: ['JR Musashino Line'],
    chainFrom: [],
    name: 'Omiya', ja: '大宮方面', color: '#F77321',
    lineDests: [
      { until: '東京', name: 'Tokyo', ja: '東京方面', color: '#F15A22' },
    ],
    destinations: [
      { until: '大宮', name: 'Omiya', ja: '大宮方面', color: '#F77321', services: ['Musashino'],
        schedule: { weekday: { timeRange: [16, 20] }, weekend: { timeRange: [[7, 8], [9, 11], [16, 19]] } },
        boardSchedule: {
          '八王子': { weekday: { timeRange: [[16, 17], [18, 19]] }, weekend: { timeRange: [[7, 8], [9, 10], [16, 18]] } },
          '豊田':   { weekday: { timeRange: [17, 19] },             weekend: { timeRange: [[7, 8], [9, 10], [17, 18]] } },
          '日野':   { weekday: { timeRange: [17, 19] },             weekend: { timeRange: [[7, 8], [9, 10], [17, 18]] } },
          '立川':   { weekday: { timeRange: [[17, 18], [19, 20]] }, weekend: { timeRange: [[7, 8], [10, 11], [17, 18]] } },
          '国立':   { weekday: { timeRange: [[17, 18], [19, 20]] }, weekend: { timeRange: [[7, 8], [10, 11], [17, 19]] } },
        } },
    ],
    express: [
      { name: 'Musashino', ja: 'むさしの号', color: '#F77321',
        stops: ['八王子', '豊田', '日野', '立川', '国立', '大宮'],
        schedule: { weekday: { timeRange: [16, 20] }, weekend: { timeRange: [[7, 8], [9, 11], [16, 19]] } } },
    ] },

  // 府中本町 / 新小平… → 大宮 (府中本町 wd 7:35, 8:08, we 8:26; the 八王子 trains join at 新小平)
  { from: 'JR Musashino Line', fromStation: '北朝霞', fromDir: 'end',
    to:   'JR Shonan Shinjuku Line', toEnd: '大宮',
    via:  ['大宮'],
    toUntil: '大宮',
    boardAtJunction: true, // calls at 北朝霞, then the 大宮支線 (passing 西浦和)
    chainFrom: [],
    name: 'Omiya', ja: '大宮方面', color: '#F77321',
    destinations: [
      { until: '大宮', name: 'Omiya', ja: '大宮方面', color: '#F77321', services: ['Musashino'],
        schedule: { weekday: { timeRange: [[7, 9], [17, 18], [19, 20]] }, weekend: { timeRange: [[7, 9], [10, 11], [17, 19]] } },
        boardSchedule: {
          '府中本町': { weekday: { timeRange: [7, 9] }, weekend: { timeRange: [8, 9] } },
          '北府中':   { weekday: { timeRange: [7, 9] }, weekend: { timeRange: [8, 9] } },
          '西国分寺': { weekday: { timeRange: [7, 9] }, weekend: { timeRange: [8, 9] } },
          '北朝霞':   { weekday: { timeRange: [[8, 9], [17, 18], [19, 20]] }, weekend: { timeRange: [[8, 9], [10, 11], [17, 19]] } },
        } },
    ],
    express: [
      { stops: null, name: 'Local', ja: '各停' }, // the Musashino Line has no types: two-typed so services pick the named one
      { name: 'Musashino', ja: 'むさしの号', color: '#F77321',
        stops: ['府中本町', '北府中', '西国分寺', '新小平', '新秋津', '東所沢', '新座', '北朝霞', '大宮'],
        schedule: { weekday: { timeRange: [[7, 9], [17, 18], [19, 20]] }, weekend: { timeRange: [[7, 9], [10, 11], [17, 19]] } } },
    ] },

  // 北朝霞… → 八王子 (北朝霞 wd 9:04, 19:08, 20:44; we 9:08, 18:34, 20:04; 新小平 +16–18 min)
  { from: 'JR Musashino Line', fromStation: '新小平', fromDir: 'start',
    to:   'JR Chuo Line', toStation: '国立', toDir: 'end',
    via:  ['国立'],
    toUntil: '八王子',
    boardAtJunction: true, // calls at 新小平, then the 国立支線
    boardFrom: '北朝霞',
    chainFrom: [],
    name: 'Hachioji', ja: '八王子方面', color: '#F15A22',
    lineDests: [
      { until: '府中本町', name: 'Fuchu-Hommachi', ja: '府中本町方面', color: '#F77321' },
    ],
    destinations: [
      { until: '八王子', name: 'Hachioji', ja: '八王子方面', color: '#F15A22', services: ['Musashino'],
        schedule: { weekday: { timeRange: [[9, 10], [19, 22]] }, weekend: { timeRange: [[9, 10], [18, 19], [20, 21]] } },
        boardSchedule: {
          '北朝霞': { weekday: { timeRange: [[9, 10], [19, 21]] } },
          '新座':   { weekday: { timeRange: [[9, 10], [19, 21]] } },
          '東所沢': { weekday: { timeRange: [[9, 10], [19, 21]] } },
          '新秋津': { weekday: { timeRange: [[9, 10], [19, 21]] } },
          '新小平': { weekday: { timeRange: [[9, 10], [19, 20], [21, 22]] } },
        } },
    ],
    express: [
      { stops: null, name: 'Local', ja: '各停' }, // the Musashino Line has no types: two-typed so services pick the named one
      { name: 'Musashino', ja: 'むさしの号', color: '#F77321',
        stops: ['北朝霞', '新座', '東所沢', '新秋津', '新小平', '国立', '立川', '日野', '豊田', '八王子'],
        schedule: { weekday: { timeRange: [[9, 10], [19, 22]] }, weekend: { timeRange: [[9, 10], [18, 19], [20, 21]] } } },
    ] },

  // 西船橋… → 大宮 (西船橋 wd 7:22, 16:03, 19:36; we 6:28, 16:12, 19:20; 武蔵浦和 +47–50 min)
  { from: 'JR Musashino Line', fromStation: '武蔵浦和', fromDir: 'start',
    to:   'JR Shonan Shinjuku Line', toEnd: '大宮',
    via:  ['大宮'],
    toUntil: '大宮',
    boardAtJunction: true, // calls at 武蔵浦和, then the 西浦和支線 / 大宮支線
    chainFrom: [],
    name: 'Omiya', ja: '大宮方面', color: '#F77321',
    lineDests: [
      { until: '府中本町', name: 'Fuchu-Hommachi', ja: '府中本町方面', color: '#F77321' },
    ],
    destinations: [
      { until: '大宮', name: 'Omiya', ja: '大宮方面', color: '#E9003F', services: ['Shimousa'],
        schedule: { weekday: { timeRange: [[7, 9], [16, 17], [19, 21]] }, weekend: { timeRange: [[6, 8], [16, 17], [19, 21]] } },
        // The hour each stretch sees the train (wd, we)
        boardSchedule: Object.fromEntries([
          [['西船橋', '船橋法典', '市川大野', '東松戸', '新八柱', '新松戸', '南流山', '三郷', '新三郷'],
            [[7, 8], [16, 17], [19, 20]], [[6, 7], [16, 17], [19, 20]]],
          [['吉川美南', '吉川', '越谷レイクタウン'], [[7, 8], [16, 17], [20, 21]], [[6, 7], [16, 17], [19, 20]]],
          [['南越谷'],                         [[7, 8], [16, 17], [20, 21]], [[7, 8], [16, 17], [19, 20]]],
          [['東川口'],                         [[8, 9], [16, 17], [20, 21]], [[7, 8], [16, 17], [19, 20]]],
          [['東浦和', '南浦和', '武蔵浦和'],   [[8, 9], [16, 17], [20, 21]], [[7, 8], [16, 17], [20, 21]]],
        ].flatMap(([stns, wd, we]) => stns.map(s => [s, { weekday: { timeRange: wd }, weekend: { timeRange: we } }]))) },
    ],
    express: [
      // the Musashino Line has no types: two-typed so services pick the named one (same hours)
      { stops: null, name: 'Local', ja: '各停',
        schedule: { weekday: { timeRange: [[7, 9], [16, 17], [19, 21]] }, weekend: { timeRange: [[6, 8], [16, 17], [19, 21]] } } },
      { name: 'Shimousa', ja: 'しもうさ号', color: '#F77321',
        stops: ['西船橋', '船橋法典', '市川大野', '東松戸', '新八柱', '新松戸', '南流山', '三郷', '新三郷', '吉川美南',
                '吉川', '越谷レイクタウン', '南越谷', '東川口', '東浦和', '南浦和', '武蔵浦和', '大宮'],
        schedule: { weekday: { timeRange: [[7, 9], [16, 17], [19, 21]] }, weekend: { timeRange: [[6, 8], [16, 17], [19, 21]] } } },
    ] },

  // 新習志野 / 南船橋 → 大宮 (新習志野 wd 7:12, 15:54; we 6:19, 16:01; 南船橋 +3 min)
  { from: 'JR Keiyo Line', fromStation: '南船橋', fromDir: 'start',
    to:   'JR Shonan Shinjuku Line', toEnd: '大宮',
    via:  ['西船橋', '船橋法典', '市川大野', '東松戸', '新八柱', '新松戸', '南流山', '三郷', '新三郷', '吉川美南',
           '吉川', '越谷レイクタウン', '南越谷', '東川口', '東浦和', '南浦和', '武蔵浦和', '大宮'],
    toUntil: '大宮',
    boardAtJunction: true, // calls at 南船橋, then the freight leg to 西船橋
    boardFrom: '新習志野',
    impliedLines: ['JR Musashino Line'],
    chainFrom: [],
    name: 'Omiya', ja: '大宮方面', color: '#F77321',
    destinations: [
      { until: '大宮', name: 'Omiya', ja: '大宮方面', color: '#E9003F', services: ['Shimousa'],
        schedule: { weekday: { timeRange: [[7, 8], [15, 16]] }, weekend: { timeRange: [[6, 7], [16, 17]] } } },
    ],
    express: [
      { name: 'Shimousa', ja: 'しもうさ号', color: '#F77321',
        stops: ['新習志野', '南船橋', '大宮'],
        schedule: { weekday: { timeRange: [[7, 8], [15, 16]] }, weekend: { timeRange: [[6, 7], [16, 17]] } } },
    ] },

  // 大宮 departures (3番線): one copy per line of the shared 宇都宮線 / 高崎線 up slot
  ...['Utsunomiya Line', 'JR Takasaki Line'].flatMap(from => [
    // むさしの号 → 八王子 (wd 8:49, 18:47, 20:31; we 8:53, 18:22, 19:52)
    { from, fromStation: '大宮', fromDir: 'start',
      to:   'JR Chuo Line', toStation: '国立', toDir: 'end',
      via:  ['北朝霞', '新座', '東所沢', '新秋津', '新小平', '国立'],
      toUntil: '八王子',
      boardAtJunction: true, boardFrom: '大宮', // starts here only
      displayName: 'Ueno Tokyo Line', // 3番線 keeps its Ueno Tokyo Line pill
      impliedLines: ['JR Musashino Line'],
      chainFrom: [],
      name: 'Hachioji', ja: '八王子方面', color: '#F15A22',
      destinations: [
        { until: '八王子', name: 'Hachioji', ja: '八王子方面', color: '#F15A22', services: ['Musashino'],
          schedule: { weekday: { timeRange: [[8, 9], [18, 19], [20, 21]] }, weekend: { timeRange: [[8, 9], [18, 20]] } } },
      ],
      express: [
        { name: 'Musashino', ja: 'むさしの号', color: '#F77321',
          stops: ['大宮', '国立', '立川', '日野', '豊田', '八王子'],
          schedule: { weekday: { timeRange: [[8, 9], [18, 19], [20, 21]] }, weekend: { timeRange: [[8, 9], [18, 20]] } } },
      ] },
    // しもうさ号 → 西船橋 (wd 18:26, we 18:01)
    { from, fromStation: '大宮', fromDir: 'start',
      to:   'JR Musashino Line', toStation: '武蔵浦和', toDir: 'end',
      via:  ['武蔵浦和'],
      toUntil: '西船橋',
      boardAtJunction: true, boardFrom: '大宮',
      displayName: 'Ueno Tokyo Line',
      chainFrom: [],
      name: 'Nishi-Funabashi', ja: '西船橋方面', color: '#F77321',
      destinations: [
        { until: '西船橋', name: 'Nishi-Funabashi', ja: '西船橋方面', color: '#F77321', services: ['Shimousa'],
          schedule: { weekday: { timeRange: [18, 19] }, weekend: { timeRange: [18, 19] } } },
      ],
      // (window as wide as every しもうさ号 on the Musashino side, which the checker lumps together;
      // the 西船橋 destination's own hour gates the picker)
      express: [
        { name: 'Shimousa', ja: 'しもうさ号', color: '#F77321',
          stops: ['大宮', '武蔵浦和', '南浦和', '東浦和', '東川口', '南越谷', '越谷レイクタウン', '吉川', '吉川美南',
                  '新三郷', '三郷', '南流山', '新松戸', '新八柱', '東松戸', '市川大野', '船橋法典', '西船橋'],
          schedule: { weekday: { timeRange: [[9, 11], [18, 20], [21, 22]] }, weekend: { timeRange: [[9, 11], [18, 19], [21, 22]] } } },
      ] },
    // しもうさ号 → 海浜幕張 (wd 9:30, we 9:13) / 新習志野 (20:56 both)
    { from, fromStation: '大宮', fromDir: 'start',
      to:   'JR Keiyo Line', toStation: '南船橋', toDir: 'end',
      via:  ['武蔵浦和', '南浦和', '東浦和', '東川口', '南越谷', '越谷レイクタウン', '吉川', '吉川美南', '新三郷',
             '三郷', '南流山', '新松戸', '新八柱', '東松戸', '市川大野', '船橋法典', '西船橋', '南船橋'],
      toUntil: '海浜幕張',
      boardAtJunction: true, boardFrom: '大宮',
      displayName: 'Ueno Tokyo Line',
      impliedLines: ['JR Musashino Line'],
      chainFrom: [],
      name: 'Kaihin-Makuhari', ja: '海浜幕張方面', color: '#DC143C',
      destinations: [
        { until: '新習志野', name: 'Shin-Narashino', ja: '新習志野方面', color: '#B01030', services: ['Shimousa'],
          schedule: { weekday: { timeRange: [20, 21] }, weekend: { timeRange: [20, 21] } } },
        { until: '海浜幕張', name: 'Kaihin-Makuhari', ja: '海浜幕張方面', color: '#DC143C', services: ['Shimousa'],
          schedule: { weekday: { timeRange: [9, 10] }, weekend: { timeRange: [9, 10] } } },
      ],
      express: [
        { name: 'Shimousa', ja: 'しもうさ号', color: '#F77321',
          stops: ['大宮', '南船橋', '新習志野', '幕張豊砂', '海浜幕張'],
          schedule: { weekday: { timeRange: [[9, 10], [20, 21]] }, weekend: { timeRange: [[9, 10], [20, 21]] } } },
      ] },
  ]),

  // ── Yokohama Line ↔ Negishi Line at Higashi-Kanagawa/Yokohama ────────
  // Through-running: Yokohama Line trains continue from Higashi-Kanagawa
  // via Yokohama onto the Negishi Line toward Sakuragicho/Isogo/Ofuna.
  // lineDests = within-line short-turn destinations (Hashimoto, Machida, H-Kanagawa)
  // Rapid only runs on Sakuragicho-bound through-running trains.
  { from: 'JR Yokohama Line', fromEnd: '東神奈川',
    to:   'JR Negishi Line',  toEnd:   '横浜',
    via:  ['横浜'],
    impliedLines: ['JR Keihin Tohoku Line'], // 東神奈川–横浜 on Keihin-Tohoku track
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
        stops: ['東神奈川','菊名','新横浜','鴨居','中山',
                '長津田','町田','相模原','橋本',
                '相原','八王子みなみ野','片倉','八王子',
                '横浜','桜木町'],
        schedule: { weekday: { timeRange: [9, 16] }, weekend: { timeRange: [8, 19] } } },
    ] },
  // 10 a day end at 橋本 (mornings and evenings, 各停) (ODPT 2026-03)
  { from: 'JR Negishi Line',  fromEnd: '横浜',
    to:   'JR Yokohama Line', toEnd:   '東神奈川',
    via:  ['東神奈川'],
    impliedLines: ['JR Keihin Tohoku Line'],
    name: 'Hachioji', ja: '八王子方面', color: '#00AD53',
    lineDests: [
      { until: '横浜', name: 'Yokohama', ja: '横浜方面', color: '#d477d1' },
    ],
    destinations: [
      { until: '橋本',   name: 'Hashimoto', ja: '橋本方面',   color: '#6aba6a', services: ['Local'],
        schedule: { weekday: { timeRange: [[8, 10], [18, 21]] }, weekend: { timeRange: [[6, 7], [17, 19]] } } },
      { until: '八王子', name: 'Hachioji',  ja: '八王子方面', color: '#00AD53' },
    ],
    // Daytime 快速 start at 桜木町 (all stations on the Negishi Line)
    express: [
      { name: 'Local', ja: '各停', color: '#00a0e8', stops: null },
      { name: 'Rapid', ja: '快速', color: '#00b900',
        stops: ['桜木町','横浜','東神奈川','菊名','新横浜','鴨居','中山',
                '長津田','町田','相模原','橋本',
                '相原','八王子みなみ野','片倉','八王子'],
        schedule: { weekday: { timeRange: [9, 16] }, weekend: { timeRange: [9, 18] } } },
    ] },

  // ── Narita Line → airport branch at Narita ───────────────────────────
  // Rapids from Sakura (through trains from the Sobu Line) run on to Narita
  // Airport; others end at Narita or continue toward Choshi.
  { from: 'JR Narita Line', fromStation: '成田', fromDir: 'end',
    to:   'JR Narita Line (Airport)', toEnd: '成田',
    lineDests: [
      { until: '成田', name: 'Narita', ja: '成田方面', color: '#00b261' },
      { until: '銚子', name: 'Choshi', ja: '銚子方面', color: '#008c4a' },
    ],
    destinations: [
      { until: '成田空港（第１旅客ターミナル）', name: 'Narita Airport', ja: '成田空港方面', color: '#1a6fc4' },
    ] },
  // ...and back: a quarter of the airport trains run on past 成田 (快速 to 東京 and the Yokosuka
  // Line, 普通 to 千葉): no destination of their own on the Narita Line, all chained (ODPT 2026-03)
  { from: 'JR Narita Line (Airport)', fromEnd: '成田',
    to:   'JR Narita Line',           toStation: '成田', toDir: 'start',
    lineDests: [
      { until: '成田', name: 'Narita', ja: '成田方面', color: '#1a6fc4' },
    ],
    destinations: [],
    express: [
      { stops: null, name: 'Local', ja: '普通',
        schedule: { weekday: { timeRange: [[8, 9], [12, 13], [14, 15], [16, 18], [21, 22]] }, weekend: { timeRange: [[8, 9], [12, 13], [14, 15], [16, 18], [21, 22]] } } },
      { name: 'Rapid', ja: '快速', color: '#00b900', stops: ['成田空港（第１旅客ターミナル）', '空港第２ビル（第２旅客ターミナル）', '成田', '酒々井', '佐倉'] },
    ] },

  // ── Shibayama Railway ↔ Keisei Higashi-Narita Line at Higashi-Narita ──
  // All-day through service Shibayama-Chiyoda ↔ Keisei-Narita. toUntil keeps the
  // shuttle from chaining onto the Main Line (its through trains are below).
  { from: 'Shibayama Railway Line',     fromEnd: '東成田',
    to:   'Keisei Higashi-Narita Line', toEnd:   '東成田',
    toUntil: '京成成田',
    name: 'Keisei Narita', ja: '京成成田方面', color: '#8B6DAF' },
  { from: 'Keisei Higashi-Narita Line', fromEnd: '東成田',
    to:   'Shibayama Railway Line',     toEnd:   '東成田' },

  // ── Keisei Main ↔ Shibayama-Chiyoda through trains (mornings and evenings) ──
  // Main Line trains of every type run on over the Higashi-Narita Line (all stations)
  // to 芝山千代田; by day it is a 京成成田 shuttle. Hours span origin to 京成成田. Yahoo
  // 22413/6791 (東成田 down) and 29437/6790 (芝山千代田 up), train pages, Oct 2026.
  // Down: 京成上野 locals 6–7h and 17–18h (+ 宗吾参道 6–7h), 快速 6:28 and after 21h,
  // weekday 快特 16:54 / 特急 17:12, weekend 快速 18–20h, 快特 17:25 / 19:46, 特急 21:34.
  // Each type has two entries: hours leaving 京成上野–青砥, and hours past 京成高砂, which
  // add the trains from 西馬込 / 羽田 via 押上 (wd 特急 ×2, 快特 ×2; we 快速 ×1).
  { from: 'Keisei Main Line',       fromStation: '京成成田', fromDir: 'end',
    to:   'Shibayama Railway Line', toEnd: '東成田',
    via:  ['東成田'],
    impliedLines: ['Keisei Higashi-Narita Line'],
    chainFrom: [],
    name: 'Shibayama-Chiyoda', ja: '芝山千代田方面', color: '#8B6DAF',
    lineDests: [
      { until: '成田空港（第１旅客ターミナル）', name: 'Narita Airport', ja: '成田空港方面', color: '#003878' },
    ],
    destinations: [
      { until: '芝山千代田', name: 'Shibayama-Chiyoda', ja: '芝山千代田方面', color: '#8B6DAF',
        services: ['Local', 'Rapid', 'Ltd. Express', 'Rapid Ltd'],
        schedule: { weekday: { timeRange: [[5, 9], [16, 24]] }, weekend: { timeRange: [[5, 9], [17, 23]] } },
        // Hours the through trains pass each stretch (wd, we); 酒々井–公津の杜: the schedule above
        boardSchedule: Object.fromEntries([
          [['京成上野', '日暮里', '新三河島', '町屋', '千住大橋', '京成関屋', '堀切菖蒲園'],
            [[6, 7], [16, 19], [21, 22]], [[6, 8], [17, 22]]],
          [['お花茶屋', '青砥', '京成高砂', '京成小岩', '江戸川', '国府台', '市川真間', '菅野', '京成八幡', '鬼越'],
            [[6, 8], [17, 23]], [[6, 8], [17, 23]]],
          [['京成中山', '東中山', '京成西船', '海神', '京成船橋', '大神宮下', '船橋競馬場', '谷津', '京成津田沼',
            '京成大久保', '実籾', '八千代台', '京成大和田', '勝田台', '志津', 'ユーカリが丘', '京成臼井', '京成佐倉', '大佐倉'],
            [[5, 6], [7, 9], [17, 23]], [[5, 6], [7, 9], [17, 23]]],
        ].flatMap(([stns, wd, we]) => stns.map(s => [s, { weekday: { timeRange: wd }, weekend: { timeRange: we } }]))) },
    ],
    express: [
      { stops: null, name: 'Local', ja: '各停', color: '#00a0e8',
        schedule: { weekday: { timeRange: [[5, 9], [17, 21]] }, weekend: { timeRange: [[5, 9], [20, 23]] } } },
      { name: 'Rapid', ja: '快速', color: '#00b900',
        stops: ['京成上野','日暮里','千住大橋','青砥','京成高砂','京成小岩','京成八幡','東中山',
                '京成船橋','船橋競馬場','京成津田沼','京成大久保','実籾','八千代台','京成大和田',
                '勝田台','志津','ユーカリが丘','京成臼井','京成佐倉','大佐倉','京成酒々井',
                '宗吾参道','公津の杜','京成成田','芝山千代田'],
        schedule: { weekday: { timeRange: [[6, 7], [21, 22]] }, weekend: { timeRange: [[18, 19], [20, 21]] } } },
      { name: 'Rapid', ja: '快速', color: '#00b900',
        stops: ['京成高砂','京成小岩','京成八幡','東中山',
                '京成船橋','船橋競馬場','京成津田沼','京成大久保','実籾','八千代台','京成大和田',
                '勝田台','志津','ユーカリが丘','京成臼井','京成佐倉','大佐倉','京成酒々井',
                '宗吾参道','公津の杜','京成成田','芝山千代田'],
        schedule: { weekday: { timeRange: [[6, 8], [21, 24]] }, weekend: { timeRange: [17, 22] } } },
      { name: 'Ltd. Express', ja: '特急', color: '#e83030',
        stops: ['京成上野','日暮里','青砥','京成高砂','京成八幡','京成船橋','京成津田沼','八千代台',
                '勝田台','京成佐倉','大佐倉','京成酒々井','宗吾参道','公津の杜','京成成田','芝山千代田'],
        schedule: { weekday: { timeRange: [17, 18] }, weekend: { timeRange: [21, 22] } } },
      { name: 'Ltd. Express', ja: '特急', color: '#e83030',
        stops: ['京成高砂','京成八幡','京成船橋','京成津田沼','八千代台',
                '勝田台','京成佐倉','大佐倉','京成酒々井','宗吾参道','公津の杜','京成成田','芝山千代田'],
        schedule: { weekday: { timeRange: [17, 22] }, weekend: { timeRange: [21, 23] } } },
      { name: 'Rapid Ltd', ja: '快速特急', color: '#f07000',
        stops: ['京成上野','日暮里','青砥','京成高砂','京成八幡','京成船橋','京成津田沼','八千代台',
                '勝田台','京成佐倉','京成成田','芝山千代田'],
        schedule: { weekday: { timeRange: [16, 17] }, weekend: { timeRange: [[17, 18], [19, 20]] } } },
      { name: 'Rapid Ltd', ja: '快速特急', color: '#f07000',
        stops: ['京成高砂','京成八幡','京成船橋','京成津田沼','八千代台',
                '勝田台','京成佐倉','京成成田','芝山千代田'],
        schedule: { weekday: { timeRange: [17, 21] }, weekend: { timeRange: [17, 21] } } },
    ] },
  // Up, from 芝山千代田 (東成田 +3 min): to 京成上野 wd 普通 6:08, 17:55, 19:18, 通勤特急
  // 6:37, 7:23, 7:45, 特急 18:41; we 普通 6:06, 8:31, 18:08, 快特 6:35, 6:53, 7:16. Short
  // runs: 宗吾参道 普通 wd 20:20, we 20:50, 21:21; 京成高砂 快速 we 20:07. (The wd 快特 7:07 /
  // 快速 18:18 to 西馬込 and the we 快速 7:57 to 羽田 run via 押上: not offered.)
  // One copy per boarding line: from 芝山千代田 over 東成田, and from 東成田 itself.
  ...[['Shibayama Railway Line', ['芝山千代田', '東成田']], ['Keisei Higashi-Narita Line', ['東成田', '京成成田']]].map(([from, src]) => {
    const fromShibayama = from === 'Shibayama Railway Line';
    // 京成成田 is a via station from 芝山千代田 (via stations aren't listed as stops)
    const stops = main => [...src, ...main];
    return {
      from, fromEnd: fromShibayama ? '東成田' : '京成成田',
      to:   'Keisei Main Line', toStation: '京成成田', toDir: 'start',
      ...(fromShibayama ? { via: ['京成成田'], boardFrom: '芝山千代田' } : {}),
      impliedLines: ['Keisei Higashi-Narita Line'],
      chainFrom: [],
      name: 'Keisei Ueno', ja: '京成上野方面', color: '#0073CF',
      ...(fromShibayama ? {} : { lineDests: [
        { until: '京成成田', name: 'Keisei Narita', ja: '京成成田方面', color: '#8B6DAF' },
      ] }),
      destinations: [
        { until: '京成上野', name: 'Keisei Ueno', ja: '京成上野方面', color: '#0073CF',
          services: ['Local', 'Commuter Ltd. Exp', 'Ltd. Express', 'Rapid Ltd'],
          schedule: { weekday: { timeRange: [[6, 8], [17, 20]] }, weekend: { timeRange: [[6, 9], [18, 19]] } } },
        { until: '京成高砂', name: 'Keisei Takasago', ja: '京成高砂方面', color: '#00b900', services: ['Rapid'],
          schedule: { weekday: { stops: [] }, weekend: { timeRange: [20, 21] } } },
        { until: '宗吾参道', name: 'Sogo-sando', ja: '宗吾参道方面', color: '#005aa0', services: ['Local'],
          schedule: { weekday: { timeRange: [20, 21] }, weekend: { timeRange: [20, 22] } } },
      ],
      express: [
        { stops: null, name: 'Local', ja: '各停', color: '#00a0e8',
          schedule: { weekday: { timeRange: [[6, 7], [17, 18], [19, 21]] }, weekend: { timeRange: [[6, 7], [8, 9], [18, 19], [20, 22]] } } },
        { name: 'Commuter Ltd. Exp', ja: '通勤特急', color: '#3a6fd8',
          stops: stops(['公津の杜','宗吾参道','京成酒々井','大佐倉','京成佐倉','京成臼井','ユーカリが丘','志津',
                        '勝田台','八千代台','京成津田沼','京成船橋','京成八幡','京成高砂','青砥','日暮里','京成上野']),
          schedule: { weekday: { timeRange: [6, 8] }, weekend: { stops: [] } } },
        { name: 'Ltd. Express', ja: '特急', color: '#e83030',
          stops: stops(['公津の杜','宗吾参道','京成酒々井','大佐倉','京成佐倉','勝田台','八千代台',
                        '京成津田沼','京成船橋','京成八幡','京成高砂','青砥','日暮里','京成上野']),
          schedule: { weekday: { timeRange: [18, 19] }, weekend: { stops: [] } } },
        { name: 'Rapid Ltd', ja: '快速特急', color: '#f07000',
          stops: stops(['京成佐倉','勝田台','八千代台','京成津田沼','京成船橋','京成八幡','京成高砂','青砥','日暮里','京成上野']),
          schedule: { weekday: { stops: [] }, weekend: { timeRange: [6, 8] } } },
        { name: 'Rapid', ja: '快速', color: '#00b900',
          stops: stops(['公津の杜','宗吾参道','京成酒々井','大佐倉','京成佐倉','京成臼井','ユーカリが丘','志津',
                        '勝田台','京成大和田','八千代台','実籾','京成大久保','京成津田沼','船橋競馬場','京成船橋',
                        '東中山','京成八幡','京成小岩','京成高砂']),
          schedule: { weekday: { stops: [] }, weekend: { timeRange: [20, 21] } } },
      ] };
  }),

  // ── Keiyo → Sotobo / Uchibo at Soga ──────────────────────────────────
  // A dozen Keiyo trains a day run on to 上総一ノ宮 (快速 and 各停, every Sotobo station) and a
  // few evening ones to 君津 (passing 巌根 like the Sobu 快速). The reverse rides are the Keiyo
  // Line's own platform at 蘇我 (Y-junction) (ODPT 2026-03)
  { from: 'JR Keiyo Line',  fromEnd: '蘇我',
    to:   'JR Sotobo Line', toStation: '蘇我', toDir: 'end',
    toUntil: '上総一ノ宮',
    name: 'Kazusa-Ichinomiya', ja: '上総一ノ宮方面', color: '#e8503a',
    destinations: [
      { until: '上総一ノ宮', name: 'Kazusa-Ichinomiya', ja: '上総一ノ宮方面', color: '#e8503a',
        schedule: { weekday: { timeRange: [[9, 15], [17, 23]] }, weekend: { timeRange: [[9, 15], [18, 23]] } } },
    ],
    // 快速 by day and around 20h, 各停 in the evening
    express: [
      { stops: null, name: 'Local', ja: '各停', schedule: { weekday: { timeRange: [17, 24] }, weekend: { timeRange: [17, 24] } } },
      { name: 'Rapid', ja: '快速', color: '#00b900',
        stops: [...KEIYO_RAPID, '鎌取', '誉田', '土気', '大網', '永田', '本納', '新茂原', '茂原', '八積', '上総一ノ宮'],
        schedule: { weekday: { timeRange: [[9, 15], [20, 22]] }, weekend: { timeRange: [[9, 15], [20, 22]] } } },
    ] },
  { from: 'JR Keiyo Line',  fromEnd: '蘇我',
    to:   'JR Uchibo Line', toStation: '蘇我', toDir: 'end',
    toUntil: '君津',
    name: 'Kimitsu', ja: '君津方面', color: '#00b2e5',
    destinations: [
      { until: '君津', name: 'Kimitsu', ja: '君津方面', color: '#00b2e5',
        schedule: { weekday: { timeRange: [17, 24] }, weekend: { timeRange: [17, 24] } } },
    ],
    // (the 快速 window matches the Sotobo one: on the Keiyo stretch the two services are the same
    // trains to the checker; the 君津 destination's own hours gate the picker)
    express: [
      { stops: null, name: 'Local', ja: '各停', schedule: { weekday: { timeRange: [17, 24] }, weekend: { timeRange: [17, 24] } } },
      { name: 'Rapid', ja: '快速', color: '#00b900',
        stops: [...KEIYO_RAPID, '浜野', '八幡宿', '五井', '姉ケ崎', '長浦', '袖ケ浦', '木更津', '君津'],
        schedule: { weekday: { timeRange: [[9, 15], [20, 22]] }, weekend: { timeRange: [[9, 15], [20, 22]] } } },
    ] },

  // ── Sotobo ↔ Uchibo at Awa-Kamogawa ──────────────────────────────────
  // Around the peninsula's tip 9–11 普通 a day run through each way (上総一ノ宮 ↔ 木更津); the
  // short turns of each line toward 安房鴨川 ride as lineDests here (ODPT 2026-03)
  { from: 'JR Sotobo Line', fromEnd: '安房鴨川',
    to:   'JR Uchibo Line', toEnd:   '安房鴨川',
    toUntil: '木更津',
    lineDests: [
      { until: '上総一ノ宮', name: 'Kazusa-Ichinomiya', ja: '上総一ノ宮方面', color: '#e8503a',
        schedule: { weekday: { timeRange: [5, 23] }, weekend: { timeRange: [5, 23] } } },
      { until: '茂原',       name: 'Mobara',            ja: '茂原方面',       color: '#d04030', services: ['Local'],
        schedule: { weekday: { timeRange: [[11, 21], [23, 1]] }, weekend: { timeRange: [[11, 21], [23, 1]] } } },
      { until: '大原',       name: 'Ohara',             ja: '大原方面',       color: '#c03828', services: ['Local'],
        schedule: { weekday: { timeRange: [[15, 18], [23, 1]] }, weekend: { timeRange: [[15, 18], [23, 1]] } } },
      { until: '勝浦',       name: 'Katsuura',          ja: '勝浦方面',       color: '#b03028', services: ['Local'],
        schedule: { weekday: { timeRange: [19, 24] }, weekend: { timeRange: [19, 24] } } },
      { until: '安房鴨川',   name: 'Awa-Kamogawa',      ja: '安房鴨川方面',   color: '#902020' },
    ],
    destinations: [
      { until: '木更津', name: 'Kisarazu', ja: '木更津方面', color: '#00b2e5', services: ['Local'],
        schedule: { weekday: { timeRange: [[7, 8], [10, 18], [19, 21]] }, weekend: { timeRange: [[7, 8], [10, 18], [19, 21]] } } },
    ],
    express: [{ stops: null, name: 'Local', ja: '普通', schedule: { weekday: { timeRange: [[7, 8], [10, 18], [19, 21]] }, weekend: { timeRange: [[7, 8], [10, 18], [19, 21]] } } }] },
  { from: 'JR Uchibo Line', fromEnd: '安房鴨川',
    to:   'JR Sotobo Line', toEnd:   '安房鴨川',
    toUntil: '上総一ノ宮',
    lineDests: [
      { until: '木更津',   name: 'Kisarazu',     ja: '木更津方面',   color: '#00b2e5',
        schedule: { weekday: { timeRange: [[6, 11], [12, 16], [18, 20], [21, 23], [0, 1]] }, weekend: { timeRange: [[6, 11], [12, 16], [18, 20], [21, 23], [0, 1]] } } },
      { until: '君津',     name: 'Kimitsu',      ja: '君津方面',     color: '#0090c0',
        schedule: { weekday: { timeRange: [5, 1] }, weekend: { timeRange: [5, 1] } } },
      { until: '上総湊',   name: 'Kazusa-Minato', ja: '上総湊方面',   color: '#0070a0', services: ['Local'],
        schedule: { weekday: { timeRange: [[7, 9], [14, 20]] }, weekend: { timeRange: [[7, 9], [14, 20]] } } },
      { until: '館山',     name: 'Tateyama',     ja: '館山方面',     color: '#005080', services: ['Local'],
        schedule: { weekday: { timeRange: [[6, 9], [19, 1]] }, weekend: { timeRange: [[7, 9], [19, 1]] } } },
      { until: '安房鴨川', name: 'Awa-Kamogawa', ja: '安房鴨川方面', color: '#003060' },
    ],
    destinations: [
      { until: '上総一ノ宮', name: 'Kazusa-Ichinomiya', ja: '上総一ノ宮方面', color: '#e8503a', services: ['Local'],
        schedule: { weekday: { timeRange: [[7, 8], [9, 21]] }, weekend: { timeRange: [[7, 8], [9, 21]] } } },
    ],
    express: [{ stops: null, name: 'Local', ja: '普通', schedule: { weekday: { timeRange: [[7, 8], [9, 21]] }, weekend: { timeRange: [[7, 8], [9, 21]] } } }] },

  // ── Togane → Sotobo at Oami ──────────────────────────────────────────
  // Half the Togane Line trains run on from 大網 to 千葉 (13 a day); the Sotobo → Togane
  // direction is the Togane Line's own platform at 大網 (Y-junction) (ODPT 2026-03)
  { from: 'JR Togane Line', fromEnd: '大網',
    to:   'JR Sotobo Line', toStation: '大網', toDir: 'start',
    toUntil: '千葉',
    lineDests: [
      { until: '大網', name: 'Oami', ja: '大網方面', color: '#e8503a' },
    ],
    destinations: [
      { until: '千葉', name: 'Chiba', ja: '千葉方面', color: '#e8503a', services: ['Local'],
        schedule: { weekday: { timeRange: [[6, 7], [8, 15], [17, 18], [19, 20], [22, 23]] }, weekend: { timeRange: [[6, 7], [8, 15], [17, 18], [19, 20], [22, 23]] } } },
    ],
    express: [{ stops: null, name: 'Local', ja: '普通', schedule: { weekday: { timeRange: [[6, 15], [17, 18], [19, 20], [22, 23]] }, weekend: { timeRange: [[6, 15], [17, 18], [19, 20], [22, 23]] } } }] },

  // ── Hachiko Line ↔ Kawagoe Line at Komagawa ──────────────────────────
  // Through-running: Hachiko Line trains from Hachioji continue onto
  // the Kawagoe Line toward Kawagoe. Komagawa is shared terminus.
  // Only the southern (Hachioji) Hachiko segment through-runs; fromLineHas /
  // toLineHas pick it out of the two same-name segments.
  { from: 'JR Hachiko Line', fromEnd: '高麗川', fromLineHas: '八王子',
    to:   'JR Kawagoe Line',  toEnd:   '高麗川',
    lineDests: [
      { until: '拝島',     name: 'Haijima',      ja: '拝島方面',     color: '#b8956a' },
      { until: '箱根ケ崎', name: 'Hakonegasaki', ja: '箱根ケ崎方面', color: '#a67d52' },
      { until: '高麗川',   name: 'Komagawa',     ja: '高麗川方面',   color: '#996633' },
    ],
    destinations: [
      { until: '川越', name: 'Kawagoe', ja: '川越方面', color: '#4a786f' },
    ] },
  // Most trains from 大宮 end at 川越 (ODPT 2026-03)
  { from: 'JR Kawagoe Line',  fromEnd: '高麗川',
    to:   'JR Hachiko Line',  toEnd:   '高麗川', toLineHas: '八王子',
    name: 'Hachioji', ja: '八王子方面', color: '#996633',
    lineDests: [
      { until: '川越',   name: 'Kawagoe',  ja: '川越方面',   color: '#4a786f' },
      { until: '高麗川', name: 'Komagawa', ja: '高麗川方面', color: '#4a786f' },
    ],
    destinations: [
      { until: '八王子', name: 'Hachioji', ja: '八王子方面', color: '#996633' },
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
        '大宮','さいたま新都心','与野','北浦和','浦和',
        '南浦和','蕨','西川口','川口','赤羽',
        '東十条','王子','上中里','田端','上野',
        '御徒町','秋葉原','神田','東京',
        '浜松町','田町','高輪ゲートウェイ','品川',
        '大井町','大森','蒲田','川崎','鶴見',
        '新子安','東神奈川','横浜',
        '桜木町','関内','石川町','山手','根岸',
        '磯子','新杉田','洋光台','港南台','本郷台','大船'],
        schedule: { weekday: { skip: ['御徒町'], timeRange: [9, 17] }, weekend: { timeRange: [9, 19] } } },
    ] },
  // Half the through trains end at 南浦和; 4 weekday-morning 各停 at 赤羽 (ODPT 2026-03)
  { from: 'JR Negishi Line',       fromEnd: '横浜',
    to:   'JR Keihin Tohoku Line', toEnd:   '横浜',
    name: 'Omiya', ja: '大宮方面', color: '#00B2E5',
    lineDests: [
      { until: '横浜', name: 'Yokohama', ja: '横浜方面', color: '#d477d1' },
    ],
    destinations: [
      { until: '赤羽',   name: 'Akabane',      ja: '赤羽方面',   color: '#48b8d0', services: ['Local'],
        schedule: { weekday: { timeRange: [6, 10] }, weekend: { stops: [] } } },
      { until: '南浦和', name: 'Minami-Urawa', ja: '南浦和方面', color: '#20a0c8' },
      { until: '大宮',   name: 'Omiya',        ja: '大宮方面',   color: '#00B2E5' },
    ],
    express: [
      { name: 'Local', ja: '各停', color: '#00a0e8', stops: null },
      { name: 'Rapid', ja: '快速', color: '#00b900', stops: [
        '大船','本郷台','港南台','洋光台','新杉田','磯子',
        '根岸','山手','石川町','関内','桜木町','横浜',
        '東神奈川','新子安','鶴見','川崎','蒲田','大森','大井町',
        '品川','高輪ゲートウェイ','田町','浜松町',
        '東京','神田','秋葉原','御徒町','上野',
        '田端','上中里','王子','東十条','赤羽',
        '川口','西川口','蕨','南浦和','浦和',
        '北浦和','与野','さいたま新都心','大宮'],
        schedule: { weekday: { skip: ['御徒町'], timeRange: [9, 16] }, weekend: { timeRange: [9, 18] } } },
    ] },
];
