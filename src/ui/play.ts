// The game screen for every mode (Journey, Daily, Zen): HUD, board + tray stage,
// power-up bar, tutorial, special-tile introductions and the pause/win/lose sheets.

import { App, html, type Screen } from './app.ts';
import { Game, WILD } from '../core/game.ts';
import { starsFor, coinsFor } from '../core/economy.ts';
import { pay, refund, hint, shuffle, costOf, type Payment } from '../core/powerups.ts';
import { recordClear, shortDate } from '../core/daily.ts';
import { createRng } from '../core/rng.ts';
import { CONFIG, type PowerupId } from '../config.ts';
import { GameStage } from '../render/gameStage.ts';
import { getLevel, prefetch } from '../gen/client.ts';
import type { Level, PlayMode } from '../gen/levels.ts';
import { ICONS, coinsBadge, starIcon } from './icons.ts';
import { openSheet, type SheetAction } from './overlay.ts';
import { Tutorial } from './tutorial.ts';
import { homeScreen } from './home.ts';
import { mapScreen } from './map.ts';
import { reducedMotion } from '../render/tweens.ts';
import { settingsToggles } from './settings.ts';
import { TEXT, SPECIALS } from './i18n.ts';
import { specialPicture, type SpecialKey } from './help.ts';
import { prepareTiles, prepareIce } from '../themes/prerender.ts';

declare global {
  interface Window {
    __pairfall?: { level: Level; game: Game; tap(slot: number): void; use(id: PowerupId): void };
  }
}

const POWERUPS: { id: PowerupId; label: string }[] = [
  { id: 'undo', label: 'Undo' },
  { id: 'hint', label: 'Hint' },
  { id: 'shuffle', label: 'Shuffle' },
  { id: 'xray', label: 'X-ray' },
  { id: 'extraSlot', label: '+1 Slot' },
];


