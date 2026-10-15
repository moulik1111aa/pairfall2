// Mirror-symmetric board outlines, stacked into layers (spec §5.2 step 1).
//
// Layer 0 uses tile positions on even half-unit coordinates. Each higher layer
// alternates between odd and even offsets, so every upper tile sits across four
// tiles below it (a pyramid step), the classic stacked-tile look.

import type { Slot } from '../core/board.ts';
import type { Rng } from '../core/rng.ts';

export type ShapeName = 'rect' | 'diamond' | 'pyramid' | 'heart' | 'ring' | 'blob';

/** Board frame in tiles (fits the 13R board area). */
export const FRAME = { cols: 9, rows: 12 } as const;

type Mask = (u: number, v: number) => boolean;

function maskFor(name: ShapeName, rng: Rng): Mask {
  switch (name) {
    case 'rect':
      return () => true;
    case 'diamond':
      return (u, v) => Math.abs(u) + Math.abs(v) <= 1.08;
    case 'pyramid':
      // wide at the bottom (v = 1), narrow at the top
      return (u, v) => Math.abs(u) <= (v + 1.25) / 2.1;
    case 'heart': {
      return (u, v) => {
        const x = u * 1.25, y = -v * 1.3 + 0.25;
        const a = x * x + y * y - 1;
        return a * a * a - x * x * y * y * y <= 0;
      };
    }
    case 'ring':
      return (u, v) => {
        const r = Math.hypot(u, v);
        return r <= 1.05 && r >= 0.5;
      };
    case 'blob': {
      // radius as a sum of cosines in |θ| → symmetric about the vertical axis
      const a1 = rng.next() * 0.25, a2 = rng.next() * 0.2, a3 = rng.next() * 0.15;
      const p1 = rng.next() * Math.PI, p2 = rng.next() * Math.PI;
      return (u, v) => {
        const th = Math.abs(Math.atan2(u, -v));
        const r = 0.8 + a1 * Math.cos(2 * th + p1) + a2 * Math.cos(3 * th + p2) + a3 * Math.cos(5 * th);
        return Math.hypot(u, v) <= r + 0.12;
      };
    }
  }
}

const key = (x: number, y: number) => x * 1000 + y;

interface Proto {
  x: number;
  y: number;
  layer: number;
}

/** Full pyramid stack for a base of cols × rows tiles. */
function stack(mask: Mask, cols: number, rows: number, maxLayers: number): Proto[] {
  const out: Proto[] = [];
  let prev = new Set<number>();
  for (let j = 0; j < rows; j++) {
    for (let i = 0; i < cols; i++) {
      // integer offset from the axis → mirrored columns get exactly opposite u
      const u = cols === 1 ? 0 : (2 * i - (cols - 1)) / (cols - 1);
      const v = rows === 1 ? 0 : (2 * j - (rows - 1)) / (rows - 1);
      const au = Math.abs(u);
      if (mask(au, v) && mask(-au, v)) {
        out.push({ x: 2 * i, y: 2 * j, layer: 0 });
        prev.add(key(2 * i, 2 * j));
      }
    }
  }
  for (let layer = 1; layer < maxLayers; layer++) {
    const o = layer % 2; // alternate odd / even offsets
    const cur = new Set<number>();
    for (let y = o; y <= 2 * (rows - 1); y += 2) {
      for (let x = o; x <= 2 * (cols - 1); x += 2) {
        const below = [key(x - 1, y - 1), key(x + 1, y - 1), key(x - 1, y + 1), key(x + 1, y + 1)];
        if (below.every((k) => prev.has(k))) {
          out.push({ x, y, layer });
          cur.add(key(x, y));
        }
      }
    }
    if (cur.size === 0) break;
    prev = cur;
  }
  return out;
}

/**
 * Build a symmetric layered shape with an even tile count close to `tiles`.
 * The result fits within FRAME and is never smaller than 4 tiles.
 */
export function makeShape(name: ShapeName, tiles: number, maxLayers: number, rng: Rng): Slot[] {
  const mask = maskFor(name, rng);
  const target = Math.max(4, tiles - (tiles % 2));
  // Candidate bases, smallest first, whose full stack reaches the target.
  const aspect = FRAME.rows / FRAME.cols;
  const bases: { protos: Proto[]; cols: number }[] = [];
  for (let cols = 2; cols <= FRAME.cols; cols++) {
    const seen = new Set<number>();
    for (const rows of [Math.round(cols * aspect * 0.85), Math.round(cols * aspect), Math.round(cols * aspect * 0.7)]) {
      const r = Math.min(FRAME.rows, Math.max(2, rows));
      if (seen.has(r)) continue;
      seen.add(r);
      const s = stack(mask, cols, r, maxLayers);
      if (s.length >= target) bases.push({ protos: s, cols });
    }
  }
  if (bases.length === 0) bases.push({ protos: stack(mask, FRAME.cols, FRAME.rows, maxLayers), cols: FRAME.cols });
  bases.sort((a, b) => a.protos.length - b.protos.length);

  // Prefer the smallest base that trims to an exactly symmetric, even shape.
  let fallback: Proto[] | null = null;
  for (const base of bases.slice(0, 6)) {
    const { protos, symmetric } = trim(base.protos, base.cols, target, rng);
    if (symmetric && protos.length % 2 === 0) return finish(protos);
    fallback ??= protos;
  }
  return finish(fallback!);
}

function finish(protos: Proto[]): Slot[] {
  // Stable ordering: bottom layer first, then row-major — ids follow this order.
  const sorted = [...protos].sort((a, b) => a.layer - b.layer || a.y - b.y || a.x - b.x);
  return sorted.map((p, id) => ({ id, x: p.x, y: p.y, layer: p.layer }));
}

/** Trim from the top down, in mirror pairs, to the target count. */
function trim(full: Proto[], cols: number, target: number, rng: Rng): { protos: Proto[]; symmetric: boolean } {
  const mirror = (x: number) => 2 * (cols - 1) - x;
  const cx = cols - 1;
  let protos = full;
  let symmetric = true;
  const tilesAbove = (p: Proto) =>
    protos.some((q) => q.layer > p.layer && Math.abs(q.x - p.x) < 2 && Math.abs(q.y - p.y) < 2);
  while (protos.length > target) {
    const topLayer = Math.max(...protos.map((p) => p.layer));
    const candidates = protos.filter((p) => p.layer === topLayer && !tilesAbove(p));
    // remove outermost first for a tidy silhouette
    candidates.sort((a, b) => Math.abs(b.x - cx) - Math.abs(a.x - cx));
    const over = protos.length - target;
    if (over % 2 === 1) {
      const axisTile = protos.find((c) => c.x === mirror(c.x) && !tilesAbove(c));
      if (axisTile) {
        protos = protos.filter((q) => q !== axisTile);
        continue;
      }
    }
    const offAxis = candidates.filter((c) => c.x !== mirror(c.x));
    const pool = offAxis.length ? offAxis : candidates;
    const p = pool[rng.int(0, Math.min(3, pool.length - 1))];
    const twin = protos.find((q) => q !== p && q.layer === p.layer && q.y === p.y && q.x === mirror(p.x));
    protos = protos.filter((q) => q !== p && q !== twin);
  }
  if (protos.length % 2 === 1) {
    const free = protos.filter((p) => !tilesAbove(p));
    const p = free.find((c) => c.x === mirror(c.x)) ?? free.sort((a, b) => Math.abs(a.x - cx) - Math.abs(b.x - cx))[0];
    if (p.x !== mirror(p.x)) symmetric = false;
    protos = protos.filter((q) => q !== p);
  }
  return { protos, symmetric };
}
