// Bottom-sheet overlays used by the game screen (pause, win, lose).

import { html } from './app.ts';
import { reducedMotion } from '../render/tweens.ts';

export interface SheetAction {
  label: string;
  kind?: 'primary' | 'secondary';
  /** The action the Android back button takes while this sheet is open. */
  back?: boolean;
  run(): void;
}

export function openSheet(parent: HTMLElement, body: string, actions: SheetAction[], label: string): HTMLElement {
  const ov = html(`<div class="overlay" role="dialog" aria-modal="true" aria-label="${label}"><div class="sheet">${body}<div class="actions"></div></div></div>`);
  const list = ov.querySelector('.actions')!;
  for (const a of actions) {
    const b = document.createElement('button');
    b.className = `btn ${a.kind === 'secondary' ? 'secondary' : ''}`;
    b.textContent = a.label;
    if (a.back) b.dataset.back = '';
    b.addEventListener('click', () => a.run(), { once: true });
    list.appendChild(b);
  }
  parent.appendChild(ov);
  if (!reducedMotion()) {
    ov.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 200, easing: 'ease-out' });
    ov.querySelector('.sheet')!.animate(
      [{ transform: 'translateY(60px)', opacity: 0 }, { transform: 'translateY(0)', opacity: 1 }],
      { duration: 320, easing: 'cubic-bezier(.2,.8,.2,1)' },
    );
  }
  return ov;
}
