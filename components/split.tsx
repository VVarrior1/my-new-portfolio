import type { CSSProperties } from "react";

/**
 * A line of display type split into letters, each in its own span inside a mask, so the letters can
 * rise out of the line (on load for the name, on scroll for titles). The split copy is hidden from
 * assistive technology; pass the real text to the heading with `sr-only` next to it. The resting
 * state is the finished one: without motion the line simply reads.
 */
export function SplitLine({ text, start = 0, className = "" }: { text: string; start?: number; className?: string }) {
  // Each word is its own mask (an inline-block that clips), so long titles still wrap between words.
  let index = start;
  const words = text.split(" ");
  return (
    <span aria-hidden="true" className={`split-line ${className}`}>
      {words.map((word, w) => (
        <span key={w}>
          {w > 0 && " "}
          <span className="split-word">
            {Array.from(word).map((ch, i) => (
              <span key={i} className="split-ch" style={{ "--i": index++ } as CSSProperties}>
                {ch}
              </span>
            ))}
          </span>
        </span>
      ))}
    </span>
  );
}

/** A heading's text, split for the reveal, with the plain text kept for screen readers. */
export function SplitHeading({ text }: { text: string }) {
  return (
    <>
      <span className="sr-only">{text}</span>
      <SplitLine text={text} />
    </>
  );
}
