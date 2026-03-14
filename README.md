# 🎲 Random Game — Tokyo

A random Tokyo train station drinking game. Roll dice to pick train lines and stops, hop between stations, and discover new places to drink across Greater Tokyo.

**Play it live at [randomgame.tokyo](https://randomgame.tokyo)**

## How it works

1. **Pick a starting station** — search, use GPS, or pick randomly
2. **Roll a train line** — dice picks from available platforms at your station
3. **Roll stops** — dice picks how many stops to ride
4. **Arrive & drink** — find nearby bars, izakayas, or cafes, then roll again from your new station

## Features

- Covers all Greater Tokyo rail lines — JR, Metro, Toei, private railways
- Express service support — Local, Semi-Express, Express, Ltd. Express
- Branch line routing with smart branch detection
- Transfer opportunities at connecting stations
- Thirst mechanic that increases drink chances after 5+ stations
- Bilingual UI (English / Japanese)
- GPS-based nearest station detection
- Late night last-train warning
- Session history with route sharing

## Tech

Single-file web app (`index.html`) — no frameworks, no build step, no npm. Opens directly in a browser.

- Station data from [japan-train-data](https://github.com/adieuadieu/japan-train-data), filtered to Greater Tokyo at runtime
- Maps via Leaflet.js + OpenStreetMap
- Nearby venues via Overpass API

## Credits

Conceived by Shane, perfected by Shane & Zack, vibe coded by Logan — the Kens

Localized by Yuko

---

# 🎲 Random Game — Tokyo（日本語）

東京の電車を使ったランダム飲み歩きゲーム。サイコロを振って路線と駅数を決め、駅を巡りながら東京中の飲み屋を開拓しよう。

**プレイはこちら → [randomgame.tokyo](https://randomgame.tokyo)**

## 遊び方

1. **出発駅を選ぶ** — 検索、GPS、またはランダムで選択
2. **路線を振る** — サイコロで駅のホームから路線を決定
3. **駅数を振る** — サイコロで何駅乗るかを決定
4. **到着＆飲む** — 近くのバー・居酒屋・カフェを探して、新しい駅からまたサイコロを振ろう

## 特徴

- 首都圏の全路線に対応 — JR、メトロ、都営、私鉄各線
- 急行・特急に対応 — 各停、準急、急行、特急など
- 分岐路線のスマートなルーティング
- 乗換駅での乗り換えチャンス
- 5駅以上飲まずに進むと「飲め！」の確率が上がるのどの渇きシステム
- 日英バイリンガルUI
- GPSによる最寄り駅検出
- 深夜の終電警告
- セッション履歴とルート共有

## 技術

単一ファイルのWebアプリ（`index.html`）— フレームワークなし、ビルドなし、npmなし。ブラウザで直接開けます。

- 駅データ：[japan-train-data](https://github.com/adieuadieu/japan-train-data)（実行時に首都圏をフィルタ）
- 地図：Leaflet.js + OpenStreetMap
- 周辺施設：Overpass API

## クレジット

企画：Shane、改良：Shane & Zack、バイブコーディング：Logan — the Kens

ローカライズ：優子
