/**
 * The signal trace: one PCB trace that leaves the hero simulator level with its request flow, runs
 * down the page gutter (right of the content on desktop, left of it on phones), taps each section
 * header and the objects on the content edge, and terminates at the contact console. As you scroll,
 * an orange packet rides it at the middle of the screen, the trace behind it turns graphite and each
 * junction flashes orange as the packet passes. All of it is CSS (scroll-driven animations, see
 * "Signal circuit" in app/globals.css): no JavaScript, static under reduced motion or where scroll
 * timelines aren't supported, and hidden from assistive technology.
 */

type TapKind = "node" | "tap" | "origin" | "end";

/** A branch off the trunk: a pad, a wire and a 45° bend to the trunk. Sits on the content edge of its box. */
export function CircuitTap({ kind = "tap", className = "" }: { kind?: TapKind; className?: string }) {
  return (
    <span aria-hidden="true" className={`circuit-tap circuit-tap-${kind} ${className}`}>
      <span className="circuit-wire" />
      <svg className="circuit-bend" viewBox="0 0 8 8" width="8" height="8" focusable="false">
        <path d={kind === "origin" ? "M0 0 8 8" : "M0 8 8 0"} />
      </svg>
      <span className="circuit-pad" />
    </span>
  );
}

/** A section's stretch of trunk, from its top rule to its bottom (or to the console), and the via on the rule. */
export function CircuitRun({ end = false }: { end?: boolean }) {
  return (
    <>
      <span aria-hidden="true" className={`circuit-run${end ? " circuit-run-end" : ""}`}>
        <span className="circuit-fill" />
        <span className="circuit-packet" />
      </span>
      <span aria-hidden="true" className="circuit-via" />
    </>
  );
}

/** The hero's piece: the connector on the simulator's edge and the trunk from there to the first section. */
export function CircuitOrigin() {
  return (
    <span aria-hidden="true" className="circuit-origin">
      <CircuitTap kind="origin" />
      <span className="circuit-origin-run" />
    </span>
  );
}
