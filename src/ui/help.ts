// How to play: one idea per card, in large type, English with Hindi underneath.
// Big Back / Next buttons (and swipes) move between cards; tabs jump to a section.
// Also home to the special-tile pictures shared with the in-game introduction cards.

import { App, html, type Screen } from './app.ts';
import { ICONS, starIcon } from './icons.ts';
import { homeScreen } from './home.ts';
import { tileUrls, iceImage, prepareIce, MYSTERY_IMAGE, WILD_IMAGE } from '../themes/prerender.ts';
import { INTRO } from '../gen/curve.ts';
import { CONFIG, type PowerupId } from '../config.ts';
import { HELP_TEXT, MODES, POWERUP_COST, POWERUP_HELP, POWERUP_NAMES, RULES, SPECIALS, type Bi } from './i18n.ts';
import { reducedMotion } from '../render/tweens.ts';

export type SpecialKey = keyof typeof SPECIALS;

/** A tile picture showing one special tile, as it looks on the board. */
export function specialPicture(app: App, key: SpecialKey, cls = 'intro-tile'): string {
  const urls = tileUrls(app.theme);
  const pic = (i: number, extra = '') => `<div class="${cls} tile" style="background-image:url('${urls[i]}')">${extra}</div>`;
  switch (key) {
    case 'mystery':
      return pic(MYSTERY_IMAGE);
    case 'wild':
      return pic(WILD_IMAGE);
    case 'frozen':
      return pic(3, `<div class="ice" style="--ice:url('${iceImage()}')"><b>2</b></div>`);
    case 'locks':
      return pic(6, `<div class="padlock">${ICONS.lock.replace('currentColor', '#F2B33D').replace('currentColor', '#26324A')}</div>`);
  }
}

type Section = 'basics' | 'powerups' | 'specials' | 'modes';

interface Card {
  section: Section;
  picture: string;
  title: Bi;
  text: Bi;
  note?: Bi;
}

const SECTIONS: Section[] = ['basics', 'powerups', 'specials', 'modes'];
const POWERUP_ORDER: PowerupId[] = ['undo', 'hint', 'shuffle', 'xray', 'extraSlot'];

function cards(app: App): Card[] {
  const urls = tileUrls(app.theme);
  const tile = (i: number, extra = '') => `<div class="help-pic-tile tile" style="background-image:url('${urls[i]}')">${extra}</div>`;
  const icon = (svg: string) => `<div class="help-pic-icon">${svg}</div>`;
  const tray = (kinds: number[], wells: number) =>
    `<div class="help-tray">${Array.from({ length: wells }, (_, i) =>
      kinds[i] === undefined ? '<span class="well"></span>' : `<span class="well" style="background-image:url('${urls[kinds[i]]}')"></span>`,
    ).join('')}</div>`;
  const basicsPictures = [
    `<div class="help-pic-row">${tile(0, `<div class="help-finger">${ICONS.finger}</div>`)}</div>`,
    `<div class="help-pic-row pair">${tile(4)}${tile(4)}</div>`,
    tray([1, 5, 9, 13], CONFIG.trayLimit.normal + 1),
    `<div class="help-pic-row">${icon(starIcon(true))}</div>`,
    `<div class="help-combo">×3</div>`,
    `<div class="help-stars">${starIcon(true)}${starIcon(true)}${starIcon(true)}</div>`,
  ];
  return [
    ...RULES.map((r, i): Card => ({ section: 'basics', picture: basicsPictures[i], title: r.title, text: r.text })),
    ...POWERUP_ORDER.map((id): Card => ({ section: 'powerups', picture: icon(ICONS[id]), title: POWERUP_NAMES[id], text: POWERUP_HELP[id] })),
    { section: 'powerups', picture: icon(ICONS.coin), title: POWERUP_COST.title, text: POWERUP_COST.text },
    ...(Object.keys(SPECIALS) as SpecialKey[]).map(
      (k): Card => ({
        section: 'specials',
        picture: specialPicture(app, k, 'help-pic-tile'),
        title: SPECIALS[k].title,
        text: SPECIALS[k].text,
        note: HELP_TEXT.fromLevel(INTRO[k]),
      }),
    ),
    ...MODES.map((m, i): Card => ({ section: 'modes', picture: icon(i === 0 ? ICONS.calendar : ICONS.leaf), title: m.title, text: m.text })),
  ];
}

