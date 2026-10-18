// The pure parts of the rail HUD (components/hud.tsx), kept here so they can be tested.

/** How far a section's word has flown, 0 to 1, from where its section's top is on screen. The flight
 * starts when the top is 200 px below 12% of the screen and finishes when it reaches 12%. */
export function flipProgress(sectionTop: number, viewportHeight: number, zone = 200): number {
  const threshold = viewportHeight * 0.12;
  return Math.min(1, Math.max(0, (threshold + zone - sectionTop) / zone));
}

/** One letter's share of a word's flight: letters leave in `order` (0 first), each `stagger` of a
 * flight after the one before, and every letter lands by the time the word's progress reaches 1. */
export function letterProgress(progress: number, order: number, letters: number, stagger: number): number {
  const t = progress * (1 + (letters - 1) * stagger) - order * stagger;
  return Math.min(1, Math.max(0, t));
}

/** A point on the quadratic Bézier from a through control c to b. */
export function bezier(a: { x: number; y: number }, c: { x: number; y: number }, b: { x: number; y: number }, t: number) {
  const u = 1 - t;
  return { x: u * u * a.x + 2 * u * t * c.x + t * t * b.x, y: u * u * a.y + 2 * u * t * c.y + t * t * b.y };
}

/** The readout's three digits for a progress of 0 to 1: 0.07 → [0, 0, 7], 1 → [1, 0, 0]. */
export function pctDigits(progress: number): [number, number, number] {
  const n = Math.round(Math.min(1, Math.max(0, progress)) * 100);
  return [Math.floor(n / 100), Math.floor(n / 10) % 10, n % 10];
}
