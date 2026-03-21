// ── Express Services (no-extra-fare only) ─────────────────────────────────
// stops: null = all stations (local); array = station names that this type stops at
const EXPRESS_SERVICES = {
  "Seibu Shinjuku Line": [
    { name: "Local", ja: "各停", color: "#00a0e8", stops: null },
    { name: "Semi-Exp", ja: "準急", color: "#00b900", stops: [
      "Seibu-Shinjuku","Takadanobaba","Saginomiya","Kami-Shakujii",
      "Musashi-Seki","Higashi-Fushimi","Seibu-Yagisawa","Tanashi",
      "Hana-Koganei","Kodaira","Kumegawa","Higashi-Murayama",
      "Tokorozawa","Koku-koen","Shin-Tokorozawa","Iriso",
      "Sayamashi","Shin-Sayama","Minami-Otsuka","Hon-Kawagoe",
    ]},
    { name: "Express", ja: "急行", color: "#e83030", stops: [
      "Seibu-Shinjuku","Takadanobaba","Saginomiya","Kami-Shakujii",
      "Tanashi","Hana-Koganei","Kodaira","Kumegawa",
      "Higashi-Murayama","Tokorozawa","Koku-koen","Shin-Tokorozawa",
      "Iriso","Sayamashi","Shin-Sayama","Minami-Otsuka","Hon-Kawagoe",
    ]},
  ],
  "JR Chuo Line": [
    { name: "Rapid", ja: "快速", color: "#00b900", stops: null },
    { name: "Sp. Rapid", ja: "特別快速", color: "#f07000", stops: [
      "Tokyo","Kanda","Ochanomizu","Yotsuya","Shinjuku",
      "Nakano","Mitaka","Kokubunji","Tachikawa",
      "Hino","Toyoda","Hachioji","Nishi-Hachioji","Takao",
    ]},
  ],
  "Tokyo Metro Fukutoshin Line": [
    { name: "Local", ja: "各停", color: "#00a0e8", stops: null },
    { name: "Express", ja: "急行", color: "#e83030", stops: [
      "Wakoshi","Kotake-mukaihara","Ikebukuro","Shinjuku-sanchome",
      "Meiji-jingumae 'Harajuku'","Shibuya",
    ]},
  ],
  "Seibu Ikebukuro Line": [
    { name: "Local", ja: "各停", color: "#00a0e8", stops: null },
    { name: "Semi-Exp", ja: "準急", color: "#00b900", stops: [
      "Ikebukuro","Shakujii-kōen Station","Oizumi-gakuen","Hoya","Hibarigaoka",
      "Higashi-Kurume","Kiyose","Akitsu","Tokorozawa",
      "Nishi-Tokorozawa","Kotesashi","Sayamagaoka","Musashi Fujisawa",
      "Inariyama-koen","Iruma-shi","Bushi","Moto-Kaji","Hanno",
    ]},
    { name: "Express", ja: "急行", color: "#e83030", stops: [
      "Ikebukuro","Shakujii-kōen Station","Hibarigaoka","Tokorozawa",
      "Nishi-Tokorozawa","Kotesashi","Sayamagaoka","Musashi Fujisawa",
      "Inariyama-koen","Iruma-shi","Bushi","Moto-Kaji","Hanno",
    ]},
    { name: "Rapid Exp", ja: "快速急行", color: "#f07000", stops: [
      "Ikebukuro","Shakujii-kōen Station","Hibarigaoka","Tokorozawa",
      "Kotesashi","Iruma-shi","Hanno",
    ]},
  ],
  "Keio Line": [
    { name: "Local", ja: "各停", color: "#00a0e8", stops: null },
    { name: "Sub-Exp", ja: "区間急行", color: "#f0c000", stops: [
      "Shinjuku","Sasazuka","Meidaimae","Sakurajosui","Chitose-karasuyama",
      "Sengawa","Tsutsujigaoka","Chofu","Higashi-fuchu","Fuchu",
      "Bubaigawara","Nakagawara","Seiseki-sakuragaoka","Mogusaen",
      "Takahatafudo","Minamidaira","Hirayamajoshi-koen",
      "Naganuma","Kitano","Keiō-hachiōji",
    ]},
    { name: "Express", ja: "急行", color: "#e83030", stops: [
      "Shinjuku","Sasazuka","Meidaimae","Sakurajosui","Chitose-karasuyama",
      "Sengawa","Tsutsujigaoka","Chofu","Higashi-fuchu","Fuchu",
      "Bubaigawara","Nakagawara","Seiseki-sakuragaoka","Mogusaen",
      "Takahatafudo","Minamidaira","Hirayamajoshi-koen",
      "Naganuma","Kitano","Keiō-hachiōji",
    ]},
    { name: "Ltd. Exp", ja: "特急", color: "#e83080", stops: [
      "Shinjuku","Sasazuka","Meidaimae","Chitose-karasuyama","Chofu",
      "Fuchu","Bubaigawara","Seiseki-sakuragaoka","Takahatafudo","Kitano",
      "Keiō-hachiōji",
    ]},
  ],
  "Keio Inokashira line": [
    { name: "Local", ja: "各停", color: "#00a0e8", stops: null },
    { name: "Express", ja: "急行", color: "#e83030", stops: [
      "Shibuya","Shimo-Kitazawa","Meidaimae","Eifukucho","Kugayama",
      "Inokashira-koen","Kichijōji",
    ]},
  ],
  "Odakyu Line": [
    { name: "Local", ja: "各停", color: "#00a0e8", stops: null },
    { name: "Semi-Exp", ja: "準急", color: "#00b900", stops: [
      "Shinjuku","Yoyogi-Uehara","Shimo-Kitazawa","Kyodo","Chitose-Funabashi",
      "Soshigaya-Okura","Seijogakuen-mae","Komae","Noborito","Mukogaoka-Yuen",
      "Ikuta","Yomiuriland-mae","Yurigaoka","Shin-Yurigaoka",
      "Kakio","Tsurukawa","Tamagawagakuen-mae","Machida","Odakyu-Sagamihara",
      "Soubudai-Mae","Zama","Ebina","Atsugi","Hon-Atsugi",
    ]},
    { name: "Express", ja: "急行", color: "#e83030", stops: [
      "Shinjuku","Yoyogi-Uehara","Shimo-Kitazawa","Kyodo","Seijogakuen-mae",
      "Noborito","Mukogaoka-Yuen","Shin-Yurigaoka","Machida","Sagami-Ono",
      "Ebina","Hon-Atsugi","Aiko-Ishida","Isehara","Tsurumaki-Onsen",
      "Tokaidaigaku-mae","Hadano","Shibusawa","Shin-Matsuda","Odawara",
    ]},
    { name: "Rapid Exp", ja: "快速急行", color: "#f07000", stops: [
      "Shinjuku","Yoyogi-Uehara","Shimo-Kitazawa","Noborito","Shin-Yurigaoka",
      "Machida","Sagami-Ono","Ebina","Hon-Atsugi","Aiko-Ishida","Isehara",
      "Tsurumaki-Onsen","Tokaidaigaku-mae","Hadano","Shibusawa",
      "Shin-Matsuda","Odawara",
    ]},
  ],
  "Tokyu Toyoko Line": [
    { name: "Local", ja: "各停", color: "#00a0e8", stops: null },
    { name: "Express", ja: "急行", color: "#e83030", stops: [
      "Shibuya","Naka-meguro","Gakugei-daigaku","Jiyugaoka","Den-en-chofu",
      "Tamagawa","Musashi-Kosugi","Hiyoshi","Tsunashima","Kikuna","Yokohama",
    ]},
    { name: "Ltd. Exp", ja: "特急", color: "#e83080", stops: [
      "Shibuya","Naka-meguro","Jiyugaoka","Musashi-Kosugi","Hiyoshi",
      "Kikuna","Yokohama",
    ]},
  ],
  "Tokyu Den-en-toshi Line": [
    { name: "Local", ja: "各停", color: "#00a0e8", stops: null },
    { name: "Semi-Exp", ja: "準急", color: "#00b900", stops: [
      "Shibuya","Ikejiri-ohashi","Sangen-jaya","Komazawa-daigaku",
      "Sakura-shimmachi","Yoga","Futako-tamagawa","Mizonokuchi","Saginuma",
      "Tama-plaza","Azamino","Aobadai","Nagatsuta","Tsukushino","Suzukakedai",
      "Minami-machida","Tsukimino","Chuo-Rinkan",
    ]},
    { name: "Express", ja: "急行", color: "#e83030", stops: [
      "Shibuya","Sangen-jaya","Futako-tamagawa","Mizonokuchi","Saginuma",
      "Tama-plaza","Azamino","Aobadai","Nagatsuta","Minami-machida",
      "Chuo-Rinkan",
    ]},
  ],
  "Tobu Tojo Line": [
    { name: "Local", ja: "各停", color: "#00a0e8", stops: null },
    { name: "Semi-Exp", ja: "準急", color: "#00b900", stops: [
      "Ikebukuro","Kami-itabashi","Narimasu","Wakoshi","Asaka","Asakadai",
      "Shiki","Fujimino","Kami-fukuoka","Kawagoe","Kawagoeshi",
      "Sakado","Higashi-matsuyama","Shinrin-koen","Musashi-ranzan",
      "Ogawamachi","Yorii",
    ]},
    { name: "Express", ja: "急行", color: "#e83030", stops: [
      "Ikebukuro","Wakoshi","Asaka","Asakadai","Kawagoe","Kawagoeshi",
      "Sakado","Higashi-matsuyama","Shinrin-koen","Musashi-ranzan",
      "Ogawamachi","Yorii",
    ]},
    { name: "Rapid Exp", ja: "快速急行", color: "#f07000", stops: [
      "Ikebukuro","Wakoshi","Asakadai","Kawagoe","Kawagoeshi",
      "Kasumigaseki (Kawagoe)","Tsurugashima","Wakaba","Sakado",
      "Kita Sakado","Takasaka","Higashi-matsuyama","Shinrin-koen",
      "Tsukinowa","Musashi-ranzan","Ogawamachi",
    ]},
  ],
  "Tobu Isesaki Line": [
    { name: "Local", ja: "各停", color: "#00a0e8", stops: null },
    { name: "Sub-Exp", ja: "区間急行", color: "#f0c000", stops: [
      "Asakusa","TOKYO SKYTREE","Hikifune","Higashi-mukojima",
      "Kanegafuchi","Horikiri","Ushida","Kita-Senju","Nishiarai","Soka",
      "Shin-koshigaya","Koshigaya","Sengendai","Kasukabe",
      "Tobu dobutsu-koen (Tobu Zoo)","Wado","Kuki","Washinomiya",
      "Hanasaki","Kazo","Minami-Hanyu","Hanyu","Kawamata","Morinji-mae",
      "Tatebayashi",
    ]},
    { name: "Semi-Exp", ja: "準急", color: "#00b900", stops: [
      "Oshiage 'SKYTREE'","Hikifune","Kita-Senju","Nishiarai","Soka",
      "Shin-koshigaya","Koshigaya","Kita-koshigaya","Obukuro","Sengendai",
      "Takesato","Ichinowari","Kasukabe","Kita-Kasukabe","Himemiya",
      "Tobu dobutsu-koen (Tobu Zoo)","Wado","Kuki",
    ]},
    { name: "Express", ja: "急行", color: "#e83030", stops: [
      "Oshiage 'SKYTREE'","Hikifune","Kita-Senju","Nishiarai","Soka",
      "Shin-koshigaya","Koshigaya","Sengendai","Kasukabe",
      "Tobu dobutsu-koen (Tobu Zoo)",
    ]},
  ],
  "Keisei Main Line": [
    { name: "Local", ja: "各停", color: "#00a0e8", stops: null },
    { name: "Rapid", ja: "快速", color: "#00b900", stops: [
      "Keisei-Ueno","Nippori","Senjuohashi","Aoto","Keisei Takasago",
      "Keisei Koiwa","Edogawa","Konodai","Ichikawamama","Sugano",
      "Keisei Yawata","Onigoe","Keisei-Nakayama","Higashi-Nakayama",
      "Keisei Nishifuna","Kaijin","Keisei Funabashi","Daijingu-Shita",
      "Funabashi-Keibajo","Yatsu","Keisei Tsudanuma","Keisei-Okubo",
      "Mimomi","Yachiyodai","Keisei-Owada","Katsutadai","Shizu",
      "Yūkarigaoka","Keisei-Usui","Keisei-Sakura","Osakura",
      "Keisei-Shisui","Sogosando","Kozunomori","Keisei-Narita",
      "Airport Second Building (NRT Terminal 2)","Narita Airport (NRT Terminal 1)",
    ]},
    { name: "Rapid Ltd", ja: "快速特急", color: "#f07000", stops: [
      "Keisei-Ueno","Nippori","Aoto","Keisei Takasago","Keisei Yawata",
      "Keisei Funabashi","Keisei Tsudanuma","Yachiyodai","Katsutadai",
      "Keisei-Sakura","Keisei-Narita",
      "Airport Second Building (NRT Terminal 2)","Narita Airport (NRT Terminal 1)",
    ]},
  ],
  "Keikyu Main Line": [
    { name: "Local", ja: "各停", color: "#00a0e8", stops: null },
    { name: "Ltd. Express", ja: "特急", color: "#e84040", stops: [
      "Sengakuji","Shinagawa","Aomono-yokocho","Heiwajima","Keikyu Kamata",
      "Keikyu Kawasaki","Kanagawa-shimmachi","Yokohama",
      "Kamiooka","Sugita","Nokendai","Kanazawa-bunko","Kanazawa-Hakkei",
      "Yokosuka-chuo","Horinouchi","Uraga",
    ]},
    { name: "Rapid Ltd. Exp", ja: "快特", color: "#e83080", stops: [
      "Sengakuji","Shinagawa","Keikyu Kamata","Keikyu Kawasaki","Yokohama",
      "Kamiooka","Kanazawa-bunko","Kanazawa-Hakkei","Yokosuka-chuo",
      "Horinouchi","Uraga",
    ]},
  ],
  "Keikyu Airport Line": [
    { name: "Local", ja: "各停", color: "#00a0e8", stops: null },
    { name: "Airport Exp", ja: "エアポート急行", color: "#e83030", stops: [
      "Sengakuji","Shinagawa","Aomono-yokocho","Heiwajima","Keikyu Kamata",
      "Kojiya","Otorii","Anamori-Inari","Tenkubashi",
      "Haneda Airport Terminal 3","Haneda Airport Terminal 1 & 2",
    ]},
  ],
  "Tokaido Shinkansen": [
    { name: "Kodama", ja: "こだま", color: "#0073CF", stops: null },
    { name: "Hikari", ja: "ひかり", color: "#f07000", stops: [
      "Tokyo","Shinagawa","Shin-Yokohama","Odawara","Shizuoka",
    ]},
    { name: "Nozomi", ja: "のぞみ", color: "#e83080", stops: [
      "Tokyo","Shinagawa","Shin-Yokohama","Shizuoka",
    ]},
  ],
  "Tohoku Shinkansen": [
    { name: "Nasuno", ja: "なすの", color: "#0073CF", stops: null },
    { name: "Yamabiko", ja: "やまびこ", color: "#f07000", stops: [
      "Tokyo","Ueno","Omiya","Utsunomiya",
    ]},
    { name: "Tsubasa", ja: "つばさ", color: "#9B59B6", stops: [
      "Tokyo","Ueno","Omiya","Utsunomiya",
    ]},
    { name: "Hayabusa", ja: "はやぶさ", color: "#00B261", stops: [
      "Tokyo","Ueno","Omiya",
    ]},
    { name: "Komachi", ja: "こまち", color: "#e83030", stops: [
      "Tokyo","Ueno","Omiya",
    ]},
  ],
  "Joetsu Shinkansen": [
    { name: "Tanigawa", ja: "たにがわ", color: "#0073CF", stops: null },
    { name: "Toki", ja: "とき", color: "#f07000", stops: [
      "Tokyo","Ueno","Omiya","Takasaki",
    ]},
  ],
};

