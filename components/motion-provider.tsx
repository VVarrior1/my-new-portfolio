"use client";

import { LazyMotion, MotionConfig } from "motion/react";
import type { ReactNode } from "react";

const features = () => import("./motion-features").then((module) => module.default);

/**
 * Motion for the whole site. Components use `m.*` (strict mode enforces it), so the animation
 * features load in their own chunk after the page is up. Under reduced motion, Motion skips
 * transform and layout animation and only fades.
 */
export function MotionProvider({ children }: { children: ReactNode }) {
  return (
    <LazyMotion features={features} strict>
      <MotionConfig reducedMotion="user">{children}</MotionConfig>
    </LazyMotion>
  );
}
