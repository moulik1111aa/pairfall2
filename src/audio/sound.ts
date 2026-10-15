// Sound effects and ambient music, synthesised with Web Audio (no audio files).
// Plucks use Karplus–Strong string synthesis for a koto-like tone; bells are
// inharmonic sine partials; wood taps are filtered noise.

import { matchNotes, scaleFreq, YO, IN } from './scale.ts';

type Ctx = AudioContext;

export class Sound {
  private ctx: Ctx | null = null;
  private sfxBus!: GainNode;
  private musicBus!: GainNode;
  private musicFilter!: BiquadFilterNode;
  private sfxOn: boolean;
  private musicOn: boolean;
  private musicTimer = 0;
  private heartTimer = 0;
  private padNodes: AudioNode[] = [];
  private readonly ksCache = new Map<number, AudioBuffer>();
  private noise: AudioBuffer | null = null;

  constructor(sfxOn: boolean, musicOn: boolean) {
    this.sfxOn = sfxOn;
    this.musicOn = musicOn;
  }

  /** Create or resume the audio context. Must run inside a user gesture the first time. */
  unlock(): void {
    try {
      if (!this.ctx) {
        const AC: typeof AudioContext | undefined =
          window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
        if (!AC) return;
        const ctx = new AC({ latencyHint: 'interactive' });
        this.ctx = ctx;
        const master = ctx.createDynamicsCompressor();
        master.threshold.value = -14;
        master.ratio.value = 4;
        master.connect(ctx.destination);
        this.sfxBus = ctx.createGain();
        this.sfxBus.gain.value = 0.75;
        this.sfxBus.connect(master);
        this.musicFilter = ctx.createBiquadFilter();
        this.musicFilter.type = 'lowpass';
        this.musicFilter.frequency.value = 7000;
        this.musicFilter.connect(master);
        this.musicBus = ctx.createGain();
        this.musicBus.gain.value = 0;
        this.musicBus.connect(this.musicFilter);
        const len = ctx.sampleRate;
        this.noise = ctx.createBuffer(1, len, ctx.sampleRate);
        const d = this.noise.getChannelData(0);
        for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
      }
      if (this.ctx.state === 'suspended') void this.ctx.resume();
      if (this.musicOn) this.startMusic();
    } catch {
      this.ctx = null;
    }
  }

  get ready(): boolean {
    return !!this.ctx && this.ctx.state === 'running';
  }

  setSound(on: boolean): void {
    this.sfxOn = on;
    if (!on) this.danger(false);
  }

  setMusic(on: boolean): void {
    this.musicOn = on;
    if (on) this.startMusic();
    else this.stopMusic();
  }

  /** App went to the background / came back. */
  suspend(): void {
    void this.ctx?.suspend();
  }
  resume(): void {
    if (this.ctx && this.ctx.state === 'suspended') void this.ctx.resume();
  }

  // ── Effects ────────────────────────────────────────────────────────────────

  /** Picking a tile up: a soft wooden tock. */
  tap(): void {
    const t = this.now();
    if (t === null) return;
    this.noiseHit(t, 1900 + Math.random() * 300, 6, 0.22, 0.045);
    this.tone(t, 520 + Math.random() * 40, 0.12, 0.05, 'sine', 0.6);
  }

  /** A tile settling into the tray. */
  land(): void {
    const t = this.now();
    if (t === null) return;
    this.noiseHit(t, 1200, 4, 0.12, 0.06);
    this.tone(t, 300, 0.1, 0.07, 'triangle', 0.7);
  }

  /** A pair clears: a rising two-note pluck; bigger combos add a bell shimmer. */
  match(combo: number): void {
    const t = this.now();
    if (t === null) return;
    const [a, b] = matchNotes(combo);
    this.pluck(a, t, 0.5);
    this.pluck(b, t + 0.07, 0.45);
    if (combo >= 3) this.bell(b * 2, t + 0.12, 0.08 + Math.min(combo, 8) * 0.012, 1.4);
  }

