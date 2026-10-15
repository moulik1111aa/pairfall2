import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SaveStore, freshSave, type StorageAdapter } from '../src/storage/save.ts';

function fake(init: Record<string, string> = {}): StorageAdapter & { map: Map<string, string> } {
  const map = new Map(Object.entries(init));
  return { map, get: (k) => map.get(k) ?? null, set: (k, v) => void map.set(k, v) };
}

test('new player gets a fresh save', () => {
  const s = new SaveStore(fake());
  assert.equal(s.loadedFrom, 'new');
  assert.deepEqual(s.data, freshSave());
});

test('save and load round-trip', () => {
  const store = fake();
  const a = new SaveStore(store);
  a.update((d) => {
    d.level = 12;
    d.coins = 345;
    d.stars[11] = 3;
  });
  const b = new SaveStore(store);
  assert.equal(b.loadedFrom, 'primary');
  assert.equal(b.data.level, 12);
  assert.equal(b.data.coins, 345);
  assert.equal(b.data.stars[11], 3);
});

test('a damaged primary falls back to the backup', () => {
  const store = fake();
  const a = new SaveStore(store);
  a.update((d) => (d.level = 5));
  a.update((d) => (d.level = 6)); // backup now holds level 5
  store.map.set('pairfall.save', '{"level": broken');
  const b = new SaveStore(store);
  assert.equal(b.loadedFrom, 'backup');
  assert.equal(b.data.level, 5);
});

test('both damaged → reset with notice flag', () => {
  const store = fake({ 'pairfall.save': 'nope', 'pairfall.save.bak': '{}' });
  const s = new SaveStore(store);
  assert.equal(s.loadedFrom, 'reset');
  assert.equal(s.data.level, 1);
});

test('missing fields from older saves are filled in', () => {
  const store = fake({ 'pairfall.save': JSON.stringify({ version: 1, level: 3, coins: 50 }) });
  const s = new SaveStore(store);
  assert.equal(s.data.level, 3);
  assert.equal(s.data.settings.sound, true);
  assert.equal(s.data.powerups.undo, 1);
});

test('saves from a newer app version are not trusted', () => {
  const store = fake({ 'pairfall.save': JSON.stringify({ version: 99, level: 3, coins: 50 }) });
  assert.equal(new SaveStore(store).loadedFrom, 'reset');
});
