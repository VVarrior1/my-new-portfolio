"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { blotPath } from "@/lib/theme";
import { onFrame, setLenis } from "@/lib/ticker";

// Page-wide motion, off entirely under prefers-reduced-motion:
// 1. Inertial scrolling (Lenis), so the page glides like the fluid under it. Anchor links and the
//    keyboard still work; Lenis drives the native scroll position.
// 2. Reveals. Anything with data-reveal starts its entrance when it nears the viewport. Elements
//    are only hidden once this has run (html[data-motion="on"]), so without JavaScript, or under
//    reduced motion, everything is simply there. data-reveal="blot" (screenshots, the portrait)
//    opens like ink spreading from one corner, the same blot as the theme switch.

export function MotionRoot() {
  const pathname = usePathname();

  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) return;
    let stopped = false;
    let lenis: { destroy: () => void; stop: () => void; start: () => void } | null = null;
    let off: (() => void) | null = null;
    let lock: MutationObserver | null = null;
    import("lenis").then(({ default: Lenis }) => {
      if (stopped) return;
      // The shared ticker drives Lenis, so everything drawn per frame reads the same scroll.
      const instance = new Lenis({ autoRaf: false, anchors: { offset: -64 }, lerp: 0.1, wheelMultiplier: 0.95, stopInertiaOnNavigate: true });
      lenis = instance;
      setLenis(instance);
      off = onFrame(() => undefined, -100);
      // Modal dialogs lock the page; Lenis stops with them or it keeps scrolling the page behind.
      lock = new MutationObserver(() => {
        if (document.body.hasAttribute("data-scroll-locked")) instance.stop();
        else instance.start();
      });
      lock.observe(document.body, { attributes: true, attributeFilter: ["data-scroll-locked"] });
    });
    return () => {
      stopped = true;
      off?.();
      lock?.disconnect();
      setLenis(null);
      lenis?.destroy();
    };
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      delete root.dataset.motion;
      return;
    }
    root.dataset.motion = "on";
    // Clipped elements (titles, blots) have an empty box to IntersectionObserver while they are
    // hidden, so their parent is observed instead.
    const targets = new Map<Element, HTMLElement[]>();
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          io.unobserve(entry.target);
          for (const el of targets.get(entry.target) ?? []) {
            if (el.dataset.reveal === "blot") blot(el);
            el.dataset.in = "";
          }
        }
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0 },
    );
    document.querySelectorAll<HTMLElement>("[data-reveal]:not([data-in])").forEach((node) => {
      const clipped = node.dataset.reveal === "title" || node.dataset.reveal === "blot";
      const target = (clipped && node.parentElement) || node;
      targets.set(target, [...(targets.get(target) ?? []), node]);
      io.observe(target);
    });
    return () => io.disconnect();
  }, [pathname]);

  return null;
}

function blot(el: HTMLElement) {
  const { width: w, height: h } = el.getBoundingClientRect();
  const origin = el.dataset.origin;
  const x = origin === "right" ? w * 0.85 : origin === "center" ? w * 0.5 : w * 0.15;
  const y = origin === "center" ? h * 0.55 : h * 0.8;
  const far = Math.hypot(Math.max(x, w - x), Math.max(y, h - y)) * 1.3;
  const steps = 12;
  const frames = Array.from({ length: steps + 1 }, (_, i) => {
    const t = i / steps;
    return { clipPath: blotPath(x, y, 4 + (1 - Math.pow(1 - t, 2.4)) * far, t) };
  });
  el.animate(frames, { duration: 1300, easing: "linear" });
}
