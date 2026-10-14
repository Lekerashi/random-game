// ── Express Services (no-extra-fare only) ─────────────────────────────────
// stops: null = all stations (local); array = station names that this type stops at
// schedule: optional day-of-week overrides — keys are schedule types ('weekday'|'weekend')
//   { skip: [...] } = remove these stations from stops for that schedule
//   { stops: [...] } = completely replace the stop list for that schedule
//   { timeRange: [start, end] | [[s, e], ...] } = only in these hours (at the origin terminal)
// direction: optional 'start'|'end' — a one-way service, running toward that end only.
//   Same-name entries with different directions or stop lists give per-direction /
//   per-segment hours (they share one button).
const EXPRESS_SERVICES = {
  "Seibu Shinjuku Line": [
    { name: "Local", ja: "各停", color: "#00a0e8", stops: null },
    { name: "Semi-Exp", ja: "準急", color: "#00b900", stops: [
      "西武新宿","高田馬場","鷺ノ宮","上石神井",
      "武蔵関","東伏見","西武柳沢","田無",
      "花小金井","小平","久米川","東村山",
      "所沢","航空公園","新所沢","入曽",
      "狭山市","新狭山","南大塚","本川越",
    ], schedule: { weekday: { timeRange: [16, 10] }, weekend: { timeRange: [16, 10] } } }, // not by day
    { name: "Express", ja: "急行", color: "#e83030", stops: [
      "西武新宿","高田馬場","鷺ノ宮","上石神井",
      "田無","花小金井","小平","久米川",
      "東村山","所沢","航空公園","新所沢",
      "入曽","狭山市","新狭山","南大塚","本川越",
    ]},
  ],
  "JR Chuo Line": [
    { name: "Rapid", ja: "快速", color: "#00b900", stops: null,
      schedule: { weekend: { skip: ["高円寺", "阿佐ケ谷", "西荻窪"] } } },
    // Weekday 中央特快 pause in the rush (通勤快速 westbound in the evening, 通勤特快
    // eastbound in the morning); all day on weekends
    { name: "Chuo Sp. Rapid", ja: "中央特快", color: "#f07000", direction: "end", stops: [
      "東京","神田","御茶ノ水","四ツ谷","新宿",
      "中野","三鷹","国分寺","立川",
      "日野","豊田","八王子","西八王子","高尾",
      "相模湖","藤野","上野原","四方津","梁川",
      "鳥沢","猿橋","大月","初狩","笹子",
      "甲斐大和","勝沼ぶどう郷","塩山","東山梨",
      "山梨市","春日居町","石和温泉","酒折","甲府",
    ], schedule: { weekday: { timeRange: [[6, 7], [9, 17], [22, 24]] } } },
    { name: "Chuo Sp. Rapid", ja: "中央特快", color: "#f07000", direction: "start", stops: [
      "東京","神田","御茶ノ水","四ツ谷","新宿",
      "中野","三鷹","国分寺","立川",
      "日野","豊田","八王子","西八王子","高尾",
      "相模湖","藤野","上野原","四方津","梁川",
      "鳥沢","猿橋","大月","初狩","笹子",
      "甲斐大和","勝沼ぶどう郷","塩山","東山梨",
      "山梨市","春日居町","石和温泉","酒折","甲府",
    ], schedule: { weekday: { timeRange: [[5, 7], [9, 23]] } } },
    // Westbound only, weekday evenings; 5 a day run on to 大月 (all stations past 高尾)
    { name: "Commuter Rapid", ja: "通勤快速", color: "#e83030", direction: "end", stops: [
      "東京","神田","御茶ノ水","四ツ谷","新宿",
      "中野","荻窪","吉祥寺","三鷹","国分寺","立川",
      "日野","豊田","八王子","西八王子","高尾",
      "相模湖","藤野","上野原","四方津","梁川",
      "鳥沢","猿橋","大月",
    ], schedule: { weekend: { stops: [] }, weekday: { timeRange: [17, 22] } } },
  ],
  "Tokyo Metro Fukutoshin Line": [
    { name: "Local", ja: "各停", color: "#00a0e8", stops: null },
    { name: "Express", ja: "急行", color: "#e83030", stops: [
      "和光市","小竹向原","池袋","新宿三丁目",
      "明治神宮前〈原宿〉","渋谷",
    ]},
    { name: "F-Liner", ja: "Fライナー", color: "#e83030", stops: [
      "和光市","小竹向原","池袋","新宿三丁目",
      "明治神宮前〈原宿〉","渋谷",
    ], schedule: { weekday: { timeRange: [9, 17] }, weekend: { timeRange: [9, 17] } } }, // daytime only
  ],
  "Seibu Ikebukuro Line": [
    { name: "Local", ja: "各停", color: "#00a0e8", stops: null },
    { name: "Semi-Exp", ja: "準急", color: "#00b900", stops: [
      "池袋","練馬","石神井公園","大泉学園","保谷","ひばりヶ丘",
      "東久留米","清瀬","秋津","所沢",
      "西所沢","小手指","狭山ヶ丘","武蔵藤沢",
      "稲荷山公園","入間市","仏子","元加治","飯能",
    ]},
    { name: "Express", ja: "急行", color: "#e83030", stops: [
      "池袋","石神井公園","ひばりヶ丘","所沢",
      "西所沢","小手指","狭山ヶ丘","武蔵藤沢",
      "稲荷山公園","入間市","仏子","元加治","飯能",
    ]},
    // 快速急行 omitted: none leave 池袋 since the F-Liner took over (one weekday up train)
  ],
  "Keio Line": [
    { name: "Local", ja: "各停", color: "#00a0e8", stops: null },
    // 区間急行 run Toei ↔ Sagamihara Line since 2025-03 (connection express); only
    // 4 weekday-morning up trains stay on the main line west of 調布, so none here
    // Weekday mornings/evenings only since 2013 (a lone weekend pair is ignored)
    { name: "Express", ja: "急行", color: "#e83030", stops: [
      "新宿","笹塚","明大前","桜上水","千歳烏山",
      "つつじヶ丘","調布","東府中","府中",
      "分倍河原","聖蹟桜ヶ丘","高幡不動",
      "北野","京王八王子",
    ], schedule: { weekday: { timeRange: [16, 10] }, weekend: { stops: [] } } },
    { name: "Ltd. Express", ja: "特急", color: "#e83080", stops: [
      "新宿","笹塚","明大前","千歳烏山",
      "調布","府中","分倍河原",
      "聖蹟桜ヶ丘","高幡不動","北野","京王八王子",
    ]},
  ],
  // Local-only so through-running to the Keio Line / Toei keeps a Local type
  // beside the target line's expresses (all New Line trains stop everywhere)
  "Keio new line": [
    { name: "Local", ja: "各停", color: "#00a0e8", stops: null },
  ],
  "Keio Inokashira line": [
    { name: "Local", ja: "各停", color: "#00a0e8", stops: null },
    { name: "Express", ja: "急行", color: "#e83030", stops: [
      "渋谷","下北沢","明大前","永福町","久我山",
      "吉祥寺",
    ]},
  ],
  "Odakyu Line": [
    { name: "Local", ja: "各停", color: "#00a0e8", stops: null },
    // 準急 omitted: every one is a Chiyoda Line through train (connection express)
    { name: "Express", ja: "急行", color: "#e83030", stops: [
      "新宿","代々木上原","下北沢","経堂","成城学園前",
      "登戸","向ヶ丘遊園","新百合ヶ丘","町田","相模大野",
      "海老名","本厚木","愛甲石田","伊勢原","鶴巻温泉",
      "東海大学前","秦野","渋沢","新松田",
      "開成","栢山","富水","螢田","足柄","小田原",
    ]},
    { name: "Rapid Exp", ja: "快速急行", color: "#f07000", stops: [
      "新宿","代々木上原","下北沢","登戸","新百合ヶ丘",
      "町田","相模大野","海老名","本厚木","愛甲石田","伊勢原",
      "鶴巻温泉","東海大学前","秦野","渋沢",
      "新松田","開成","栢山","富水","螢田","足柄","小田原", // all stations past 新松田 since 2022
    ]},
  ],
  "Tokyu Toyoko Line": [
    { name: "Local", ja: "各停", color: "#00a0e8", stops: null },
    { name: "Express", ja: "急行", color: "#e83030", stops: [
      "渋谷","中目黒","学芸大学","自由が丘","田園調布",
      "多摩川","武蔵小杉","日吉","綱島","菊名","横浜",
    ]},
    // Weekday 特急 run by day only (通勤特急 at other times)
    { name: "Ltd. Express", ja: "特急", color: "#e83080", stops: [
      "渋谷","中目黒","自由が丘","武蔵小杉",
      "菊名","横浜",
    ], schedule: { weekday: { timeRange: [10, 16] }, weekend: { timeRange: [7, 22] } } },
  ],
  "Tokyu Meguro Line": [
    { name: "Local", ja: "各停", color: "#00a0e8", stops: null },
    { name: "Express", ja: "急行", color: "#e83030", stops: [
      "目黒","武蔵小山","大岡山","田園調布",
      "多摩川","武蔵小杉","日吉",
    ]},
  ],
  "Toei Shinjuku Line": [
    { name: "Local", ja: "各停", color: "#00a0e8", stops: null },
    // Daytime 急行 ended 2023: a few morning and evening trains only
    { name: "Express", ja: "急行", color: "#e83030", stops: [
      "新宿","市ヶ谷","神保町","馬喰横山",
      "森下","大島","船堀","本八幡",
    ], schedule: { weekday: { timeRange: [[7, 10], [17, 22]] }, weekend: { timeRange: [[7, 11], [16, 22]] } } },
  ],
  // 快速 run all day both ways and continue as locals onto Toyo Rapid / Chuo-Sobu.
  // 通勤快速 omitted (one-way, weekday mornings toward Nakano).
  "Tokyo Metro Tozai Line": [
    { name: "Local", ja: "各停", color: "#00a0e8", stops: null },
    { name: "Rapid", ja: "快速", color: "#00b900", stops: [
      "中野","落合","高田馬場","早稲田","神楽坂","飯田橋","九段下","竹橋",
      "大手町","日本橋","茅場町","門前仲町","木場","東陽町","浦安","西船橋",
    ]},
  ],
  "Tokyu Den-en-toshi Line": [
    { name: "Local", ja: "各停", color: "#00a0e8", stops: null },
    { name: "Semi-Exp", ja: "準急", color: "#00b900", stops: [
      "渋谷","池尻大橋","三軒茶屋","駒沢大学",
      "桜新町","用賀","二子玉川","溝の口","鷺沼",
      "たまプラーザ","あざみ野","青葉台","長津田","つくし野","すずかけ台",
      "南町田グランベリーパーク","つきみ野","中央林間",
    ]},
    // No weekday 急行 toward 渋谷 in the morning rush, and since 2026-03 準急 replace
    // them weekday 18–20h toward 中央林間 and weekend 9–14h toward 渋谷
    { name: "Express", ja: "急行", color: "#e83030", direction: "start", stops: [
      "渋谷","三軒茶屋","二子玉川","溝の口","鷺沼",
      "たまプラーザ","あざみ野","青葉台","長津田","南町田グランベリーパーク",
      "中央林間",
    ], schedule: { weekday: { timeRange: [9, 6] }, weekend: { timeRange: [[5, 9], [14, 24]] } } },
    { name: "Express", ja: "急行", color: "#e83030", direction: "end", stops: [
      "渋谷","三軒茶屋","二子玉川","溝の口","鷺沼",
      "たまプラーザ","あざみ野","青葉台","長津田","南町田グランベリーパーク",
      "中央林間",
    ], schedule: { weekday: { timeRange: [[5, 18], [20, 24]] } } },
  ],
  "Tobu Tojo Line": [
    { name: "Local", ja: "各停", color: "#00a0e8", stops: null },
    // 2023 revision: all services local between Kawagoe and Ogawamachi
    { name: "Semi-Exp", ja: "準急", color: "#00b900", stops: [
      "池袋","上板橋","成増","和光市","朝霞","朝霞台",
      "志木","柳瀬川","みずほ台","鶴瀬","ふじみ野","上福岡",
      "新河岸","川越","川越市","霞ヶ関","鶴ヶ島","若葉",
      "坂戸","北坂戸","高坂","東松山","森林公園",
      "つきのわ","武蔵嵐山","小川町",
    ]},
    { name: "Express", ja: "急行", color: "#e83030", stops: [
      "池袋","成増","和光市","朝霞","朝霞台","志木","ふじみ野",
      "川越","川越市","霞ヶ関","鶴ヶ島","若葉",
      "坂戸","北坂戸","高坂","東松山","森林公園",
      "つきのわ","武蔵嵐山","小川町",
    ]},
    { name: "Rapid Exp", ja: "快速急行", color: "#f07000", stops: [
      "池袋","和光市","朝霞台",
      "川越","川越市","霞ヶ関","鶴ヶ島","若葉",
      "坂戸","北坂戸","高坂","東松山","森林公園",
      "つきのわ","武蔵嵐山","小川町",
    ], schedule: { weekday: { timeRange: [6, 10] }, weekend: { timeRange: [6, 10] } } }, // a few morning trains (F-Liner by day)
    // No-extra-fare 川越特急: mostly up trains, twice an hour from late afternoon
    // (only ~3 down trains, late morning — can't gate by direction, so evening only)
    { name: "Kawagoe Ltd. Exp", ja: "川越特急", color: "#c8102e", stops: [
      "池袋","朝霞台","川越","川越市","坂戸","東松山","森林公園",
      "つきのわ","武蔵嵐山","小川町",
    ],
      schedule: { weekday: { timeRange: [16, 23] }, weekend: { timeRange: [16, 21] } } },
  ],
  "Tobu Isesaki Line": [
    { name: "Local", ja: "各停", color: "#00a0e8", stops: null },
    { name: "Sub-Exp", ja: "区間急行", color: "#f0c000", stops: [
      "浅草","とうきょうスカイツリー","曳舟","東向島",
      "鐘ヶ淵","堀切","牛田","北千住","西新井","草加",
      "新越谷","越谷","せんげん台","春日部",
      "東武動物公園","和戸","久喜","鷲宮",
      "花崎","加須","南羽生","羽生","川俣","茂林寺前",
      "館林",
    ],
      // Rush/early-late only: gone 10–16h weekdays, 10–20h weekends (wrapping ranges)
      schedule: { weekday: { timeRange: [17, 10] }, weekend: { timeRange: [21, 10] } } },
    // Rush hours only (mornings and evenings, both ways)
    { name: "Sec. Semi-Exp", ja: "区間準急", color: "#7fbf3f", stops: [
      "浅草","とうきょうスカイツリー","曳舟","東向島",
      "鐘ヶ淵","堀切","牛田","北千住","西新井","草加",
      "新越谷","越谷","北越谷","大袋","せんげん台",
      "武里","一ノ割","春日部","北春日部","姫宮",
      "東武動物公園","和戸","久喜",
    ],
      schedule: { weekday: { timeRange: [16, 10] }, weekend: { timeRange: [16, 10] } } },
    { name: "Semi-Exp", ja: "準急", color: "#00b900", stops: [
      "押上(スカイツリー前)","曳舟","北千住","西新井","草加",
      "新越谷","越谷","北越谷","大袋","せんげん台",
      "武里","一ノ割","春日部","北春日部","姫宮",
      "東武動物公園","和戸","久喜",
    ], schedule: { weekday: { timeRange: [20, 10] }, weekend: { timeRange: [20, 10] } } }, // early morning and night
    { name: "Express", ja: "急行", color: "#e83030", stops: [
      "押上(スカイツリー前)","曳舟","北千住","西新井","草加",
      "新越谷","越谷","せんげん台","春日部",
      "東武動物公園","和戸","久喜",
    ]},
  ],
  // Urban Park Line: daytime 急行 run Omiya–Funabashi every 30 min (reversing at
  // Kashiwa); mornings/evenings they cover Kashiwa–Funabashi only.
  "Tobu Noda line": [
    { name: "Local", ja: "普通", color: "#00a0e8", stops: null },
    { name: "Express", ja: "急行", color: "#e83030", stops: [
      "大宮","岩槻","春日部","藤の牛島","南桜井","川間","七光台","清水公園",
      "愛宕","野田市","梅郷","運河","流山おおたかの森","柏","高柳","新鎌ヶ谷","船橋",
    ],
      schedule: { weekday: { timeRange: [9, 16] }, weekend: { timeRange: [9, 17] } } },
    { name: "Express", ja: "急行", color: "#e83030", stops: [
      "柏","高柳","新鎌ヶ谷","船橋",
    ],
      schedule: { weekday: { timeRange: [[6, 9], [16, 23]] }, weekend: { timeRange: [[6, 9], [17, 23]] } } },
  ],
  "Keisei Main Line": [
    { name: "Local", ja: "各停", color: "#00a0e8", stops: null },
    { name: "Rapid", ja: "快速", color: "#00b900", stops: [
      "京成上野","日暮里","千住大橋","青砥","京成高砂",
      "京成小岩","京成八幡","東中山","京成船橋",
      "船橋競馬場","京成津田沼","京成大久保",
      "実籾","八千代台","京成大和田","勝田台","志津",
      "ユーカリが丘","京成臼井","京成佐倉","大佐倉",
      "京成酒々井","宗吾参道","公津の杜","京成成田",
      "空港第２ビル（第２旅客ターミナル）","成田空港（第１旅客ターミナル）",
    ]},
    // No-extra-fare 特急: no daytime service since 2022 (mornings and evenings, both ways)
    { name: "Ltd. Express", ja: "特急", color: "#e83030", stops: [
      "京成上野","日暮里","青砥","京成高砂","京成八幡",
      "京成船橋","京成津田沼","八千代台","勝田台",
      "京成佐倉","大佐倉","京成酒々井","宗吾参道","公津の杜","京成成田",
      "空港第２ビル（第２旅客ターミナル）","成田空港（第１旅客ターミナル）",
    ],
      schedule: { weekday: { timeRange: [15, 11] }, weekend: { timeRange: [17, 10] } } },
    { name: "Rapid Ltd", ja: "快速特急", color: "#f07000", stops: [
      "京成上野","日暮里","青砥","京成高砂","京成八幡",
      "京成船橋","京成津田沼","八千代台","勝田台",
      "京成佐倉","京成成田",
      "空港第２ビル（第２旅客ターミナル）","成田空港（第１旅客ターミナル）",
    ]},
  ],
  "Keikyu Main Line": [
    { name: "Local", ja: "各停", color: "#00a0e8", stops: null },
    { name: "Ltd. Express", ja: "特急", color: "#e84040", stops: [
      "泉岳寺","品川","青物横丁","平和島","京急蒲田",
      "京急川崎","神奈川新町","横浜",
      "上大岡","金沢文庫","金沢八景",
      "追浜","汐入","横須賀中央","堀ノ内",
      "京急大津","馬堀海岸","浦賀",
    ]},
    { name: "Rapid Ltd. Exp", ja: "快特", color: "#e83080", stops: [
      "泉岳寺","品川","京急蒲田","京急川崎","横浜",
      "上大岡","金沢文庫","金沢八景","横須賀中央",
      "堀ノ内","浦賀",
    ]},
  ],
  // Keikyu Airport Line express handled entirely by connection express (data-connections.js)
  "JR Shonan Shinjuku Line": [
    { name: "Local", ja: "各停", color: "#00a0e8", stops: null },
    { name: "Rapid", ja: "快速", color: "#00b900", stops: [
      "大宮","浦和","赤羽","池袋","新宿","渋谷",
      "恵比寿","大崎","武蔵小杉","横浜","戸塚","大船",
    ]},
    { name: "Special Rapid", ja: "特別快速", color: "#e83080", stops: [
      "大宮","浦和","赤羽","池袋","新宿","渋谷",
      "大崎","武蔵小杉","横浜","戸塚","大船",
    ]},
  ],
  "Keisei Oshiage Line": [
    { name: "Local", ja: "各停", color: "#00a0e8", stops: null },
    { name: "Ltd. Express", ja: "特急", color: "#f07000", stops: [
      "押上(スカイツリー前)","青砥","京成高砂",
    ]},
  ],
  "Tokaido Shinkansen": [
    { name: "Kodama", ja: "こだま", color: "#0073CF", stops: null },
    { name: "Hikari", ja: "ひかり", color: "#f07000", stops: [
      "東京","品川","新横浜","小田原","静岡",
    ]},
    { name: "Nozomi", ja: "のぞみ", color: "#e83080", stops: [
      "東京","品川","新横浜","静岡",
    ]},
  ],
  "Tohoku Shinkansen": [
    { name: "Nasuno", ja: "なすの", color: "#0073CF", stops: null },
    { name: "Yamabiko", ja: "やまびこ", color: "#f07000", stops: [
      "東京","上野","大宮","宇都宮",
    ]},
    { name: "Tsubasa", ja: "つばさ", color: "#9B59B6", stops: [
      "東京","上野","大宮","宇都宮",
    ]},
    { name: "Hayabusa", ja: "はやぶさ", color: "#00B261", stops: [
      "東京","上野","大宮",
    ]},
    { name: "Komachi", ja: "こまち", color: "#e83030", stops: [
      "東京","上野","大宮",
    ]},
  ],
  "Joetsu Shinkansen": [
    { name: "Tanigawa", ja: "たにがわ", color: "#0073CF", stops: null },
    { name: "Toki", ja: "とき", color: "#f07000", stops: [
      "東京","上野","大宮","高崎",
    ]},
  ],
  "JR Nambu Line": [
    { name: "Local", ja: "各停", color: "#00a0e8", stops: null },
    { name: "Rapid", ja: "快速", color: "#00b900", stops: [
      "川崎","鹿島田","武蔵小杉","武蔵中原",
      "武蔵新城","武蔵溝ノ口","登戸","稲田堤",
      "稲城長沼","府中本町","分倍河原","立川",
    ], schedule: { weekday: { timeRange: [10, 17] }, weekend: { timeRange: [9, 17] } } }, // daytime
  ],
  "JR Saikyo Line": [
    { name: "Local", ja: "各停", color: "#00a0e8", stops: null },
    { name: "Rapid", ja: "快速", color: "#00b900", stops: [
      "大崎","恵比寿","渋谷","新宿","池袋","板橋","十条",
      "赤羽","戸田公園","武蔵浦和","中浦和","南与野","与野本町","北与野","大宮",
    ],
      // Weekday evenings run 通勤快速 instead of 快速
      schedule: { weekday: { timeRange: [5, 17] } } },
    { name: "Commuter Rapid", ja: "通勤快速", color: "#e83030", stops: [
      "大崎","恵比寿","渋谷","新宿","池袋","板橋","十条",
      "赤羽","武蔵浦和","大宮",
    ],
      // Weekdays, both directions, mornings (6–10h) and evenings (16–22h)
      schedule: { weekend: { stops: [] }, weekday: { timeRange: [16, 10] } } },
  ],
  "Tsukuba Express": [
    { name: "Local", ja: "普通", color: "#00a0e8", stops: null },
    { name: "Sec. Rapid", ja: "区間快速", color: "#f0c000", stops: [
      "秋葉原","新御徒町","浅草","南千住","北千住","八潮","三郷中央",
      "南流山","流山おおたかの森","柏の葉キャンパス","守谷",
      "みらい平","みどりの","万博記念公園","研究学園","つくば",
    ]},
    { name: "Rapid", ja: "快速", color: "#00b900", stops: [
      "秋葉原","新御徒町","浅草","南千住","北千住","八潮",
      "南流山","流山おおたかの森","守谷","つくば",
    ]},
    // 通勤快速 omitted: one-way (toward Tsukuba) weekday evenings only
  ],
  "Tokyu Oimachi Line": [
    { name: "Local", ja: "各停", color: "#00a0e8", stops: null },
    { name: "Express", ja: "急行", color: "#e83030", stops: [
      "大井町","旗の台","大岡山","自由が丘","二子玉川","溝の口",
    ]},
  ],
  // 快速 run ~10:30–15:30 daily, both ways (御徒町 weekends only). The Negishi
  // through-running version is connection express (data-connections.js).
  "JR Keihin Tohoku Line": [
    { name: "Local", ja: "各停", color: "#00a0e8", stops: null },
    { name: "Rapid", ja: "快速", color: "#00b900", stops: [
      "大宮","さいたま新都心","与野","北浦和","浦和",
      "南浦和","蕨","西川口","川口","赤羽",
      "東十条","王子","上中里","田端","上野",
      "御徒町","秋葉原","神田","東京",
      "浜松町","田町","高輪ゲートウェイ","品川",
      "大井町","大森","蒲田","川崎","鶴見",
      "新子安","東神奈川","横浜",
    ],
      schedule: { weekday: { skip: ["御徒町"], timeRange: [10, 16] }, weekend: { timeRange: [10, 16] } } },
  ],
  // 快速 (daytime, both ways) skip 大口/小机/十日市場/成瀬/古淵/淵野辺/矢部
  "JR Yokohama Line": [
    { name: "Local", ja: "各停", color: "#00a0e8", stops: null },
    { name: "Rapid", ja: "快速", color: "#00b900", stops: [
      "東神奈川","菊名","新横浜","鴨居","中山",
      "長津田","町田","相模原","橋本",
      "相原","八王子みなみ野","片倉","八王子",
    ],
      schedule: { weekday: { timeRange: [9, 16] }, weekend: { timeRange: [9, 18] } } },
  ],
  // 快速 in the 6–7, 9–15 (16 weekends) and 20h hours since 2024-09; 通勤快速 abolished March 2024
  "JR Keiyo Line": [
    { name: "Local", ja: "各停", color: "#00a0e8", stops: null },
    { name: "Rapid", ja: "快速", color: "#00b900", stops: [
      "東京","八丁堀","新木場","舞浜","新浦安","南船橋",
      "海浜幕張","検見川浜","稲毛海岸","千葉みなと","蘇我",
    ],
      schedule: { weekday: { timeRange: [[6, 8], [9, 16], [20, 21]] }, weekend: { timeRange: [[6, 8], [9, 17], [20, 21]] } } },
  ],
  // Yokohama Municipal Subway 快速 (every 30 min, both ways)
  "Blue Line": [
    { name: "Local", ja: "普通", color: "#00a0e8", stops: null },
    { name: "Rapid", ja: "快速", color: "#00b900", stops: [
      "あざみ野","中川","センター北","センター南","仲町台","新羽","新横浜",
      "横浜","桜木町","関内","上大岡","上永谷","戸塚",
      "踊場","中田","立場","下飯田","湘南台",
    ],
      schedule: { weekday: { timeRange: [10, 17] }, weekend: { timeRange: [9, 21] } } },
  ],
  "Sotetsu Main Line": [
    { name: "Local", ja: "各停", color: "#00a0e8", stops: null },
    // Toward 横浜 no 快速 on weekday mornings (通勤急行 instead)
    { name: "Rapid", ja: "快速", color: "#00b900", direction: "start", stops: [
      "横浜","星川","西谷","鶴ヶ峰","二俣川","希望ヶ丘","三ツ境","瀬谷",
      "大和","相模大塚","さがみ野","かしわ台","海老名",
    ], schedule: { weekday: { timeRange: [9, 5] } } },
    { name: "Rapid", ja: "快速", color: "#00b900", direction: "end", stops: [
      "横浜","星川","西谷","鶴ヶ峰","二俣川","希望ヶ丘","三ツ境","瀬谷",
      "大和","相模大塚","さがみ野","かしわ台","海老名",
    ]},
    // Daytime, plus evening trains from 横浜 since 2025-03
    { name: "Ltd. Express", ja: "特急", color: "#e83080", stops: [
      "横浜","西谷","二俣川","大和","海老名",
    ], schedule: { weekday: { timeRange: [7, 21] }, weekend: { timeRange: [7, 21] } } },
    // 急行 abolished 2023; 通勤特急/通勤急行 omitted (weekday-morning, toward Yokohama only).
    // Izumino Line: 快速 is all-stations there, so it stays Local-only.
  ],
};

