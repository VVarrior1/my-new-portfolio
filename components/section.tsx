import type { ReactNode } from "react";

/**
 * A home-page section on the liquid. Its header is one element with two looks:
 * - phones, tablets, touch and reduced motion: an index and a very large title;
 * - laptops with motion (where the HUD runs): a sticky frosted bar, "01 / WORK", while the title
 *   itself flies into the top-right corner (components/hud.tsx reads data-hud on the section).
 * The switch is a media query, so nothing moves after load. `meta` is a short mono line.
 */
export function Section({
  id,
  index,
  title,
  hud,
  meta,
  className = "",
  children,
}: {
  id: string;
  index: string;
  title: ReactNode;
  /** The name the HUD flies, in capitals. */
  hud: string;
  meta?: ReactNode;
  className?: string;
  children: ReactNode;
}) {
  return (
    <section id={id} aria-labelledby={`${id}-title`} className={`relative scroll-mt-16 ${className}`} data-hud={hud} data-hud-index={index}>
      <SectionHead id={id} index={index} title={title} meta={meta} />
      <div className="wrap pb-24 pt-12 sm:pb-36 sm:pt-16">{children}</div>
    </section>
  );
}

export function SectionHead({ id, index, title, meta }: { id: string; index: string; title: ReactNode; meta?: ReactNode }) {
  return (
    <div className="sec-head">
      <div className="wrap">
        <div className="sec-head-row" data-calm="0.95">
          <p className="sec-index t-mono" aria-hidden="true">
            <span className="text-signal-text">{index}</span>
            <span className="sec-slash"> / </span>
          </p>
          <h2 id={`${id}-title`} className="sec-title t-section" data-reveal="title" data-mtitle={index}>
            {typeof title === "string" ? <InlineLetters text={title} mark="tl" /> : title}
          </h2>
          {meta && <p className="sec-meta t-mono text-graphite">{meta}</p>}
        </div>
      </div>
    </div>
  );
}

/**
 * A name set as inline letters, so the HUD can lift each one off the page (the hero's name, the
 * section titles) without changing how it's set: inline spans keep the kerning. Read once by
 * screen readers. `mark` names the data attribute each letter carries.
 */
export function InlineLetters({ text, mark }: { text: string; mark: string }) {
  return (
    <>
      <span className="sr-only">{text}</span>
      <span aria-hidden="true">
        {Array.from(text).map((ch, i) => (
          <span key={i} {...{ [`data-${mark}`]: "" }}>
            {ch}
          </span>
        ))}
      </span>
    </>
  );
}

/**
 * A figure that counts up when it scrolls in. The server renders the final value, and a hidden copy
 * of it holds the width, so the count never shifts the layout and reads right without JavaScript.
 */
export function Count({ value, className = "" }: { value: string; className?: string }) {
  const m = value.match(/^([^\d]*)([\d.,]+)(.*)$/);
  if (!m) return <span className={className}>{value}</span>;
  return (
    <span className={`count ${className}`} data-count={m[2].replace(/,/g, "")} data-prefix={m[1]} data-suffix={m[3]}>
      <span className="count-hold" aria-hidden="true">
        {value}
      </span>
      <span className="count-run">{value}</span>
    </span>
  );
}
