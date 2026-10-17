// Journey map: a winding path of stepping-stone tiles, one per level.

import { App, html, type Screen } from './app.ts';
import { ICONS, coinsBadge } from './icons.ts';
import { homeScreen } from './home.ts';
import { playScreen } from './play.ts';
import { openSheet } from './overlay.ts';
import { TEXT } from './i18n.ts';

const STEP = 104; // vertical distance between levels (px)
/** Quick picks on the Jump sheet. */
export const JUMP_LEVELS = [50, 100, 150, 200, 250, 300, 400, 500] as const;
export const MAX_JUMP = 9999;

/** Go straight to a Journey level; everything up to it becomes open on the map. */
export function jumpTo(app: App, level: number): void {
  const n = Math.max(1, Math.min(MAX_JUMP, Math.floor(level)));
  app.save.update((d) => (d.level = Math.max(d.level, n)));
  app.show(playScreen(n));
}

export function mapScreen(app: App): Screen {
  const { level: current, stars } = app.save.data;
  const last = current + 12;
  const el = html(`<section class="screen map" aria-label="Journey map">
    <header class="hud">
      <button class="icon-btn back-btn" aria-label="Home">${ICONS.back}</button>
      <div class="hud-title">Journey</div>
      ${coinsBadge(app.save.data.coins)}
    </header>
    <div class="map-scroll"><div class="map-path"></div></div>
    <button class="btn jump-fab" aria-label="Jump to a level">${ICONS.jump}<span>Jump</span></button>
  </section>`);
  el.querySelector('.back-btn')!.addEventListener('click', () => app.show(homeScreen));

  let sheet: HTMLElement | null = null;
  const close = () => {
    sheet?.remove();
    sheet = null;
  };
  el.querySelector('.jump-fab')!.addEventListener('click', () => {
    if (sheet) return;
    sheet = openSheet(
      el,
      `<h2>${app.t(TEXT.jumpTitle)}</h2>
       <p>${app.t(TEXT.jumpNote)}</p>
       <div class="jump-grid">${JUMP_LEVELS.map(
         (n) => `<button class="btn secondary${n === current ? ' here' : ''}" data-level="${n}" aria-label="Level ${n}">${n}</button>`,
       ).join('')}</div>
       <form class="jump-own">
         <input type="number" inputmode="numeric" min="1" max="${MAX_JUMP}" placeholder="Any level" aria-label="Level number" />
         <button class="btn" type="submit">Go</button>
       </form>`,
      [{ label: 'Cancel', kind: 'secondary', back: true, run: close }],
      TEXT.jumpTitle.en,
    );
    sheet.querySelector('.jump-grid')!.addEventListener('click', (e) => {
      const b = (e.target as HTMLElement).closest<HTMLButtonElement>('[data-level]');
      if (b) jumpTo(app, Number(b.dataset.level));
    });
    const form = sheet.querySelector<HTMLFormElement>('.jump-own')!;
    const input = form.querySelector('input')!;
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const n = Number(input.value);
      if (Number.isFinite(n) && n >= 1) jumpTo(app, n);
      else input.focus();
    });
  });

  const path = el.querySelector<HTMLElement>('.map-path')!;
  const height = (last + 1) * STEP;
  path.style.height = `${height}px`;
  // Level 1 sits at the bottom; the journey climbs upward.
  const pos = (n: number) => ({ x: 50 + 27 * Math.sin(n * 0.85), y: height - n * STEP + 20 });

  const pts = Array.from({ length: last }, (_, i) => pos(i + 1));
  path.innerHTML = `<svg class="map-line" viewBox="0 0 100 ${height}" preserveAspectRatio="none" aria-hidden="true">
    <path d="M ${pts.map((p) => `${p.x} ${p.y}`).join(' L ')}" fill="none" vector-effect="non-scaling-stroke"/></svg>`;

  for (let n = 1; n <= last; n++) {
    const p = pos(n);
    const boss = n % 10 === 0 && n > 10;
    const state = n < current ? 'done' : n === current ? 'current' : 'locked';
    const s = stars[n] ?? 0;
    const b = document.createElement('button');
    b.className = `node ${state}${boss ? ' boss' : ''}`;
    b.style.left = `${p.x}%`;
    b.style.top = `${p.y}px`;
    b.disabled = state === 'locked';
    b.setAttribute('aria-label', `Level ${n}${boss ? ', boss level' : ''}${state === 'locked' ? ', locked' : s ? `, ${s} stars` : ''}`);
    b.innerHTML = `${boss ? `<span class="node-icon">${ICONS.lantern}</span>` : ''}<span class="node-num">${n}</span>${
      state === 'done' ? `<span class="node-stars">${'★'.repeat(s)}<i>${'★'.repeat(3 - s)}</i></span>` : ''
    }${state === 'locked' ? `<span class="node-lock">${ICONS.lock}</span>` : ''}`;
    if (state !== 'locked') b.addEventListener('click', () => app.show(playScreen(n)));
    path.appendChild(b);
  }

  // Scroll so the current level sits a little below the middle of the screen.
  requestAnimationFrame(() => {
    const scroller = el.querySelector<HTMLElement>('.map-scroll')!;
    scroller.scrollTop = pos(current).y - scroller.clientHeight * 0.6;
  });

  return {
    el,
    destroy: close,
  };
}
