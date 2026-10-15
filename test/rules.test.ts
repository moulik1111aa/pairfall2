import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Rules, TapResult, WILD } from '../src/core/rules.ts';
import { Game } from '../src/core/game.ts';
import type { Slot } from '../src/core/board.ts';

/** n tiles side by side on one layer (all uncovered). */
const row = (n: number): Slot[] => Array.from({ length: n }, (_, i) => ({ id: i, x: i * 2, y: 0, layer: 0 }));

test('a frozen tile cannot be tapped until enough pairs clear while it is uncovered', () => {
  const r = new Rules({ slots: row(6), kinds: [0, 0, 1, 1, 2, 2], limit: 4, specials: { frozen: { 4: 2 } } });
  assert.equal(r.canTap(4), false);
  r.tap(0);
  r.tap(1); // first clear
  assert.deepEqual(r.lastChilled, [4]);
  assert.equal(r.frost[4], 1);
  assert.equal(r.canTap(4), false);
  r.tap(2);
  r.tap(3); // second clear
  assert.deepEqual(r.lastThawed, [4]);
  assert.equal(r.canTap(4), true);
});

test('frost only counts clears while the tile is uncovered', () => {
  // slot 0 is frozen and covered by slot 1 (layer above)
  const slots: Slot[] = [
    { id: 0, x: 0, y: 0, layer: 0 },
    { id: 1, x: 1, y: 0, layer: 1 },
    { id: 2, x: 6, y: 0, layer: 0 },
    { id: 3, x: 8, y: 0, layer: 0 },
    { id: 4, x: 10, y: 0, layer: 0 },
    { id: 5, x: 12, y: 0, layer: 0 },
  ];
  const r = new Rules({ slots, kinds: [9, 7, 3, 3, 7, 9], limit: 4, specials: { frozen: { 0: 1 } } });
  r.tap(2);
  r.tap(3); // clear while slot 0 is still covered: no thaw
  assert.equal(r.frost[0], 1);
  r.tap(1); // uncovers 0
  r.tap(4); // clear (kind 7) — slot 0 is uncovered now, so it thaws
  assert.equal(r.frost[0], 0);
  assert.equal(r.canTap(0), true);
});

test('a lock opens once both key tiles have been cleared', () => {
  const r = new Rules({ slots: row(4), kinds: [0, 0, 1, 1], limit: 4, specials: { locks: [{ slot: 2, keys: [0, 1] }] } });
  assert.equal(r.canTap(2), false);
  assert.equal(r.tap(2), TapResult.Ignored);
  r.tap(0);
  assert.equal(r.canTap(2), false, 'one key is not enough');
  r.tap(1);
  assert.deepEqual(r.lastUnlocked, [2]);
  assert.equal(r.canTap(2), true);
});

test('a wild clears with the oldest tile in the tray', () => {
  const r = new Rules({ slots: row(4), kinds: [3, 5, WILD, 5], limit: 4 });
  r.tap(0);
  r.tap(1);
  assert.equal(r.tap(2), TapResult.Cleared);
  assert.equal(r.lastPartner, 0);
  assert.deepEqual(r.tray, [1]);
});

test('a wild waiting in the tray clears with the next tile', () => {
  const r = new Rules({ slots: row(2), kinds: [WILD, 4], limit: 4 });
  assert.equal(r.tap(0), TapResult.ToTray);
  assert.equal(r.tap(1), TapResult.Cleared);
  assert.ok(r.won);
});

test('a normal match is preferred over a waiting wild', () => {
  const r = new Rules({ slots: row(4), kinds: [WILD, 2, 2, 8], limit: 4 });
  r.tap(0);
  r.tap(1); // clears with the wild (oldest)
  assert.equal(r.lastPartner, 0);
  r.tap(2);
  assert.deepEqual(r.tray, [2]);
});

test('clone is independent of the original', () => {
  const r = new Rules({ slots: row(4), kinds: [0, 1, 0, 1], limit: 4, specials: { frozen: { 3: 1 } } });
  const c = r.clone();
  c.tap(0);
  c.tap(2);
  assert.equal(r.tray.length, 0);
  assert.equal(r.board.isPresent(0), true);
  assert.equal(r.frost[3], 1);
  assert.equal(c.frost[3], 0);
});

test('untap restores a tile from the tray', () => {
  const r = new Rules({ slots: row(2), kinds: [0, 1], limit: 4 });
  r.tap(0);
  r.untap(0);
  assert.equal(r.tray.length, 0);
  assert.equal(r.board.isPresent(0), true);
});

test('game reports thaw, chill and unlock events', () => {
  const g = new Game(
    { slots: row(6), kinds: [0, 0, 1, 1, 2, 2], limit: 4, specials: { frozen: { 5: 1 }, locks: [{ slot: 4, keys: [0, 1] }] } },
    () => 0,
  );
  g.tap(0);
  const ev = g.tap(1);
  const types = ev.map((e) => e.type);
  assert.ok(types.includes('thawed'));
  assert.ok(types.includes('unlocked'));
  assert.equal(g.canTap(4), true);
  assert.equal(g.canTap(5), true);
});

test('reassign changes kinds of board tiles and clears undo history', () => {
  const g = new Game({ slots: row(4), kinds: [0, 1, 0, 1], limit: 4 }, () => 0);
  g.tap(0);
  assert.equal(g.canUndo(), true);
  g.reassign(new Map([[1, 0], [2, 1], [3, 1]]));
  assert.deepEqual(g.kinds, [0, 0, 1, 1]);
  assert.equal(g.canUndo(), false);
  assert.throws(() => g.reassign(new Map([[0, 5]])), /not on the board/);
});
