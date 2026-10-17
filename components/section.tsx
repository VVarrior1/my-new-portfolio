import type { ReactNode } from "react";

/**
 * A home-page section: a mono index on its own line, the title under it, and the content below,
 * on the shared 12-column grid. Titles start on the content edge. `meta` is a short mono line on
 * the right (counts, a date range), like the label strip on a front panel.
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
    <section id={id} aria-labelledby={`${id}-title`} className="scroll-mt-16 border-t border-rule">
      <div className="mx-auto max-w-[76rem] px-4 py-16 sm:px-8 sm:py-24">
        <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-2">
          <div>
            <p className="t-mono mb-2 text-graphite" aria-hidden="true">
              {index}
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
