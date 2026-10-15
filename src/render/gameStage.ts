// Draws the board and tray and animates tiles between them in response to game
// events. All tiles live in one stage layer so a tile can fly from the board into
// the tray without being re-parented.

import type { Game, GameEvent } from '../core/game.ts';
import type { Slot } from '../core/board.ts';
import type { Theme } from '../themes/types.ts';
import { tileUrls, TILE_W, TILE_H } from '../themes/prerender.ts';
import { Particles } from './particles.ts';
import { moveTo, popOut, shake, wait, EASE_OUT, EASE_BACK, type Pose } from './tweens.ts';

const FACE_RATIO = 101.5 / TILE_W; // visible face height ÷ width
const BODY_RATIO = TILE_H / TILE_W; // full image height ÷ width
const LAYER_DX = -0.05; // per-layer shift, in tile widths
const LAYER_DY = -0.1;

export const FLY_MS = 230;
export const POP_MS = 260;

export interface StageCallbacks {
  /** Called after win/lose animations finish. */
  onEnd(result: 'won' | 'lost'): void;
  /** Called for every tap on a free board tile (before the game is updated). */
  onTap(slot: number): void;
}

interface Layout {
  tileW: number;
  originX: number;
  originY: number;
  minX: number;
  minY: number;
  trayTileW: number;
  trayX: number;
  trayY: number;
  trayGap: number;
}

export class GameStage {
  readonly el: HTMLElement;
  private readonly tilesLayer: HTMLElement;
  private readonly trayEl: HTMLElement;
  private readonly wells: HTMLElement[] = [];
  readonly particles: Particles;
  private readonly tileEls: HTMLElement[] = [];
  private layoutState!: Layout;
  private readonly resizeObs: ResizeObserver;
  private ended = false;
  /** Tray slots shown, in game.tray order (excludes tiles popping out). */
  private trayOrder: number[] = [];

  private readonly game: Game;
  private readonly theme: Theme;
  private readonly cb: StageCallbacks;

  constructor(parent: HTMLElement, game: Game, theme: Theme, cb: StageCallbacks) {
    this.game = game;
    this.theme = theme;
    this.cb = cb;
    this.el = document.createElement('div');
    this.el.className = 'stage';
    this.el.innerHTML = `<div class="board-area"></div><div class="tray"><div class="tray-glow"></div><div class="tray-wells"></div></div><div class="tiles"></div>`;
    parent.appendChild(this.el);
    this.tilesLayer = this.el.querySelector('.tiles')!;
    this.trayEl = this.el.querySelector('.tray')!;
    this.particles = new Particles(this.el, theme.particles);

    const urls = tileUrls(theme);
    const order = [...game.board.geo.slots].sort((a, b) => a.layer - b.layer || a.y - b.y || a.x - b.x);
    for (const slot of game.board.geo.slots) {
      const t = document.createElement('div');
      t.className = 'tile';
      t.dataset.slot = String(slot.id);
      t.style.backgroundImage = `url("${urls[game.kinds[slot.id] % urls.length]}")`;
      t.setAttribute('role', 'button');
      t.setAttribute('aria-label', theme.tiles[game.kinds[slot.id] % theme.tiles.length].name);
      this.tileEls[slot.id] = t;
    }
    for (const slot of order) this.tilesLayer.appendChild(this.tileEls[slot.id]);
    this.buildWells();
    this.refreshBlocked();

    this.el.addEventListener('pointerdown', this.onPointer);
    this.resizeObs = new ResizeObserver(() => this.layout(false));
    this.resizeObs.observe(this.el);
    this.layout(false);
  }

  private buildWells(): void {
    const wells = this.trayEl.querySelector('.tray-wells')!;
    wells.innerHTML = '';
    this.wells.length = 0;
    for (let i = 0; i < this.game.limit; i++) {
      const w = document.createElement('div');
      w.className = 'well';
      wells.appendChild(w);
      this.wells.push(w);
    }
  }

  /** Board pose for a slot. */
  private boardPose(slot: Slot): Pose {
    const L = this.layoutState;
    const half = L.tileW / 2;
    return {
      x: L.originX + (slot.x - L.minX) * half + slot.layer * LAYER_DX * L.tileW,
      y: L.originY + (slot.y - L.minY) * half * FACE_RATIO + slot.layer * LAYER_DY * L.tileW,
      s: 1,
    };
  }

  private trayPose(index: number): Pose {
    const L = this.layoutState;
    return { x: L.trayX + index * (L.trayTileW + L.trayGap), y: L.trayY, s: L.trayTileW / L.tileW };
  }

