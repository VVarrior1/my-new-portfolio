"use client";

import { m, useMotionValue, useSpring, useTransform, useVelocity } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { SPRING } from "./springs";

export type IndexItem = { name: string; summary: string; href?: string; note?: string; stack: string };

const PREVIEW_W = 300;
const PREVIEW_H = 200;

/**
 * The other projects, as an index. Under a fine pointer a preview card follows the cursor on a
 * spring, leans into the direction it's moving, and slides to the project you're on (a filmstrip
 * of posters behind a window). The preview only illustrates; everything it shows is in the row.
 */
export function ProjectIndex({ items }: { items: IndexItem[] }) {
  const [active, setActive] = useState<number | null>(null);
  const [enabled, setEnabled] = useState(false);
  const shown = useRef(false);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const sx = useSpring(x, SPRING.follow);
  const sy = useSpring(y, SPRING.follow);
  const velocity = useVelocity(sx);
  const rotate = useTransform(velocity, [-2000, 0, 2000], [-12, 0, 12], { clamp: true });
  const strip = useSpring(0, { stiffness: 260, damping: 28 });

  useEffect(() => {
    setEnabled(window.matchMedia("(hover: hover) and (pointer: fine)").matches && !window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  }, []);

  useEffect(() => {
    if (active !== null) strip.set(-active * PREVIEW_H);
  }, [active, strip]);

  const place = (clientX: number, clientY: number) => {
    x.set(clientX);
    y.set(clientY);
    // The first time it appears it starts under the cursor instead of flying in from a corner.
    if (!shown.current) {
      sx.jump(clientX);
      sy.jump(clientY);
      shown.current = true;
    }
  };

  const enter = (index: number) => {
    if (active === null) strip.jump(-index * PREVIEW_H);
    setActive(index);
  };

  return (
    <div
      className="relative"
      onPointerMove={(event) => enabled && event.pointerType === "mouse" && place(event.clientX, event.clientY)}
      onPointerLeave={() => {
        setActive(null);
        shown.current = false;
      }}
    >
      <ol className="border-t border-rule" data-active={active !== null ? "" : undefined}>
        {items.map((item, i) => {
          const body = (
            <>
              <span className="t-mono pt-[0.55rem] text-graphite lg:col-span-1">{String(i + 1).padStart(2, "0")}</span>
              <span className="min-w-0 lg:col-span-5">
                <span className="index-name t-title block">
                  {item.name}
                  {item.href && (
                    <span className="index-arrow ml-2 inline-block text-[0.7em] text-graphite" aria-hidden="true">
                      ↗
                    </span>
                  )}
                </span>
                {item.note && <span className="t-mono mt-1 block text-graphite">{item.note}</span>}
              </span>
              <span className="min-w-0 lg:col-span-6 lg:pt-1.5">
                <span className="block text-ink-2">{item.summary}</span>
                <span className="t-mono mt-2 block text-graphite">{item.stack.split(", ").join(" · ")}</span>
              </span>
            </>
          );
          const rowClass = "index-row grid gap-x-6 gap-y-2 py-7 lg:grid-cols-12 lg:items-start";
          return (
            <li
              key={item.name}
              className="index-item border-b border-rule"
              data-on={active === i ? "" : undefined}
              onPointerEnter={(event) => enabled && event.pointerType === "mouse" && enter(i)}
            >
              {item.href ? (
                <a
                  href={item.href}
                  target="_blank"
                  rel="noreferrer"
                  className={rowClass}
                  onFocus={(event) => {
                    if (!enabled) return;
                    const rect = event.currentTarget.getBoundingClientRect();
                    place(rect.right - PREVIEW_W * 0.6, rect.top + rect.height / 2);
                    enter(i);
                  }}
                  onBlur={() => setActive(null)}
                >
                  {body}
                  <span className="sr-only"> (opens in a new tab)</span>
                </a>
              ) : (
                <div className={rowClass}>{body}</div>
              )}
            </li>
          );
        })}
      </ol>

      {enabled && (
        <m.div
          aria-hidden="true"
          className="pointer-events-none fixed left-0 top-0 z-30"
          style={{ x: sx, y: sy, rotate }}
          initial={false}
          animate={{ scale: active === null ? 0.5 : 1, opacity: active === null ? 0 : 1 }}
          transition={SPRING.bouncy}
        >
          <div
            className="overflow-hidden rounded-2xl border border-screen-line bg-screen shadow-[var(--float)]"
            style={{ width: PREVIEW_W, height: PREVIEW_H, transform: `translate(24px, -${PREVIEW_H / 2}px)` }}
          >
            <m.div style={{ y: strip }}>
              {items.map((item, i) => (
                <Poster key={item.name} item={item} index={i} />
              ))}
            </m.div>
          </div>
        </m.div>
      )}
    </div>
  );
}

/** A poster for each project: its name, its stack, and a small drawing of what it does. */
function Poster({ item, index }: { item: IndexItem; index: number }) {
  return (
    <div className="screen-dots relative flex flex-col justify-between p-4 text-screen-ink" style={{ height: PREVIEW_H }}>
      <div className="flex items-start justify-between">
        <span className="t-mono text-[0.75rem] text-screen-graphite">{String(index + 1).padStart(2, "0")}</span>
        <Motif index={index} />
      </div>
      <div>
        <p className="t-wide text-[1.625rem] font-[700] leading-[0.95] tracking-[-0.03em]">{item.name}</p>
        <p className="t-mono mt-2 text-[0.75rem] text-screen-graphite">{item.stack.split(", ").join(" · ")}</p>
      </div>
    </div>
  );
}

/** Drawings, not data: boxes for detection, a cluster for search, columns for a board, uneven bars for bias. */
function Motif({ index }: { index: number }) {
  const stroke = "var(--screen-outline)";
  const volt = "var(--signal)";
  switch (index % 4) {
    case 0:
      return (
        <svg width="120" height="84" viewBox="0 0 120 84" fill="none">
          <rect x="6" y="20" width="48" height="40" rx="4" stroke={volt} strokeWidth="1.5" />
          <rect x="6" y="12" width="34" height="9" rx="2" fill={volt} />
          <text x="9" y="19" fontSize="7" fontFamily="var(--font-mono)" fill="var(--signal-ink)">tuk-tuk</text>
          <rect x="64" y="8" width="50" height="22" rx="4" stroke={stroke} strokeWidth="1.5" strokeDasharray="3 3" />
          <text x="68" y="40" fontSize="7" fontFamily="var(--font-mono)" fill="var(--screen-graphite)">banner</text>
        </svg>
      );
    case 1:
      return (
        <svg width="120" height="84" viewBox="0 0 120 84">
          {[
            [70, 30], [78, 24], [84, 34], [74, 40], [90, 28], [66, 22], [82, 44], [94, 38],
            [24, 60], [30, 54], [18, 66], [36, 62], [104, 70], [12, 20],
          ].map(([cx, cy], i) => (
            <circle key={i} cx={cx} cy={cy} r={i < 8 ? 3 : 2.2} fill={i < 8 ? volt : "var(--screen-graphite)"} />
          ))}
          <circle cx="80" cy="33" r="20" fill="none" stroke={stroke} strokeDasharray="3 3" />
        </svg>
      );
    case 2:
      return (
        <svg width="120" height="84" viewBox="0 0 120 84" fill="none">
          {[0, 1, 2].map((col) => (
            <g key={col}>
              <rect x={6 + col * 38} y="6" width="32" height="72" rx="5" stroke={stroke} />
              {Array.from({ length: 3 - col }, (_, row) => (
                <rect key={row} x={10 + col * 38} y={12 + row * 16} width="24" height="11" rx="2.5" fill={col === 1 && row === 0 ? volt : "var(--screen-track)"} />
              ))}
            </g>
          ))}
        </svg>
      );
    default:
      return (
        <svg width="120" height="84" viewBox="0 0 120 84">
          {[66, 18, 40, 9, 28].map((h, i) => (
            <rect key={i} x={10 + i * 21} y={78 - h} width="14" height={h} rx="2" fill={i === 0 ? volt : "var(--screen-track)"} />
          ))}
          <line x1="4" x2="116" y1="78.5" y2="78.5" stroke={stroke} />
        </svg>
      );
  }
}
