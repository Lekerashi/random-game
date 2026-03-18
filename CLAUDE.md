# Random Game — Tokyo

## Game flow
1. **Pick a station** — search, geolocate, or random. Calls `onStationSelected()`.
2. **Roll a train line** (`rollPlatform()`): dice picks a platform. Special: "Drink here!" or "Take a flight!" (airport).
3. **Roll stops** (`rollStops()`): branch picker → train-type picker (if applicable) → dice picks 1–N stops. Transfer checks at each station along the route.
4. **Arrive** — destination card with map/bars/cafes and "Roll Again From Here".

## Key concepts
- **Platform model**: each direction of a train line = one platform. Linear lines have 2 (toward each terminus), circular (Yamanote, Oedo) have Direction A/B. Terminal stations have 1.
- **Express services** (`EXPRESS_SERVICES`): lookup of line → train types (Local, Semi-Exp, Express, etc.) with station lists.
- **Branch lines** (`LINE_BRANCHES`): sub-routes for branching lines (Tsurumi, Marunouchi, Nambu). Smart shared-trunk detection auto-selects when branches produce the same route within rollable range. Flow: `rollPlatform()` → `showBranchButtons()` → `showTrainTypeButtons()` → `rollStops()`.
- **Thirst mechanic**: after 5+ stations without drinking, extra dice numbers map to "Drink here!".
- **Transfers**: at each station along the route, a d5 roll decides whether to transfer or continue.

## Key helpers
- **`capStops(max)`**: applies stop-cap setting. Use instead of inline ternaries.
- **`getEffectiveStops(platform, opts?)`**: computes valid (non-drunk-at) max stops accounting for express/branch/cap. `opts: { ei, bi }` override state defaults. Returns `{ validCount, physicalStopsMap, rawMax, cappedMax }`. Use instead of manual `getExpressMaxStops`/`getBranchMaxStops`/`capStops`/`getValidRouteInfo` chains.
- **`resetStopsBtn()`**: clears inline styles on `rollStopsBtn`. Call whenever resetting step 2 UI.
- **`destSubHints(station, emoji)`**: renders drink/park hints + easter eggs for arrival card. `'wrap'`/`'inline'`/falsy controls emoji prefix. Use in all dest-sub render paths.
- **`resetRoundState()`**: clears per-round state. Used by `onStationSelected` and `resetGame`. Don't use in reroll functions (they clear only selectedTrainType/selectedBranch intentionally).
- **`setStationInput(englishName)`**: displays station name in current language. Always use instead of setting `dom.stationInput.value` directly.

## Data
- Primary source: `japan-train-data` GitHub raw JSON (~10 MB), filtered to Tokyo area at runtime
- Cached in localStorage under key `random_game_v11` (30-day TTL). **Bump cache key** when data changes structurally.
- **`LINE_NAME_FIXES`** (in `index.html`): currently empty `{}`. Name fixes live in `.claude/build-data.js` and are baked into `data-tokyo.json`. Runtime object kept as a hook for quick fixes.
- **`STATION_NAME_FIXES`** (in `build-data.js`): ~300+ entries keyed by bad English name or Japanese name (prefer Japanese key when English is ambiguous like "River"). Upstream uses machine translation that produces literal kanji-to-English ("Dragon King" → Ryuo), "A [noun]" artifacts ("A door" → Tobe), and geographic literals. `.claude/generate-osm-fixes.js` cross-refs against OSM `name:en` to bulk-find remaining bad translations.
- **`LINE_EXTRA_STATIONS`**: appends missing stations to lines (e.g. Tokaido beyond Atami to Fuji).
- **`LINE_TRIM_AFTER`**: truncates a line at a named station (e.g. Chuo Main Line at Kofu).
- **Injected lines**: `buildIndex()` can inject entire lines missing from upstream (e.g. Keisei Higashi-Narita Line). Uses existing station objects where possible to avoid duplicates.
- **`WALKABLE_STATIONS`**: bidirectional map of stations connected by walkway (not rail). Only affects `getPlatforms` (roll-again platforms), NOT `hasTransferLines` (mid-route transfer checks). Different from `STATION_ALIASES` which affect both.
- **Airport detection**: `isAirport` check uses `/airport/i.test(name)` plus explicit `stn.ja` checks for stations like 東成田 that lack "airport" in the name.

