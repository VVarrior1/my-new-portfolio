import type { ReactNode } from "react";

/**
 * A home-page section: one of the opaque sheets that slide over the liquid. A mono index on its
 * own line, a large title that rises out of its own clip as it enters, and the content below on the
 * shared 12-column grid. `meta` is a short mono line on the right (counts, a date range).
 */
export function Section({
  id,
  index,
  title,
  meta,
  className = "",
  children,
}: {
  id: string;
  index: string;
  title: ReactNode;
  meta?: ReactNode;
  className?: string;
  children: ReactNode;
}) {
  return (
    <section id={id} aria-labelledby={`${id}-title`} className={`sheet scroll-mt-16 ${className}`} data-liquid-edge>
      <div className="mx-auto max-w-[88rem] px-4 py-20 sm:px-8 sm:py-32">
        <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3 border-b border-rule pb-6 sm:pb-8">
          <div>
            <p className="t-mono mb-3 text-graphite" aria-hidden="true">
              <span className="text-signal-text">{index}</span>
            </p>
            <h2 id={`${id}-title`} className="t-section" data-reveal="title">
              {title}
            </h2>
          </div>
          {meta && <p className="t-mono pb-[0.4rem] text-graphite">{meta}</p>}
        </div>
        <div className="mt-12 sm:mt-16">{children}</div>
      </div>
    </section>
  );
}
