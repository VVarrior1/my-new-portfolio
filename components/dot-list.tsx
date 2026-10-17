import { Fragment, type ReactNode } from "react";

/**
 * "A · B · C" that wraps between items without a separator ever ending or starting a line
 * (see .sep-list in globals.css). `breakAfter` forces a line break after that many items.
 */
export function DotList({
  items,
  className = "",
  label,
  lead,
  breakAfter,
}: {
  items: string[];
  className?: string;
  label?: string;
  /** Drawn before the first item, e.g. a status dot. */
  lead?: ReactNode;
  breakAfter?: number;
}) {
  return (
    <div className={`sep-list ${className}`}>
      <ul aria-label={label}>
        {items.map((item, i) => (
          <Fragment key={item}>
            <li>
              {i === 0 && lead}
              {item}
            </li>
            {breakAfter === i + 1 && <li className="sep-break" aria-hidden="true" />}
          </Fragment>
        ))}
      </ul>
    </div>
  );
}
