# Tile Match Game (Pairfall) — Implementation Plan

Spec: `docs/superpowers/specs/2026-10-15-tile-match-game-design.md`
Date: 2026-10-15

## Ground rules

- **Test first** for everything in `core/` and `gen/`: write the failing test, implement, see it pass, commit.
- **One commit per task.** The suite must pass (`npm test`) before every commit.
- **No runtime dependencies.** Only Node 22 built-ins plus the locally installed Playwright 1.56 and Chromium (`PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers`).
- **Test viewport:** OnePlus 13R as 412×906 CSS px at device scale factor 3.07 (1264×2780 physical), portrait, touch enabled.
- **Tunable numbers** (prices, rewards, timings, curve settings) live in `src/config.ts`. They are never scattered through the code.

---

## Milestone 1 — playable preview

Scope: core rules, generator, test player, Zen Garden theme, Journey mode, and the Home, Map, Game, Pause, Win and Lose screens, plus the tutorial on levels 1–3. Audio, haptics, power-ups, special tiles and the other modes come in Milestone 2.

### Task 1 — Project scaffold and build script
- **Files:**
  - `package.json`, with scripts `test`, `build`, `e2e` and `check`;
  - `tsconfig.json`, used for editor type-checking only;
  - `scripts/build.mjs`;
  - `src/main.ts`;
  - `src/index.html`.
- **Build script:**
  1. Follow the import graph from `src/main.ts`.
  2. Strip types from each file with `module.stripTypeScriptTypes`.
  3. Wrap each module in a tiny module registry and inline the result into `dist/index.html`.
  4. Bundle the worker entry separately and embed it as a string, loaded through a Blob URL.
- **Verify:** `npm run build` produces a single `dist/index.html`. A Playwright smoke test opens it and sees "Pairfall".

### Task 2 — `core/rng.ts`
- **What:** mulberry32 random generator; `seedFrom(string)` using a hash; `sub(seed, n)` for derived seeds; `int`, `pick`, `shuffle`.
- **Tests:**
  - the same seed always gives the same sequence;
  - different sub-seeds give different sequences;
  - `shuffle` is a permutation (same items, reordered);
  - `int` stays within bounds over 100k draws.

### Task 3 — `core/board.ts`
- **Slot model:** `{id, x, y, layer}` in half-tile units. A tile is 2×2 units, so it can overlap up to four tiles on the layer below.
- **Cover map:** a precomputed `coveredBy[]` list per slot, plus a live cover count, so checking whether a tile is free and removing a tile are both O(overlaps).
- **Tests:**
  - a tile on a single layer is free;
  - an overlapping tile on the layer above blocks it;
  - removing the cover frees it;
  - tiles on the same layer never block each other;
  - removal and restoring are exact inverses (needed for undo).

### Task 4 — `core/game.ts`
- **State:** `{board, kinds[], tray[], limit, history, combo, lastClearAt, status}`.
- **Actions:** `tap(slotId)` and `undo()`, each returning `GameEvent[]`. The clock is injected so tests control time.
- **Events:** `tileToTray`, `pairCleared{combo}`, `danger`, `dangerEnd`, `win`, `lose`.
- **Tests:**
  - tapping a blocked tile is ignored;
  - a matching pair clears;
  - the tray never holds two tiles of the same kind;
  - the game is lost exactly when unmatched tiles reach the limit (both limit 4 and limit 5);
  - `danger` fires at limit − 1;
  - a win needs an empty board and an empty tray;
  - the combo count increases within 2.5 s and resets after it;
  - undo restores the board and tray exactly, and is refused for tiles that have already cleared.

### Task 5 — `src/config.ts` and `core/economy.ts`
- **What:** star rules (Continue counts as a power-up) and coin rewards (level clear, stars, combo bonus).
- **Tests:** a table-driven test for the star cases and coin totals.

### Task 6 — `gen/shapes.ts`
- **What:** mirror-symmetric outlines (diamond, heart, pyramid, ring, symmetric blob). These are stacked into layers, each layer inside the one below with a half-tile offset, until the requested tile count is reached (rounded to an even number).
- **Tests:**
  - every shape is mirror-symmetric;
  - the slot count is even and matches the request within ±2;
  - every upper-layer tile sits on tiles below it;
  - the result fits within a 9×12 tile frame (the 13R board area).

