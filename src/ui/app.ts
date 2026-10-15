// App shell: shared state (save, theme, sound) and screen switching.

import { SaveStore, browserStorage, type Settings, type StorageAdapter } from '../storage/save.ts';
import { themeById } from '../themes/registry.ts';
import { backdropUrl, warmTiles } from '../themes/prerender.ts';
import type { Theme } from '../themes/types.ts';
import { Sound } from '../audio/sound.ts';
import { Haptics } from '../platform/haptics.ts';
import { quietly, setSystemBarStyle, type PairfallPlugin } from '../platform/native.ts';
import type { Feedback } from '../render/feedback.ts';
import { reducedMotion } from '../render/tweens.ts';
import { bi, TEXT, type Bi } from './i18n.ts';

export interface Screen {
  el: HTMLElement;
  destroy?(): void;
  /** Called when the app goes to the background. */
  pause?(): void;
  /** Called once the screen is in the document (start entrance animations here). */
  mounted?(): void;
  /** Android back button. Return true if the screen handled it. */
  back?(): boolean;
  /** Keep the phone's screen on while this screen is showing (Android app only). */
  keepAwake?: boolean;
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
  /** The Android app's native plugin; null in a browser. */
  readonly native: PairfallPlugin | null;
  private current: Screen | null = null;
  /** Until when a second back press on Home leaves the app (while the hint is showing). */
  private exitUntil = -Infinity;

  constructor(root: HTMLElement, storage: StorageAdapter = browserStorage(), native: PairfallPlugin | null = null) {
    this.root = root;
    this.native = native;
    this.save = new SaveStore(storage);
    this.theme = themeById(this.save.data.theme);
    this.debug = new URLSearchParams(location.search).has('debug');
    const st = this.save.data.settings;
    this.sound = new Sound(st.sound, st.music);
    this.sound.setTheme(this.theme.sound);
    this.haptics = new Haptics(st.vibration, native);
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
    if (native) {
      try {
        native.addListener('back', () => this.back());
      } catch {
        /* older shell without the back event */
      }
    }
    if (this.save.loadedFrom === 'backup') this.toast(TEXT.restoredFromBackup);
    if (this.save.loadedFrom === 'reset') this.toast(TEXT.saveUnreadable);
  }

  applyTheme(): void {
    const s = document.documentElement.style;
    for (const [k, v] of Object.entries(this.theme.vars)) s.setProperty(k, v);
    s.setProperty('--backdrop', backdropUrl(this.theme));
    const bg = this.theme.vars['--theme-color'] ?? this.theme.vars['--bg'];
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', bg);
    if (this.native) setSystemBarStyle(isDark(bg));
    void warmTiles(this.theme);
  }

  /** Switch theme: saved, applied to the page, and used by sound from now on. */
  setTheme(theme: Theme): void {
    this.theme = theme;
    this.save.update((d) => (d.theme = theme.id));
    this.sound.setTheme(theme.sound);
    this.applyTheme();
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
    if (this.native) quietly(this.native.keepAwake({ on: !!this.current.keepAwake }));
  }

  /**
   * Android back button: close the open sheet, else let the screen decide, else use
   * the screen's back arrow; on the home screen a second press within 2 s leaves.
   */
  back(): void {
    const sheets = this.root.querySelectorAll<HTMLElement>('.overlay');
    const top = sheets[sheets.length - 1];
    if (top) {
      top.querySelector<HTMLButtonElement>('[data-back]')?.click();
      return;
    }
    if (this.current?.back?.()) return;
    const arrow = this.current?.el.querySelector<HTMLButtonElement>('.back-btn');
    if (arrow) {
      arrow.click();
      return;
    }
    const now = performance.now();
    if (now < this.exitUntil) {
      this.exitUntil = -Infinity;
      this.save.save();
      if (this.native) quietly(this.native.exit());
      return;
    }
    // A generous window, matching how long the hint stays up, so a slower second press still counts.
    this.exitUntil = now + this.toast(TEXT.pressBackAgain, 2600);
  }

  /** Show instructions in Hindi as well as English? */
  get hindi(): boolean {
    return this.save.data.settings.hindi;
  }

  /** Markup for an instruction in English, with Hindi when that setting is on. */
  t(text: Bi): string {
    return bi(text, this.hindi);
  }

  /** A short message at the bottom. Instructions (Bi) get Hindi too, and a little longer on screen. */
  toast(text: string | Bi, ms = 3200): number {
    const t = document.createElement('div');
    t.className = 'toast';
    t.setAttribute('role', 'status');
    if (typeof text === 'string') t.textContent = text;
    else {
      t.innerHTML = this.t(text);
      if (this.hindi) ms = Math.round(ms * 1.5);
    }
    this.root.appendChild(t);
    setTimeout(() => t.remove(), ms);
    return ms;
  }
}

/** True for a dark colour (#rrggbb), so system-bar icons can be drawn light. */
export function isDark(hex: string): boolean {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return false;
  const n = parseInt(m[1], 16);
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  return 0.2126 * r + 0.7152 * g + 0.0722 * b < 128;
}

/** Tiny DOM helper: build an element from an HTML string. */
export function html(markup: string): HTMLElement {
  const t = document.createElement('template');
  t.innerHTML = markup.trim();
  return t.content.firstElementChild as HTMLElement;
}
