# Random Game — Tokyo

## Game flow
1. **Pick a station** — search, geolocate, or random. Calls `onStationSelected()`.
2. **Roll a train line** (`rollPlatform()`): dice picks a platform. Special: "Drink here!", "Take a flight!" (airport), or Shinkansen (5% chance).
3. **Roll stops** (`rollStops()`): branch picker → train-type picker (if applicable) → dice picks 1–N stops. Transfer checks at each station along the route.
4. **Arrive** — destination card with map/bars/cafes and "Roll Again From Here".

## Key concepts
- **Platform model**: each direction of a train line = one platform. Linear lines have 2 (toward each terminus), circular (Yamanote, Oedo) have Direction A/B. Terminal stations have 1.
- **Express services** (`EXPRESS_SERVICES`): lookup of line → train types (Local, Semi-Exp, Express, etc.) with station lists. Service names should match real signboard names (e.g. "Express" / 急行, not branded names). Use `game.validateExpress()` to check stop names match game data. Optional `schedule` field for day-of-week overrides (see below). Exclude commuter-only services (通勤急行 etc.) that run one-way mornings only.
- **Schedule-aware stops**: services can have a `schedule: { weekend: { skip: [...] } }` field. `getScheduleType()` returns `'weekday'`/`'weekend'` (auto-detected from device day with 2am boundary via `SCHEDULE_DAY_BOUNDARY`, overridable via `window._forceSchedule`). `resolveServiceStops(service, line)` applies `skip` (remove stations) or `stops` (full override) per schedule. E.g. Chuo Rapid skips Koenji/Asagaya/Nishi-Ogikubo on weekends. Use `{ stops: [] }` to hide a service entirely for a schedule (e.g. Seibu Ikebukuro Rapid Exp weekday-only → `schedule: { weekday: { stops: [] } }`).
- **Branch lines** (`LINE_BRANCHES`): sub-routes for physically branching lines (Tsurumi, Marunouchi, Nambu). Shared-trunk detection auto-selects when branches produce the same route. Branches can be **direction-aware** via `direction: 'start'|'end'`. Separate branch lines (Keio Sagamihara, Odakyu Enoshima/Tama) use connections instead.
- **Line connections** (`LINE_CONNECTIONS` in `data-connections.js`): ~60 directed connections for through-running, resolved by `resolveConnections()`. No line mutation. Use `game.validateConnections()` to check all resolved, `game.connectionInfo(query)` to inspect. Key behaviors:
  - **Single connection** auto-selects transparently (e.g. Hanzomon↔Den-en-toshi). **Multiple connections** show branch picker (e.g. UTL northbound) or destination picker (e.g. UTL southbound).
  - **Terminus connections** extend `maxStops` via `computeConnectionExtra()`. **Mid-line connections** create express branch choices only (e.g. Keikyu Kamata→Airport, Seibu Nerima→Yurakucho). At the junction station itself, the branching line appears as its own platform.
  - **Connection express** (`express` field): cross-line services resolved by `resolveConnectionExpress()`. Tagged with `_connTargetLineIdx`. Source-line express continues as local through connections **only when the target line has no express services** (e.g. Den-en-toshi Express → Hanzomon local). When the target line has its own express (e.g. Tobu Tojo), the source express does NOT extend — the target line's types handle through-running.
  - **Chain express** (`_chainExpressStops`): when a connection's express name matches on onward connections, stop names are merged into a Set for filtering across all hops (e.g. F-Liner: Seibu→Fukutoshin→Toyoko express all the way).
  - **Chained connections**: `computeConnectionExtra` and `getStationsAlongRoute` follow `getOnwardConnections()` recursively with cycle detection. Chains stop when `toUntil` is set.
  - **Platform merge**: `mergeConnectionPlatforms()` combines connection-only platforms (0 on-line stops) with same `displayName`+direction. **Connection displayName** overrides pill label (e.g. "Ueno Tokyo Line").
  - **State**: use `clearSelectionState()` to clear all 4 selection fields. Never clear individually.
  - **Transfer awareness**: `checkTransfers()` builds `routeLineNames` from source line + all chained connection lines.
