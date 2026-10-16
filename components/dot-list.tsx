/**
 * Items separated by " · " that wrap cleanly: every item carries its own separator, and the
 * row is shifted left by one separator width inside a clipped box, so a separator that would
 * start a line is hidden (see .dot-list in globals.css).
 */
export function DotList({ items, className = "" }: { items: string[]; className?: string }) {
  return (
    <span className={`dot-list ${className}`}>
      <span>
        {items.map((item) => (
          <span key={item}>{item}</span>
        ))}
      </span>
    </span>
  );
}
