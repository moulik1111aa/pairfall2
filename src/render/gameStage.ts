// Draws the board and tray and animates tiles between them in response to game
// events. All tiles live in one stage layer so a tile can fly from the board into
// the tray without being re-parented.

import { WILD, type Game, type GameEvent } from '../core/game.ts';
import type { Slot } from '../core/board.ts';
import type { Theme } from '../themes/types.ts';
import { tileUrls, imageIndex, MYSTERY_IMAGE, TILE_W, TILE_H } from '../themes/prerender.ts';
import { Particles } from './particles.ts';
import { moveTo, flyTo, popOut, shake, hop, flash, wait, reducedMotion, poseTransform, EASE_BACK, type Pose } from './tweens.ts';
import { silentFeedback, type Feedback } from './feedback.ts';

const FACE_RATIO = 101.5 / TILE_W; // visible face height ÷ width
const BODY_RATIO = TILE_H / TILE_W; // full image height ÷ width
const LAYER_DX = -0.05; // per-layer shift, in tile widths
const LAYER_DY = -0.1;
/** Wells drawn when the tray has no limit (Zen mode); more tiles squeeze together. */
const OPEN_TRAY_WELLS = 7;

export const FLY_MS = 260;
export const POP_MS = 300;

const LOCK_SVG = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 10V7.5a5 5 0 0 1 10 0V10" fill="none" stroke="#26324A" stroke-width="2.6"/><rect x="4" y="10" width="16" height="12" rx="3" fill="#F2B33D" stroke="#26324A" stroke-width="1.8"/><circle cx="12" cy="15" r="1.8" fill="#26324A"/><path d="M12 16v3" stroke="#26324A" stroke-width="1.8" stroke-linecap="round"/></svg>`;
const KEY_SVG = `<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="8" cy="12" r="4.5" fill="#F2B33D" stroke="#26324A" stroke-width="1.8"/><circle cx="8" cy="12" r="1.6" fill="#26324A"/><path d="M12.5 12H21M17 12v3M20 12v2.5" fill="none" stroke="#26324A" stroke-width="2" stroke-linecap="round"/></svg>`;

export interface StageCallbacks {
  /** Called after win/lose animations finish. */
  onEnd(result: 'won' | 'lost'): void;
  /** Called for every tap on a tappable board tile (before the game is updated). */
  onTap(slot: number): void;
  /** Sound and vibration hooks. */
  feedback?: Feedback;
  /** Space kept free below the tray (for the power-up bar), in px. */
  bottomReserve?: number;
  /** Colour-blind help: numbered tile designs. */
  numbers?: boolean;
  /** Tiles that start face-down. */
  mystery?: readonly number[];
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
  trayInnerW: number;
}

export class GameStage {
  readonly el: HTMLElement;
  private readonly tilesLayer: HTMLElement;
  private readonly trayEl: HTMLElement;
  readonly particles: Particles;
  private readonly tileEls: HTMLElement[] = [];
  private layoutState!: Layout;
  private readonly resizeObs: ResizeObserver;
  private ended = false;
  /** Tray slots shown, in game.tray order (excludes tiles popping out). */
  private trayOrder: number[] = [];
  private readonly urls: string[];
  private readonly faceDown = new Set<number>();
  private hintTimer = 0;
  private xrayTimer = 0;
  private comboEl: HTMLElement | null = null;

  private readonly game: Game;
  private readonly theme: Theme;
  private readonly cb: StageCallbacks;
  private readonly fb: Feedback;
  private spinSign = 1;

  constructor(parent: HTMLElement, game: Game, theme: Theme, cb: StageCallbacks) {
    this.game = game;
    this.theme = theme;
    this.cb = cb;
    this.fb = cb.feedback ?? silentFeedback;
    this.urls = tileUrls(theme, { numbers: cb.numbers });
    this.el = document.createElement('div');
    this.el.className = 'stage';
    this.el.innerHTML = `<div class="tray"><div class="tray-glow"></div><div class="tray-wells"></div></div><div class="tiles"></div>`;
    parent.appendChild(this.el);
    this.tilesLayer = this.el.querySelector('.tiles')!;
    this.trayEl = this.el.querySelector('.tray')!;
    this.particles = new Particles(this.el, theme.particles);

    for (const s of cb.mystery ?? []) if (!game.board.isFree(s)) this.faceDown.add(s);
    const order = [...game.board.geo.slots].sort((a, b) => a.layer - b.layer || a.y - b.y || a.x - b.x);
    for (const slot of game.board.geo.slots) {
      const t = document.createElement('div');
      t.className = 'tile';
      t.dataset.slot = String(slot.id);
      t.setAttribute('role', 'button');
      this.tileEls[slot.id] = t;
      this.paintFace(slot.id);
      this.decorate(slot.id);
    }
    for (const slot of order) this.tilesLayer.appendChild(this.tileEls[slot.id]);
    this.buildWells();
    this.refreshBlocked();

    this.el.addEventListener('pointerdown', this.onPointer);
    this.resizeObs = new ResizeObserver(() => this.layout(false));
    this.resizeObs.observe(this.el);
    this.layout(false);
    this.dealIn();
  }

