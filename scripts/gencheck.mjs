// Generator check (spec §11): 10,000 seeds across levels 1–200, each replayed
// through the real rules; plus difficulty-band checks on Journey levels 1–300.
// Usage: node scripts/gencheck.mjs [seeds=10000]
import { Worker } from 'node:worker_threads';
import { availableParallelism } from 'node:os';

const SEEDS = Number(process.argv[2] ?? 10000);
const BAND_LEVELS = Array.from({ length: 300 }, (_, i) => i + 1);
const workers = Math.max(1, Math.min(8, availableParallelism()));
const t0 = performance.now();

const jobs = Array.from({ length: workers }, (_, w) => ({
  from: Math.floor((SEEDS * w) / workers),
  to: Math.floor((SEEDS * (w + 1)) / workers),
  bandLevels: BAND_LEVELS.filter((_, i) => i % workers === w),
}));

const results = await Promise.all(
  jobs.map(
    (job) =>
      new Promise((resolve, reject) => {
        const w = new Worker(new URL('./gencheck-worker.ts', import.meta.url), { workerData: job });
        w.once('message', resolve);
        w.once('error', reject);
      }),
  ),
);

const replayed = results.reduce((a, r) => a + r.replayed, 0);
const failures = results.flatMap((r) => r.failures);
const bands = results.flatMap((r) => r.bands).sort((a, b) => a.level - b.level);
const scored = bands.filter((b) => b.level >= 11);
const inBand = scored.filter((b) => b.inBand).length;
const tooHard = bands.filter((b) => b.rate < b.min - 0.05);

console.log(`replayed ${replayed}/${SEEDS} seeds; ${failures.length} failures`);
for (const f of failures.slice(0, 20)) console.log(`  ✗ ${f}`);
console.log(`difficulty: ${inBand}/${scored.length} Journey levels 11–300 in band (${((100 * inBand) / scored.length).toFixed(1)}%)`);
for (const b of tooHard) console.log(`  ✗ level ${b.level} (${b.band}) harder than intended: ${b.rate.toFixed(2)}`);
console.log(`done in ${((performance.now() - t0) / 1000).toFixed(1)} s on ${workers} threads`);

const ok = failures.length === 0 && inBand / scored.length >= 0.9 && tooHard.length === 0;
process.exit(ok ? 0 : 1);