// ── Branch definitions for lines with multiple routes ──
const LINE_BRANCHES = {
  'JR Tsurumi Line': [
    { name: 'Main Line', ja: '本線', color: '#00b900',
      stations: ['鶴見','国道','鶴見小野','弁天橋','浅野','安善','武蔵白石','浜川崎','昭和','扇町'] },
    { name: 'Umi-Shibaura', ja: '海芝浦支線', color: '#58a6ff',
      stations: ['鶴見','国道','鶴見小野','弁天橋','浅野','新芝浦','海芝浦'] },
    { name: 'Okawa', ja: '大川支線', color: '#f07000',
      stations: ['鶴見','国道','鶴見小野','弁天橋','浅野','安善','大川'] },
  ],
  'Tokyo Metro Marunouchi Line': [
    { name: 'Ogikubo', ja: '荻窪方面', color: '#e60012',
      stations: ['池袋','新大塚','茗荷谷','後楽園','本郷三丁目','御茶ノ水','淡路町','大手町','東京','銀座','霞ケ関','国会議事堂前','赤坂見附','四ツ谷','四谷三丁目','新宿御苑前','新宿三丁目','新宿','西新宿','中野坂上','新中野','東高円寺','新高円寺','南阿佐ケ谷','荻窪'] },
    { name: 'Honancho', ja: '方南町方面', color: '#f07800',
      stations: ['池袋','新大塚','茗荷谷','後楽園','本郷三丁目','御茶ノ水','淡路町','大手町','東京','銀座','霞ケ関','国会議事堂前','赤坂見附','四ツ谷','四谷三丁目','新宿御苑前','新宿三丁目','新宿','西新宿','中野坂上','中野新橋','中野富士見町','方南町'] },
  ],
  'JR Nambu Line': [
    { name: 'Tachikawa', ja: '立川方面', color: '#ffd400',
      stations: ['川崎','尻手','矢向','鹿島田','平間','向河原','武蔵小杉','武蔵中原','武蔵新城','武蔵溝ノ口','津田山','久地','宿河原','登戸','中野島','稲田堤','矢野口','稲城長沼','南多摩','府中本町','分倍河原','西府','谷保','矢川','西国立','立川'] },
    { name: 'Hamakawasaki', ja: '浜川崎方面', color: '#c8a048',
      stations: ['川崎','尻手','八丁畷','川崎新町','小田栄','浜川崎'] },
  ],
  // Keikyu Airport Line: from Haneda, trains split at Keikyu Kamata
  // toward Shinagawa (north) or Yokohama (south)
  'Keikyu Airport Line': [
    // From Haneda (start direction): split at Keikyu Kamata
    { name: 'Shinagawa', ja: '品川方面', color: '#e57053', direction: 'start',
      stations: ['泉岳寺','品川','北品川','新馬場','青物横丁','鮫洲','立会川','大森海岸','平和島','大森町','梅屋敷','京急蒲田','糀谷','大鳥居','穴守稲荷','天空橋','羽田空港国際線ターミナル','羽田空港国内線ターミナル'] },
    { name: 'Yokohama', ja: '横浜方面', color: '#1a8fe8', direction: 'start',
      stations: ['横浜','神奈川','仲木戸','神奈川新町','子安','京急新子安','生麦','花月園前','京急鶴見','鶴見市場','八丁畷','京急川崎','六郷土手','雑色','京急蒲田','糀谷','大鳥居','穴守稲荷','天空橋','羽田空港国際線ターミナル','羽田空港国内線ターミナル'] },
    // From Shinagawa side (end direction): only airport route (not Yokohama appendage)
    { name: 'Airport', ja: '羽田空港方面', color: '#1a8fe8', direction: 'end',
      stations: ['泉岳寺','品川','北品川','新馬場','青物横丁','鮫洲','立会川','大森海岸','平和島','大森町','梅屋敷','京急蒲田','糀谷','大鳥居','穴守稲荷','天空橋','羽田空港国際線ターミナル','羽田空港国内線ターミナル'] },
  ],
  // Tokaido through-running: line is reversed to south→north.
  // Northbound branches (direction:'end') diverge at Omiya/Ueno.
  // Southbound branches (direction:'start') represent train termini going toward Tokyo/beyond.
  'JR Tokaido Main Line': [
    // ── Northbound ──
    { name: 'Utsunomiya', ja: '宇都宮線', color: '#40d46e', direction: 'end',
      stations: ['静岡','東静岡','草薙','清水','興津','由比','蒲原','新蒲原','富士川','富士','吉原','東田子の浦','原','片浜','沼津','三島','函南','熱海','湯河原','真鶴','根府川','早川','小田原','鴨宮','国府津','二宮','大磯','平塚','茅ケ崎','辻堂','藤沢','大船','戸塚','横浜','川崎','品川','新橋','東京','上野','尾久','赤羽','浦和','さいたま新都心','大宮','土呂','東大宮','蓮田','白岡','新白岡','久喜','東鷲宮','栗橋','古河','野木','間々田','小山','小金井','自治医大','石橋','雀宮','宇都宮','岡本','宝積寺','氏家','蒲須坂','片岡','矢板','野崎','西那須野','那須塩原','黒磯'] },
    { name: 'Takasaki', ja: '高崎線', color: '#424d6d', direction: 'end',
      stations: ['静岡','東静岡','草薙','清水','興津','由比','蒲原','新蒲原','富士川','富士','吉原','東田子の浦','原','片浜','沼津','三島','函南','熱海','湯河原','真鶴','根府川','早川','小田原','鴨宮','国府津','二宮','大磯','平塚','茅ケ崎','辻堂','藤沢','大船','戸塚','横浜','川崎','品川','新橋','東京','上野','尾久','赤羽','浦和','さいたま新都心','大宮','宮原','上尾','北上尾','桶川','北本','鴻巣','北鴻巣','吹上','行田','熊谷','籠原','深谷','岡部','本庄','神保原','新町','倉賀野','高崎'] },
    { name: 'Joban', ja: '常磐線', color: '#009BBF', direction: 'end',
      stations: ['品川','東京','上野','日暮里','三河島','南千住','北千住','綾瀬','亀有','金町','松戸','北松戸','馬橋','新松戸','北小金','南柏','柏','北柏','我孫子','天王台','取手'] },
    // ── Southbound (destination-based, matching real signboards) ──
    { name: 'Tokyo', ja: '東京方面', color: '#F7A600', direction: 'start',
      stations: ['東京','上野','尾久','赤羽','浦和','さいたま新都心','大宮','土呂','東大宮','蓮田','白岡','新白岡','久喜','東鷲宮','栗橋','古河','野木','間々田','小山','小金井','自治医大','石橋','雀宮','宇都宮','岡本','宝積寺','氏家','蒲須坂','片岡','矢板','野崎','西那須野','那須塩原','黒磯','宮原','上尾','北上尾','桶川','北本','鴻巣','北鴻巣','吹上','行田','熊谷','籠原','深谷','岡部','本庄','神保原','新町','倉賀野','高崎'] },
    { name: 'Shinagawa', ja: '品川方面', color: '#009BBF', direction: 'start',
      stations: ['品川','東京','上野','日暮里','三河島','南千住','北千住','綾瀬','亀有','金町','松戸','北松戸','馬橋','新松戸','北小金','南柏','柏','北柏','我孫子','天王台','取手'] },
    { name: 'Odawara', ja: '小田原方面', color: '#F7A600', direction: 'start',
      stations: ['小田原','鴨宮','国府津','二宮','大磯','平塚','茅ケ崎','辻堂','藤沢','大船','戸塚','横浜','川崎','品川','新橋','東京','上野','尾久','赤羽','浦和','さいたま新都心','大宮','土呂','東大宮','蓮田','白岡','新白岡','久喜','東鷲宮','栗橋','古河','野木','間々田','小山','小金井','自治医大','石橋','雀宮','宇都宮','岡本','宝積寺','氏家','蒲須坂','片岡','矢板','野崎','西那須野','那須塩原','黒磯','宮原','上尾','北上尾','桶川','北本','鴻巣','北鴻巣','吹上','行田','熊谷','籠原','深谷','岡部','本庄','神保原','新町','倉賀野','高崎'] },
    { name: 'Atami', ja: '熱海方面', color: '#F7A600', direction: 'start',
      stations: ['熱海','湯河原','真鶴','根府川','早川','小田原','鴨宮','国府津','二宮','大磯','平塚','茅ケ崎','辻堂','藤沢','大船','戸塚','横浜','川崎','品川','新橋','東京','上野','尾久','赤羽','浦和','さいたま新都心','大宮','土呂','東大宮','蓮田','白岡','新白岡','久喜','東鷲宮','栗橋','古河','野木','間々田','小山','小金井','自治医大','石橋','雀宮','宇都宮','岡本','宝積寺','氏家','蒲須坂','片岡','矢板','野崎','西那須野','那須塩原','黒磯','宮原','上尾','北上尾','桶川','北本','鴻巣','北鴻巣','吹上','行田','熊谷','籠原','深谷','岡部','本庄','神保原','新町','倉賀野','高崎'] },
    // Local Tokaido service south of Atami (auto-selects, no picker shown from these stations)
    { name: 'Shizuoka', ja: '静岡方面', color: '#F7A600', direction: 'start',
      stations: ['静岡','東静岡','草薙','清水','興津','由比','蒲原','新蒲原','富士川','富士','吉原','東田子の浦','原','片浜','沼津','三島','函南','熱海'] },
  ],
};

