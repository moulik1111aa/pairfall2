import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Board, type Slot } from '../src/core/board.ts';

const s = (id: number, x: number, y: number, layer: number): Slot => ({ id, x, y, layer });

/** A cols × rows block of tiles on one layer, ids row by row. */
const grid = (cols: number, rows: number, layer = 0, start = 0, ox = 0, oy = 0): Slot[] => {
  const out: Slot[] = [];
  for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) out.push(s(start + out.length, ox + 2 * i, oy + 2 * j, layer));
  return out;
};

test('tiles in a single row all have an open side', () => {
  const b = Board.fromSlots(grid(4, 1));
  assert.deepEqual(b.freeSlots(), [0, 1, 2, 3]);
});

test('a tile boxed in on all four sides by its own layer is not free', () => {
  // 3 × 3 block: only the centre (id 4) is boxed in
  const b = Board.fromSlots(grid(3, 3));
  assert.deepEqual(b.freeSlots(), [0, 1, 2, 3, 5, 6, 7, 8]);
  assert.equal(b.isUncovered(4), true);
  assert.equal(b.hasOpenSide(4), false);
});

test('clearing one neighbour opens a side and frees the inner tile', () => {
  const b = Board.fromSlots(grid(3, 3));
  const freed = b.remove(1); // the tile above the centre
  assert.deepEqual(freed, [4]);
  assert.equal(b.isFree(4), true);
});

test('in a 5 × 5 block the inner ring opens from the outside in', () => {
  const b = Board.fromSlots(grid(5, 5));
  assert.equal(b.isFree(12), false); // centre
  assert.equal(b.isFree(6), false); // inner ring
  b.remove(1);
  assert.equal(b.isFree(6), true);
  assert.equal(b.isFree(12), false);
  b.remove(6);
  assert.equal(b.isFree(7), true);
  assert.equal(b.isFree(11), true);
  assert.equal(b.isFree(12), false); // still boxed: left 11, right 13, above 7, below 17
  b.remove(7);
  assert.equal(b.isFree(12), true);
});

test('tiles on other layers never count as side neighbours', () => {
  const b = Board.fromSlots([s(0, 0, 0, 0), s(1, 2, 0, 1), s(2, 4, 0, 0)]);
  // tile 1 sits on layer 1 between two layer-0 tiles, but they do not overlap it
  assert.deepEqual(b.freeSlots(), [0, 1, 2]);
});

test('a half-offset tile above blocks up to four tiles below', () => {
  const b = Board.fromSlots([s(0, 0, 0, 0), s(1, 2, 0, 0), s(2, 0, 2, 0), s(3, 2, 2, 0), s(4, 1, 1, 1)]);
  assert.deepEqual(b.freeSlots(), [4]);
  const freed = b.remove(4);
  assert.deepEqual(freed.sort(), [0, 1, 2, 3]);
  assert.deepEqual(b.freeSlots(), [0, 1, 2, 3]);
});

test('an uncovered tile still needs an open side', () => {
  const b = Board.fromSlots([...grid(3, 3), s(9, 3, 3, 1)]); // 9 covers 4, 5, 7 and 8
  assert.equal(b.isFree(4), false); // covered by 9 and boxed in
  b.remove(9);
  assert.equal(b.isUncovered(4), true);
  assert.equal(b.isFree(4), false); // uncovered but boxed in
  b.remove(5);
  assert.equal(b.isFree(4), true);
});

test('a tile two layers up still blocks', () => {
  const b = Board.fromSlots([s(0, 0, 0, 0), s(1, 0, 0, 2)]);
  assert.equal(b.isFree(0), false);
  b.remove(1);
  assert.equal(b.isFree(0), true);
});

test('non-overlapping upper tiles do not block', () => {
  const b = Board.fromSlots([s(0, 0, 0, 0), s(1, 2, 0, 1)]);
  assert.equal(b.isFree(0), true);
});

test('removing a blocked tile throws', () => {
  const b = Board.fromSlots([s(0, 0, 0, 0), s(1, 1, 1, 1)]);
  assert.throws(() => b.remove(0));
  const c = Board.fromSlots(grid(3, 3));
  assert.throws(() => c.remove(4));
});

test('restore is the exact inverse of remove, including side blocking', () => {
  const b = Board.fromSlots([...grid(3, 3), s(9, 1, 1, 1), s(10, 1, 1, 2)]);
  const before = { free: b.freeSlots(), rem: b.remaining };
  b.remove(10);
  b.remove(9);
  b.remove(1);
  const blocked = b.restore(1);
  assert.ok(blocked.includes(4));
  b.restore(9);
  b.restore(10);
  assert.deepEqual(b.freeSlots(), before.free);
  assert.equal(b.remaining, before.rem);
});

test('clone is independent', () => {
  const b = Board.fromSlots([s(0, 0, 0, 0), s(1, 1, 0, 1)]);
  const c = b.clone();
  c.remove(1);
  assert.equal(b.isPresent(1), true);
  assert.equal(c.isFree(0), true);
  assert.equal(b.isFree(0), false);
  const g = Board.fromSlots(grid(3, 3));
  const h = g.clone();
  h.remove(1);
  assert.equal(h.isFree(4), true);
  assert.equal(g.isFree(4), false);
});

test('slot ids must match indices', () => {
  assert.throws(() => Board.fromSlots([s(1, 0, 0, 0)]));
});
