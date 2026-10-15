// Daily challenge calendar and streaks (spec §6). Dates are local calendar days
// written as YYYY-MM-DD so they compare and hash the same everywhere.

export interface DailyState {
  /** Last day the daily challenge was cleared. */
  last: string | null;
  /** Consecutive days cleared up to `last`. */
  streak: number;
  best: number;
}

export const freshDaily = (): DailyState => ({ last: null, streak: 0, best: 0 });

const pad = (n: number) => String(n).padStart(2, '0');

/** Local calendar day of a date. */
export function dayKey(d: Date = new Date()): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** The day `delta` days after `key`. */
export function addDays(key: string, delta: number): string {
  const [y, m, d] = key.split('-').map(Number);
  return dayKey(new Date(y, m - 1, d + delta, 12)); // noon avoids DST edges
}

/** Streak as it stands today: it survives until a full day is missed. */
export function currentStreak(s: DailyState, today: string): number {
  if (!s.last) return 0;
  return s.last === today || s.last === addDays(today, -1) ? s.streak : 0;
}

export function clearedToday(s: DailyState, today: string): boolean {
  return s.last === today;
}

/** Record a clear of today's challenge. Only the first clear each day counts. */
export function recordClear(s: DailyState, today: string): { state: DailyState; first: boolean } {
  if (s.last === today) return { state: s, first: false };
  const streak = s.last === addDays(today, -1) ? s.streak + 1 : 1;
  return { state: { last: today, streak, best: Math.max(s.best, streak) }, first: true };
}

/** Short date for display, e.g. "15 Oct". */
export function shortDate(key: string): string {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d, 12).toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
}
