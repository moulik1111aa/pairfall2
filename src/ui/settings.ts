// Sound / music / vibration switches, shown in the pause sheet and on the home screen.

import type { App } from './app.ts';
import type { Settings } from '../storage/save.ts';

const ITEMS: { key: keyof Settings; label: string }[] = [
  { key: 'sound', label: 'Sound' },
  { key: 'music', label: 'Music' },
  { key: 'vibration', label: 'Vibration' },
];

export function settingsToggles(app: App): HTMLElement {
  const row = document.createElement('div');
  row.className = 'toggles';
  row.setAttribute('role', 'group');
  row.setAttribute('aria-label', 'Sound settings');
  for (const { key, label } of ITEMS) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'toggle';
    b.id = `toggle-${key}`;
    const paint = () => {
      const on = app.save.data.settings[key];
      b.setAttribute('aria-pressed', String(on));
      b.innerHTML = `<span class="dot" aria-hidden="true"></span>${label}`;
    };
    paint();
    b.addEventListener('click', () => {
      app.setSetting(key, !app.save.data.settings[key]);
      paint();
    });
    row.appendChild(b);
  }
  return row;
}
