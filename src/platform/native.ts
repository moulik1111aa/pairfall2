// Bridge to the Android shell (Capacitor + the app's own `Pairfall` plugin in
// native/android/PairfallPlugin.java). Everything here is optional: in a browser
// `nativeBridge()` returns null and the web fallbacks are used instead.
//
// No Capacitor JavaScript is bundled. Inside the Android app Capacitor injects
// `window.Capacitor.Plugins.<Name>` objects whose methods return promises, which
// is all this module needs.

import type { StorageAdapter } from '../storage/save.ts';
import { browserStorage } from '../storage/save.ts';

export type HapticKind = 'tap' | 'match' | 'combo' | 'heartbeat' | 'win' | 'lose';

export interface PairfallPlugin {
  haptic(o: { kind: HapticKind }): Promise<void>;
  keepAwake(o: { on: boolean }): Promise<void>;
  exit(): Promise<void>;
  readSave(): Promise<{ values?: Record<string, string> }>;
  writeSave(o: { key: string; value: string }): Promise<void>;
  addListener(event: 'back', cb: () => void): unknown;
}

interface SystemBarsPlugin {
  setStyle(o: { style: 'DARK' | 'LIGHT' | 'DEFAULT' }): Promise<void>;
}

interface CapacitorGlobal {
  isNativePlatform?(): boolean;
  Plugins?: { Pairfall?: PairfallPlugin; SystemBars?: SystemBarsPlugin };
}

function capacitor(): CapacitorGlobal | null {
  const cap = (globalThis as { Capacitor?: CapacitorGlobal }).Capacitor;
  try {
    return cap?.isNativePlatform?.() ? cap : null;
  } catch {
    return null;
  }
}

/** The app's native plugin, or null in a browser. */
export function nativeBridge(): PairfallPlugin | null {
  return capacitor()?.Plugins?.Pairfall ?? null;
}

/** Light or dark status-bar icons, for when the bars are swiped into view. */
export function setSystemBarStyle(darkBackground: boolean): void {
  capacitor()
    ?.Plugins?.SystemBars?.setStyle({ style: darkBackground ? 'DARK' : 'LIGHT' })
    .catch(() => {});
}

/** Fire-and-forget: a dropped bridge call must never break the game. */
export function quietly(p: Promise<unknown> | undefined): void {
  p?.catch(() => {});
}

function timeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return Promise.race([p, new Promise<T>((_, reject) => setTimeout(() => reject(new Error('timeout')), ms))]);
}

/**
 * Save storage for the Android app: the WebView's localStorage stays the main copy,
 * and every write is mirrored into the app's own SharedPreferences. If the WebView's
 * storage is ever wiped, the mirror restores it before the game reads its save.
 */
export async function nativeStorage(plugin: PairfallPlugin, web: StorageAdapter = browserStorage()): Promise<StorageAdapter> {
  try {
    const { values = {} } = await timeout(plugin.readSave(), 1500);
    for (const [key, value] of Object.entries(values)) {
      if (typeof value === 'string' && web.get(key) === null) web.set(key, value);
    }
  } catch {
    /* mirror unavailable: carry on with web storage alone */
  }
  return {
    get: (key) => web.get(key),
    set(key, value) {
      web.set(key, value);
      quietly(plugin.writeSave({ key, value }));
    },
  };
}
