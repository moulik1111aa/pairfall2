# Tile Match Game — Design Spec

Date: 2026-10-15
Working title: **Pairfall** (rename any time)
Status: Approved in conversation, awaiting spec review

## 1. Intent

- **What:** A Zen Match–style tile game for Android where tiles clear in **pairs** and you lose when too many unmatched tiles pile up in the tray.
- **Who:** Personal use by the owner and friends. Distributed only as an APK installed directly onto the phone (sideloaded). No Play Store.
- **Target device:** OnePlus 13R (tall 20:9 screen, 120 Hz AMOLED display, front-camera cut-out).
- **Success means:** the game feels premium. That means smooth 120 Hz animation, satisfying vibration and sound, attractive switchable themes, and levels that are always solvable but still challenging.

## 2. Core rules

- **Board:** tiles sit on a grid across several layers. A tile in a higher layer may overlap up to four tiles below it, offset by half a tile.
- **Free tile:** a tile is free (tappable) when no tile in a higher layer overlaps it. Tiles on the same layer never block each other. Tiles that aren't free are drawn dimmed.
- **Tray:** tapping a free tile moves it into the tray.
  - If the tray already holds a tile of the same kind, both clear with a burst.
  - The tray therefore never holds two tiles of the same kind.
  - Every tile kind appears on the board an even number of times, at most 8 (four pairs).
- **Lose:** the level ends in a loss as soon as the number of unmatched tiles in the tray reaches the **tray limit**.
  - The tray limit is **5 for levels 1–10** and **4 from level 11 onwards**.
  - The tray shows exactly that many slots.
- **Danger state:** applies whenever unmatched tiles = limit − 1. In this state:
  - the tray pulses red;
  - the phone gives a heartbeat vibration;
  - the music is muffled (low-pass filtered).
- **Win:** the board and tray are both empty.
- **Stars:**
  - 3 stars: no power-ups used and danger state never reached.
  - 2 stars: at most one power-up used.
  - 1 star: any other win.
  - Continue (§3) counts as a power-up for star purposes.
- **Combo:** a pair cleared within 2.5 s of the previous clear raises the combo count by 1; otherwise the count resets to 1. Higher combo counts give bigger particle bursts, rising sound pitch and stronger vibration.

## 3. Power-ups and economy

All numbers below live in one tunable config file. They are starting values, not final.

