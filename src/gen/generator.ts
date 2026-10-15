// Builds a level that is solvable by construction (spec §5.2).
//
// 1. Lay out a symmetric layered shape.
// 2. Record a valid order for removing every tile (always taking a free tile).
// 3. Walk that order assigning tile kinds so a simulated tray never exceeds the
//    target peak. Replaying the order is therefore a guaranteed win.

import { Board, buildGeometry } from '../core/board.ts';
import type { LevelData } from '../core/game.ts';
import { createRng } from '../core/rng.ts';
import { makeShape, type ShapeName } from './shapes.ts';

/** Number of distinct tile designs each theme provides. */
export const THEME_KINDS = 18;
/** A kind may appear at most this many pairs per level (2–8 tiles). */
export const MAX_PAIRS_PER_KIND = 4;

export interface GenSettings {
  readonly tiles: number;
  readonly layers: number;
  readonly kinds: number;
  /** Most unmatched tiles the built-in solution ever holds; always < limit. */
  readonly targetPeak: number;
  readonly limit: number;
  readonly shape: ShapeName;
  /**
   * 0–1: share of pairs that are "buried" — the second tile only becomes reachable
   * after other tiles are cleared. The rest are visible pairs (both tiles free at once).
   */
  readonly buried: number;
}

export interface GeneratedLevel extends LevelData {
  readonly seed: number;
  /** Tap order (slot ids) that wins the level. */
  readonly solution: readonly number[];
  /** Highest tray fill reached by the solution. */
  readonly peak: number;
}

export function generate(settings: GenSettings, seed: number): GeneratedLevel {
  if (settings.targetPeak < 1 || settings.targetPeak >= settings.limit) {
    throw new Error(`targetPeak ${settings.targetPeak} must be in [1, limit)`);
  }
  const rng = createRng(seed);
  const slots = makeShape(settings.shape, settings.tiles, settings.layers, rng);
  const n = slots.length;
  const pairs = n / 2;

  // Pair instances: each chosen design gets 1..MAX_PAIRS_PER_KIND pairs.
  const k = Math.min(THEME_KINDS, pairs, Math.max(settings.kinds, Math.ceil(pairs / MAX_PAIRS_PER_KIND)));
  const designs = rng.shuffle(Array.from({ length: THEME_KINDS }, (_, i) => i)).slice(0, k);
  const pool: number[] = [];
  for (let i = 0; i < pairs; i++) pool.push(designs[i % k]);
  rng.shuffle(pool);

  // Walk the board, taking free tiles and assigning kinds as we go. The tap
  // sequence we record is a guaranteed win (simulated tray never > targetPeak).
  const board = new Board(buildGeometry(slots));
  const free = board.freeSlots();
  const freeSince = new Int32Array(n); // step at which each tile became free
  const kinds = new Array<number>(n).fill(-1);
  const order: number[] = [];
  const open: { kind: number; at: number }[] = [];
  let peak = 0;

  const take = (idx: number, kind: number): void => {
    const id = free[idx];
    free[idx] = free[free.length - 1];
    free.pop();
    takeTile(id, kind);
  };
  const takeTile = (id: number, kind: number): void => {
    kinds[id] = kind;
    order.push(id);
    for (const f of board.remove(id)) {
      freeSince[f] = order.length;
      free.push(f);
    }
  };
  const nextOpenable = (): number => {
    const openKinds = new Set(open.map((o) => o.kind));
    return pool.findIndex((kd) => !openKinds.has(kd));
  };

  while (order.length < n) {
    const openable = pool.length ? nextOpenable() : -1;
    const roomToOpen = open.length + 1 <= settings.targetPeak;
    const canVisible = openable >= 0 && roomToOpen && free.length >= 2;
    const canBuried = openable >= 0 && roomToOpen && n - order.length >= open.length + 2;
    const mustClose = !canVisible && !canBuried;
    const preferClose = open.length > 0 && rng.chance(0.5);

    if (open.length > 0 && (mustClose || preferClose)) {
      // Close an open pair, preferring a tile that was NOT reachable when it opened.
      const j = rng.int(0, open.length - 1);
      const opened = open[j];
      const buriedIdx: number[] = [];
      for (let i = 0; i < free.length; i++) if (freeSince[free[i]] > opened.at) buriedIdx.push(i);
      const idx = buriedIdx.length ? rng.pick(buriedIdx) : rng.int(0, free.length - 1);
      take(idx, opened.kind);
      open.splice(j, 1);
      continue;
    }
    if (mustClose) throw new Error('generator stuck: nothing to open or close');
    const kind = pool.splice(openable, 1)[0];
    if (canBuried && (!canVisible || rng.chance(settings.buried))) {
      take(rng.int(0, free.length - 1), kind);
      open.push({ kind, at: order.length });
      peak = Math.max(peak, open.length);
    } else {
      // Visible pair: two tiles that are both free right now.
      const i = rng.int(0, free.length - 1);
      let j = rng.int(0, free.length - 2);
      if (j >= i) j++;
      const a = free[i], b = free[j];
      for (const idx of [Math.max(i, j), Math.min(i, j)]) {
        free[idx] = free[free.length - 1];
        free.pop();
      }
      takeTile(a, kind);
      takeTile(b, kind);
      peak = Math.max(peak, open.length + 1);
    }
  }
  if (open.length || pool.length) throw new Error('generator left unmatched pairs');

  return { slots, kinds, limit: settings.limit, seed, solution: order, peak };
}
