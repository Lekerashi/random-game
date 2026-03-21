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
    name: 'Yokohama', ja: '横浜方面', color: '#1a8fe8' },

  // TODO: Main Line → Airport Line mid-line junction at Keikyu Kamata
  // (Less common direction — riders board Airport Line trains directly)

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
];
