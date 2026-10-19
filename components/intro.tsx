/**
 * The first second on the home page, once per visit: an odometer rolls up to the year he is
 * available from while a hairline of the accent fills under it, then the whole sheet lifts away like
 * a skin of water, its bottom edge bowing, and the name rises.
 *
 * Pure CSS on a timer. It only shows when the head script has set html[data-intro] (motion allowed,
 * first view of / in this tab), so without JavaScript, under reduced motion and on every later visit
 * it never appears. It is fixed and ignores the pointer, so it can't shift or block anything.
 */
export function Intro({ year, left, right }: { year: string; left: string; right: string }) {
  return (
    <div className="intro" aria-hidden="true">
      <div className="intro-sheet">
        <div className="intro-center">
          <p className="intro-count">
            {Array.from(year).map((char, i) => {
              const digit = Number(char);
              return (
                <span key={i} className="intro-col">
                  {/* Each column rolls from 0 up to its digit. */}
                  <span className="intro-reel" style={{ ["--to" as string]: digit }}>
                    {Array.from({ length: digit + 1 }, (_, n) => (
                      <span key={n}>{n}</span>
                    ))}
                  </span>
                </span>
              );
            })}
          </p>
          <span className="intro-bar" />
          <p className="intro-label">
            <span>{left}</span>
            <span>{right}</span>
          </p>
        </div>
      </div>
    </div>
  );
}