  /** Tiles being dealt onto the board. */
  deal(count: number): void {
    const t = this.now();
    if (t === null) return;
    const n = Math.min(8, Math.ceil(count / 12));
    for (let i = 0; i < n; i++) this.noiseHit(t + i * 0.07 + Math.random() * 0.03, 1600 + Math.random() * 800, 5, 0.07, 0.04);
  }

  /** UI button press. */
  click(): void {
    const t = this.now();
    if (t === null) return;
    this.tone(t, 880, 0.06, 0.04, 'sine', 0.8);
  }

  /** Heartbeat while the tray is one tile from full; muffles the music. */
  danger(on: boolean): void {
    clearInterval(this.heartTimer);
    this.heartTimer = 0;
    if (this.ctx) {
      const f = this.musicFilter.frequency;
      f.cancelScheduledValues(this.ctx.currentTime);
      f.setTargetAtTime(on ? 650 : 7000, this.ctx.currentTime, 0.25);
    }
    if (!on || !this.sfxOn) return;
    const beat = () => {
      const t = this.now();
      if (t === null) return;
      this.thump(t, 0.5);
      this.thump(t + 0.16, 0.32);
    };
    beat();
    this.heartTimer = window.setInterval(beat, 850);
  }

  win(): void {
    const t = this.now();
    if (t === null) return;
    this.danger(false);
    [0, 2, 4, 5, 7, 9].forEach((s, i) => this.pluck(scaleFreq(s, YO), t + i * 0.09, 0.42));
    this.bell(scaleFreq(10, YO), t + 0.6, 0.22, 2.4);
    this.bell(scaleFreq(7, YO), t + 0.62, 0.12, 2.2);
  }

  lose(): void {
    const t = this.now();
    if (t === null) return;
    this.danger(false);
    [7, 5, 4, 2, 0].forEach((s, i) => this.pluck(scaleFreq(s, IN, 220), t + i * 0.14, 0.4));
    this.gong(t + 0.75);
  }

  // ── Music ──────────────────────────────────────────────────────────────────

  private startMusic(): void {
    if (!this.ctx || this.musicTimer) return;
    const ctx = this.ctx;
    this.musicBus.gain.cancelScheduledValues(ctx.currentTime);
    this.musicBus.gain.setTargetAtTime(0.32, ctx.currentTime, 1.2);
    // A soft drone on D and A, slowly breathing.
    for (const [f, g] of [[73.42, 0.05], [110, 0.035], [146.83, 0.02]] as const) {
      const o = ctx.createOscillator();
      o.type = 'sine';
      o.frequency.value = f;
      const gain = ctx.createGain();
      gain.gain.value = g;
      const lfo = ctx.createOscillator();
      lfo.frequency.value = 0.07 + Math.random() * 0.05;
      const lfoGain = ctx.createGain();
      lfoGain.gain.value = g * 0.6;
      lfo.connect(lfoGain).connect(gain.gain);
      o.connect(gain).connect(this.musicBus);
      o.start();
      lfo.start();
      this.padNodes.push(o, lfo);
    }
    // Sparse koto phrases from the yo scale.
    const phrase = () => {
      if (!this.ctx || this.ctx.state !== 'running') return;
      const t = this.ctx.currentTime + 0.05;
      const start = Math.floor(Math.random() * 6);
      const notes = 1 + Math.floor(Math.random() * 3);
      for (let i = 0; i < notes; i++) {
        const step = start + (Math.random() < 0.5 ? i : -i) + (Math.random() < 0.2 ? 2 : 0);
        this.pluck(scaleFreq(step, YO, 146.83), t + i * (0.35 + Math.random() * 0.25), 0.22, this.musicBus);
      }
    };
    phrase();
    this.musicTimer = window.setInterval(phrase, 2600);
  }

  private stopMusic(): void {
    clearInterval(this.musicTimer);
    this.musicTimer = 0;
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    this.musicBus.gain.cancelScheduledValues(now);
    this.musicBus.gain.setTargetAtTime(0, now, 0.3);
    const nodes = this.padNodes.splice(0);
    setTimeout(() => nodes.forEach((n) => (n as OscillatorNode).stop?.()), 1500);
  }

