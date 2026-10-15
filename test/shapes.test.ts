import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeShape, FRAME, type ShapeName } from '../src/gen/shapes.ts';
import { createRng } from '../src/core/rng.ts';
import type { Slot } from '../src/core/board.ts';

const shapes: ShapeName[] = ['rect', 'diamond', 'pyramid', 'heart', 'ring', 'blob'];
const sizes = [24, 40, 60, 90, 120];

function isSymmetric(slots: Slot[]): boolean {
  const xs = slots.map((s) => s.x);
  const axis = Math.min(...xs) + Math.max(...xs);
  const set = new Set(slots.map((s) => `${s.layer}:${s.x}:${s.y}`));
  return slots.every((s) => set.has(`${s.layer}:${axis - s.x}:${s.y}`));
}

for (const name of shapes) {
  test(`${name}: even count near target, fits frame, supported, symmetric`, () => {
    let asymmetric = 0;
    for (const tiles of sizes) {
      for (let seed = 0; seed < 6; seed++) {
        const slots = makeShape(name, tiles, 6, createRng(seed * 31 + tiles));
        assert.equal(slots.length % 2, 0, `${name} ${tiles}: odd count ${slots.length}`);
        assert.ok(slots.length >= 4);
        // within ±2 of target unless the shape cannot physically hold that many
        if (slots.length < tiles - 2) {
          const max = makeShape(name, 10_000, 6, createRng(seed * 31 + tiles)).length;
          assert.ok(slots.length >= max - 1, `${name} ${tiles}: got ${slots.length}, shape max ${max}`);
        } else {
          assert.ok(slots.length <= tiles + 2 && slots.length >= tiles - 2, `${name} ${tiles}: got ${slots.length}`);
        }
        slots.forEach((s, i) => assert.equal(s.id, i));
        for (const s of slots) {
          assert.ok(s.x >= 0 && s.x <= 2 * (FRAME.cols - 1) && s.y >= 0 && s.y <= 2 * (FRAME.rows - 1));
          if (s.layer > 0) {
            const below = slots.filter((b) => b.layer === s.layer - 1 && Math.abs(b.x - s.x) < 2 && Math.abs(b.y - s.y) < 2);
            assert.equal(below.length, 4, `${name}: unsupported tile at layer ${s.layer}`);
          }
        }
        const layers = new Set(slots.map((s) => `${s.layer}:${s.x}:${s.y}`));
        assert.equal(layers.size, slots.length, 'no duplicate positions');
        if (!isSymmetric(slots)) asymmetric++;
      }
    }
    assert.equal(asymmetric, 0, `${name}: ${asymmetric} asymmetric shapes`);
  });
}

test('same rng seed gives the same shape', () => {
  assert.deepEqual(makeShape('blob', 60, 4, createRng(5)), makeShape('blob', 60, 4, createRng(5)));
});