  // ── Tile faces and special-tile decorations ────────────────────────────────

  private label(slot: number): string {
    if (this.faceDown.has(slot)) return 'Face-down tile';
    const kind = this.game.kinds[slot];
    const name = kind === WILD ? 'Wild tile' : this.theme.tiles[kind % this.theme.tiles.length].name;
    const frost = this.game.frostOf(slot);
    if (frost > 0) return `${name}, frozen (${frost})`;
    if (this.game.isLocked(slot)) return `${name}, locked`;
    return name;
  }

  private paintFace(slot: number): void {
    const el = this.tileEls[slot];
    const img = this.faceDown.has(slot) ? MYSTERY_IMAGE : imageIndex(this.game.kinds[slot]);
    el.style.backgroundImage = `url("${this.urls[img]}")`;
    el.setAttribute('aria-label', this.label(slot));
  }

  private decorate(slot: number): void {
    const el = this.tileEls[slot];
    const r = this.game.rules;
    const frost = r.frost[slot];
    if (frost > 0) {
      el.classList.add('frozen');
      el.insertAdjacentHTML('beforeend', `<div class="ice" aria-hidden="true"><b>${frost}</b></div>`);
    }
    if (r.lockOf[slot] >= 0) {
      el.classList.add('locked');
      el.insertAdjacentHTML('beforeend', `<div class="padlock" aria-hidden="true">${LOCK_SVG}</div>`);
    }
    if (r.keyOf[slot] >= 0) el.insertAdjacentHTML('beforeend', `<div class="keybadge" aria-hidden="true">${KEY_SVG}</div>`);
  }

  /** Flip a tile over to a new face (mystery reveal, shuffle, wild). */
  private flip(slot: number, delay = 0): void {
    const el = this.tileEls[slot];
    if (reducedMotion()) {
      this.paintFace(slot);
      return;
    }
    const a = el.animate([{ scale: '1 1' }, { scale: '0 1.06' }, { scale: '1 1' }], { duration: 320, delay, easing: 'ease-in-out' });
    setTimeout(() => this.paintFace(slot), delay + 160);
    void a.finished.catch(() => undefined);
  }

  // ── Opening ────────────────────────────────────────────────────────────────

  /** Opening flourish: tiles drop onto the board layer by layer. */
  private dealIn(): void {
    if (reducedMotion() || !this.layoutState) return;
    const slots = this.game.board.geo.slots;
    const rows = [...new Set(slots.map((s) => s.y))].sort((a, b) => a - b);
    for (const slot of slots) {
      const el = this.tileEls[slot.id];
      const p = this.boardPose(slot);
      const delay = slot.layer * 110 + rows.indexOf(slot.y) * 18 + Math.random() * 40;
      el.animate(
        [
          { transform: poseTransform({ x: p.x, y: p.y - 70, s: 1 }), opacity: 0 },
          { transform: poseTransform(p), opacity: 1 },
        ],
        { duration: 420, delay, easing: EASE_BACK, fill: 'backwards' },
      );
    }
    this.fb.deal(slots.length);
  }

  // ── Layout ─────────────────────────────────────────────────────────────────

  private get wellCount(): number {
    return Number.isFinite(this.game.limit) ? this.game.limit : OPEN_TRAY_WELLS;
  }

