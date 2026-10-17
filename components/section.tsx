import type { ReactNode } from "react";

/**
 * A home-page section: a mono index and the meta line on one rule, then the title, big, which
 * slides up as it scrolls in (scrubbed by the scroll, CSS only), then the content.
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
    <section id={id} aria-labelledby={`${id}-title`} className="scroll-mt-24">
      <div className="mx-auto max-w-[76rem] px-4 pb-12 pt-14 sm:px-8 sm:pb-16 sm:pt-20">
        <div className="t-mono flex items-baseline justify-between gap-6 border-t border-ink pt-3 text-graphite">
          <span aria-hidden="true" className="text-ink">
            {index}
          </span>
          {meta && <span className="text-right">{meta}</span>}
        </div>
        <h2 id={`${id}-title`} className="t-section s-rise mt-6 sm:mt-8">
          {title}
        </h2>
        <div className="mt-10 sm:mt-14">{children}</div>
      </div>
    </section>
  );
}
