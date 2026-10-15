// The rules engine. Pure and deterministic: no graphics, no browser APIs.
// Input is an action (tap / undo); output is a list of events that the
// renderer, audio and haptics react to independently.

import { Board, buildGeometry, type Slot } from './board.ts';
import { CONFIG } from '../config.ts';

export interface LevelData {
  readonly slots: readonly Slot[];
  /** kinds[slotId] = tile kind (0-based). Every kind appears an even number of times. */
  readonly kinds: readonly number[];
  readonly limit: number;
}

export interface TrayTile {
  readonly slot: number;
  readonly kind: number;
}

export type GameStatus = 'playing' | 'won' | 'lost';

export type GameEvent =
  | { type: 'tileToTray'; slot: number; kind: number; trayIndex: number }
  | { type: 'pairCleared'; slots: [number, number]; kind: number; combo: number }
  | { type: 'freed'; slots: number[] }
  | { type: 'blocked'; slots: number[] }
  | { type: 'trayChanged'; tray: TrayTile[] }
  | { type: 'danger' }
  | { type: 'dangerEnd' }
  | { type: 'undone'; slot: number; kind: number }
  | { type: 'win' }
  | { type: 'lose' };

interface HistoryEntry {
  slot: number;
  kind: number;
  /** Set when this tap completed a pair (such taps cannot be undone). */
  cleared: boolean;
  freed: number[];
}

export class Game {
  readonly board: Board;
  readonly kinds: readonly number[];
  limit: number;
  tray: TrayTile[] = [];
  status: GameStatus = 'playing';
  combo = 0;
  bestCombo = 0;
  /** Sum over clears of max(0, combo − 2); feeds the coin bonus. */
  comboBonusSteps = 0;
  pairsCleared = 0;
  dangerReached = false;
  powerupsUsed = 0;
  private lastClearAt = -Infinity;
  private inDanger = false;
  private readonly history: HistoryEntry[] = [];
  private readonly clock: () => number;

  constructor(level: LevelData, clock: () => number = () => performance.now()) {
    if (level.kinds.length !== level.slots.length) throw new Error('kinds/slots length mismatch');
    this.board = new Board(buildGeometry(level.slots));
    this.kinds = level.kinds;
    this.limit = level.limit;
    this.clock = clock;
  }

  get danger(): boolean {
    return this.inDanger;
  }

  canTap(slot: number): boolean {
    return this.status === 'playing' && this.board.isFree(slot);
  }

  tap(slot: number): GameEvent[] {
    if (!this.canTap(slot)) return [];
    const kind = this.kinds[slot];
    const events: GameEvent[] = [];
    const freed = this.board.remove(slot);
    const partnerIndex = this.tray.findIndex((t) => t.kind === kind);

    if (partnerIndex >= 0) {
      const partner = this.tray[partnerIndex];
      events.push({ type: 'tileToTray', slot, kind, trayIndex: partnerIndex });
      this.tray.splice(partnerIndex, 1);
      const now = this.clock();
      this.combo = now - this.lastClearAt <= CONFIG.comboWindowMs ? this.combo + 1 : 1;
      this.lastClearAt = now;
      this.bestCombo = Math.max(this.bestCombo, this.combo);
      this.comboBonusSteps += Math.max(0, this.combo - 2);
      this.pairsCleared++;
      events.push({ type: 'pairCleared', slots: [partner.slot, slot], kind, combo: this.combo });
      this.history.push({ slot, kind, cleared: true, freed });
    } else {
      events.push({ type: 'tileToTray', slot, kind, trayIndex: this.tray.length });
      this.tray.push({ slot, kind });
      this.history.push({ slot, kind, cleared: false, freed });
    }

    if (freed.length) events.push({ type: 'freed', slots: freed });
    events.push({ type: 'trayChanged', tray: [...this.tray] });

    if (this.tray.length >= this.limit) {
      this.status = 'lost';
      events.push({ type: 'lose' });
      return events;
    }
    this.updateDanger(events);
    if (this.board.remaining === 0 && this.tray.length === 0) {
      this.status = 'won';
      events.push({ type: 'win' });
    }
    return events;
  }

  /** Undo is possible when the last tap is still sitting unmatched in the tray. */
  canUndo(): boolean {
    const last = this.history[this.history.length - 1];
    return this.status === 'playing' && !!last && !last.cleared;
  }

  undo(): GameEvent[] {
    if (!this.canUndo()) return [];
    const last = this.history.pop()!;
    const idx = this.tray.findIndex((t) => t.slot === last.slot);
    this.tray.splice(idx, 1);
    const blocked = this.board.restore(last.slot);
    const events: GameEvent[] = [{ type: 'undone', slot: last.slot, kind: last.kind }];
    if (blocked.length) events.push({ type: 'blocked', slots: blocked });
    events.push({ type: 'trayChanged', tray: [...this.tray] });
    this.updateDanger(events);
    return events;
  }

  /** Raise the tray limit (the +1 Slot power-up / Continue). Revives a lost game. */
  addSlot(): GameEvent[] {
    this.limit++;
    const events: GameEvent[] = [];
    if (this.status === 'lost' && this.tray.length < this.limit) this.status = 'playing';
    this.updateDanger(events);
    return events;
  }

  private updateDanger(events: GameEvent[]): void {
    const now = this.status === 'playing' && this.tray.length === this.limit - 1;
    if (now && !this.inDanger) {
      this.dangerReached = true;
      events.push({ type: 'danger' });
    } else if (!now && this.inDanger) {
      events.push({ type: 'dangerEnd' });
    }
    this.inDanger = now;
  }
}