/** Journey level number, or a full play mode. */
export function playScreen(m: number | PlayMode) {
  const mode: PlayMode = typeof m === 'number' ? { kind: 'journey', n: m } : m;
  return (app: App): Screen => {
    const n = mode.kind === 'journey' ? mode.n : 0;
    const zen = mode.kind === 'zen';
    const title =
      mode.kind === 'journey'
        ? `Level ${n}${n % 10 === 0 && n > 10 ? '<small>Boss level</small>' : ''}`
        : mode.kind === 'daily'
          ? `Daily challenge<small>${shortDate(mode.date)}</small>`
          : 'Zen<small>No tray limit</small>';
    const name = mode.kind === 'journey' ? `Level ${n}` : mode.kind === 'daily' ? 'Daily challenge' : 'Zen';
    const el = html(`<section class="screen play" aria-label="${name}">
      <header class="hud">
        <button class="icon-btn pause-btn" aria-label="Pause">${ICONS.pause}</button>
        <div class="hud-title">${title}</div>
        ${zen ? `<button class="icon-btn new-board" aria-label="New board">${ICONS.shuffle}</button>` : coinsBadge(app.save.data.coins)}
      </header>
      <div class="play-area"><div class="loading" style="position:absolute;inset:0;display:grid;place-items:center;color:var(--ink-soft)">Laying out tiles…</div></div>
    </section>`);
    const area = el.querySelector<HTMLElement>('.play-area')!;
    let stage: GameStage | null = null;
    let game: Game | null = null;
    let tutorial: Tutorial | null = null;
    let sheet: HTMLElement | null = null;
    let bar: HTMLElement | null = null;
    let destroyed = false;
    let usedSlot = false;
    const rng = createRng((Date.now() ^ 0x5bd1e995) >>> 0);

    const closeSheet = () => {
      sheet?.remove();
      sheet = null;
    };
    const restart = () => app.show(playScreen(mode));
    const newZen = () => app.show(playScreen({ kind: 'zen', seed: Math.floor(Math.random() * 1e9) }));
    const refreshCoins = () => {
      const c = el.querySelector('.coin-count');
      if (c) c.textContent = String(app.save.data.coins);
    };

    // ── Power-ups ────────────────────────────────────────────────────────────
    let barState = '';
    const renderBar = () => {
      if (!bar || !game) return;
      const g = game;
      // Skip DOM work when nothing the bar shows has changed (this runs on every tap).
      const state = [g.status, g.canUndo(), usedSlot, g.limit, app.save.data.coins, ...Object.values(app.save.data.powerups)].join();
      if (state === barState) return;
      barState = state;
      for (const b of bar.querySelectorAll<HTMLButtonElement>('.pu')) {
        const id = b.dataset.id as PowerupId;
        const free = app.save.data.powerups[id];
        const badge = b.querySelector<HTMLElement>('.pu-badge')!;
        if (zen) badge.hidden = true;
        else if (free > 0) {
          badge.className = 'pu-badge';
          badge.textContent = String(free);
        } else {
          badge.className = 'pu-badge price';
          badge.innerHTML = `${ICONS.coin}${costOf(id)}`;
        }
        b.disabled =
          g.status !== 'playing' ||
          (id === 'undo' && !g.canUndo()) ||
          (id === 'extraSlot' && (usedSlot || !Number.isFinite(g.limit)));
        b.setAttribute('aria-label', `${b.dataset.label}${zen ? '' : free > 0 ? `, ${free} free` : `, ${costOf(id)} coins`}`);
      }
    };

    const charge = (id: PowerupId): Payment | null => {
      if (zen) return 'free';
      let how: Payment = 'none';
      app.save.update((d) => (how = pay(d, id)));
      if (how === 'none') {
        app.toast(TEXT.notEnoughCoins(POWERUPS.find((p) => p.id === id)!.label));
        return null;
      }
      game!.powerupsUsed++;
      refreshCoins();
      return how;
    };
    const giveBack = (id: PowerupId, how: Payment) => {
      if (zen || how === 'none') return;
      app.save.update((d) => refund(d, id, how));
      game!.powerupsUsed--;
      refreshCoins();
    };

    const usePowerup = (id: PowerupId) => {
      const g = game;
      const s = stage;
      if (!g || !s || g.status !== 'playing') return;
      switch (id) {
        case 'undo': {
          if (!g.canUndo()) {
            app.toast(TEXT.undoNothing);
            break;
          }
          if (!charge(id)) break;
          s.apply(g.undo());
          break;
        }
        case 'hint': {
          const slots = hint(g.rules);
          if (!slots.length) {
            app.toast(TEXT.noSafeMove);
            break;
          }
          if (!charge(id)) break;
          s.showHint(slots);
          break;
        }
        case 'shuffle': {
          const how = charge(id);
          if (!how) break;
          const next = shuffle(g.rules, rng);
          if (!next) {
            giveBack(id, how);
            app.toast(TEXT.shuffleNothing);
            break;
          }
          s.apply(g.reassign(next));
          break;
        }
        case 'xray': {
          if (!charge(id)) break;
          s.xray(3000);
          break;
        }
        case 'extraSlot': {
          if (usedSlot || !Number.isFinite(g.limit)) break;
          if (!charge(id)) break;
          usedSlot = true;
          s.apply(g.addSlot());
          s.limitChanged();
          break;
        }
      }
      renderBar();
    };

    // ── Sheets ───────────────────────────────────────────────────────────────
    const showPause = () => {
      if (sheet || !game || game.status !== 'playing') return;
      sheet = openSheet(
        el,
        `<h2>Paused</h2><p>Your board stays exactly as you left it.</p>`,
        [
          { label: 'Resume', back: true, run: closeSheet },
          { label: zen ? 'New board' : 'Restart', kind: 'secondary', run: zen ? newZen : restart },
          { label: 'Home', kind: 'secondary', run: () => app.show(homeScreen) },
        ],
        'Paused',
      );
      const box = sheet.querySelector('.sheet')!;
      box.insertBefore(settingsToggles(app), box.querySelector('.actions'));
    };

    const animateStars = () => {
      if (reducedMotion() || !sheet) return;
      sheet.querySelectorAll<SVGElement>('.stars .star').forEach((s, i) => {
        const lift = i === 1 ? 'translateY(-10px) ' : '';
        s.animate(
          [
            { transform: `${lift}scale(0) rotate(-40deg)`, opacity: 0 },
            { transform: `${lift}scale(1.25) rotate(8deg)`, opacity: 1, offset: 0.6 },
            { transform: `${lift}scale(1) rotate(0)`, opacity: 1 },
          ],
          { duration: 420, delay: 260 + i * 200, easing: 'ease-out', fill: 'backwards' },
        );
      });
    };
    const coinLine = (coins: number) =>
      `<span>${ICONS.coin.replace('<svg', '<svg width="20" height="20" style="vertical-align:-4px"')} <b>+${coins}</b> coins</span>`;

    const showWin = (g: Game) => {
      app.save.update((d) => {
        d.stats.won++;
        d.stats.bestCombo = Math.max(d.stats.bestCombo, g.bestCombo);
        d.stats.pairs += g.pairsCleared;
      });
      if (mode.kind === 'zen') {
        sheet = openSheet(
          el,
          `<h2>Board cleared</h2><p>${g.pairsCleared} pairs${g.bestCombo >= 2 ? `, best combo ×${g.bestCombo}` : ''}. Take a breath, then go again.</p>`,
          [
            { label: 'New board', run: newZen },
            { label: 'Home', kind: 'secondary', back: true, run: () => app.show(homeScreen) },
          ],
          'Board cleared',
        );
        return;
      }
      if (mode.kind === 'daily') {
        let first = false;
        app.save.update((d) => {
          const r = recordClear(d.daily, mode.date);
          first = r.first;
          d.daily = r.state;
          if (first) d.coins += CONFIG.rewards.daily;
        });
        refreshCoins();
        const streak = app.save.data.daily.streak;
        sheet = openSheet(
          el,
          `<h2>Daily challenge cleared</h2>
           <p>${first ? `Streak: ${streak} day${streak === 1 ? '' : 's'}. Come back tomorrow to keep it going.` : 'You already cleared today’s challenge, so this one is just for fun.'}</p>
           ${first ? `<div class="reward">${coinLine(CONFIG.rewards.daily)}</div>` : ''}`,
          [
            { label: 'Home', back: true, run: () => app.show(homeScreen) },
            { label: 'Journey map', kind: 'secondary', run: () => app.show(mapScreen) },
          ],
          'Daily challenge cleared',
        );
        return;
      }
      const run = { powerupsUsed: g.powerupsUsed, dangerReached: g.dangerReached, comboBonusSteps: g.comboBonusSteps };
      const stars = starsFor(run);
      const coins = coinsFor(run);
      app.save.update((d) => {
        d.level = Math.max(d.level, n + 1);
        d.coins += coins;
        d.stars[n] = Math.max(d.stars[n] ?? 0, stars) as 1 | 2 | 3;
        if (n >= 3) d.tutorialDone = true;
      });
      refreshCoins();
      const unlock = n + 1 === 15 ? 'Neon Cosmos' : n + 1 === 30 ? 'Festive India' : '';
      sheet = openSheet(
        el,
        `<h2>Level ${n} cleared</h2>
         <div class="stars" aria-label="${stars} of 3 stars">${[1, 2, 3].map((i) => starIcon(i <= stars)).join('')}</div>
         <div class="reward">${coinLine(coins)}${g.bestCombo >= 2 ? `<span>Best combo <b>×${g.bestCombo}</b></span>` : ''}</div>
         ${unlock ? `<p class="unlock-note">${app.t(TEXT.themeUnlocked(unlock))}</p>` : ''}`,
        [
          { label: `Play level ${n + 1}`, run: () => app.show(playScreen(n + 1)) },
          { label: 'Journey map', kind: 'secondary', back: true, run: () => app.show(mapScreen) },
        ],
        `Level ${n} cleared`,
      );
      animateStars();
    };

    const showLose = (g: Game) => {
      const stuck = g.lossReason === 'stuck';
      const canContinue = !stuck && !zen && !g.continued && app.save.data.coins >= CONFIG.costs.continue;
      const actions: SheetAction[] = [];
      if (canContinue) {
        actions.push({
          label: `Continue with +1 slot (${CONFIG.costs.continue} coins)`,
          run: () => {
            app.save.update((d) => (d.coins -= CONFIG.costs.continue));
            refreshCoins();
            g.continued = true;
            g.powerupsUsed++;
            closeSheet();
            stage!.revive();
            stage!.apply(g.addSlot());
            stage!.limitChanged();
            renderBar();
          },
        });
      }
      actions.push({ label: zen ? 'New board' : 'Try again', kind: canContinue ? 'secondary' : 'primary', run: zen ? newZen : restart });
      actions.push({
        label: mode.kind === 'journey' ? 'Journey map' : 'Home',
        kind: 'secondary',
        back: true,
        run: () => app.show(mode.kind === 'journey' ? mapScreen : homeScreen),
      });
      sheet = openSheet(
        el,
        stuck
          ? `<h2>${app.t(TEXT.stuckTitle)}</h2><p>${app.t(TEXT.stuck)}</p>`
          : `<h2>${app.t(TEXT.trayFullTitle)}</h2><p>${app.t(TEXT.trayFull(g.limit))}</p>`,
        actions,
        stuck ? 'No moves left' : 'Tray full',
      );
    };

    // ── Special-tile introductions ───────────────────────────────────────────
    const pendingIntros = (level: Level): SpecialKey[] => {
      const sp = level.specials ?? {};
      const has: Record<string, boolean> = {
        mystery: !!sp.mystery?.length,
        frozen: !!Object.keys(sp.frozen ?? {}).length,
        locks: !!sp.locks?.length,
        wild: level.kinds.includes(WILD),
      };
      return (Object.keys(SPECIALS) as SpecialKey[]).filter((k) => has[k] && !app.save.data.seenIntro.includes(k));
    };

    const showIntros = (keys: SpecialKey[], done: () => void) => {
      const key = keys[0];
      if (!key) return done();
      const picture = specialPicture(app, key);
      sheet = openSheet(
        el,
        `${picture}<h2>${app.t(SPECIALS[key].title)}</h2><p>${app.t(SPECIALS[key].text)}</p>`,
        [
          {
            label: 'Got it',
            back: true,
            run: () => {
              closeSheet();
              app.save.update((d) => d.seenIntro.push(key));
              showIntros(keys.slice(1), done);
            },
          },
        ],
        SPECIALS[key].title.en,
      );
    };

    el.querySelector('.pause-btn')!.addEventListener('click', showPause);
    el.querySelector('.new-board')?.addEventListener('click', newZen);

    const numbers = app.save.data.settings.colorBlind;
    Promise.all([getLevel(mode), prepareTiles(app.theme, { numbers }), prepareIce()]).then(
      ([level]) => {
        if (destroyed) return;
        area.querySelector('.loading')?.remove();
        const g = new Game(zen ? { ...level, limit: Infinity } : level);
        game = g;
        app.save.update((d) => d.stats.played++);
        const onTap = (slot: number) => {
          if (!g.canTap(slot)) return;
          stage!.apply(g.tap(slot));
          tutorial?.update();
          renderBar();
        };

        bar = html(`<div class="powerbar${app.save.data.settings.leftHanded ? ' left-handed' : ''}" role="toolbar" aria-label="Power-ups">${POWERUPS.filter(
          (p) => !(zen && p.id === 'extraSlot'),
        )
          .map((p) => `<button class="pu" data-id="${p.id}" data-label="${p.label}">${ICONS[p.id]}<span>${p.label}</span><span class="pu-badge"></span></button>`)
          .join('')}</div>`);
        bar.addEventListener('click', (e) => {
          const b = (e.target as HTMLElement).closest<HTMLButtonElement>('.pu');
          if (b && !b.disabled) usePowerup(b.dataset.id as PowerupId);
        });

        const start = () => {
          if (destroyed) return;
          stage = new GameStage(area, g, app.theme, {
            onTap,
            feedback: app.feedback,
            bottomReserve: 84,
            // Tutorial levels keep room above the board for the guidance bubble (taller with Hindi).
            topReserve: level.settings.tutorial && mode.kind === 'journey' ? (app.hindi ? 128 : 72) : 0,
            numbers,
            mystery: level.specials?.mystery,
            onEnd(result) {
              tutorial?.destroy();
              renderBar();
              if (result === 'won') showWin(g);
              else showLose(g);
            },
          });
          area.appendChild(bar!);
          renderBar();
          if (level.settings.tutorial && mode.kind === 'journey') tutorial = new Tutorial(area, n, g, stage, app.hindi);
          if (mode.kind === 'journey') prefetch(n + 1);
          if (app.debug) window.__pairfall = { level, game: g, tap: onTap, use: usePowerup };
        };
        const intros = pendingIntros(level);
        if (intros.length) showIntros(intros, start);
        else start();
      },
      () => {
        area.innerHTML = `<div style="position:absolute;inset:0;display:grid;place-items:center;padding:24px;text-align:center">
          <div><p>This level could not be prepared.</p><button class="btn">Try again</button></div></div>`;
        area.querySelector('button')!.addEventListener('click', restart);
      },
    );

    return {
      el,
      pause: showPause,
      keepAwake: true,
      back() {
        // Still loading: leave. Playing: pause. Ending: wait for the result sheet.
        if (!game) app.show(mode.kind === 'journey' ? mapScreen : homeScreen);
        else if (game.status === 'playing') showPause();
        return true;
      },
      destroy() {
        destroyed = true;
        app.sound.danger(false);
        tutorial?.destroy();
        stage?.destroy();
      },
    };
  };
}
