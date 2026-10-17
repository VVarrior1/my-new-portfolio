"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useLayoutEffect, type ComponentProps, type MouseEvent } from "react";

type Router = ReturnType<typeof useRouter>;
type ViewTransitionDocument = Document & {
  startViewTransition?: (update: () => Promise<void>) => { finished: Promise<void> };
};

// Resolved by RouteTransitions once the new route has committed, so the browser snapshots the
// new page only after React has rendered it.
let pending: (() => void) | null = null;

/** Navigates inside a view transition where the browser has one, and plainly elsewhere. */
export function navigate(router: Router, href: string) {
  const doc = document as ViewTransitionDocument;
  const url = new URL(href, window.location.href);
  const samePage = url.pathname === window.location.pathname;
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (samePage || reduced || !doc.startViewTransition) {
    router.push(href);
    return;
  }
  document.documentElement.dataset.vt = "route";
  const transition = doc.startViewTransition(
    () =>
      new Promise<void>((resolve) => {
        pending = resolve;
        router.push(href);
        // Never hold the page frozen if the route is slow: let it go after a beat.
        window.setTimeout(resolve, 1200);
      }),
  );
  transition.finished.finally(() => {
    delete document.documentElement.dataset.vt;
  });
}

/** Mounted once in the root layout. */
export function RouteTransitions() {
  const pathname = usePathname();
  useLayoutEffect(() => {
    pending?.();
    pending = null;
  }, [pathname]);
  return null;
}

/** A Link whose navigation morphs (view transitions). Modified clicks and new tabs behave normally. */
export function TransitionLink({ href, onClick, ...props }: ComponentProps<typeof Link> & { href: string }) {
  const router = useRouter();
  const handle = (event: MouseEvent<HTMLAnchorElement>) => {
    onClick?.(event);
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    const url = new URL(href, window.location.href);
    if (url.origin !== window.location.origin || url.pathname === window.location.pathname) return;
    event.preventDefault();
    navigate(router, href);
  };
  return <Link href={href} onClick={handle} {...props} />;
}
