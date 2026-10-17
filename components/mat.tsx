/**
 * The cutting mat the home page sits on (styles in app/globals.css, under "The cutting mat").
 * Everything here is printed decoration: server-rendered, aria-hidden, no JavaScript.
 */

/** One unit of the mat is one column pitch (74px column + 24px gutter), so text edges land on its lines. */
const UNITS = Array.from({ length: 32 }, (_, i) => i + 1);

/**
 * The scale printed down the mat's left edge (wide screens only). It restarts at every section,
 * whose number is printed at the origin. While you read a section, an orange cursor holds that
 * number at the top of the window and the scale slides under it. The cursor rests under the
 * printed origin (which is opaque), so only the section you are in shows orange; it is plain
 * position: sticky, so the handover between sections needs no script.
 */
export function MatScale({ index }: { index?: string }) {
  return (
    <div className="mat-scale" aria-hidden="true">
      <div className="mat-scale-units">
        {UNITS.map((unit) => (
          <span key={unit} style={{ top: unit * 98 }}>
            {unit}
          </span>
        ))}
      </div>
      {index && (
        <>
          <span className="mat-cursor">
            <span>{index}</span>
          </span>
          <span className="mat-origin">
            <span>{index}</span>
          </span>
        </>
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
 * scale, with the twelve columns of the page grid numbered on wide screens, and the mat's own
 * printed label.
 */
export function MatEdge() {
  return (
    <div className="mat-edge" aria-hidden="true">
      <div className="mx-auto h-full max-w-[76rem] px-4 sm:px-8">
        <div className="relative h-full">
          {COLUMNS.map((column) => (
            <span key={column} className="mat-edge-col" style={{ left: (column - 1) * 98 }}>
              {column}
            </span>
          ))}
          <span className="mat-edge-label">self-healing · 98 px grid</span>
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
