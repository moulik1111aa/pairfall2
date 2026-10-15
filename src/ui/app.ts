// App shell: shared state (save, theme) and screen switching.

import { SaveStore, browserStorage } from '../storage/save.ts';
import { themeById } from '../themes/registry.ts';
import { backdropUrl, warmTiles } from '../themes/prerender.ts';
import type { Theme } from '../themes/types.ts';

export interface Screen {
  el: HTMLElement;
  destroy?(): void;
  /** Called when the app goes to the background. */
  pause?(): void;
  /** Called once the screen is in the document (start entrance animations here). */
  mounted?(): void;
}

export class App {
  readonly root: HTMLElement;
  readonly save: SaveStore;
  theme: Theme;
  readonly debug: boolean;
  private current: Screen | null = null;

  constructor(root: HTMLElement) {
    this.root = root;
    this.save = new SaveStore(browserStorage());
    this.theme = themeById(this.save.data.theme);
    this.debug = new URLSearchParams(location.search).has('debug');
    this.applyTheme();
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') {
        this.current?.pause?.();
        this.save.save();
      }
    });
    if (this.save.loadedFrom === 'backup') this.toast('Your progress was restored from a backup copy.');
    if (this.save.loadedFrom === 'reset') this.toast('Your saved progress could not be read, so a new game was started.');
  }

  applyTheme(): void {
    const s = document.documentElement.style;
    for (const [k, v] of Object.entries(this.theme.vars)) s.setProperty(k, v);
    s.setProperty('--backdrop', backdropUrl(this.theme));
    void warmTiles(this.theme);
  }

  show(make: (app: App) => Screen): void {
    this.current?.destroy?.();
    this.current?.el.remove();
    this.current = make(this);
    this.root.appendChild(this.current.el);
    this.current.mounted?.();
  }

  toast(text: string, ms = 3200): void {
    const t = document.createElement('div');
    t.className = 'toast';
    t.setAttribute('role', 'status');
    t.textContent = text;
    this.root.appendChild(t);
    setTimeout(() => t.remove(), ms);
  }
}

/** Tiny DOM helper: build an element from an HTML string. */
export function html(markup: string): HTMLElement {
  const t = document.createElement('template');
  t.innerHTML = markup.trim();
  return t.content.firstElementChild as HTMLElement;
}