export function helpScreen(app: App): Screen {
  const deck = cards(app);
  const hindi = app.hindi;
  let index = 0;

  const el = html(`<section class="screen subscreen help" aria-label="How to play">
    <header class="hud">
      <button class="icon-btn back-btn" aria-label="Home">${ICONS.back}</button>
      <div class="hud-title">${HELP_TEXT.title.en}${hindi ? `<small lang="hi">${HELP_TEXT.title.hi}</small>` : ''}</div>
      <span style="width:48px" aria-hidden="true"></span>
    </header>
    <nav class="help-tabs" aria-label="Sections">${SECTIONS.map(
      (s) => `<button class="help-tab" data-section="${s}">${HELP_TEXT[s].en}${hindi ? `<span lang="hi">${HELP_TEXT[s].hi}</span>` : ''}</button>`,
    ).join('')}</nav>
    <div class="help-stage"><article class="help-card-big" aria-live="polite"></article></div>
    <footer class="help-nav">
      <button class="btn secondary help-prev"></button>
      <span class="help-count"></span>
      <button class="btn help-next"></button>
    </footer>
  </section>`);

  const card = el.querySelector<HTMLElement>('.help-card-big')!;
  const prev = el.querySelector<HTMLButtonElement>('.help-prev')!;
  const next = el.querySelector<HTMLButtonElement>('.help-next')!;
  const count = el.querySelector<HTMLElement>('.help-count')!;
  const tabs = [...el.querySelectorAll<HTMLButtonElement>('.help-tab')];
  const label = (b: Bi) => (hindi ? `<span class="en">${b.en}</span><span class="hi" lang="hi">${b.hi}</span>` : b.en);

  const render = (dir = 0) => {
    const c = deck[index];
    card.innerHTML = `<div class="help-picture">${c.picture}</div>
      ${c.note ? `<div class="help-note">${label(c.note)}</div>` : ''}
      <h2>${label(c.title)}</h2>
      <p>${label(c.text)}</p>`;
    fit();
    prev.innerHTML = label(HELP_TEXT.back);
    prev.disabled = index === 0;
    next.innerHTML = label(index === deck.length - 1 ? HELP_TEXT.done : HELP_TEXT.next);
    count.textContent = HELP_TEXT.page(index + 1, deck.length).en;
    for (const t of tabs) t.setAttribute('aria-current', String(t.dataset.section === c.section));
    if (dir && !reducedMotion()) {
      card.animate(
        [
          { transform: `translateX(${dir * 40}px)`, opacity: 0 },
          { transform: 'translateX(0)', opacity: 1 },
        ],
        { duration: 240, easing: 'cubic-bezier(.2,.8,.2,1)' },
      );
    }
  };
  // Keep each card on one screen: step the type down a little only if a long card would overflow.
  const fit = () => {
    for (let scale = 1; scale >= 0.8; scale -= 0.05) {
      card.style.setProperty('--help-scale', String(scale));
      if (card.scrollHeight <= card.clientHeight + 1) break;
    }
  };
  const go = (to: number) => {
    if (to < 0) return;
    if (to >= deck.length) {
      app.show(homeScreen);
      return;
    }
    const dir = Math.sign(to - index);
    index = to;
    render(dir);
  };

  prev.addEventListener('click', () => go(index - 1));
  next.addEventListener('click', () => go(index + 1));
  for (const t of tabs) t.addEventListener('click', () => go(deck.findIndex((c) => c.section === t.dataset.section)));
  el.querySelector('.back-btn')!.addEventListener('click', () => app.show(homeScreen));

  // Swipe left / right on the card.
  let startX = 0;
  let startY = 0;
  const stage = el.querySelector<HTMLElement>('.help-stage')!;
  stage.addEventListener('pointerdown', (e) => {
    startX = e.clientX;
    startY = e.clientY;
  });
  stage.addEventListener('pointerup', (e) => {
    const dx = e.clientX - startX;
    if (Math.abs(dx) < 50 || Math.abs(dx) < Math.abs(e.clientY - startY) * 1.5) return;
    const to = index + (dx < 0 ? 1 : -1);
    if (to >= 0 && to < deck.length) go(to);
  });

  return {
    el,
    mounted() {
      render();
      swapIce(el);
      window.addEventListener('resize', fit);
    },
    destroy() {
      window.removeEventListener('resize', fit);
    },
  };
}

/** Swap in the crisp ice bitmap once it is ready (later cards pick it up via iceImage()). */
function swapIce(el: HTMLElement): void {
  void prepareIce().then((url) => {
    el.querySelectorAll<HTMLElement>('.ice').forEach((ice) => ice.style.setProperty('--ice', `url('${url}')`));
  });
}
