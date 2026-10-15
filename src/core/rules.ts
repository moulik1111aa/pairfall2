// The core rules of a board, shared by the game, the test player and the hint
// solver so there is exactly one definition of how tiles behave.
//
// Allocation-free on the hot path: results of the last tap are written into
// reusable fields instead of returned objects.

import { Board, buildGeometry, type BoardGeometry, type Slot } from './board.ts';

/** Kind value of a wild tile: matches any tile. */
export const WILD = 99;

export interface Specials {
  /** Tiles drawn face-down until uncovered. Purely visual. */
  readonly mystery?: readonly number[];
  /** slot → pairs that must be cleared while the tile is uncovered before it can be tapped. */
  readonly frozen?: Readonly<Record<number, number>>;
  /** Padlocked tiles, each opened once both of its key tiles have been cleared. */
  readonly locks?: readonly { readonly slot: number; readonly keys: readonly [number, number] }[];
}

export interface LevelData {
  readonly slots: readonly Slot[];
  /** kinds[slotId] = tile kind (0-based), or WILD. */
  readonly kinds: readonly number[];
  readonly limit: number;
  readonly specials?: Specials;
}

export const TapResult = { Ignored: 0, ToTray: 1, Cleared: 2 } as const;
export type TapResult = (typeof TapResult)[keyof typeof TapResult];

export class Rules {
  readonly board: Board;
  /** Mutable: Shuffle rewrites the kinds of tiles still on the board. */
  readonly kinds: number[];
  limit: number;
  /** Slots waiting in the tray, oldest first. */
  readonly tray: number[] = [];
  /** Remaining thaw count per slot (0 = not frozen). */
  readonly frost: Int16Array;
  /** Lock index per slot, or -1. */
  readonly lockOf: Int16Array;
  /** Lock index a key tile belongs to, or -1. */
  readonly keyOf: Int16Array;
  readonly locks: { slot: number; keys: readonly [number, number]; open: boolean }[];
  readonly cleared: Uint8Array;
  /** Slots that started frozen (the only ones whose frost can change). */
  readonly frozenSlots: readonly number[];
  pairsCleared = 0;

  // ── results of the last tap ──
  /** Slot the tapped tile cleared with (tray partner), or -1. */
  lastPartner = -1;
  /** Index in the tray the partner occupied. */
  lastPartnerIndex = -1;
  readonly lastFreed: number[] = [];
  readonly lastThawed: number[] = [];
  /** Frozen tiles whose count went down (but not to zero) on the last clear. */
  readonly lastChilled: number[] = [];
  readonly lastUnlocked: number[] = [];
  /** A tile that turned wild because the last match left it without a twin, or -1. */
  lastWildified = -1;

  constructor(level: LevelData, geo?: BoardGeometry) {
    if (level.kinds.length !== level.slots.length) throw new Error('kinds/slots length mismatch');
    const n = level.slots.length;
    this.board = new Board(geo ?? buildGeometry(level.slots));
    this.kinds = [...level.kinds];
    this.limit = level.limit;
    this.frost = new Int16Array(n);
    this.lockOf = new Int16Array(n).fill(-1);
    this.keyOf = new Int16Array(n).fill(-1);
    this.cleared = new Uint8Array(n);
    const sp = level.specials;
    const frozen: number[] = [];
    if (sp?.frozen) {
      for (const [slot, count] of Object.entries(sp.frozen)) {
        this.frost[Number(slot)] = count;
        if (count > 0) frozen.push(Number(slot));
      }
    }
    this.frozenSlots = frozen;
    this.locks = (sp?.locks ?? []).map((l, i) => {
      this.lockOf[l.slot] = i;
      this.keyOf[l.keys[0]] = i;
      this.keyOf[l.keys[1]] = i;
      return { slot: l.slot, keys: l.keys, open: false };
    });
  }

  /** Copy for search (test player, hint solver). Shares the immutable geometry. */
  clone(): Rules {
    const r = Object.create(Rules.prototype) as Rules;
    Object.assign(r, {
      board: this.board.clone(),
      kinds: [...this.kinds],
      limit: this.limit,
      tray: [...this.tray],
      frost: this.frost.slice(),
      lockOf: this.lockOf,
      keyOf: this.keyOf,
      locks: this.locks.map((l) => ({ ...l })),
      cleared: this.cleared.slice(),
      frozenSlots: this.frozenSlots,
      pairsCleared: this.pairsCleared,
      lastPartner: -1,
      lastPartnerIndex: -1,
      lastFreed: [],
      lastThawed: [],
      lastChilled: [],
      lastUnlocked: [],
      lastWildified: -1,
    });
    return r;
  }

