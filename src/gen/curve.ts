// Difficulty curve (spec §5.4): settings for each Journey level number.

import { CONFIG } from '../config.ts';
import type { GenSettings } from './generator.ts';
import type { ShapeName } from './shapes.ts';

export type Band = 'easy' | 'normal' | 'hard';

export interface LevelSettings extends GenSettings {
  readonly band: Band;
  readonly tutorial: boolean;
}

/** Accepted bot win-rate range per band (spec §5.3). */
export const BANDS: Record<Band, { target: number; min: number; max: number }> = {
  easy: { target: 0.9, min: 0.8, max: 1 },
  normal: { target: 0.6, min: 0.45, max: 0.75 },
  hard: { target: 0.3, min: 0.15, max: 0.45 },
};

const NORMAL_SHAPES: ShapeName[] = ['diamond', 'rect', 'pyramid', 'blob', 'diamond', 'blob'];
const BOSS_SHAPES: ShapeName[] = ['heart', 'ring', 'blob', 'pyramid'];

/**
 * Levels 1–9 are the on-ramp (tray of 5, Easy); level 10 is its Normal "boss".
 * From level 11: every 5th is an Easy breather, every 10th a Hard boss, the rest Normal.
 */
export function bandFor(level: number): Band {
  if (level < 10) return 'easy';
  if (level === 10) return 'normal';
  if (level % 10 === 0) return 'hard';
  if (level % 5 === 0) return 'easy';
  return 'normal';
}

export function limitFor(level: number): number {
  return level <= CONFIG.trayLimit.earlyUntilLevel ? CONFIG.trayLimit.early : CONFIG.trayLimit.normal;
}

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

export function settingsFor(level: number): LevelSettings {
  if (!Number.isInteger(level) || level < 1) throw new Error(`bad level ${level}`);
  const band = bandFor(level);
  const limit = limitFor(level);
  const ramp = 24 + Math.round(1.6 * (level - 1)); // 24 → 120 by level 61
  const base = {
    tiles: clamp(ramp, 24, 100),
    layers: clamp(2 + Math.floor(level / 10), 2, 6),
    kinds: clamp(8 + Math.floor(level / 4), 8, 18),
    targetPeak: Math.min(limit - 1, level <= 10 ? 2 : 2 + (level >= 30 ? 1 : 0)),
    buried: clamp(0.1 + level * 0.01, 0.1, 0.6),
  };
  if (band === 'easy') {
    return {
      band,
      tutorial: level <= 3,
      limit,
      tiles: level <= 3 ? 24 : level < 10 ? base.tiles : clamp(Math.round(base.tiles * 0.6), 24, 56),
      layers: level <= 3 ? 2 : clamp(base.layers - 1, 2, 4),
      kinds: clamp(base.kinds - 3, 6, 18),
      targetPeak: Math.min(limit - 1, 2),
      buried: level <= 3 ? 0 : base.buried / 2,
      shape: level <= 3 ? 'rect' : 'diamond',
    };
  }
  if (band === 'hard') {
    return {
      band,
      tutorial: false,
      limit,
      tiles: clamp(Math.round(ramp * 1.15), 36, 120),
      layers: clamp(base.layers + 1, 3, 6),
      kinds: clamp(base.kinds + 2, 8, 18),
      targetPeak: limit - 1,
      buried: clamp(base.buried + 0.15, 0.2, 0.7),
      shape: BOSS_SHAPES[Math.floor(level / 10) % BOSS_SHAPES.length],
    };
  }
  return { band, tutorial: false, limit, ...base, shape: NORMAL_SHAPES[level % NORMAL_SHAPES.length] };
}
