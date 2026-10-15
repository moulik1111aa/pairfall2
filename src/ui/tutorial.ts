// Coaching for the first three levels: a pointing hand and one line of guidance.

import type { Game } from '../core/game.ts';
import type { GameStage } from '../render/gameStage.ts';
import { ICONS } from './icons.ts';
import { bi, TEXT, type Bi } from './i18n.ts';

/** A good next tap: complete a tray pair, else start a pair whose twin is also free. */
export function suggestMove(game: Game): number | null {
  const free = game.board.freeSlots();
  const trayKinds = new Set(game.tray.map((t) => t.kind));
  const finish = free.find((s) => trayKinds.has(game.kinds[s]));
  if (finish !== undefined) return finish;
  const seen = new Map<number, number>();
  for (const s of free) {
    const k = game.kinds[s];
    if (seen.has(k)) return seen.get(k)!;
    seen.set(k, s);
  }
  return free[0] ?? null;
}

export class Tutorial {
  private readonly pointer: HTMLElement;
  private readonly coach: HTMLElement;
  private readonly level: number;
  private done = false;
  private readonly game: Game;
  private readonly stage: GameStage;
  private readonly hindi: boolean;

  constructor(parent: HTMLElement, level: number, game: Game, stage: GameStage, hindi = false) {
    this.level = level;
    this.hindi = hindi;
    this.game = game;
    this.stage = stage;
    this.pointer = document.createElement('div');
    this.pointer.className = 'pointer';
    this.pointer.innerHTML = ICONS.finger;
    this.coach = document.createElement('div');
    this.coach.className = 'coach';
    this.coach.setAttribute('role', 'status');
    parent.append(this.pointer, this.coach);
    this.update();
  }

  private say(text: Bi): void {
    this.coach.innerHTML = `<span>${bi(text, this.hindi)}</span>`;
  }

  private pointAt(slot: number | null): void {
    if (slot === null) {
      this.pointer.style.display = 'none';
      return;
    }
    const c = this.stage.slotCenter(slot);
    const r = this.pointer.parentElement!.getBoundingClientRect();
    this.pointer.style.display = '';
    this.pointer.style.left = `${c.x - r.left}px`;
    this.pointer.style.top = `${c.y - r.top}px`;
  }

  /** Call after every move. */
  update(): void {
    if (this.done) return;
    const g = this.game;
    if (this.level === 1) {
      if (g.pairsCleared === 0 && g.tray.length === 0) this.say(TEXT.tutorialTap);
      else if (g.pairsCleared === 0) this.say(TEXT.tutorialTwin);
      else if (g.pairsCleared < 3) this.say(TEXT.tutorialLimit(g.limit));
      else return this.finish();
      this.pointAt(g.pairsCleared < 2 ? suggestMove(g) : null);
    } else if (this.level === 2) {
      if (g.pairsCleared < 2) this.say(TEXT.tutorialCovered);
      else return this.finish();
      this.pointAt(null);
    } else {
      if (g.pairsCleared < 2) this.say(TEXT.tutorialPlan);
      else return this.finish();
      this.pointAt(null);
    }
  }

  finish(): void {
    this.done = true;
    this.pointer.remove();
    // Give the board the room the guidance was using.
    this.stage.setTopReserve(0);
    this.coach.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 300, fill: 'forwards' }).finished.then(
      () => this.coach.remove(),
      () => this.coach.remove(),
    );
  }

  destroy(): void {
    this.pointer.remove();
    this.coach.remove();
  }
}
