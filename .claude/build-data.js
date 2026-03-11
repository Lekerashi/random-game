/**
 * build-data.js — pre-build the Tokyo train topology.
 *
 * Run:  node .claude/build-data.js
 *
 * Fetches the full japan-train-data JSON (~10 MB), filters it down to
 * Greater Tokyo lines, applies all name corrections, and writes
 * data-tokyo.json (~300 KB) to the repo root.
 *
 * Station and line name corrections are applied here at build time so
 * the browser doesn't need to carry the fix tables at runtime.
 */

'use strict';

const https = require('https');
const fs    = require('fs');
const path  = require('path');

const DATA_URL = 'https://raw.githubusercontent.com/adieuadieu/japan-train-data/master/data/raw-data.json';
const OUT_PATH = path.join(__dirname, '..', 'data-tokyo.json');
const BOUNDS   = { minLat: 34.9, maxLat: 36.5, minLng: 138.5, maxLng: 141.0 };

const CIRCULAR_KEYWORDS = ['Yamanote', '\u014cedo', 'Oedo'];

const EXCLUDED_LINES = new Set([
  'JR Narita Express', // corrupted data merges Chuo Line stations into N'EX route
]);

// \u2500\u2500 Name correction tables \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
// These were previously applied at runtime in index.html.
// Now they are applied at build time so the browser gets pre-corrected data.

const LINE_NAME_FIXES = {
  'Ganan Railway Line':         'Gakunan Railway',        // 岳南電車
  'JR Kurumin Line':            'JR Kururi Line',         // 久留里線
  'Keisei Keeping Line':        'Keisei Oshiage Line',    // 京成押上線
  'Yurikamigame':               'Yurikamome',             // ゆりかもめ
  'JR double capital line':     'JR Ryomo Line',          // JR両毛線
  'Nagareyama Nagareyama line': 'Ryutetsu Nagareyama Line', // 流鉄流山線
  'Nippori · Territor Liner':   'Nippori-Toneri Liner',   // 日暮里・舎人ライナー

  'JR Chuo Sobu Line':          'JR Chuo-Sobu Line',      // add hyphen
  'JR Chuo Line (fast)':        'JR Chuo Line (Rapid)',   // capitalise

  // Fixes identified via station name sampling
  'Upper bristle electric railway cap line': 'Jomo Dentetsu Jomo Line', // 上毛電鉄上毛線
  'Eucalyptus line':            'Yukarigaoka Line',       // ユーカリが丘線
  'Aritogawa Line':             'Toden Arakawa Line',     // 都電荒川線
  'Hakone Toyama Cable Car':    'Hakone Tozan Cable Car', // 箱根登山ケーブルカー
  'Hakone Tozan Railway Railway Line': 'Hakone Tozan Railway', // 箱根登山鉄道
  'Iriomino line of Sotetsu':   'Sotetsu Izumino Line',   // 相鉄いずみ野線
  'Isami':                      'Isumi Railway',          // いすみ鉄道
  'Izukayama Railway Line Shuzu Line': 'Izuhakone Railway Sunzu Line', // 伊豆箱根鉄道駿豆線
  'Izukayama Railway Ohyozan Line': 'Izuhakone Railway Daiyuzan Line', // 大雄山線
  'JR Hachiaki Line':           'JR Hachiko Line',        // 八高線
  'JR Kurumin Line':            'JR Kururi Line',         // 久留里線
  'JR Sobo Line':               'JR Sotobo Line',         // 外房線
  'JR Tokinen Line':            'JR Togane Line',         // 東金線
  'Kanto Railway Jozan Line':   'Kanto Railway Joso Line', // 常総線
  'Kashima Coastal Railroad Otorakekashima Line': 'Kashima Rinkai Railway Oarai-Kashima Line', // 大洗鹿島線
  'Keio Zoological Line':       'Keio Dobutsuen Line',    // 動物園線
  'Keisei gem line':            'Keisei Kanamachi Line',  // 金町線
  'Leo liner':                  'Leo Liner',              // レオライナー (capitalization)
  'North total railway north line': 'Hokuso Railway Hokuso Line', // 北総鉄道北総線
  'Odakyu Tasa Line':           'Odakyu Tama Line',       // 多摩線
  'Rinka Line':                 'Rinkai Line',            // りんかい線
  'Seibu Hazime Line':          'Seibu Haijima Line',     // 拝島線
  'Seibu Kokubu Line':          'Seibu Kokubunji Line',   // 国分寺線
  'Seibu Seibu Line':           'Seibu Seibu-en Line',    // 西武園線
  'Seibu Shimbun':              'Seibu Chichibu Line',    // 秩父線
  'Seibuti Toshima Line':       'Seibu Toshima Line',     // 豊島線
  'Shin Nikei Line':            'Shin-Keisei Line',       // 新京成線
  'Tobu Daisuke Line':          'Tobu Daishi Line',       // 大師線
  'Tobu Koizumi line':          'Tobu Koizumi Line',      // (capitalization)
  'Tobu Oshi line':             'Tobu Ogose Line',        // 越生線
  'Toho High Speed \u200b\u200bWire': 'Toyo Rapid Railway Line', // 東葉高速鉄道線
  "Tokyu Children's National Line": 'Tokyu Kodomo-no-kuni Line', // こどもの国線
  'Tokyu Den - en - toshi Line': 'Tokyu Den-en-toshi Line', // (spacing fix)
};

