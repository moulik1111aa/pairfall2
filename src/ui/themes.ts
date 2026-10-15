// Themes gallery: preview every theme, switch to unlocked ones.

import { App, html, type Screen } from './app.ts';
import { ICONS, coinsBadge } from './icons.ts';
import { THEMES } from '../themes/registry.ts';
import { tileUrls, backdropUrl } from '../themes/prerender.ts';
import { homeScreen } from './home.ts';

export function themesScreen(app: App): Screen {
  const el = html(`<section class="screen subscreen" aria-label="Themes">
    <header class="hud">
      <button class="icon-btn back-btn" aria-label="Home">${ICONS.back}</button>
      <div class="hud-title">Themes</div>
      ${coinsBadge(app.save.data.coins)}
    </header>
    <div class="sub-scroll"><div class="theme-list"></div></div>
  </section>`);
  el.querySelector('.back-btn')!.addEventListener('click', () => app.show(homeScreen));
  const list = el.querySelector<HTMLElement>('.theme-list')!;

  const render = () => {
    list.innerHTML = '';
    for (const t of THEMES) {
      const unlocked = app.save.data.level >= t.unlockLevel;
      const current = app.theme.id === t.id;
      const urls = tileUrls(t);
      const card = html(`<article class="theme-card${unlocked ? '' : ' locked'}" style="--card-bg:${t.vars['--bg']};--card-ink:${t.vars['--ink']};background-image:${backdropUrl(t)}">
        <div class="theme-tiles" aria-hidden="true">${[0, 4, 8, 13].map((k) => `<span style="background-image:url('${urls[k]}')"></span>`).join('')}</div>
        <div class="theme-info">
          <h2>${t.name}</h2>
          <p>${t.blurb}</p>
        </div>
      </article>`);
      const action = document.createElement('button');
      action.className = `btn small${current ? ' secondary' : ''}`;
      if (current) {
        action.textContent = 'In use';
        action.disabled = true;
      } else if (unlocked) {
        action.textContent = `Use ${t.name}`;
        action.addEventListener('click', () => {
          app.setTheme(t);
          render();
        });
      } else {
        action.textContent = `Reach level ${t.unlockLevel} to unlock`;
        action.disabled = true;
      }
      card.querySelector('.theme-info')!.appendChild(action);
      list.appendChild(card);
    }
  };
  render();
  return { el };
}
