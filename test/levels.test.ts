import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeJourneyLevel, makeLevelFrom } from '../src/gen/levels.ts';
import { generate } from '../src/gen/generator.ts';
import { winRate } from '../src/gen/bot.ts';
import { BANDS, settingsFor } from '../src/gen/curve.ts';
import { Game } from '../src/core/game.ts';

test('journey levels are deterministic', () => {
  assert.deepEqual(makeJourneyLevel(37).kinds, makeJourneyLevel(37).kinds);
});

test('win rates land in band for levels 11+ and are never harder than intended', () => {
  let inBand = 0, total = 0;
  for (let n = 1; n <= 120; n++) {
    const L = makeJourneyLevel(n);
    const b = L.settings.range;
    assert.ok(L.winRate >= b.min - 0.05, `level ${n} (${L.settings.band}) too hard: ${L.winRate}`);
    if (n >= 11) {
      total++;
      if (L.winRate >= b.min && L.winRate <= b.max) inBand++;
    }
  }
  assert.ok(inBand / total >= 0.9, `only ${inBand}/${total} in band`);
});

test('first-attempt generation of a 120-tile level takes < 300 ms', () => {
  const s = settingsFor(60);
  assert.equal(s.tiles, 120);
  const t0 = performance.now();
  const lv = generate(s, 5);
  winRate(lv, 300, 5);
  const ms = performance.now() - t0;
  assert.ok(ms < 300, `${ms.toFixed(0)} ms`);
});

test('fallback level is used when generation keeps failing, and it is winnable', () => {
  const L = makeLevelFrom('sabotage', settingsFor(20), { sabotage: true });
  assert.equal(L.fallback, true);
  const g = new Game(L, () => 0);
  for (const s of L.solution) g.tap(s);
  assert.equal(g.status, 'won');
});

test('the bot wins more on easy settings than on hard ones', () => {
  const easy = generate(settingsFor(25), 1);
  const hard = generate(settingsFor(60), 1);
  assert.ok(winRate(easy, 300, 1) > winRate(hard, 300, 1));
});