const STATION_NAME_FIXES = {
  // Previous fixes
  'Mizokuchi':                    'Mizonokuchi',
  'Musashi Mizokuchi':            'Musashi-Mizonokuchi',

  // Tokyo Metro Yurakucho Line
  'Subway rise':                  'Chikatetsu-Narimasu',  // 地下鉄成増

  // Yurikamome Line
  'sunrise':                      'Hinode',               // 日の出

  // JR Chuo Main Line
  'Riverside':                    'Kawagishi',
  'Midori Lake':                  'Midoriko',

  // Tobu Nikko Line
  'Plate':                        'Itaka',               // 板荷

  // JR Minobu Line
  'Farmland':                     'Yorihata',            // 寄畑

  // JR Ito Line
  'Visiting Palace':              'Kinomiya',                  // 来宮
  'Izu Tiger':                    'Izu-Taga',                  // 伊豆多賀
  'Age':                          'Ajiro',                     // 網代

  // Keikyu Main Line
  'A censure':                    'Henmi',                     // 逸見
  'A door':                       'Tobe',                      // 戸部

  // JR Narita Line
  'A cheap meal':                 'Ajiki',                     // 安食
  'A new tree':                   'Araki',                     // 新木
  'A waterfall':                  'Suigo',                     // 水郷

  // JR Sagami Line
  'A company':                    'Shake',                     // 社家
  'Aiba-dori under':              'Sobudai-shita',             // 相武台下

  // JR Yokohama Line
  'A desk':                       'Kozukue',                   // 小机

  // Hakone Tozan Railway
  'A festival':                   'Kazamatsuri',               // 風祭

  // JR Kawagoe Line
  'A finger fan':                 'Sashiogi',                  // 指扇

  // JR Mito Line
  'A friend':                     'Tomobe',                    // 友部
  'Tozyou Castle':                'Higashi-Yuki',              // 東結城

  // Yokohama Blue Line
  'A landing area':               'Odoriba',                   // 踊場

  // Tobu Isesaki Line
  'A large bag':                  'Obukuro',                   // 大袋
  'A ship':                       'Hikifune',                  // 曳舟
  'Oshigami <before sky tree>':   'Oshiage (Skytree Mae)',     // 押上〈スカイツリー前〉
  'Tokyo Sky Tree':               'Tokyo Skytree',             // とうきょうスカイツリー

  // New Shuttle (Saitama)
  'A lodging house':              'Uchijuku',                  // 内宿

  // Tobu Tojo Line
  'A man':                        'Obusuma',                   // 男衾

  // Shin-Keisei Line
  'A picnic room':                'Yakuendai',                 // 薬園台

  // Nippori-Toneri Liner
  'A rookie':                     'Toneri',                    // 舎人
  'Temple Park': 'Toneri-Koen',  // 舎人公園

  // Seibu Shinjuku Line
  'A sack':                       'Numabukuro',                // 沼袋

  // Utsunomiya Line
  'A shogunyu':                   'Suzumenomiya',              // 雀宮
  'A tree':                       'Nogi',                      // 野木
  'A family house':               'Ujiie',                     // 氏家
  'Eastern Washi Palace': 'Higashi-Washinomiya',  // 東鷲宮

  // Joshin Electric Railway
  'A base store':                 'Nekoya',                    // 根小屋
  'Shrine farmland':              'Kannohara',                 // 神農原

  // Akita area railway
  'A shop':                       'Araya',                     // 新屋

  // Tobu Kiryu Line
  'The age':                      'Aio',                       // 相老

  // JR Minobu Line
  'A well bore':                  'Tatebori',                  // 竪堀
  'Genji temple':                 'Gendoji',                   // 源道寺

  // Seibu Tamaegawa Line
  'In front of the racecourse':   'Kyoteijomae',               // 競艇場前

  // Tokyu Setagaya Line
  'In front of Matsuo Shrine':    'Shoin-jinja Mae',           // 松陰神社前

  // Tokyo Metro Marunouchi Line
  'In front of the National Assembly building': 'Kokkai-Gijidomae', // 国会議事堂前

  // Toei Oedo Line
  'In front of Tokyo':            'Tochomae',                  // 都庁前

  // Hakone Toyama Cable Car
  'Under the park': 'Koen-Shita',  // 公園下
  'On the park': 'Koen-Kami',  // 公園上

  // Arakawa Tram (Aritogawa Line)
  'Under the Gakushuin':          'Gakushuin-shita',           // 学習院下

  // Fuji Express Line
  'In front of Ikei Onsen':       'Yoshiike Onsen Mae',        // 葭池温泉前
  'Before Toryi University of Science': 'Tsuru Bunkadaigakumae', // 都留文科大学前

  // Keisei Oshiage Line
  'Oshigami (before the sky tree)': 'Oshiage (Skytree Mae)',   // 押上（スカイツリー前）

  // JR Chuo Main Line
  'Dragon King':                  'Ryuo',                      // 竜王

  // Odakyu Line
  'Front of Aiba-dai':            'Sobudaimae',                // 相武台前
  'Before Tokai University':      'Tokai-Daigakumae',          // 東海大学前
  'Before Yomiuri Land':          'Yomiuriland-mae',           // 読売ランド前

  // Tokyo Metro Chiyoda Line
  'Front of Nijigyo Bashi':       'Nijubashimae',              // 二重橋前

  // Tokyo Metro Hanzomon Line (dataset says "Imperial Palace" — wrong! it's Suitengu shrine)
  'Imperial Palace':              'Suitengumae',               // 水天宮前

  // Tokyo Metro Namboku Line
  'University of Tokyo':          'Todaimae',                  // 東大前

  // Toei Mita Line
  'The gate':                     'Onarimon',                  // 御成門

  // Yurikamome
  'Before market':                'Shijomae',                  // 市場前

  // Tokyo Metro Ginza Line
  'Before Mitsukoshi':            'Mitsukoshimae',             // 三越前

  // JR Kashima Line
  'Kashima Shrine':               'Kashima Jingu',             // 鹿島神宮

  // Keisei Main Line
  'Okami Shrine':                 'Daijingu-shita',            // 大神宮下

  // Keisei Chihara Line
  'In front of the school':       'Gakuenmae',                 // 学園前

  // Keio Line
  'Hirayama Castle Ruins Park': 'Hirayamajoshi-Koen',  // 平山城址公園

  // Ganan Railway
  'Before Jatco (before Jatco 1 district)': 'Jatco Mae',                     // ジヤトコ前

  // "Mountain" translations
  'Mountain front':           'Yamazen',           // 山前 — Joshin Electric Railway
  'Mountain name':            'Yamana',            // 山名 — Joshin Electric Railway
  'Mountain':                 'Kayama',            // 栢山 — Odakyu Line
  'Fuji Mountain':            'Fujisan',           // 富士山 — Fujikyu Railway

  // "Valley" translations
  'Kamikaya Valley':          'Kami-Kumagaya',     // 上熊谷 — Chichibu Railway
  'Yoroiko Valley':           'Yoro-Keikoku',      // 養老渓谷 — Isumi Railway
  'Hase valley':              'Hase',              // 長谷 — Enoden / Odakyu

  // "Highway" translations
  'Koshu Highway':            'Koshu-Kaido',       // 甲州街道 — Keio Line
  'Sakura Highway':           'Sakura-Kaido',      // 桜街道 — New Shuttle
  'National Highway':         'Kokudo',            // 国道 — Keikyu Line

  // User-reported bad translations
  'Eastern view': 'Torami',  // 東浪見 — JR Sotobo Line
  'Virtue':                   'Gyotoku',           // 行徳 — Tokyo Metro Tozai Line
  'Katsunuma Vineyards':      'Katsunuma-Budokyo', // 勝沼ぶどう郷 — JR Chuo Main Line

  // "River" batch — fixed via OSM name:en lookup
  'Tengno River':             'Tobanoe',           // 騰波ノ江 — Kanto Railway
  'Thinking river':           'Omoigawa',          // 思川 — JR Ryomo Line
  'Koryo River':              'Komagawa',          // 高麗川 — JR Hachioji area
  'Kume River':               'Kumegawa',          // 久米川 — Seibu Shinjuku Line
  'Shinshin River':           'Shin-Kemigawa',     // 新検見川 — JR Chuo Sobu Line
  'River':                    'Namegawa',          // 滑河 — JR Narita Line
  'Togeki River':             'Higashi-Kiyokawa',  // 東清川 — JR Kururi Line
  'Kamijochon River':         'Kazusa-Nakagawa',   // 上総中川 — Isumi Railway
  'Between Kazusa River':     'Kazusa-Kawama',     // 上総川間 — Kominato Railroad
  'Negawa River':             'Nebukawa',          // 根府川 — JR Tokaido Main Line
  'Minokawa river':           'Bubaigawara',       // 分倍河原 — JR Nambu Line
  'Keio Tama river':          'Keio-Tamagawa',     // 京王多摩川 — Keio Sagamihara Line
  'Takino River 1-chome':     'Takinogawa-itchome',// 滝野川一丁目 — Arakawa Tram
  'Kamisawa River':           'Kami-Hoshikawa',    // 上星川 — Sotetsu Main Line
  'Futami River':             'Futamatagawa',      // 二俣川 — Sotetsu Main Line
  'Oi river':                 'Koikawa',           // 小井川 — JR Minobu Line
  'Yue Minami River':         'Gakunan-Enoo',      // 岳南江尾 — Ganan Railway

  // Full batch — fixed via OSM name:en lookup (distM < 500, manually verified)
  'Airport park':                     'Koku-koen',              // 航空公園
  'Amusement park west': 'Yuenchi-Nishi',  // 遊園地西
  'Animal park': 'Dobutsukoen',  // 動物公園
  'Arakawa Barges front':             'Arakawa-shakomae',       // 荒川車庫前
  'Arakawa gymnasium':                'Arakawa-yuenchimae',     // 荒川遊園地前
  'Arrow cut':                        'Yagiri',                 // 矢切
  'Asaka dai':                        'Asakadai',               // 朝霞台
  'Bamboo bridge':                    'Takebashi',              // 竹橋
  'Blue alley':                       'Aomono-yokocho',         // 青物横丁
  'Blue grinding':                    'Aoto',                   // 青砥
  'Blue moat':                        'Aohori',                 // 青堀
  'Both countries':                   'Ryogoku',                // 両国
  'Bowl shape':                       'Hachigata',              // 鉢形
  'bracken':                          'Warabi',                 // 蕨
  'Braze garden':                     'Mogusaen',               // 百草園
  'canal':                            'Unga',                   // 運河
  'Cherry blossom water':             'Sakurajosui',            // 桜上水
  "Children's nation":                'Kodomonokuni',           // こどもの国
  'Cleansing feet':                   'Senzoku',                // 洗足
  'Complex color':                    'Zoshiki',                // 雑色
  'Cormorant tree':                   'Unoki',                  // 鵜の木
  'Distribution center':              'Ryutsu Center',          // 流通センター
  'District center': 'Chiku-Center',  // 地区センター
  'Dongmen front':                    'Higashimonzen',          // 東門前
  'East Azuma': 'Higashi-Azuma',  // 東あずま
  'East Japan Bridge': 'Higashi-Nihombashi',  // 東日本橋
  'Eastern wheel':                    'Higashi-Hanawa',         // 東花輪
  'Eight pillars':                    'Yabashira',              // 八柱
  'Equal strength':                   'Todoroki',               // 等々力
  'Eucalyptus hill':                  'Yukarigaoka',            // ユーカリが丘
  'Eyeglass bed':                     'Mejirodai',              // めじろ台
  'First hunting':                    'Hatsukari',              // 初狩
  'First stone':                      'Hatsuishi',              // 初石
  'Five hundred':                     'Gohyakurakan',           // 五百羅漢
  'Flag bed':                         'Hatanodai',              // 旗の台
  'Flower garden':                    'Ohanabatake',            // 御花畑
  'Folding book':                     'Orimoto',                // 折本
  'Folding screen':                   'Byobugaura',             // 屏風浦
  'Fuchu horse race front gate':      'Fuchukeiba-seimonmae',   // 府中競馬正門前
  'Fujifilm front':                   'Fujifilm-mae',           // 富士フイルム前
  'Fujimi cho':                       'Fujimicho',              // 富士見町
  'Funabashi law':                    'Funabashi-Hoten',        // 船橋法典
  'Funabashi Nagasaki front':         'Funabashi-nichidaimae',  // 船橋日大前
  'Gaienmae front':                   'Gaiemmae',               // 外苑前
  'General aged':                     'Fusamoto',               // 総元
  'Gold hands':                       'Kanente',                // 金手
  'Good deed':                        'Zengyo',                 // 善行
  'Good fortune':                     'Onuki',                  // 大貫
  'Grass club':                       'Sakusabe',               // 作草部
  'Great sea':                        'Futomi',                 // 太海
  'Higashiyama north':                'Higashi-Yamakita',       // 東山北
  'Hirosete wild bird forest':        'Hirose-Yacho-no-Mori',   // ひろせ野鳥の森
  'hometown':                         'Kori',                   // 古里
  'Horikiri iris garden':             'Horikirishobuen',        // 堀切菖蒲園
  'Horse court':                      'Maniwa',                 // 馬庭
  'Horse rice':                       'Horigome',               // 堀米
  'Horse-drawn carriageway':          'Bashamichi',             // 馬車道
  'Ina central':                      'Ina-Chuo',               // 伊奈中央
  'Inage coast':                      'Inage-Kaigan',           // 稲毛海岸
  'Industrial road':                  'Daishibashi',            // 産業道路
  'International exhibition ground main gate': 'Tokyo Big Sight', // 国際展示場正門
  'Isawa hot spring':                 'Isawa-Onsen',            // 石和温泉
  'Ishigami front':                   'Ishigamimae',            // 石神前
  'Iwamoto cho':                      'Iwamotocho',             // 岩本町
  'Izumi gym':                        'Izumi-Taiikukan',        // 泉体育館
  'Kajima football stadium (clinic)': 'Kashima Soccer Stadium', // 鹿島サッカースタジアム
  'Kameido goddess':                  'Kameidosuijin',          // 亀戸水神
  'Kaohsiuen front':                  'Kagetsu-Sojiji',         // 花月園前
  'Kawachi cho':                      'Kawawacho',              // 川和町
  'Keisei gem':                       'Keisei Kanamachi',       // 京成金町
  'Keisei western ship':              'Keisei Nishifuna',       // 京成西船
  'Kiryu baseball stadium':           'Kiryu-Kyujo-mae',        // 桐生球場前
  'Large mouth':                      'Oguchi',                 // 大口
  'Leisure work':                     'Ozaku',                  // 小作
  'Light breeze':                     'Kofudai',                // 光風台
  'Liquor placement':                 'Sakaori',                // 酒折
  'Long life':                        'Kotobuki',               // 寿
  'Long time':                        'Chogo',                  // 長後
  'lotus root':                       'Hasune',                 // 蓮根
  'Lower groove':                     'Shimomizo',              // 下溝
  'Machiya station front':            'Machiya-ekimae',         // 町屋駅前
  'Mahibori coast':                   'Maborikaigan',           // 馬堀海岸
  'Main delivery':                    'Honno',                  // 本納
  'Maintenance center':               'Seibijo',                // 整備場
  'Many people':                      'Tatara',                 // 多々良
  'Maruyama lower':                   'Maruyama-shita',         // 丸山下
  'Mental sensation':                 'Myokaku',                // 明覚
  'Middle gods':                      'Nakagami',               // 中神
  'Middle school':                    'Chugakko',               // 中学校
  'Middle Urawa':                     'Naka-Urawa',             // 中浦和
  'Mikage mouth':                     'Misakiguchi',            // 三崎口
  'Minami kotoku':                    'Minami-gyotoku',         // 南行徳
  'Mine water park':                  'Minumadai-shinsuikoen',  // 見沼代親水公園
  'Misato center': 'Misato-Chuo',  // 三郷中央
  'Municipal tail':                   'Ichigao',                // 市が尾
  'Muroya city':                      'Ryokuen-toshi',          // 緑園都市
  'Musashi Kotono exit':              'Musashi-Mizonokuchi',    // 武蔵溝ノ口
  'Nagaizumi tears':                  'Nagaizumi-Nameri',       // 長泉なめり
  'Nakano Fujimi cho':                'Nakano-fujimicho',       // 中野富士見町
  'Nako ship form':                   'Nako-Funakata',          // 那古船形
  'Namiki center':                    'Namiki-Chuo',            // 並木中央
  'Namiki north':                     'Namiki-Kita',            // 並木北
  'Narrow space':                     'Hazama',                 // 狭間
  'National government':              'Kokuryo',                // 国領
  'National mother':                  'Kokubo',                 // 国母
  'New beginning':                    'Shin-Toride',            // 新取手
  'New birth place':                  'Shin-koshinzuka',        // 新庚申塚
  'New Funabashi':                    'Shin-Funabashi',         // 新船橋
  'New Isezaki':                      'Shin-Isesaki',           // 新伊勢崎
  'New Line Shinjuku':                'Shinsen-Shinjuku',       // 新線新宿
  'New maintenance center':           'Shinseibijo',            // 新整備場
  'New Mikawa Island':                'Shin-Mikawashima',       // 新三河島
  'New Ochanomizu':                   'Shin-ochanomizu',        // 新御茶ノ水
  'New Shimogo':                      'Shin-Misato',            // 新三郷
  'New term':                         'Niihari',                // 新治
  'New Tochigi':                      'Shin-Tochigi',           // 新栃木
  'New Zushi':                        'Zushi-Hayama',           // 新逗子 (renamed 2020)
  'Nishi nippori':                    'Nishi-Nippori',          // 西日暮里
  'Nishimita father':                 'Seibu-Chichibu',         // 西武秩父
  'Nishiura sum':                     'Nishi-Urawa',            // 西浦和
  'Nishiyama name':                   'Nishi-Yamana',           // 西山名
  'North Akabane':                    'Kita-Akabane',           // 北赤羽
  'North Ayase': 'Kita-Ayase',  // 北綾瀬
  'North Ikebukuro': 'Kita-Ikebukuro',  // 北池袋
  'North Kitakazaki':                 'Kita-Chigasaki',         // 北茅ケ崎
  'North Shin-Yokohama': 'Kita-Shin-Yokohama',  // 北新横浜
  'North south':                      'Yamakita',               // 山北
  'Northern part':                    'Kita-Kokubun',           // 北国分
  'Now feathers':                     'Komba',                  // 今羽
  'oak':                              'Kashiwa',                // 柏
  'Ocean wood':                       'Amaariki',               // 海士有木
  'Ohana store':                      'Ohanajaya',              // お花茶屋
  'Oi Racecourse place':              'Oikeibajo-Mae',          // 大井競馬場前
  'Omori cho':                        'Omorimachi',             // 大森町
  'Otsuka station front':             'Otsuka-ekimae',          // 大塚駅前
  'park':                             'Koen',                   // 公園
  'Plum house':                       'Umeyashiki',             // 梅屋敷
  'Port town':                        'Minatocho',              // 港町
  'position':                         'Tateba',                 // 立場
  'Prefectural government agency':    'Kencho-Mae',             // 県庁前
  'Prefectural university':           'Kenritsudaigaku',        // 県立大学
  'prince':                           'Oji',                    // 王子
  'Rainy season':                     'Hanuki',                 // 羽貫
  'Real rice':                        'Mimomi',                 // 実籾
  'Red Clay Elementary School':       'Akado-shogakkomae',      // 赤土小学校前
  'Research school':                  'Kenkyu-gakuen',          // 研究学園
  'Rich water':                       'Tomizu',                 // 富水
  'Sacred cherry blossoms':           'Seiseki-sakuragaoka',    // 聖蹟桜ヶ丘
  'Saitama Shintoshin down center':   'Saitama-Shintoshin',     // さいたま新都心
  "Sano's me":                        'Sano-no-Watashi',        // 佐野のわたし
  'Sculpture forest':                 'Chokokunomori',          // 彫刻の森
  'Sea god':                          'Kaijin',                 // 海神
  'Seibutsubashiba front':            'Seibukyujo-mae',         // 西武球場前
  'Seijo Gakuen front':               'Seijogakuen-mae',        // 成城学園前
  'Self-governing doctor':            'Jichi Medical University', // 自治医大
  'Shadow forest':                    'Kagemori',               // 影森
  'Shiba ura':                        'Umi-Shibaura',           // 海芝浦
  'Shibasaki gymnasium':              'Shibasaki-Taiikukan',    // 柴崎体育館
  'Shichuzen city':                   'Joshu-Nanokaichi',       // 上州七日市
  'Shinjuku Gyoenmae front':          'Shinjuku-gyoemmae',      // 新宿御苑前
  'Shintomi cho':                     'Shintomicho',            // 新富町
  'Sliding table':                    'Sengendai',              // せんげん台
  'Small chest':                      'Obitsu',                 // 小櫃
  'Small finger':                     'Kotesashi',              // 小手指
  'Small silk':                       'Kokinu',                 // 小絹
  'South Gotemba':                    'Minami-Gotemba',         // 南御殿場
  'South Kishi':                      'Minami-Kashiwa',         // 南柏
  'Southern market':                  'Nambu-Shijo',            // 南部市場
  'Sports center':                    'Sports Center',          // スポーツセンター
  'Suehiro cho':                      'Suehirocho',             // 末広町
  'Suzuki cho':                       'Suzukicho',              // 鈴木町
  "Takada's iron bridge":             'Takadano-Tekkyo',        // 高田の鉄橋
  'Takara cho':                       'Takaracho',              // 宝町
  'Takasaki commerce college front':  'Takasaki-Shoka-Daigaku-mae', // 高崎商科大学前
  'Takasaki wholesaler':              'Takasaki-Tonyamachi',    // 高崎問屋町
  'Tama area':                        'Tamasakai',              // 多摩境
  'Tama center':                      'Tama Center',            // 多摩センター
  'Tamagawa Gakuen front':            'Tamagawagakuen-mae',     // 玉川学園前
  'Ten islands':                      'Toshima',                // 十島
  'This lotusuma':                    'Motohasunuma',           // 本蓮沼
  'Three gate':                       'Mikado',                 // 三門
  'Three wives':                      'Mitsuma',                // 三妻
  'Tokai god':                        'Higashi-Kaijin',         // 東海神
  'Tokyo metropolitan government':    'Toritsu-Kasei',          // 都立家政
  'Toy tomb':                         'Omocha-no-Machi',        // おもちゃのまち
  'Tsuzuki Fureai no Oka':            'Tsuzuki-fureainooka',    // 都筑ふれあいの丘
  'Twelve bridges':                   'Junikyo',                // 十二橋
  'Ueno hair':                        'Kaminoge',               // 上野毛
  'Underwater hunting':               'Shimo-Togari',           // 下土狩
  'Upper groove':                     'Kamimizo',               // 上溝
  'War field':                        'Ikusabata',              // 軍畑
  'Washed basin':                     'Senzoku-ike',            // 洗足池
  'Waterfall immobility':             'Takifudo',               // 滝不動
  'West Eifuku': 'Nishi-Eifuku',  // 西永福
  'West Fujinomiya':                  'Nishi-Fujinomiya',       // 西富士宮
  'West handle':                      'Nishi-Toride',           // 西取手
  'West National':                    'Nishi-Kunitachi',        // 西国立
  'White circle':                     'Shiromaru',              // 白丸
  'White music':                      'Hakuraku',               // 白楽
  'Whole house':                      'Ienaka',                 // 家中
  'Wilderness bed':                   'Koyadai',                // 荒野台
  'Young leaves':                     'Wakaba',                 // 若葉
  'Yoyogi park':                      'Yoyogi-Koen',            // 代々木公園

  // User-reported
  'Fascia':                           'Hiregasaki',             // 鰭ヶ崎 — Ryutetsu Nagareyama Line
  'Fan Bridge':                       'Ogi-ohashi',             // 扇大橋 — Nippori-Toneri Liner

  // Previously skipped (outside original bounding box) — fixed by Japanese name lookup
  'Falling asleep':                   'Ochii',                  // 落居 — JR Minobu Line
  'Hino spring':                      'Hinoharu',               // 日野春 — JR Chuo Main Line
  'Hisa soil':                        'Kunado',                 // 久那土 — JR Minobu Line
  'Inner boat':                       'Utsubuna',               // 内船 — JR Minobu Line
  'Lower fee':                        'Shimo-Goshiro',          // 下小代 — Tobu Nikko Line
  'Lower hot springs':                'Shimobe-onsen',          // 下部温泉 — JR Minobu Line
  'North Kanuma':                     'Kita-Kanuma',            // 北鹿沼 — Tobu Nikko Line
  'Pile sheet':                       'Yaita',                  // 矢板 — JR Utsunomiya Line
  'Shinano border':                   'Shinano-Sakai',          // 信濃境 — JR Chuo Main Line

  // "v" batch — fixed via Japanese name OSM lookup
  'Cardiovascular Center':            'Shinzo-Kekkan Center',          // 心臓血管センター
  'Chuo University · Meisei University': 'Chuo-Daigaku Meisei-Daigaku', // 中央大学・明星大学
  'Dokkyo University Front Station <Soka Matsubara>': 'Dokkyo-Daigakumae (Soka-Matsubara)', // 獨協大学前駅
  'Gakugei University':               'Gakugei-daigaku',               // 学芸大学
  'Heavenly Bridge':                  'Tenkubashi',                    // 天空橋
  'Immovable':                        'Fudo-mae',                      // 不動前
  'Impression Japanese Medical University': 'Inba-Nihon-Idai',         // 印旛日本医大
  'Itakura Toyo University':          'Itakura-Toyodai-mae',           // 板倉東洋大前
  'Japan Boulevard':                  'Nihon-odori',                   // 日本大通り
  'Komazawa University':              'Komazawa-daigaku',              // 駒沢大学
  'Municipal University Medical School': 'Shidai-Igakubu',            // 市大医学部
  'Otsuka · Teikyo University':       'Otsuka-Teikyo-Daigaku',        // 大塚・帝京大学
  'Qualitative':                      'Koyasu',                        // 子安
  'Six-Party Nikkan University':      'Mutsuai-Nichidaimae',           // 六会日大前
  'Snow Grove Otsuka':                'Yukigaya-otsuka',               // 雪が谷大塚
  'Tokyo Metropolitan University':    'Toritsu-daigaku',               // 都立大学
  'Wave Hisae':                       'Hagure',                        // 波久礼

  // East/West literally translated instead of romanized
  'Eastern Zushi':                    'Higashi-Zushi',                 // 東逗子
  'Western Chofu':                    'Nishi-Chofu',                   // 西調布
  'Eastern Shiraku':                  'Higashi-Hakuraku',              // 東白楽
  'Shinjuku West Exit':               'Shinjuku-Nishiguchi',           // 新宿西口
  'Daisuke Nishiarai West':           'Nishiaraidaishi-Nishi',         // 西新井大師西

  // Misc literal/incorrect translations
  'Wada 浦':                          'Wadaura',                       // 和田浦
  'Bowl':                             'Tawarada',                      // 俵田 (俵 = tawara, not bowl)
  'Appointment':                      'Gumyo',                         // 求名
  'Takane Public Corporation':        'Takanekodan',                   // 高根公団
  'Wealth':                           'Hatsutomi',                     // 初富 (初富 = Hatsutomi)
  'Swamp':                            'Numabe',                        // 沼部
  'Wada Town':                        'Wadamachi',                     // 和田町
  'Waist-through':                    'Koshigoe',                      // 腰越

  // North/South literally translated instead of romanized
  'Minami Stone':                     'Minami-Ishige',                 // 南石下
  'Tachikawa North':                  'Tachikawa-Kita',                // 立川北
  'Center North':                     'Center Kita',                   // センター北
  'Center South':                     'Center Minami',                 // センター南
  'Okinawa Park South Exit':          'Uminokoen-Minamiguchi',         // 海の公園南口

  // Three/Stone/misc number+kanji literal translations
  'Stone':                            'Ishige',                        // 石下
  'Three-tier':                       'Mitsumata',                     // 三俣
  'Three-pass':                       'Mitsutouge',                    // 三つ峠

  // "Bridge" literally translated instead of romanized as -bashi/-hashi
  "Takada's iron bridge":             'Takadano-Tekkyo',               // 高田の鉄橋
  'Minami Kuribashi Bridge':          'Minami-Kurihashi',              // 南栗橋
  'Nakamura Bridge':                  'Nakamurabashi',                 // 中村橋
  'Edogawa Bridge':                   'Edogawabashi',                  // 江戸川橋
  'Tobu Bridge':                      'Higashi-Funabashi',             // 東船橋
  'Senju Ohashi Bridge':              'Senjuohashi',                   // 千住大橋
  'Akebono Bridge':                   'Akebonobashi',                  // 曙橋
  'Tsutomuhashi Bridge':              'Sangubashi',                    // 参宮橋
  'Akabane Bridge':                   'Akabanebashi',                  // 赤羽橋
  'Minowa Bridge':                    'Minowabashi',                   // 三ノ輪橋
  'Hiranuma Bridge':                  'Hiranuma-bashi',                // 平沼橋

  // Other bad translations
  'Bottom Butt':                      'Shimo-Itabashi',                // 下板橋
  'Stuff':                            'Monoi',                         // 物井
  'Mythology':                        'Myoden',                        // 妙典
  'Birthplace':                       'Iriuda',                        // 入生田
  'Counterbore':                      'Koshinzuka',                    // 庚申塚

  // Haneda Airport — merge same-terminal stations across Keikyu and Monorail
  '羽田空港国際線ターミナル':           'Haneda Airport Terminal 3',     // Keikyu (T3, same location as Monorail)
  '羽田空港国際線ビル':                'Haneda Airport Terminal 3',     // Monorail (T3, same location as Keikyu)
  '羽田空港第１ビル':                  'Haneda Airport Terminal 1',     // Monorail only
  '羽田空港第２ビル':                  'Haneda Airport Terminal 2',     // Monorail only
  '羽田空港国内線ターミナル':           'Haneda Airport Terminal 1 & 2', // Keikyu (serves both T1 & T2 via tunnel)

  // Narita Airport — official romaji + NRT terminal code
  '空港第２ビル（第２旅客ターミナル）': 'Airport Second Building (NRT Terminal 2)', // JR/Keisei official name
  '成田空港（第１旅客ターミナル）':     'Narita Airport (NRT Terminal 1)',     // JR/Keisei official name

  // Japanese-keyed overrides — used when the English translation collides with another station
  '馬込沢':                           'Magomezawa',                    // Tobu Noda Line (mistranslated as "Ma · Inosawa")
  '馬来田':                           'Makita (Kururi)',               // JR Kururi Line (≠ 蒔田 Makita on Blue Line)
  '新井宿':                           'Araijuku',                      // Saitama Rapid Railway (≠ 新宿 Shinjuku)
  '横芝':                             'Yokoshiba',                     // JR Sobu Line (≠ 横須賀 Yokosuka)
  '三河島':                           'Mikawashima',                   // JR Joban Line (neighborhood, not an island)
  '拝島':                             'Haijima',                       // JR/Seibu (mistranslated as "Pear Island")
  '行川アイランド':                    'Namegawa Island',               // JR Sotobo Line (named after wildlife park)
  '尻手':                             'Shitte',                        // JR Nambu Line (correct romanization)

  // 薬師 = Yakushi (Buddhist deity), not "pharmacist"
  '新井薬師前':                        'Araiyakushi-mae',               // Seibu Shinjuku Line

  // 海岸 = kaigan (coastline), not "coast"
  '稲毛海岸':                          'Inage Kaigan',                  // JR Keiyo Line
  '大森海岸':                          'Omori Kaigan',                  // Keikyu Main Line
  '馬堀海岸':                          'Mabori Kaigan',                 // Keikyu Main Line
  '鵠沼海岸':                          'Kugenuma Kaigan',               // Odakyu Enoshima Line
  '三浦海岸':                          'Miura Kaigan',                  // Keikyu Kurihama Line
  '湘南海岸公園':                      'Shonan Kaigan Koen',            // Enoshima Railway Line

  // 森 = mori, 林間 = rinkan — romanize rather than translate
  '流山おおたかの森':                  'Nagareyama-Otakanomori',        // Tsukuba Express
  '影森':                              'Kagemori',                      // Chichibu Railway
  '中央林間':                          'Chuo-Rinkan',                   // Tokyu Den-en-toshi Line
  '有明テニスの森':                    'Ariake Tennis-no-Mori',         // Yurikamome
  '彫刻の森':                          'Chokoku-no-Mori',               // Hakone Tozan Railway
  'ひろせ野鳥の森':                    'Hirose Wild Bird Forest',       // Chichibu Railway (official name)

  // 大師 = Daishi (Buddhist title), not "Daisuke"
  '西新井大師西':                      'Nishi-Arai Daishi Nishi',       // Nippori-Toneri Liner

  // Bad translations colliding with major/real stations
  '吾野':                              'Agano',                         // Seibu Ikebukuro (≠ 上野 Ueno)
  '飛田給':                            'Tobitakyu',                     // Keio Line (≠ 上野 Ueno)
  '保谷':                              'Hoya',                          // Seibu Ikebukuro (≠ 四ツ谷 Yotsuya)
  '江曽島':                            'Ezoshima',                      // Tobu Utsunomiya (≠ 江ノ島 Enoshima)
  '新習志野':                          'Shin-Narashino',                // JR Keiyo (≠ 新橋 Shinbashi)
  '三鷹台':                            'Mitakadai',                     // Keio Inokashira (≠ 三鷹 Mitaka)
  '下仁田':                            'Shimonita',                     // Joshin Electric (≠ 下飯田 Shimoda)
  '下飯田':                            'Shimoiida',                     // Blue Line (≠ 下仁田 Shimoda)
  '川間':                              'Kawama',                        // Tobu Noda (≠ 川岸 "Riverside")
  '川岸':                              'Kawagishi',                     // JR Chuo Main (≠ 川間 "Riverside")
  '用土':                              'Yodo',                          // JR Hachiko (≠ 土気 "Soil")
  '土気':                              'Toke',                          // JR Sobu (≠ 用土 "Soil")
  '入地':                              'Irichi',                        // Kanto Ryugasaki (≠ 入曽 "Entrance")
  '入曽':                              'Iriso',                         // Seibu Shinjuku (≠ 入地 "Entrance")

  // Missing Hon- prefix
  '本駒込':                            'Hon-Komagome',                  // Tokyo Metro Namboku (≠ 駒込 Komagome)
  '本厚木':                            'Hon-Atsugi',                    // Odakyu (≠ 厚木 Atsugi)
  '本吉原':                            'Hon-Yoshiwara',                 // Gakunan Railway (≠ 吉原 Yoshiwara)

  // Legitimate same-name stations needing disambiguation
  '霞ヶ関':                            'Kasumigaseki (Kawagoe)',        // Tobu Tojo (≠ 霞ケ関 Tokyo government district)
  '小山':                              'Oyama (Tochigi)',               // JR Utsunomiya (≠ 大山 Oyama in Tokyo)
  '藤岡':                              'Fujioka (Gunma)',               // Tobu Nikko Line (≠ 富士岡 on Gotemba)
  '富士岡':                            'Fujioka',                       // JR Gotemba Line

  // Gakunan Railway bad translations
  '岳南富士岡':                        'Gakunan Fujioka',               // (was "Yeonan Fujioka")
  '岳南原田':                          'Gakunan Harada',                // (was "Take Nanbara")
  '比奈':                              'Hina',                          // (was "Hana")

  // Chinese/Korean readings instead of Japanese
  '柳小路':                            'Yanagikoji',                    // Enoshima Railway (was "Yan Yanjiang")
  '新郷':                              'Shingo',                        // Chichibu Railway (was "Xinxiang")
  '梁川':                              'Yanagawa',                      // Fujikyuko Line (was "Yangcheon")
  '江北':                              'Kohoku',                        // Nippori-Toneri Liner (was "Gangbuk")
  '青海':                              'Aomi',                          // Yurikamome (was "Qinghai" — Chinese reading)
  '南平':                              'Minamidaira',                   // Keio Line (was "Nanping" — Chinese reading)
  '羽生':                              'Hanyu',                         // Tobu Isesaki Line (was "Hanyi" — Chinese reading)
  '新里':                              'Niisato',                       // Joshin Electric (was "Xinli" — Chinese reading)
  '高麗':                              'Koma',                          // Seibu Ikebukuro (was "Goryeo" — Korean reading)
  '禾生':                              'Kasei',                         // Fujikyuko Line (was "Fellowship")

  // Literal kanji translations instead of place-name readings
  '延方':                              'Nobekata',                      // JR Kashima Line (was "Elongation")
  '県':                                'Ken',                           // Tobu Isesaki Line (was "Prefecture")
  '静和':                              'Shizuwa',                       // Tobu Nikko Line (was "Quiet")
  '樅山':                              'Momiyama',                      // Tobu Nikko Line (was "Yezan")
  '韮山':                              'Nirayama',                      // Izu-Hakone Sunzu Line (was "Yezan")
  '寄居':                              'Yorii',                         // JR Hachiko Line (was "Lodging")
  '安中':                              'Annaka',                        // JR Shinetsu Line (was "Anxiety")
  '片貝':                              'Katakai',                       // Joshin Electric (was "Cantalus")
  '安善':                              'Anzen',                         // JR Tsurumi Line (was "Inexpedience")
  '原木':                              'Haramaki',                      // Izu-Hakone Sunzu Line (was "Logs")
  '柿生':                              'Kakio',                         // Odakyu Line (was "Persimmons")
  '開成':                              'Kaisei',                        // Odakyu Line (was "Opening")
  'ＹＲＰ野比':                        'YRP Nobi',                      // Keikyu Kurihama (was "YRP Nozomi" — 野比=Nobi)
  '東浦和':                            'Higashi-Urawa',                 // JR Musashino Line (was "Higashiura Japanese" — 和≠Japanese here)
  '東山梨':                            'Higashi-Yamanashi',             // JR Chuo Main (was "Higashiyama Prey" — 梨≠prey)
  '小台':                              'Odai',                          // Toden Arakawa Line (was "Scaffold")
  '大田郷':                            'Otago',                         // Kanto Railway (was "Ota Township" — 郷=go, not "township")
  '上本郷':                            'Kamihongo',                     // Shin-Keisei Line (was "Kamimoto Township" — 本郷=Hongo)
  '下落合':                            'Shimo-Ochiai',                  // Seibu Shinjuku Line (was "Descendants")
  '原市':                              'Haraichi',                      // New Shuttle (was "Hara City" — 市 is part of place name)
  '市役所前':                          'Shiyakusho-mae',                // Chiba Monorail (was "City Hall" — missing -mae)
  '鎌倉高校前':                        'Kamakura-Koko-Mae',             // Enoshima Railway (was "Kamakura High School" — missing -mae)

  // Misc romanizations
  'つきのわ':                          'Tsukinowa',                     // Tobu Tojo Line (つき=moon, not "accompanying")
  '女子大':                            'Joshidai',                      // 女子大学 abbreviated (not "Women's College")
  '船の科学館':                        'Fune-no-Kagakukan',             // Yurikamome (ship science museum, not "Ship's Academy")
  'ジヤトコ前（ジヤトコ１地区前）':    'Jatco Mae',                     // Gakunan Railway
  '阿左美':                            'Azami',                         // Tobu Kiryu Line (not "Mr. Atsumi")
  '富士山下':                          'Fujisanshita',                  // (neighborhood below Mt. Fuji, not "Mt. Fuji")
  '津田山':                            'Tsudayama',                     // JR Nambu Line (not "Mount Tsuda")
  '浜田山':                            'Hamadayama',                    // Keio Inokashira Line (not "Hamada Mt.")

  // "N-chome" → romanized chome number; also Shinju → Shimpu
  'Shinju':                           'Shimpu',                        // 新府 (JR Chuo Main Line)
  '銀座一丁目':                        'Ginza-Itchome',                 // 銀座一丁目
  '新宿三丁目':                        'Shinjuku-Sanchome',             // 新宿三丁目
  '青山一丁目':                        'Aoyama-Itchome',                // 青山一丁目
  '本郷三丁目':                        'Hongo-Sanchome',                // 本郷三丁目
  '四谷三丁目':                        'Yotsuya-Sanchome',              // 四谷三丁目
  '六本木一丁目':                       'Roppongi-Itchome',              // 六本木一丁目
  '西新宿五丁目':                       'Nishi-Shinjuku-Gochome',        // 西新宿五丁目
  '志村三丁目':                        'Shimura-Sanchome',              // 志村三丁目
  '荒川二丁目':                        'Arakawa-Nichome',               // 荒川二丁目
  '荒川七丁目':                        'Arakawa-Nanachome',             // 荒川七丁目
  '町屋二丁目':                        'Machiya-Nichome',               // 町屋二丁目
  '東尾久三丁目':                       'Higashi-Ogu-Sanchome',          // 東尾久三丁目
  '滝野川一丁目':                       'Takinogawa-Itchome',            // 滝野川一丁目
  '西ヶ原四丁目':                       'Nishigahara-Yonchome',          // 西ヶ原四丁目
  '東池袋四丁目':                       'Higashi-Ikebukuro-Yonchome',    // 東池袋四丁目

  // User-flagged miscellaneous bad translations
  'Battlefield':                      'Kassemba',                      // 合戦場
  'Barley':                           'Namamugi',                      // 生麦
  'Cabin':                            'Komuro',                        // 小室
  'Green':                            'Midorino',                      // みどりの
  'Ocean':                            'Taiyo',                         // 大洋
  'Treasure':                         'Daiho',                         // 大宝
  'Aqueduct':                         'Suidobashi',                    // 水道橋
  'Southwood':                        'Minami-Rinkan',                 // 南林間
  'Beehama':                          'Ushihama',                      // 牛浜

  // "Park" literally translated — should be romanized as -koen
  'Forest Park':                      'Shinrin-koen',                  // 森林公園
  'Tama Animal Park':                 'Tamadobutsukoen',               // 多摩動物公園 (Keio)
  'Shikugawa Park':                   'Yoshikawa-Koen',                // 葭川公園
  'Ashiaka Park':                     'Roka-koen',                     // 芦花公園
  'Kishien Park':                     'Kishine-koen',                  // 岸根公園
  'Shakujii Park':                    'Shakujiikoen',                  // 石神井公園
  'Inokashira Park':                  'Inokashira-koen',               // 井の頭公園
  'Togoshi Park':                     'Togoshi-koen',                  // 戸越公園
  'Shimizu Park':                     'Shimizukoen',                   // 清水公園
  'Inari Shan Park':                  'Inariyama-koen',                // 稲荷山公園
  'Shonan Coast Park':                'Shonankaigankoen',              // 湘南海岸公園
  'Odaiba Beach Park':                'Odaibakaihinkouen',             // お台場海浜公園
  'Seibu Park':                       'Seibu-yuenchi',                 // 西武遊園地
  'Mukogaoka Amusement Park':         'Mukogaoka-yuen',                // 向ヶ丘遊園

  // "Center" / "Distribution" literally translated — should be romanized
  'Nayama Central Park':              'Nagareyama-Central-Park',       // 流山セントラルパーク
  'Industry Promotion Center':        'Sangyoshinko Center',           // 産業振興センター
  'Sosio Distribution Center':        'Sosio Ryutsu Center',           // ソシオ流通センター

  // "Beach" literally translated — should be romanized as -hama
  'Tsukui Beach':                     'Tsukuihama',                    // 津久井浜
  'Nagahama-gama Beach Ocean Front Hamanasu Park': 'Chojagahama-Shiosai-Hamanasu-Koenmae', // 長者ヶ浜潮騒はまなす公園前
};