- **Shinkansen** (`SHINKANSEN_LINES`): 5% independent chance, excluded from normal rolls. Three lines: Tokaido, Tohoku, Joetsu. Shared-track platforms merged by `mergeShinkansenPlatforms()`. Express with identical stops grouped in picker (e.g. "Yamabiko / Tsubasa").
- **Thirst mechanic**: after 5+ stations without drinking, extra dice numbers map to "Drink here!". Shinkansen counts 3x (`SHINKANSEN_THIRST`).
- **Transfers**: at each station along the route, a d5 roll decides whether to transfer or continue.
- **Route map**: Leaflet map with offline vector base layer (ward/city/prefecture/river boundaries from `TOKYO_GEO`). Route polylines follow intermediate stations (via `routeCoords` saved in history entries), not straight from→to lines. Markers: 🍺 for drink stops, white dot for session start, small blue dot for transfers. Two instances: **stats overlay** (`state.routeMap`, toggled via "Show Route Map" in stats) and **inline** (`state.inlineRouteMap`, toggled via button below session history, auto-refreshes each round). Both built by shared `buildRouteMap(elId)`.
- **Save image** (`saveSessionImage()`): exports session route map + stats as a PNG. Renders to an offscreen canvas with tile map background (falls back to `TOKYO_GEO` vector if tiles fail). Station labels use 4-way collision avoidance (above → below → right → left). "Save Image" button in both route map overlays.

## Key helpers
- **`getScheduleType()`** / **`resolveServiceStops(service, line)`**: schedule-aware stop resolution. `getScheduleType()` returns `'weekday'`/`'weekend'`. `resolveServiceStops()` applies `schedule.skip`/`schedule.stops` overrides. Used by `getTrainTypes()`.
- **`getEffectiveStops(platform, opts?)`**: computes valid max stops accounting for express/branch/cap/connections/destinations/chain-express. Returns `{ validCount, physicalStopsMap, rawMax, cappedMax }`.
- **`clearSelectionState()`** / **`rebuildPickers(p, opts?)`**: clear all 4 selection fields; try branch→train type→roll stops fallback. Use instead of inline clearing or picker logic.
- **`resetRoundState()`**: clears per-round state (calls `clearSelectionState()` + other fields).
- **`showDestCard(station, subHtml)`**: sets dest card name (EN + JA), Google Maps link, sub-content. Don't duplicate `station.ja` in subHtml.
- **`destSubHints(station, emoji)`**: renders drink/park hints + easter eggs. `'wrap'`/`'inline'`/falsy controls emoji.
- **UI helpers**: `showRollStopsUI()`, `showTrainTypeUI()`, `resetDiceUI()`, `resetStopsBtn()`, `setStationInput()`, `formatStationName()`, `capStops()`, `pillTextStyle(hex)`.
- **Connection helpers**: `getConnections()`, `getConnectionMaxStops()`, `getConnectionStations()`, `computeConnectionExtra()`, `getOnwardConnections()`, `resolveConnectionExpress()`, `effectiveViaCount()`, `mergeConnectionPlatforms()`, `showDestinationPicker()`, `showBranchPickerUI()`.
- **Platform builders**: `getPlatforms()` dispatches to `getOedoTochomaePlatforms()`, `getCircularPlatforms()`, or `getLinearPlatforms()`, then runs `mergeConnectionPlatforms()`.
- **Transfer check**: `checkTransfers()` orchestrates `buildThirstTracker()`, `renderJourneyCard()`, `resolveTransfer()`.
- **Route map**: `buildRouteMap(elId)` creates a Leaflet map on any element. `showRouteMap()` / `hideStats()` manage the stats overlay instance (`state.routeMap`). `toggleInlineRouteMap()` / `refreshInlineRouteMap()` manage the inline instance (`state.inlineRouteMap`). Both are separate from `state.leafletMap`. History entries store `routeCoords` (array of `[lat, lng]` pairs including departure station) for polyline rendering. Rebuilt from scratch each toggle/refresh.
- **`normalize(s)`**: lowercases, strips macrons/accents/spaces/hyphens/apostrophes and trailing "Station". Used for all station name matching.

## Data
- Primary source: `japan-train-data` GitHub raw JSON (~10 MB), filtered to Tokyo area at runtime. Cached in localStorage `random_game_v12` (30-day TTL). **Bump cache key** when data changes structurally.
- **Station name fixes**: `STATION_NAME_FIXES` in `.claude/build-data.js` (~300+ entries). `buildIndex()` also strips "Station" suffix and normalizes Oshiage bracket variants at runtime.
- **Line transforms** (in `data-transforms.js`): `LINE_NAME_FIXES`, `LINE_EXTRA_STATIONS`, `LINE_TRIM_AFTER`, `LINE_REMOVE`, `LINE_PREPEND_STATIONS`.
- **Injected lines**: `buildIndex()` injects lines missing from upstream (e.g. Keisei Higashi-Narita, Shinkansen). `_findStn(ja)` / `_stnCoord(ja, fallback)` helpers for coordinate reuse.
- **`STATION_ALIASES`**: physically connected stations with different names (e.g. Harajuku↔Meiji-jingumae). Affects both `getPlatforms` and `hasTransferLines`.
- **`WALKABLE_STATIONS`**: walkway connections. Only affects `getPlatforms`, NOT mid-route transfers.
- **`ANCHOR_STATIONS`**: curated well-known stations for consistent "toward" labels.
- **Through-running connections** (in `data-connections.js`): ~60 entries. Connection fields: `from/fromEnd`, `to/toEnd/toStation/toDir`, `via`, `toUntil`, `name/ja/color`, `destinations`, `express`, `displayName`.
- **Ward/city/prefecture boundaries** (in `data-wards.js`): offline GeoJSON built by `.claude/build-wards.js` from Overpass API. Contains 23 ward polygons, ~212 city polygons, 4 prefecture polygons, and 3 river LineStrings. Used by the route map only — not game logic.

