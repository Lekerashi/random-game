# Plan: Add Express Services for All Lines

## Summary
Add EXPRESS_SERVICES entries for 11 new lines (13 total with existing 2). Single edit to index.html expanding the EXPRESS_SERVICES object.

## Color Convention (matching Japanese departure board LEDs)
- 各停 Local: `#00a0e8` (blue)
- 準急 Semi-Exp: `#00b900` (green)
- 急行 Express: `#e83030` (red)
- 快速急行 Rapid Exp: `#f07000` (orange)
- 特急 Ltd. Exp: `#e83080` (magenta/pink) — Keio/Tokyu no-surcharge 特急
- 快特 Ltd. Exp: `#e83080` (magenta/pink) — Keikyu
- 快速 Rapid: `#00b900` (green)
- 区間急行 Sub-Exp: `#f0c000` (yellow)
- エアポート急行 Airport Exp: `#e83030` (red)
- 快速特急 Rapid Ltd: `#f07000` (orange)

## Lines to Add

### 1. Seibu Ikebukuro Line
- Local (各停): all stops — `stops: null`
- Semi-Exp (準急): Ikebukuro, Nerima, Shakujii-kōen Station, Hoya, Hibarigaoka, Higashi-Kurume, Kiyose, Akitsu, Tokorozawa → all stops to Hanno+
- Express (急行): Ikebukuro, Shakujii-kōen Station, Hibarigaoka, Tokorozawa, Nishi-Tokorozawa, Kotesashi, Sayamagaoka, Irumashi, Hanno → all stops beyond
- Rapid Exp (快速急行): Ikebukuro, Shakujii-kōen Station, Hibarigaoka, Tokorozawa, Kotesashi, Irumashi, Hanno → all stops beyond

### 2. Keio Line
- Local (各停): all stops — `stops: null`
- Sub-Exp (区間急行): Shinjuku, Sasazuka, Meidaimae, Chitose-karasuyama, Tsutsujigaoka, Chofu → all stops to Keiō-hachiōji
- Express (急行): Shinjuku, Meidaimae, Chitose-karasuyama, Tsutsujigaoka, Chofu, Fuchu, Bubaigawara, Seiseki-sakuragaoka, Takahatafudo, Kitano, Keiō-hachiōji
- Ltd. Exp (特急): Shinjuku, Meidaimae, Chofu, Fuchu, Seiseki-sakuragaoka, Takahatafudo, Kitano, Keiō-hachiōji

### 3. Keio Inokashira Line
- Local (各停): all stops — `stops: null`
- Express (急行): Shibuya, Shimo-Kitazawa, Meidaimae, Eifukucho, Kugayama, Inokashira-koen, Kichijōji

### 4. Odakyu Line
- Local (各停): all stops — `stops: null`
- Semi-Exp (準急): Shinjuku, Yoyogi-Uehara, Shimo-Kitazawa, Kyodo, Chitose-Funabashi, Seijogakuen-mae, Noborito, Mukogaoka-Yuen, Shin-Yurigaoka → all stops to Odawara
- Express (急行): Shinjuku, Yoyogi-Uehara, Shimo-Kitazawa, Kyodo, Seijogakuen-mae, Noborito, Shin-Yurigaoka, Machida, Sagami-Ono, Ebina, Hon-Atsugi, Isehara, Hadano, Shin-Matsuda → all stops to Odawara
- Rapid Exp (快速急行): Shinjuku, Yoyogi-Uehara, Shimo-Kitazawa, Shin-Yurigaoka, Machida, Sagami-Ono, Ebina, Hon-Atsugi, Isehara, Shin-Matsuda → all stops to Odawara

### 5. Tokyu Toyoko Line
- Local (各停): all stops — `stops: null`
- Express (急行): Shibuya, Naka-meguro, Gakugei-daigaku, Jiyugaoka, Den-en-chofu, Musashi-Kosugi, Hiyoshi, Tsunashima, Kikuna, Yokohama
- Ltd. Exp (特急): Shibuya, Naka-meguro, Jiyugaoka, Musashi-Kosugi, Hiyoshi, Kikuna, Yokohama

