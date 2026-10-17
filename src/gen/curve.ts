// Difficulty curve (spec §5.4): settings for each Journey level number.

import { CONFIG } from '../config.ts';
import type { GenSettings } from './generator.ts';
import type { SpecialQuota } from './specials.ts';
import type { ShapeName } from './shapes.ts';

export type Band = 'easy' | 'normal' | 'hard';

export interface WinRange {
  readonly min: number;
  readonly max: number;
}

export interface LevelSettings extends GenSettings {
  readonly band: Band;
  readonly tutorial: boolean;
  /** Accepted test-player win rate for this level; tightens in the late game. */
  readonly range: WinRange;
  /** Seconds allowed to clear the board (timed levels only). */
  readonly timeLimit?: number;
}

/** Accepted bot win-rate range per band up to level 60 (spec §5.3). */
export const BANDS: Record<Band, { target: number; min: number; max: number }> = {
  easy: { target: 0.9, min: 0.8, max: 1 },
  normal: { target: 0.6, min: 0.45, max: 0.75 },
  hard: { target: 0.3, min: 0.15, max: 0.45 },
};

/** Where every setting has finished ramping up. */
export const LATE_GAME = { from: 60, to: 400 } as const;

/** 0 up to level 60, rising steadily to 1 at level 400: how deep into the late game a level is. */
export function grind(level: number): number {
  return clamp((level - LATE_GAME.from) / (LATE_GAME.to - LATE_GAME.from), 0, 1);
}

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/**
 * Accepted win range for the test player. After level 60 the ranges slide down,
 * so the same band keeps getting harder the further the journey goes.
 */
export function rangeFor(band: Band, level: number): WinRange {
  const g = grind(level);
  switch (band) {
    case 'easy':
      return { min: lerp(0.8, 0.6, g), max: 1 };
    case 'normal':
      return { min: lerp(0.45, 0.15, g), max: lerp(0.75, 0.45, g) };
    case 'hard':
      return { min: lerp(0.15, 0.03, g), max: lerp(0.45, 0.2, g) };
  }
}

/** Levels with a clock (spec addendum 2026-10-17): bosses from 60, every non-breather from 150. */
export const TIMED = { bossFrom: 60, allFrom: 150 } as const;

/** Seconds allowed for a level, or undefined when it is untimed. */
export function timeLimitFor(level: number, band: Band, tiles: number): number | undefined {
  if (band === 'hard' && level >= TIMED.bossFrom) {
    // 3.2 s a tile at level 60, tightening to 2.0 s by level 400 (plus time to look first)
    return Math.round(15 + tiles * lerp(3.2, 2.0, grind(level)));
  }
  if (band === 'normal' && level >= TIMED.allFrom) {
    const t = clamp((level - TIMED.allFrom) / (LATE_GAME.to - TIMED.allFrom), 0, 1);
    return Math.round(15 + tiles * lerp(3.6, 2.4, t));
  }
  return undefined;
}

// No plain rectangles after the tutorial: under the edge rule a big rectangle
// boxes in almost every tile, which made those levels spike far above the rest.
const NORMAL_SHAPES: ShapeName[] = ['diamond', 'ring', 'pyramid', 'blob', 'diamond', 'blob'];
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

/** Level at which each special tile first appears (spec §4). */
export const INTRO = { mystery: 12, frozen: 20, locks: 28, wild: 35, bombs: 45 } as const;

/**
 * Special tiles for a level; breathers get half as many. Capped at 15% of tiles,
 * rising to 30% in the late game, with more of each kind and tougher ones.
 */