### Task 7 — `gen/curve.ts`
- **What:** `settingsFor(level)` returns `{band, kinds, layers, tiles, targetPeak, limit, shape}`.
- **Rules:**
  - levels 1–3: Easy, with the tutorial flag set;
  - every 5th level: Easy;
  - every 10th level: Hard, with a fancy shape;
  - all other levels: Normal;
  - settings ramp up to the caps in spec §5.4;
  - tray limit is 5 for levels 1–10 and 4 afterwards.
- **Tests:** a table covering levels 1, 3, 5, 10, 11, 37, 100 and 500.

### Task 8 — `gen/generator.ts`
- **What:** `generate(settings, seed)` returns `{slots, kinds, solution}`.
  - Removal order: repeatedly pick a random free slot.
  - Kind assignment: walk the removal order, keeping the simulated tray at or below `targetPeak` and interleaving pairs. Each kind is used 2 or 4 times.
- **Tests:**
  - for 1,000 seeds per band, replaying `solution` through `core/game.ts` ends in a win;
  - the tray peak during replay never exceeds `targetPeak`;
  - the same seed gives an identical level.

### Task 9 — `gen/bot.ts` and the acceptance loop
- **Bot:** 80% of the time it completes a pair if it can; otherwise it picks a random free tile.
- **`winRate(level, n = 300)`.**
- **`makeLevel(level)`:** retries sub-seeds until the win rate lands in the band, up to 50 attempts. Otherwise it keeps the closest candidate; if there is none, it loads a bundled fallback from `gen/fallbacks.ts` (three pre-checked levels per band).
- **Tests:**
  - win rates for a sample of 200 levels per band fall within the spec ranges;
  - first-attempt generation of a 120-tile level takes under 300 ms in Node (as a rough stand-in for the 13R);
  - the fallback is used when generation is forced to fail.

### Task 10 — Worker and level pipeline
- **What:** `gen/worker.ts` plus `gen/client.ts`, which provides a promise-based `getLevel(n)` and pregenerates `n + 1` once level `n` starts.
- **Verify:** an e2e test confirms level 2 is ready within 1 s of level 1 starting.

### Task 11 — Zen Garden theme
- **What:** `themes/zen-garden/`:
  - a palette;
  - 18 original SVG tile designs (lotus, koi, bamboo, lantern, cherry blossom, crane, fan, bonsai, moon, wave, maple leaf, teapot, stone, bell, ginkgo, drum, cloud, butterfly);
  - board and tray styling;
  - a cherry-petal particle preset.
- **Also:** `themes/registry.ts`, and `themes/prerender.ts`, which turns each SVG into an ImageBitmap at device pixel ratio.
- **Verify:** a Playwright screenshot of a tile-sheet test page, reviewed by eye. All 18 tiles must be clearly distinguishable at the in-game size.

### Task 12 — Rendering the board and tray
- **Files:** `render/tweens.ts`, `render/boardView.ts`, `render/trayView.ts`.
- **Layout:** fit the board into the safe area with the camera cut-out kept clear. Tiles are scaled so the largest board fits a 9×12 tile frame. Lower layers get a shadow offset to show depth.
- **Behaviour:**
  - tiles that aren't free are dimmed;
  - tapping a tile flies it into its tray slot (a 180 ms eased arc);
  - matched pairs pop and shrink away;
  - danger state makes the tray pulse red.
- **Rule:** only `transform` and `opacity` are ever animated.
- **Verify:** e2e tests where taps produce the expected DOM state, plus screenshots at the 13R viewport.

### Task 13 — Particles
- **What:** `render/particles.ts`, a pooled Canvas 2D particle system. Bursts scale with combo count, the petal preset comes from the theme, and the layer pauses when idle.
- **Verify:** a stress test fires a 200-particle burst on a 120-tile board; average frame time stays under 8.3 ms in Chromium with 4× CPU throttling.

### Task 14 — Screens and flow
- **Files:** `ui/router.ts`, `ui/home.ts`, `ui/map.ts`, `ui/hud.ts`, `ui/pause.ts`, `ui/win.ts`, `ui/lose.ts`, `ui/tutorial.ts`.
- **Behaviour:**
  - the Win screen shows stars and coins, with a count-up animation;
  - Lose offers Retry only (Continue arrives with power-ups in M2);
  - the tutorial's pointing hand guides the first moves of levels 1–3.
