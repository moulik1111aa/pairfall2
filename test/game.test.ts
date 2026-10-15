import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Game, type LevelData, type GameEvent } from '../src/core/game.ts';
import type { Slot } from '../src/core/board.ts';

/** n tiles side by side on one layer, all free. */
function flat(kinds: number[], limit = 4): LevelData {
  const slots: Slot[] = kinds.map((_, i) => ({ id: i, x: i * 2, y: 0, layer: 0 }));
  return { slots, kinds, limit };
}

function clock(times: number[]) {
  let t = 0;
  return { now: () => t, set: (v: number) => (t = v), times };
}

const types = (ev: GameEvent[]) => ev.map((e) => e.type);

test('tapping a blocked tile is ignored', () => {
  const g = new Game({ slots: [{ id: 0, x: 0, y: 0, layer: 0 }, { id: 1, x: 1, y: 0, layer: 1 }], kinds: [0, 0], limit: 4 });
  assert.deepEqual(g.tap(0), []);
  assert.equal(g.tray.length, 0);
});

test('a matching pair clears from the tray', () => {
  const g = new Game(flat([0, 1, 0, 1]));
  g.tap(0);
  const ev = g.tap(2);
  assert.ok(types(ev).includes('pairCleared'));
  const cleared = ev.find((e) => e.type === 'pairCleared');
  assert.deepEqual(cleared && cleared.type === 'pairCleared' && cleared.slots, [0, 2]);
  assert.equal(g.tray.length, 0);
});

test('the tray never holds two tiles of the same kind', () => {
  const g = new Game(flat([0, 0, 0, 0, 1, 1]));
  for (const s of [0, 1, 2, 3, 4]) {
    g.tap(s);
    const kinds = g.tray.map((t) => t.kind);
    assert.equal(new Set(kinds).size, kinds.length);
  }
});

test('losing happens exactly when unmatched tiles reach the limit (4)', () => {
  const g = new Game(flat([0, 1, 2, 3, 0, 1, 2, 3], 4));
  g.tap(0); g.tap(1); g.tap(2);
  assert.equal(g.status, 'playing');
  const ev = g.tap(3);
  assert.equal(g.status, 'lost');
  assert.ok(types(ev).includes('lose'));
  assert.deepEqual(g.tap(4), [], 'no taps after losing');
});

test('limit 5 allows four unmatched tiles', () => {
  const g = new Game(flat([0, 1, 2, 3, 4, 0, 1, 2, 3, 4], 5));
  for (const s of [0, 1, 2, 3]) g.tap(s);
  assert.equal(g.status, 'playing');
  g.tap(4);
  assert.equal(g.status, 'lost');
});

test('danger fires at limit − 1 and ends when the tray drains', () => {
  const g = new Game(flat([0, 1, 2, 0, 1, 2], 4));
  g.tap(0); g.tap(1);
  const ev = g.tap(2);
  assert.ok(types(ev).includes('danger'));
  assert.equal(g.danger, true);
  assert.equal(g.dangerReached, true);
  const ev2 = g.tap(3);
  assert.ok(types(ev2).includes('dangerEnd'));
  assert.equal(g.danger, false);
});

test('win needs both board and tray empty', () => {
  const g = new Game(flat([0, 1, 1, 0]));
  g.tap(0); g.tap(1);
  const ev = g.tap(2);
  assert.ok(!types(ev).includes('win'));
  const ev2 = g.tap(3);
  assert.ok(types(ev2).includes('win'));
  assert.equal(g.status, 'won');
});

test('freed tiles are reported when a cover is removed', () => {
  const g = new Game({ slots: [{ id: 0, x: 0, y: 0, layer: 0 }, { id: 1, x: 1, y: 0, layer: 1 }, { id: 2, x: 4, y: 0, layer: 0 }, { id: 3, x: 6, y: 0, layer: 0 }], kinds: [0, 1, 1, 0], limit: 4 });
  const ev = g.tap(1);
  const freed = ev.find((e) => e.type === 'freed');
  assert.deepEqual(freed && freed.type === 'freed' && freed.slots, [0]);
});

test('combo grows within 2.5 s and resets after', () => {
  const c = clock([]);
  const g = new Game(flat([0, 0, 1, 1, 2, 2, 3, 3], 4), c.now);
  const comboAt = (a: number, b: number, t: number) => {
    c.set(t);
    g.tap(a);
    const ev = g.tap(b).find((e) => e.type === 'pairCleared');
    return ev && ev.type === 'pairCleared' ? ev.combo : -1;
  };
  assert.equal(comboAt(0, 1, 0), 1);
  assert.equal(comboAt(2, 3, 2000), 2);
  assert.equal(comboAt(4, 5, 4500), 3);
  assert.equal(comboAt(6, 7, 7100), 1);
  assert.equal(g.bestCombo, 3);
  assert.equal(g.comboBonusSteps, 1);
});

test('undo restores board and tray exactly', () => {
  const g = new Game({ slots: [{ id: 0, x: 0, y: 0, layer: 0 }, { id: 1, x: 1, y: 0, layer: 1 }, { id: 2, x: 4, y: 0, layer: 0 }, { id: 3, x: 6, y: 0, layer: 0 }], kinds: [0, 1, 1, 0], limit: 4 });
  g.tap(1);
  assert.equal(g.board.isFree(0), true);
  const ev = g.undo();
  assert.ok(types(ev).includes('undone'));
  assert.equal(g.tray.length, 0);
  assert.equal(g.board.isPresent(1), true);
  assert.equal(g.board.isFree(0), false);
  const blocked = ev.find((e) => e.type === 'blocked');
  assert.deepEqual(blocked && blocked.type === 'blocked' && blocked.slots, [0]);
});

test('undo is refused after the last tap cleared a pair', () => {
  const g = new Game(flat([0, 0, 1, 1]));
  g.tap(0); g.tap(1);
  assert.equal(g.canUndo(), false);
  assert.deepEqual(g.undo(), []);
});

test('undo clears danger when it drops the tray below limit − 1', () => {
  const g = new Game(flat([0, 1, 2, 0, 1, 2], 4));
  g.tap(0); g.tap(1); g.tap(2);
  assert.equal(g.danger, true);
  assert.ok(types(g.undo()).includes('dangerEnd'));
});

test('addSlot revives a lost game and raises the limit', () => {
  const g = new Game(flat([0, 1, 2, 3, 0, 1, 2, 3], 4));
  for (const s of [0, 1, 2, 3]) g.tap(s);
  assert.equal(g.status, 'lost');
  g.addSlot();
  assert.equal(g.limit, 5);
  assert.equal(g.status, 'playing');
  assert.equal(g.danger, true);
  g.tap(4);
  assert.equal(g.tray.length, 3);
});
