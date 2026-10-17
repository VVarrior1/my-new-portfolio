import type { ReactNode } from "react";

/** The opening of a secondary page: the display title, a lead paragraph, and an optional mono meta line. */
export function PageHeader({ title, lead, meta, children }: { title: string; lead: ReactNode; meta?: ReactNode; children?: ReactNode }) {
  return (
    <header className="max-w-3xl">
      {meta && <p className="t-mono mb-5 text-graphite">{meta}</p>}
      <h1 className="t-display">{title}</h1>
      <p className="measure mt-6 text-[1.125rem] leading-relaxed text-ink-2 sm:text-[1.25rem]">{lead}</p>
      {children}
    </header>
  );
}
