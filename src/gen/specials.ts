// Places special tiles on a generated level without breaking its built-in
// solution (spec §5.2 step 4). The solution is replayed once to learn when each
// tile is uncovered, taken and cleared; specials are only put where that winning
// order still works. A final replay under the full rules double-checks it.

import { Rules, TapResult, WILD, type Specials, type LevelData } from '../core/rules.ts';
import { buildGeometry, type Slot } from '../core/board.ts';
import type { Rng } from '../core/rng.ts';

export interface SpecialQuota {
  /** Share of tiles (0–1) that start face-down. */
  readonly mystery: number;
  /** How many frozen tiles, and how many clears each needs to thaw. */
  readonly frozen: number;
  readonly thaw: number;
  /** How many padlocked tiles. */
  readonly locks: number;
  /** How many wild tiles. */
  readonly wild: number;
  /** How many bomb tiles, and how many spare taps each fuse allows beyond the built-in solution. */
  readonly bombs?: number;
  readonly fuseSlack?: number;
}

export const NO_SPECIALS: SpecialQuota = { mystery: 0, frozen: 0, thaw: 2, locks: 0, wild: 0, bombs: 0, fuseSlack: 0 };

interface Trace {
  takeStep: Int32Array;
  clearStep: Int32Array;
  /** Clears that happened while the tile was uncovered, before it was taken. */
  thawAtTake: Int32Array;
  freeAtStart: Uint8Array;
  /** Pairs in the order they cleared: [opener, closer, step]. */
  pairs: [number, number, number][];
  /** Steps where the closer cleared the oldest tile in the tray. */
  oldestCloses: Set<number>;
}

function trace(level: LevelData, solution: readonly number[]): Trace {
  const r = new Rules(level);
  const n = level.slots.length;
  const t: Trace = {
    takeStep: new Int32Array(n).fill(-1),
    clearStep: new Int32Array(n).fill(-1),
    thawAtTake: new Int32Array(n),
    freeAtStart: new Uint8Array(n),
    pairs: [],
    oldestCloses: new Set(),
  };
  for (const s of r.board.freeSlots()) t.freeAtStart[s] = 1;
  const wouldThaw = new Int32Array(n);
  solution.forEach((slot, step) => {
    t.takeStep[slot] = step;
    t.thawAtTake[slot] = wouldThaw[slot];
    const res = r.tap(slot);
    if (res === TapResult.Ignored) throw new Error(`solution step ${step} is not playable`);
    if (res === TapResult.Cleared) {
      t.clearStep[slot] = step;
      t.clearStep[r.lastPartner] = step;
      t.pairs.push([r.lastPartner, slot, step]);
      if (r.lastPartnerIndex === 0) t.oldestCloses.add(step);
      // Same order as the rules: the tap uncovers tiles first, then the clear thaws.
      for (let s = 0; s < n; s++) if (r.board.isFree(s)) wouldThaw[s]++;
    }
  });
  return t;
}

/** Does replaying the solution under the full rules win? */
export function solutionWins(level: LevelData, solution: readonly number[]): boolean {
  const r = new Rules(level);
  for (const slot of solution) {
    if (r.tap(slot) === TapResult.Ignored || r.lost) return false;
  }
  return r.won;
}

export function placeSpecials(
  slots: readonly Slot[],
  kinds: readonly number[],
  limit: number,
  solution: readonly number[],
  quota: SpecialQuota,
  rng: Rng,
): { kinds: number[]; specials: Specials } {
  const base: LevelData = { slots, kinds, limit };
  const bombQuota = quota.bombs ?? 0;
  if (!quota.mystery && !quota.frozen && !quota.locks && !quota.wild && !bombQuota) return { kinds: [...kinds], specials: {} };
  const n = slots.length;
  const tr = trace({ ...base, slots }, solution);
  const used = new Uint8Array(n);

  // Mystery: tiles that start covered.
  const covered = rng.shuffle(slots.map((s) => s.id).filter((s) => !tr.freeAtStart[s]));
  const mystery = covered.slice(0, Math.round(quota.mystery * n)).sort((a, b) => a - b);

  // Frozen: tiles that sit uncovered through enough clears before the solution takes them.
  const frozen: Record<number, number> = {};
  const canFreeze = rng.shuffle(slots.map((s) => s.id).filter((s) => tr.thawAtTake[s] >= quota.thaw));
  for (const s of canFreeze.slice(0, quota.frozen)) {
    frozen[s] = quota.thaw;
    used[s] = 1;
  }

  // Locks: a pair that clears early unlocks a tile the solution takes later.
  const locks: { slot: number; keys: [number, number] }[] = [];
  const early = rng.shuffle(tr.pairs.filter(([a, b, step]) => step < n * 0.55 && !used[a] && !used[b]));
  for (const [a, b, step] of early) {
    if (locks.length >= quota.locks) break;
    if (used[a] || used[b]) continue;
    const targets = slots
      .map((s) => s.id)
      .filter((s) => !used[s] && s !== a && s !== b && tr.takeStep[s] > step + 2);
    if (!targets.length) continue;
    // prefer a lock the player can see early, so it is a visible goal
    targets.sort((x, y) => tr.freeAtStart[y] - tr.freeAtStart[x] || tr.takeStep[x] - tr.takeStep[y]);
    const slot = targets[Math.min(targets.length - 1, rng.int(0, 2))];
    locks.push({ slot, keys: [a, b] });
    used[a] = used[b] = used[slot] = 1;
  }

  // Wild: a closer that clears the oldest tile in the tray can be any tile at all.
  const next = [...kinds];
  const wildSteps = rng.shuffle(tr.pairs.filter(([a, b, step]) => tr.oldestCloses.has(step) && !used[a] && !used[b]));
  let wilds = 0;
  for (const [, closer] of wildSteps) {
    if (wilds >= quota.wild) break;
    next[closer] = WILD;
    used[closer] = 1;
    wilds++;
  }

  // Bombs: a pair the solution clears in its first half. The fuse allows the taps
  // the solution needs to clear it, plus a little slack — so the player must go
  // after that pair early instead of leaving it for last.
  const bombs: Record<number, number> = {};
  const isMystery = new Set(mystery);
  const bombPairs = rng.shuffle(
    tr.pairs.filter(([a, b, step]) => step >= 3 && step < n * 0.5 && !used[a] && !used[b] && !isMystery.has(a) && !isMystery.has(b)),
  );
  let placedBombs = 0;
  for (const [a, b, step] of bombPairs) {
    if (placedBombs >= bombQuota) break;
    if (used[a] || used[b]) continue;
    // the bomb goes on whichever tile of the pair the player can see first
    const slot = tr.freeAtStart[a] || !tr.freeAtStart[b] ? a : b;
    bombs[slot] = step + 1 + (quota.fuseSlack ?? 0);
    used[a] = used[b] = 1;
    placedBombs++;
  }

  // Verify under the full rules; drop the riskiest specials if anything slipped through.
  const attempts: { kinds: number[]; specials: Specials }[] = [
    { kinds: next, specials: { mystery, frozen, locks, bombs } },
    { kinds: [...kinds], specials: { mystery, frozen, locks, bombs } },
    { kinds: [...kinds], specials: { mystery, frozen, bombs } },
    { kinds: [...kinds], specials: { mystery, bombs } },
    { kinds: [...kinds], specials: { mystery } },
  ];
  for (const a of attempts) {
    if (solutionWins({ slots, kinds: a.kinds, limit, specials: a.specials }, solution)) return a;
  }
  return { kinds: [...kinds], specials: {} };
}

/** Geometry helper re-exported for callers that build many Rules for one shape. */
export { buildGeometry };
