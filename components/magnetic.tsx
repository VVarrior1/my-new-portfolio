"use client";

import { m, useSpring } from "motion/react";
import { useEffect, useRef, type ReactNode } from "react";
import { SPRING } from "./springs";

/**
 * Pulls its child toward the pointer while the pointer is over it, then springs back. Only for a
 * fine pointer without reduced motion; elsewhere it is a plain wrapper.
 */
export function Magnetic({ children, strength = 0.32, className = "" }: { children: ReactNode; strength?: number; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const enabled = useRef(false);
  const x = useSpring(0, SPRING.follow);
  const y = useSpring(0, SPRING.follow);

  useEffect(() => {
    enabled.current =
      window.matchMedia("(hover: hover) and (pointer: fine)").matches && !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }, []);

  return (
    <m.span
      ref={ref}
      className={`inline-flex ${className}`}
      style={{ x, y }}
      onPointerMove={(event) => {
        if (!enabled.current || !ref.current) return;
        const rect = ref.current.getBoundingClientRect();
        // The rect includes the current pull, so the offset settles instead of running away.
        x.set((event.clientX - (rect.left + rect.width / 2)) * strength);
        y.set((event.clientY - (rect.top + rect.height / 2)) * strength);
      }}
      onPointerLeave={() => {
        x.set(0);
        y.set(0);
      }}
    >
      {children}
    </m.span>
  );
}
