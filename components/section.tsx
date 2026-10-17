import type { CSSProperties, ReactNode } from "react";
import { HazardTape } from "./bench-hardware";

/** Label tape never goes on straight; each section's strip leans its own way. */
const TILTS = ["-2deg", "1.25deg", "-1deg", "1.5deg", "-1.5deg"];
export const tiltFor = (index: string) => TILTS[(Number.parseInt(index, 10) - 1 + TILTS.length) % TILTS.length] ?? TILTS[0];

/**
 * A home-page section: the index on a strip of label tape, the title under it, and the content
 * below, on the shared 12-column grid. Titles start on the content edge. `meta` is a short mono
 * line on the right (counts, a date range), like the label strip on a front panel.
 *
 * `board` hangs the section on the perforated pegboard (alternate sections, so the long stretches
 * of paper get a rhythm); `tape` sticks a strip of hazard tape across its top rule.
 */
export function Section({
  id,
  index,
  title,
  meta,
  board = false,
  tape = false,
  children,
}: {
  id: string;
  index: string;
  title: string;
  meta?: ReactNode;
  board?: boolean;
  tape?: boolean;
  children: ReactNode;
}) {
  return (
    <section
      id={id}
      aria-labelledby={`${id}-title`}
      className={`relative scroll-mt-16 border-t border-rule ${board ? "pegboard" : ""}`}
    >
      {tape && <HazardTape />}
      <div className="mx-auto max-w-[76rem] px-4 py-16 sm:px-8 sm:py-24">
        <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-2">
          <div>
            <p className="mb-3" aria-hidden="true">
              <span className="dymo" style={{ "--tilt": tiltFor(index) } as CSSProperties}>
                {index}
              </span>
            </p>
            <h2 id={`${id}-title`} className="t-section">
              {title}
            </h2>
          </div>
          {meta && <p className="t-mono pb-[0.3rem] text-graphite">{meta}</p>}
        </div>
        <div className="mt-10 sm:mt-12">{children}</div>
      </div>
    </section>
  );
}
