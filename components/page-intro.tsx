import type { ReactNode } from "react";

/** The top of a secondary page: a mono path, a 40-64px two-tone title and a graphite lead. */
export function PageIntro({ path, title, muted, children }: { path: string; title: string; muted?: string; children?: ReactNode }) {
  return (
    <header className="max-w-[52rem]">
      <p className="t-mono text-graphite">{path}</p>
      <h1 className="t-name mt-4">
        {title}
        {muted && <span className="text-graphite"> {muted}</span>}
      </h1>
      {children && <div className="measure mt-5 text-[1.125rem] leading-[1.55] text-graphite sm:text-[1.25rem]">{children}</div>}
    </header>
  );
}
