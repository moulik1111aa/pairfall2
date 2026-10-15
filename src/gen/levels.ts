// Turns a level number (or any seed) into an accepted, playable level (spec §5.3).

import { hashString, subSeed } from '../core/rng.ts';
import { generate, type GeneratedLevel, type GenSettings } from './generator.ts';
import { winRate } from './bot.ts';
import { BANDS, settingsFor, type Band, type LevelSettings } from './curve.ts';

/** Bump when generation changes in a way that alters layouts. */
export const GENERATOR_VERSION = 2;
export const MAX_ATTEMPTS = 50;
export const BOT_PLAYS = 300;

export interface Level extends GeneratedLevel {
  readonly id: string;
  readonly settings: LevelSettings;
  readonly winRate: number;
  readonly attempts: number;
  readonly fallback: boolean;
}

/** Fallback settings: small, flat and forgiving — generation cannot fail on these. */
function fallbackSettings(band: Band, limit: number): GenSettings {
  const tiles = band === 'easy' ? 24 : band === 'normal' ? 36 : 48;
  return { tiles, layers: 2, kinds: 8, targetPeak: Math.min(2, limit - 1), limit, shape: 'rect', buried: 0 };
}

export interface MakeOptions {
  /** Force every attempt to throw (tests the fallback path). */
  readonly sabotage?: boolean;
}

export function makeLevelFrom(id: string, settings: LevelSettings, options: MakeOptions = {}): Level {
  const seed = subSeed(hashString(`${id}#v${GENERATOR_VERSION}`), 0);
  const band = BANDS[settings.band];
  let best: { level: GeneratedLevel; rate: number; attempt: number } | null = null;
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    let level: GeneratedLevel;
    try {
      if (options.sabotage) throw new Error('sabotaged');
      level = generate(settings, subSeed(seed, attempt + 1));
    } catch {
      continue;
    }
    const rate = winRate(level, BOT_PLAYS, subSeed(seed, 1000 + attempt));
    if (rate >= band.min && rate <= band.max) {
      return { ...level, id, settings, winRate: rate, attempts: attempt + 1, fallback: false };
    }
    const dist = (r: number) => (r < band.min ? band.min - r : r - band.max);
    if (!best || dist(rate) < dist(best.rate)) best = { level, rate, attempt };
  }
  if (best) return { ...best.level, id, settings, winRate: best.rate, attempts: MAX_ATTEMPTS, fallback: false };
  const level = generate(fallbackSettings(settings.band, settings.limit), subSeed(seed, 9999));
  return { ...level, id, settings, winRate: winRate(level, BOT_PLAYS, 7), attempts: MAX_ATTEMPTS, fallback: true };
}

export function makeJourneyLevel(n: number, options?: MakeOptions): Level {
  return makeLevelFrom(`journey:${n}`, settingsFor(n), options);
}

/** What is being played. */
export type PlayMode = { kind: 'journey'; n: number } | { kind: 'daily'; date: string } | { kind: 'zen'; seed: number };

/** Daily challenge settings: Normal difficulty with the level 25 mix (spec §6). */
export function dailySettings(): LevelSettings {
  return { ...settingsFor(25), band: 'normal', tutorial: false };
}

/**
 * Zen settings: the level 20 mix, generated against a roomy tray of 7. The game
 * itself runs with no tray limit at all.
 */
export function zenSettings(): LevelSettings {
  return { ...settingsFor(20), band: 'easy', tutorial: false, limit: 7, targetPeak: 3 };
}

export function makeLevel(mode: PlayMode): Level {
  switch (mode.kind) {
    case 'journey':
      return makeJourneyLevel(mode.n);
    case 'daily':
      return makeLevelFrom(`daily:${mode.date}`, dailySettings());
    case 'zen':
      return makeLevelFrom(`zen:${mode.seed}`, zenSettings());
  }
}

export const modeKey = (m: PlayMode): string =>
  m.kind === 'journey' ? `j:${m.n}` : m.kind === 'daily' ? `d:${m.date}` : `z:${m.seed}`;
