// Musical helpers. Matches climb the Japanese "yo" pentatonic scale as a combo grows;
// losing falls through the darker "in" scale.

/** Semitone offsets of the yo scale (bright, folk-like). */
export const YO = [0, 2, 5, 7, 9] as const;
/** Semitone offsets of the in (miyako-bushi) scale (dark, plaintive). */
export const IN = [0, 1, 5, 7, 8] as const;

/** D4 */
export const BASE_HZ = 293.66;

/** Frequency of the n-th step of a pentatonic scale above `base` (steps wrap into higher octaves). */
export function scaleFreq(step: number, scale: readonly number[] = YO, base = BASE_HZ): number {
  const len = scale.length;
  const octave = Math.floor(step / len);
  const idx = ((step % len) + len) % len;
  return base * Math.pow(2, (octave * 12 + scale[idx]) / 12);
}

/** The two notes played when a pair clears: a rising interval that climbs with the combo. */
export function matchNotes(combo: number, scale: readonly number[] = YO, base = BASE_HZ): [number, number] {
  const step = Math.min(Math.max(combo, 1) - 1, 10);
  return [scaleFreq(step, scale, base), scaleFreq(step + 2, scale, base)];
}
