import type { ReactNode } from "react";

/**
 * A home-page section: a mono index and the title above the content, on the shared 12-column grid.
 * `meta` is a short mono line on the right (counts, a date range), like the label strip on a front panel.
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
          <div className="flex items-start gap-3">
            <span className="t-mono mt-[0.2rem] text-graphite sm:mt-[0.3rem]" aria-hidden="true">
              {index}
            </span>
            <h2 id={`${id}-title`} className="t-section">
              {title}
            </h2>
          </div>
          {meta && <p className="t-mono pb-[0.3rem] pl-7 text-graphite sm:pl-0">{meta}</p>}
        </div>
        <div className="mt-10 sm:mt-12">{children}</div>
      </div>
    </section>
  );
}