export function specialsFor(level: number, band: Band, tiles: number): SpecialQuota {
  const g = grind(level);
  const k = band === 'easy' ? 0.5 : 1;
  const cap = Math.floor(tiles * lerp(0.15, 0.3, g));
  const frozen = level >= INTRO.frozen ? Math.round(k * Math.min(lerp(6, 10, g), 1 + Math.floor((level - INTRO.frozen) / 8))) : 0;
  const locks = level >= INTRO.locks ? Math.max(1, Math.round(k * Math.min(lerp(2, 4, g), 1 + Math.floor((level - INTRO.locks) / 30)))) : 0;
  const wild = level >= INTRO.wild && (level === INTRO.wild || level % 3 === 0) ? 1 : 0;
  const mystery = level >= INTRO.mystery ? k * Math.min(lerp(0.15, 0.35, g), 0.05 + (level - INTRO.mystery) * 0.003) : 0;
  // Bombs: one from level 45 (boss levels two), up to three (four) late on; breathers get one from 100.
  let bombs = 0;
  if (level >= INTRO.bombs) {
    bombs = band === 'easy' ? (level >= 100 ? 1 : 0) : Math.round(1 + 1.5 * g) + (band === 'hard' ? 1 : 0);
    if (level === INTRO.bombs) bombs = 1;
  }
  const weight = frozen + locks * 3 + wild + bombs * 2;
  const counted = Math.min(cap, weight);
  const scale = weight > 0 ? counted / weight : 1;
  return {
    mystery,
    frozen: Math.floor(frozen * scale),
    thaw: level >= 200 ? 4 : level >= 60 ? 3 : 2,
    locks: Math.floor(locks * scale),
    wild,
    bombs: Math.max(bombs ? 1 : 0, Math.floor(bombs * scale)),
    // spare taps on each fuse: generous when bombs arrive, tight late on
    fuseSlack: Math.round(lerp(14, 4, g)),
  };
}

export function settingsFor(level: number): LevelSettings {
  if (!Number.isInteger(level) || level < 1) throw new Error(`bad level ${level}`);
  const band = bandFor(level);
  const limit = limitFor(level);
  const ramp = 24 + Math.round(1.6 * (level - 1)); // 24 → 120 by level 61
  const g = grind(level);
  const range = rangeFor(band, level);
  const base = {
    tiles: clamp(ramp, 24, 100),
    layers: clamp(2 + Math.floor(level / 10), 2, 6),
    // Fewer designs per board than before the edge rule: with fewer tiles in reach,
    // 18 designs left too few matches on view.
    kinds: clamp(8 + Math.floor(level / 4), 8, 13),
    targetPeak: Math.min(limit - 1, level <= 10 ? 2 : 2 + (level >= 30 ? 1 : 0)),
    // share of pairs whose twin starts out of reach: 60% by level 50, 72% late on
    buried: clamp(0.1 + level * 0.01, 0.1, 0.6) + 0.12 * g,
  };
  if (band === 'easy') {
    const tiles = level <= 3 ? 24 : level < 10 ? base.tiles : clamp(Math.round(base.tiles * 0.6), 24, 56);
    return {
      band,
      range,
      specials: specialsFor(level, band, tiles),
      tutorial: level <= 3,
      limit,
      tiles,
      layers: level <= 3 ? 2 : clamp(base.layers - 1, 2, 4),
      kinds: clamp(base.kinds - 3, 6, 18),
      targetPeak: Math.min(limit - 1, 2),
      buried: level <= 3 ? 0 : base.buried / 2,
      shape: level <= 3 ? 'rect' : 'diamond',
    };
  }
  if (band === 'hard') {
    const tiles = clamp(Math.round(ramp * 1.15), 36, 120);
    return {
      band,
      range,
      tutorial: false,
      limit,
      specials: specialsFor(level, band, tiles),
      timeLimit: timeLimitFor(level, band, tiles),
      tiles,
      layers: clamp(base.layers + 1, 3, 6),
      kinds: clamp(10 + Math.floor(level / 4), 8, 18),
      targetPeak: limit - 1,
      buried: clamp(base.buried + 0.15, 0.2, 0.7 + 0.2 * g),
      shape: BOSS_SHAPES[Math.floor(level / 10) % BOSS_SHAPES.length],
    };
  }
  return {
    band,
    range,
    tutorial: false,
    limit,
    ...base,
    specials: specialsFor(level, band, base.tiles),
    timeLimit: timeLimitFor(level, band, base.tiles),
    shape: NORMAL_SHAPES[level % NORMAL_SHAPES.length],
  };
}
