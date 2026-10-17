import type { CSSProperties } from "react";

/**
 * The cutting mat the home page sits on (styles in app/globals.css, under "The cutting mat").
 * Everything here is printed decoration: server-rendered, aria-hidden, no JavaScript.
 *
 * One unit of the mat is one column pitch of the 12-column grid ((content width + gutter) / 12,
 * 98px = 74 + 24 once the container is at its full 76rem), so text edges land on its lines. The
 * CSS owns the length (--mat-ux across, --mat-uy down); markup only says which unit a mark is on.
 */

/** Numerals on every second unit, enough for a section 64 units tall (about 6,300px). */
const UNITS = Array.from({ length: 32 }, (_, i) => (i + 1) * 2);

/**
 * Puts a mark on unit `i` of the scale it sits in (see .mat-scale-units and .mat-edge-col). Unit
 * and column numerals are printed from `data-n` by CSS, so they are never selected, copied or
 * announced, and contrast checkers don't mistake the faint print for text.
 */
const onUnit = (i: number) => ({ "--i": i }) as CSSProperties;

/**
 * The scale printed down the mat's left edge (wide screens only). It restarts at every section.
 * While you read a section, an orange cursor holds that section's number at the top of the
 * window and the scale slides under it. Each section's scale is clipped to the section, and its
 * cursor waits just above the section's top edge, out of sight. So as an edge passes the cursor,
 * the old number is cut off above the edge while the new one is uncovered below it, in the same
 * place: the handover happens at the edge itself and two numbers never stand side by side. It is
 * plain position: sticky, no script.
 */
export function MatScale({ index }: { index?: string }) {
  return (
    <div className="mat-scale" aria-hidden="true">
      <div className="mat-scale-units">
        {UNITS.map((unit) => (
          <span key={unit} style={onUnit(unit)} data-n={unit} />
        ))}
      </div>
      {index && (
        <div className="mat-scale-track">
          <span className="mat-cursor">
            <span>{index}</span>
          </span>
        </div>
      )}
    </div>
  );
}

function Target() {
  return (
    <svg width="13" height="13" viewBox="0 0 13 13" fill="none" stroke="currentColor" strokeWidth="1">
      <circle cx="6.5" cy="6.5" r="3.5" />
      <path d="M6.5 0v13M0 6.5h13" />
    </svg>
  );
}

/** Registration targets where a section's top edge crosses the content edges. */
export function MatMarks() {
  return (
    <>
      <span className="mat-reg mat-reg-l" aria-hidden="true">
        <Target />
      </span>
      <span className="mat-reg mat-reg-r" aria-hidden="true">
        <Target />
      </span>
    </>
  );
}

const COLUMNS = Array.from({ length: 12 }, (_, i) => i + 1);

/**
 * The scale along the mat's bottom edge, under the contact console: the same ticks as the left
 * scale, with the twelve columns of the page grid numbered once the page is on that grid, and
 * the mat's own printed label.
 */
export function MatEdge() {
  return (
    <div className="mat-edge" aria-hidden="true">
      <div className="mx-auto h-full max-w-[76rem] px-4 sm:px-8">
        <div className="relative h-full">
          {COLUMNS.map((column) => (
            <span key={column} className="mat-edge-col" style={onUnit(column - 1)} data-n={column} />
          ))}
          <span className="mat-edge-label">self-healing</span>
        </div>
      </div>
    </div>
  );
}

/** The angle guides a cutting mat prints from its corner (30°, 45°, 60°), here running under the console. */
const ANGLES = [30, 45, 60];

export function MatCorner() {
  const w = 240;
  const h = 200;
  return (
    <svg className="mat-corner" width={w} height={h} viewBox={`0 0 ${w} ${h}`} fill="none" aria-hidden="true">
      {ANGLES.map((deg) => {
        const rad = (deg * Math.PI) / 180;
        const reach = 400;
        const label = 100;
        const lx = w - Math.cos(rad) * label;
        const ly = h - Math.sin(rad) * label;
        return (
          <g key={deg}>
            <line x1={w} y1={h} x2={w - Math.cos(rad) * reach} y2={h - Math.sin(rad) * reach} stroke="currentColor" strokeWidth="1" />
            <text x={lx} y={ly} dy="-4" transform={`rotate(${deg} ${lx} ${ly})`} className="mat-corner-label">
              {deg}°
            </text>
          </g>
        );
      })}
    </svg>
  );
}
