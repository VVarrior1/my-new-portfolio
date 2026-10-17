/**
 * Small pieces of workbench hardware that decorate the page without carrying content: the
 * screws that hold a panel down and the strip of hazard tape on a section break. All of it is
 * server-rendered, aria-hidden and ignores the pointer. Colours come from the --screw-* and
 * --tape tokens in app/globals.css, so every piece follows the theme (and the console's plate).
 */

/** Each screw sits at its own angle, the way real ones end up after being driven in. */
const SCREWS = [
  { corner: "tl", angle: -28 },
  { corner: "tr", angle: 52 },
  { corner: "bl", angle: 14 },
  { corner: "br", angle: -63 },
] as const;

/** Four slotted screws in a panel's corners. The panel must be `position: relative`. */
export function Screws({ className = "" }: { className?: string }) {
  return (
    <span aria-hidden="true" className={`screws ${className}`}>
      {SCREWS.map(({ corner, angle }) => (
        <svg key={corner} viewBox="0 0 20 20" className={`screw screw-${corner}`}>
          <circle cx="10" cy="10" r="8.75" className="screw-head" />
          <path d="M4.6 10h10.8" className="screw-slot" transform={`rotate(${angle} 10 10)`} />
        </svg>
      ))}
    </span>
  );
}

/** A torn strip of hazard tape stuck across a section's top rule. The section must be `position: relative`. */
export function HazardTape({ className = "" }: { className?: string }) {
  return <span aria-hidden="true" className={`hazard-tape ${className}`} />;
}