// ── Line colors ──────────────────────────────────────────────────────────────

const LINE_COLORS = {
  'Yamanote':   '#9ACD32', 'Chuo':       '#E85B0B', 'Sobu':       '#FFD400',
  'Keihin':     '#00B2E5', 'T\u014dkaid\u014d':    '#F7A600', 'Tokaido':    '#F7A600',
  'J\u014dban':      '#009BBF', 'Joban':      '#009BBF', 'Saiky\u014d':     '#007540',
  'Saikyo':     '#007540', 'Sh\u014dnan':     '#E9003F', 'Shonan':     '#E9003F',
  'Keiyo':      '#DC143C', 'Nambu':      '#F7A600', 'Yokohama':   '#00AD53',
  'Hachik\u014d':    '#996633', 'Hachiko':    '#996633', '\u014cme':        '#00AD53',
  'Ome':        '#00AD53', 'Itsukaichi': '#00AD53',
  'Ginza':      '#F39700', 'Marunouchi': '#E60012', 'Hibiya':     '#9B7A00',
  'T\u014dzai':      '#009BBF', 'Tozai':      '#009BBF', 'Chiyoda':    '#00BB85',
  'Y\u016brakuch\u014d':  '#C9A800', 'Yurakucho':  '#C9A800', 'Hanz\u014dmon':   '#8F76D6',
  'Hanzomon':   '#8F76D6', 'Namboku':    '#00AC9B', 'Fukutoshin': '#9C5E31',
  'Asakusa':    '#EE0011', 'Mita':       '#2B50A1', 'Shinjuku':   '#6CBB5A',
  '\u014cedo':       '#B6007A', 'Oedo':       '#B6007A',
  'Tokyu':      '#0066B3', 'Odakyu':     '#0099DD', 'Keio':       '#800080',
  'Keisei':     '#FF4400', 'Seibu':      '#009944', 'Tobu':       '#003087',
  'Sotetsu':    '#003087', 'Sagami':     '#003087',
};

