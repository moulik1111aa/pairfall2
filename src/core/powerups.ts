// Power-ups (spec §3): what each one does to a game, and how it is paid for.

import { CONFIG, type PowerupId } from '../config.ts';
import { WILD, type Rules } from './rules.ts';
import { solve, orderedMoves } from './solver.ts';
import type { Rng } from './rng.ts';

export type Payment = 'free' | 'coins' | 'none';

export interface Wallet {
  coins: number;
  powerups: Record<PowerupId, number>;
}

/** Price of a power-up when no free use is left. */
export function costOf(id: PowerupId | 'continue'): number {
  return CONFIG.costs[id];
}

/** Pay for one use: a free use first, then coins. Returns how it was paid, or 'none' if unaffordable. */
export function pay(w: Wallet, id: PowerupId): Payment {
  if (w.powerups[id] > 0) {
    w.powerups[id]--;
    return 'free';
  }
  if (w.coins >= costOf(id)) {
    w.coins -= costOf(id);
    return 'coins';
  }
  return 'none';
}

/** Give back a use that turned out to do nothing. */
export function refund(w: Wallet, id: PowerupId, how: Payment): void {
  if (how === 'free') w.powerups[id]++;
  if (how === 'coins') w.coins += costOf(id);
}

/**
 * Hint: the tile(s) to tap next. When the safest move starts a pair whose twin is
 * also reachable, both tiles are returned.
 */
export function hint(rules: Rules): number[] {
  const { moves } = solve(rules, 3000);
  if (moves && moves.length) {
    const first = moves[0];
    const second = moves[1];
    const kind = rules.kinds[first];
    if (second !== undefined && rules.partnerIndex(kind) < 0 && rules.canTap(second) && rules.kinds[second] === kind) {
      return [first, second];
    }
    return [first];
  }
  // No full solution found within the budget: fall back to the best-looking move.
  const best = orderedMoves(rules)[0];
  return best === undefined ? [] : [best];
}

/**
 * Shuffle: rearrange the kinds of tiles still on the board (wilds stay put) so
 * the position is winnable again. Returns slot → new kind, or null if no winnable
 * arrangement was found.
 */
export function shuffle(rules: Rules, rng: Rng, attempts = 24): Map<number, number> | null {
  const slots = rules.board.presentSlots().filter((s) => rules.kinds[s] !== WILD);
  if (slots.length < 2) return null;
  const kinds = slots.map((s) => rules.kinds[s]);
  for (let a = 0; a < attempts; a++) {
    const next = rng.shuffle([...kinds]);
    if (next.every((k, i) => k === kinds[i])) continue;
    const trial = rules.clone();
    slots.forEach((s, i) => (trial.kinds[s] = next[i]));
    if (solve(trial, 2500).moves) return new Map(slots.map((s, i) => [s, next[i]]));
  }
  return null;
}