// ── Line display name overrides by direction ──
// At northern through-running stations, southbound Tokaido is branded "Ueno Tokyo Line"
const LINE_DISPLAY_OVERRIDE = {
  'JR Tokaido Main Line': [
    { direction: 'start', afterJa: '東京', name: 'Ueno Tokyo Line' },
    { direction: 'end',   afterJa: '東京', name: 'Ueno Tokyo Line', inclusive: true },
  ],
};

// ── Station Aliases (physically connected stations with different names) ──
const STATION_ALIASES = {
  "Mizonokuchi":                ["Musashi-Mizonokuchi"],
  "Musashi-Mizonokuchi":        ["Mizonokuchi"],
  "Harajuku":                   ["Meiji-jingumae 'Harajuku'"],
  "Meiji-jingumae 'Harajuku'":  ["Harajuku"],
  "Tamachi":                    ["Mita"],
  "Mita":                       ["Tamachi"],
  "Daimon":                     ["Hamamatsucho"],
  "Hamamatsucho":               ["Daimon"],
};

// Walkable connections — stations linked by walkway, not rail transfer.
// Only affects getPlatforms (roll-again), NOT transfer checks mid-route.
// One-way: Higashi-Narita can access Terminal 2 lines, but not vice versa
const WALKABLE_STATIONS = {
  "Higashi-Narita":             ["Airport Second Building (NRT Terminal 2)"],
};
