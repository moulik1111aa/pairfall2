import { test } from 'node:test';
import assert from 'node:assert/strict';
import { nativeStorage, nativeBridge, type PairfallPlugin } from '../src/platform/native.ts';
import type { StorageAdapter } from '../src/storage/save.ts';
import { SaveStore } from '../src/storage/save.ts';
import { Haptics } from '../src/platform/haptics.ts';

function memory(init: Record<string, string> = {}): StorageAdapter & { map: Map<string, string> } {
  const map = new Map(Object.entries(init));
  return { map, get: (k) => map.get(k) ?? null, set: (k, v) => void map.set(k, v) };
}

function fakePlugin(values: Record<string, string> = {}, opts: { failRead?: boolean; hangRead?: boolean } = {}) {
  const writes: [string, string][] = [];
  const haptics: string[] = [];
  const plugin: PairfallPlugin = {
    haptic: async ({ kind }) => void haptics.push(kind),
    keepAwake: async () => {},
    exit: async () => {},
    readSave: () =>
      opts.hangRead ? new Promise(() => {}) : opts.failRead ? Promise.reject(new Error('no')) : Promise.resolve({ values: { ...values } }),
    writeSave: async ({ key, value }) => void writes.push([key, value]),
    addListener: () => ({}),
  };
  return { plugin, writes, haptics };
}

test('nativeBridge is null outside the Android app', () => {
  assert.equal(nativeBridge(), null);
});

test('the native mirror restores a wiped WebView save', async () => {
  const saved = JSON.stringify({ version: 1, level: 23, coins: 410 });
  const web = memory();
  const { plugin } = fakePlugin({ 'pairfall.save': saved, 'pairfall.save.bak': saved });
  const store = new SaveStore(await nativeStorage(plugin, web));
  assert.equal(store.loadedFrom, 'primary');
  assert.equal(store.data.level, 23);
  assert.equal(store.data.coins, 410);
  assert.equal(web.map.get('pairfall.save'), saved);
});

test('the WebView copy wins when both exist', async () => {
  const web = memory({ 'pairfall.save': JSON.stringify({ version: 1, level: 9, coins: 5 }) });
  const { plugin } = fakePlugin({ 'pairfall.save': JSON.stringify({ version: 1, level: 2, coins: 0 }) });
  const store = new SaveStore(await nativeStorage(plugin, web));
  assert.equal(store.data.level, 9);
});

test('every save is mirrored natively', async () => {
  const web = memory();
  const { plugin, writes } = fakePlugin();
  const store = new SaveStore(await nativeStorage(plugin, web));
  store.update((d) => (d.coins = 777));
  const primary = writes.filter(([k]) => k === 'pairfall.save').at(-1);
  assert.ok(primary);
  assert.equal(JSON.parse(primary[1]).coins, 777);
});

test('a failing or silent mirror never blocks the game', async () => {
  for (const opts of [{ failRead: true }, { hangRead: true }]) {
    const web = memory({ 'pairfall.save': JSON.stringify({ version: 1, level: 4, coins: 1 }) });
    const t0 = Date.now();
    const store = new SaveStore(await nativeStorage(fakePlugin({}, opts).plugin, web));
    assert.equal(store.data.level, 4);
    assert.ok(Date.now() - t0 < 2500);
  }
});

test('haptics go to the native engine and respect the setting', async () => {
  const { plugin, haptics } = fakePlugin();
  const h = new Haptics(true, plugin);
  h.tap();
  h.match(1);
  h.match(4);
  h.win();
  h.enabled = false;
  h.lose();
  await new Promise((r) => setTimeout(r, 0));
  assert.deepEqual(haptics, ['tap', 'match', 'combo', 'win']);
});