  /** Screen-space centre of a slot's tile (for tutorial pointers). */
  slotCenter(slotId: number): { x: number; y: number } {
    const p = this.boardPose(this.game.board.geo.slots[slotId]);
    const r = this.el.getBoundingClientRect();
    return { x: r.left + p.x + this.layoutState.tileW / 2, y: r.top + p.y + (this.layoutState.tileW * FACE_RATIO) / 2 };
  }

  get tileWidth(): number {
    return this.layoutState.tileW;
  }

  layout(animate: boolean): void {
    const W = this.el.clientWidth;
    const H = this.el.clientHeight;
    if (!W || !H) return;
    const slots = this.game.board.geo.slots;
    const minX = Math.min(...slots.map((s) => s.x));
    const maxX = Math.max(...slots.map((s) => s.x));
    const minY = Math.min(...slots.map((s) => s.y));
    const maxY = Math.max(...slots.map((s) => s.y));
    const maxLayer = Math.max(...slots.map((s) => s.layer));

    // Tray: sized for the tray limit, anchored above the bottom edge.
    const limit = this.game.limit;
    const trayPad = 10;
    const trayGap = 8;
    const trayTileW = Math.min(66, (Math.min(W, 520) - 32 - trayPad * 2 - trayGap * (limit - 1)) / limit);
    const trayInnerW = limit * trayTileW + (limit - 1) * trayGap;
    const trayH = trayTileW * BODY_RATIO + trayPad * 2;
    const trayBottom = 20;
    const trayTop = H - trayBottom - trayH;
    const trayX = (W - trayInnerW) / 2;
    this.trayEl.style.cssText = `left:${trayX - trayPad}px;top:${trayTop}px;width:${trayInnerW + trayPad * 2}px;height:${trayH}px;--well-w:${trayTileW}px;--well-gap:${trayGap}px;--well-h:${trayTileW * BODY_RATIO}px`;

    // Board: fit the footprint into the space above the tray.
    const areaTop = 8;
    const areaBottom = trayTop - 18;
    const areaW = W - 24;
    const areaH = areaBottom - areaTop;
    const spanTilesX = (maxX - minX) / 2 + 1 + maxLayer * Math.abs(LAYER_DX);
    const spanTilesY = ((maxY - minY) / 2) * FACE_RATIO + BODY_RATIO + maxLayer * Math.abs(LAYER_DY);
    const tileW = Math.min(76, areaW / spanTilesX, areaH / spanTilesY);
    const boardW = spanTilesX * tileW;
    const boardH = spanTilesY * tileW;
    const originX = (W - boardW) / 2 + maxLayer * Math.abs(LAYER_DX) * tileW;
    const originY = areaTop + (areaH - boardH) / 2 + maxLayer * Math.abs(LAYER_DY) * tileW;

    this.layoutState = { tileW, originX, originY, minX, minY, trayTileW, trayX, trayY: trayTop + trayPad, trayGap };
    this.el.style.setProperty('--tile-w', `${tileW}px`);
    this.el.style.setProperty('--tile-h', `${tileW * BODY_RATIO}px`);
    this.particles.resize();

    const ms = animate ? 300 : 0;
    for (const slot of slots) {
      if (this.game.board.isPresent(slot.id)) moveTo(this.tileEls[slot.id], this.boardPose(slot), ms);
    }
    this.trayOrder.forEach((slotId, i) => moveTo(this.tileEls[slotId], this.trayPose(i), ms));
  }

  private refreshBlocked(): void {
    const b = this.game.board;
    for (const slot of b.geo.slots) {
      if (b.isPresent(slot.id)) this.tileEls[slot.id].classList.toggle('blocked', !b.isFree(slot.id));
    }
  }

  private onPointer = (e: PointerEvent): void => {
    if (this.ended) return;
    const t = (e.target as HTMLElement).closest<HTMLElement>('.tile');
    if (!t || t.dataset.state) return;
    const slot = Number(t.dataset.slot);
    if (!this.game.canTap(slot)) {
      if (this.game.board.isPresent(slot)) shake(t, 3, 220);
      return;
    }
    e.preventDefault();
    this.cb.onTap(slot);
  };

