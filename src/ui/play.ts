// The game screen: HUD, board + tray stage, tutorial, and the pause/win/lose sheets.

import { App, html, type Screen } from './app.ts';
import { Game } from '../core/game.ts';
import { starsFor, coinsFor } from '../core/economy.ts';
import { GameStage } from '../render/gameStage.ts';
import { getLevel, prefetch } from '../gen/client.ts';
import type { Level } from '../gen/levels.ts';
import { ICONS, coinsBadge, starIcon } from './icons.ts';
import { openSheet } from './overlay.ts';
import { Tutorial } from './tutorial.ts';
import { homeScreen } from './home.ts';
import { mapScreen } from './map.ts';
import { reducedMotion } from '../render/tweens.ts';

declare global {
  interface Window {
    __pairfall?: { level: Level; game: Game; tap(slot: number): void };
  }
}

export function playScreen(n: number) {
  return (app: App): Screen => {
    const el = html(`<section class="screen play" aria-label="Level ${n}">
      <header class="hud">
        <button class="icon-btn pause-btn" aria-label="Pause">${ICONS.pause}</button>
        <div class="hud-title">Level ${n}${n % 10 === 0 && n > 10 ? '<small>Boss level</small>' : ''}</div>
        ${coinsBadge(app.save.data.coins)}
      </header>
      <div class="play-area"><div class="loading" style="position:absolute;inset:0;display:grid;place-items:center;color:var(--ink-soft)">Laying out tiles…</div></div>
    </section>`);
    const area = el.querySelector<HTMLElement>('.play-area')!;
    let stage: GameStage | null = null;
    let game: Game | null = null;
    let tutorial: Tutorial | null = null;
    let sheet: HTMLElement | null = null;
    let destroyed = false;

    const closeSheet = () => {
      sheet?.remove();
      sheet = null;
    };

    const restart = () => app.show(playScreen(n));

    const showPause = () => {
      if (sheet || !game || game.status !== 'playing') return;
      sheet = openSheet(
        el,
        `<h2>Paused</h2><p>Level ${n}. Your board stays exactly as you left it.</p>`,
        [
          { label: 'Resume', run: closeSheet },
          { label: 'Restart level', kind: 'secondary', run: restart },
          { label: 'Home', kind: 'secondary', run: () => app.show(homeScreen) },
        ],
        'Paused',
      );
    };

    const showWin = (g: Game) => {
      const run = { powerupsUsed: g.powerupsUsed, dangerReached: g.dangerReached, comboBonusSteps: g.comboBonusSteps };
      const stars = starsFor(run);
      const coins = coinsFor(run);
      app.save.update((d) => {
        d.level = Math.max(d.level, n + 1);
        d.coins += coins;
        d.stars[n] = Math.max(d.stars[n] ?? 0, stars) as 1 | 2 | 3;
        d.stats.won++;
        d.stats.bestCombo = Math.max(d.stats.bestCombo, g.bestCombo);
        d.stats.pairs += g.pairsCleared;
        if (n >= 3) d.tutorialDone = true;
      });
      el.querySelector('.coin-count')!.textContent = String(app.save.data.coins);
      sheet = openSheet(
        el,
        `<h2>Level ${n} cleared</h2>
         <div class="stars" aria-label="${stars} of 3 stars">${[1, 2, 3].map((i) => starIcon(i <= stars)).join('')}</div>
         <div class="reward"><span>${ICONS.coin.replace('<svg', '<svg width="20" height="20" style="vertical-align:-4px"')} <b>+${coins}</b> coins</span>${g.bestCombo >= 2 ? `<span>Best combo <b>×${g.bestCombo}</b></span>` : ''}</div>`,
        [
          { label: `Play level ${n + 1}`, run: () => app.show(playScreen(n + 1)) },
          { label: 'Journey map', kind: 'secondary', run: () => app.show(mapScreen) },
        ],
        `Level ${n} cleared`,
      );
      if (!reducedMotion()) {
        sheet.querySelectorAll<SVGElement>('.stars .star').forEach((s, i) => {
          s.animate(
            [
              { transform: `${i === 1 ? 'translateY(-10px) ' : ''}scale(0) rotate(-40deg)`, opacity: 0 },
              { transform: `${i === 1 ? 'translateY(-10px) ' : ''}scale(1.25) rotate(8deg)`, opacity: 1, offset: 0.6 },
              { transform: `${i === 1 ? 'translateY(-10px) ' : ''}scale(1) rotate(0)`, opacity: 1 },
            ],
            { duration: 420, delay: 260 + i * 200, easing: 'ease-out', fill: 'backwards' },
          );
        });
      }
    };

    const showLose = (g: Game) => {
      sheet = openSheet(
        el,
        `<h2>Tray full</h2><p>${g.limit} tiles were waiting for their twins. Try finishing a pair before starting a new one.</p>`,
        [
          { label: 'Try again', run: restart },
          { label: 'Journey map', kind: 'secondary', run: () => app.show(mapScreen) },
        ],
        'Tray full',
      );
    };

    el.querySelector('.pause-btn')!.addEventListener('click', showPause);

    getLevel(n).then(
      (level) => {
        if (destroyed) return;
        area.querySelector('.loading')?.remove();
        const g = new Game(level);
        game = g;
        app.save.update((d) => d.stats.played++);
        const onTap = (slot: number) => {
          if (!g.canTap(slot)) return;
          stage!.apply(g.tap(slot));
          tutorial?.update();
        };
        stage = new GameStage(area, g, app.theme, {
          onTap,
          onEnd(result) {
            tutorial?.destroy();
            if (result === 'won') showWin(g);
            else showLose(g);
          },
        });
        if (level.settings.tutorial) tutorial = new Tutorial(area, n, g, stage);
        prefetch(n + 1);
        if (app.debug) {
          window.__pairfall = { level, game: g, tap: onTap };
        }
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
      destroy() {
        destroyed = true;
        tutorial?.destroy();
        stage?.destroy();
      },
    };
  };
}