- **Verify:** an e2e test plays level 1 with a debug hook (`?debug=1` exposes `window.__solution`). It sees the Win screen, Next loads level 2, and the map shows level 1 with its stars.

### Task 15 — Storage
- **What:** `storage/save.ts`, a versioned save written to a primary and a backup key, with `localStorage` behind a small adapter (Capacitor Preferences slots in at M3). It saves progress, coins, stars per level and settings. The game saves on `visibilitychange`.
- **Tests (Node, using a fake adapter):**
  - a save and load round-trip;
  - a damaged primary falls back to the backup;
  - when both are damaged, the game resets and shows a notice.

### Task 16 — Milestone 1 verification and publish
- `npm run check`, which runs unit tests, the build and e2e tests.
- Screenshots of every M1 screen at the 13R viewport, reviewed and fixed.
- Run the `artifact-design` skill's review, then publish `dist/index.html` as an artifact.
- Send the link with a short guide to what to test.

**Checkpoint:** the user playtests on the 13R. Their feedback becomes fix-up tasks before Milestone 2 starts.

---

## Milestone 2 — full game

17. **Power-ups:** `core/powerups.ts` (Undo, Hint, Shuffle via generator §5.5, X-ray, +1 Slot, Continue), a cost table and starting balance, the power-up bar, and the X-ray overlay. Tests for each power-up's effect on state and coin balance; Shuffle must stay winnable (replay test).
18. **Special tiles, in the rules engine:** Mystery, Frozen (thaw counter), Lock & Key, Wild. Tests for each behaviour.
19. **Special tiles, in the generator:** placement that keeps the solution path valid, plus introduction levels and the explainer card. The 1,000-seed replay test is extended to levels 12–60.
20. **Modes:**
    - Daily: date seed, level 25 settings, streak and reward;
    - Zen: no limit, tray compression, "New board".
    - Tests for streak rollover across days and missed days.
21. **Neon Cosmos and Festive India themes:** 18 tiles each, particle presets, unlocks at levels 15 and 30, and a themes gallery with locked previews.
22. **Audio:** `audio/` Web Audio synthesis for each theme's sound set. Tap, match, combo pitch climb, danger low-pass and win/lose stings. Music is made from generated loops. Muted until the first tap, as browsers require.
23. **Haptics:** `platform/haptics.ts`, using the web Vibration API in the preview. Patterns for tap, match, combo, heartbeat and win.
24. **Remaining screens:** Settings (sound, music, vibration, colour-blind mode, left-handed layout) and Stats; colour-blind symbols on tiles and a mirrored power-up bar for left-handed mode.
25. **Generator check script:** `scripts/gencheck.mjs`, which runs 10,000 seeds in parallel worker threads with the replay and band checks, and is wired into `npm run check`.
26. **Polish pass:** juice timings, the screenshot review across all themes, the performance stress test with special tiles and themes, then republish to the same artifact link.

**Checkpoint:** the user playtests the full game.

---

## Milestone 3 — APK

27. **User setup (guided):** create a GitHub account if needed and an empty repository, and connect GitHub to Claude. I then attach the repository to this session and push the code.
28. **Capacitor project:** `capacitor.config.ts` (app id `com.pairfall.game`, portrait, full-screen) and the `platform/` bridges: Haptics, Preferences adapter, back button, App state, Status Bar. The web fallbacks stay for the preview.
29. **Signing key:** generate a release keystore here with `keytool`. Store it and its passwords as GitHub secrets via `gh`. The user saves the keystore file and passwords privately as a backup.
30. **Workflow** `.github/workflows/build-apk.yml`, triggered on push to `main` and on tags:
    1. set up Node and Java 21;
    2. `npm ci` to install Capacitor;
    3. `npm run build`;
    4. `npx cap add android` (first run) and `npx cap sync`;
    5. decode the keystore from secrets;
    6. `./gradlew assembleRelease`;
    7. upload the APK as a build artifact and attach it to a GitHub Release.
31. **First build:** run it and fix any failures until a signed APK is produced.
32. **Install guide:** a short page explaining how to download the APK from the Release on the 13R, allow installs from that app once, install, and update later.

**Checkpoint:** the user installs the APK on the 13R and confirms full-screen display, vibration, the back button and that progress survives an update.
