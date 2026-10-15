import { test } from 'node:test';
import assert from 'node:assert/strict';
import { settingsFor, bandFor } from '../src/gen/curve.ts';

test('band schedule', () => {
  for (let n = 1; n <= 9; n++) assert.equal(bandFor(n), 'easy', `level ${n}`);
  assert.equal(bandFor(10), 'normal');
  assert.equal(bandFor(11), 'normal');
  assert.equal(bandFor(15), 'easy');
  assert.equal(bandFor(20), 'hard');
  assert.equal(bandFor(37), 'normal');
  assert.equal(bandFor(100), 'hard');
  assert.equal(bandFor(105), 'easy');
});

test('tutorial only on levels 1–3, tray limit 5 until level 10 then 4', () => {
  assert.equal(settingsFor(1).tutorial, true);
  assert.equal(settingsFor(3).tutorial, true);
  assert.equal(settingsFor(4).tutorial, false);
  assert.equal(settingsFor(1).limit, 5);
  assert.equal(settingsFor(10).limit, 5);
  assert.equal(settingsFor(11).limit, 4);
  assert.equal(settingsFor(500).limit, 4);
});

test('settings respect the spec caps at every level', () => {
  for (let n = 1; n <= 500; n++) {
    const s = settingsFor(n);
    assert.ok(s.tiles >= 24 && s.tiles <= 120, `tiles ${s.tiles} at ${n}`);
    assert.ok(s.layers >= 2 && s.layers <= 6);
    assert.ok(s.kinds >= 6 && s.kinds <= 18);
    assert.ok(s.targetPeak >= 1 && s.targetPeak < s.limit);
    assert.ok(s.buried >= 0 && s.buried <= 1);
  }
});

test('difficulty ramps: later normal levels are bigger than early ones', () => {
  assert.ok(settingsFor(37).tiles > settingsFor(11).tiles);
  assert.ok(settingsFor(100).tiles >= settingsFor(37).tiles);
  assert.ok(settingsFor(20).tiles > settingsFor(19).tiles, 'boss is bigger than the level before');
  assert.ok(settingsFor(25).tiles < settingsFor(24).tiles, 'breather is smaller than the level before');
});

test('invalid level numbers throw', () => {
  assert.throws(() => settingsFor(0));
  assert.throws(() => settingsFor(1.5));
});
