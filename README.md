# 🎲 Random Game — Tokyo

A random Tokyo train station drinking game. Roll dice to pick train lines and stops, hop between stations, and discover new places to drink across Greater Tokyo.

**Play it live at [randomgame.tokyo](https://randomgame.tokyo)**

## How it works

1. **Pick a starting station** — search, use GPS, or pick randomly
2. **Roll a train line** — dice picks from available platforms at your station
3. **Roll stops** — dice picks how many stops to ride
4. **Arrive & drink** — find nearby bars, izakayas, or cafes, then roll again from your new station

Special rolls include "Drink here!" (stay and drink at your current station) and a rare airport easter egg.

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

- Station data from [japan-train-data](https://github.com/nicholasgasior/japan-train-data), filtered to Greater Tokyo at runtime
- Maps via Leaflet.js + OpenStreetMap
- Nearby venues via Overpass API

## Credits

Conceived by Shane, perfected by Shane & Zack, vibe coded by Logan — the Kens
