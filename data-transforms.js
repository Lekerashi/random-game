const LINE_NAME_FIXES = {};

// Stations prepended to the beginning of lines
const LINE_PREPEND_STATIONS = {};

// Stations appended to the end of lines
const LINE_EXTRA_STATIONS = {
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

// Reverse station order (e.g. Tokaido: flip to south→north for through-running branches)
const LINE_REVERSE = ['JR Tokaido Main Line'];

// Through-running: stations appended after reversal for northern branch lines
const LINE_THROUGH_STATIONS = {
  'JR Tokaido Main Line': [
    // Ueno (shared junction)
    { name: 'Ueno',              ja: '上野',          lat: 35.71379,  lng: 139.777043 },
    // Utsunomiya / Takasaki shared trunk
    { name: 'Oku',               ja: '尾久',          lat: 35.74683,  lng: 139.753846 },
    { name: 'Akabane',           ja: '赤羽',          lat: 35.778026, lng: 139.720928 },
    { name: 'Urawa',             ja: '浦和',          lat: 35.858496, lng: 139.657109 },
    { name: 'Saitama-Shintoshin',ja: 'さいたま新都心', lat: 35.893867, lng: 139.633587 },
    { name: 'Omiya',             ja: '大宮',          lat: 35.906439, lng: 139.62405 },
    // Utsunomiya Line (diverges at Omiya)
    { name: 'Touro',             ja: '土呂',          lat: 35.931997, lng: 139.63214 },
    { name: 'Higashi Omiya',     ja: '東大宮',        lat: 35.948751, lng: 139.640291 },
    { name: 'Hasuda',            ja: '蓮田',          lat: 35.981272, lng: 139.653016 },
    { name: 'Shiraoka',          ja: '白岡',          lat: 36.01774,  lng: 139.666826 },
    { name: 'Shin-Shiraoka',     ja: '新白岡',        lat: 36.038732, lng: 139.67208 },
    { name: 'Kuki',              ja: '久喜',          lat: 36.065684, lng: 139.67727 },
    { name: 'Higashi-Washinomiya',ja:'東鷲宮',        lat: 36.089428, lng: 139.67913 },
    { name: 'Kurihashi',         ja: '栗橋',          lat: 36.136852, lng: 139.694177 },
    { name: 'Koga',              ja: '古河',          lat: 36.194375, lng: 139.709726 },
    { name: 'Nogi',              ja: '野木',          lat: 36.229963, lng: 139.734729 },
    { name: 'Mamada',            ja: '間々田',        lat: 36.257907, lng: 139.761039 },
    { name: 'Oyama (Tochigi)',   ja: '小山',          lat: 36.312747, lng: 139.806241 },
    { name: 'Koganei',           ja: '小金井',        lat: 36.374435, lng: 139.842232 },
    { name: 'Jichi Medical University', ja: '自治医大', lat: 36.39543, lng: 139.854524 },
    { name: 'Ishibashi',         ja: '石橋',          lat: 36.43651,  lng: 139.866536 },
    { name: 'Suzumenomiya',      ja: '雀宮',          lat: 36.493845, lng: 139.876811 },
    { name: 'Utsunomiya',        ja: '宇都宮',        lat: 36.559246, lng: 139.898389 },
    { name: 'Okamoto',           ja: '岡本',          lat: 36.598182, lng: 139.944363 },
    { name: 'Hoshakuji',         ja: '宝積寺',        lat: 36.631703, lng: 139.979487 },
    { name: 'Ujiie',             ja: '氏家',          lat: 36.681696, lng: 139.9621 },
    { name: 'Kamasuzaka',        ja: '蒲須坂',        lat: 36.720727, lng: 139.950461 },
    { name: 'Kataoka',           ja: '片岡',          lat: 36.754557, lng: 139.945665 },
    { name: 'Yaita',             ja: '矢板',          lat: 36.80655,  lng: 139.932912 },
    { name: 'Nozaki',            ja: '野崎',          lat: 36.843722, lng: 139.957752 },
    { name: 'Nishinasuno',       ja: '西那須野',      lat: 36.883726, lng: 139.986383 },
    { name: 'Nasushiobara',      ja: '那須塩原',      lat: 36.931956, lng: 140.020694 },
    { name: 'Kuroiso',           ja: '黒磯',          lat: 36.970128, lng: 140.060204 },
    // Takasaki Line (diverges at Omiya)
    { name: 'Miyahara',          ja: '宮原',          lat: 35.940256, lng: 139.609455 },
    { name: 'Ageo',              ja: '上尾',          lat: 35.973522, lng: 139.588434 },
    { name: 'Kita-Ageo',         ja: '北上尾',        lat: 35.985632, lng: 139.577223 },
    { name: 'Okegawa',           ja: '桶川',          lat: 35.998375, lng: 139.564274 },
    { name: 'Kitamoto',          ja: '北本',          lat: 36.032112, lng: 139.533591 },
    { name: 'Konosu',            ja: '鴻巣',          lat: 36.0592,   lng: 139.509552 },
    { name: 'Kita-Konosu',       ja: '北鴻巣',        lat: 36.085529, lng: 139.476894 },
    { name: 'Fukiage',           ja: '吹上',          lat: 36.103062, lng: 139.45312 },
    { name: 'Gyoda',             ja: '行田',          lat: 36.113879, lng: 139.432103 },
    { name: 'Kumagaya',          ja: '熊谷',          lat: 36.139627, lng: 139.389528 },
    { name: 'Kagohara',          ja: '籠原',          lat: 36.17448,  lng: 139.330199 },
    { name: 'Fukaya',            ja: '深谷',          lat: 36.191344, lng: 139.28127 },
    { name: 'Okabe',             ja: '岡部',          lat: 36.205645, lng: 139.237622 },
    { name: 'Honjo',             ja: '本庄',          lat: 36.236229, lng: 139.188299 },
    { name: 'Jinbohara',         ja: '神保原',        lat: 36.25359,  lng: 139.149172 },
    { name: 'Shimmachi',         ja: '新町',          lat: 36.272984, lng: 139.105457 },
    { name: 'Kuragano',          ja: '倉賀野',        lat: 36.300216, lng: 139.049474 },
    { name: 'Takasaki',          ja: '高崎',          lat: 36.322239, lng: 139.012354 },
    // Joban Line (branches at Ueno, through-service from Shinagawa)
    { name: 'Nippori',           ja: '日暮里',        lat: 35.727908, lng: 139.771287 },
    { name: 'Mikawashima',       ja: '三河島',        lat: 35.733383, lng: 139.777131 },
    { name: 'Minami-senju',      ja: '南千住',        lat: 35.734033, lng: 139.7994 },
    { name: 'Kita Senju',        ja: '北千住',        lat: 35.749677, lng: 139.804872 },
    { name: 'Ayase',             ja: '綾瀬',          lat: 35.762222, lng: 139.825019 },
    { name: 'Kameari',           ja: '亀有',          lat: 35.766527, lng: 139.847573 },
    { name: 'Kanamachi',         ja: '金町',          lat: 35.769582, lng: 139.870482 },
    { name: 'Matsudo',           ja: '松戸',          lat: 35.784472, lng: 139.900779 },
    { name: 'Kita Matsudo',      ja: '北松戸',        lat: 35.800459, lng: 139.911528 },
    { name: 'Mabashi',           ja: '馬橋',          lat: 35.811682, lng: 139.917305 },
    { name: 'Shin-Matsudo',      ja: '新松戸',        lat: 35.825467, lng: 139.921076 },
    { name: 'Kita Kogane',       ja: '北小金',        lat: 35.833436, lng: 139.931303 },
    { name: 'Minami-Kashiwa',    ja: '南柏',          lat: 35.844655, lng: 139.954111 },
    { name: 'Kashiwa',           ja: '柏',            lat: 35.862316, lng: 139.971148 },
    { name: 'Kita-Kashiwa',      ja: '北柏',          lat: 35.875623, lng: 139.988035 },
    { name: 'Abiko',             ja: '我孫子',        lat: 35.87279,  lng: 140.010466 },
    { name: 'Tennodai',          ja: '天王台',        lat: 35.872558, lng: 140.04121 },
    { name: 'Toride',            ja: '取手',          lat: 35.89553,  lng: 140.063004 },
  ],
};

// Trim lines at a given station (inclusive) — drop everything beyond it
const LINE_TRIM_AFTER = {
  'JR Chuo Main Line': '甲府',
};

// Lines absorbed into other lines (e.g. through-running now covered by Tokaido)
const LINE_REMOVE = ['Ueno Tokyo Line', 'Utsunomiya Line', 'JR Takasaki Line', 'JR Joban Line'];
