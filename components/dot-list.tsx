import { Fragment } from "react";

/** "A · B · C" that wraps between items, so a line never starts with a separator. */
export function DotList({ items, className = "" }: { items: string[]; className?: string }) {
  return (
    <p className={className}>
      {items.map((item, i) => (
        <Fragment key={item}>
          <span className="whitespace-nowrap">
            {item}
            {i < items.length - 1 && (
              <span className="pl-2" aria-hidden="true">
                ·
              </span>
            )}
          </span>
          {i < items.length - 1 && " "}
        </Fragment>
      ))}
    </p>
  );
}
