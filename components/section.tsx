import type { ReactNode } from "react";

/**
 * A home-page section: a 1px top rule, then a two-tone heading above the content,
 * the first clause in ink and the rest in graphite ("Work. Shipped, used, and measured.").
 */
export function Section({
  id,
  title,
  muted,
  children,
  className = "",
  rule = true,
}: {
  id: string;
  title: string;
  /** The graphite half of the heading. */
  muted?: string;
  children: ReactNode;
  className?: string;
  /** False for the section right after the hero, where the plate's light fades out instead of a rule. */
  rule?: boolean;
}) {
  return (
    <section id={id} aria-labelledby={`${id}-title`} className={`scroll-mt-16 ${rule ? "border-t border-rule" : ""} ${className}`}>
      <div className="wrap py-16 lg:py-28">
        <h2 id={`${id}-title`} className="t-section max-w-[52rem]">
          {title}
          {muted && <span className="muted"> {muted}</span>}
        </h2>
        <div className="mt-10 lg:mt-14">{children}</div>
      </div>
    </section>
  );
}
