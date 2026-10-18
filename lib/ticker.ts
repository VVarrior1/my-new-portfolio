// One frame loop for the whole page. Lenis (smooth wheel scrolling) advances first, then every
// subscriber runs in priority order with the same scroll reading, so the fluid, the image planes,
// the HUD letters, the spine and the cursor all see one scroll position per frame and nothing
// swims against the DOM. The loop stops when nothing is subscribed or the tab is hidden.

export type Frame = {
  /** performance.now() of this frame. */
  now: number;
  /** Seconds since the last frame, capped at 1/20. */
  dt: number;
  /** window.scrollY after Lenis has moved it this frame. */
  y: number;
  /** Smoothed scroll velocity in px/s (positive = scrolling down). */
  velocity: number;
  /** Document height minus the viewport (the furthest scroll). */
  limit: number;
  vw: number;
  vh: number;
};

type Lenis = {
  raf: (time: number) => void;
  scrollTo: (target: number | HTMLElement | string, options?: Record<string, unknown>) => void;
  destroy: () => void;
  stop: () => void;
  start: () => void;
  isStopped?: boolean;
};

type Subscriber = { fn: (frame: Frame) => void; priority: number };

const subscribers: Subscriber[] = [];
let raf = 0;
let lenis: Lenis | null = null;
let lastNow = 0;
let lastY = 0;
let velocity = 0;
let vw = 0;
let vh = 0;
let limit = 0;
let measured = false;

const frame: Frame = { now: 0, dt: 0, y: 0, velocity: 0, limit: 0, vw: 0, vh: 0 };

function measure() {
  vw = window.innerWidth;
  vh = window.innerHeight;
  limit = Math.max(0, document.documentElement.scrollHeight - vh);
  measured = true;
}

function loop(now: number) {
  raf = 0;
  if (document.hidden || subscribers.length === 0) return;
  raf = requestAnimationFrame(loop);
  lenis?.raf(now);
  if (!measured) measure();
  const dt = lastNow ? Math.min(1 / 20, Math.max(1 / 240, (now - lastNow) / 1000)) : 1 / 60;
  lastNow = now;
  const y = window.scrollY;
  const raw = (y - lastY) / dt;
  lastY = y;
  // Exponential smoothing, so one jumpy frame doesn't read as a fling.
  velocity += (raw - velocity) * (1 - Math.exp(-10 * dt));
  if (Math.abs(velocity) < 0.5) velocity = 0;
  frame.now = now;
  frame.dt = dt;
  frame.y = y;
  frame.velocity = velocity;
  frame.limit = limit;
  frame.vw = vw;
  frame.vh = vh;
  for (const s of subscribers) s.fn(frame);
}

function kick() {
  if (!raf && !document.hidden && subscribers.length) {
    lastNow = 0;
    lastY = window.scrollY;
    raf = requestAnimationFrame(loop);
  }
}

let wired = false;
function wire() {
  if (wired || typeof window === "undefined") return;
  wired = true;
  document.addEventListener("visibilitychange", kick);
  window.addEventListener("resize", () => (measured = false), { passive: true });
  // Content height changes (fonts, images, the music popover) move the limit.
  if (typeof ResizeObserver === "function") new ResizeObserver(() => (measured = false)).observe(document.body);
}

/** Runs `fn` every frame until the returned function is called. Lower priority runs first. */
export function onFrame(fn: (frame: Frame) => void, priority = 0): () => void {
  wire();
  const s = { fn, priority };
  subscribers.push(s);
  subscribers.sort((a, b) => a.priority - b.priority);
  kick();
  return () => {
    const i = subscribers.indexOf(s);
    if (i >= 0) subscribers.splice(i, 1);
  };
}

/** The last frame's reading (for event handlers between frames). */
export const lastFrame = (): Readonly<Frame> => frame;

export function setLenis(next: Lenis | null) {
  lenis = next;
}

export const getLenis = () => lenis;

const easeOutExpo = (t: number) => (t === 1 ? 1 : 1 - Math.pow(2, -10 * t));

/** Smooth-scrolls to a y position or element (Lenis when it runs, the browser otherwise). */
export function scrollToTarget(target: number | HTMLElement, options: { offset?: number; duration?: number; easing?: (t: number) => number } = {}) {
  const offset = options.offset ?? 0;
  if (lenis) {
    lenis.scrollTo(target, { offset, duration: options.duration ?? 1.25, easing: options.easing ?? easeOutExpo, force: true });
    return;
  }
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const top = typeof target === "number" ? target : target.getBoundingClientRect().top + window.scrollY + offset;
  window.scrollTo({ top, behavior: reduced ? "auto" : "smooth" });
}