  private buildWells(): void {
    const wells = this.trayEl.querySelector('.tray-wells')!;
    wells.innerHTML = '';
    for (let i = 0; i < this.wellCount; i++) {
      const w = document.createElement('div');
      w.className = 'well';
      wells.appendChild(w);
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
    const n = this.trayOrder.length;
    let step = L.trayTileW + L.trayGap;
    // An open tray (Zen) squeezes tiles together once it holds more than the wells.
    if (n > this.wellCount) step = (L.trayInnerW - L.trayTileW) / (n - 1);
    return { x: L.trayX + index * step, y: L.trayY, s: L.trayTileW / L.tileW };
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

    // Tray: sized for its wells, anchored above the power-up bar.
    const wells = this.wellCount;
    const trayPad = 10;
    const trayGap = 8;
    const trayTileW = Math.min(66, (Math.min(W, 520) - 32 - trayPad * 2 - trayGap * (wells - 1)) / wells);
    const trayInnerW = wells * trayTileW + (wells - 1) * trayGap;
    const trayH = trayTileW * BODY_RATIO + trayPad * 2;
    const trayBottom = 20 + (this.cb.bottomReserve ?? 0);
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

    this.layoutState = { tileW, originX, originY, minX, minY, trayTileW, trayX, trayY: trayTop + trayPad, trayGap, trayInnerW };
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

  // ── Input ──────────────────────────────────────────────────────────────────

  private onPointer = (e: PointerEvent): void => {
    if (this.ended) return;
    const t = (e.target as HTMLElement).closest<HTMLElement>('.tile');
    if (!t || t.dataset.state) return;
    const slot = Number(t.dataset.slot);
    if (!this.game.canTap(slot)) {
      if (this.game.board.isPresent(slot)) {
        shake(t, 3, 220);
        if (this.game.board.isFree(slot)) {
          // uncovered but frozen or locked: draw attention to what holds it
          const badge = t.querySelector<HTMLElement>('.ice, .padlock');
          badge?.animate([{ scale: '1' }, { scale: '1.15' }, { scale: '1' }], { duration: 260 });
        }
      }
      return;
    }
    e.preventDefault();
    this.clearHint();
    this.cb.onTap(slot);
  };

  // ── Events ─────────────────────────────────────────────────────────────────

  /** Apply the events returned by the game. */
  apply(events: GameEvent[]): void {
    for (const ev of events) {
      switch (ev.type) {
        case 'tileToTray': {
          const el = this.tileEls[ev.slot];
          el.dataset.state = 'tray';
          el.classList.remove('blocked');
          el.style.zIndex = '5000';
          if (this.faceDown.delete(ev.slot)) this.paintFace(ev.slot);
          const match = events.find((x) => x.type === 'pairCleared' && x.slots[1] === ev.slot);
          let index: number;
          if (match && match.type === 'pairCleared') {
            // Land right on top of the partner already waiting in the tray.
            index = this.trayOrder.indexOf(match.slots[0]);
          } else {
            this.trayOrder.push(ev.slot);
            index = this.trayOrder.length - 1;
            if (this.trayOrder.length > this.wellCount) this.relayoutTray(0);
          }
          this.spinSign = -this.spinSign;
          flyTo(el, this.trayPose(Math.max(0, index)), FLY_MS, 7 * this.spinSign);
          this.fb.tap();
          if (!match) setTimeout(() => this.fb.land(), FLY_MS * 0.8);
          break;
        }
        case 'pairCleared':
          void this.clearPair(ev.slots, ev.combo);
          break;
        case 'freed':
          for (const s of ev.slots) {
            const el = this.tileEls[s];
            el.classList.remove('blocked');
            if (this.faceDown.delete(s)) this.flip(s, 120);
            else hop(el, 5, 90);
          }
          break;
        case 'blocked':
          for (const s of ev.slots) this.tileEls[s].classList.add('blocked');
          break;
        case 'chilled':
          for (const s of ev.slots) {
            const b = this.tileEls[s].querySelector('.ice b');
            if (b) b.textContent = String(this.game.frostOf(s));
            this.tileEls[s].querySelector('.ice')?.animate([{ scale: '1' }, { scale: '1.08' }, { scale: '1' }], { duration: 300 });
            this.paintFace(s);
          }
          break;
        case 'thawed':
          for (const s of ev.slots) void this.thaw(s);
          break;
        case 'unlocked':
          for (const s of ev.slots) void this.unlock(s);
          break;
        case 'wildified':
          setTimeout(() => {
            flash(this.tileEls[ev.slot], 400);
            this.flip(ev.slot);
          }, FLY_MS + POP_MS);
          break;
        case 'shuffled':
          ev.slots.forEach((s, i) => {
            this.faceDown.delete(s);
            this.flip(s, (i % 12) * 25);
          });
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
          this.fb.danger(true);
          break;
        case 'dangerEnd':
          this.trayEl.classList.remove('danger');
          this.fb.danger(false);
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

  private async thaw(slot: number): Promise<void> {
    const el = this.tileEls[slot];
    el.classList.remove('frozen');
    this.paintFace(slot);
    const ice = el.querySelector<HTMLElement>('.ice');
    if (!ice) return;
    const r = el.getBoundingClientRect();
    const host = this.el.getBoundingClientRect();
    this.particles.burst(r.left - host.left + r.width / 2, r.top - host.top + r.height / 2, 0.8, {
      colors: ['#FFFFFF', '#CFE8FF', '#9CCBF2'],
      shape: 'spark',
      count: 16,
      gravity: 300,
    });
    if (!reducedMotion()) {
      await ice.animate([{ opacity: 1, scale: '1' }, { opacity: 0, scale: '1.25' }], { duration: 320, easing: 'ease-out' }).finished.catch(() => undefined);
    }
    ice.remove();
    hop(el, 6);
  }

  private async unlock(slot: number): Promise<void> {
    const el = this.tileEls[slot];
    el.classList.remove('locked');
    this.paintFace(slot);
    const lock = el.querySelector<HTMLElement>('.padlock');
    if (!lock) return;
    if (!reducedMotion()) {
      await lock
        .animate(
          [
            { transform: 'translate(0,0) rotate(0)', opacity: 1 },
            { transform: 'translate(0,-10px) rotate(-12deg)', opacity: 1, offset: 0.4 },
            { transform: 'translate(10px,24px) rotate(30deg)', opacity: 0 },
          ],
          { duration: 520, easing: 'ease-in' },
        )
        .finished.catch(() => undefined);
    }
    lock.remove();
    flash(el, 300);
    hop(el, 6);
  }

  private relayoutTray(delay: number): void {
    this.trayOrder.forEach((slotId, i) => moveTo(this.tileEls[slotId], this.trayPose(i), 220, { delay, easing: EASE_BACK }));
  }

  private async clearPair(slots: [number, number], combo: number): Promise<void> {
    const [a, b] = slots;
    const idx = this.trayOrder.indexOf(a);
    const at = this.trayPose(Math.max(0, idx));
    this.trayOrder = this.trayOrder.filter((s) => s !== a && s !== b);
    await wait(FLY_MS - 30);
    const ea = this.tileEls[a], eb = this.tileEls[b];
    const L = this.layoutState;
    const cx = at.x + L.trayTileW / 2;
    const cy = at.y + (L.trayTileW * BODY_RATIO) / 2;
    // the pair glows white, a shockwave rings out, petals burst
    flash(ea);
    flash(eb);
    this.fb.match(combo);
    this.particles.ring(cx, cy, L.trayTileW * (1.1 + Math.min(combo, 6) * 0.12));
    if (combo >= 3) this.particles.ring(cx, cy, L.trayTileW * 1.9, '#F2C14E', 0.6);
    this.particles.burst(cx, cy, Math.min(3, 1 + (combo - 1) * 0.4));
    if (combo >= 2) this.comboLabel(combo, this.el.clientWidth / 2, at.y - 8);
    const offset = { ...at, x: at.x + 6 };
    const h = L.tileW * BODY_RATIO;
    await Promise.all([popOut(ea, at, L.tileW, h, POP_MS, -14), popOut(eb, offset, L.tileW, h, POP_MS, 14)]);
    ea.remove();
    eb.remove();
    this.relayoutTray(0);
  }

  private comboLabel(combo: number, x: number, y: number): void {
    this.comboEl?.remove();
    const el = document.createElement('div');
    this.comboEl = el;
    const tier = combo >= 6 ? 3 : combo >= 4 ? 2 : 1;
    el.className = `combo-label tier-${tier}`;
    el.textContent = `Combo ×${combo}`;
    el.style.left = `${x}px`;
    el.style.top = `${y}px`;
    this.el.appendChild(el);
    const big = 1 + (tier - 1) * 0.18;
    const tilt = (Math.random() - 0.5) * 8;
    el.animate(
      [
        { transform: `translate(-50%, 0) scale(${0.4 * big}) rotate(${tilt}deg)`, opacity: 0 },
        { transform: `translate(-50%, -30px) scale(${1.25 * big}) rotate(${-tilt / 2}deg)`, opacity: 1, offset: 0.22 },
        { transform: `translate(-50%, -38px) scale(${1 * big}) rotate(0deg)`, opacity: 1, offset: 0.6 },
        { transform: `translate(-50%, -60px) scale(${1 * big})`, opacity: 0 },
      ],
      { duration: 1000, easing: 'ease-out' },
    ).finished.then(() => el.remove(), () => el.remove());
  }

  // ── Power-up visuals ───────────────────────────────────────────────────────

  /** Glow the suggested tiles until the next tap (or 4 s). */
  showHint(slots: number[]): void {
    this.clearHint();
    for (const s of slots) this.tileEls[s].classList.add('hint');
    this.hintTimer = window.setTimeout(() => this.clearHint(), 4000);
  }

  private clearHint(): void {
    clearTimeout(this.hintTimer);
    for (const el of this.tilesLayer.querySelectorAll('.tile.hint')) el.classList.remove('hint');
  }

  /** See through the top tiles for a few seconds; face-down tiles show their faces. */
  xray(ms = 3000): void {
    clearTimeout(this.xrayTimer);
    this.el.classList.add('xray');
    for (const s of this.faceDown) this.tileEls[s].style.backgroundImage = `url("${this.urls[imageIndex(this.game.kinds[s])]}")`;
    this.xrayTimer = window.setTimeout(() => {
      this.el.classList.remove('xray');
      for (const s of this.faceDown) this.paintFace(s);
    }, ms);
  }

  /** Rebuild wells after the tray limit changes. */
  limitChanged(): void {
    this.buildWells();
    this.layout(true);
    this.trayEl.querySelectorAll<HTMLElement>('.well').forEach((w, i) => {
      if (i === this.wellCount - 1) w.animate([{ scale: '0.4', opacity: 0 }, { scale: '1', opacity: 1 }], { duration: 360, easing: 'cubic-bezier(.34,1.56,.64,1)' });
    });
  }

  /** Undo the end-of-game state after Continue. */
  revive(): void {
    this.ended = false;
    this.trayEl.classList.remove('full');
    for (const s of this.trayOrder) this.tileEls[s].classList.remove('bad');
    this.refreshBlocked();
  }

  // ── Endings ────────────────────────────────────────────────────────────────

  private async lose(): Promise<void> {
    this.ended = true;
    this.trayEl.classList.remove('danger');
    this.fb.danger(false);
    await wait(FLY_MS + 40);
    this.trayEl.classList.add('full');
    this.fb.lose();
    shake(this.trayEl, 10, 480);
    for (const s of this.trayOrder) {
      this.tileEls[s].classList.add('bad');
      shake(this.tileEls[s], 10, 480);
    }
    // everything still on the board fades back so the full tray reads clearly
    for (const slot of this.game.board.presentSlots()) this.tileEls[slot].classList.add('blocked');
    await wait(800);
    this.cb.onEnd('lost');
  }

  private async win(): Promise<void> {
    this.ended = true;
    this.fb.danger(false);
    await wait(FLY_MS + POP_MS + 40);
    this.fb.win();
    const r = this.el.getBoundingClientRect();
    const preset = this.theme.particles;
    this.particles.ring(r.width / 2, r.height * 0.42, r.width * 0.45, '#FFFFFF', 0.7);
    this.particles.burst(r.width * 0.3, r.height * 0.45, 3, preset);
    this.particles.burst(r.width * 0.7, r.height * 0.4, 3, preset);
    this.particles.rain(110, preset);
    await wait(260);
    this.particles.ring(r.width / 2, r.height * 0.42, r.width * 0.7, '#F2C14E', 0.8);
    this.particles.burst(r.width * 0.5, r.height * 0.3, 3.5, preset);
    await wait(700);
    this.cb.onEnd('won');
  }

  /** Board tile elements by slot (tests and tutorial). */
  tileEl(slot: number): HTMLElement {
    return this.tileEls[slot];
  }

  destroy(): void {
    clearTimeout(this.hintTimer);
    clearTimeout(this.xrayTimer);
    this.resizeObs.disconnect();
    this.el.removeEventListener('pointerdown', this.onPointer);
    this.particles.destroy();
    this.el.remove();
  }
}
