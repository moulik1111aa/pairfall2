import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Board, type Slot } from '../src/core/board.ts';

const s = (id: number, x: number, y: number, layer: number): Slot => ({ id, x, y, layer });

test('tiles on a single layer are all free and never block each other', () => {
  const b = Board.fromSlots([s(0, 0, 0, 0), s(1, 2, 0, 0), s(2, 1, 0, 0)]);
  assert.deepEqual(b.freeSlots(), [0, 1, 2]);
});

test('a half-offset tile above blocks up to four tiles below', () => {
  const b = Board.fromSlots([s(0, 0, 0, 0), s(1, 2, 0, 0), s(2, 0, 2, 0), s(3, 2, 2, 0), s(4, 1, 1, 1)]);
  assert.deepEqual(b.freeSlots(), [4]);
  const freed = b.remove(4);
  assert.deepEqual(freed.sort(), [0, 1, 2, 3]);
  assert.deepEqual(b.freeSlots(), [0, 1, 2, 3]);
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
});

test('restore is the exact inverse of remove', () => {
  const b = Board.fromSlots([s(0, 0, 0, 0), s(1, 2, 0, 0), s(2, 1, 0, 1), s(3, 1, 0, 2)]);
  const before = { free: b.freeSlots(), rem: b.remaining };
  b.remove(3);
  b.remove(2);
  b.restore(2);
  b.restore(3);
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
});

test('slot ids must match indices', () => {
  assert.throws(() => Board.fromSlots([s(1, 0, 0, 0)]));
});
