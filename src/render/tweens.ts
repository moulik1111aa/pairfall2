// Animation helpers. Everything here animates only `transform` and `opacity`, which
// the browser runs on the compositor — smooth at the display's full refresh rate.

export interface Pose {
  x: number;
  y: number;
  s: number;
}

export const EASE_OUT = 'cubic-bezier(.2,.8,.2,1)';
export const EASE_IN_OUT = 'cubic-bezier(.45,0,.25,1)';
export const EASE_BACK = 'cubic-bezier(.34,1.56,.64,1)';

export const poseTransform = (p: Pose): string => `translate3d(${p.x}px,${p.y}px,0) scale(${p.s})`;

export const reducedMotion = (): boolean =>
  typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;

/** Freeze any running animation at its current visual state and return that transform. */
function currentTransform(el: HTMLElement): string {
  const anims = el.getAnimations();
  if (!anims.length) return el.style.transform;
  const t = getComputedStyle(el).transform;
  for (const a of anims) a.cancel();
  return t && t !== 'none' ? t : el.style.transform;
}

/** Move an element to a pose. Optional `lift` arcs the path upward by that many px. */
export function moveTo(el: HTMLElement, to: Pose, ms: number, opts: { lift?: number; easing?: string; delay?: number } = {}): Animation | null {
  const from = currentTransform(el);
  const end = poseTransform(to);
  el.style.transform = end;
  if (ms <= 0 || reducedMotion() || from === end) return null;
  const frames: Keyframe[] = [{ transform: from }];
  if (opts.lift) {
    frames.push({ transform: `translate3d(${to.x}px,${to.y - opts.lift}px,0) scale(${to.s * 1.08})`, offset: 0.55 });
  }
  frames.push({ transform: end });
  return el.animate(frames, { duration: ms, easing: opts.easing ?? EASE_OUT, delay: opts.delay ?? 0, fill: 'backwards' });
}

/**
 * Fly a tile along an arc: it lifts and swells with a slight spin, then lands with
 * a small settle. Used for board → tray moves.
 */
export function flyTo(el: HTMLElement, to: Pose, ms: number, spin: number): Animation | null {
  const from = currentTransform(el);
  const end = poseTransform(to);
  el.style.transform = end;
  if (ms <= 0 || reducedMotion()) return null;
  const at = (dx: number, dy: number, k: number, r: number) =>
    `translate3d(${to.x + dx}px,${to.y + dy}px,0) scale(${to.s * k}) rotate(${r}deg)`;
  return el.animate(
    [
      { transform: from },
      { transform: at(0, -44, 1.14, spin), offset: 0.5, easing: 'cubic-bezier(.5,0,.7,1)' },
      { transform: at(0, 3, 0.97, -spin * 0.15), offset: 0.82 },
      { transform: at(0, 0, 1, 0) },
    ],
    { duration: ms, easing: 'cubic-bezier(.3,.7,.4,1)', fill: 'backwards' },
  );
}

/** A small hop (uses the independent `translate` property so it composes with the pose). */
export function hop(el: HTMLElement, px = 6, delay = 0): void {
  if (reducedMotion()) return;
  el.animate([{ translate: '0 0' }, { translate: `0 ${-px}px` }, { translate: '0 0' }], {
    duration: 300,
    delay,
    easing: 'cubic-bezier(.3,.7,.4,1)',
  });
}

/** Briefly light up an element's ::before overlay (a white flash on tiles). */
export function flash(el: HTMLElement, ms = 220): void {
  if (reducedMotion()) return;
  el.animate([{ opacity: 0 }, { opacity: 0.85 }, { opacity: 0 }], { duration: ms, pseudoElement: '::before' });
}

/**
 * Pop an element out of existence (swell, then shrink and fade) around its centre.
 * `w`/`h` are the element's unscaled size (transform-origin is the top-left corner).
 */
export function popOut(el: HTMLElement, at: Pose, w: number, h: number, ms = 260, spin = 0): Promise<void> {
  if (reducedMotion()) return Promise.resolve();
  const around = (k: number, r: number): string =>
    `${poseTransform({ x: at.x + (w * at.s * (1 - k)) / 2, y: at.y + (h * at.s * (1 - k)) / 2, s: at.s * k })} rotate(${r}deg)`;
  const a = el.animate(
    [
      { transform: around(1, 0), opacity: 1 },
      { transform: around(1.28, spin * 0.4), opacity: 1, offset: 0.35 },
      { transform: around(0.15, spin), opacity: 0 },
    ],
    { duration: ms, easing: EASE_IN_OUT, fill: 'forwards' },
  );
  return a.finished.then(() => undefined, () => undefined);
}

/** Small horizontal shake (lose / invalid). */
export function shake(el: HTMLElement, px = 8, ms = 420): void {
  if (reducedMotion()) return;
  // the independent `translate` property composes with the element's own transform
  el.animate(
    [0, -px, px, -px * 0.7, px * 0.5, 0].map((dx) => ({ translate: `${dx}px 0` })),
    { duration: ms, easing: 'ease-out' },
  );
}

export const wait = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));
