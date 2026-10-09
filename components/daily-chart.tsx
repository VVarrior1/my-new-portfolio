"use client";

import { useEffect, useRef, useState } from "react";

export type DayPoint = { day: string; views: number; visitors: number };

const H = 220;
const PAD = { top: 16, right: 8, bottom: 28, left: 36 };

function niceMax(value: number) {
  if (value <= 4) return 4;
  const magnitude = 10 ** Math.floor(Math.log10(value));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * magnitude).find((s) => value / s <= 4) ?? magnitude * 10;
  return Math.ceil(value / step) * step;
}

const label = (day: string) =>
  new Date(`${day}T00:00:00Z`).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });

/** Daily page views as columns, one series. Hover or focus a column for its numbers. */
export function DailyChart({ points }: { points: DayPoint[] }) {
  const [active, setActive] = useState<number | null>(null);
  const box = useRef<HTMLDivElement>(null);
  // Draw at the container's real width so text stays at its true size.
  const [W, setW] = useState(720);

  useEffect(() => {
    const element = box.current;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) => setW(Math.max(280, Math.round(entry.contentRect.width))));
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  const max = niceMax(Math.max(...points.map((p) => p.views), 0));
  const innerW = W - PAD.left - PAD.right;
  const innerH = H - PAD.top - PAD.bottom;
  const slot = innerW / points.length;
  const barW = Math.min(24, slot - 2);
  const y = (v: number) => PAD.top + innerH - (v / max) * innerH;
  const ticks = [0, max / 2, max];
  const shown = active === null ? null : points[active];

  return (
    <div className="relative" ref={box}>
      <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="group" aria-label="Page views per day for the last 30 days">
        {ticks.map((tick) => (
          <g key={tick}>
            <line x1={PAD.left} x2={W - PAD.right} y1={y(tick)} y2={y(tick)} stroke="var(--rule)" strokeWidth={1} />
            <text x={PAD.left - 8} y={y(tick)} dy="0.32em" textAnchor="end" fontSize={12} fill="var(--graphite)">
              {tick.toLocaleString("en-US")}
            </text>
          </g>
        ))}

        {points.map((point, index) => {
          const x = PAD.left + index * slot + (slot - barW) / 2;
          const h = Math.max(0, (point.views / max) * innerH);
          const r = Math.min(4, h, barW / 2);
          const top = PAD.top + innerH - h;
          const base = PAD.top + innerH;
          return (
            <g key={point.day}>
              {h > 0 && (
                <path
                  d={`M${x},${base} V${top + r} Q${x},${top} ${x + r},${top} H${x + barW - r} Q${x + barW},${top} ${x + barW},${top + r} V${base} Z`}
                  fill="var(--chart)"
                  opacity={active === null || active === index ? 1 : 0.45}
                />
              )}
              <rect
                x={PAD.left + index * slot}
                y={PAD.top}
                width={slot}
                height={innerH}
                fill="transparent"
                tabIndex={0}
                role="img"
                aria-label={`${label(point.day)}: ${point.views} views, ${point.visitors} visitors`}
                onMouseEnter={() => setActive(index)}
                onMouseLeave={() => setActive(null)}
                onFocus={() => setActive(index)}
                onBlur={() => setActive(null)}
                className="cursor-default outline-none"
              />
            </g>
          );
        })}

        {[0, Math.floor((points.length - 1) / 2), points.length - 1].map((index) => (
          <text
            key={index}
            x={PAD.left + index * slot + slot / 2}
            y={H - 8}
            textAnchor={index === 0 ? "start" : index === points.length - 1 ? "end" : "middle"}
            fontSize={12}
            fill="var(--graphite)"
          >
            {label(points[index].day)}
          </text>
        ))}
      </svg>

      <p className="mt-2 min-h-[1.5em] text-[0.95rem] tabular-nums text-graphite" aria-live="polite">
        {shown
          ? `${label(shown.day)}: ${shown.views.toLocaleString("en-US")} ${shown.views === 1 ? "view" : "views"}, ${shown.visitors.toLocaleString("en-US")} ${shown.visitors === 1 ? "visitor" : "visitors"}`
          : "Hover or tab to a day for its numbers."}
      </p>
    </div>
  );
}
