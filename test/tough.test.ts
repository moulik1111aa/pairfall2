// Tougher play (2026-10-17): bombs, timed levels and a curve that keeps ramping.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Rules, TapResult } from '../src/core/rules.ts';
import { Game } from '../src/core/game.ts';
import { solve } from '../src/core/solver.ts';
import { generate } from '../src/gen/generator.ts';
import { settingsFor, rangeFor, grind, timeLimitFor, INTRO } from '../src/gen/curve.ts';
import type { Slot } from '../src/core/board.ts';

/** Tiles on one layer, in rows of four (so every tile keeps an open side). */
const strip = (n: number): Slot[] => Array.from({ length: n }, (_, i) => ({ id: i, x: (i % 4) * 2, y: Math.floor(i / 4) * 4, layer: 0 }));

test('a bomb goes off when its fuse burns down before it is cleared', () => {
  const r = new Rules({ slots: strip(6), kinds: [0, 1, 2, 0, 1, 2], limit: 5, specials: { bombs: { 0: 3 } } });
  assert.equal(r.fuseLeft(0), 3);
  r.tap(1);
  assert.equal(r.fuseLeft(0), 2);
  r.tap(2);
  r.tap(4); // third tap: bomb (slot 0) still on the board
  assert.equal(r.exploded, 0);
  assert.equal(r.lost, true);
});

test('clearing a bomb on its last tap defuses it', () => {
  const r = new Rules({ slots: strip(4), kinds: [0, 1, 0, 1], limit: 5, specials: { bombs: { 2: 2 } } });
  r.tap(0);
  assert.equal(r.tap(2), TapResult.Cleared); // tap 2 = fuse, but the bomb clears on it
  assert.equal(r.exploded, -1);
  assert.equal(r.fuseLeft(2), Infinity);
  r.tap(1);
  r.tap(3);
  assert.equal(r.won, true);
});

test('a bomb waiting in the tray keeps burning', () => {
  const r = new Rules({ slots: strip(6), kinds: [0, 1, 2, 0, 1, 2], limit: 5, specials: { bombs: { 0: 2 } } });
  r.tap(0); // into the tray, not cleared
  r.tap(1);
  assert.equal(r.lost, true);
});

test('undo gives a tap back to the fuse', () => {
  const g = new Game({ slots: strip(6), kinds: [0, 1, 2, 0, 1, 2], limit: 5, specials: { bombs: { 0: 3 } } }, () => 0);
  g.tap(1);
  assert.equal(g.fuseLeft(0), 2);
  g.undo();
  assert.equal(g.fuseLeft(0), 3);
});

test('the game reports a bomb loss, and +1 Slot cannot revive it', () => {
  const g = new Game({ slots: strip(6), kinds: [0, 1, 2, 0, 1, 2], limit: 5, specials: { bombs: { 0: 1 } } }, () => 0);
  const ev = g.tap(1);
  assert.ok(ev.some((e) => e.type === 'exploded' && e.slot === 0));
  assert.ok(ev.some((e) => e.type === 'lose'));
  assert.equal(g.lossReason, 'bomb');
  g.addSlot();
  assert.equal(g.status, 'lost');
});

test('the solver plays around a bomb', () => {
  // the bomb pair (kind 0) must be cleared within 3 taps
  const r = new Rules({ slots: strip(8), kinds: [1, 2, 3, 0, 1, 2, 3, 0], limit: 5, specials: { bombs: { 3: 3 } } });
  const { moves } = solve(r);
  assert.ok(moves);
  const at = moves!.indexOf(7);
  assert.ok(at >= 0 && at < 3 && moves!.indexOf(3) < 3, `bomb pair cleared too late: ${moves}`);
});

test('timed levels: the clock runs out and Continue adds time', () => {
  const g = new Game({ slots: strip(4), kinds: [0, 1, 0, 1], limit: 4 }, () => 0);
  g.timeLimitMs = 10_000;
  assert.deepEqual(g.tick(9_000), []);
  assert.equal(Math.round(g.timeLeftMs), 1_000);
  const ev = g.tick(1_500);
  assert.deepEqual(ev.map((e) => e.type), ['timeUp', 'lose']);
  assert.equal(g.lossReason, 'time');
  assert.equal(g.canTap(0), false);
  g.addTime(30_000);
  assert.equal(g.status, 'playing');
  assert.equal(Math.round(g.timeLeftMs), 30_000);
});

test('an untimed game never runs out of time', () => {
  const g = new Game({ slots: strip(4), kinds: [0, 1, 0, 1], limit: 4 }, () => 0);
  assert.deepEqual(g.tick(1e9), []);
  assert.equal(g.status, 'playing');
});

test('bombs appear from level 45 and every generated bomb level is still won by its solution', () => {
  assert.equal(Object.keys(generate(settingsFor(INTRO.bombs - 1), 3).specials?.bombs ?? {}).length, 0);
  let withBombs = 0;
  for (let n = INTRO.bombs; n < INTRO.bombs + 120; n++) {
    const lv = generate(settingsFor(n), n);
    const bombs = lv.specials?.bombs ?? {};
    if (Object.keys(bombs).length) withBombs++;
    const g = new Game(lv, () => 0);
    for (const s of lv.solution) g.tap(s);
    assert.equal(g.status, 'won', `level ${n}`);
  }
  assert.ok(withBombs > 60, `only ${withBombs} levels had bombs`);
});

test('the late game keeps getting harder', () => {
  assert.equal(grind(60), 0);
  assert.equal(grind(400), 1);
  for (const band of ['easy', 'normal', 'hard'] as const) {
    assert.ok(rangeFor(band, 400).min < rangeFor(band, 60).min, band);
    assert.ok(rangeFor(band, 250).min <= rangeFor(band, 150).min, band);
  }
  const fuse = (n: number) => settingsFor(n).specials!.fuseSlack!;
  assert.ok(fuse(400) < fuse(100));
  assert.ok(settingsFor(400).specials!.bombs! > settingsFor(61).specials!.bombs!);
});

test('bosses are timed from level 60, every normal level from 150, breathers never', () => {
  assert.equal(settingsFor(50).timeLimit, undefined);
  assert.ok(settingsFor(60).timeLimit! > 0);
  assert.equal(settingsFor(149).timeLimit, undefined);
  assert.ok(settingsFor(151).timeLimit! > 0);
  assert.equal(settingsFor(155).timeLimit, undefined);
  // seconds per tile shrink as the journey goes on
  const perTile = (n: number) => (settingsFor(n).timeLimit! - 15) / settingsFor(n).tiles;
  assert.ok(perTile(400) < perTile(60));
  assert.ok(perTile(390) < perTile(151));
  assert.equal(timeLimitFor(10, 'hard', 50), undefined);
});
