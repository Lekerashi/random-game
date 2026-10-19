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
    // One train a day each: weekend 快速急行 西武新宿 9:00 → 本川越 9:49; weekday 通勤急行
    // 本川越 7:04 → 西武新宿 7:59 (Yahoo 22768/2881, 22131/2880)
    { name: "Rapid Exp", ja: "快速急行", color: "#f07000", direction: "end", stops: [
      "西武新宿","高田馬場","田無","東村山","所沢",
      "新所沢","入曽","狭山市","新狭山","南大塚","本川越",
    ], schedule: { weekday: { stops: [] }, weekend: { timeRange: [9, 10] } } },
    { name: "Commuter Exp", ja: "通勤急行", color: "#3a6fd8", direction: "start", stops: [
      "西武新宿","高田馬場","鷺ノ宮","上石神井","田無",
      "東村山","所沢","新所沢","狭山市","本川越",
    ], schedule: { weekend: { stops: [] }, weekday: { timeRange: [7, 8] } } },
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
    ], schedule: { weekday: { timeRange: [[6, 8], [9, 18], [22, 1]] } } },
    { name: "Chuo Sp. Rapid", ja: "中央特快", color: "#f07000", direction: "start", stops: [
      "東京","神田","御茶ノ水","四ツ谷","新宿",
      "中野","三鷹","国分寺","立川",
      "日野","豊田","八王子","西八王子","高尾",
      "相模湖","藤野","上野原","四方津","梁川",
      "鳥沢","猿橋","大月","初狩","笹子",
      "甲斐大和","勝沼ぶどう郷","塩山","東山梨",
      "山梨市","春日居町","石和温泉","酒折","甲府",
    ], schedule: { weekday: { timeRange: [[5, 8], [9, 24]] } } },
    // Westbound only, weekday evenings; 5 a day run on to 大月 (all stations past 高尾)
    { name: "Commuter Rapid", ja: "通勤快速", color: "#e83030", direction: "end", stops: [
      "東京","神田","御茶ノ水","四ツ谷","新宿",
      "中野","荻窪","吉祥寺","三鷹","国分寺","立川",
      "日野","豊田","八王子","西八王子","高尾",
      "相模湖","藤野","上野原","四方津","梁川",
      "鳥沢","猿橋","大月",
    ], schedule: { weekend: { stops: [] }, weekday: { timeRange: [16, 23] } } },
    // Eastbound only, weekday mornings: passes 三鷹 and 中野. One from 大月 runs all
    // stations to 高尾 (the 青梅 ones are connection express)
    { name: "Commuter Sp. Rapid", ja: "通勤特快", color: "#1a6fd8", direction: "start", stops: [
      "東京","神田","御茶ノ水","四ツ谷","新宿","国分寺","立川","八王子","高尾",
    ], schedule: { weekend: { stops: [] }, weekday: { timeRange: [7, 10] } } },
    { name: "Commuter Sp. Rapid", ja: "通勤特快", color: "#1a6fd8", direction: "start", stops: [
      "東京","神田","御茶ノ水","四ツ谷","新宿","国分寺","立川","八王子","高尾",
      "相模湖","藤野","上野原","四方津","梁川","鳥沢","猿橋","大月",
    ], schedule: { weekend: { stops: [] }, weekday: { timeRange: [7, 10] } } },
  ],
  // Weekend ホリデー快速おくたま 青梅 ↔ 奥多摩 (the 東京 ↔ 青梅 leg is connection express on the
  // Chuo ↔ Ome connections): 2–3 a day each way, 青梅 7–10h out and 奥多摩 15–16h back;
  // toward 奥多摩 they call at 二俣尾 (ODPT 2026-03, typed 特別快速 there)
  "JR Ome Line": [
    { name: "Local", ja: "普通", color: "#00a0e8", stops: null },
    { name: "Holiday Rapid Okutama", ja: "ホリデー快速おくたま", color: "#2a8a4a", direction: "end", stops: [
      "青梅","二俣尾","御嶽","奥多摩",
    ], schedule: { weekday: { stops: [] }, weekend: { timeRange: [7, 11] } } },
    { name: "Holiday Rapid Okutama", ja: "ホリデー快速おくたま", color: "#2a8a4a", direction: "start", stops: [
      "青梅","御嶽","奥多摩",
    ], schedule: { weekday: { stops: [] }, weekend: { timeRange: [15, 18] } } },
  ],
  "Tokyo Metro Fukutoshin Line": [
    { name: "Local", ja: "各停", color: "#00a0e8", stops: null },
    // Toward 和光市 the weekday 急行 run only in the rushes (the F-Liner carries the day)
    { name: "Express", ja: "急行", color: "#e83030", direction: "end", stops: [
      "和光市","小竹向原","池袋","新宿三丁目",
      "明治神宮前〈原宿〉","渋谷",
    ]},
    { name: "Express", ja: "急行", color: "#e83030", direction: "start", stops: [
      "和光市","小竹向原","池袋","新宿三丁目",
      "明治神宮前〈原宿〉","渋谷",
    ], schedule: { weekday: { timeRange: [[8, 11], [16, 21]] } } },
    // Daytime; weekend F-Liners start at 8h and run to 18h toward 渋谷 (ODPT 2026-03)
    { name: "F-Liner", ja: "Fライナー", color: "#e83030", direction: "end", stops: [
      "和光市","小竹向原","池袋","新宿三丁目",
      "明治神宮前〈原宿〉","渋谷",
    ], schedule: { weekday: { timeRange: [10, 17] }, weekend: { timeRange: [8, 19] } } },
    { name: "F-Liner", ja: "Fライナー", color: "#e83030", direction: "start", stops: [
      "和光市","小竹向原","池袋","新宿三丁目",
      "明治神宮前〈原宿〉","渋谷",
    ], schedule: { weekday: { timeRange: [10, 17] }, weekend: { timeRange: [8, 17] } } },
    // Weekday mornings and evenings: 急行 plus every station 和光市–小竹向原
    { name: "Commuter Exp", ja: "通勤急行", color: "#3a6fd8", direction: "end", stops: [
      "和光市","地下鉄成増","地下鉄赤塚","平和台","氷川台","小竹向原","池袋",
      "新宿三丁目","明治神宮前〈原宿〉","渋谷",
    ], schedule: { weekend: { stops: [] }, weekday: { timeRange: [[6, 11], [16, 23]] } } },
    { name: "Commuter Exp", ja: "通勤急行", color: "#3a6fd8", direction: "start", stops: [
      "和光市","地下鉄成増","地下鉄赤塚","平和台","氷川台","小竹向原","池袋",
      "新宿三丁目","明治神宮前〈原宿〉","渋谷",
    ], schedule: { weekend: { stops: [] }, weekday: { timeRange: [[6, 11], [17, 24]] } } },
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
    // Mornings and evenings, both ways (also via 練馬 from the subway)
    { name: "Rapid", ja: "快速", color: "#f07000", stops: [
      "池袋","練馬","石神井公園","ひばりヶ丘","東久留米","清瀬","秋津","所沢",
      "西所沢","小手指","狭山ヶ丘","武蔵藤沢",
      "稲荷山公園","入間市","仏子","元加治","飯能",
    ], schedule: { weekday: { timeRange: [16, 10] }, weekend: { timeRange: [16, 10] } } },
    // Weekday mornings toward 池袋 only: all stations to 所沢, skips ひばりヶ丘
    { name: "Commuter Exp", ja: "通勤急行", color: "#3a6fd8", direction: "start", stops: [
      "池袋","石神井公園","大泉学園","保谷","東久留米","所沢",
      "西所沢","小手指","狭山ヶ丘","武蔵藤沢",
      "稲荷山公園","入間市","仏子","元加治","飯能",
    ], schedule: { weekend: { stops: [] }, weekday: { timeRange: [6, 9] } } },
    // 快速急行 omitted: none leave 池袋 since the F-Liner took over (one weekday up train)
  ],
  "Keio Line": [
    { name: "Local", ja: "各停", color: "#00a0e8", stops: null },
    // 区間急行 run Toei ↔ Sagamihara Line since 2025-03 (connection express); only
    // 4 weekday-morning up trains stay on the main line west of 調布, so none here
    // No daytime 急行 since 2013: weekday mornings and evenings, a few weekend
    // trains (down 5:47; up 8–9h and late evening, some from 高幡不動)
    { name: "Express", ja: "急行", color: "#e83030", direction: "end", stops: [
      "新宿","笹塚","明大前","桜上水","千歳烏山",
      "つつじヶ丘","調布","東府中","府中",
      "分倍河原","聖蹟桜ヶ丘","高幡不動",
      "北野","京王八王子",
    ], schedule: { weekday: { timeRange: [[5, 10], [20, 22]] }, weekend: { timeRange: [5, 6] } } },
    { name: "Express", ja: "急行", color: "#e83030", direction: "start", stops: [
      "新宿","笹塚","明大前","桜上水","千歳烏山",
      "つつじヶ丘","調布","東府中","府中",
      "分倍河原","聖蹟桜ヶ丘","高幡不動",
      "北野","京王八王子",
    ], schedule: { weekday: { timeRange: [[6, 8], [17, 22]] }, weekend: { timeRange: [[8, 10], [21, 22]] } } },
    { name: "Ltd. Express", ja: "特急", color: "#e83080", direction: "end", stops: [
      "新宿","笹塚","明大前","千歳烏山",
      "調布","府中","分倍河原",
      "聖蹟桜ヶ丘","高幡不動","北野","京王八王子",
    ]},
    // None toward 新宿 in the weekday morning peak (京王八王子 6:31–7:46: 急行 only)
    { name: "Ltd. Express", ja: "特急", color: "#e83080", direction: "start", stops: [
      "新宿","笹塚","明大前","千歳烏山",
      "調布","府中","分倍河原",
      "聖蹟桜ヶ丘","高幡不動","北野","京王八王子",
    ], schedule: { weekday: { timeRange: [[4, 7], [8, 24]] } } },
  ],
  // Local-only so through-running to the Keio Line / Toei keeps a Local type
  // beside the target line's expresses (all New Line trains stop everywhere)
  "Keio new line": [
    { name: "Local", ja: "各停", color: "#00a0e8", stops: null },
  ],
  "Keio Inokashira line": [
    { name: "Local", ja: "各停", color: "#00a0e8", stops: null },
    // No weekday 急行 in the morning peak (吉祥寺 7:07–8:37, 渋谷 7:08–9:19)
    { name: "Express", ja: "急行", color: "#e83030", direction: "start", stops: [
      "渋谷","下北沢","明大前","永福町","久我山",
      "吉祥寺",
    ], schedule: { weekday: { timeRange: [[5, 7], [9, 24]] } } },
    { name: "Express", ja: "急行", color: "#e83030", direction: "end", stops: [
      "渋谷","下北沢","明大前","永福町","久我山",
      "吉祥寺",
    ], schedule: { weekday: { timeRange: [[7, 8], [9, 24]] } } },
  ],
  "Odakyu Line": [
    { name: "Local", ja: "各停", color: "#00a0e8", stops: null },
    // 準急 omitted: every one is a Chiyoda Line through train (connection express).
    // Weekday 急行 skip the morning peak toward 新宿 (通勤準急/快速急行 instead), and by
    // day 新宿's 急行 run to 唐木田 (Odakyu → Tama connection), not toward 小田原
    { name: "Express", ja: "急行", color: "#e83030", direction: "start", stops: [
      "新宿","代々木上原","下北沢","経堂","成城学園前",
      "登戸","向ヶ丘遊園","新百合ヶ丘","町田","相模大野",
      "海老名","本厚木","愛甲石田","伊勢原","鶴巻温泉",
      "東海大学前","秦野","渋沢","新松田",
      "開成","栢山","富水","螢田","足柄","小田原",
    ], schedule: { weekday: { timeRange: [[5, 7], [9, 24]] } } },
    { name: "Express", ja: "急行", color: "#e83030", direction: "end", stops: [
      "新宿","代々木上原","下北沢","経堂","成城学園前",
      "登戸","向ヶ丘遊園","新百合ヶ丘","町田","相模大野",
      "海老名","本厚木","愛甲石田","伊勢原","鶴巻温泉",
      "東海大学前","秦野","渋沢","新松田",
      "開成","栢山","富水","螢田","足柄","小田原",
    ], schedule: { weekday: { timeRange: [[5, 9], [16, 24]] } } },
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
    ], schedule: { weekday: { timeRange: [9, 17] }, weekend: { timeRange: [6, 24] } } },
    // Weekdays only: 特急 plus 日吉
    { name: "Commuter Ltd. Exp", ja: "通勤特急", color: "#3a6fd8", stops: [
      "渋谷","中目黒","自由が丘","武蔵小杉","日吉",
      "菊名","横浜",
    ], schedule: { weekend: { stops: [] }, weekday: { timeRange: [[6, 9], [16, 24]] } } },
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
    // Daytime 急行 ended 2023: evenings toward 本八幡, mornings toward 新宿 (ODPT 2025-03)
    { name: "Express", ja: "急行", color: "#e83030", direction: "end", stops: [
      "新宿","市ヶ谷","神保町","馬喰横山",
      "森下","大島","船堀","本八幡",
    ], schedule: { weekday: { timeRange: [17, 20] }, weekend: { timeRange: [16, 19] } } },
    { name: "Express", ja: "急行", color: "#e83030", direction: "start", stops: [
      "新宿","市ヶ谷","神保町","馬喰横山",
      "森下","大島","船堀","本八幡",
    ], schedule: { weekday: { timeRange: [[7, 8], [9, 11], [17, 18]] }, weekend: { timeRange: [7, 11] } } },
  ],
  // 快速 run all day both ways and continue as locals onto Toyo Rapid / Chuo-Sobu.
  "Tokyo Metro Tozai Line": [
    { name: "Local", ja: "各停", color: "#00a0e8", stops: null },
    { name: "Rapid", ja: "快速", color: "#00b900", stops: [
      "中野","落合","高田馬場","早稲田","神楽坂","飯田橋","九段下","竹橋",
      "大手町","日本橋","茅場町","門前仲町","木場","東陽町","浦安","西船橋",
    ]},
    // Weekday mornings toward 中野 only: 西船橋, 浦安, then all stations
    { name: "Commuter Rapid", ja: "通勤快速", color: "#e83030", direction: "start", stops: [
      "中野","落合","高田馬場","早稲田","神楽坂","飯田橋","九段下","竹橋",
      "大手町","日本橋","茅場町","門前仲町","木場","東陽町","南砂町","西葛西",
      "葛西","浦安","西船橋",
    ], schedule: { weekend: { stops: [] }, weekday: { timeRange: [6, 10] } } },
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
      "曳舟","北千住","西新井","草加",
      "新越谷","越谷","北越谷","大袋","せんげん台",
      "武里","一ノ割","春日部","北春日部","姫宮",
      "東武動物公園","和戸","久喜",
    ], schedule: { weekday: { timeRange: [20, 10] }, weekend: { timeRange: [20, 10] } } }, // early morning and night
    { name: "Express", ja: "急行", color: "#e83030", stops: [
      "曳舟","北千住","西新井","草加",
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
    // 区間急行 (大宮–柏, every station 春日部–柏): weekday 2 each way, weekend mornings/evenings
    { name: "Sub-Exp", ja: "区間急行", color: "#f0c000", direction: "start", stops: [
      "大宮","岩槻","春日部","藤の牛島","南桜井","川間","七光台","清水公園",
      "愛宕","野田市","梅郷","運河","江戸川台","初石","流山おおたかの森","豊四季","柏",
    ], schedule: { weekday: { timeRange: [8, 9] }, weekend: { timeRange: [[6, 9], [17, 21]] } } },
    { name: "Sub-Exp", ja: "区間急行", color: "#f0c000", direction: "end", stops: [
      "大宮","岩槻","春日部","藤の牛島","南桜井","川間","七光台","清水公園",
      "愛宕","野田市","梅郷","運河","江戸川台","初石","流山おおたかの森","豊四季","柏",
    ], schedule: { weekday: { timeRange: [16, 17] }, weekend: { timeRange: [16, 21] } } },
  ],
  // 特急 (2025-12): weekdays only, 5 morning trains toward 西馬込 (印旛日本医大 6:46–8:09)
  // and 2 evening ones from the Asakusa Line (京成高砂 20h, 21h)
  "Hokuso Railway Hokuso Line": [
    { name: "Local", ja: "普通", color: "#00a0e8", stops: null },
    { name: "Ltd. Express", ja: "特急", color: "#e83030", direction: "start", stops: [
      "京成高砂","東松戸","新鎌ヶ谷","西白井","白井","小室",
      "千葉ニュータウン中央","印西牧の原","印旛日本医大",
    ], schedule: { weekend: { stops: [] }, weekday: { timeRange: [6, 9] } } },
    { name: "Ltd. Express", ja: "特急", color: "#e83030", direction: "end", stops: [
      "京成高砂","東松戸","新鎌ヶ谷","西白井","白井","小室",
      "千葉ニュータウン中央","印西牧の原","印旛日本医大",
    ], schedule: { weekend: { stops: [] }, weekday: { timeRange: [20, 22] } } },
  ],
  // 快速: a few a day, all stations 取手–守谷, then 水海道,石下,下妻,下館
  "Kanto Railway Joso Line": [
    { name: "Local", ja: "普通", color: "#00a0e8", stops: null },
    { name: "Rapid", ja: "快速", color: "#00b900", direction: "end", stops: [
      "守谷","水海道","石下","下妻","下館",
    ], schedule: { weekday: { timeRange: [[9, 10], [18, 19]] }, weekend: { timeRange: [[9, 10], [18, 19]] } } },
    { name: "Rapid", ja: "快速", color: "#00b900", direction: "end", stops: [
      "水海道","石下","下妻","下館",
    ], schedule: { weekend: { stops: [] }, weekday: { timeRange: [[6, 7], [17, 18]] } } },
    { name: "Rapid", ja: "快速", color: "#00b900", direction: "start", stops: [
      "取手","西取手","寺原","新取手","ゆめみ野","稲戸井","戸頭","南守谷","守谷",
      "水海道","石下","下妻","下館",
    ], schedule: { weekday: { timeRange: [[6, 8], [9, 10]] }, weekend: { timeRange: [7, 8] } } },
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
    // From 京成上野 wd 11–16h, we 9–19h; up to 上野 wd 12–18h (weekday-morning ones
    // run via 押上), we 7–9h and 11–18h at 日暮里
    { name: "Rapid Ltd", ja: "快速特急", color: "#f07000", direction: "end", stops: [
      "京成上野","日暮里","青砥","京成高砂","京成八幡",
      "京成船橋","京成津田沼","八千代台","勝田台",
      "京成佐倉","京成成田",
      "空港第２ビル（第２旅客ターミナル）","成田空港（第１旅客ターミナル）",
    ], schedule: { weekday: { timeRange: [11, 17] }, weekend: { timeRange: [9, 20] } } },
    { name: "Rapid Ltd", ja: "快速特急", color: "#f07000", direction: "start", stops: [
      "京成上野","日暮里","青砥","京成高砂","京成八幡",
      "京成船橋","京成津田沼","八千代台","勝田台",
      "京成佐倉","京成成田",
      "空港第２ビル（第２旅客ターミナル）","成田空港（第１旅客ターミナル）",
    ], schedule: { weekday: { timeRange: [11, 19] }, weekend: { timeRange: [[6, 9], [11, 19]] } } },
    // Weekday-evening ones from 押上 join at 京成高砂 (京成船橋 17:30–19:54)
    { name: "Rapid Ltd", ja: "快速特急", color: "#f07000", direction: "end", stops: [
      "京成高砂","京成八幡",
      "京成船橋","京成津田沼","八千代台","勝田台",
      "京成佐倉","京成成田",
      "空港第２ビル（第２旅客ターミナル）","成田空港（第１旅客ターミナル）",
    ], schedule: { weekend: { stops: [] }, weekday: { timeRange: [17, 20] } } },
    // Weekdays: 7 morning trains toward 京成上野 (京成成田 6:13–8:35), 2 evening ones
    // from Haneda via 押上 (connection express); 特急 stops to 勝田台, then all stations
    { name: "Commuter Ltd. Exp", ja: "通勤特急", color: "#3a6fd8", direction: "start", stops: [
      "京成上野","日暮里","青砥","京成高砂","京成八幡",
      "京成船橋","京成津田沼","八千代台","勝田台","志津",
      "ユーカリが丘","京成臼井","京成佐倉","大佐倉",
      "京成酒々井","宗吾参道","公津の杜","京成成田",
      "空港第２ビル（第２旅客ターミナル）","成田空港（第１旅客ターミナル）",
    ], schedule: { weekend: { stops: [] }, weekday: { timeRange: [5, 10] } } },
    { name: "Commuter Ltd. Exp", ja: "通勤特急", color: "#3a6fd8", direction: "end", stops: [
      "京成高砂","京成八幡",
      "京成船橋","京成津田沼","八千代台","勝田台","志津",
      "ユーカリが丘","京成臼井","京成佐倉","大佐倉",
      "京成酒々井","宗吾参道","公津の杜","京成成田",
      "空港第２ビル（第２旅客ターミナル）","成田空港（第１旅客ターミナル）",
    ], schedule: { weekend: { stops: [] }, weekday: { timeRange: [21, 23] } } },
  ],
  "Keikyu Main Line": [
    { name: "Local", ja: "各停", color: "#00a0e8", stops: null },
    { name: "Ltd. Express", ja: "特急", color: "#e84040", stops: [
      "泉岳寺","品川","青物横丁","平和島","京急蒲田",
      "京急川崎","神奈川新町","横浜",
      "上大岡","金沢文庫","金沢八景",
      "追浜","汐入","横須賀中央","堀ノ内",
    ]},
    // 堀ノ内–浦賀 is 普通 only, plus weekday rush 特急 (down 5–8h and 21–23h, up 浦賀 6–8h)
    { name: "Ltd. Express", ja: "特急", color: "#e84040", direction: "end", stops: [
      "泉岳寺","品川","青物横丁","平和島","京急蒲田",
      "京急川崎","神奈川新町","横浜",
      "上大岡","金沢文庫","金沢八景",
      "追浜","汐入","横須賀中央","堀ノ内",
      "京急大津","馬堀海岸","浦賀",
    ], schedule: { weekend: { stops: [] }, weekday: { timeRange: [[5, 9], [21, 24]] } } },
    { name: "Ltd. Express", ja: "特急", color: "#e84040", direction: "start", stops: [
      "泉岳寺","品川","青物横丁","平和島","京急蒲田",
      "京急川崎","神奈川新町","横浜",
      "上大岡","金沢文庫","金沢八景",
      "追浜","汐入","横須賀中央","堀ノ内",
      "京急大津","馬堀海岸","浦賀",
    ], schedule: { weekend: { stops: [] }, weekday: { timeRange: [6, 9] } } },
    // 快特 all run onto the Kurihama Line at 堀ノ内 (none to 浦賀)
    { name: "Rapid Ltd. Exp", ja: "快特", color: "#e83080", stops: [
      "泉岳寺","品川","京急蒲田","京急川崎","横浜",
      "上大岡","金沢文庫","金沢八景","横須賀中央",
      "堀ノ内",
    ]},
  ],
  // Keikyu Airport Line express handled entirely by connection express (data-connections.js)
  // ラビット: toward 宇都宮 only, 2 morning (through from the Tokaido Line) + 2 evening from 上野
  "Utsunomiya Line": [
    { name: "Local", ja: "普通", color: "#00a0e8", stops: null },
    { name: "Rapid Rabbit", ja: "快速ラビット", color: "#e85050", direction: "end", stops: [
      "上野","赤羽","浦和","大宮","東大宮","蓮田","久喜","古河",
      "小山","小金井","自治医大","石橋","雀宮","宇都宮",
    ], schedule: { weekday: { timeRange: [[6, 8], [18, 20]] }, weekend: { timeRange: [[6, 9], [18, 20]] } } },
  ],
  // Rapid tracks: every train calls at every station (快速 to 取手, 普通 beyond).
  // 特別快速 toward 上野: 2 morning trains from 土浦, running on to 品川 (the 2
  // afternoon down trains are connection express from the Tokaido Line)
  "JR Joban Line": [
    { name: "Local", ja: "普通", color: "#00a0e8", stops: null },
    { name: "Special Rapid", ja: "特別快速", color: "#e85050", direction: "start", stops: [
      "上野","日暮里","北千住","松戸","柏","取手",
      "藤代","龍ケ崎市","牛久","ひたち野うしく","荒川沖","土浦",
    ], schedule: { weekday: { timeRange: [9, 11] }, weekend: { timeRange: [9, 11] } } },
  ],
  // アーバン: toward 高崎 only, 2 morning (through from the Tokaido Line) + 2 evening from 上野
  "JR Takasaki Line": [
    { name: "Local", ja: "普通", color: "#00a0e8", stops: null },
    { name: "Rapid Urban", ja: "快速アーバン", color: "#f07000", direction: "end", stops: [
      "上野","赤羽","浦和","大宮","上尾","桶川","鴻巣","熊谷","籠原",
      "深谷","岡部","本庄","神保原","新町","倉賀野","高崎",
    ], schedule: { weekday: { timeRange: [[8, 10], [18, 20]] }, weekend: { timeRange: [[8, 10], [18, 20]] } } },
  ],
  "JR Shonan Shinjuku Line": [
    { name: "Local", ja: "各停", color: "#00a0e8", stops: null },
    { name: "Rapid", ja: "快速", color: "#00b900", stops: [
      "大宮","浦和","赤羽","池袋","新宿","渋谷",
      "恵比寿","大崎","武蔵小杉","横浜","戸塚","大船",
    ]},
    // Hourly by day only (新宿 10–17h both ways)
    { name: "Special Rapid", ja: "特別快速", color: "#e83080", stops: [
      "大宮","浦和","赤羽","池袋","新宿","渋谷",
      "大崎","武蔵小杉","横浜","戸塚","大船",
    ], schedule: { weekday: { timeRange: [9, 18] }, weekend: { timeRange: [8, 18] } } },
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
  // 快速 by day, plus weekday evenings toward 立川 (ODPT 2026-03)
  "JR Nambu Line": [
    { name: "Local", ja: "各停", color: "#00a0e8", stops: null },
    { name: "Rapid", ja: "快速", color: "#00b900", direction: "end", stops: [
      "川崎","鹿島田","武蔵小杉","武蔵中原",
      "武蔵新城","武蔵溝ノ口","登戸","稲田堤",
      "稲城長沼","府中本町","分倍河原","立川",
    ], schedule: { weekday: { timeRange: [10, 20] }, weekend: { timeRange: [9, 17] } } },
    { name: "Rapid", ja: "快速", color: "#00b900", direction: "start", stops: [
      "川崎","鹿島田","武蔵小杉","武蔵中原",
      "武蔵新城","武蔵溝ノ口","登戸","稲田堤",
      "稲城長沼","府中本町","分倍河原","立川",
    ], schedule: { weekday: { timeRange: [[10, 17], [18, 20]] }, weekend: { timeRange: [9, 17] } } },
  ],
  // Weekday rushes run 通勤快速 instead of 快速 (hours per direction, ODPT 2026-03)
  "JR Saikyo Line": [
    { name: "Local", ja: "各停", color: "#00a0e8", stops: null },
    { name: "Rapid", ja: "快速", color: "#00b900", direction: "end", stops: [
      "大崎","恵比寿","渋谷","新宿","池袋","板橋","十条",
      "赤羽","戸田公園","武蔵浦和","中浦和","南与野","与野本町","北与野","大宮",
    ],
      schedule: { weekday: { timeRange: [6, 18] } } },
    { name: "Rapid", ja: "快速", color: "#00b900", direction: "start", stops: [
      "大崎","恵比寿","渋谷","新宿","池袋","板橋","十条",
      "赤羽","戸田公園","武蔵浦和","中浦和","南与野","与野本町","北与野","大宮",
    ],
      schedule: { weekday: { timeRange: [10, 18] } } },
    { name: "Commuter Rapid", ja: "通勤快速", color: "#e83030", direction: "end", stops: [
      "大崎","恵比寿","渋谷","新宿","池袋","板橋","十条",
      "赤羽","武蔵浦和","大宮",
    ],
      schedule: { weekend: { stops: [] }, weekday: { timeRange: [[6, 10], [16, 24]] } } },
    { name: "Commuter Rapid", ja: "通勤快速", color: "#e83030", direction: "start", stops: [
      "大崎","恵比寿","渋谷","新宿","池袋","板橋","十条",
      "赤羽","武蔵浦和","大宮",
    ],
      schedule: { weekend: { stops: [] }, weekday: { timeRange: [[6, 11], [17, 23]] } } },
  ],
  "Tsukuba Express": [
    { name: "Local", ja: "普通", color: "#00a0e8", stops: null },
    { name: "Sec. Rapid", ja: "区間快速", color: "#f0c000", direction: "end", stops: [
      "秋葉原","新御徒町","浅草","南千住","北千住","八潮","三郷中央",
      "南流山","流山おおたかの森","柏の葉キャンパス","守谷",
      "みらい平","みどりの","万博記念公園","研究学園","つくば",
    ]},
    // Toward 秋葉原 the weekday morning ones (leaving つくば 6:25–8:17) also call at 六町 (ODPT timetable)
    { name: "Sec. Rapid", ja: "区間快速", color: "#f0c000", direction: "start", stops: [
      "秋葉原","新御徒町","浅草","南千住","北千住","八潮","三郷中央",
      "南流山","流山おおたかの森","柏の葉キャンパス","守谷",
      "みらい平","みどりの","万博記念公園","研究学園","つくば",
    ], schedule: { weekday: { timeRange: [9, 6] } } },
    { name: "Sec. Rapid", ja: "区間快速", color: "#f0c000", direction: "start", stops: [
      "秋葉原","新御徒町","浅草","南千住","北千住","六町","八潮","三郷中央",
      "南流山","流山おおたかの森","柏の葉キャンパス","守谷",
      "みらい平","みどりの","万博記念公園","研究学園","つくば",
    ], schedule: { weekend: { stops: [] }, weekday: { timeRange: [6, 9] } } },
    // Weekday gaps: none from 秋葉原 7–8h and 18–20h (通勤快速), none from つくば 6–8h
    { name: "Rapid", ja: "快速", color: "#00b900", direction: "end", stops: [
      "秋葉原","新御徒町","浅草","南千住","北千住","八潮",
      "南流山","流山おおたかの森","守谷","つくば",
    ], schedule: { weekday: { timeRange: [[5, 18], [21, 23]] }, weekend: { timeRange: [5, 23] } } },
    { name: "Rapid", ja: "快速", color: "#00b900", direction: "start", stops: [
      "秋葉原","新御徒町","浅草","南千住","北千住","八潮",
      "南流山","流山おおたかの森","守谷","つくば",
    ], schedule: { weekday: { timeRange: [[5, 7], [9, 22]] }, weekend: { timeRange: [5, 23] } } },
    // Weekday evenings toward つくば only
    { name: "Commuter Rapid", ja: "通勤快速", color: "#e83030", direction: "end", stops: [
      "秋葉原","新御徒町","浅草","南千住","北千住","六町","八潮",
      "南流山","流山おおたかの森","柏の葉キャンパス","守谷","研究学園","つくば",
    ], schedule: { weekend: { stops: [] }, weekday: { timeRange: [17, 22] } } },
  ],
  // 空港快速 (non-stop 浜松町 ↔ 羽田空港第3ターミナル) alternate with 普通 by day; none in
  // the weekday morning rush. 区間快速: a few, mostly weekday evenings
  "Tokyo monorail": [
    { name: "Local", ja: "普通", color: "#00a0e8", stops: null },
    { name: "Haneda Express", ja: "空港快速", color: "#e83030", direction: "end", stops: [
      "浜松町","羽田空港第3ターミナル","羽田空港第1ターミナル","羽田空港第2ターミナル",
    ], schedule: { weekday: { timeRange: [[4, 7], [9, 20]] }, weekend: { timeRange: [4, 20] } } },
    { name: "Haneda Express", ja: "空港快速", color: "#e83030", direction: "start", stops: [
      "浜松町","羽田空港第3ターミナル","羽田空港第1ターミナル","羽田空港第2ターミナル",
    ], schedule: { weekday: { timeRange: [[6, 7], [9, 17], [19, 24]] }, weekend: { timeRange: [6, 24] } } },
    { name: "Section Rapid", ja: "区間快速", color: "#f0a000", stops: [
      "浜松町","天王洲アイル","大井競馬場前","流通センター",
      "羽田空港第3ターミナル","羽田空港第1ターミナル","羽田空港第2ターミナル",
    ], schedule: { weekend: { stops: [] }, weekday: { timeRange: [19, 22] } } },
  ],
  "Tokyu Oimachi Line": [
    { name: "Local", ja: "各停", color: "#00a0e8", stops: null },
    // Weekdays 6–23h (rush hours too), weekends 9–21h only
    { name: "Express", ja: "急行", color: "#e83030", stops: [
      "大井町","旗の台","大岡山","自由が丘","二子玉川","溝の口",
    ], schedule: { weekday: { timeRange: [6, 24] }, weekend: { timeRange: [8, 22] } } },
  ],
  // 快速 run by day, both ways (御徒町 weekends only); 9–16h on weekdays, to 17–18h on
  // weekends (ODPT 2026-03). The Negishi through-running version is connection express.
  "JR Keihin Tohoku Line": [
    { name: "Local", ja: "各停", color: "#00a0e8", stops: null },
    { name: "Rapid", ja: "快速", color: "#00b900", direction: "end", stops: [
      "大宮","さいたま新都心","与野","北浦和","浦和",
      "南浦和","蕨","西川口","川口","赤羽",
      "東十条","王子","上中里","田端","上野",
      "御徒町","秋葉原","神田","東京",
      "浜松町","田町","高輪ゲートウェイ","品川",
      "大井町","大森","蒲田","川崎","鶴見",
      "新子安","東神奈川","横浜",
    ],
      schedule: { weekday: { skip: ["御徒町"], timeRange: [9, 17] }, weekend: { timeRange: [9, 19] } } },
    { name: "Rapid", ja: "快速", color: "#00b900", direction: "start", stops: [
      "大宮","さいたま新都心","与野","北浦和","浦和",
      "南浦和","蕨","西川口","川口","赤羽",
      "東十条","王子","上中里","田端","上野",
      "御徒町","秋葉原","神田","東京",
      "浜松町","田町","高輪ゲートウェイ","品川",
      "大井町","大森","蒲田","川崎","鶴見",
      "新子安","東神奈川","横浜",
    ],
      schedule: { weekday: { skip: ["御徒町"], timeRange: [9, 17] }, weekend: { timeRange: [9, 18] } } },
  ],
  // 快速 (daytime, both ways) skip 大口/小机/十日市場/成瀬/古淵/淵野辺/矢部 (hours ODPT 2026-03)
  "JR Yokohama Line": [
    { name: "Local", ja: "各停", color: "#00a0e8", stops: null },
    { name: "Rapid", ja: "快速", color: "#00b900", direction: "start", stops: [
      "東神奈川","菊名","新横浜","鴨居","中山",
      "長津田","町田","相模原","橋本",
      "相原","八王子みなみ野","片倉","八王子",
    ],
      schedule: { weekday: { timeRange: [9, 16] }, weekend: { timeRange: [8, 19] } } },
    { name: "Rapid", ja: "快速", color: "#00b900", direction: "end", stops: [
      "東神奈川","菊名","新横浜","鴨居","中山",
      "長津田","町田","相模原","橋本",
      "相原","八王子みなみ野","片倉","八王子",
    ],
      schedule: { weekday: { timeRange: [10, 17] }, weekend: { timeRange: [9, 19] } } },
  ],
  // 通勤快速 abolished March 2024
  "JR Keiyo Line": [
    { name: "Local", ja: "各停", color: "#00a0e8", stops: null },
    // Toward 蘇我 9–16h and 20–21h; toward 東京 6–7h (from the Uchibo/Sotobo lines) and 9–16h
    { name: "Rapid", ja: "快速", color: "#00b900", direction: "end", stops: [
      "東京","八丁堀","新木場","舞浜","新浦安","南船橋",
      "海浜幕張","検見川浜","稲毛海岸","千葉みなと","蘇我",
    ],
      schedule: { weekday: { timeRange: [[9, 17], [20, 22]] }, weekend: { timeRange: [[9, 18], [20, 22]] } } },
    { name: "Rapid", ja: "快速", color: "#00b900", direction: "start", stops: [
      "東京","八丁堀","新木場","舞浜","新浦安","南船橋",
      "海浜幕張","検見川浜","稲毛海岸","千葉みなと","蘇我",
    ],
      schedule: { weekday: { timeRange: [6, 17] }, weekend: { timeRange: [6, 18] } } },
  ],
  // West of 千葉 every train is a 快速 (the rapid tracks); east of it 普通 call everywhere and the
  // 快速 (to 佐倉 / 成東) pass 東千葉 only. The 普通 is a segment type: its list starts at 千葉, so
  // it is offered there and beyond only (ODPT 2026-03)
  "JR Sobu Line": [
    { name: "Local", ja: "普通", color: "#00a0e8", stops: [
      "千葉","東千葉","都賀","四街道","物井","佐倉","南酒々井","榎戸","八街","日向","成東",
      "松尾","横芝","飯倉","八日市場","干潟","旭","飯岡","倉橋","猿田","松岸","銚子",
    ]},
    { name: "Rapid", ja: "快速", color: "#00b900", stops: [
      "東京","新日本橋","馬喰町","錦糸町","新小岩","市川","船橋","津田沼","稲毛","千葉",
      "都賀","四街道","物井","佐倉","南酒々井","榎戸","八街","日向","成東",
    ]},
  ],
  // Sotobo 快速 run 千葉 ↔ 上総一ノ宮: the ones through from the Sobu rapid tracks pass 永田, 本納,
  // 新茂原 and 八積, the Keiyo ones (by day) call everywhere; hours per direction (ODPT 2026-03)
  "JR Sotobo Line": [
    { name: "Local", ja: "普通", color: "#00a0e8", stops: null },
    { name: "Rapid", ja: "快速", color: "#00b900", direction: "end", stops: [
      "千葉","本千葉","蘇我","鎌取","誉田","土気","大網","茂原","上総一ノ宮",
    ], schedule: { weekday: { timeRange: [[5, 6], [9, 11], [15, 22]] }, weekend: { timeRange: [[5, 6], [9, 11], [15, 22]] } } },
    { name: "Rapid", ja: "快速", color: "#00b900", direction: "end", stops: [
      "千葉","本千葉","蘇我","鎌取","誉田","土気","大網","永田","本納","新茂原","茂原","八積","上総一ノ宮",
    ], schedule: { weekday: { timeRange: [[11, 15], [22, 23]] }, weekend: { timeRange: [[11, 15], [22, 23]] } } },
    { name: "Rapid", ja: "快速", color: "#00b900", direction: "start", stops: [
      "千葉","本千葉","蘇我","鎌取","誉田","土気","大網","茂原","上総一ノ宮",
    ], schedule: { weekday: { timeRange: [[6, 8], [10, 12], [16, 20], [21, 22]] }, weekend: { timeRange: [[6, 8], [10, 12], [16, 20], [21, 22]] } } },
    { name: "Rapid", ja: "快速", color: "#00b900", direction: "start", stops: [
      "千葉","本千葉","蘇我","鎌取","誉田","土気","大網","永田","本納","新茂原","茂原","八積","上総一ノ宮",
    ], schedule: { weekday: { timeRange: [[12, 16], [20, 21]] }, weekend: { timeRange: [[12, 16], [20, 21]] } } },
  ],
  // Uchibo 快速 run 千葉 ↔ 君津 passing 巌根 only (ODPT 2026-03)
  "JR Uchibo Line": [
    { name: "Local", ja: "普通", color: "#00a0e8", stops: null },
    { name: "Rapid", ja: "快速", color: "#00b900", direction: "end", stops: [
      "千葉","本千葉","蘇我","浜野","八幡宿","五井","姉ケ崎","長浦","袖ケ浦","木更津","君津",
    ], schedule: { weekday: { timeRange: [6, 23] }, weekend: { timeRange: [6, 23] } } },
    { name: "Rapid", ja: "快速", color: "#00b900", direction: "start", stops: [
      "千葉","本千葉","蘇我","浜野","八幡宿","五井","姉ケ崎","長浦","袖ケ浦","木更津","君津",
    ], schedule: { weekday: { timeRange: [6, 23] }, weekend: { timeRange: [6, 23] } } },
  ],
  // Yokohama Municipal Subway 快速 (every 30 min, both ways)
  "Blue Line": [
    { name: "Local", ja: "普通", color: "#00a0e8", stops: null },
    // Daytime; the last weekend 快速 toward 湘南台 run past midnight (ODPT 2025-11)
    { name: "Rapid", ja: "快速", color: "#00b900", direction: "end", stops: [
      "あざみ野","中川","センター北","センター南","仲町台","新羽","新横浜",
      "横浜","桜木町","関内","上大岡","上永谷","戸塚",
      "踊場","中田","立場","下飯田","湘南台",
    ],
      schedule: { weekday: { timeRange: [10, 18] }, weekend: { timeRange: [[9, 22], [23, 1]] } } },
    { name: "Rapid", ja: "快速", color: "#00b900", direction: "start", stops: [
      "あざみ野","中川","センター北","センター南","仲町台","新羽","新横浜",
      "横浜","桜木町","関内","上大岡","上永谷","戸塚",
      "踊場","中田","立場","下飯田","湘南台",
    ],
      schedule: { weekday: { timeRange: [10, 18] }, weekend: { timeRange: [9, 22] } } },
  ],
  "Sotetsu Main Line": [
    { name: "Local", ja: "各停", color: "#00a0e8", stops: null },
    // Toward 横浜 no 快速 on weekday mornings (海老名 5:45–8:24: 通勤急行 instead)
    { name: "Rapid", ja: "快速", color: "#00b900", direction: "start", stops: [
      "横浜","星川","西谷","鶴ヶ峰","二俣川","希望ヶ丘","三ツ境","瀬谷",
      "大和","相模大塚","さがみ野","かしわ台","海老名",
    ], schedule: { weekday: { timeRange: [[5, 6], [8, 24]] } } },
    // Weekday mornings toward 横浜 only: 快速 minus 星川
    { name: "Commuter Exp", ja: "通勤急行", color: "#3a6fd8", direction: "start", stops: [
      "横浜","西谷","鶴ヶ峰","二俣川","希望ヶ丘","三ツ境","瀬谷",
      "大和","相模大塚","さがみ野","かしわ台","海老名",
    ], schedule: { weekend: { stops: [] }, weekday: { timeRange: [5, 9] } } },
    { name: "Rapid", ja: "快速", color: "#00b900", direction: "end", stops: [
      "横浜","星川","西谷","鶴ヶ峰","二俣川","希望ヶ丘","三ツ境","瀬谷",
      "大和","相模大塚","さがみ野","かしわ台","海老名",
    ]},
    // All day both ways (海老名 5:14–22:56 incl. through trains, 横浜 7:10–23:47)
    { name: "Ltd. Express", ja: "特急", color: "#e83080", stops: [
      "横浜","西谷","二俣川","大和","海老名",
    ], schedule: { weekday: { timeRange: [5, 24] }, weekend: { timeRange: [5, 24] } } },
    // 急行 abolished 2023; 通勤特急 run only from the Izumino Line to Tokyu.
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
    // 大川 trains only in the rushes (weekdays 7–8h and 17–20h, weekends 2 morning + 1
    // evening round trips); hours per direction (ODPT 2026-03)
    { name: 'Okawa', ja: '大川支線', color: '#f07000', direction: 'end',
      stations: ['鶴見','国道','鶴見小野','弁天橋','浅野','安善','大川'],
      schedule: { weekday: { timeRange: [[7, 9], [17, 21]] }, weekend: { timeRange: [[7, 9], [17, 18]] } } },
    { name: 'Okawa', ja: '大川支線', color: '#f07000', direction: 'start',
      stations: ['鶴見','国道','鶴見小野','弁天橋','浅野','安善','大川'],
      schedule: { weekday: { timeRange: [[7, 10], [17, 21]] }, weekend: { timeRange: [[7, 9], [18, 19]] } } },
  ],
  // Toward 池袋 the 方南町 branch is a separate entry so its label reads 池袋方面, and the
  // branch shuttles (93 a day, turning back at 中野坂上) get their own; 13 weekday trains from
  // 池袋 end at 中野富士見町 (8–9h and the last ones) (ODPT 2026-09)
  'Tokyo Metro Marunouchi Line': [
    { name: 'Ogikubo', ja: '荻窪方面', color: '#e60012',
      stations: ['池袋','新大塚','茗荷谷','後楽園','本郷三丁目','御茶ノ水','淡路町','大手町','東京','銀座','霞ケ関','国会議事堂前','赤坂見附','四ツ谷','四谷三丁目','新宿御苑前','新宿三丁目','新宿','西新宿','中野坂上','新中野','東高円寺','新高円寺','南阿佐ケ谷','荻窪'] },
    { name: 'Honancho', ja: '方南町方面', color: '#f07800', direction: 'end',
      stations: ['池袋','新大塚','茗荷谷','後楽園','本郷三丁目','御茶ノ水','淡路町','大手町','東京','銀座','霞ケ関','国会議事堂前','赤坂見附','四ツ谷','四谷三丁目','新宿御苑前','新宿三丁目','新宿','西新宿','中野坂上','中野新橋','中野富士見町','方南町'] },
    { name: 'Nakano-Fujimicho', ja: '中野富士見町方面', color: '#f07800', direction: 'end',
      stations: ['池袋','新大塚','茗荷谷','後楽園','本郷三丁目','御茶ノ水','淡路町','大手町','東京','銀座','霞ケ関','国会議事堂前','赤坂見附','四ツ谷','四谷三丁目','新宿御苑前','新宿三丁目','新宿','西新宿','中野坂上','中野新橋','中野富士見町'],
      schedule: { weekday: { timeRange: [[8, 11], [23, 1]] }, weekend: { timeRange: [23, 1] } } },
    { name: 'Ikebukuro', ja: '池袋方面', color: '#e60012', direction: 'start',
      stations: ['池袋','新大塚','茗荷谷','後楽園','本郷三丁目','御茶ノ水','淡路町','大手町','東京','銀座','霞ケ関','国会議事堂前','赤坂見附','四ツ谷','四谷三丁目','新宿御苑前','新宿三丁目','新宿','西新宿','中野坂上','中野新橋','中野富士見町','方南町'] },
    { name: 'Nakano-Sakaue', ja: '中野坂上方面', color: '#f07800', direction: 'start',
      stations: ['中野坂上','中野新橋','中野富士見町','方南町'],
      schedule: { weekday: { timeRange: [[5, 8], [9, 1]] }, weekend: { timeRange: [5, 1] } } },
  ],
  // Toward 川崎 the branch shuttles turn back at 尻手 (41 a day, 5–22h); the 川崎 entry labels
  // the branch 川崎方面 that way (ODPT 2026-03)
  'JR Nambu Line': [
    { name: 'Tachikawa', ja: '立川方面', color: '#ffd400',
      stations: ['川崎','尻手','矢向','鹿島田','平間','向河原','武蔵小杉','武蔵中原','武蔵新城','武蔵溝ノ口','津田山','久地','宿河原','登戸','中野島','稲田堤','矢野口','稲城長沼','南多摩','府中本町','分倍河原','西府','谷保','矢川','西国立','立川'] },
    { name: 'Hamakawasaki', ja: '浜川崎方面', color: '#c8a048', direction: 'end',
      stations: ['川崎','尻手','八丁畷','川崎新町','小田栄','浜川崎'] },
    { name: 'Kawasaki', ja: '川崎方面', color: '#c8a048', direction: 'start',
      stations: ['川崎','尻手','八丁畷','川崎新町','小田栄','浜川崎'] },
    { name: 'Shitte', ja: '尻手方面', color: '#a08030', direction: 'start',
      stations: ['尻手','八丁畷','川崎新町','小田栄','浜川崎'],
      schedule: { weekday: { timeRange: [5, 24] }, weekend: { timeRange: [5, 24] } } },
  ],
  // (Keikyu Airport and Tokaido through-running now handled by LINE_CONNECTIONS)
};

// ── Line hours: boarding at `stations` (JA) toward `direction` ('start'|'end', omit
// for both) is offered only while `schedule` runs (timeRange, or stops: [] to hide a day type)
const LINE_SCHEDULES = {
  // Sky Access trains start at 京成上野 only weekday evenings (18:51, 19:47, 20:46) and
  // return there 3 times (日暮里 19:39, 20:31, 22:59); the rest start at 押上
  'Narita Sky Access': [
    { direction: 'end', stations: ['京成上野', '日暮里', '青砥'],
      schedule: { weekend: { stops: [] }, weekday: { timeRange: [18, 21] } } },
    { direction: 'start', stations: ['日暮里', '青砥', '京成高砂'],
      schedule: { weekend: { stops: [] }, weekday: { timeRange: [[19, 21], [22, 23]] } } },
  ],
};

// ── Line destinations (trains terminating at different stations on the same line) ──
// Entries: { until (JA), name, ja, color, services?, schedule? }; services = the types that end there
const LINE_DESTINATIONS = {
  // 17 weekday trains from 渋谷 (mornings, evenings, the last ones) and 2 weekend
  // night trains end at 上野 (ODPT 2026-09)
  'Tokyo Metro Ginza Line': {
    direction: 'start',  // toward Asakusa
    destinations: [
      { until: '上野', name: 'Ueno',    ja: '上野方面', color: '#f39700',
        schedule: { weekday: { timeRange: [[8, 10], [18, 20], [23, 1]] }, weekend: { timeRange: [23, 1] } } },
      { until: '浅草', name: 'Asakusa', ja: '浅草方面', color: '#f39700' },
    ],
  },
  // 7 weekday-morning trains (from 荻窪 and 方南町) end at 茗荷谷 (ODPT 2026-09)
  'Tokyo Metro Marunouchi Line': {
    direction: 'start',  // toward Ikebukuro
    destinations: [
      { until: '茗荷谷', name: 'Myogadani', ja: '茗荷谷方面', color: '#e60012',
        schedule: { weekday: { timeRange: [8, 11] }, weekend: { stops: [] } } },
      { until: '池袋',   name: 'Ikebukuro', ja: '池袋方面',   color: '#e60012' },
    ],
  },
  // 22 weekday / 12 weekend trains turn back at 舎人公園 (around 9h and the last ones) (ODPT 2025-02)
  'Nippori-Toneri Liner': {
    direction: 'start',  // toward Nippori
    destinations: [
      { until: '舎人公園', name: 'Toneri-koen', ja: '舎人公園方面', color: '#ff7e2e',
        schedule: { weekday: { timeRange: [[9, 11], [22, 23], [0, 1]] }, weekend: { timeRange: [[9, 11], [22, 1]] } } },
      { until: '日暮里',   name: 'Nippori',     ja: '日暮里方面',   color: '#ff7e2e' },
    ],
  },
  // Toward つくば half the trains end at 守谷; 7 weekday-morning ones at 八潮 (ODPT 2025-03)
  'Tsukuba Express': {
    direction: 'end',  // toward Tsukuba
    destinations: [
      { until: '八潮',   name: 'Yashio',  ja: '八潮方面',   color: '#0067c0',
        schedule: { weekday: { timeRange: [6, 10] }, weekend: { stops: [] } } },
      { until: '守谷',   name: 'Moriya',  ja: '守谷方面',   color: '#0067c0' },
      { until: 'つくば', name: 'Tsukuba', ja: 'つくば方面', color: '#0067c0' },
    ],
  },
  // Short turns both ways: 上永谷 (rushes and the last ones), 踊場 by day toward 湘南台,
  // 新羽 by day toward あざみ野 (ODPT 2025-11)
  'Blue Line': [
    { direction: 'end',  // toward Shonandai
      destinations: [
        { until: '上永谷', name: 'Kaminagaya', ja: '上永谷方面', color: '#1976d2',
          schedule: { weekday: { timeRange: [[8, 10], [20, 1]] }, weekend: { timeRange: [[8, 11], [18, 20], [23, 1]] } } },
        { until: '踊場',   name: 'Odoriba',    ja: '踊場方面',   color: '#1976d2',
          schedule: { weekday: { timeRange: [9, 16] }, weekend: { timeRange: [8, 21] } } },
        { until: '湘南台', name: 'Shonandai',  ja: '湘南台方面', color: '#1976d2' },
      ] },
    { direction: 'start',  // toward Azamino
      destinations: [
        { until: '上永谷',   name: 'Kaminagaya', ja: '上永谷方面',   color: '#1976d2',
          schedule: { weekday: { timeRange: [[8, 10], [20, 21], [0, 1]] }, weekend: { timeRange: [0, 1] } } },
        { until: '新羽',     name: 'Nippa',      ja: '新羽方面',     color: '#1976d2',
          schedule: { weekday: { timeRange: [9, 17] }, weekend: { timeRange: [[8, 21], [23, 1]] } } },
        { until: 'あざみ野', name: 'Azamino',    ja: 'あざみ野方面', color: '#1976d2' },
      ] },
  ],
  // 清澄白河 turn-backs both ways round the loop, rushes and the last ones: 8 weekday / 9
  // weekend trains from 都庁前 (toward 光が丘, via 飯田橋) and 28 / 13 from 光が丘 (toward
  // 都庁前, via 六本木) (ODPT 2025-03). Toward 都庁前 the alternative is the plain ride:
  // the loop's second 都庁前 can't be named by `until` (rides from the 光が丘 side stop
  // short of it, OEDO_LOOP_END)
  'Toei Oedo Line': [
    { direction: 'end',  // toward Hikarigaoka (via Iidabashi)
      destinations: [
        { until: '清澄白河', name: 'Kiyosumi-shirakawa', ja: '清澄白河方面', color: '#b6007a',
          schedule: { weekday: { timeRange: [[9, 10], [19, 22], [23, 1]] }, weekend: { timeRange: [[8, 10], [19, 20], [22, 1]] } } },
        { until: '光が丘',   name: 'Hikarigaoka',        ja: '光が丘方面',   color: '#b6007a' },
      ] },
    { direction: 'start',  // toward Tochomae (via Roppongi)
      destinations: [
        { until: '清澄白河', name: 'Kiyosumi-shirakawa', ja: '清澄白河方面', color: '#b6007a',
          schedule: { weekday: { timeRange: [[7, 11], [19, 1]] }, weekend: { timeRange: [[9, 11], [18, 1]] } } },
        { plain: true,       name: 'Tochomae',           ja: '都庁前方面',   color: '#b6007a' },
      ] },
  ],
  // Short turns at the depot (荒川車庫前) both ways, 王子駅前 / 大塚駅前 toward 早稲田 and
  // 町屋駅前 toward 三ノ輪橋, mornings and evenings (ODPT 2021)
  'Tokyo Sakura Tram': [
    { direction: 'end',  // toward Waseda
      destinations: [
        { until: '荒川車庫前', name: 'Arakawa-shakomae', ja: '荒川車庫前方面', color: '#d4007a',
          schedule: { weekday: { timeRange: [[9, 11], [19, 1]] }, weekend: { timeRange: [[9, 11], [18, 1]] } } },
        { until: '王子駅前',   name: 'Oji-ekimae',       ja: '王子駅前方面',   color: '#d4007a',
          schedule: { weekday: { timeRange: [[5, 8], [21, 1]] }, weekend: { timeRange: [[5, 8], [17, 1]] } } },
        { until: '大塚駅前',   name: 'Otsuka-ekimae',    ja: '大塚駅前方面',   color: '#d4007a',
          schedule: { weekday: { timeRange: [[5, 6], [7, 9], [18, 21], [22, 1]] }, weekend: { timeRange: [[5, 6], [22, 1]] } } },
        { until: '早稲田',     name: 'Waseda',           ja: '早稲田方面',     color: '#d4007a' },
      ] },
    { direction: 'start',  // toward Minowabashi
      destinations: [
        { until: '荒川車庫前', name: 'Arakawa-shakomae', ja: '荒川車庫前方面', color: '#d4007a',
          schedule: { weekday: { timeRange: [[8, 11], [18, 1]] }, weekend: { timeRange: [18, 1] } } },
        { until: '町屋駅前',   name: 'Machiya-ekimae',   ja: '町屋駅前方面',   color: '#d4007a',
          schedule: { weekday: { timeRange: [[5, 8], [15, 16], [18, 22]] }, weekend: { timeRange: [[6, 7], [9, 10], [20, 22]] } } },
        { until: '三ノ輪橋',   name: 'Minowabashi',      ja: '三ノ輪橋方面',   color: '#d4007a' },
      ] },
  ],
  // 8 weekday trains (8–9h and the last one) and 4 weekend ones end at 大島 (ODPT 2025-03)
  'Toei Shinjuku Line': {
    direction: 'end',  // toward Moto-Yawata
    destinations: [
      { until: '大島',   name: 'Ojima',      ja: '大島方面',   color: '#6CBB5A',
        schedule: { weekday: { timeRange: [[8, 11], [0, 1]] }, weekend: { timeRange: [[17, 19], [0, 1]] } } },
      { until: '本八幡', name: 'Moto-Yawata', ja: '本八幡方面', color: '#6CBB5A' },
    ],
  },
  // 22 weekday / 6 weekend trains end at 高島平 (mornings, evenings, the last ones) (ODPT 2026-03)
  'Toei Mita Line': {
    direction: 'end',  // toward Nishi-Takashimadaira
    destinations: [
      { until: '高島平',   name: 'Takashimadaira',       ja: '高島平方面',   color: '#2B50A1',
        schedule: { weekday: { timeRange: [[8, 11], [15, 17], [18, 21], [23, 1]] }, weekend: { timeRange: [[8, 10], [18, 19], [23, 1]] } } },
      { until: '西高島平', name: 'Nishi-Takashimadaira', ja: '西高島平方面', color: '#2B50A1' },
    ],
  },
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
  // 快速 run to 取手; 中距離 普通 mostly to 土浦, some to 水戸/勝田
  'JR Joban Line': {
    direction: 'end',  // away from Ueno
    destinations: [
      { until: '取手', name: 'Toride',    ja: '取手方面', color: '#009BBF' },
      { until: '土浦', name: 'Tsuchiura', ja: '土浦方面', color: '#0a7fa0' },
      { until: '水戸', name: 'Mito',      ja: '水戸方面', color: '#086080' },
      { until: '勝田', name: 'Katsuta',   ja: '勝田方面', color: '#064860' },
    ],
  },
  // 快速 from Tokyo mostly end at 津田沼/千葉, some 佐倉/成東; 普通 east of 千葉 run to 佐倉/成東/銚子
  'JR Sobu Line': {
    direction: 'end',  // away from Tokyo
    destinations: [
      { until: '津田沼', name: 'Tsudanuma', ja: '津田沼方面', color: '#F7C948' },
      { until: '千葉',   name: 'Chiba',     ja: '千葉方面',   color: '#E85830' },
      { until: '佐倉',   name: 'Sakura',    ja: '佐倉方面',   color: '#c86a20' },
      { until: '成東',   name: 'Naruto',    ja: '成東方面',   color: '#a05a20' },
      { until: '銚子',   name: 'Choshi (Sobu Line)', ja: '銚子方面（総武本線）', color: '#804818' },
    ],
  },
  // Toward 久里浜 half the trains end at 逗子; 大船 and 品川 in the rushes and late, 横須賀 a few
  // afternoon ones (ODPT 2026-03)
  'JR Yokosuka Line': {
    direction: 'end',  // toward Kurihama
    destinations: [
      { until: '品川',   name: 'Shinagawa', ja: '品川方面',   color: '#4a9ec0',
        schedule: { weekday: { timeRange: [[8, 10], [17, 18]] }, weekend: { stops: [] } } },
      { until: '大船',   name: 'Ofuna',     ja: '大船方面',   color: '#4a9ec0',
        schedule: { weekday: { timeRange: [[7, 11], [18, 20], [21, 1]] }, weekend: { timeRange: [[7, 11], [18, 21], [23, 1]] } } },
      { until: '逗子',   name: 'Zushi',     ja: '逗子方面',   color: '#0068B7',
        schedule: { weekday: { timeRange: [5, 1] }, weekend: { timeRange: [5, 1] } } },
      { until: '横須賀', name: 'Yokosuka',  ja: '横須賀方面', color: '#004a90',
        schedule: { weekday: { timeRange: [14, 22] }, weekend: { timeRange: [14, 22] } } },
      { until: '久里浜', name: 'Kurihama',  ja: '久里浜方面', color: '#003868' },
    ],
  },
  // Toward 千葉 a third of the Sotobo 普通 turn back at 上総一ノ宮 (ODPT 2026-03); toward 安房鴨川 the
  // short turns are lineDests on the Sotobo → Uchibo connection
  'JR Sotobo Line': {
    direction: 'start',  // toward Chiba
    destinations: [
      { until: '上総一ノ宮', name: 'Kazusa-Ichinomiya', ja: '上総一ノ宮方面', color: '#e8503a', services: ['Local'],
        schedule: { weekday: { timeRange: [[5, 6], [7, 22]] }, weekend: { timeRange: [[5, 6], [7, 22]] } } },
      { until: '千葉',       name: 'Chiba',             ja: '千葉方面',       color: '#e8503a' },
    ],
  },
  // Toward 千葉 half the Uchibo 普通 from the south turn back at 木更津 (ODPT 2026-03); toward 安房鴨川
  // the short turns are lineDests on the Uchibo → Sotobo connection
  'JR Uchibo Line': {
    direction: 'start',  // toward Chiba
    destinations: [
      { until: '木更津', name: 'Kisarazu', ja: '木更津方面', color: '#00b2e5', services: ['Local'],
        schedule: { weekday: { timeRange: [[5, 7], [8, 23]] }, weekend: { timeRange: [[5, 7], [8, 23]] } } },
      { until: '千葉',   name: 'Chiba',    ja: '千葉方面',   color: '#00b2e5' },
    ],
  },
  // Down termini: 成増, 志木, 川越市, 森林公園 (急行), 小川町 (快速急行/川越特急)
  'Tobu Tojo Line': {
    direction: 'end',  // away from Ikebukuro
    destinations: [
      { until: '成増',     name: 'Narimasu',     ja: '成増方面',     color: '#5aa0d8' },
      { until: '志木',     name: 'Shiki',        ja: '志木方面',     color: '#4890c8' },
      { until: '川越市',   name: 'Kawagoeshi',   ja: '川越市方面',   color: '#2a78b8' },
      { until: '森林公園', name: 'Shinrin-Koen', ja: '森林公園方面', color: '#0068B7' },
      { until: '小川町',   name: 'Ogawamachi',   ja: '小川町方面',   color: '#003878' },
    ],
  },
  // Daytime 普通 from 浅草 end at 北千住; 区間急行/区間準急 run to 東武動物公園/久喜/館林
  'Tobu Isesaki Line': {
    direction: 'end',  // away from Asakusa
    destinations: [
      { until: '北千住',       name: 'Kita-Senju',        ja: '北千住方面',       color: '#5a8ad0' },
      { until: '北越谷',       name: 'Kita-Koshigaya',    ja: '北越谷方面',       color: '#3a72c0' },
      { until: '東武動物公園', name: 'Tobu-Dobutsu-Koen', ja: '東武動物公園方面', color: '#003878' },
      { until: '久喜',         name: 'Kuki',              ja: '久喜方面',         color: '#005AAA' },
      { until: '館林',         name: 'Tatebayashi',       ja: '館林方面',         color: '#002a60' },
    ],
  },
  // 各駅停車 mostly end at 我孫子, some at 取手; 松戸 / 柏 in the rushes and late (ODPT 2026-03)
  'JR Joban Line (Local)': {
    direction: 'end',  // toward Toride
    destinations: [
      { until: '松戸',   name: 'Matsudo', ja: '松戸方面',   color: '#3ab070',
        schedule: { weekday: { timeRange: [[6, 10], [0, 1]] }, weekend: { timeRange: [[9, 10], [0, 1]] } } },
      { until: '柏',     name: 'Kashiwa', ja: '柏方面',     color: '#2a9a68',
        schedule: { weekday: { timeRange: [[6, 8], [17, 22]] }, weekend: { stops: [] } } },
      { until: '我孫子', name: 'Abiko',   ja: '我孫子方面', color: '#1aa260' },
      { until: '取手',   name: 'Toride',  ja: '取手方面',   color: '#009BBF' },
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
  // (No Sagami Line destinations: every train toward 茅ケ崎 runs the whole way, ODPT 2026-03)
  // Hachiko north segment: 6 a day each way turn back at 小川町 / 児玉 (ODPT 2026-03)
  'JR Hachiko Line': [
    { direction: 'end',  // toward Takasaki
      destinations: [
        { until: '小川町', name: 'Ogawamachi', ja: '小川町方面', color: '#996633',
          schedule: { weekday: { timeRange: [[7, 9], [10, 11], [14, 17], [20, 23]] }, weekend: { timeRange: [[7, 9], [10, 11], [14, 17], [20, 23]] } } },
        { until: '高崎',   name: 'Takasaki',   ja: '高崎方面',   color: '#996633' },
      ] },
    { direction: 'start',  // toward Komagawa
      destinations: [
        { until: '児玉',   name: 'Kodama',     ja: '児玉方面',   color: '#996633',
          schedule: { weekday: { timeRange: [[7, 12], [14, 18], [21, 23]] }, weekend: { timeRange: [[7, 12], [14, 18], [21, 23]] } } },
        { until: '高麗川', name: 'Komagawa',   ja: '高麗川方面', color: '#996633' },
      ] },
  ],
  // Most trains from 木更津 turn back at 久留里; 3 a day start there toward 木更津 (ODPT 2026-03)
  'JR Kururi Line': [
    { direction: 'end',  // toward Kazusa-Kameyama
      destinations: [
        { until: '久留里',   name: 'Kururi',          ja: '久留里方面',   color: '#8a6a3a',
          schedule: { weekday: { timeRange: [[8, 10], [11, 13], [14, 24]] }, weekend: { timeRange: [[8, 10], [11, 13], [14, 24]] } } },
        { until: '上総亀山', name: 'Kazusa-Kameyama', ja: '上総亀山方面', color: '#6a4a1a' },
      ] },
    { direction: 'start',  // toward Kisarazu
      destinations: [
        { until: '久留里', name: 'Kururi',   ja: '久留里方面', color: '#8a6a3a',
          schedule: { weekday: { timeRange: [[17, 19], [21, 22]] }, weekend: { timeRange: [[17, 19], [21, 22]] } } },
        { until: '木更津', name: 'Kisarazu', ja: '木更津方面', color: '#8a6a3a' },
      ] },
  ],
  // Toward 扇町 short turns at 弁天橋 (rushes), 武蔵白石 and 浜川崎 (ODPT 2026-03); the branch
  // ends keep each branch's own ride
  'JR Tsurumi Line': {
    direction: 'end',  // away from Tsurumi
    destinations: [
      { until: '弁天橋',   name: 'Bentembashi',       ja: '弁天橋方面',   color: '#80c0b0',
        schedule: { weekday: { timeRange: [[8, 11], [18, 19], [21, 23]] }, weekend: { timeRange: [[8, 10], [19, 22]] } } },
      { until: '海芝浦',   name: 'Umi-Shibaura',      ja: '海芝浦方面',   color: '#58a6ff' },
      { until: '大川',     name: 'Okawa',             ja: '大川方面',     color: '#f07000' },
      { until: '武蔵白石', name: 'Musashi-Shiraishi', ja: '武蔵白石方面', color: '#40a080',
        schedule: { weekday: { timeRange: [[7, 9], [11, 13], [14, 16]] }, weekend: { timeRange: [[11, 13], [14, 16], [17, 18], [19, 21]] } } },
      { until: '浜川崎',   name: 'Hama-Kawasaki',     ja: '浜川崎方面',   color: '#20a060',
        schedule: { weekday: { timeRange: [[6, 8], [10, 19], [20, 24]] }, weekend: { timeRange: [[8, 9], [10, 17], [18, 19], [23, 24]] } } },
      { until: '扇町',     name: 'Ogimachi',          ja: '扇町方面',     color: '#00b900' },
    ],
  },
  // Half the 各停 toward 蘇我 end at 海浜幕張, rush-hour and late ones at 新習志野; toward 東京 a
  // few start short at 新習志野 (ODPT 2026-03). The Sotobo / Uchibo through trains are connections.
  'JR Keiyo Line': [
    { direction: 'end',  // toward Soga
      destinations: [
        { until: '新習志野', name: 'Shin-Narashino',  ja: '新習志野方面', color: '#B01030', services: ['Local'],
          schedule: { weekday: { timeRange: [[8, 11], [18, 19], [20, 1]] }, weekend: { timeRange: [[19, 20], [21, 1]] } } },
        { until: '海浜幕張', name: 'Kaihin-Makuhari', ja: '海浜幕張方面', color: '#DC143C', services: ['Local'],
          schedule: { weekday: { timeRange: [6, 23] }, weekend: { timeRange: [6, 22] } } },
        { until: '蘇我',     name: 'Soga',            ja: '蘇我方面',     color: '#C9252B' },
      ] },
    { direction: 'start',  // toward Tokyo
      destinations: [
        { until: '新習志野', name: 'Shin-Narashino',  ja: '新習志野方面', color: '#B01030', services: ['Local'],
          schedule: { weekday: { timeRange: [[8, 10], [11, 12], [23, 1]] }, weekend: { timeRange: [[9, 11], [23, 1]] } } },
        { until: '東京',     name: 'Tokyo',           ja: '東京方面',     color: '#C9252B' },
      ] },
  ],
  // 東所沢 short turns both ways: mornings, evenings and the last trains (ODPT 2026-03)
  'JR Musashino Line': {
    direction: 'start',  // toward Fuchu-Hommachi
    destinations: [
      { until: '東所沢',   name: 'Higashi-Tokorozawa', ja: '東所沢方面',   color: '#F77321',
        schedule: { weekday: { timeRange: [[7, 11], [20, 22], [23, 1]] }, weekend: { timeRange: [[8, 11], [22, 1]] } } },
      { until: '府中本町', name: 'Fuchu-Hommachi',     ja: '府中本町方面', color: '#F77321' },
    ],
  },
  // Toward 大宮 half the trains turn back at 南浦和; 6 weekday-morning ones at 赤羽 (ODPT 2026-03)
  'JR Keihin Tohoku Line': {
    direction: 'start',  // toward Omiya
    destinations: [
      { until: '赤羽',   name: 'Akabane',       ja: '赤羽方面',   color: '#48b8d0', services: ['Local'],
        schedule: { weekday: { timeRange: [7, 11] }, weekend: { stops: [] } } },
      { until: '南浦和', name: 'Minami-Urawa',  ja: '南浦和方面', color: '#20a0c8' },
      { until: '大宮',   name: 'Omiya',         ja: '大宮方面',   color: '#00B2E5' },
    ],
  },
  // Toward 大船 most trains end at 桜木町 or 磯子 (ODPT 2026-03)
  'JR Negishi Line': {
    direction: 'end',  // toward Ofuna
    destinations: [
      { until: '桜木町', name: 'Sakuragicho', ja: '桜木町方面', color: '#d477d1' },
      { until: '磯子',   name: 'Isogo',       ja: '磯子方面',   color: '#b050b0' },
      { until: '大船',   name: 'Ofuna',       ja: '大船方面',   color: '#904090' },
    ],
  },
  // Toward 八王子 half the trains end at 橋本, 各停 only; 4 weekday ones at 町田 (ODPT 2026-03)
  'JR Yokohama Line': {
    direction: 'end',  // toward Hachioji
    destinations: [
      { until: '町田',   name: 'Machida',   ja: '町田方面',   color: '#3da03d', services: ['Local'],
        schedule: { weekday: { timeRange: [[7, 9], [22, 24]] }, weekend: { timeRange: [22, 24] } } },
      { until: '橋本',   name: 'Hashimoto', ja: '橋本方面',   color: '#6aba6a', services: ['Local'] },
      { until: '八王子', name: 'Hachioji',  ja: '八王子方面', color: '#00AD53' },
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
  // JR renamed its half 龍ケ崎市 (2020); Kanto Railway's Ryugasaki Line kept 佐貫
  "Ryugasakishi":               ["Sanuki"],
  "Sanuki":                     ["Ryugasakishi"],
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
