// Versioned save data, written to a primary and a backup key (spec §9).
// The storage backend is an adapter: localStorage in the browser preview,
// Capacitor Preferences in the Android app (Milestone 3).

import { CONFIG, type PowerupId } from '../config.ts';
import { freshDaily, type DailyState } from '../core/daily.ts';

export const SAVE_VERSION = 1;
const PRIMARY = 'pairfall.save';
const BACKUP = 'pairfall.save.bak';

export interface Settings {
  sound: boolean;
  music: boolean;
  vibration: boolean;
  colorBlind: boolean;
  leftHanded: boolean;
  /** Show instructions in Hindi under the English. */
  hindi: boolean;
}

export interface SaveData {
  version: number;
  /** Highest Journey level unlocked (the next one to play). */
  level: number;
  coins: number;
  /** Best stars per Journey level number. */
  stars: Record<number, 1 | 2 | 3>;
  theme: string;
  powerups: Record<PowerupId, number>;
  settings: Settings;
  stats: { played: number; won: number; bestCombo: number; pairs: number };
  tutorialDone: boolean;
  daily: DailyState;
  /** Special tiles whose introduction card has been shown. */
  seenIntro: string[];
}

export interface StorageAdapter {
  get(key: string): string | null;
  set(key: string, value: string): void;
}

export function freshSave(): SaveData {
  const free = CONFIG.start.freeEachPowerup;
  return {
    version: SAVE_VERSION,
    level: 1,
    coins: CONFIG.start.coins,
    stars: {},
    theme: 'zen-garden',
    powerups: { undo: free, hint: free, shuffle: free, xray: free, extraSlot: free },
    settings: { sound: true, music: true, vibration: true, colorBlind: false, leftHanded: false, hindi: true },
    stats: { played: 0, won: 0, bestCombo: 0, pairs: 0 },
    tutorialDone: false,
    daily: freshDaily(),
    seenIntro: [],
  };
}

function parse(raw: string | null): SaveData | null {
  if (!raw) return null;
  try {
    const d = JSON.parse(raw) as Partial<SaveData>;
    if (typeof d !== 'object' || d === null || typeof d.level !== 'number' || typeof d.coins !== 'number') return null;
    if (d.version !== SAVE_VERSION) return migrate(d);
    // fill in any fields added after the save was written
    const base = freshSave();
    return {
      ...base,
      ...d,
      settings: { ...base.settings, ...d.settings },
      stats: { ...base.stats, ...d.stats },
      powerups: { ...base.powerups, ...d.powerups },
      daily: { ...base.daily, ...d.daily },
    } as SaveData;
  } catch {
    return null;
  }
}

/** Future save versions upgrade here. */
function migrate(d: Partial<SaveData>): SaveData | null {
  if (typeof d.version !== 'number' || d.version > SAVE_VERSION) return null;
  return { ...freshSave(), ...d, version: SAVE_VERSION } as SaveData;
}

export interface LoadResult {
  data: SaveData;
  /** 'primary' normally; 'backup' if the primary was damaged; 'reset' if both were. */
  source: 'primary' | 'backup' | 'new' | 'reset';
}

export class SaveStore {
  private readonly store: StorageAdapter;
  data: SaveData;
  readonly loadedFrom: LoadResult['source'];

  constructor(store: StorageAdapter) {
    this.store = store;
    const r = SaveStore.load(store);
    this.data = r.data;
    this.loadedFrom = r.source;
  }

  static load(store: StorageAdapter): LoadResult {
    const primaryRaw = store.get(PRIMARY);
    const backupRaw = store.get(BACKUP);
    const primary = parse(primaryRaw);
    if (primary) return { data: primary, source: 'primary' };
    const backup = parse(backupRaw);
    if (backup) return { data: backup, source: 'backup' };
    if (primaryRaw === null && backupRaw === null) return { data: freshSave(), source: 'new' };
    return { data: freshSave(), source: 'reset' };
  }

  save(): void {
    const json = JSON.stringify(this.data);
    // Backup first: if we're interrupted mid-write the previous primary still loads.
    const prev = this.store.get(PRIMARY);
    if (prev && parse(prev)) this.store.set(BACKUP, prev);
    this.store.set(PRIMARY, json);
    if (!prev) this.store.set(BACKUP, json);
  }

  update(fn: (d: SaveData) => void): void {
    fn(this.data);
    this.save();
  }
}

/** localStorage adapter that never throws (private mode, blocked storage, previews). */
export function browserStorage(): StorageAdapter {
  const mem = new Map<string, string>();
  return {
    get(key) {
      try {
        return localStorage.getItem(key) ?? mem.get(key) ?? null;
      } catch {
        return mem.get(key) ?? null;
      }
    },
    set(key, value) {
      mem.set(key, value);
      try {
        localStorage.setItem(key, value);
      } catch {
        /* in-memory only */
      }
    },
  };
}
