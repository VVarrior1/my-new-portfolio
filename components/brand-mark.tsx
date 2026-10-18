"use client";

import { useEffect, useId, useRef, useState } from "react";
import { MARK_A, MARK_DOT, MARK_FM, MARK_PEN, MARK_ROUTE, MARK_VIEWBOX } from "./brand-mark-data";
import "./brand-mark.css";

// The brand mark, "Am.": a heavy upright A whose crossbar runs out through its right leg, thins and
// rises into an italic serif m, then a cobalt full stop. The bar writes the m: the sans voice turns
// into the serif mid-stroke, as the hero sets "Abdelrahman" against an italic "Mohamed". Paths come
// from scripts/brand/build_mark.py.
//
// It writes itself once on load: the stop runs in like a request packet along the crossbar, out
// through the flick and through the m, drawing it behind it (a dash under a mask), then settles as
// the full stop with a spring. The name flight (components/hud.tsx) replays that when the first name
// has poured into the stop, and hover replays it with the m lit in cobalt. Under reduced motion,
// and whenever no draw is running, it is simply the complete mark.

let drawnOnce = false;

export function BrandMark({ className = "" }: { className?: string }) {
  const ref = useRef<SVGSVGElement>(null);
  const mask = `am-${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;
  // Only the first mount in a visit writes itself; later pages keep the mark still.
  const [draw] = useState(() => (drawnOnce ? undefined : "a"));

  useEffect(() => {
    drawnOnce = true;
    const svg = ref.current;
    if (!svg) return;
    // The draw is over when the stop has settled; then the mark is just the mark again.
    const end = (event: AnimationEvent) => {
      if (event.animationName.startsWith("am-pop-")) delete svg.dataset.draw;
    };
    svg.addEventListener("animationend", end);
    return () => svg.removeEventListener("animationend", end);
  }, []);

  return (
    <svg
      ref={ref}
      viewBox={MARK_VIEWBOX}
      className={`am ${className}`}
      data-draw={draw}
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <mask id={mask} maskUnits="userSpaceOnUse" x="0" y="0" width="100%" height="100%">
          <path
            className="am-pen"
            d={MARK_ROUTE}
            pathLength={1}
            fill="none"
            stroke="#fff"
            strokeWidth={MARK_PEN}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {/* Fills the rest at the very end (the pen's width misses a few corners), and at rest. */}
          <rect className="am-fill" width="100%" height="100%" fill="#fff" />
        </mask>
      </defs>
      {/* The A and the stop are landing targets for the hero's name (data-wl), kept visible (data-keep). */}
      <path className="am-a" d={MARK_A} data-wl="" data-keep="" />
      <path className="am-m" d={MARK_FM} mask={`url(#${mask})`} />
      <circle className="am-dot" cx={MARK_DOT.cx} cy={MARK_DOT.cy} r={MARK_DOT.r} data-wl="" data-keep="" />
    </svg>
  );
}

/** Write the mark again (the hero's name has just been delivered into it). */
export function redrawMark(svg: SVGSVGElement | null) {
  if (!svg || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  svg.dataset.draw = svg.dataset.draw === "b" ? "a" : "b";
}
