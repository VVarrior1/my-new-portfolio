// A handle on the page's smooth scroller (Lenis, started by components/motion-root.tsx), so the
// rail and the command menu can glide to a place instead of jumping, and the choreography can read
// the scroll velocity. Null when the page scrolls natively (reduced motion, or before Lenis loads).

import type Lenis from "lenis";

export type Smooth = Lenis;

let smooth: Smooth | null = null;
const listeners = new Set<(next: Smooth | null) => void>();

export function setSmooth(next: Smooth | null) {
  smooth = next;
  for (const listener of listeners) listener(next);
}

export const getSmooth = () => smooth;

export function onSmooth(listener: (next: Smooth | null) => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export const easeOutExpo = (t: number) => (t === 1 ? 1 : 1 - Math.pow(2, -10 * t));
export const easeInOutCubic = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

/**
 * Scrolls to `#id` on the current page and returns true, or returns false when there is no such
 * element here (the caller then navigates normally).
 */
export function scrollToHash(href: string): boolean {
  const url = new URL(href, window.location.href);
  if (url.pathname !== window.location.pathname || !url.hash) return false;
  const target = document.getElementById(decodeURIComponent(url.hash.slice(1)));
  if (!target) return false;
  if (smooth) smooth.scrollTo(target, { offset: -64, duration: 1.25, easing: easeOutExpo });
  else target.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
  if (window.location.hash !== url.hash) window.history.pushState(window.history.state, "", url.hash);
  return true;
}