function getLineColor(name) {
  for (const [key, color] of Object.entries(LINE_COLORS)) {
    if (name.includes(key)) return color;
  }
  let h = 0;
  for (const c of name) h = (h * 31 + c.charCodeAt(0)) & 0xffffff;
  return '#' + (h | 0x404040).toString(16).slice(-6);
}

function isCircular(name) {
  return CIRCULAR_KEYWORDS.some(k => name.includes(k));
}

// ── Fetch & build ────────────────────────────────────────────────────────────

process.stdout.write('Downloading raw train data (~10 MB)\u2026 ');
const chunks = [];
https.get(DATA_URL, res => {
  res.on('data', d => chunks.push(d));
  res.on('end', () => {
    process.stdout.write('done\n');
    process.stdout.write('Filtering to Greater Tokyo & applying name fixes\u2026 ');

    const data    = JSON.parse(Buffer.concat(chunks).toString());
    const lines   = [];
    const seenJa  = new Set();

    for (const pref of data) {
      for (const line of (pref.lines || [])) {
        if (!line.lat || !line.lng) continue;
        if (line.lat < BOUNDS.minLat || line.lat > BOUNDS.maxLat) continue;
        if (line.lng < BOUNDS.minLng || line.lng > BOUNDS.maxLng) continue;
        const lineJa = line.name?.ja || line.name?.en || '';
        if (seenJa.has(lineJa)) continue;
        seenJa.add(lineJa);

        // Apply line name fixes and strip route-span parentheticals
        let lineName = line.name.en || line.name.ja;
        if (LINE_NAME_FIXES[lineName]) lineName = LINE_NAME_FIXES[lineName];
        lineName = lineName.replace(/\s*\(.*?\)\s*$/, '').trim();

        // Skip excluded lines (checked after fixes are applied)
        if (EXCLUDED_LINES.has(lineName)) continue;

        const stations = (line.stations || [])
          .filter(s => s.location?.lat && s.location?.lng)
          .map(s => {
            const rawEn = s.name.en || s.name.ja;
            const rawJa = s.name.ja || s.name.en;
            // Apply station name fixes: check Japanese key first, then English
            const fixed = STATION_NAME_FIXES[rawJa] ?? STATION_NAME_FIXES[rawEn] ?? rawEn;
            return {
              name: fixed,
              ja:   rawJa,
              lat:  s.location.lat,
              lng:  s.location.lng,
            };
          });

        if (stations.length < 2) continue;

        lines.push({
          id:       line.id,
          name:     lineName,
          ja:       line.name.ja,
          color:    getLineColor(lineName),
          circular: isCircular(lineName),
          stations,
        });
      }
    }

    // ── Inject missing stations not in source data (post-2017) ─────
    // Source data is from 2017; these stations/lines opened after that.
    const MISSING_STATIONS = [
      // Takanawa Gateway (Mar 2020) — Yamanote & Keihin-Tohoku
      { lineMatch: 'Yamanote',      afterStation: 'Tamachi',
        station: { name: 'Takanawa Gateway', ja: '高輪ゲートウェイ', lat: 35.6357, lng: 139.7406 } },
      { lineMatch: 'Keihin Tohoku', afterStation: 'Tamachi',
        station: { name: 'Takanawa Gateway', ja: '高輪ゲートウェイ', lat: 35.6357, lng: 139.7406 } },
      // Toranomon Hills (Jun 2020) — Hibiya Line, between Kasumigaseki and Kamiyacho
      { lineMatch: 'Hibiya',        afterStation: 'Kasumigaseki',
        station: { name: 'Toranomon Hills', ja: '虎ノ門ヒルズ', lat: 35.6675, lng: 139.7478 } },
      // Nishiya — missing from Sotetsu Main Line (between Kami-Hoshikawa and Tsurugamine)
      { lineMatch: 'Sotetsu Main',  afterStation: 'Kami-Hoshikawa',
        station: { name: 'Nishiya', ja: '西谷', lat: 35.4691, lng: 139.5541 } },
    ];
    for (const ms of MISSING_STATIONS) {
      const line = lines.find(l => l.name.includes(ms.lineMatch));
      if (!line) continue;
      const idx = line.stations.findIndex(s => s.name === ms.afterStation);
      if (idx === -1) continue;
      line.stations.splice(idx + 1, 0, ms.station);
    }

    // ── Add new lines not in source data ────────────────────────────
    const NEW_LINES = [
      // Tokyu Shin-Yokohama Line (Mar 2023) — Shin-Yokohama to Hiyoshi
      {
        id: 'tokyu-shin-yokohama', name: 'Tokyu Shin-Yokohama Line',
        ja: '東急新横浜線', color: '#ee0033', circular: false,
        stations: [
          { name: 'Shin-Yokohama', ja: '新横浜', lat: 35.5068, lng: 139.6173 },
          { name: 'Shin-tsunashima', ja: '新綱島', lat: 35.5360, lng: 139.6361 },
          { name: 'Hiyoshi', ja: '日吉', lat: 35.5539, lng: 139.6469 },
        ],
      },
      // Sotetsu Shin-Yokohama Line (Nov 2019 / Mar 2023 extension)
      {
        id: 'sotetsu-shin-yokohama', name: 'Sotetsu Shin-Yokohama Line',
        ja: '相鉄新横浜線', color: '#0068b7', circular: false,
        stations: [
          { name: 'Nishiya', ja: '西谷', lat: 35.4691, lng: 139.5541 },
          { name: 'Hazawa Yokohama-Kokudai', ja: '羽沢横浜国大', lat: 35.4814, lng: 139.5864 },
          { name: 'Shin-Yokohama', ja: '新横浜', lat: 35.5068, lng: 139.6173 },
        ],
      },
    ];
    for (const nl of NEW_LINES) {
      lines.push(nl);
    }

    const stationCount = lines.reduce((n, l) => n + l.stations.length, 0);
    process.stdout.write('done\n');
    console.log('  ' + lines.length + ' lines, ' + stationCount + ' stations');

    fs.writeFileSync(OUT_PATH, JSON.stringify(lines));
    const kb = Math.round(fs.statSync(OUT_PATH).size / 1024);
    console.log('  Written -> data-tokyo.json (' + kb + ' KB)');
  });
}).on('error', e => { console.error('Fetch error:', e.message); process.exit(1); });
