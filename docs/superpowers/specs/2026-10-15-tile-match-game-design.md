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
  - Every tile kind appears on the board an even number of times (2 or 4).
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
| Frozen | 20 | Has a thaw counter starting at 2. Each pair cleared anywhere on the board lowers it by 1. Can't be tapped until it reaches 0 |
| Lock & Key | 28 | A padlocked tile can't be tapped until both tiles of its key pair (marked with a key badge) are cleared |
| Wild | 35 (rare) | Takes the place of one tile in some pair and matches any tile. If the tray is empty, it waits in the tray and matches the next tile that arrives |

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
  - It picks a move that completes a pair 80% of the time.
  - Otherwise it picks a random free tile.
- The bot's win rate decides whether the level is accepted:

| Band | Target win rate | Accepted range |
|---|---|---|
| Easy | 90% | 80–100% |
| Normal | 60% | 45–75% |
| Hard | 30% | 15–45% |

- If a level falls outside its range, the generator retries with the next sub-seed, up to 50 attempts.
- If all attempts fail, it uses the closest candidate. If no valid candidate exists at all, it loads a bundled, pre-checked fallback level.

### 5.4 Difficulty curve
- **Levels 1–3:** Easy band, smallest settings, with a tutorial overlay (a pointing hand).
- **Every 5th level:** Easy band (a breather).
- **Every 10th level:** Hard band, with a larger and fancier shape (a "boss" level).
- **All other levels:** Normal band.
- **Settings that ramp up with level number** (each capped at the value shown):

| Setting | Start | Cap |
|---|---|---|
| Tile kinds | 6 | 18 |
| Layers | 2 | 6 |
| Total tiles | 24 | 120 |
| Target peak | 1 | limit − 1 |
| Special tiles | none until introduced | up to 15% of tiles |

### 5.5 Shuffle
Shuffle re-runs §5.2 steps 2–4 on the tiles left on the board, taking the current tray contents into account. The tile slots stay where they are; only the kinds move, with an animated reshuffle. The result is guaranteed winnable.

### 5.6 Performance
- Generation runs in a background thread (Web Worker) and must finish within 300 ms on the 13R.
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

**Accessibility:**
- Colour-blind mode adds a small symbol to each tile kind.
- Left-handed mode mirrors the power-up bar.

## 9. Architecture

Stack:
- TypeScript, Vite, PixiJS v8 (graphics drawn through the GPU via WebGL);
- Capacitor for the Android wrapper, with the Haptics, Preferences, App and Status Bar plugins;
- Vitest for unit tests and Playwright for browser tests.

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
  render/        PixiJS views; subscribe to core events
    boardView.ts, trayView.ts, effects.ts, tweens.ts
  themes/        one folder per theme + registry
  audio/         Web Audio sound effects + music layers, low-pass for danger
  ui/            HTML/CSS menu screens and overlays
  platform/      Capacitor bridges: haptics, back button, lifecycle, immersive mode
  storage/       versioned save with automatic backup copy
android/         Capacitor-generated Android project
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
- Portrait locked, full-screen (immersive) mode.
- The back button pauses during a game, and asks to confirm exit on the home screen.
- Animation runs at the display's full refresh rate.

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

## 11. Testing

- **Unit tests:** free-tile calculation, tray matching, the lose condition at the limit, undo, every power-up, every special tile, stars, combo and economy.
- **Generator check:** 10,000 seeds checked by a separate exhaustive checker. Every level must be solvable, and the difficulty bands must fall within their ranges. Runs on every build.
- **Visual check:** Playwright screenshots of every screen in every theme at 13R dimensions (1264×2780, portrait), reviewed before each milestone.
- **Performance:** a stress board of 120 tiles with a maximum particle burst. Frame time must stay under 8.3 ms (the budget for 120 fps) in a headless Chrome profiling run with 4× CPU throttling, used as a stand-in for a phone. Real smoothness is then confirmed on the 13R during the user's playtests.
- **Playtests:** the user plays at each milestone, and their feedback drives the polish.

## 12. Out of scope

Ads, in-app purchases, accounts, cloud save, online leaderboards, a Play Store listing, iOS, and tablet layouts.