## Debug tools
- **Dev server**: `node .claude/server.js` on **port 5500**. Auto-injects `debug.js`, eval bridge, SSE auto-reload. Eval endpoint supports multi-statement expressions with semicolons (auto-returns last expression). `POST /eval?timeout=ms` for long-running ops. Shortcuts: `GET /test`, `/validate`, `/platforms`, `/route`, `/state`.
- `window._state` — read-only state ref. `window._forceNextRoll = N` — forces next roll. `window._forceTransferQueue = [1,1,4]` — queues transfer outcomes. `window._forceSchedule = 'weekend'|'weekday'` — overrides day-of-week detection.
- **`window.game`** — programmatic API. Key methods: `game.state()`, `game.route()`, `game.data(query?)`, `game.scenario(opts)`, `game.playTo(phase, opts)`, `game.test(filter?)`, `game.fuzz(n)`, `game.journey(legs)`. Data: `game.expressServices()`, `game.branches()`, `game.findStation()`, `game.linesAt()`. Validation: `game.validateExpress()`, `game.validateConnections()`, `game.validateStopOrder()`, `game.validateBranches()`, `game.connectionInfo(query)`. Testing: `game.coverage()`, `game.stressLine(name)`. See `game.help()`.
- **`game.journey(legs)`**: reproduce a specific multi-leg route from human-readable descriptions. Each leg: `{ from, line, toward?, branch?, trainType?, transferAt?, drinkAt?, stops?, thirst? }`. Fuzzy-matches line names, auto-resolves direction, computes stop counts and transfer queues. Example: `game.journey([{from:'Shinjuku', line:'Yamanote', transferAt:'Meguro'}, {line:'Tokyu Meguro', drinkAt:'Den-en-chofu'}])`.
- **`game.test(filter?)`**: 27 test scenarios covering arrivals, transfers, drinks, flights, branches, express, shinkansen, circular/Oedo, rerolls, connections (5 types), schedule-aware services, chain express, thirst, 23-wards toggle. Run all: `game.test()`, by name: `game.test('connection')`, list: `game.test.list()`. Also: `GET /test` via dev server.
- **Fast transfer rolls**: when `_skipAnimation` is true (debug fast mode), `resolveTransfer()` skips the button-click wait entirely — transfers resolve instantly without needing `autoClickTransfers`.
- **Auto-reload**: polls `/mtime` every 1s for changes to `index.html`, `debug.js`, `data-lines.js`, `data-i18n.js`, `data-transforms.js`, `data-connections.js`, `data-wards.js`.

## i18n
- Bilingual EN/JP via `data-i18n` attributes and JS dictionary. Always add both translations.
- Station names stored in both languages; search works in both. Game logic uses English internally.

## Conventions
- **Timing constants**: use named constants (`TRANSFER_DIE_FRAMES`, etc.) instead of magic numbers.
- **Destination card**: `showDestCard()` sets both EN and JA names — don't duplicate `station.ja` in subHtml.
- Game logic in `index.html`. Static data split into `data-lines.js`, `data-i18n.js`, `data-transforms.js`, `data-connections.js`, `data-wards.js`.
- No build step, no transpilation. Dark theme via CSS custom properties.
- Bump `CACHE_NAME` in `sw.js` (current: `rg-v6`) and localStorage key (current: `random_game_v12`) when data changes.
- **Easter eggs**: vague commit messages. Add to `EASTER_EGGS` config + i18n strings. Helpers (`getEgg()`, `eggEmoji()`, etc.) used by all render paths automatically.

## Pitfalls — things that already caused bugs

