// Tile positions and the "is this tile free?" rule.
//
// Coordinates are in half-tile units: a tile occupies [x, x+2) × [y, y+2) on its layer.
// A tile is free when BOTH hold:
//  • nothing on a higher layer overlaps it (it is uncovered), and
//  • it sits on the edge of its own layer: at least one of its four sides (left,
//    right, above, below) has no neighbouring tile on the same layer.
// So a tile boxed in on all four sides by tiles of its own layer cannot be tapped
// until one of those neighbours has been cleared.

export interface Slot {
  readonly id: number; // must equal its index in the slots array
  readonly x: number;
  readonly y: number;
  readonly layer: number;
}

export interface BoardGeometry {
  readonly slots: readonly Slot[];
  /** covers[a] = slots below that tile a sits on. */
  readonly covers: readonly (readonly number[])[];
  /** coveredBy[b] = slots above that sit on tile b. */
  readonly coveredBy: readonly (readonly number[])[];
  /** adj[a] = same-layer neighbours touching one of a's sides. */
  readonly adj: readonly (readonly number[])[];
  /** adjSide[a][i] = which side of a (0 left, 1 right, 2 above, 3 below) adj[a][i] touches. */
  readonly adjSide: readonly (readonly number[])[];
}

/** Side indices: 0 left, 1 right, 2 above, 3 below. */
const OPPOSITE = [1, 0, 3, 2] as const;

/** Which side of `a` the same-layer tile `b` touches, or -1 if they are not side by side. */
export function sideOf(a: Slot, b: Slot): number {
  if (a.layer !== b.layer || a.id === b.id) return -1;
  const dx = b.x - a.x, dy = b.y - a.y;
  if (Math.abs(dy) < 2 && Math.abs(dx) === 2) return dx < 0 ? 0 : 1;
  if (Math.abs(dx) < 2 && Math.abs(dy) === 2) return dy < 0 ? 2 : 3;
  return -1;
}

export function overlaps(a: Slot, b: Slot): boolean {
  return Math.abs(a.x - b.x) < 2 && Math.abs(a.y - b.y) < 2;
}

export function buildGeometry(slots: readonly Slot[]): BoardGeometry {
  slots.forEach((s, i) => {
    if (s.id !== i) throw new Error(`slot id ${s.id} at index ${i}`);
  });
  const covers: number[][] = slots.map(() => []);
  const coveredBy: number[][] = slots.map(() => []);
  const adj: number[][] = slots.map(() => []);
  const adjSide: number[][] = slots.map(() => []);
  for (const a of slots) {
    for (const b of slots) {
      if (a.layer > b.layer && overlaps(a, b)) {
        covers[a.id].push(b.id);
        coveredBy[b.id].push(a.id);
      }
      const side = sideOf(a, b);
      if (side >= 0) {
        adj[a.id].push(b.id);
        adjSide[a.id].push(side);
      }
    }
  }
  return { slots, covers, coveredBy, adj, adjSide };
}

export class Board {
  readonly geo: BoardGeometry;
  private readonly coverCount: Int16Array;
  /** sideCount[4·a + side] = neighbours still present on that side of a. */
  private readonly sideCount: Int16Array;
  private readonly present: Uint8Array;
  private count: number;

  constructor(geo: BoardGeometry, init?: { coverCount: Int16Array; sideCount: Int16Array; present: Uint8Array; count: number }) {
    this.geo = geo;
    if (init) {
      this.coverCount = init.coverCount.slice();
      this.sideCount = init.sideCount.slice();
      this.present = init.present.slice();
      this.count = init.count;
    } else {
      const n = geo.slots.length;
      this.coverCount = new Int16Array(n);
      this.sideCount = new Int16Array(n * 4);
      this.present = new Uint8Array(n).fill(1);
      this.count = n;
      for (let i = 0; i < n; i++) {
        this.coverCount[i] = geo.coveredBy[i].length;
        for (const side of geo.adjSide[i]) this.sideCount[i * 4 + side]++;
      }
    }
  }

  static fromSlots(slots: readonly Slot[]): Board {
    return new Board(buildGeometry(slots));
  }

  get size(): number {
    return this.geo.slots.length;
  }

  get remaining(): number {
    return this.count;
  }

  isPresent(id: number): boolean {
    return this.present[id] === 1;
  }

  /** Nothing on a higher layer overlaps the tile. */
  isUncovered(id: number): boolean {
    return this.present[id] === 1 && this.coverCount[id] === 0;
  }

  /** At least one side of the tile has no neighbour on its own layer. */
  hasOpenSide(id: number): boolean {
    const c = this.sideCount, i = id * 4;
    return c[i] === 0 || c[i + 1] === 0 || c[i + 2] === 0 || c[i + 3] === 0;
  }

  isFree(id: number): boolean {
    return this.present[id] === 1 && this.coverCount[id] === 0 && this.hasOpenSide(id);
  }

  /** Removes a free tile. Returns the ids of tiles that became free as a result. */
  remove(id: number): number[] {
    if (!this.isFree(id)) throw new Error(`tile ${id} is not free`);
    const { covers, adj, adjSide } = this.geo;
    const was = this.snapshot(id);
    this.present[id] = 0;
    this.count--;
    for (const b of covers[id]) this.coverCount[b]--;
    const a = adj[id], sd = adjSide[id];
    for (let i = 0; i < a.length; i++) this.sideCount[a[i] * 4 + OPPOSITE[sd[i]]]--;
    return this.changed(id, was, true);
  }

  /** Exact inverse of remove(). Returns the ids of tiles that became blocked again. */
  restore(id: number): number[] {
    if (this.present[id] === 1) throw new Error(`tile ${id} is already present`);
    const { covers, adj, adjSide } = this.geo;
    const was = this.snapshot(id);
    this.present[id] = 1;
    this.count++;
    for (const b of covers[id]) this.coverCount[b]++;
    const a = adj[id], sd = adjSide[id];
    for (let i = 0; i < a.length; i++) this.sideCount[a[i] * 4 + OPPOSITE[sd[i]]]++;
    return this.changed(id, was, false);
  }

  /**
   * Free/not-free state of every tile `id` touches (below it, then beside it), as a
   * bit mask. A tile touches at most four below and eight beside, so it fits.
   */
  private snapshot(id: number): number {
    let mask = 0, bit = 1;
    for (const b of this.geo.covers[id]) {
      if (this.isFree(b)) mask |= bit;
      bit <<= 1;
    }
    for (const b of this.geo.adj[id]) {
      if (this.isFree(b)) mask |= bit;
      bit <<= 1;
    }
    return mask;
  }

  /** Tiles touching `id` that became free (or, when `toFree` is false, blocked). */
  private changed(id: number, was: number, toFree: boolean): number[] {
    const out: number[] = [];
    let bit = 1;
    for (const list of [this.geo.covers[id], this.geo.adj[id]]) {
      for (const b of list) {
        const now = this.isFree(b);
        const before = (was & bit) !== 0;
        if (toFree ? now && !before : !now && before) out.push(b);
        bit <<= 1;
      }
    }
    return out;
  }

  freeSlots(): number[] {
    const out: number[] = [];
    for (let i = 0; i < this.present.length; i++) if (this.isFree(i)) out.push(i);
    return out;
  }

  presentSlots(): number[] {
    const out: number[] = [];
    for (let i = 0; i < this.present.length; i++) if (this.present[i] === 1) out.push(i);
    return out;
  }

  clone(): Board {
    return new Board(this.geo, { coverCount: this.coverCount, sideCount: this.sideCount, present: this.present, count: this.count });
  }
}
