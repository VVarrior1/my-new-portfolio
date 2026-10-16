import type { ReactNode } from "react";

/**
 * A home-page section on the drafted sheet: a full-bleed rule on top (with registration
 * marks where it crosses the page frame), the title above its content at column 1.
 */
export function Section({
  id,
  title,
  children,
  aside,
}: {
  id: string;
  title: string;
  children: ReactNode;
  /** A short line set to the right of the title on wide screens. */
  aside?: ReactNode;
}) {
  return (
    <section id={id} aria-labelledby={`${id}-title`} className="ruled scroll-mt-16">
      <div className="mx-auto max-w-[76rem] px-4 py-16 sm:px-8 lg:py-24">
        <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
          <h2 id={`${id}-title`} className="t-section">
            {title}
          </h2>
          {aside && <div className="t-meta text-graphite">{aside}</div>}
        </div>
        <div className="mt-10 lg:mt-14">{children}</div>
      </div>
    </section>
  );
}
