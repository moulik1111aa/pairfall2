// Home screen. Its one orchestrated moment: two tiles drop in, meet, and burst.

import { App, html, type Screen } from './app.ts';
import { coinsBadge, ICONS } from './icons.ts';
import { openSheet } from './overlay.ts';
import { settingsToggles } from './settings.ts';
import { tileUrls } from '../themes/prerender.ts';
import { Particles } from '../render/particles.ts';
import { reducedMotion, EASE_BACK, EASE_IN_OUT } from '../render/tweens.ts';
import { playScreen } from './play.ts';
import { mapScreen } from './map.ts';
import { prefetch } from '../gen/client.ts';

export function homeScreen(app: App): Screen {
  const level = app.save.data.level;
  const kind = (level * 7) % app.theme.tiles.length;
  const url = tileUrls(app.theme)[kind];
  const el = html(`<section class="screen home" aria-label="Home">
    <div class="home-top"><button class="icon-btn sound-btn" aria-label="Sound settings">${ICONS.sound}</button>${coinsBadge(app.save.data.coins)}</div>
    <div class="hero" aria-hidden="true">
      <div class="hero-tile a" style="background-image:url('${url}')"></div>
      <div class="hero-tile b" style="background-image:url('${url}')"></div>
    </div>
    <h1 class="wordmark">Pairfall</h1>
    <p class="tagline">Match the pairs. Keep the tray clear.</p>
    <div class="home-actions">
      <button class="btn play-btn">${level === 1 ? 'Start playing' : `Play level ${level}`}</button>
      <button class="btn secondary map-btn">Journey map</button>
    </div>
  </section>`);
  el.querySelector('.play-btn')!.addEventListener('click', () => app.show(playScreen(level)));
  el.querySelector('.map-btn')!.addEventListener('click', () => app.show(mapScreen));
  el.querySelector('.sound-btn')!.addEventListener('click', () => {
    const sheet = openSheet(el, '<h2>Sound</h2><p>Changes apply straight away.</p>', [{ label: 'Done', run: () => sheet.remove() }], 'Sound settings');
    const box = sheet.querySelector('.sheet')!;
    box.insertBefore(settingsToggles(app), box.querySelector('.actions'));
  });
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
