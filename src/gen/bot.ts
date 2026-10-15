// The test player (spec §5.3). Plays a level many times with sensible-but-imperfect
// moves; its win rate measures how forgiving the level is.

import { Board, buildGeometry } from '../core/board.ts';
import type { LevelData } from '../core/game.ts';
import { createRng, type Rng } from '../core/rng.ts';

export const BOT_GREEDY = 0.9;

/** One playthrough. Returns true on a win. Uses a pre-built board it clones. */
function playOnce(template: Board, kinds: readonly number[], limit: number, rng: Rng, greedy: number): boolean {
  const board = template.clone();
  const free = board.freeSlots();
  const tray = new Set<number>();
  const matching: number[] = [];
  const seen = new Map<number, number>();
  while (board.remaining > 0) {
    let idx: number;
    if (rng.chance(greedy)) {
      // Sensible move: complete a pair with the tray, else start a pair that is fully visible.
      matching.length = 0;
      for (let i = 0; i < free.length; i++) if (tray.has(kinds[free[i]])) matching.push(i);
      if (!matching.length) {
        seen.clear();
        for (let i = 0; i < free.length; i++) {
          const kd = kinds[free[i]];
          const prev = seen.get(kd);
          if (prev !== undefined) matching.push(prev, i);
          else seen.set(kd, i);
        }
      }
      idx = matching.length ? matching[rng.int(0, matching.length - 1)] : rng.int(0, free.length - 1);
    } else {
      idx = rng.int(0, free.length - 1);
    }
    const id = free[idx];
    free[idx] = free[free.length - 1];
    free.pop();
    for (const f of board.remove(id)) free.push(f);
    const kd = kinds[id];
    if (tray.has(kd)) tray.delete(kd);
    else {
      tray.add(kd);
      if (tray.size >= limit) return false;
    }
  }
  return true;
}

export function winRate(level: LevelData, plays = 300, seed = 1, greedy = BOT_GREEDY): number {
  const template = new Board(buildGeometry(level.slots));
  const rng = createRng(seed);
  let wins = 0;
  for (let i = 0; i < plays; i++) if (playOnce(template, level.kinds, level.limit, rng, greedy)) wins++;
  return wins / plays;
}
