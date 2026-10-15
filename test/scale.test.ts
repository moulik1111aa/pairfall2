import { test } from 'node:test';
import assert from 'node:assert/strict';
import { scaleFreq, matchNotes, BASE_HZ, IN } from '../src/audio/scale.ts';

const close = (a: number, b: number) => Math.abs(a - b) < 0.01;

test('scale steps wrap into the next octave', () => {
  assert.ok(close(scaleFreq(0), BASE_HZ));
  assert.ok(close(scaleFreq(5), BASE_HZ * 2));
  assert.ok(close(scaleFreq(10), BASE_HZ * 4));
  assert.ok(close(scaleFreq(-5), BASE_HZ / 2));
});

test('match notes rise with the combo and level off', () => {
  let prev = 0;
  for (let c = 1; c <= 11; c++) {
    const [a, b] = matchNotes(c);
    assert.ok(b > a);
    assert.ok(a > prev, `combo ${c} should be higher than combo ${c - 1}`);
    prev = a;
  }
  assert.deepEqual(matchNotes(30), matchNotes(11));
  assert.deepEqual(matchNotes(0), matchNotes(1));
});

test('in scale has its semitone step', () => {
  assert.ok(close(scaleFreq(1, IN) / scaleFreq(0, IN), Math.pow(2, 1 / 12)));
});
