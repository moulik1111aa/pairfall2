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
 * Pop an element out of existence (swell, then shrink and fade) around its centre.
 * `w`/`h` are the element's unscaled size (transform-origin is the top-left corner).
 */
export function popOut(el: HTMLElement, at: Pose, w: number, h: number, ms = 260): Promise<void> {
  if (reducedMotion()) return Promise.resolve();
  const around = (k: number): string =>
    poseTransform({ x: at.x + (w * at.s * (1 - k)) / 2, y: at.y + (h * at.s * (1 - k)) / 2, s: at.s * k });
  const a = el.animate(
    [
      { transform: around(1), opacity: 1 },
      { transform: around(1.22), opacity: 1, offset: 0.35 },
      { transform: around(0.2), opacity: 0 },
    ],
    { duration: ms, easing: EASE_IN_OUT, fill: 'forwards' },
  );
  return a.finished.then(() => undefined, () => undefined);
}

/** Small horizontal shake (lose / invalid). */
export function shake(el: HTMLElement, px = 8, ms = 420): void {
  if (reducedMotion()) return;
  el.animate(
    [0, -px, px, -px * 0.7, px * 0.5, 0].map((dx) => ({ transform: `translateX(${dx}px)` })),
    // 'add' composes with the element's own transform (tiles are positioned by transform)
    { duration: ms, easing: 'ease-out', composite: 'add' },
  );
}

export const wait = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));
