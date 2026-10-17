import type { ReactNode } from "react";
import { SplitHeading } from "./split";
import { Station } from "./spine";

/**
 * A home-page section: a station on the spine level with the mono index, the title as a poster
 * line under it (its letters rise when it scrolls in), and the content below. `meta` is a short
 * mono line next to the index (counts, a date range).
 */
export function Section({
  id,
  index,
  title,
  meta,
  children,
}: {
  id: string;
  index: string;
  title: string;
  meta?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section id={id} aria-labelledby={`${id}-title`} className="scroll-mt-16">
      <div className="wrap pb-20 pt-16 sm:pb-28 sm:pt-24">
        <header className="relative">
          <Station className="top-[0.6875rem]" route={`/${id}`} />
          <p className="t-mono flex flex-wrap items-baseline gap-x-4 text-graphite">
            <span className="text-ink" aria-hidden="true">
              {index}
            </span>
            {meta && <span>{meta}</span>}
          </p>
          <h2 id={`${id}-title`} className="t-section reveal-title mt-3 sm:mt-4">
            <SplitHeading text={title} />
          </h2>
        </header>
        <div className="mt-10 sm:mt-16">{children}</div>
      </div>
    </section>
  );
}
