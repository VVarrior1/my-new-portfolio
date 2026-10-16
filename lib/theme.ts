export type Theme = "light" | "dark";

export function currentTheme(): Theme {
  const set = document.documentElement.dataset.theme;
  if (set === "light" || set === "dark") return set;
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

/** --paper for each theme, so the browser chrome on phones matches the page. */
const PAPER: Record<Theme, string> = { light: "#f7f8fa", dark: "#0a0b0e" };

/** Points both theme-color metas at the chosen theme once the visitor has picked one. */
export function syncThemeColor(theme: Theme = currentTheme()) {
  for (const meta of document.querySelectorAll('meta[name="theme-color"]')) meta.setAttribute("content", PAPER[theme]);
}

function apply(next: Theme) {
  document.documentElement.dataset.theme = next;
  syncThemeColor(next);
  try {
    localStorage.setItem("theme", next);
  } catch {
    // Private mode: the choice just won't persist.
  }
}

/**
 * Switches theme. Where the View Transitions API exists, the new theme grows
 * out of `origin` (the toggle button) as a circle; elsewhere it switches instantly.
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
  const radius = Math.hypot(Math.max(x, window.innerWidth - x), Math.max(y, window.innerHeight - y));
  const transition = doc.startViewTransition(() => apply(next));
  transition.ready
    .then(() => {
      document.documentElement.animate(
        { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${radius}px at ${x}px ${y}px)`] },
        { duration: 520, easing: "cubic-bezier(0.32, 0.72, 0, 1)", pseudoElement: "::view-transition-new(root)" },
      );
    })
    .catch(() => undefined);
  return next;
}
