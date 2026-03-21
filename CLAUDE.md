# Random Game — Tokyo

## Game flow
1. **Pick a station** — search, geolocate, or random. Calls `onStationSelected()`.
2. **Roll a train line** (`rollPlatform()`): dice picks a platform. Special: "Drink here!", "Take a flight!" (airport), or Shinkansen (5% chance).
3. **Roll stops** (`rollStops()`): branch picker → train-type picker (if applicable) → dice picks 1–N stops. Transfer checks at each station along the route.
4. **Arrive** — destination card with map/bars/cafes and "Roll Again From Here".

## Key concepts
- **Platform model**: each direction of a train line = one platform. Linear lines have 2 (toward each terminus), circular (Yamanote, Oedo) have Direction A/B. Terminal stations have 1.
- **Express services** (`EXPRESS_SERVICES`): lookup of line → train types (Local, Semi-Exp, Express, etc.) with station lists. Service names should match real signboard names so users can identify their train (e.g. "Airport Exp" / エアポート急行, not generic "Express"). Express services can be defined on through-running lines (e.g. Airport Exp on Keikyu Airport Line covers Shinagawa→Haneda).
- **Branch lines** (`LINE_BRANCHES`): sub-routes for physically branching lines (Tsurumi, Marunouchi, Nambu). Smart shared-trunk detection auto-selects when branches produce the same route within rollable range. Flow: `rollPlatform()` → `showBranchButtons()` → `showTrainTypeButtons()` → `rollStops()`. Branches can be **direction-aware** via `direction: 'start'|'end'`. Branch hint stations: when a single branch exists for a direction, `getLinearPlatforms` uses the branch terminus as the platform hint instead of `findMajorStation`.
- **Line connections** (`LINE_CONNECTIONS` in `data-connections.js`): directed connections between lines for through-running, resolved at runtime by `resolveConnections()`. No line mutation needed — lines stay as-is from upstream. Key behaviors:
  - **Platform extension**: `getLinearPlatforms` extends maxStops through connections at the terminus. `effectiveViaCount(conn, stationName)` skips via stations matching the player's current station (e.g. at Ueno, the via=Ueno is skipped since you're already there).
  - **Terminus-only rule**: at a terminus, connections without `via` stations are skipped (the other line's platform handles it via its own connection). Connections WITH via (bridging a gap between lines) create legitimate terminus platforms.
  - **Single connection**: auto-selects transparently, route extends through junction (e.g. Hanzomon↔Den-en-toshi at Shibuya).
  - **Multiple connections**: shows branch picker (e.g. Tokaido northbound → Utsunomiya/Takasaki/Joban). When all connections share the same target line AND have `destinations`, shows a destination picker instead (e.g. UTL southbound: Tokyo/Shinagawa/Hiratsuka/Kozu/Odawara/Atami/Numazu).
  - **Destination picker**: `destinations` array with `{ until, name, ja, color }` limits how far you ride on the target line. Destinations with the same `effectiveMax` (due to cap) are deduplicated. When only 1 unique remains, auto-selects.
  - **`toUntil`**: limits how far a connection extends on the target line (e.g. Keikyu Yokohama connection stops at Yokohama, not Uraga).
  - **Platform merge**: `mergeConnectionPlatforms()` combines connection-only platforms (0 on-line stops) with the same `displayName` and direction into a single platform with combined connections and the target line's color.
  - **Connection displayName**: overrides the platform pill label (e.g. "Ueno Tokyo Line"). Applied when all connections share the same displayName.
  - **Target-line express**: when a connection's target line has `EXPRESS_SERVICES`, those train types appear in the picker with `_connTargetLineIdx` tag. Express indices reference the target line, not the source. A "terminates at junction" option (`_terminatesAtJunction`) is added for trains that don't through-run. `getEffectiveStops` and `getStationsAlongRoute` detect connection-target express via this tag and route accordingly (source line = local, target line = express-filtered).
  - **State**: `state.selectedConnection` tracks the active connection. Must be cleared at all reset points alongside `selectedBranch`. `p._originalMaxStops` preserves the platform's original maxStops when destination selection mutates it (restored by `onCapChange`).
  - **Transfer awareness**: `hasTransferLines()` accepts a Set of line names; `checkTransfers()` builds the set from all lines in the current route so riding through Den-en-toshi doesn't trigger "transfer to Den-en-toshi".
- **Shinkansen** (`SHINKANSEN_LINES`): shinkansen platforms appear at shared stations but are excluded from normal rolls — 5% independent chance to trigger (like flights, but you ride the line normally). Three lines: Tokaido (Tokyo→Shizuoka), Tohoku (Tokyo→Utsunomiya), Joetsu (Tokyo→Takasaki). Platforms sharing the same next station are merged into one "Shinkansen" pill (e.g. Tohoku+Joetsu toward Tokyo from Ueno); when rolled, a random underlying line is picked. At divergence points (e.g. Omiya), separate pills appear. Express services with identical stop patterns are grouped in the picker (e.g. "Yamabiko / Tsubasa"). Respects 23-wards mode. All shinkansen line names must be in `LINE_NAMES_JA` for i18n (including the generic `'Shinkansen'` key used by merged pills).
- **Thirst mechanic**: after 5+ stations without drinking, extra dice numbers map to "Drink here!". Shinkansen stops count 3x toward thirst (`SHINKANSEN_THIRST`) since they cover much greater distances.
- **Transfers**: at each station along the route, a d5 roll decides whether to transfer or continue.

## Key helpers
- **`capStops(max)`**: applies stop-cap setting. Use instead of inline ternaries.
- **`getEffectiveStops(platform, opts?)`**: computes valid (non-drunk-at) max stops accounting for express/branch/cap/connections. `opts: { ei, bi, _connTargetLineIdx, _terminatesAtJunction }` override state defaults. Temporarily sets `state.selectedTrainType` for route preview when connection-target opts are passed. Returns `{ validCount, physicalStopsMap, rawMax, cappedMax }`. Use instead of manual chains.
- **`showRollStopsUI()`**: hides train type row, shows roll stops row. Use instead of setting both `display` properties inline.
- **`showTrainTypeUI()`**: hides roll stops row, shows train type row. Use instead of setting both `display` properties inline.
- **`resetDiceUI()`**: resets both dice faces, labels, disabled states, and calls `resetStopsBtn()`. Used by `onStationSelected` and `rerollPlatform`.
- **`resetStopsBtn()`**: clears inline styles on `rollStopsBtn`. Called by `resetDiceUI()` — only call directly if you need to reset stops button without resetting dice.
- **`showDestCard(station, subHtml)`**: sets dest card name (EN + JA), Google Maps link, sub-content, and activates/scrolls the card. Use for all arrival paths (flight, drink-here, drink-at-transfer, normal arrival). Japanese name now shows prominently next to English — don't duplicate it in `subHtml`.
- **`destSubHints(station, emoji)`**: renders drink/park hints + easter eggs for arrival card. `'wrap'`/`'inline'`/falsy controls emoji prefix. Use in all dest-sub render paths.
- **`resetRoundState()`**: clears per-round state (including `selectedConnection`). Used by `onStationSelected` and `resetGame`. Don't use in reroll functions (they clear only selectedTrainType/selectedBranch/selectedConnection intentionally).
- **`setStationInput(englishName)`**: displays station name in current language. Always use instead of setting `dom.stationInput.value` directly.
- **`formatStationName(name, ja)`**: renders station name with secondary in `<small>` tag, respecting current language. Use in autocomplete and journey card instead of inline `currentLang === 'ja'` checks.
- **`historyName(en, ja)`** / **`historyNameHtml(en, ja)`**: pick the appropriate name for current language from history entry fields. Plain text vs HTML-with-small-secondary variants. Use in `buildHistoryItem` and `copyRoute`.
- **`effectiveViaCount(conn, stationName)`**: counts via stations excluding the player's current station. Use instead of `conn.viaStations.length` in all connection maxStops calculations.
- **`getConnections(lineName, lineIdx, direction, fromIdx)`**: returns connections from a line at its terminus in a given direction.
- **`getConnectionMaxStops(conn)`**: counts reachable stops on the target line, respecting `toUntilIdx` and 23-wards.
- **`getConnectionStations(conn, maxStops)`**: returns station objects along the target line, respecting `toUntilIdx`.
- **`mergeConnectionPlatforms(platforms)`**: merges connection-only platforms with same `displayName`+direction. Uses target line color.
- **`showBranchPickerUI(p, choices, hasExpress)`**: shared UI renderer for branch/connection/destination picker buttons.
- **Platform builders**: `getPlatforms()` dispatches to `getOedoTochomaePlatforms()`, `getCircularPlatforms()`, or `getLinearPlatforms()` based on line type, then runs `mergeConnectionPlatforms()`. When modifying platform logic, edit the specific builder.
- **Transfer check**: `checkTransfers()` orchestrates three helpers: `buildThirstTracker(platform, rolledStops)` returns a `thirstBetween(a,b)` closure for express/branch-aware thirst counting; `renderJourneyCard(route, transferIndices)` builds and shows the journey card HTML; `resolveTransfer(route, i, ti, transferIndices)` handles one transfer station's dice roll + undo loop, returning `{ outcome: 'stay'|'transfer'|'drink' }`.

## Data
- Primary source: `japan-train-data` GitHub raw JSON (~10 MB), filtered to Tokyo area at runtime
- Cached in localStorage under key `random_game_v12` (30-day TTL). **Bump cache key** when data changes structurally.
- **`LINE_NAME_FIXES`** (in `data-transforms.js`): currently empty `{}`. Name fixes live in `.claude/build-data.js` and are baked into `data-tokyo.json`. Runtime object kept as a hook for quick fixes.
- **`STATION_NAME_FIXES`** (in `build-data.js`): ~300+ entries keyed by bad English name or Japanese name (prefer Japanese key when English is ambiguous like "River"). Upstream uses machine translation that produces literal kanji-to-English ("Dragon King" → Ryuo), "A [noun]" artifacts ("A door" → Tobe), and geographic literals. `.claude/generate-osm-fixes.js` cross-refs against OSM `name:en` to bulk-find remaining bad translations.
- **`LINE_EXTRA_STATIONS`**: appends missing stations to lines (e.g. Tokaido beyond Atami to Shizuoka).
- **`LINE_TRIM_AFTER`**: truncates a line at a named station (by Japanese name, e.g. Chuo Main Line at 甲府).
- **`LINE_REMOVE`**: removes brand-name-only lines (Ueno Tokyo Line — through-running now handled by connections).
- **`LINE_PREPEND_STATIONS`**: prepends stations to the beginning of a line.
- **Injected lines**: `buildIndex()` can inject entire lines missing from upstream (e.g. Keisei Higashi-Narita Line, Tokaido Shinkansen). Uses existing station objects where possible to avoid duplicates. `_findStn(ja)` / `_stnCoord(ja, fallback)` helpers locate existing stations by Japanese name for coordinate reuse.
- **`WALKABLE_STATIONS`**: bidirectional map of stations connected by walkway (not rail). Only affects `getPlatforms` (roll-again platforms), NOT `hasTransferLines` (mid-route transfer checks). Different from `STATION_ALIASES` which affect both.
- **Airport detection**: `isAirport` check uses `/airport/i.test(name)` plus explicit `stn.ja` checks for stations like 東成田 that lack "airport" in the name.
- **`LINE_DISPLAY_OVERRIDE`**: per-line display name overrides by direction. Currently empty — Tokaido UTL branding now handled by connection `displayName`. `getLineDisplayOverride()` still checks this config. `refreshPlatformGrid()` must use `p.displayName || p.lineName` for the pill label.
- **`ANCHOR_STATIONS`**: curated set of well-known stations (Yamanote big 6 + major JR hubs + private railway hubs like Keikyu Kamata) used by `findMajorStation()` for consistent "toward" labels. Preferred over the generic hub-threshold fallback.
- **Through-running via connections** (in `data-connections.js`): defines `LINE_CONNECTIONS` array. Current connections:
  - **Hanzomon ↔ Den-en-toshi** at Shibuya: bidirectional, no via, transparent extension. Target line express (Local/Semi-Exp/Express) + "Shibuya only" terminating option.
  - **Keikyu Airport → Main Line** at Keikyu Kamata: 2 connections (Shinagawa `toDir:'start'`, Yokohama `toDir:'end'` with `toUntil:'横浜'`). Connection-level `express` for Airport Exp.
  - **Tokaido → northern lines** at Tokyo: 3 connections to Utsunomiya/Takasaki/Joban via Ueno. All branded `displayName:'Ueno Tokyo Line'`. Shared-trunk auto-select when within rollable range.
  - **Northern lines → Tokaido** at Ueno: 3 connections with `destinations` (Tokyo/Shinagawa/Hiratsuka/Kozu/Odawara/Atami/Numazu with per-destination colors). Merged into single UTL platform at shared stations.
  - Connection fields: `from/fromEnd`, `to/toEnd/toStation/toDir`, `via`, `toUntil`, `name/ja/color`, `destinations`, `express`, `displayName`.

## Debug tools
- **Dev server**: `node .claude/server.js` on **port 5500**. Serves `index.html`, auto-injects `debug.js`, provides eval bridge and SSE auto-reload.
- `debug.js` — gitignored, auto-injected by dev server. DBG button toggles log overlay.
- `window._state` — read-only state ref. `window._forceNextRoll = N` — forces next roll result. `window._forceTransferQueue = [1,1,4]` — queues transfer outcomes (1-3=stay, 4=transfer, 5=drink) without affecting other rolls.
- **Debug panel**: GPS spoofer, time spoofer, demo button, fast rolls toggle, auto-transfer toggle, endless mode (auto-plays forever, stops on user interaction), fuzz runner (UI for `game.fuzz` with stop button). 23-wards defaults OFF in debug mode.
- **Eval bridge**: `POST /eval { "expression": "..." }` on dev server. Note: `location.reload()` kills the SSE connection.
- **`window.game`** — programmatic API. Key methods: `game.state()`, `game.route()`, `game.data(query?)`, `game.scenario(opts)`, `game.playTo(phase, opts)`, `game.test(filter?)`, `game.fuzz(n, opts?)`, `game.fuzzStop()`, `game.fast = true`. See `game.help()` for full reference. Data inspection utilities: `game.expressServices(line?)`, `game.branches(line?)`, `game.stopsFor(trainType?)`, `game.transferStations()`, `game.findStation(query)`, `game.linesAt(station?)`, `game.thirst(n?)`, `game.history()`, `game.wards23(on?)`, `game.nearby(lat, lng, n?)`, `game.shinkansenAt(station?)`.
- **`game.test(filter?)`**: runs 11 named test scenarios covering all game paths (normal arrival, transfer, drink-here, drink-at-transfer, flight, branch, express, shinkansen, circular, reroll-platform, reroll-stops). Run all: `game.test()`, by name: `game.test('flight')`, by index: `game.test(3)`, list: `game.test.list()`. Tests use forced rolls and minimal stop counts to run fast.
- **`game.playTo`** now auto-clicks transfer rolls (like `game.scenario`), so `game.playTo('arrived')` works reliably even with transfers.
- **Debug log**: all `dlog()` output (including fuzz results) persists to `.claude/debug.log` via `/log` endpoint. Clear before fresh fuzz runs; don't delete if unreviewed results pending.
- **Auto-reload**: dev server polls `/mtime` every 1s and reloads the browser when `index.html`, `debug.js`, or `data-*.js` files change.

## i18n
- Bilingual EN/JP via `data-i18n` attributes and JS dictionary. Always add both translations for new strings.
- Station names stored in both languages; search works in both. Game logic uses English internally.

## Conventions
- **Timing constants**: animation/delay values are named constants (`TRANSFER_DIE_FRAMES`, `TRANSFER_DIE_FRAME_MS`, `TRANSFER_ARRIVE_DELAY`, `TRANSFER_REDIRECT_DELAY`, `UNDO_TRANSFER_TIMEOUT`, `FEEDBACK_RESET_DELAY`). Use these instead of magic numbers.
- **Destination card**: shows both English and Japanese station names side by side (`.destination-name` + `.destination-name-ja`). The `showDestCard()` helper sets both — don't include `station.ja` in the `subHtml` argument.
- Game logic lives in `index.html`. Static data is split into `data-lines.js` (express services, branches, aliases), `data-i18n.js` (LINE_NAMES_JA, translations), `data-transforms.js` (line fixes, extra stations, trims, removals), and `data-connections.js` (through-running line connections).
- No build step, no transpilation
- Dark theme using CSS custom properties (--bg, --surface, --accent, etc.)
- Bump `CACHE_NAME` in `sw.js` and `random_game_v*` localStorage key when data changes structurally. Current SW cache: `rg-v5`. Current localStorage key: `random_game_v12`.
- **Easter eggs**: vague commit messages ("Added easter egg"). Add entry to `EASTER_EGGS` config + i18n strings. Config keys: `emoji`, `hintKey`, `hintEmoji`, `rollKey`, `stayingKey`, `stayedKey`, `labelKey`, `position` (`'replace'`/`'append'`/`'prepend'`). Helpers: `getEgg()`, `eggEmoji()`, `eggRollKey()`, etc. — used by all render paths automatically.

## Pitfalls — things that already caused bugs

### Display & styling
- **Inline styles persist across rounds**: `rollStops()` sets inline styles on `rollStopsBtn`. Always call `resetStopsBtn()` when resetting step 2 UI.
- **CSS hidden-state**: `el.style.display = ''` doesn't clear `display:none` from multi-property inline styles — use explicit values. When migrating to CSS classes, check if element needs `flex` vs `block`.
- **DOM elements after `<script>` aren't available in init**: Use `DOMContentLoaded` for late-parsed elements (lang toggle, stats overlay, etc.).

### State management
- **State must be captured before reset**: When checking previous-round state in a function that resets state, capture values first.
- **`state.selectedBranch` and `state.selectedConnection` must be cleared at all reset points**: `resetRoundState()` handles most cases, but rerolls and `rollPlatform` callback must clear both manually.
- **`p.maxStops` mutation**: destination pickers mutate `p.maxStops` via `onSelect`. Always save `p._originalMaxStops` before mutating, and restore in `onCapChange`/wards23 handlers before recomputing.
- **`onCapChange` must mirror `rollPlatform`'s flow**: call `showBranchButtons(p) → showTrainTypeButtons(p) → enable roll button`, not just one of them. Must also clear `selectedConnection` and `selectedTrainType` before rebuilding.
- **`onStationSelected` resets to step 1**: Don't call from checkbox handlers during step 2. Recalculate `maxStops` in-place instead. Connection extensions must be re-added after recalculating on-line maxStops (e.g. in `onWards23Change`).
- **Rerolls must undo history entries**: Both `rerollPlatform()` and `rerollStops()` must pop the last history entry before re-rolling.

### Data quality
- **Station name collisions**: Upstream data has bad translations (e.g. 新井宿 → "Shinjuku"). Name fixes keyed by Japanese name first. Always sanity-check station names when touching data code.
- **Oedo line is a lollipop, not circular**: Only loops at Tochomae. Don't treat it like Yamanote.
- **Branch `getPlatforms` must compute branch-aware maxStops**: Use `getBranchMaxStops` per direction, or terminal branch stations appear to have stops in both directions.
- **Empty branch list must fall back to normal maxStops**: When `getBranches()` returns `[]` for a direction (e.g. direction-aware branches only defined for one direction), `getLinearPlatforms` must fall back to the non-branch calculation. Otherwise maxStops is incorrectly 0 and the platform disappears.

### UI updates
- **i18n strings can contain HTML**: Render with `innerHTML`, not `textContent`.
- **`switchLang` refreshers are registered, not inline**: Dynamic text refreshes live in `_langRefreshers` array. When adding new dynamic text, `_langRefreshers.push(() => { ... })` near the render code — `switchLang()` calls them all automatically.
- **Train type buttons don't auto-refresh**: Changes to stop counts must call `showTrainTypeButtons()` to rebuild buttons, not just `refreshStopsLabel()`.
- **`switchLang` must distinguish branch vs train-type picker**: The `refreshTrainTypeButtons` lang refresher must check `state.selectedBranch` and `state.selectedConnection` — if both null and the line has branches or connections, call `showBranchButtons()` instead of `showTrainTypeButtons()`, or the picker gets replaced on language switch.
- **Branch picker buttons must respect `currentLang`**: Use the same `currentLang === 'ja'` swap pattern as train type buttons (primary text = current language, `<small>` = other language). Stop counts are hidden when express services follow (`hasExpress` check).
- **Easter eggs are config-driven**: All render paths (`destSubHints`, `buildHistoryItem`, `copyRoute`, `refreshPlatformGrid`) use `EASTER_EGGS` helpers. Add new eggs to the config object — no need to touch render functions.
- **Train type button layout**: Full-width Local top row only for exactly 3 types (after grouping), not `>= 3`.
- **Train type grouping**: `showTrainTypeButtons()` auto-groups services with identical `expressIndices` into one button (e.g. "Yamabiko / Tsubasa"). Grouping key includes `_terminatesAtJunction` and `_connTargetLineIdx` flags to prevent cross-type merging. When clicked, a random member is selected. Types with 0 reachable stops are filtered out entirely.
- **Connection-target express indices collide with source line**: express indices from the target line (e.g. Den-en-toshi Semi-Exp) may accidentally match station indices on the source line (e.g. Hanzomon). Cannot use `ei.indexOf(platform.fromIdx)` to auto-detect — must use explicit `_connTargetLineIdx` tag. The `getStationsAlongRoute` express routing section must skip when `_connTargetLineIdx` is set; connection extension handles target-line express instead.

### Misc
- **Always test in the actual UI**: After making changes, test the specific scenario that was broken by playing through it in the dev server browser. Don't just run `game.test()` — those tests cover basic paths but not the specific UI flow the user is seeing.
- **Event listener stacking**: Listeners added inside repeated functions cause double-fires. Use `{ once: true }` or guard.
- **Alias stations**: `getPlatforms` and `hasTransferLines` both need alias checks. Audit all station-querying functions when adding alias-aware behavior.
- **23-wards boundary**: Polygon needs northern boundary (exclude Saitama) and must exclude lines like Keikyu Daishi.
- **Shinkansen platform merge uses next-station key**: Platforms are grouped by `direction + ':' + nextStation.ja`. This correctly merges shared-track platforms (Tohoku+Joetsu between Tokyo↔Omiya) while keeping divergent directions separate (Tohoku toward Utsunomiya vs Joetsu toward Takasaki from Omiya). Merged platforms store `_shinkansenOptions` array; `rollPlatform()` resolves to a random member when rolled. Merge logic lives in `mergeShinkansenPlatforms()`.