  // ── Synthesis primitives ───────────────────────────────────────────────────

  /** Current audio time, or null when effects are off or audio isn't running. */
  private now(): number | null {
    if (!this.sfxOn || !this.ctx || this.ctx.state !== 'running') return null;
    return this.ctx.currentTime + 0.005;
  }

  /** Karplus–Strong plucked string, cached per pitch. */
  private pluck(freq: number, t: number, gain: number, bus: AudioNode = this.sfxBus): void {
    const ctx = this.ctx!;
    const key = Math.round(freq * 10);
    let buf = this.ksCache.get(key);
    if (!buf) {
      const sr = ctx.sampleRate;
      const dur = 1.6;
      buf = ctx.createBuffer(1, Math.floor(sr * dur), sr);
      const out = buf.getChannelData(0);
      const n = Math.max(2, Math.round(sr / freq));
      const ring = new Float32Array(n);
      let prev = 0;
      for (let i = 0; i < n; i++) {
        // slightly low-passed noise burst → a softer, woody attack
        prev = prev * 0.45 + (Math.random() * 2 - 1) * 0.55;
        ring[i] = prev;
      }
      const decay = 0.9965;
      for (let i = 0, j = 0; i < out.length; i++) {
        const next = (j + 1) % n;
        const v = ring[j];
        out[i] = v;
        ring[j] = decay * 0.5 * (v + ring[next]);
        j = next;
      }
      const fade = Math.floor(sr * 0.2);
      for (let i = 0; i < fade; i++) out[out.length - 1 - i] *= i / fade;
      this.ksCache.set(key, buf);
    }
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const g = ctx.createGain();
    g.gain.value = gain;
    src.connect(g).connect(bus);
    src.start(t);
  }

  private bell(freq: number, t: number, gain: number, dur: number): void {
    const ctx = this.ctx!;
    for (const [ratio, amp] of [[1, 1], [2.76, 0.45], [5.4, 0.25], [8.93, 0.12]] as const) {
      const o = ctx.createOscillator();
      o.type = 'sine';
      o.frequency.value = freq * ratio;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(gain * amp, t + 0.006);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur / ratio ** 0.4);
      o.connect(g).connect(this.sfxBus);
      o.start(t);
      o.stop(t + dur + 0.1);
    }
  }

  private gong(t: number): void {
    const ctx = this.ctx!;
    for (const [f, amp, dur] of [[82, 0.32, 2.6], [123.7, 0.16, 2.2], [196.4, 0.08, 1.6], [261, 0.05, 1.2]] as const) {
      const o = ctx.createOscillator();
      o.type = 'sine';
      o.frequency.setValueAtTime(f * 1.01, t);
      o.frequency.exponentialRampToValueAtTime(f, t + 0.5);
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(amp, t + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(g).connect(this.sfxBus);
      o.start(t);
      o.stop(t + dur + 0.1);
    }
  }

  private thump(t: number, gain: number): void {
    const ctx = this.ctx!;
    const o = ctx.createOscillator();
    o.type = 'sine';
    o.frequency.setValueAtTime(95, t);
    o.frequency.exponentialRampToValueAtTime(48, t + 0.14);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(gain, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.2);
    o.connect(g).connect(this.sfxBus);
    o.start(t);
    o.stop(t + 0.25);
  }

  private tone(t: number, freq: number, gain: number, dur: number, type: OscillatorType, drop: number): void {
    const ctx = this.ctx!;
    const o = ctx.createOscillator();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    o.frequency.exponentialRampToValueAtTime(freq * drop, t + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(gain, t + 0.004);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(this.sfxBus);
    o.start(t);
    o.stop(t + dur + 0.02);
  }

  private noiseHit(t: number, freq: number, q: number, gain: number, dur: number): void {
    const ctx = this.ctx!;
    const src = ctx.createBufferSource();
    src.buffer = this.noise;
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = freq;
    bp.Q.value = q;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(gain, t + 0.002);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(bp).connect(g).connect(this.sfxBus);
    src.start(t, Math.random() * 0.5, dur + 0.02);
  }
}
