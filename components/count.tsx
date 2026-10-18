/**
 * A figure that counts up when it scrolls in (components/choreo.tsx). The final value is
 * always in the markup and holds the width, so counting never moves anything; the running value is
 * drawn over it and hidden from assistive technology. Values without a number render as they are.
 */
export function Count({ value }: { value: string }) {
  const match = value.match(/^(\D*?)(\d+(?:\.\d+)?)(\D*)$/);
  if (!match) return <>{value}</>;
  const [, prefix, number, suffix] = match;
  return (
    <span className="count" data-count={number} data-prefix={prefix} data-suffix={suffix}>
      <span data-final>{value}</span>
      <span data-run aria-hidden="true">
        {value}
      </span>
    </span>
  );
}
