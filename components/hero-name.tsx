"use client";

import { useEffect, useRef } from "react";

const LIFT = 0.1; // em, at the pointer
const REACH = 1.3; // em, how far the swell spreads either side
const STIFFNESS = 320;
const DAMPING = 17;

/**
 * The name, a letter at a time. CSS raises each letter out of its own mask on load (so it works
 * before and without JS). After that the letters have weight: the line swells under a fine pointer,
 * and a tap or click sends a ripple through it. Transforms only, so nothing reflows.
 */
export function HeroName({ first, last }: { first: string; last: string }) {
  const root = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const el = root.current;
    if (!el || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const letters = Array.from(el.querySelectorAll<HTMLSpanElement>("[data-l]"));
    const state = letters.map(() => ({ y: 0, v: 0, target: 0, cx: 0, cy: 0 }));
    const fine = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
    let em = 100;
    let frame = 0;
    let last = 0;

    const measure = () => {
      em = parseFloat(getComputedStyle(el).fontSize) || 100;
      letters.forEach((letter, i) => {
        const rect = letter.getBoundingClientRect();
        state[i].cx = rect.left + rect.width / 2;
        state[i].cy = rect.top + rect.height / 2 + window.scrollY;
      });
    };

    const tick = (now: number) => {
      const dt = Math.min(0.032, (now - last) / 1000 || 0.016);
      last = now;
      let moving = false;
      state.forEach((s, i) => {
        // Two substeps keep the spring stable at 30fps.
        for (let k = 0; k < 2; k++) {
          const a = -STIFFNESS * (s.y - s.target) - DAMPING * s.v;
          s.v += a * (dt / 2);
          s.y += s.v * (dt / 2);
        }
        if (Math.abs(s.y - s.target) > 0.0005 || Math.abs(s.v) > 0.002) moving = true;
        const tilt = Math.max(-6, Math.min(6, s.v * 0.9));
        letters[i].style.transform = `translate3d(0, ${(-s.y * em).toFixed(2)}px, 0) rotate(${tilt.toFixed(2)}deg)`;
      });
      frame = moving ? requestAnimationFrame(tick) : 0;
    };
    const kick = () => {
      if (!frame) {
        last = performance.now();
        frame = requestAnimationFrame(tick);
      }
    };

    const onMove = (event: PointerEvent) => {
      if (!fine || event.pointerType !== "mouse") return;
      state.forEach((s) => {
        const d = (event.clientX - s.cx) / em;
        const dy = Math.abs(event.clientY + window.scrollY - s.cy) / em;
        s.target = dy > 0.9 ? 0 : LIFT * Math.exp(-((d / REACH) ** 2)) * (1 - dy / 0.9);
      });
      kick();
    };
    const onLeave = () => {
      state.forEach((s) => (s.target = 0));
      kick();
    };
    // A ripple: each letter gets an upward kick, later the farther it is from the press.
    const timers: number[] = [];
    const onDown = (event: PointerEvent) => {
      measure();
      state.forEach((s, i) => {
        const d = Math.abs(event.clientX - s.cx) / em;
        timers.push(
          window.setTimeout(() => {
            state[i].v += 2.6;
            kick();
          }, d * 70),
        );
      });
    };

    measure();
    const host = el.parentElement ?? el;
    host.addEventListener("pointermove", onMove);
    host.addEventListener("pointerleave", onLeave);
    host.addEventListener("pointerdown", onDown);
    window.addEventListener("resize", measure);
    // Letters are still rising for the first second; measure again once they've landed.
    const settle = window.setTimeout(measure, 1400);
    return () => {
      host.removeEventListener("pointermove", onMove);
      host.removeEventListener("pointerleave", onLeave);
      host.removeEventListener("pointerdown", onDown);
      window.removeEventListener("resize", measure);
      window.clearTimeout(settle);
      timers.forEach((t) => window.clearTimeout(t));
      cancelAnimationFrame(frame);
    };
  }, []);

  const line = (word: string, delayFrom: number) => (
    <span className="name-line">
      {Array.from(word).map((char, i) => (
        <span key={i} className="name-letter" style={{ ["--d" as string]: `${delayFrom + i * 38}ms` }}>
          <span data-l="" className="inline-block will-change-transform">
            {char}
          </span>
        </span>
      ))}
    </span>
  );

  return (
    <span ref={root} aria-hidden="true" className="name-lines">
      {line(first, 120)}
      {line(last, 120 + first.length * 38 + 40)}
    </span>
  );
}
