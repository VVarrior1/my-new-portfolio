/**
 * The first second on the home page, once per visit: traffic arrives. A counter rolls up to the
 * simulator's starting load (160 requests a second) while a hairline of the accent fills under it,
 * then the whole sheet lifts away like a skin of water, its bottom edge bowing, and the name rises.
 *
 * Pure CSS on a timer. It only shows when the head script has set html[data-intro] (motion allowed,
 * first view of / in this tab), so without JavaScript, under reduced motion and on every later visit
 * it never appears. It is fixed and ignores the pointer, so it can't shift or block anything.
 */
export function Intro({ rate = 160 }: { rate?: number }) {
  const hundreds = Math.floor(rate / 100);
  const tens = Math.floor(rate / 10);
  return (
    <div className="intro" aria-hidden="true">
      <div className="intro-sheet">
        <div className="intro-center">
          <p className="intro-count">
            <span className="intro-col">
              <span className="intro-reel" style={{ ["--to" as string]: hundreds }}>
                {Array.from({ length: hundreds + 1 }, (_, i) => (
                  <span key={i}>{i}</span>
                ))}
              </span>
            </span>
            <span className="intro-col">
              <span className="intro-reel" style={{ ["--to" as string]: tens }}>
                {Array.from({ length: tens + 1 }, (_, i) => (
                  <span key={i}>{i % 10}</span>
                ))}
              </span>
            </span>
            <span className="intro-col">
              <span className="intro-reel" style={{ ["--to" as string]: rate }}>
                {Array.from({ length: rate + 1 }, (_, i) => (
                  <span key={i}>{i % 10}</span>
                ))}
              </span>
            </span>
          </p>
          <span className="intro-bar" />
          <p className="intro-label">
            <span>requests / s</span>
            <span>a small system you can break</span>
          </p>
        </div>
      </div>
    </div>
  );
}