  isLocked(slot: number): boolean {
    const l = this.lockOf[slot];
    return l >= 0 && !this.locks[l].open;
  }

  isFrozen(slot: number): boolean {
    return this.frost[slot] > 0;
  }

  /** Uncovered, thawed and unlocked. */
  canTap(slot: number): boolean {
    return this.board.isFree(slot) && this.frost[slot] <= 0 && !this.isLocked(slot);
  }

  /** Tappable slots right now. */
  tappable(): number[] {
    const out: number[] = [];
    for (const s of this.board.freeSlots()) if (this.frost[s] <= 0 && !this.isLocked(s)) out.push(s);
    return out;
  }

  /** Which tray index a tile of `kind` would clear with, or -1. */
  partnerIndex(kind: number): number {
    const tray = this.tray;
    if (tray.length === 0) return -1;
    if (kind === WILD) {
      // a wild takes the oldest waiting tile (wilds never match each other)
      for (let i = 0; i < tray.length; i++) if (this.kinds[tray[i]] !== WILD) return i;
      return -1;
    }
    for (let i = 0; i < tray.length; i++) if (this.kinds[tray[i]] === kind) return i;
    for (let i = 0; i < tray.length; i++) if (this.kinds[tray[i]] === WILD) return i;
    return -1;
  }

  tap(slot: number): TapResult {
    this.lastPartner = -1;
    this.lastPartnerIndex = -1;
    this.lastFreed.length = 0;
    this.lastThawed.length = 0;
    this.lastChilled.length = 0;
    this.lastUnlocked.length = 0;
    this.lastWildified = -1;
    if (!this.canTap(slot)) return TapResult.Ignored;
    for (const f of this.board.remove(slot)) this.lastFreed.push(f);
    const idx = this.partnerIndex(this.kinds[slot]);
    if (idx < 0) {
      this.tray.push(slot);
      return TapResult.ToTray;
    }
    const partner = this.tray[idx];
    this.tray.splice(idx, 1);
    this.lastPartner = partner;
    this.lastPartnerIndex = idx;
    this.onPairCleared(partner, slot);
    return TapResult.Cleared;
  }

  private onPairCleared(a: number, b: number): void {
    this.pairsCleared++;
    this.cleared[a] = 1;
    this.cleared[b] = 1;
    if (this.kinds[a] === WILD || this.kinds[b] === WILD) this.passWild(this.kinds[a] === WILD ? b : a);
    // Frozen tiles that are uncovered thaw a step with every pair cleared.
    const frost = this.frost;
    for (const s of this.frozenSlots) {
      if (frost[s] > 0 && this.board.isFree(s)) {
        frost[s]--;
        if (frost[s] === 0) this.lastThawed.push(s);
        else this.lastChilled.push(s);
      }
    }
    for (const k of [a, b]) {
      const li = this.keyOf[k];
      if (li < 0) continue;
      const lock = this.locks[li];
      if (!lock.open && this.cleared[lock.keys[0]] && this.cleared[lock.keys[1]]) {
        lock.open = true;
        this.lastUnlocked.push(lock.slot);
      }
    }
  }

  /**
   * After a wild clears tile `x`, any tile of x's kind left without a twin turns
   * wild, so every tile on the board can still be paired.
   */
  private passWild(x: number): void {
    const kind = this.kinds[x];
    let count = 0;
    let pick = -1;
    let pickLayer = -1;
    const slots = this.board.geo.slots;
    for (let s = 0; s < this.kinds.length; s++) {
      if (this.kinds[s] !== kind || !this.board.isPresent(s)) continue;
      count++;
      if (slots[s].layer > pickLayer) {
        pick = s;
        pickLayer = slots[s].layer;
      }
    }
    if (count % 2 === 1 && pick >= 0) {
      this.kinds[pick] = WILD;
      this.lastWildified = pick;
    }
  }

  /** Reverse a tap that put a tile in the tray without clearing anything. */
  untap(slot: number): number[] {
    const i = this.tray.lastIndexOf(slot);
    if (i < 0) throw new Error(`slot ${slot} is not in the tray`);
    this.tray.splice(i, 1);
    return this.board.restore(slot);
  }

  get won(): boolean {
    return this.board.remaining === 0 && this.tray.length === 0;
  }

  get lost(): boolean {
    return this.tray.length >= this.limit;
  }
}
