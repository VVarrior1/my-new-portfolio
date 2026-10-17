// A handle on the home page's smooth scroller (Lenis, set by components/choreography.tsx), so other
// components (the command menu) can glide to a section instead of jumping. Null when the page
// scrolls natively: other pages, reduced motion, or before the choreography has loaded.

type Scroller = (target: HTMLElement, offset: number) => void;

let scroller: Scroller | null = null;

export function setSmoothScroller(next: Scroller | null) {
  scroller = next;
}

/**
 * Scrolls to `#id` on the current page and returns true, or returns false when there is no such
 * element here (the caller then navigates normally).
 */
export function scrollToHash(href: string): boolean {
  const url = new URL(href, window.location.href);
  if (url.pathname !== window.location.pathname || !url.hash) return false;
  const target = document.getElementById(decodeURIComponent(url.hash.slice(1)));
  if (!target) return false;
  if (scroller) scroller(target, -64);
  else target.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
  if (window.location.hash !== url.hash) window.history.pushState(window.history.state, "", url.hash);
  return true;
}
