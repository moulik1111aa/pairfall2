// Worker for scripts/gencheck.mjs: checks a range of seeds and reports failures.
import { parentPort, workerData } from 'node:worker_threads';
import { generate, MAX_PAIRS_PER_KIND } from '../src/gen/generator.ts';
import { settingsFor } from '../src/gen/curve.ts';
import { makeJourneyLevel } from '../src/gen/levels.ts';
import { Game, WILD } from '../src/core/game.ts';

interface Job {
  from: number;
  to: number;
  bandLevels: number[];
}

const { from, to, bandLevels } = workerData as Job;
const failures: string[] = [];
let replayed = 0;

for (let seed = from; seed < to; seed++) {
  const level = 1 + (seed % 200);
  const settings = settingsFor(level);
  try {
    const lv = generate(settings, 0x9e3779b9 ^ seed);
    // 1. The built-in solution, replayed through the real game, must win.
    const g = new Game(lv, () => 0);
    let peak = 0;
    for (const slot of lv.solution) {
      if (!g.canTap(slot)) throw new Error('solution taps an untappable tile');
      g.tap(slot);
      peak = Math.max(peak, g.tray.length);
      if (g.status === 'lost') throw new Error(`solution lost (${g.lossReason})`);
    }
    if (g.status !== 'won') throw new Error('solution did not win');
    if (peak > settings.targetPeak) throw new Error(`peak ${peak} > target ${settings.targetPeak}`);
    // 2. Tiles come in pairs: one odd kind per wild, at most four pairs of a kind.
    const counts = new Map<number, number>();
    for (const k of lv.kinds) counts.set(k, (counts.get(k) ?? 0) + 1);
    const wilds = counts.get(WILD) ?? 0;
    counts.delete(WILD);
    let odd = 0;
    for (const c of counts.values()) {
      if (c % 2) odd++;
      if (c > 2 * MAX_PAIRS_PER_KIND) throw new Error(`a kind appears ${c} times`);
    }
    if (odd !== wilds) throw new Error(`${odd} unpaired kinds for ${wilds} wilds`);
    replayed++;
  } catch (e) {
    failures.push(`seed ${seed} (level ${level}): ${(e as Error).message}`);
  }
}

// 3. Difficulty bands for real Journey levels.
const bands: { level: number; band: string; rate: number; min: number; inBand: boolean }[] = [];
for (const n of bandLevels) {
  const L = makeJourneyLevel(n);
  const b = L.settings.range;
  bands.push({ level: n, band: L.settings.band, rate: L.winRate, min: b.min, inBand: L.winRate >= b.min && L.winRate <= b.max });
}

parentPort!.postMessage({ replayed, failures, bands });
