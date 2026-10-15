// Pooled Canvas 2D particle layer drawn above the board. The animation loop runs
// only while particles are alive, so an idle board costs nothing.

import type { ParticlePreset } from '../themes/types.ts';

interface P {
  alive: boolean;
  x: number;
  y: number;
  vx: number;
  vy: number;
  rot: number;
  vr: number;
  size: number;
  life: number;
  ttl: number;
  color: string;
  wobble: number;
}

const MAX = 600;

export class Particles {
  readonly canvas: HTMLCanvasElement;
  private readonly ctx: CanvasRenderingContext2D;
  private readonly pool: P[] = [];
  private alive = 0;
  private raf = 0;
  private last = 0;
  private dpr = 1;
  private w = 0;
  private h = 0;
  preset: ParticlePreset;

  constructor(parent: HTMLElement, preset: ParticlePreset) {
    this.preset = preset;
    this.canvas = document.createElement('canvas');
    this.canvas.className = 'fx-layer';
    this.canvas.setAttribute('aria-hidden', 'true');
    parent.appendChild(this.canvas);
    this.ctx = this.canvas.getContext('2d')!;
    for (let i = 0; i < MAX; i++) {
      this.pool.push({ alive: false, x: 0, y: 0, vx: 0, vy: 0, rot: 0, vr: 0, size: 0, life: 0, ttl: 0, color: '', wobble: 0 });
    }
    this.resize();
  }

  resize(): void {
    const r = this.canvas.getBoundingClientRect();
    // Soft petals do not need full device resolution; a lighter canvas keeps frames cheap.
    this.dpr = Math.min(1.5, window.devicePixelRatio || 1);
    this.w = r.width;
    this.h = r.height;
    this.canvas.width = Math.round(r.width * this.dpr);
    this.canvas.height = Math.round(r.height * this.dpr);
  }

  get activeCount(): number {
    return this.alive;
  }

  /** Burst at a point. `power` scales count and speed (combo, win). */
  burst(x: number, y: number, power = 1, preset: ParticlePreset = this.preset): void {
    const n = Math.min(160, Math.round(preset.count * power));
    let cursor = 0;
    for (let i = 0; i < n; i++) {
      while (cursor < MAX && this.pool[cursor].alive) cursor++;
      if (cursor >= MAX) break;
      const p = this.pool[cursor];
      const a = Math.random() * Math.PI * 2;
      const sp = (90 + Math.random() * 260) * Math.min(2.2, 0.75 + power * 0.25);
      p.alive = true;
      p.x = x;
      p.y = y;
      p.vx = Math.cos(a) * sp;
      p.vy = Math.sin(a) * sp - 140;
      p.rot = Math.random() * Math.PI * 2;
      p.vr = (Math.random() - 0.5) * 10;
      p.size = 4 + Math.random() * 5;
      p.life = 0;
      p.ttl = 0.7 + Math.random() * 0.7;
      p.color = preset.colors[(Math.random() * preset.colors.length) | 0];
      p.wobble = Math.random() * 6;
      this.alive++;
    }
    if (!this.raf) {
      this.last = performance.now();
      this.raf = requestAnimationFrame(this.tick);
    }
  }

  private tick = (now: number): void => {
    const dt = Math.min(0.05, (now - this.last) / 1000);
    this.last = now;
    const { ctx, dpr } = this;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, this.w, this.h);
    const g = this.preset.gravity;
    const shape = this.preset.shape;
    for (const p of this.pool) {
      if (!p.alive) continue;
      p.life += dt;
      if (p.life >= p.ttl) {
        p.alive = false;
        this.alive--;
        continue;
      }
      p.vx *= 1 - 1.8 * dt;
      p.vy = p.vy * (1 - 1.2 * dt) + g * dt;
      p.x += (p.vx + Math.sin(p.life * 6 + p.wobble) * 30) * dt;
      p.y += p.vy * dt;
      p.rot += p.vr * dt;
      const k = 1 - p.life / p.ttl;
      ctx.globalAlpha = Math.min(1, k * 1.6);
      ctx.fillStyle = p.color;
      const c = Math.cos(p.rot), sn = Math.sin(p.rot);
      ctx.setTransform(dpr * c, dpr * sn, -dpr * sn, dpr * c, dpr * p.x, dpr * p.y);
      ctx.beginPath();
      if (shape === 'petal') {
        ctx.ellipse(0, 0, p.size, p.size * 0.55, 0, 0, Math.PI * 2);
      } else if (shape === 'star') {
        for (let i = 0; i < 10; i++) {
          const r = i % 2 ? p.size * 0.45 : p.size;
          const a = (i / 10) * Math.PI * 2;
          ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
        }
        ctx.closePath();
      } else {
        ctx.rect(-p.size / 2, -p.size / 6, p.size, p.size / 3);
      }
      ctx.fill();
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.globalAlpha = 1;
    if (this.alive > 0) this.raf = requestAnimationFrame(this.tick);
    else {
      this.raf = 0;
      ctx.clearRect(0, 0, this.w, this.h);
    }
  };

  destroy(): void {
    cancelAnimationFrame(this.raf);
    this.canvas.remove();
  }
}
