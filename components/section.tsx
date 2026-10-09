import type { ReactNode } from "react";

/** A home-page section: title in a left column on wide screens, content on the right. */
export function Section({ id, title, children, aside }: { id: string; title: string; children: ReactNode; aside?: ReactNode }) {
  return (
    <section id={id} aria-labelledby={`${id}-title`} className="scroll-mt-20 border-t border-rule">
      <div className="mx-auto grid max-w-[76rem] gap-x-12 gap-y-8 px-4 py-16 sm:px-8 sm:py-24 lg:grid-cols-[13rem_minmax(0,1fr)]">
        <div className="lg:sticky lg:top-24 lg:self-start">
          <h2 id={`${id}-title`} className="section-title">
            {title}
          </h2>
          {aside && <div className="mt-3 text-[0.95rem] text-graphite">{aside}</div>}
        </div>
        <div className="min-w-0">{children}</div>
      </div>
    </section>
  );
}