## Debug tools
- `debug.js` — gitignored, auto-injected by dev server. DBG button toggles log overlay.
- `window._state` — read-only state ref. `window._forceNextRoll = N` — forces next roll result. `window._forceTransferQueue = [1,1,4]` — queues transfer outcomes (1-3=stay, 4=transfer, 5=drink) without affecting other rolls.
- **Debug panel**: GPS spoofer, time spoofer, demo button (injects fake 4-round session), fast rolls toggle, auto-transfer toggle (auto-clicks transfer roll buttons; follows fast mode by default, respects `_forceTransferQueue`).
- **Eval bridge**: `POST /eval { "expression": "..." }` on dev server. Note: `location.reload()` kills the SSE connection.
- **`window.game`** — programmatic API. Key methods: `game.state()`, `game.route()`, `game.data(query?)`, `game.scenario(opts)`, `game.playTo(phase, opts)`, `game.fast = true`. `game.data("Shinjuku")` returns station/line info; `game.scenario({station, platform, stops, transfers})` runs a full round with queued transfer outcomes. See `game.help()` for full reference.
- **Auto-reload**: dev server polls `/mtime` every 1s and reloads the browser when `index.html` or `debug.js` change.

## i18n
- Bilingual EN/JP via `data-i18n` attributes and JS dictionary. Always add both translations for new strings.
- Station names stored in both languages; search works in both. Game logic uses English internally.

## Conventions
- Keep everything in `index.html` — no file splitting unless explicitly asked
- No build step, no transpilation
- Dark theme using CSS custom properties (--bg, --surface, --accent, etc.)
- Bump `CACHE_NAME` in `sw.js` and `random_game_v*` localStorage key when data changes structurally.
- **Easter eggs**: vague commit messages ("Added easter egg"). Add entry to `EASTER_EGGS` config + i18n strings. Config keys: `emoji`, `hintKey`, `hintEmoji`, `rollKey`, `stayingKey`, `stayedKey`, `labelKey`, `position` (`'replace'`/`'append'`/`'prepend'`). Helpers: `getEgg()`, `eggEmoji()`, `eggRollKey()`, etc. — used by all render paths automatically.

## Pitfalls — things that already caused bugs

### Display & styling
- **Inline styles persist across rounds**: `rollStops()` sets inline styles on `rollStopsBtn`. Always call `resetStopsBtn()` when resetting step 2 UI.
- **CSS hidden-state**: `el.style.display = ''` doesn't clear `display:none` from multi-property inline styles — use explicit values. When migrating to CSS classes, check if element needs `flex` vs `block`.
- **DOM elements after `<script>` aren't available in init**: Use `DOMContentLoaded` for late-parsed elements (lang toggle, stats overlay, etc.).

### State management
- **State must be captured before reset**: When checking previous-round state in a function that resets state, capture values first.
- **`state.selectedBranch` must be cleared at all reset points**: `resetRoundState()` handles most cases, but rerolls and `rollPlatform` callback must clear it manually.
- **`onStationSelected` resets to step 1**: Don't call from checkbox handlers during step 2. Recalculate `maxStops` in-place instead.
- **Rerolls must undo history entries**: Both `rerollPlatform()` and `rerollStops()` must pop the last history entry before re-rolling.

### Data quality
- **Station name collisions**: Upstream data has bad translations (e.g. 新井宿 → "Shinjuku"). Name fixes keyed by Japanese name first. Always sanity-check station names when touching data code.
- **Oedo line is a lollipop, not circular**: Only loops at Tochomae. Don't treat it like Yamanote.
- **Branch `getPlatforms` must compute branch-aware maxStops**: Use `getBranchMaxStops` per direction, or terminal branch stations appear to have stops in both directions.

### UI updates
- **i18n strings can contain HTML**: Render with `innerHTML`, not `textContent`.
- **`switchLang` must refresh all dynamic text**: Programmatic text won't update unless explicitly re-rendered in `switchLang`.
- **Train type buttons don't auto-refresh**: Changes to stop counts must call `showTrainTypeButtons()` to rebuild buttons, not just `refreshStopsLabel()`.
- **Easter eggs are config-driven**: All render paths (`destSubHints`, `buildHistoryItem`, `copyRoute`, `refreshPlatformGrid`) use `EASTER_EGGS` helpers. Add new eggs to the config object — no need to touch render functions.
- **Train type button layout**: Full-width Local top row only for exactly 3 types, not `>= 3`.

### Misc
- **Event listener stacking**: Listeners added inside repeated functions cause double-fires. Use `{ once: true }` or guard.
- **Alias stations**: `getPlatforms` and `hasTransferLines` both need alias checks. Audit all station-querying functions when adding alias-aware behavior.
- **23-wards boundary**: Polygon needs northern boundary (exclude Saitama) and must exclude lines like Keikyu Daishi.