| Power-up | Effect | Cost |
|---|---|---|
| Undo | Returns the most recently tapped tile to its board position (only if it hasn't been cleared yet) | 20 |
| Hint | Highlights a move that keeps the level winnable, preferring one that completes a pair | 20 |
| Shuffle | Re-assigns kinds to the tiles left on the board; the result is guaranteed winnable (see §5) | 40 |
| X-ray | Shows the tiles hidden under the top layer for 3 s | 30 |
| +1 Slot | Raises the tray limit by 1 for this attempt | 60 |
| Continue (lose screen only) | Applies +1 Slot and resumes; once per attempt | 80 |

- Hint uses a small solver to find a move that keeps the level winnable; it highlights both tiles when the move starts a fully visible pair. If no safe move exists it says so and charges nothing.
- Shuffle rearranges the kinds still on the board (wilds stay put) and only applies an arrangement the solver confirms is winnable; if none exists, nothing is charged.
- In Zen mode power-ups are free and +1 Slot is not offered.
- A tile combo bonus is capped at 20 coins per level.

- **Coins earned:**
  - +10 per level cleared;
  - +5 per star;
  - +1 per combo step above 2;
  - +50 for clearing the daily challenge.
- **Starting balance:** 100 coins, plus one free use of each power-up.

## 4. Special tiles

Special tiles are introduced in this order, each first appearing at the level shown below. A short card explains each one the first time it appears.

| Tile | From level | Behaviour |
|---|---|---|
| Mystery | 12 | Drawn face-down until it becomes free, then flips to show its kind |
| Frozen | 20 | Has a thaw counter starting at 2 (3 from level 60). Each pair cleared **while the tile is uncovered** lowers it by 1. Can't be tapped until it reaches 0. *(Revised 2026-10-15: counting every clear from the start thawed all ice after two moves.)* |
| Lock & Key | 28 | A padlocked tile can't be tapped until both tiles of its key pair (marked with a key badge) are cleared |
| Wild | 35 (rare) | Takes the place of one tile in some pair and clears with the oldest waiting tile (wilds never match each other). If the tray is empty, it waits and clears with the next tile. If its match leaves a tile without a twin, that tile turns wild, so the board always stays completable. *(Revised 2026-10-15.)* |

**No moves left:** if every tile still on the board is frozen or locked and nothing can free it, the level is lost ("No moves left"). Continue cannot rescue this.

## 5. Level generation

### 5.1 Seeds
- Every level comes from a seeded random number generator.
  - **Journey mode:** the seed is the level number.
  - **Daily challenge:** the seed is the date in `YYYY-MM-DD` form.
  - **Zen mode:** the seed is random.
- The same seed with the same generator version always produces the same level.
- Progress stores only level numbers. A future generator update may therefore change the layouts of levels not yet played. This is acceptable.

### 5.2 Building a level that's solvable by design
1. **Shape:** generate a mirror-symmetric outline and place tile slots on each layer within it. The outline is a diamond, heart, pyramid, ring or random symmetric blob.
2. **Removal order:** repeatedly choose a random slot that would be free at that point, and record the order. This gives a valid order for taking every slot off the board.
3. **Tile kinds:** walk the removal order and assign kinds so the simulated tray never holds more than the **target peak** of unmatched tiles. The target peak is always lower than the tray limit. Kinds are spread so that pairs are interleaved rather than taken one straight after the other.
4. **Special tiles:** place them only where the removal order still works, taking account of thaw counters, key-before-lock ordering and wild substitution.

The result always has at least one winning sequence of moves.

### 5.3 Checking difficulty
- A test player (bot) plays each candidate level N = 300 times.
  - 90% of the time it makes a sensible move: it completes a pair with the tray, or failing that starts a pair whose partner is also free on the board.
  - Otherwise it picks a random free tile.
  - *(Calibrated 2026-10-15: at 80% the bot lost almost every large board, so band checks couldn't distinguish difficulty.)*
- The bot's win rate decides whether the level is accepted:

| Band | Target win rate | Accepted range |
|---|---|---|
| Easy | 90% | 80–100% |
| Normal | 60% | 45–75% |
| Hard | 30% | 15–45% |

- If a level falls outside its range, the generator retries with the next sub-seed, up to 50 attempts.
- If all attempts fail, it uses the closest candidate. If no valid candidate exists at all, it loads a bundled, pre-checked fallback level.

### 5.4 Difficulty curve
- **Levels 1–9 (the on-ramp, tray of 5):** Easy band. Levels 1–3 use the smallest settings and a tutorial overlay (a pointing hand).
- **Level 10:** Normal band, as the on-ramp's boss.
- **From level 11:** every 10th level is Hard, with a larger and fancier shape (a "boss" level); every other 5th level is an Easy breather; all other levels are Normal.
- *(Calibrated 2026-10-15: with a tray of 5, levels 4–9 could not get hard enough to reach Normal, so they are Easy by design.)*
- **Settings that ramp up with level number** (each capped at the value shown):

| Setting | Start | Cap |
|---|---|---|
| Tile kinds | 6 | 18 |
| Layers | 2 | 6 |
| Total tiles | 24 | 120 (Hard); 100 (Normal); 56 (Easy breathers) |
| Target peak | 1 | limit − 1 |
| Special tiles | none until introduced | up to 15% of tiles |

### 5.5 Shuffle
Shuffle re-runs §5.2 steps 2–4 on the tiles left on the board, taking the current tray contents into account. The tile slots stay where they are; only the kinds move, with an animated reshuffle. The result is guaranteed winnable.

### 5.6 Performance
- Generation runs in a background thread (Web Worker). A first-attempt level must finish within 300 ms on the 13R. Retries may take longer, which is hidden because levels are generated ahead of time.
- The next level is generated while the current one is being played.

## 6. Modes

- **Journey:** endless numbered levels on a scrolling map path that shows stars per level and marks boss levels.
- **Daily:** one level per calendar day (device local time) at Normal band, using the level 25 settings.
  - Clearing it pays 50 coins and extends a streak counter.
  - Missing a day resets the streak to 0.
- **Zen:** no tray limit, no stars, no coins, Normal band using the level 20 settings.
  - The tray shows up to 7 tiles and compresses visually beyond that.
  - "New board" generates a fresh random level.

## 7. Themes

- **Zen Garden** (default): pastels, paper texture, lotus, koi and bamboo tiles, cherry-petal particles, soft chimes.
- **Neon Cosmos** (unlocks at level 15): dark background tuned for the AMOLED screen, glowing planet, star and gem tiles, starburst particles, synth sounds.
- **Festive India** (unlocks at level 30): warm colours, rangoli, diya, mango and peacock tiles, confetti and firework bursts, festive percussion.

Each theme is one self-contained folder containing:
- a colour palette;
- 18 original vector tile designs (SVG);
- board and tray background styling;
- a particle preset;
- a sound set.

Locked themes show a preview in the themes gallery. All art and audio is original and generated in code or authored for this project.

## 8. Screens

- **Home:** Play (shows current level), Daily card, Zen card, coin balance, themed background.
- **Journey map:** a scrolling path of level nodes with stars and boss markers.
- **Game:**
  - Top bar: level, pause, coins.
  - Middle: the board, kept clear of the camera cut-out and safe areas.
  - Bottom: the tray, with the power-up bar beneath it in the thumb zone.
- **Pause:** resume, restart, settings, quit to home.
- **Win:** stars, coins earned, best combo, Next.
- **Lose:** Retry, or Continue (§3).
- **Themes gallery, Settings, Stats.**
  - Settings: sound, music, vibration, colour-blind mode, left-handed layout.
  - Stats: levels cleared, win rate, best combo, daily streak, total pairs.

- **How to play** (the ? button on Home): one idea per card in large type, with big Back / Next buttons, swipe, and tabs for Basics, Power-ups, Tiles and Modes. Long cards step their type down slightly so nothing needs scrolling.

**Accessibility:**
- Colour-blind mode adds a small symbol to each tile kind.
- Left-handed mode mirrors the power-up bar.

**Hindi alongside English (added 2026-10-16, user request):**
- Every instruction shows English with Hindi directly underneath: the tutorial coach, special-tile introduction cards, How to play, power-up tips, why a level was lost, the "press back again" hint and the theme-unlock note.
- Text is sized for older players: instruction cards use 19–22 px body text, and How to play keeps to one idea per screen rather than long pages.
- Power-up names stay in English inside the Hindi text, because the buttons say them in English; How to play adds a Hindi gloss (Undo · वापस लें).
- Settings has a "Hindi instructions · हिंदी निर्देश" switch, on by default, labelled in both languages so it can be found either way.
- All strings live in `src/ui/i18n.ts`, so the two languages always travel together.

## 9. Architecture

Stack (revised 2026-10-15: the build workspace can't download packages, so the game has no runtime dependencies):
- TypeScript, compiled by a small project build script using Node 22's built-in type stripping. The script bundles everything into one self-contained `index.html`.
- **Rendering:** tiles and the tray are DOM elements moved only with GPU-composited CSS `transform` and `opacity`, so the browser animates them at the display's refresh rate. Particles, glows and bursts are drawn on a full-screen Canvas 2D layer above the board. Tile art is pre-rendered once per theme into image bitmaps, so frames never redraw SVG.
- **Android wrapper (as built, Capacitor 8):** no npm plugins. The app has its own small native plugin, `native/android/.../PairfallPlugin.java`, for haptics (Android's predefined tick/click effects and haptic compositions), the back button, immersive full screen, the highest refresh rate, keep-screen-on during play, and a SharedPreferences mirror of the save. Capacitor's built-in SystemBars plugin supplies the camera-cutout insets as CSS variables. No Capacitor JavaScript is bundled: `src/platform/native.ts` talks to the plugin objects Capacitor injects, and in the browser preview everything falls back to the web Vibration API and `localStorage`.
- **Tests:** Node's built-in test runner (`node --test`) for unit tests, and the locally installed Playwright 1.56 with Chromium for browser tests.

```
src/
  core/          game rules — no graphics or browser dependencies
    rng.ts         seeded random number generator
    board.ts       slots, layers, free-tile calculation
    game.ts        state + apply(action) → events; undo history
    powerups.ts
    economy.ts     coins, stars, config
  gen/           level generation (runs in a Web Worker)
    shapes.ts      symmetric outline generators
    generator.ts   §5.2
    bot.ts         §5.3 test player
    curve.ts       §5.4 settings per level
    worker.ts
  render/        DOM + Canvas 2D views; subscribe to core events
    boardView.ts, trayView.ts, particles.ts (canvas layer), tweens.ts
  themes/        one folder per theme + registry
  audio/         Web Audio sound effects + music layers, low-pass for danger
  ui/            HTML/CSS menu screens and overlays
  platform/      Capacitor bridges: haptics, back button, lifecycle, immersive mode
  storage/       versioned save with automatic backup copy
scripts/build.mjs  strip types + bundle into dist/index.html
test/              node:test unit tests; e2e/ Playwright specs
android/         Capacitor Android project (generated in CI)
.github/workflows/build-apk.yml
```

**Data flow:**
1. Input becomes `game.apply(action)`.
2. The rules return events: `tileToTray`, `pairCleared(combo)`, `danger`, `win`, `lose`, `frozenThawed`, `unlocked`.
3. The render, audio and haptics modules each subscribe to those events independently.
4. The core is deterministic, which is what makes undo, testing and the test player straightforward.

**Error handling:**
- A save is written to a primary and a backup key. If the primary is damaged, the game loads the backup; if both are damaged, it resets with a notice.
- If generation fails, the game uses the fallback (§5.3).
- When the app moves to the background, the game pauses and saves immediately.

**Android behaviour:**
- Portrait locked, full-screen (immersive) mode; a swipe from the edge shows the system bars briefly.
- Back button: closes the open card (running its marked action, e.g. Resume), pauses during a game, goes back from sub-screens, and on Home a second press within 2 s leaves the app.
- The window asks for the display's fastest mode at its resolution (120 Hz on the 13R).
- The screen stays on during play only.
- The save is mirrored natively; if the WebView's storage is ever wiped, it is restored before the game reads it.

## 10. Delivery

1. **Milestone 1 — playable preview:**
   - core rules, generator, test player, Zen Garden theme and Journey mode;
   - published as a private web link and played in Chrome on the 13R;
   - user feedback is collected before moving on.
2. **Milestone 2 — full game:** all themes, power-ups, special tiles, modes, audio, haptics, stats and polish, delivered as an updated preview link.
3. **Milestone 3 — APK:**
   - Capacitor wrapper plus a GitHub Actions workflow that builds a signed release APK.
   - The user needs a GitHub account, an empty repository, and GitHub connected to Claude.
   - The signing key is stored as a GitHub secret, and the user keeps a backup copy.
   - Every APK uses the same key, so updates install over the existing app and keep progress.
   - As built: the keystore is committed only in encrypted form (`native/android/pairfall-release.jks.gpg`, GitHub's documented pattern for large secrets); the single repository secret `PAIRFALL_SIGNING_PASSWORD` decrypts it and is also the keystore password. The workflow refuses to publish an APK whose certificate SHA-256 differs from the release key's.
   - Each push to `main` builds and publishes a GitHub Release; the newest APK is always at `releases/latest/download/Pairfall.apk`. `versionCode` is the workflow run number.

## 11. Testing

- **Unit tests:** free-tile calculation, tray matching, the lose condition at the limit, undo, every power-up, every special tile, stars, combo and economy.
- **Generator check:** 10,000 seeds per run. Each level carries the winning move sequence it was built from. That sequence is replayed through the real rules engine (`core/game.ts`), not the generator's own simulation, and must end in a win without the tray reaching the limit. Difficulty-band win rates must fall within their ranges. Runs on every build.
- **Visual check:** Playwright screenshots of every screen in every theme at 13R dimensions (1264×2780, portrait), reviewed before each milestone.
- **Performance:** a stress board of 120 tiles with a maximum particle burst. Frame time must stay under 8.3 ms (the budget for 120 fps) in a headless Chrome profiling run with 4× CPU throttling, used as a stand-in for a phone. Real smoothness is then confirmed on the 13R during the user's playtests.
- **Playtests:** the user plays at each milestone, and their feedback drives the polish.

## 12. Out of scope

Ads, in-app purchases, accounts, cloud save, online leaderboards, a Play Store listing, iOS, and tablet layouts.

## 13. Tougher play (added 2026-10-17, user request)

- **Edge rule.** A tile is free only when nothing on a higher layer covers it *and* at least one of its four sides (left, right, above, below) has no neighbour on its own layer. Tiles boxed in on all sides are dimmed; tapping one shakes it and shows "Boxed in: clear a tile beside it first". Explained once on a card ("Only edge tiles"), in the tutorial's level-2 line and in How to play.
- **Bomb tiles (from level 45).** A countdown badge drops by one with every tap (Undo gives it back). The bomb must be cleared before it reaches 0, or the level is lost ("Boom!"); Continue cannot rescue this. The generator puts bombs on pairs the built-in solution clears in its first half, with the fuse = taps that solution needs plus slack (14 taps early, 4 by level 400). One bomb at first, up to three (four on bosses); breathers get one from level 100.
- **Timed levels.** Boss levels from 60 and every Normal level from 150 have a clock: 15 s plus 3.2 s a tile at level 60, tightening to 2.0 s by 400 (Normal: 3.6 → 2.4 s). It only runs while the board is in play; red and a heartbeat in the last 15 s. Continue after time runs out adds 30 s (80 coins).
- **Endless ramp.** "Late game" runs from level 60 to 400: the accepted bot win range slides down (Normal 45–75% → 15–45%, Hard 15–45% → 3–20%, breathers 80% → 60% minimum), special tiles rise from 15% to 30% of the board, thaw counts reach 4 from level 200, more frozen tiles and locks, more face-down tiles.
- **Calibration under the edge rule.** Normal boards use at most 13 designs (18 left too few matches in reach) and no plain rectangles after the tutorial. Generator version 3. 99.7% of levels 11–300 land in range.
- **Jump ahead.** The Journey map has a Jump button: quick picks 50, 100, 150, 200, 250, 300, 400, 500, or any number up to 9999. Every level up to the one chosen opens on the map.
