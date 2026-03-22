// ── Line Connections (through-running between lines) ─────────────────────
// Defines directed connections between lines resolved at runtime.
// No line mutation needed — lines stay as-is from upstream data.
//
// Fields:
//   from, fromEnd     — source line + its terminus (JA) where connection starts
//   to, toEnd         — target line + its terminus for terminus-to-terminus connections
//   toStation, toDir  — target line station + direction for mid-line junctions
//   via               — intermediate station JA names between the two lines
//   name, ja, color   — button label when multiple connections = branch picker
//   destinations      — array of { until (JA), name, ja } for train terminus picker
//   express           — express services spanning the full connected route
//   displayName       — override platform pill label (e.g. "Ueno Tokyo Line")
//   toUntil           — JA name of last station on target line (limits range)

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
    express: [
      { name: 'Airport Exp', ja: 'エアポート急行', color: '#e83030',
        stops: ['Sengakuji','Shinagawa','Aomono-yokocho','Heiwajima','Keikyu Kamata',
                'Kojiya','Otorii','Anamori-Inari','Tenkubashi',
                'Haneda Airport Terminal 3','Haneda Airport Terminal 1 & 2'] },
    ] },
  { from: 'Keikyu Airport Line',  fromEnd: '京急蒲田',
    to:   'Keikyu Main Line',     toStation: '京急蒲田', toDir: 'end',
    toUntil: '横浜',
    name: 'Yokohama', ja: '横浜方面', color: '#1a8fe8',
    express: [
      { name: 'Airport Exp', ja: 'エアポート急行', color: '#e83030',
        stops: ['Keikyu Kamata','Keikyu Kawasaki','Kanagawa-shimmachi','Yokohama',
                'Kojiya','Otorii','Anamori-Inari','Tenkubashi',
                'Haneda Airport Terminal 3','Haneda Airport Terminal 1 & 2'] },
    ] },

  // From Main Line past Keikyu Kamata → branch onto Airport Line (both directions)
  { from: 'Keikyu Main Line',     fromStation: '京急蒲田', fromDir: 'end',
    to:   'Keikyu Airport Line',   toEnd: '京急蒲田',
    name: 'Airport', ja: '羽田空港方面', color: '#1a8fe8',
    express: [
      { name: 'Airport Local', ja: '空港各停', color: '#00a0e8', stops: null },
      { name: 'Airport Exp', ja: 'エアポート急行', color: '#e83030',
        stops: ['Sengakuji','Shinagawa','Aomono-yokocho','Heiwajima','Keikyu Kamata',
                'Kojiya','Otorii','Anamori-Inari','Tenkubashi',
                'Haneda Airport Terminal 3','Haneda Airport Terminal 1 & 2'] },
    ] },
  { from: 'Keikyu Main Line',     fromStation: '京急蒲田', fromDir: 'start',
    to:   'Keikyu Airport Line',   toEnd: '京急蒲田',
    name: 'Airport', ja: '羽田空港方面', color: '#1a8fe8',
    express: [
      { name: 'Airport Local', ja: '空港各停', color: '#00a0e8', stops: null },
      { name: 'Airport Exp', ja: 'エアポート急行', color: '#e83030',
        stops: ['Yokohama','Kanagawa-shimmachi','Keikyu Kawasaki','Keikyu Kamata',
                'Kojiya','Otorii','Anamori-Inari','Tenkubashi',
                'Haneda Airport Terminal 3','Haneda Airport Terminal 1 & 2'] },
    ] },

  // ── Tokaido UTL northbound ──────────────────────────────────────────────
  // Multiple connections from Tokaido terminus at Tokyo = branch picker
  { from: 'JR Tokaido Main Line', fromEnd: '東京',
    to:   'Utsunomiya Line',      toEnd:   '上野',
    via:  ['上野'],
    name: 'Utsunomiya', ja: '宇都宮線', color: '#40d46e',
    displayName: 'Ueno Tokyo Line' },
  { from: 'JR Tokaido Main Line', fromEnd: '東京',
    to:   'JR Takasaki Line',     toEnd:   '上野',
    via:  ['上野'],
    name: 'Takasaki', ja: '高崎線', color: '#424d6d',
    displayName: 'Ueno Tokyo Line' },
  { from: 'JR Tokaido Main Line', fromEnd: '東京',
    to:   'JR Joban Line',        toEnd:   '上野',
    via:  ['上野'],
    name: 'Joban', ja: '常磐線', color: '#009BBF',
    displayName: 'Ueno Tokyo Line' },
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
    via:  ['上野'],
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
    via:  ['上野'],
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
    via:  ['上野'],
    displayName: 'Ueno Tokyo Line',
    destinations: [
      { until: '東京',   name: 'Tokyo',     ja: '東京方面', color: '#F7A600' },
      { until: '品川',   name: 'Shinagawa', ja: '品川方面', color: '#009BBF' },
    ] },

  // ── Hanzomon ↔ Tobu Isesaki (Skytree) at Oshiage ─────────────────────
  // Through-running to Tobu Skytree Line (= Tobu Isesaki from Oshiage)
  { from: 'Tokyo Metro Hanzomon Line', fromEnd: '押上(スカイツリー前)',
    to:   'Tobu Isesaki Line',         toStation: '押上(スカイツリー前)', toDir: 'end' },
  { from: 'Tobu Isesaki Line',         fromStation: '押上(スカイツリー前)', fromDir: 'start',
    to:   'Tokyo Metro Hanzomon Line', toEnd: '押上(スカイツリー前)' },

  // ── Asakusa ↔ Keikyu at Sengakuji (toward Haneda) ──────────────────────
  // Sengakuji is mid-line on Asakusa (idx 6), start of Keikyu Main (idx 0)
  // Asakusa trains heading toward Nishi-magome (start) pass Sengakuji → branch onto Keikyu
  { from: 'Toei Asakusa Line', fromStation: '泉岳寺', fromDir: 'start',
    to:   'Keikyu Main Line',  toEnd: '泉岳寺' },
  // Keikyu trains from Haneda arrive at Sengakuji → continue onto Asakusa toward Oshiage (end)
  { from: 'Keikyu Main Line',  fromEnd: '泉岳寺',
    to:   'Toei Asakusa Line', toStation: '泉岳寺', toDir: 'end' },

  // ── Asakusa ↔ Keisei Oshiage at Oshiage (toward Narita) ──────────────
  // Oshiage is end of Asakusa (idx 19), start of Keisei Oshiage (idx 0)
  { from: 'Toei Asakusa Line',  fromEnd: '押上(スカイツリー前)',
    to:   'Keisei Oshiage Line', toEnd: '押上(スカイツリー前)' },
  { from: 'Keisei Oshiage Line', fromEnd: '押上(スカイツリー前)',
    to:   'Toei Asakusa Line',  toEnd: '押上(スカイツリー前)' },

  // ── Chiyoda ↔ Odakyu at Yoyogi-Uehara ─────────────────────────────────
  // 1:1 through-running with rich Odakyu express services
  { from: 'Tokyo Metro Chiyoda Line', fromEnd: '代々木上原',
    to:   'Odakyu Line',              toEnd:   '新宿' },
  { from: 'Odakyu Line',              fromEnd: '新宿',
    to:   'Tokyo Metro Chiyoda Line', toEnd:   '代々木上原' },

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
  { from: 'Tokyo Metro Fukutoshin Line', fromStation: '小竹向原', fromDir: 'end',
    to:   'Seibu Yurakucho Line',        toEnd: '小竹向原' },

  // ── Seibu Ikebukuro → Seibu Yurakucho at Nerima (mid-line junction) ───
  // Nerima is mid-line on Ikebukuro (idx 5), end on Yurakucho (idx 2)
  // F-Liner runs express on Seibu Ikebukuro, doesn't go to Ikebukuro station
  { from: 'Seibu Ikebukuro Line', fromStation: '練馬', fromDir: 'start',
    to:   'Seibu Yurakucho Line', toEnd: '練馬',
    express: [
      { name: 'F-Liner', ja: 'Fライナー', color: '#e83030',
        stops: ['Hanno','Kotesashi','Nishi-Tokorozawa','Tokorozawa',
                'Hibarigaoka','Shakujii-kōen Station','Nerima','Kotake-mukaihara'] },
    ] },
  { from: 'Seibu Ikebukuro Line', fromStation: '練馬', fromDir: 'end',
    to:   'Seibu Yurakucho Line', toEnd: '練馬',
    express: [
      { name: 'F-Liner', ja: 'Fライナー', color: '#e83030',
        stops: ['Hanno','Kotesashi','Nishi-Tokorozawa','Tokorozawa',
                'Hibarigaoka','Shakujii-kōen Station','Nerima','Kotake-mukaihara'] },
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
    express: [
      { name: 'F-Liner', ja: 'Fライナー', color: '#e83030',
        stops: ['Yokohama','Kikuna','Hiyoshi','Musashi-Kosugi','Jiyugaoka','Naka-meguro',
                'Shibuya',"Meiji-jingumae 'Harajuku'",'Shinjuku-sanchome','Ikebukuro',
                'Kotake-mukaihara','Wakoshi'] },
    ] },

  // ── Tokyu Toyoko ↔ Minato Mirai at Yokohama ──────────────────────────
  // Through-running to Motomachi-chukagai (chains with Fukutoshin/Seibu above)
  { from: 'Tokyu Toyoko Line',  fromEnd: '横浜',
    to:   'Minato Mirai Line',  toEnd:   '横浜' },
  { from: 'Minato Mirai Line',  fromEnd: '横浜',
    to:   'Tokyu Toyoko Line',  toEnd:   '横浜' },

  // ── Namboku ↔ Tokyu Meguro at Meguro ──────────────────────────────────
  { from: 'Tokyo Metro Namboku Line', fromEnd: '目黒',
    to:   'Tokyu Meguro Line',        toEnd:   '目黒' },
  { from: 'Tokyu Meguro Line',        fromEnd: '目黒',
    to:   'Tokyo Metro Namboku Line', toEnd:   '目黒' },

  // ── Mita ↔ Tokyu Meguro at Meguro ─────────────────────────────────────
  { from: 'Toei Mita Line',    fromEnd: '目黒',
    to:   'Tokyu Meguro Line', toEnd:   '目黒' },
  { from: 'Tokyu Meguro Line', fromEnd: '目黒',
    to:   'Toei Mita Line',   toEnd:   '目黒' },

  // ── Toei Shinjuku ↔ Keio at Shinjuku ──────────────────────────────────
  // Keio has express services (Sub-Exp, Express, Ltd. Exp)
  { from: 'Toei Shinjuku Line', fromEnd: '新宿',
    to:   'Keio Line',          toEnd:   '新宿' },
  { from: 'Keio Line',          fromEnd: '新宿',
    to:   'Toei Shinjuku Line', toEnd:   '新宿' },

  // ── Tobu Tojo ↔ Fukutoshin/Yurakucho at Wakoshi ──────────────────────
  // Wakoshi is mid-line on Tobu Tojo (idx 10), start of Fukutoshin and Yurakucho
  // Both travel directions: heading toward Ikebukuro or away
  { from: 'Tobu Tojo Line',             fromStation: '和光市', fromDir: 'start',
    to:   'Tokyo Metro Fukutoshin Line', toEnd: '和光市',
    name: 'Fukutoshin', ja: '副都心線', color: '#9C5E31' },
  { from: 'Tobu Tojo Line',             fromStation: '和光市', fromDir: 'start',
    to:   'Tokyo Metro Yurakucho Line',  toEnd: '和光市',
    name: 'Yurakucho', ja: '有楽町線', color: '#C9A800' },
  { from: 'Tobu Tojo Line',             fromStation: '和光市', fromDir: 'end',
    to:   'Tokyo Metro Fukutoshin Line', toEnd: '和光市',
    name: 'Fukutoshin', ja: '副都心線', color: '#9C5E31' },
  { from: 'Tobu Tojo Line',             fromStation: '和光市', fromDir: 'end',
    to:   'Tokyo Metro Yurakucho Line',  toEnd: '和光市',
    name: 'Yurakucho', ja: '有楽町線', color: '#C9A800' },
  // Return: Fukutoshin/Yurakucho terminus → Tobu Tojo
  { from: 'Tokyo Metro Fukutoshin Line', fromEnd: '和光市',
    to:   'Tobu Tojo Line',             toStation: '和光市', toDir: 'end' },
  { from: 'Tokyo Metro Yurakucho Line',  fromEnd: '和光市',
    to:   'Tobu Tojo Line',             toStation: '和光市', toDir: 'end' },

  // ── Chiyoda ↔ JR Joban at Ayase ───────────────────────────────────────
  // Ayase is idx 1 on Chiyoda (near start, Kita-ayase is a 1-station stub)
  // Ayase is idx 5 on Joban (mid-line)
  { from: 'Tokyo Metro Chiyoda Line', fromStation: '綾瀬', fromDir: 'start',
    to:   'JR Joban Line',            toStation: '綾瀬', toDir: 'end' },
  { from: 'JR Joban Line',            fromStation: '綾瀬', fromDir: 'end',
    to:   'Tokyo Metro Chiyoda Line', toStation: '綾瀬', toDir: 'end' },

  // ── Rinkai ↔ Saikyo at Osaki ──────────────────────────────────────────
  { from: 'Rinkai Line',    fromEnd: '大崎',
    to:   'JR Saikyo Line', toEnd:   '大崎' },
  { from: 'JR Saikyo Line', fromEnd: '大崎',
    to:   'Rinkai Line',    toEnd:   '大崎' },

  // ── Keisei Main ↔ Keisei Oshiage at Aoto ──────────────────────────────
  // Connects Asakusa→Keisei Oshiage chain to Keisei Main → Narita Airport
  { from: 'Keisei Oshiage Line', fromStation: '青砥', fromDir: 'end',
    to:   'Keisei Main Line',    toStation: '青砥', toDir: 'end' },
  { from: 'Keisei Main Line',    fromStation: '青砥', fromDir: 'start',
    to:   'Keisei Oshiage Line', toStation: '青砥', toDir: 'start' },
];
