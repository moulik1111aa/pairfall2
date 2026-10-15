// Tile positions and the "is this tile free?" rule.
//
// Coordinates are in half-tile units: a tile occupies [x, x+2) × [y, y+2) on its layer.
// A tile is blocked while any tile on a HIGHER layer overlaps it. Tiles on the same
// layer never block each other.

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
  for (const a of slots) {
    for (const b of slots) {
      if (a.layer > b.layer && overlaps(a, b)) {
        covers[a.id].push(b.id);
        coveredBy[b.id].push(a.id);
      }
    }
  }
  return { slots, covers, coveredBy };
}

export class Board {
  readonly geo: BoardGeometry;
  private readonly coverCount: Int16Array;
  private readonly present: Uint8Array;
  private count: number;

  constructor(geo: BoardGeometry, init?: { coverCount: Int16Array; present: Uint8Array; count: number }) {
    this.geo = geo;
    if (init) {
      this.coverCount = init.coverCount.slice();
      this.present = init.present.slice();
      this.count = init.count;
    } else {
      const n = geo.slots.length;
      this.coverCount = new Int16Array(n);
      this.present = new Uint8Array(n).fill(1);
      this.count = n;
      for (let i = 0; i < n; i++) this.coverCount[i] = geo.coveredBy[i].length;
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

  isFree(id: number): boolean {
    return this.present[id] === 1 && this.coverCount[id] === 0;
  }

  /** Removes a free tile. Returns the ids of tiles that became free as a result. */
  remove(id: number): number[] {
    if (!this.isFree(id)) throw new Error(`tile ${id} is not free`);
    this.present[id] = 0;
    this.count--;
    const freed: number[] = [];
    for (const b of this.geo.covers[id]) {
      this.coverCount[b]--;
      if (this.coverCount[b] === 0 && this.present[b] === 1) freed.push(b);
    }
    return freed;
  }

  /** Exact inverse of remove(). Returns the ids of tiles that became blocked again. */
  restore(id: number): number[] {
    if (this.present[id] === 1) throw new Error(`tile ${id} is already present`);
    this.present[id] = 1;
    this.count++;
    const blocked: number[] = [];
    for (const b of this.geo.covers[id]) {
      if (this.coverCount[b] === 0 && this.present[b] === 1) blocked.push(b);
      this.coverCount[b]++;
    }
    return blocked;
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
    return new Board(this.geo, { coverCount: this.coverCount, present: this.present, count: this.count });
  }
}
