import { emitFlow } from "./flow-bus";

export type Theme = "light" | "dark";

export function currentTheme(): Theme {
  const set = document.documentElement.dataset.theme;
  if (set === "light" || set === "dark") return set;
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

// --paper for each theme, so the browser chrome matches the page after a manual switch.
export const PAPER: Record<Theme, string> = { light: "#f4f4f5", dark: "#0b0c0e" };

function apply(next: Theme) {
  document.documentElement.dataset.theme = next;
  document.querySelectorAll('meta[name="theme-color"]').forEach((meta) => meta.setAttribute("content", PAPER[next]));
  try {
    localStorage.setItem("theme", next);
  } catch {
    // Private mode: the choice just won't persist.
  }
}

/**
 * An ink blot: a closed curve through `points` points around (cx, cy) whose radius wobbles with
 * angle and time. Every frame has the same commands, so the browser can interpolate between them.
 */
export function blotPath(cx: number, cy: number, radius: number, t: number, points = 16): string {
  const pts: Array<[number, number]> = [];
  for (let i = 0; i < points; i++) {
    const a = (i / points) * Math.PI * 2;
    // Three slow harmonics: lobes that swell and recede as the blot spreads, like ink in water.
    const wobble = 0.13 * Math.sin(3 * a + t * 5.1) + 0.08 * Math.sin(5 * a - t * 7.3 + 1.7) + 0.05 * Math.sin(8 * a + t * 3.7 + 0.4);
    const r = radius * (1 + wobble * Math.sin(Math.PI * Math.min(1, t * 1.1)));
    pts.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]);
  }
  // Catmull-Rom through the points, written as cubic Béziers.
  const f = (n: number) => n.toFixed(1);
  let d = `M ${f(pts[0][0])} ${f(pts[0][1])}`;
  for (let i = 0; i < points; i++) {
    const p0 = pts[(i - 1 + points) % points];
    const p1 = pts[i];
    const p2 = pts[(i + 1) % points];
    const p3 = pts[(i + 2) % points];
    const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += ` C ${f(c1[0])} ${f(c1[1])} ${f(c2[0])} ${f(c2[1])} ${f(p2[0])} ${f(p2[1])}`;
  }
  return `path("${d} Z")`;
}

/**
 * Switches theme. Where the View Transitions API exists, the new theme floods out of `origin`
 * (the toggle) as a spreading ink blot, and a drop of ink lands in the liquid field; elsewhere,
 * or under reduced motion, it switches instantly.
 */
export function toggleTheme(origin?: { x: number; y: number }): Theme {
  const next: Theme = currentTheme() === "dark" ? "light" : "dark";
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const doc = document as Document & { startViewTransition?: (cb: () => void) => { ready: Promise<void> } };

  if (!doc.startViewTransition || reduced) {
    apply(next);
    return next;
  }

  const x = origin?.x ?? window.innerWidth - 40;
  const y = origin?.y ?? 32;
  const far = Math.hypot(Math.max(x, window.innerWidth - x), Math.max(y, window.innerHeight - y)) * 1.35;
  const transition = doc.startViewTransition(() => apply(next));
  transition.ready
    .then(() => {
      // The drop lands below the header (whose band is calm water), so the nav stays readable.
      emitFlow({ kind: "drop", x: Math.min(x, window.innerWidth - 160), y: Math.max(y, 190), size: 0.8, accent: 0.3 });
      const steps = 14;
      const frames = Array.from({ length: steps + 1 }, (_, i) => {
        const t = i / steps;
        // Fast at first, then a long viscous spread.
        const eased = 1 - Math.pow(1 - t, 2.6);
        return { clipPath: blotPath(x, y, 6 + eased * far, t) };
      });
      document.documentElement.animate(frames, { duration: 900, easing: "linear", pseudoElement: "::view-transition-new(root)" });
    })
    .catch(() => undefined);
  return next;
}
