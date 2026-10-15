// Home screen. Its one orchestrated moment: two tiles drop in, meet, and burst.

import { App, html, type Screen } from './app.ts';
import { coinsBadge, ICONS } from './icons.ts';
import { tileUrls } from '../themes/prerender.ts';
import { Particles } from '../render/particles.ts';
import { reducedMotion, EASE_BACK, EASE_IN_OUT } from '../render/tweens.ts';
import { playScreen } from './play.ts';
import { mapScreen } from './map.ts';
import { prefetch } from '../gen/client.ts';
import { dayKey, currentStreak, clearedToday } from '../core/daily.ts';
import { themesScreen } from './themes.ts';
import { statsScreen } from './stats.ts';
import { settingsScreen } from './settingsScreen.ts';
import { TEXT } from './i18n.ts';
import { helpScreen } from './help.ts';

export function homeScreen(app: App): Screen {
  const level = app.save.data.level;
  const kind = (level * 7) % app.theme.tiles.length;
  const url = tileUrls(app.theme)[kind];
  const today = dayKey();
  const daily = app.save.data.daily;
  const streak = currentStreak(daily, today);
  const dailyNote = clearedToday(daily, today)
    ? `Cleared today${streak > 1 ? `, ${streak}-day streak` : ''}`
    : streak > 0
      ? `Keep your ${streak}-day streak going`
      : 'New board each day';
  const el = html(`<section class="screen home" aria-label="Home">
    <div class="home-top"><div class="home-top-left"><button class="icon-btn settings-btn" aria-label="Settings">${ICONS.gear}</button><button class="icon-btn help-btn" aria-label="How to play">${ICONS.help}</button></div>${coinsBadge(app.save.data.coins)}</div>
    <div class="hero" aria-hidden="true">
      <div class="hero-tile a" style="background-image:url('${url}')"></div>
      <div class="hero-tile b" style="background-image:url('${url}')"></div>
    </div>
    <h1 class="wordmark">Pairfall</h1>
    <p class="tagline">${app.t(TEXT.tagline)}</p>
    <div class="home-actions">
      <button class="btn play-btn">${level === 1 ? 'Start playing' : `Play level ${level}`}</button>
      <div class="mode-row">
        <button class="mode-btn daily-btn">${ICONS.calendar}<span><b>Daily challenge</b><small>${dailyNote}</small></span></button>
        <button class="mode-btn zen-btn">${ICONS.leaf}<span><b>Zen</b><small>No tray limit</small></span></button>
      </div>
      <div class="small-row">
        <button class="btn small secondary map-btn">Journey</button>
        <button class="btn small secondary themes-btn">Themes</button>
        <button class="btn small secondary stats-btn">Stats</button>
      </div>
    </div>
  </section>`);
  el.querySelector('.play-btn')!.addEventListener('click', () => app.show(playScreen(level)));
  el.querySelector('.map-btn')!.addEventListener('click', () => app.show(mapScreen));
  el.querySelector('.settings-btn')!.addEventListener('click', () => app.show(settingsScreen));
  el.querySelector('.help-btn')!.addEventListener('click', () => app.show(helpScreen));
  el.querySelector('.themes-btn')!.addEventListener('click', () => app.show(themesScreen));
  el.querySelector('.stats-btn')!.addEventListener('click', () => app.show(statsScreen));
  el.querySelector('.daily-btn')!.addEventListener('click', () => app.show(playScreen({ kind: 'daily', date: today })));
  el.querySelector('.zen-btn')!.addEventListener('click', () => app.show(playScreen({ kind: 'zen', seed: Math.floor(Math.random() * 1e9) })));
  prefetch(level);

  const hero = el.querySelector<HTMLElement>('.hero')!;
  const a = hero.querySelector<HTMLElement>('.a')!;
  const b = hero.querySelector<HTMLElement>('.b')!;
  let fx: Particles | null = null;
  let timer = 0;
  const intro = () => {
    if (reducedMotion()) return;
    a.animate(
      [
        { transform: 'translate(-70px,-260px) rotate(-24deg)', opacity: 0 },
        { transform: 'translate(-70px,-260px) rotate(-24deg)', opacity: 1, offset: 0.01 },
        { transform: 'translate(-58px,0) rotate(-6deg)' },
      ],
      { duration: 620, easing: EASE_BACK, fill: 'backwards' },
    );
    b.animate(
      [
        { transform: 'translate(70px,-300px) rotate(20deg)', opacity: 0 },
        { transform: 'translate(70px,-300px) rotate(20deg)', opacity: 1, offset: 0.01 },
        { transform: 'translate(58px,0) rotate(6deg)' },
      ],
      { duration: 640, delay: 140, easing: EASE_BACK, fill: 'backwards' },
    );
    // then they slide together and click
    const meet = { duration: 260, delay: 900, easing: EASE_IN_OUT, fill: 'both' as FillMode };
    a.animate([{ transform: 'translate(-58px,0) rotate(-6deg)' }, { transform: 'translate(-34px,0) rotate(-3deg)' }], meet);
    b.animate([{ transform: 'translate(58px,0) rotate(6deg)' }, { transform: 'translate(34px,0) rotate(3deg)' }], meet);
    timer = window.setTimeout(() => {
      fx = new Particles(hero, app.theme.particles);
      const r = hero.getBoundingClientRect();
      fx.burst(r.width / 2, r.height / 2, 2.2);
    }, 1140);
  };

  return {
    el,
    mounted: intro,
    destroy() {
      clearTimeout(timer);
      fx?.destroy();
    },
  };
}
