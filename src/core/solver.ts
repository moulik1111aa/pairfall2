// A small depth-first solver over the shared rules. Used by Hint (what's a safe
// next move?) and Shuffle (is this rearrangement still winnable?).
// It tries promising moves first — finishing a pair, then starting a pair whose
// twin is already reachable — and remembers dead positions so it rarely repeats work.

import { Rules, TapResult, WILD } from './rules.ts';

export interface SolveResult {
  /** Winning tap sequence from the current position, or null if none was found. */
  moves: number[] | null;
  /** Positions explored. */
  nodes: number;
}

function key(r: Rules): string {
  // board presence + tray kinds (order matters for wilds) + frost
  let k = '';
  const n = r.kinds.length;
  for (let i = 0; i < n; i++) k += r.board.isPresent(i) ? '1' : '0';
  k += '|';
  for (const s of r.tray) k += r.kinds[s] + ',';
  if (r.frozenSlots.length) {
    k += '|';
    for (const s of r.frozenSlots) k += r.frost[s];
  }
  return k;
}

/** Candidate moves, best first. Moves that would fill the tray are left out. */
export function orderedMoves(r: Rules): number[] {
  const tap = r.tappable();
  const kinds = r.kinds;
  const finish: number[] = [];
  const start: number[] = [];
  const rest: number[] = [];
  const count = new Map<number, number>();
  for (const s of tap) count.set(kinds[s], (count.get(kinds[s]) ?? 0) + 1);
  const trayFull = r.tray.length + 1 >= r.limit;
  for (const s of tap) {
    if (r.partnerIndex(kinds[s]) >= 0) finish.push(s);
    else if (trayFull) continue; // would lose immediately
    else if (kinds[s] !== WILD && (count.get(kinds[s]) ?? 0) >= 2) start.push(s);
    else rest.push(s);
  }
  return [...finish, ...start, ...rest];
}

export function solve(rules: Rules, budget = 4000): SolveResult {
  const dead = new Set<string>();
  let nodes = 0;
  const path: number[] = [];

  const dfs = (r: Rules): boolean => {
    if (r.won) return true;
    if (++nodes > budget) return false;
    const k = key(r);
    if (dead.has(k)) return false;
    for (const s of orderedMoves(r)) {
      const next = r.clone();
      if (next.tap(s) === TapResult.Ignored || next.lost) continue;
      path.push(s);
      if (dfs(next)) return true;
      path.pop();
      if (nodes > budget) return false;
    }
    dead.add(k);
    return false;
  };

  const found = dfs(rules.clone());
  return { moves: found ? [...path] : null, nodes };
}
