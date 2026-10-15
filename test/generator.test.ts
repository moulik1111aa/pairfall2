import { test } from 'node:test';
import assert from 'node:assert/strict';
import { generate, MAX_PAIRS_PER_KIND, THEME_KINDS } from '../src/gen/generator.ts';
import { settingsFor, bandFor, type Band } from '../src/gen/curve.ts';
import { Game } from '../src/core/game.ts';

/** Representative levels for each band. */
const levelsFor = (band: Band) => {
  const out: number[] = [];
  for (let n = 1; out.length < 25; n++) if (bandFor(n) === band) out.push(n);
  return out;
};

for (const band of ['easy', 'normal', 'hard'] as const) {
  test(`${band}: replaying the built-in solution through the rules engine always wins (1000 seeds)`, () => {
    const levels = levelsFor(band);
    for (let i = 0; i < 1000; i++) {
      const settings = settingsFor(levels[i % levels.length]);
      const lv = generate(settings, 10_000 + i);
      const g = new Game(lv, () => 0);
      let peak = 0;
      for (const slot of lv.solution) {
        assert.ok(g.canTap(slot), `seed ${i}: solution taps a blocked tile`);
        g.tap(slot);
        peak = Math.max(peak, g.tray.length);
        assert.notEqual(g.status, 'lost', `seed ${i}: solution lost`);
      }
      assert.equal(g.status, 'won', `seed ${i}: solution did not win`);
      assert.ok(peak <= settings.targetPeak, `seed ${i}: peak ${peak} > target ${settings.targetPeak}`);
      assert.equal(lv.peak, peak);
    }
  });
}

test('every kind appears an even number of times, at most 4 pairs, within the theme set', () => {
  for (let i = 0; i < 200; i++) {
    const lv = generate(settingsFor(1 + (i % 120)), i);
    const counts = new Map<number, number>();
    for (const k of lv.kinds) counts.set(k, (counts.get(k) ?? 0) + 1);
    for (const [k, c] of counts) {
      assert.ok(k >= 0 && k < THEME_KINDS);
      assert.equal(c % 2, 0);
      assert.ok(c <= 2 * MAX_PAIRS_PER_KIND, `kind ${k} appears ${c} times`);
    }
  }
});

test('the same seed gives an identical level', () => {
  const s = settingsFor(37);
  assert.deepEqual(generate(s, 99), generate(s, 99));
  assert.notDeepEqual(generate(s, 99).kinds, generate(s, 100).kinds);
});

test('rejects a target peak at or above the tray limit', () => {
  assert.throws(() => generate({ ...settingsFor(20), targetPeak: 4, limit: 4 }, 1));
});
