// The HUD's flight math (components/hud.tsx), kept pure so it can be tested.

export const clamp01 = (v: number) => Math.max(0, Math.min(1, v));

export const easeInOutCubic = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

/**
 * How far a section has arrived, 0 to 1, from where its top sits on screen: over the 200px of
 * scroll before it reaches 12% of the viewport. The HUD's queue lets the section's name go over
 * that stretch.
 */
export function arrivalProgress(top: number, vh: number): number {
  return clamp01((0.12 * vh + 200 - top) / 200);
}

/** Per-letter progress: the last letter leaves first and each one follows `stagger` behind. */
export function letterProgress(flipP: number, k: number, n: number, stagger = 0.16): number {
  const order = n - 1 - k;
  return clamp01(flipP * (1 + (n - 1) * stagger) - order * stagger);
}

export type Point = { x: number; y: number };

/** A point on the quadratic Bézier from p0 through control c to p1. */
export function quad(p0: Point, c: Point, p1: Point, d: number): Point {
  const u = 1 - d;
  return { x: u * u * p0.x + 2 * u * d * c.x + d * d * p1.x, y: u * u * p0.y + 2 * u * d * c.y + d * d * p1.y };
}

/**
 * Where on screen the spine's packet rides (components/spine.tsx): the middle of the screen, until
 * the last screen of scroll, where it drifts down so that it meets the end station (at document y
 * `endY`) exactly when the page bottoms out, even when that station sits low on the last screen.
 */
export function packetScreenY(scrollY: number, limit: number, vh: number, endY: number): number {
  const short = Math.max(0, endY - limit - vh * 0.5);
  const ramp = clamp01((scrollY - (limit - vh)) / vh);
  return vh * 0.5 + short * ramp;
}
