import { test } from 'node:test';
import assert from 'node:assert/strict';
import { pay, refund, hint, shuffle, costOf } from '../src/core/powerups.ts';
import { solve } from '../src/core/solver.ts';
import { Rules, TapResult } from '../src/core/rules.ts';
import { generate } from '../src/gen/generator.ts';
import { settingsFor } from '../src/gen/curve.ts';
import { createRng } from '../src/core/rng.ts';
import type { Slot } from '../src/core/board.ts';

const row = (n: number): Slot[] => Array.from({ length: n }, (_, i) => ({ id: i, x: i * 2, y: 0, layer: 0 }));
const wallet = () => ({ coins: 100, powerups: { undo: 1, hint: 0, shuffle: 0, xray: 0, extraSlot: 0 } });

test('a free use is spent before coins', () => {
  const w = wallet();
  assert.equal(pay(w, 'undo'), 'free');
  assert.equal(w.powerups.undo, 0);
  assert.equal(w.coins, 100);
  assert.equal(pay(w, 'undo'), 'coins');
  assert.equal(w.coins, 100 - costOf('undo'));
});

test('cannot pay without a free use or enough coins', () => {
  const w = { ...wallet(), coins: 10 };
  assert.equal(pay(w, 'shuffle'), 'none');
  assert.equal(w.coins, 10);
});

test('refund returns exactly what was paid', () => {
  const w = wallet();
  const how = pay(w, 'hint');
  refund(w, 'hint', how);
  assert.deepEqual(w, wallet());
});

test('solver finds a win on generated levels from the start', () => {
  for (const n of [5, 12, 21, 37]) {
    const lv = generate(settingsFor(n), 7);
    const r = new Rules(lv);
    const { moves } = solve(r, 6000);
    assert.ok(moves, `level ${n}: no solution found`);
    for (const s of moves!) assert.notEqual(r.tap(s), TapResult.Ignored);
    assert.ok(r.won);
  }
});

test('hint completes a waiting pair when it can', () => {
  const r = new Rules({ slots: row(4), kinds: [0, 1, 0, 1], limit: 4 });
  r.tap(0);
  assert.deepEqual(hint(r), [2]);
});

test('hint offers both tiles of a fully visible pair', () => {
  const r = new Rules({ slots: row(4), kinds: [0, 1, 1, 0], limit: 4 });
  const h = hint(r);
  assert.equal(h.length, 2);
  assert.equal(r.kinds[h[0]], r.kinds[h[1]]);
});

test('hint avoids a move that would lose', () => {
  // tray holds 0,1,2 (limit 4): tapping 3 would lose; tapping 4 (a 0) clears
  const r = new Rules({ slots: row(8), kinds: [0, 1, 2, 3, 0, 1, 2, 3], limit: 4 });
  r.tap(0);
  r.tap(1);
  r.tap(2);
  const h = hint(r);
  assert.notEqual(r.kinds[h[0]], 3);
});

test('shuffle keeps the same tiles and leaves a winnable board', () => {
  const lv = generate(settingsFor(30), 11);
  const r = new Rules(lv);
  // play a few moves of the built-in solution first
  for (const s of lv.solution.slice(0, 10)) r.tap(s);
  const before = r.board.presentSlots().map((s) => r.kinds[s]).sort((a, b) => a - b);
  const next = shuffle(r, createRng(5));
  assert.ok(next, 'shuffle found an arrangement');
  const trial = r.clone();
  for (const [s, k] of next!) trial.kinds[s] = k;
  const after = trial.board.presentSlots().map((s) => trial.kinds[s]).sort((a, b) => a - b);
  assert.deepEqual(after, before, 'same set of tiles');
  assert.ok(solve(trial, 4000).moves, 'still winnable');
});