// ── Branch definitions for lines with multiple routes ──
const LINE_BRANCHES = {
  'JR Tsurumi Line': [
    { name: 'Main Line', ja: '本線', color: '#00b900',
      stations: ['鶴見','国道','鶴見小野','弁天橋','浅野','安善','武蔵白石','浜川崎','昭和','扇町'] },
    { name: 'Umi-Shibaura', ja: '海芝浦支線', color: '#58a6ff',
      stations: ['鶴見','国道','鶴見小野','弁天橋','浅野','新芝浦','海芝浦'] },
    // No 大川 trains by day (9–16h); weekends 2 morning + 1 evening round trips
    { name: 'Okawa', ja: '大川支線', color: '#f07000',
      stations: ['鶴見','国道','鶴見小野','弁天橋','浅野','安善','大川'],
      schedule: { weekday: { timeRange: [17, 9] }, weekend: { timeRange: [[6, 9], [17, 19]] } } },
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
  // (Keikyu Airport and Tokaido through-running now handled by LINE_CONNECTIONS)
};

// ── Line destinations (trains terminating at different stations on the same line) ──
const LINE_DESTINATIONS = {
  'JR Chuo Line': {
    direction: 'end',  // only when heading toward end (west)
    destinations: [
      { until: '武蔵小金井', name: 'Musashi-Koganei', ja: '武蔵小金井方面', color: '#8bc34a' },
      { until: '立川',       name: 'Tachikawa',       ja: '立川方面',       color: '#4caf50' },
      { until: '豊田',       name: 'Toyoda',           ja: '豊田方面',       color: '#009688' },
      { until: '八王子',     name: 'Hachioji',         ja: '八王子方面',     color: '#00796b' },
      { until: '高尾',       name: 'Takao',            ja: '高尾方面',       color: '#E85B0B' },
      { until: '大月',       name: 'Otsuki',           ja: '大月方面',       color: '#bf360c' },
    ],
  },
  // From 取手 trains end at 守谷 or 水海道; some run on to 下館
  'Kanto Railway Joso Line': {
    direction: 'end',  // away from Toride
    destinations: [
      { until: '守谷',   name: 'Moriya',     ja: '守谷方面',   color: '#4aa3d8' },
      { until: '水海道', name: 'Mitsukaido', ja: '水海道方面', color: '#2a7fb8' },
      { until: '下館',   name: 'Shimodate',  ja: '下館方面',   color: '#1a5a88' },
    ],
  },
  'JR Ome Line': {
    direction: 'end',  // heading toward end (toward Oku-Tama)
    destinations: [
      { until: '拝島', name: 'Haijima', ja: '拝島方面', color: '#b8a060' },
      { until: '河辺', name: 'Kabe',    ja: '河辺方面', color: '#8a7040' },
      { until: '青梅', name: 'Ome',     ja: '青梅方面', color: '#6a5020' },
    ],
  },
  'JR Sagami Line': {
    direction: 'start',  // heading toward start (toward Chigasaki)
    destinations: [
      { until: '海老名', name: 'Ebina',     ja: '海老名方面', color: '#6a9a8a' },
      { until: '茅ケ崎', name: 'Chigasaki', ja: '茅ケ崎方面', color: '#4a786f' },
    ],
  },
  'JR Nambu Line': {
    direction: 'end',  // heading toward end (toward Tachikawa on main branch)
    destinations: [
      { until: '武蔵中原',   name: 'Musashi-Nakahara',   ja: '武蔵中原方面',   color: '#ffe040' },
      { until: '武蔵溝ノ口', name: 'Musashi-Mizonokuchi', ja: '武蔵溝ノ口方面', color: '#e8c830' },
      { until: '登戸',       name: 'Noborito',           ja: '登戸方面',       color: '#d0b020' },
      { until: '稲城長沼',   name: 'Inagi-Naganuma',     ja: '稲城長沼方面',   color: '#b89810' },
      { until: '立川',       name: 'Tachikawa',          ja: '立川方面',       color: '#ffd400' },
    ],
  },
};

// ── Station Aliases (physically connected stations with different names) ──
const STATION_ALIASES = {
  "Mizonokuchi":                ["Musashi-Mizonokuchi"],
  "Musashi-Mizonokuchi":        ["Mizonokuchi"],
  "Harajuku":                   ["Meiji-jingumae 'Harajuku'"],
  "Meiji-jingumae 'Harajuku'":  ["Harajuku"],
  "Resort Gateway":             ["Maihama"],   // Disney Resort Line, a short walk from JR Maihama
  "Maihama":                    ["Resort Gateway"],
  "Tamachi":                    ["Mita"],
  "Mita":                       ["Tamachi"],
  "Daimon":                     ["Hamamatsucho"],
  "Hamamatsucho":               ["Daimon"],
  "Itabashi":                   ["Shin-Itabashi"],
  "Shin-Itabashi":              ["Itabashi"],
  // Tokyo Sakura Tram "-ekimae" stops next to train stations
  "Otsuka-ekimae":              ["Otsuka"],
  "Otsuka":                     ["Otsuka-ekimae"],
  "Oji-ekimae":                 ["Oji"],
  "Oji":                        ["Oji-ekimae"],
  "Machiya-ekimae":             ["Machiya"],
  "Machiya":                    ["Machiya-ekimae"],
  // Keikyu's one Haneda domestic station sits under both monorail terminals
  "Haneda Airport Terminal 1 & 2": ["Haneda Airport Terminal 1", "Haneda Airport Terminal 2"],
  "Haneda Airport Terminal 1":     ["Haneda Airport Terminal 1 & 2"],
  "Haneda Airport Terminal 2":     ["Haneda Airport Terminal 1 & 2"],
};

// Lines that share one physical platform per direction at these stations (JA).
// Their platforms merge into one dice slot; the roll then picks a random train.
// Only same-direction platforms merge (same first common station ahead). `splitAt`:
// the lines diverge right after the shared platform with no common station ahead,
// so the first common station behind counts too.
const SHARED_TRACKS = [
  { lines: ['JR Yokosuka Line', 'JR Shonan Shinjuku Line', 'Sotetsu-JR Direct Line'],
    stations: ['大崎', '西大井', '武蔵小杉', '新川崎', '横浜', '保土ケ谷', '東戸塚', '戸塚'],
    splitAt: ['西大井', '武蔵小杉'] },
  { lines: ['JR Saikyo Line', 'JR Shonan Shinjuku Line'],
    stations: ['恵比寿', '渋谷', '新宿'] },
  { lines: ['Utsunomiya Line', 'JR Takasaki Line'],
    stations: ['上野', '尾久', '赤羽', '浦和', 'さいたま新都心', '大宮'] },
  { lines: ['Tokyo Metro Yurakucho Line', 'Tokyo Metro Fukutoshin Line'],
    stations: ['和光市', '地下鉄成増', '地下鉄赤塚', '平和台', '氷川台', '小竹向原'] },
  { lines: ['Tokyo Metro Namboku Line', 'Toei Mita Line'],
    stations: ['白金台', '目黒'] },
  { lines: ['Tokyu Den-en-toshi Line', 'Tokyu Oimachi Line'],
    stations: ['二子新地', '高津'] },
  { lines: ['Keisei Main Line', 'Narita Sky Access', 'Hokuso Railway Hokuso Line'],
    stations: ['京成上野', '日暮里', '青砥', '京成高砂', '東松戸', '新鎌ヶ谷', '千葉ニュータウン中央', '印旛日本医大'] },
  { lines: ['JR Sotobo Line', 'JR Uchibo Line'],
    stations: ['本千葉'] },
];

// Walkable connections — stations linked by walkway, not rail transfer.
// Only affects getPlatforms (roll-again), NOT transfer checks mid-route.
// One-way: Higashi-Narita can access Terminal 2 lines, but not vice versa
const WALKABLE_STATIONS = {
  "Higashi-Narita":             ["Airport Second Building (NRT Terminal 2)"],
};
