import { test } from 'node:test';
import assert from 'node:assert/strict';
import { addDays, currentStreak, recordClear, freshDaily, dayKey, clearedToday } from '../src/core/daily.ts';

test('day keys and day arithmetic', () => {
  assert.equal(dayKey(new Date(2026, 9, 15, 23, 59)), '2026-10-15');
  assert.equal(addDays('2026-10-15', 1), '2026-10-16');
  assert.equal(addDays('2026-10-31', 1), '2026-11-01');
  assert.equal(addDays('2026-12-31', 1), '2027-01-01');
  assert.equal(addDays('2026-03-01', -1), '2026-02-28');
  assert.equal(addDays('2028-03-01', -1), '2028-02-29');
});

test('first clear starts a streak; consecutive days extend it', () => {
  let s = freshDaily();
  let r = recordClear(s, '2026-10-15');
  assert.equal(r.first, true);
  s = r.state;
  assert.equal(s.streak, 1);
  r = recordClear(s, '2026-10-16');
  s = r.state;
  assert.equal(s.streak, 2);
  assert.equal(s.best, 2);
});

test('clearing twice on the same day counts once', () => {
  const s = recordClear(freshDaily(), '2026-10-15').state;
  const again = recordClear(s, '2026-10-15');
  assert.equal(again.first, false);
  assert.equal(again.state.streak, 1);
  assert.equal(clearedToday(s, '2026-10-15'), true);
});

test('missing a full day resets the streak (best is kept)', () => {
  let s = recordClear(freshDaily(), '2026-10-14').state;
  s = recordClear(s, '2026-10-15').state;
  assert.equal(currentStreak(s, '2026-10-16'), 2, 'still alive the next day');
  assert.equal(currentStreak(s, '2026-10-17'), 0, 'gone after a missed day');
  s = recordClear(s, '2026-10-17').state;
  assert.equal(s.streak, 1);
  assert.equal(s.best, 2);
});
