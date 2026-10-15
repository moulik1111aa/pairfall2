// Journey map: a winding path of stepping-stone tiles, one per level.

import { App, html, type Screen } from './app.ts';
import { ICONS, coinsBadge } from './icons.ts';
import { homeScreen } from './home.ts';
import { playScreen } from './play.ts';

const STEP = 104; // vertical distance between levels (px)

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
  </section>`);
  el.querySelector('.back-btn')!.addEventListener('click', () => app.show(homeScreen));

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

  return { el };
}
