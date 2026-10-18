import type { ReactNode } from "react";

/**
 * A home-page section inside the frame. It opens on a station (where the spine's packet lights it)
 * and a sticky eyebrow bar: a cobalt index, the section's name (its h2) and a mono meta line on
 * the right. On laptops the name also flies along the rail (components/hud.tsx reads `data-hud`);
 * everywhere else, and without JavaScript, the section shows it as a large word under the bar.
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
  title: string;
  meta?: ReactNode;
  className?: string;
  children: ReactNode;
}) {
  return (
    <section id={id} aria-labelledby={`${id}-title`} className={`chapter scroll-mt-16 ${className}`} data-hud={title}>
      <span aria-hidden="true" className="station" data-station="" data-route={`/${id}`} />
      <span aria-hidden="true" className="station station-right" />
      <div className="eyebrow">
        <h2 id={`${id}-title`} className="eyebrow-title">
          <span className="eyebrow-index" aria-hidden="true">
            {index}
          </span>
          <span className="eyebrow-slash" aria-hidden="true">
            /
          </span>
          {title}
        </h2>
        {meta && <p className="eyebrow-meta">{meta}</p>}
      </div>
      <p aria-hidden="true" className="section-word" data-reveal="wipe">
        <span>{title}</span>
      </p>
      <div className="chapter-body">{children}</div>
    </section>
  );
}
