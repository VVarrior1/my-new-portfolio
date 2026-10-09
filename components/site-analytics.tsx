"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

const ENDPOINT = "/api/analytics/track";

function send(payload: Record<string, unknown>) {
  const body = JSON.stringify(payload);
  try {
    // keepalive lets the request finish even if the click navigates away.
    void fetch(ENDPOINT, {
      method: "POST",
      body,
      keepalive: true,
      headers: { "Content-Type": "application/json" },
    }).catch(() => undefined);
  } catch {
    navigator.sendBeacon?.(ENDPOINT, body);
  }
}

/** Records a named event for interactions that aren't links (e.g. copying the email address). */
export function trackEvent(name: string) {
  send({ type: "event", name });
}

/** First-load referrer: a ?ref= tag (e.g. ?ref=resume) wins over document.referrer. */
function initialReferrer(): string {
  const tag = new URLSearchParams(window.location.search).get("ref");
  return tag ? `ref:${tag}` : document.referrer;
}

/** Event name for a clicked link: an explicit data-track, or out:<host> for external links. */
export function eventNameFor(anchor: HTMLAnchorElement, ownHost: string): string | null {
  const explicit = anchor.closest<HTMLElement>("[data-track]")?.dataset.track;
  if (explicit) return explicit;
  if (anchor.href.startsWith("mailto:")) return "email";
  try {
    const url = new URL(anchor.href);
    if (url.pathname.endsWith(".pdf")) return "resume-download";
    if (url.host !== ownHost) return `out:${url.hostname.replace(/^www\./, "")}`;
  } catch {
    return null;
  }
  return null;
}

export function SiteAnalytics() {
  const pathname = usePathname();
  const lastPath = useRef<string | null>(null);
  const referrer = useRef<string | null>(null);

  useEffect(() => {
    if (!pathname || pathname.startsWith("/admin") || lastPath.current === pathname) return;
    lastPath.current = pathname;
    // Only the first page of a visit carries the referrer.
    const ref = referrer.current === null ? initialReferrer() : "";
    referrer.current = ref;
    send({ type: "view", path: pathname, referrer: ref });
  }, [pathname]);

  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      const anchor = (event.target as Element | null)?.closest?.("a");
      if (!anchor) return;
      const name = eventNameFor(anchor, window.location.host);
      if (name) send({ type: "event", name });
    };
    document.addEventListener("click", onClick, { capture: true });
    return () => document.removeEventListener("click", onClick, { capture: true });
  }, []);

  return null;
}
