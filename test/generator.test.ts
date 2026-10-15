import { test } from 'node:test';
import assert from 'node:assert/strict';
import { generate, MAX_PAIRS_PER_KIND, THEME_KINDS } from '../src/gen/generator.ts';
import { settingsFor, bandFor, type Band } from '../src/gen/curve.ts';
import { Game, WILD } from '../src/core/game.ts';

/** Representative levels for each band. */
const levelsFor = (band: Band) => {
  const out: number[] = [];
  for (let n = 1; out.length < 40; n++) if (bandFor(n) === band) out.push(n);
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

test('kinds come in pairs (one odd kind per wild), at most 4 pairs, within the theme set', () => {
  for (let i = 0; i < 200; i++) {
    const lv = generate(settingsFor(1 + (i % 120)), i);
    const counts = new Map<number, number>();
    for (const k of lv.kinds) counts.set(k, (counts.get(k) ?? 0) + 1);
    const wilds = counts.get(WILD) ?? 0;
    counts.delete(WILD);
    let odd = 0;
    for (const [k, c] of counts) {
      assert.ok(k >= 0 && k < THEME_KINDS);
      if (c % 2) odd++;
      assert.ok(c <= 2 * MAX_PAIRS_PER_KIND, `kind ${k} appears ${c} times`);
    }
    assert.equal(odd, wilds);
  }
});

test('special tiles appear from their introduction levels', () => {
  const sp = (n: number) => generate(settingsFor(n), 3).specials ?? {};
  assert.equal(sp(11).mystery?.length ?? 0, 0);
  assert.ok((sp(12).mystery?.length ?? 0) > 0);
  assert.equal(Object.keys(sp(19).frozen ?? {}).length, 0);
  assert.ok(Object.keys(sp(21).frozen ?? {}).length > 0);
  assert.equal(sp(27).locks?.length ?? 0, 0);
  assert.ok((sp(29).locks?.length ?? 0) > 0);
  assert.ok(!generate(settingsFor(34), 3).kinds.includes(WILD));
  assert.ok(generate(settingsFor(35), 3).kinds.includes(WILD));
});

test('the same seed gives an identical level', () => {
  const s = settingsFor(37);
  assert.deepEqual(generate(s, 99), generate(s, 99));
  assert.notDeepEqual(generate(s, 99).kinds, generate(s, 100).kinds);
});

test('rejects a target peak at or above the tray limit', () => {
  assert.throws(() => generate({ ...settingsFor(20), targetPeak: 4, limit: 4 }, 1));
});
