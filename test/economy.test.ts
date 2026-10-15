import { test } from 'node:test';
import assert from 'node:assert/strict';
import { starsFor, coinsFor } from '../src/core/economy.ts';

const cases = [
  { run: { powerupsUsed: 0, dangerReached: false, comboBonusSteps: 0 }, stars: 3, coins: 25 },
  { run: { powerupsUsed: 0, dangerReached: true, comboBonusSteps: 0 }, stars: 2, coins: 20 },
  { run: { powerupsUsed: 1, dangerReached: false, comboBonusSteps: 4 }, stars: 2, coins: 24 },
  { run: { powerupsUsed: 2, dangerReached: false, comboBonusSteps: 0 }, stars: 1, coins: 15 },
  { run: { powerupsUsed: 3, dangerReached: true, comboBonusSteps: 10 }, stars: 1, coins: 25 },
];

for (const c of cases) {
  test(`stars ${c.stars}, coins ${c.coins} for ${JSON.stringify(c.run)}`, () => {
    assert.equal(starsFor(c.run), c.stars);
    assert.equal(coinsFor(c.run), c.coins);
  });
}