### 6. Tokyu Den-en-toshi Line
- Local (各停): all stops — `stops: null`
- Semi-Exp (準急): Shibuya, Ikejiri-ohashi, Sangen-jaya, Futako-tamagawa → all stops to Chuo-Rinkan
- Express (急行): Shibuya, Sangen-jaya, Futako-tamagawa, Mizonokuchi, Saginuma, Tama-plaza, Azamino, Nagatsuta, Chuo-Rinkan

### 7. Tobu Tojo Line
- Local (各停): all stops — `stops: null`
- Semi-Exp (準急): Ikebukuro, Narimasu, Wakoshi, Asaka, Asakadai, Shiki, Fujimino, Kami-fukuoka, Kawagoe, Kawagoeshi → all stops to Yorii
- Express (急行): Ikebukuro, Wakoshi, Asakadai, Kawagoe, Kawagoeshi, Sakado, Higashi-matsuyama → all stops to Yorii
- Rapid (快速): Ikebukuro, Wakoshi, Kawagoe, Kawagoeshi, Sakado, Higashi-matsuyama, Shinrin-koen, Musashi-ranzan, Ogawamachi → all stops to Yorii

### 8. Tobu Isesaki Line (Skytree Line)
- Local (各停): all stops — `stops: null`
- Sub-Exp (区間急行): Asakusa, TOKYO SKYTREE, Oshiage 'SKYTREE', Hikifune, Kita-Senju, Nishiarai, Takenotsuka, Soka, Shin-koshigaya, Koshigaya, Sengendai, Kasukabe → all stops beyond
- Semi-Exp (準急): Asakusa, TOKYO SKYTREE, Oshiage 'SKYTREE', Hikifune, Kita-Senju, Shin-koshigaya, Koshigaya, Sengendai, Kasukabe → all stops beyond
- Express (急行): Asakusa, TOKYO SKYTREE, Oshiage 'SKYTREE', Kita-Senju, Shin-koshigaya, Koshigaya, Sengendai, Kasukabe, Tobu Dobutsu-Koen, Kuki → all stops beyond

### 9. Keisei Main Line
- Local (各停): all stops — `stops: null`
- Rapid (快速): Keisei-Ueno, Nippori, Aoto, Keisei Takasago, Keisei Yawata, Keisei Funabashi, Keisei Tsudanuma, Yachiyodai, Katsutadai, Yūkarigaoka, Keisei-Sakura, Keisei-Narita, Airport Second Building (NRT Terminal 2), Narita Airport (NRT Terminal 1)
- Rapid Ltd (快速特急): Keisei-Ueno, Nippori, Aoto, Keisei Takasago, Keisei Yawata, Keisei Funabashi, Keisei Tsudanuma, Yachiyodai, Keisei-Sakura, Keisei-Narita, Airport Second Building (NRT Terminal 2), Narita Airport (NRT Terminal 1)

### 10. Keikyu Main Line
- Local (各停): all stops — `stops: null`
- Airport Exp (エアポート急行): Sengakuji, Shinagawa, Aomono-yokocho, Heiwajima, Keikyu Kamata, Keikyu Kawasaki, Keikyu Tsurumi, Kanagawa-shimmachi, Yokohama, Kamiooka, Sugita, Nokendai, Kanazawa-bunko, Kanazawa-Hakkei
- Ltd. Exp (快特): Sengakuji, Shinagawa, Keikyu Kamata, Keikyu Kawasaki, Yokohama, Kamiooka, Kanazawa-bunko, Kanazawa-Hakkei, Yokosuka-chuo, Horinouchi, Uraga

## Implementation
1. Single edit: expand the `EXPRESS_SERVICES` object in index.html with all new line entries
2. Station names must match the game data exactly (already verified above)
3. No code changes needed — the existing getTrainTypes/showTrainTypeButtons/thirst logic handles everything

## Risk: Station Name Mismatches
Same issue as Seibu Shinjuku — OSM may override some station names. After adding the data, I'll verify each line by running getExpressIndices in the preview to check for missing matches and fix any mismatches.
