"use client";

import { m, useSpring } from "motion/react";
import { useEffect, useRef, type ReactNode } from "react";

/**
 * Leans its child toward the pointer (a few degrees, on springs) while the pointer is over the
 * closest `.spot` card, and lets it settle back after. Fine pointers only, never under reduced motion.
 */
export function Tilt({ children, max = 5, className = "" }: { children: ReactNode; max?: number; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const rx = useSpring(0, { stiffness: 150, damping: 18, mass: 0.8 });
  const ry = useSpring(0, { stiffness: 150, damping: 18, mass: 0.8 });
  const lift = useSpring(0, { stiffness: 220, damping: 20 });

  useEffect(() => {
    const el = ref.current;
    const card = el?.closest<HTMLElement>(".spot") ?? el;
    if (!el || !card) return;
    if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const onMove = (event: PointerEvent) => {
      const rect = el.getBoundingClientRect();
      const px = (event.clientX - rect.left) / rect.width - 0.5;
      const py = (event.clientY - rect.top) / rect.height - 0.5;
      ry.set(Math.max(-1, Math.min(1, px)) * max);
      rx.set(Math.max(-1, Math.min(1, -py)) * max * 0.7);
      lift.set(-6);
    };
    const onLeave = () => {
      rx.set(0);
      ry.set(0);
      lift.set(0);
    };
    card.addEventListener("pointermove", onMove);
    card.addEventListener("pointerleave", onLeave);
    return () => {
      card.removeEventListener("pointermove", onMove);
      card.removeEventListener("pointerleave", onLeave);
    };
  }, [max, rx, ry, lift]);

  return (
    <div className={`[perspective:1400px] ${className}`}>
      <m.div ref={ref} style={{ rotateX: rx, rotateY: ry, y: lift, transformStyle: "preserve-3d" }}>
        {children}
      </m.div>
    </div>
  );
}