### State management
- **Selection state**: use `clearSelectionState()` at all reset points. Never null fields individually.
- **`onCapChange`/`onWards23Change`**: call `clearSelectionState()` then `rebuildPickers(p)`. Re-add connection extensions after recalculating on-line maxStops.
- **Never mutate `p.maxStops` for destinations**: use `state.selectedDestination = { totalMax }` instead.
- **Never mutate station objects** from `state.lines` — they're shared across all routes.
- **Rerolls must undo history entries** before re-rolling.
- **State must be captured before reset** in functions that check then clear state.

### Display & styling
- **Inline styles persist across rounds**: always call `resetStopsBtn()` when resetting step 2 UI.
- **CSS hidden-state**: `el.style.display = ''` doesn't clear `display:none` from multi-property inline styles.
- **i18n strings can contain HTML**: render with `innerHTML`, not `textContent`.
- **`switchLang` refreshers**: dynamic text lives in `_langRefreshers` array. Must distinguish branch vs train-type picker state.
- **Train type button layout**: full-width Local top row only for exactly 3 types (after grouping), not `>= 3`.
- **Train type grouping**: two-pass grouping. First pass: identical `expressIndices` into one button (key includes `_terminatesAtJunction` and `_connTargetLineIdx`). Second pass: merge types with identical `validCount` (e.g. Semi-Exp/Express/Rapid Exp all 1-1 → one button). **Never merge local with express** types by count — same count can mean different destinations.
- **Target-line type dedup**: when a connection's target line has express services, `showTrainTypeButtons` adds them with `_connTargetLineIdx`. Skips target Local if source already has one. Disambiguates colliding names with target line prefix (e.g. "Tobu Tojo Express" / "東武東上 急行"). Uses `LINE_NAMES_JA` for Japanese prefix.

### Data quality
- **Station name collisions**: upstream has bad translations (e.g. 新井宿 → "Shinjuku"). Use `game.validateExpress()` and `game.validateConnections()` to catch mismatches.
- **Oedo line is a lollipop, not circular**: only loops at Tochomae. `findMajorStation()` must treat it as non-circular (`wrap = false`) so stem station labels don't wrap through the loop.
- **Express stop names must exactly match game data** after `normalize()`. Run `game.validateExpress()` after adding/changing express services. Run `game.validateStopOrder()` to verify stops are on-line and in order. Run `game.validateBranches()` after editing `LINE_BRANCHES`. Or use `GET /validate` to run all at once.
- **Connection express**: `resolveConnectionExpress()` handles all cross-line express. Target-line indices tagged with `_connTargetLineIdx` — `getStationsAlongRoute` skips its own express routing when set. Mid-line connections use `_connTotalMax`.

### Route map
- **Leaflet needs a view before adding layers**: `L.map()` must call `.setView()` before adding polylines, or `_clipPoints` throws. The route map sets a temporary view then `fitBounds` overwrites it.
- **`routeCoords` must include departure**: `getStationsAlongRoute()` does NOT include the starting station — `addHistory()` prepends `currentStation` coordinates.
- **Three Leaflet instances**: `state.leafletMap` (destination card), `state.routeMap` (stats overlay), `state.inlineRouteMap` (below history). Don't mix them up. `hideStats()` destroys `routeMap`; `clearHistory()` destroys `inlineRouteMap`.

### Connections
- **Y-junctions need the right model**: at a station on both lines (e.g. Kotake-mukaihara on Fukutoshin + Seibu Yurakucho), the branching line appears as its own platform — no Fukutoshin→Seibu mid-line connection needed. Adding a mid-line connection with `fromDir` creates unwanted branch pickers from all upstream stations.
- **Terminus through-running chains**: Seibu Yurakucho → Seibu Ikebukuro at Nerima is a terminus connection so the Seibu Yurakucho platform extends onto Ikebukuro toward Kotesashi/Hanno.

### Express data accuracy
- **Keep stops current with timetable revisions**: services change every few years. Key revisions since 2019: Keio 特急 gained stops (2022), Keikyu エアポート急行→急行 (2023), Tobu Tojo all-local Kawagoe–Ogawamachi (2023), Odakyu 快速急行/準急 gained stops (2025). Research with web search when unsure.
- **F-Liner**: exists as both a Fukutoshin `EXPRESS_SERVICES` entry (same stops as Express, groups into "Express / F-Liner" button) AND as connection express on Seibu→Fukutoshin and Fukutoshin→Toyoko connections. The Tobu Tojo 快速急行 is also the F-Liner on that portion.

### Misc
- **Always test in the actual UI**: `game.test()` covers basic paths but not specific UI flows.
- **Event listener stacking**: use `{ once: true }` or guard against double-fires.
- **23-wards boundary**: polygon needs northern boundary (exclude Saitama).