  /** Apply the events returned by game.tap / game.undo. */
  apply(events: GameEvent[]): void {
    for (const ev of events) {
      switch (ev.type) {
        case 'tileToTray': {
          const el = this.tileEls[ev.slot];
          el.dataset.state = 'tray';
          el.classList.remove('blocked');
          el.style.zIndex = '5000';
          const match = events.find((x) => x.type === 'pairCleared' && x.slots[1] === ev.slot);
          let index: number;
          if (match && match.type === 'pairCleared') {
            // Land right on top of the partner already waiting in the tray.
            index = this.trayOrder.indexOf(match.slots[0]);
          } else {
            this.trayOrder.push(ev.slot);
            index = this.trayOrder.length - 1;
          }
          moveTo(el, this.trayPose(Math.max(0, index)), FLY_MS, { lift: 36, easing: EASE_OUT });
          break;
        }
        case 'pairCleared':
          void this.clearPair(ev.slots, ev.combo);
          break;
        case 'freed':
          for (const s of ev.slots) this.tileEls[s].classList.remove('blocked');
          break;
        case 'blocked':
          for (const s of ev.slots) this.tileEls[s].classList.add('blocked');
          break;
        case 'undone': {
          const el = this.tileEls[ev.slot];
          delete el.dataset.state;
          el.style.zIndex = '';
          this.trayOrder = this.trayOrder.filter((s) => s !== ev.slot);
          moveTo(el, this.boardPose(this.game.board.geo.slots[ev.slot]), 260, { lift: 24 });
          this.relayoutTray(260);
          break;
        }
        case 'danger':
          this.trayEl.classList.add('danger');
          break;
        case 'dangerEnd':
          this.trayEl.classList.remove('danger');
          break;
        case 'lose':
          void this.lose();
          break;
        case 'win':
          void this.win();
          break;
        case 'trayChanged':
          break;
      }
    }
  }

  private relayoutTray(delay: number): void {
    this.trayOrder.forEach((slotId, i) => moveTo(this.tileEls[slotId], this.trayPose(i), 220, { delay, easing: EASE_BACK }));
  }

  private async clearPair(slots: [number, number], combo: number): Promise<void> {
    const [a, b] = slots;
    const idx = this.trayOrder.indexOf(a);
    const at = this.trayPose(Math.max(0, idx));
    this.trayOrder = this.trayOrder.filter((s) => s !== a && s !== b);
    await wait(FLY_MS - 20);
    const ea = this.tileEls[a], eb = this.tileEls[b];
    const L = this.layoutState;
    const cx = at.x + (L.trayTileW) / 2;
    const cy = at.y + (L.trayTileW * BODY_RATIO) / 2;
    this.particles.burst(cx, cy, 1 + (combo - 1) * 0.45);
    if (combo >= 2) this.comboLabel(combo, this.el.clientWidth / 2, at.y - 8);
    const offset = { ...at, x: at.x + 6 };
    const h = L.tileW * BODY_RATIO;
    await Promise.all([popOut(ea, at, L.tileW, h, POP_MS), popOut(eb, offset, L.tileW, h, POP_MS)]);
    ea.remove();
    eb.remove();
    this.relayoutTray(0);
  }

  private comboEl: HTMLElement | null = null;

  private comboLabel(combo: number, x: number, y: number): void {
    this.comboEl?.remove();
    const el = document.createElement('div');
    this.comboEl = el;
    el.className = 'combo-label';
    el.textContent = `Combo ×${combo}`;
    el.style.left = `${x}px`;
    el.style.top = `${y}px`;
    this.el.appendChild(el);
    el.animate(
      [
        { transform: 'translate(-50%, 0) scale(.6)', opacity: 0 },
        { transform: 'translate(-50%, -28px) scale(1.1)', opacity: 1, offset: 0.25 },
        { transform: 'translate(-50%, -52px) scale(1)', opacity: 0 },
      ],
      { duration: 900, easing: 'ease-out' },
    ).finished.then(() => el.remove(), () => el.remove());
  }

  private async lose(): Promise<void> {
    this.ended = true;
    this.trayEl.classList.remove('danger');
    this.trayEl.classList.add('full');
    await wait(FLY_MS + 40);
    shake(this.trayEl, 10, 480);
    for (const s of this.trayOrder) shake(this.tileEls[s], 10, 480);
    await wait(700);
    this.cb.onEnd('lost');
  }

  private async win(): Promise<void> {
    this.ended = true;
    await wait(FLY_MS + POP_MS + 60);
    const r = this.el.getBoundingClientRect();
    const preset = this.theme.particles;
    this.particles.burst(r.width * 0.3, r.height * 0.45, 3, preset);
    this.particles.burst(r.width * 0.7, r.height * 0.4, 3, preset);
    await wait(250);
    this.particles.burst(r.width * 0.5, r.height * 0.3, 3.5, preset);
    await wait(650);
    this.cb.onEnd('won');
  }

  /** Board tile elements by slot (tests and tutorial). */
  tileEl(slot: number): HTMLElement {
    return this.tileEls[slot];
  }

  /** Rebuild wells after the tray limit changes. */
  limitChanged(): void {
    this.buildWells();
    this.layout(true);
  }

  destroy(): void {
    this.resizeObs.disconnect();
    this.el.removeEventListener('pointerdown', this.onPointer);
    this.particles.destroy();
    this.el.remove();
  }
}

