// Stats: a plain record of how the player is doing.

import { App, html, type Screen } from './app.ts';
import { ICONS, coinsBadge } from './icons.ts';
import { homeScreen } from './home.ts';
import { currentStreak, dayKey } from '../core/daily.ts';

export function statsScreen(app: App): Screen {
  const d = app.save.data;
  const cleared = d.level - 1;
  const stars = Object.values(d.stars).reduce((a, b) => a + b, 0);
  const rate = d.stats.played ? Math.round((d.stats.won / d.stats.played) * 100) : 0;
  const rows: [string, string][] = [
    ['Journey levels cleared', String(cleared)],
    ['Stars earned', `${stars} of ${cleared * 3}`],
    ['Games won', `${d.stats.won} of ${d.stats.played} (${rate}%)`],
    ['Pairs cleared', d.stats.pairs.toLocaleString()],
    ['Best combo', d.stats.bestCombo ? `×${d.stats.bestCombo}` : 'None yet'],
    ['Daily streak', `${currentStreak(d.daily, dayKey())} days (best ${d.daily.best})`],
    ['Coins', d.coins.toLocaleString()],
  ];
  const el = html(`<section class="screen subscreen" aria-label="Stats">
    <header class="hud">
      <button class="icon-btn back-btn" aria-label="Home">${ICONS.back}</button>
      <div class="hud-title">Stats</div>
      ${coinsBadge(d.coins)}
    </header>
    <div class="sub-scroll">
      <dl class="stat-list">${rows.map(([k, v]) => `<div><dt>${k}</dt><dd>${v}</dd></div>`).join('')}</dl>
    </div>
  </section>`);
  el.querySelector('.back-btn')!.addEventListener('click', () => app.show(homeScreen));
  return { el };
}
