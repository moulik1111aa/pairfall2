// The test player (spec §5.3). Plays a level many times with sensible-but-imperfect
// moves; its win rate measures how forgiving the level is. It plays by the shared
// rules core, so special tiles behave exactly as they do in the game.

import { Rules, TapResult, WILD, type LevelData } from '../core/rules.ts';
import { buildGeometry } from '../core/board.ts';
import { createRng, type Rng } from '../core/rng.ts';

export const BOT_GREEDY = 0.9;

/** One playthrough from a template. Returns true on a win. */
function playOnce(template: Rules, rng: Rng, greedy: number): boolean {
  const r = template.clone();
  const kinds = r.kinds;
  const uncovered = r.board.freeSlots(); // includes frozen/locked tiles; filtered per move
  const options: number[] = [];
  const sensible: number[] = [];
  const seen = new Map<number, number>();
  while (!r.won) {
    options.length = 0;
    for (let i = 0; i < uncovered.length; i++) if (r.canTap(uncovered[i])) options.push(i);
    if (!options.length) return false; // stuck: everything left is frozen or locked
    let pick = -1;
    if (rng.chance(greedy)) {
      // Sensible move: complete a pair with the tray, else start a pair that is fully visible.
      sensible.length = 0;
      const trayHasWild = r.tray.some((s) => kinds[s] === WILD);
      for (const i of options) {
        const kd = kinds[uncovered[i]];
        if (r.tray.length && (trayHasWild || kd === WILD || r.tray.some((s) => kinds[s] === kd))) sensible.push(i);
      }
      if (!sensible.length) {
        seen.clear();
        for (const i of options) {
          const kd = kinds[uncovered[i]];
          const prev = seen.get(kd);
          if (prev !== undefined) sensible.push(prev, i);
          else seen.set(kd, i);
        }
      }
      if (sensible.length) pick = sensible[rng.int(0, sensible.length - 1)];
    }
    if (pick < 0) pick = options[rng.int(0, options.length - 1)];
    const slot = uncovered[pick];
    uncovered[pick] = uncovered[uncovered.length - 1];
    uncovered.pop();
    const res = r.tap(slot);
    if (res === TapResult.Ignored) return false;
    for (const f of r.lastFreed) uncovered.push(f);
    if (r.lost) return false;
  }
  return true;
}

export function winRate(level: LevelData, plays = 300, seed = 1, greedy = BOT_GREEDY): number {
  const template = new Rules(level, buildGeometry(level.slots));
  const rng = createRng(seed);
  let wins = 0;
  for (let i = 0; i < plays; i++) if (playOnce(template, rng, greedy)) wins++;
  return wins / plays;
}
