// App shell: shared state (save, theme, sound) and screen switching.

import { SaveStore, browserStorage, type Settings } from '../storage/save.ts';
import { themeById } from '../themes/registry.ts';
import { backdropUrl, warmTiles } from '../themes/prerender.ts';
import type { Theme } from '../themes/types.ts';
import { Sound } from '../audio/sound.ts';
import { Haptics } from '../platform/haptics.ts';
import type { Feedback } from '../render/feedback.ts';
import { reducedMotion } from '../render/tweens.ts';

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
  readonly sound: Sound;
  readonly haptics: Haptics;
  /** Sound + vibration, in the shape the board expects. */
  readonly feedback: Feedback;
  private current: Screen | null = null;

  constructor(root: HTMLElement) {
    this.root = root;
    this.save = new SaveStore(browserStorage());
    this.theme = themeById(this.save.data.theme);
    this.debug = new URLSearchParams(location.search).has('debug');
    const st = this.save.data.settings;
    this.sound = new Sound(st.sound, st.music);
    this.haptics = new Haptics(st.vibration);
    const { sound, haptics } = this;
    this.feedback = {
      tap: () => {
        sound.tap();
        haptics.tap();
      },
      land: () => sound.land(),
      match: (c) => {
        sound.match(c);
        haptics.match(c);
      },
      deal: (n) => sound.deal(n),
      danger: (on) => {
        sound.danger(on);
        if (on) haptics.heartbeat();
      },
      win: () => {
        sound.win();
        haptics.win();
      },
      lose: () => {
        sound.lose();
        haptics.lose();
      },
    };
    this.applyTheme();

    // Browsers only start audio inside a user gesture; keep trying until it runs.
    const unlock = () => {
      sound.unlock();
      if (sound.ready) {
        for (const t of ['pointerdown', 'pointerup', 'keydown'] as const) document.removeEventListener(t, unlock, true);
      }
    };
    for (const t of ['pointerdown', 'pointerup', 'keydown'] as const) document.addEventListener(t, unlock, true);
    // A soft click for every button press.
    document.addEventListener('click', (e) => {
      if ((e.target as HTMLElement).closest('button')) sound.click();
    });

    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') {
        this.current?.pause?.();
        this.save.save();
        sound.suspend();
      } else {
        sound.resume();
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

  /** Change one setting, save it and apply it straight away. */
  setSetting(key: keyof Settings, on: boolean): void {
    this.save.update((d) => (d.settings[key] = on));
    if (key === 'sound') this.sound.setSound(on);
    if (key === 'music') this.sound.setMusic(on);
    if (key === 'vibration') this.haptics.enabled = on;
  }

  show(make: (app: App) => Screen): void {
    const old = this.current;
    old?.destroy?.();
    old?.el.remove();
    this.current = make(this);
    this.root.appendChild(this.current.el);
    if (!reducedMotion()) {
      this.current.el.animate(
        [
          { opacity: 0, transform: 'translateY(10px)' },
          { opacity: 1, transform: 'translateY(0)' },
        ],
        { duration: 260, easing: 'cubic-bezier(.2,.8,.2,1)' },
      );
    }
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
