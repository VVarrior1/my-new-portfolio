"use client";

import { useInView } from "motion/react";
import { useEffect, useRef } from "react";

/** "~300" → { prefix: "~", value: 300, suffix: "" }; "180K" → { value: 180, suffix: "K" }. */
export function parseFigure(text: string): { prefix: string; value: number; suffix: string; decimals: number } | null {
  const match = /^([^\d]*)([\d,]+(?:\.\d+)?)(.*)$/.exec(text);
  if (!match) return null;
  const raw = match[2].replace(/,/g, "");
  return { prefix: match[1], value: Number(raw), suffix: match[3], decimals: raw.includes(".") ? raw.split(".")[1].length : 0 };
}

/**
 * A number that counts up on a spring the first time it scrolls into view. The server renders the
 * real figure, so without JS (or under reduced motion) it simply shows it.
 */
export function SpringNumber({ value, className }: { value: string; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "0px 0px -12% 0px" });
  const armed = useRef(false);
  const figure = parseFigure(value);

  // Arm only figures that start below the fold, so nothing visible ever drops to zero.
  useEffect(() => {
    const el = ref.current;
    if (!el || !figure || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (el.getBoundingClientRect().top < window.innerHeight * 0.88) return;
    armed.current = true;
    el.textContent = `${figure.prefix}0${figure.suffix}`;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const el = ref.current;
    if (!inView || !armed.current || !el || !figure) return;
    // A damped spring from 0 to the figure (stiffness 60, damping 16, mass 1), integrated per frame.
    let x = 0;
    let v = 0;
    let last = performance.now();
    let frame = requestAnimationFrame(function tick(now) {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const a = 60 * (1 - x) - 16 * v;
      v += a * dt;
      x += v * dt;
      const latest = x * figure.value;
      const shown = figure.decimals ? latest.toFixed(figure.decimals) : Math.round(Math.max(0, latest)).toLocaleString("en-US");
      el.textContent = `${figure.prefix}${shown}${figure.suffix}`;
      if (Math.abs(1 - x) < 0.002 && Math.abs(v) < 0.01) {
        el.textContent = value;
        return;
      }
      frame = requestAnimationFrame(tick);
    });
    return () => cancelAnimationFrame(frame);
  }, [inView, figure, value]);

  return (
    <span ref={ref} className={className}>
      {value}
    </span>
  );
}
