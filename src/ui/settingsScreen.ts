// Settings: sound, vibration and accessibility, plus starting over.

import { App, html, type Screen } from './app.ts';
import { ICONS } from './icons.ts';
import { homeScreen } from './home.ts';
import { freshSave, type Settings } from '../storage/save.ts';
import { themeById } from '../themes/registry.ts';
import { HINDI_SETTING } from './i18n.ts';

const ROWS: { key: keyof Settings; label: string; note: string }[] = [
  { key: 'sound', label: 'Sound effects', note: 'Taps, matches and chimes.' },
  { key: 'music', label: 'Music', note: 'Soft background music in each theme.' },
  { key: 'vibration', label: 'Vibration', note: 'Short buzzes on taps and matches.' },
  { key: 'colorBlind', label: 'Tile numbers', note: 'Adds a number to each tile design, so pairs never depend on colour.' },
  { key: 'leftHanded', label: 'Left-handed', note: 'Mirrors the power-up bar.' },
  // Always shown in both languages, so it can be found either way.
  {
    key: 'hindi',
    label: `Hindi instructions <span class="hi-inline" lang="hi">हिंदी निर्देश</span>`,
    note: `${HINDI_SETTING.en}<span class="hi" lang="hi">${HINDI_SETTING.hi}</span>`,
  },
];

export function settingsScreen(app: App): Screen {
  const el = html(`<section class="screen subscreen" aria-label="Settings">
    <header class="hud">
      <button class="icon-btn back-btn" aria-label="Home">${ICONS.back}</button>
      <div class="hud-title">Settings</div>
      <span style="width:48px" aria-hidden="true"></span>
    </header>
    <div class="sub-scroll">
      <div class="setting-list"></div>
      <p class="sound-note" role="status" hidden></p>
      <div class="preview-tools" hidden>
        <h2>Preview tools</h2>
        <p>Only in the preview link, to try later features quickly. Not in the app.</p>
        <button class="btn small secondary jump-btn">Unlock levels up to 40 and add 500 coins</button>
      </div>
      <div class="danger-zone">
        <button class="btn small secondary reset-btn">Start over</button>
      </div>
    </div>
  </section>`);
  el.querySelector('.back-btn')!.addEventListener('click', () => app.show(homeScreen));
  const list = el.querySelector<HTMLElement>('.setting-list')!;
  const note = el.querySelector<HTMLElement>('.sound-note')!;

  const showSoundState = () => {
    const st = app.sound.state;
    note.hidden = !(st === 'blocked' || st === 'unsupported') || !app.save.data.settings.sound;
    note.textContent =
      st === 'unsupported'
        ? 'This browser cannot play sound.'
        : 'Sound is turned on, but this window has not been allowed to play it yet. Tap anywhere on the page once; sound always works in the Android app.';
  };

  for (const row of ROWS) {
    const id = `set-${row.key}`;
    const item = html(`<label class="setting" for="${id}">
      <span><b>${row.label}</b><small>${row.note}</small></span>
      <input type="checkbox" role="switch" id="${id}" ${app.save.data.settings[row.key] ? 'checked' : ''}>
    </label>`);
    const input = item.querySelector('input')!;
    input.addEventListener('change', () => {
      app.setSetting(row.key, input.checked);
      showSoundState();
    });
    list.appendChild(item);
  }
  setTimeout(showSoundState, 300);

  const build = (window as unknown as { __BUILD__?: { preview?: boolean } }).__BUILD__;
  if (build?.preview || app.debug) {
    el.querySelector<HTMLElement>('.preview-tools')!.hidden = false;
    el.querySelector('.jump-btn')!.addEventListener('click', () => {
      app.save.update((d) => {
        d.level = Math.max(d.level, 40);
        d.coins += 500;
      });
      app.toast('Levels up to 40 unlocked and 500 coins added. Pick any level on the Journey map.');
    });
  }

  const reset = el.querySelector<HTMLButtonElement>('.reset-btn')!;
  let armed = false;
  reset.addEventListener('click', () => {
    if (!armed) {
      armed = true;
      reset.textContent = 'Tap again to erase all progress';
      reset.classList.add('armed');
      setTimeout(() => {
        armed = false;
        reset.textContent = 'Start over';
        reset.classList.remove('armed');
      }, 4000);
      return;
    }
    const settings = app.save.data.settings;
    app.save.update((d) => Object.assign(d, freshSave(), { settings }));
    app.setTheme(themeById('zen-garden'));
    app.toast('Progress erased. You are back at level 1.');
    app.show(homeScreen);
  });
  return { el };
}
