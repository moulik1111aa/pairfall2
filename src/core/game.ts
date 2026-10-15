// The game: rules plus everything a player experiences around them — combos,
// danger, undo history, power-up bookkeeping — expressed as events that the
// renderer, audio and haptics react to independently. No graphics, no browser APIs.

import { Rules, TapResult, WILD, type LevelData } from './rules.ts';
import type { BoardGeometry } from './board.ts';
import { CONFIG } from '../config.ts';

export { WILD, type LevelData, type Specials } from './rules.ts';

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
  | { type: 'thawed'; slots: number[] }
  | { type: 'chilled'; slots: number[] }
  | { type: 'unlocked'; slots: number[] }
  | { type: 'shuffled'; slots: number[] }
  | { type: 'wildified'; slot: number }
  | { type: 'danger' }
  | { type: 'dangerEnd' }
  | { type: 'undone'; slot: number; kind: number }
  | { type: 'win' }
  | { type: 'lose' };

interface HistoryEntry {
  slot: number;
  /** Set when this tap completed a pair (such taps cannot be undone). */
  cleared: boolean;
}

export class Game {
  readonly rules: Rules;
  status: GameStatus = 'playing';
  combo = 0;
  bestCombo = 0;
  /** Sum over clears of max(0, combo − 2); feeds the coin bonus. */
  comboBonusSteps = 0;
  dangerReached = false;
  powerupsUsed = 0;
  /** Set once Continue has been used this attempt. */
  continued = false;
  /** Why the game was lost: the tray filled, or no tile can be tapped any more. */
  lossReason: 'tray' | 'stuck' | null = null;
  private lastClearAt = -Infinity;
  private inDanger = false;
  private readonly history: HistoryEntry[] = [];
  private readonly clock: () => number;

  constructor(level: LevelData, clock: () => number = () => performance.now(), geo?: BoardGeometry) {
    this.rules = new Rules(level, geo);
    this.clock = clock;
  }

  get board() {
    return this.rules.board;
  }
  get kinds(): readonly number[] {
    return this.rules.kinds;
  }
  get limit(): number {
    return this.rules.limit;
  }
  get pairsCleared(): number {
    return this.rules.pairsCleared;
  }
  get tray(): TrayTile[] {
    return this.rules.tray.map((slot) => ({ slot, kind: this.rules.kinds[slot] }));
  }
  get danger(): boolean {
    return this.inDanger;
  }

  canTap(slot: number): boolean {
    return this.status === 'playing' && this.rules.canTap(slot);
  }

  isLocked(slot: number): boolean {
    return this.rules.isLocked(slot);
  }

  frostOf(slot: number): number {
    return this.rules.frost[slot];
  }

  tap(slot: number): GameEvent[] {
    if (!this.canTap(slot)) return [];
    const r = this.rules;
    const kind = r.kinds[slot];
    const result = r.tap(slot);
    if (result === TapResult.Ignored) return [];
    const events: GameEvent[] = [];
    if (result === TapResult.Cleared) {
      const partner = r.lastPartner;
      events.push({ type: 'tileToTray', slot, kind, trayIndex: r.lastPartnerIndex });
      const now = this.clock();
      this.combo = now - this.lastClearAt <= CONFIG.comboWindowMs ? this.combo + 1 : 1;
      this.lastClearAt = now;
      this.bestCombo = Math.max(this.bestCombo, this.combo);
      this.comboBonusSteps += Math.max(0, this.combo - 2);
      const shownKind = kind === WILD ? r.kinds[partner] : kind;
      events.push({ type: 'pairCleared', slots: [partner, slot], kind: shownKind, combo: this.combo });
      this.history.push({ slot, cleared: true });
    } else {
      events.push({ type: 'tileToTray', slot, kind, trayIndex: r.tray.length - 1 });
      this.history.push({ slot, cleared: false });
    }
    if (r.lastFreed.length) events.push({ type: 'freed', slots: [...r.lastFreed] });
    if (r.lastChilled.length) events.push({ type: 'chilled', slots: [...r.lastChilled] });
    if (r.lastThawed.length) events.push({ type: 'thawed', slots: [...r.lastThawed] });
    if (r.lastUnlocked.length) events.push({ type: 'unlocked', slots: [...r.lastUnlocked] });
    if (r.lastWildified >= 0) events.push({ type: 'wildified', slot: r.lastWildified });
    events.push({ type: 'trayChanged', tray: this.tray });

    if (r.lost) {
      this.status = 'lost';
      this.lossReason = 'tray';
      events.push({ type: 'lose' });
      return events;
    }
    this.updateDanger(events);
    if (r.won) {
      this.status = 'won';
      events.push({ type: 'win' });
    } else if (r.tappable().length === 0) {
      // Everything left is frozen or locked with nothing able to free it.
      this.status = 'lost';
      this.lossReason = 'stuck';
      events.push({ type: 'lose' });
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
    const blocked = this.rules.untap(last.slot);
    const events: GameEvent[] = [{ type: 'undone', slot: last.slot, kind: this.rules.kinds[last.slot] }];
    if (blocked.length) events.push({ type: 'blocked', slots: blocked });
    events.push({ type: 'trayChanged', tray: this.tray });
    this.updateDanger(events);
    return events;
  }

  /** Raise the tray limit (the +1 Slot power-up / Continue). Revives a lost game. */
  addSlot(): GameEvent[] {
    this.rules.limit++;
    const events: GameEvent[] = [];
    if (this.status === 'lost' && this.lossReason === 'tray' && !this.rules.lost) {
      this.status = 'playing';
      this.lossReason = null;
    }
    this.updateDanger(events);
    return events;
  }

  /** Give board tiles new kinds (the Shuffle power-up). `next` maps slot → kind. */
  reassign(next: ReadonlyMap<number, number>): GameEvent[] {
    for (const [slot, kind] of next) {
      if (!this.rules.board.isPresent(slot)) throw new Error(`slot ${slot} is not on the board`);
      this.rules.kinds[slot] = kind;
    }
    // A tapped-then-shuffled tile can no longer be undone safely.
    this.history.length = 0;
    return [{ type: 'shuffled', slots: [...next.keys()] }];
  }

  private updateDanger(events: GameEvent[]): void {
    const now = this.status === 'playing' && this.rules.tray.length === this.rules.limit - 1;
    if (now && !this.inDanger) {
      this.dangerReached = true;
      events.push({ type: 'danger' });
    } else if (!now && this.inDanger) {
      events.push({ type: 'dangerEnd' });
    }
    this.inDanger = now;
  }
}
