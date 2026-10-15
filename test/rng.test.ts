import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRng, subSeed, hashString } from '../src/core/rng.ts';

test('same seed gives the same sequence', () => {
  const a = createRng(42), b = createRng(42);
  for (let i = 0; i < 1000; i++) assert.equal(a.next(), b.next());
});

test('string seeds are stable and distinct', () => {
  assert.equal(hashString('2026-10-15'), hashString('2026-10-15'));
  assert.notEqual(hashString('2026-10-15'), hashString('2026-10-16'));
  assert.equal(createRng('day').next(), createRng('day').next());
});

test('sub-seeds produce different sequences', () => {
  const seen = new Set<number>();
  for (let n = 0; n < 200; n++) seen.add(createRng(subSeed(7, n)).next());
  assert.equal(seen.size, 200);
  assert.equal(subSeed(7, 3), subSeed(7, 3));
});

test('int stays within inclusive bounds and covers them', () => {
  const r = createRng(1);
  const counts = new Map<number, number>();
  for (let i = 0; i < 100_000; i++) {
    const v = r.int(-2, 3);
    assert.ok(v >= -2 && v <= 3);
    counts.set(v, (counts.get(v) ?? 0) + 1);
  }
  assert.equal(counts.size, 6);
  for (const c of counts.values()) assert.ok(c > 15_000 && c < 18_500, `uneven: ${c}`);
});

test('shuffle is a permutation', () => {
  const r = createRng(9);
  const arr = Array.from({ length: 50 }, (_, i) => i);
  const out = r.shuffle([...arr]);
  assert.deepEqual([...out].sort((x, y) => x - y), arr);
  assert.notDeepEqual(out, arr);
});
