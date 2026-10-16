"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Slider as SliderPrimitive } from "radix-ui";
import { LiveSim, MAX_SERVERS, diagnose, type Finished, type Metrics, type SimConfig, type Stage } from "@/lib/live-sim";
import { trackEvent } from "./site-analytics";

// The hero simulator, built as a small piece of hardware: a raised panel, a dark screen
// that shows the system (and is the only place status colours appear), and a control deck
// of keycaps. International orange marks the things you press, the biggest of which breaks it.

const INITIAL: SimConfig = { rate: 160, servers: 2, cache: false };
const MAX_RATE = 900;
const DOTS_PER_SECOND = 36;
const SEGMENT_MS = 240;
const SLOW_MS = 150;
/** Below this screen width the diagram flows top to bottom instead of left to right. */
const VERTICAL_BELOW = 560;

type Point = { x: number; y: number };
type Size = { w: number; h: number };
type Layout = {
  width: number;
  height: number;
  vertical: boolean;
  node: Size;
  app: Size;
  entry: Point;
  lb: Point;
  apps: Point[];
  cache: Point;
  db: Point;
};

function computeLayout(width: number, servers: number): Layout {
  if (width < VERTICAL_BELOW) {
    const rows = [56, 136, 216, 296];
    const node = { w: Math.min(156, width - 48), h: 48 };
    const gap = 8;
    const appW = Math.min(132, Math.floor((width - 24 - (servers - 1) * gap) / servers));
    const first = (width - (servers * appW + (servers - 1) * gap)) / 2 + appW / 2;
    const mid = width / 2;
    return {
      width,
      height: 332,
      vertical: true,
      node,
      app: { w: appW, h: node.h },
      entry: { x: mid, y: 0 },
      lb: { x: mid, y: rows[0] },
      apps: Array.from({ length: servers }, (_, i) => ({ x: first + i * (appW + gap), y: rows[1] })),
      cache: { x: mid, y: rows[2] },
      db: { x: mid, y: rows[3] },
    };
  }

  // A fixed height, so the stepper never moves under the pointer when servers are added.
  const height = 248;
  const mid = height / 2;
  const left = 36;
  const right = 14;
  // Nodes shrink before the edges do, so requests always have a visible stretch of wire.
  const node = { w: Math.min(112, Math.floor((width - left - right - 3 * 40) / 4)), h: 48 };
  const gap = (width - left - right - 4 * node.w) / 3;
  const col = (i: number) => left + node.w / 2 + i * (node.w + gap);
  const pitch = servers > 1 ? Math.min(72, (height - 32 - node.h) / (servers - 1)) : 0;
  return {
    width,
    height,
    vertical: false,
    node,
    app: node,
    entry: { x: 0, y: mid },
    lb: { x: col(0), y: mid },
    apps: Array.from({ length: servers }, (_, i) => ({ x: col(1), y: mid + (i - (servers - 1) / 2) * pitch })),
    cache: { x: col(2), y: mid },
    db: { x: col(3), y: mid },
  };
}

/** Where an edge leaves a node, and where it enters the next one. */
const exitOf = (l: Layout, p: Point, s: Size): Point => (l.vertical ? { x: p.x, y: p.y + s.h / 2 } : { x: p.x + s.w / 2, y: p.y });
const entryOf = (l: Layout, p: Point, s: Size): Point => (l.vertical ? { x: p.x, y: p.y - s.h / 2 } : { x: p.x - s.w / 2, y: p.y });

type Dot = { points: Point[]; born: number; ok: boolean; slow: boolean };

function pathPoints(layout: Layout, f: Finished): Point[] {
  const jitter = (Math.random() - 0.5) * 30;
  const start = layout.vertical ? { x: layout.entry.x + jitter, y: 0 } : { x: 0, y: layout.entry.y + jitter };
  const points: Point[] = [start];
  const at: Record<Stage, Point | undefined> = {
    lb: layout.lb,
    app: layout.apps[f.server] ?? layout.apps[0],
    cache: layout.cache,
    db: layout.db,
  };
  for (const stage of f.path) {
    // A disabled cache is still in the path: requests pass straight through it.
    if (stage === "db" && !f.path.includes("cache")) points.push(layout.cache);
    const point = at[stage];
    if (point) points.push(point);
  }
  return points;
}

function utilColor(util: number, up = true) {
  if (!up || util > 0.9) return "var(--fail)";
  if (util > 0.7) return "var(--trace)";
  return "var(--screen-ink)";
}

function reading(ms: number): { value: string; unit: string } {
  return ms >= 1000 ? { value: (ms / 1000).toFixed(1), unit: "s" } : { value: String(Math.round(ms)), unit: "ms" };
}

export function LiveSystem() {
  const [config, setConfig] = useState<SimConfig>(INITIAL);
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [width, setWidth] = useState(600);
  const box = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const sim = useRef<LiveSim | null>(null);
  const dots = useRef<Dot[]>([]);
  const visible = useRef(true);
  const reduced = useRef(false);
  const touched = useRef(false);

  const layout = useMemo(() => computeLayout(width, config.servers), [width, config.servers]);
  const layoutRef = useRef(layout);
  layoutRef.current = layout;

  if (sim.current === null) sim.current = new LiveSim(INITIAL, 7);

  // Track the screen's width so text renders at its real size.
  useEffect(() => {
    const element = box.current;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) => setWidth(Math.max(280, Math.round(entry.contentRect.width))));
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  // Only run while on screen and the tab is visible.
  useEffect(() => {
    const element = box.current;
    if (!element) return;
    const io = new IntersectionObserver(([entry]) => (visible.current = entry.isIntersecting), { threshold: 0.05 });
    io.observe(element);
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    reduced.current = media.matches;
    const onMedia = () => (reduced.current = media.matches);
    media.addEventListener("change", onMedia);
    return () => {
      io.disconnect();
      media.removeEventListener("change", onMedia);
    };
  }, []);

  // Simulation + drawing loop. It starts once the page is idle so it never delays first paint.
  useEffect(() => {
    let frame = 0;
    let last = performance.now();
    let lastMetrics = 0;
    let dotBudget = 0;
    const colors = { ok: "#ecebe8", slow: "#ffc247", bad: "#ff5c52" };
    const readColors = () => {
      const styles = getComputedStyle(document.documentElement);
      colors.ok = styles.getPropertyValue("--screen-ink").trim() || colors.ok;
      colors.slow = styles.getPropertyValue("--trace").trim() || colors.slow;
      colors.bad = styles.getPropertyValue("--fail").trim() || colors.bad;
    };
    readColors();
    const themeObserver = new MutationObserver(readColors);
    themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });

    const loop = (now: number) => {
      frame = requestAnimationFrame(loop);
      const dt = Math.min(64, now - last);
      last = now;
      if (!visible.current || document.hidden) return;

      const s = sim.current!;
      const finished = s.step(dt);

      // Draw a steady sample of requests, so 900 req/s doesn't become noise.
      dotBudget = Math.min(dotBudget + (DOTS_PER_SECOND * dt) / 1000, 4);
      if (!reduced.current) {
        for (let i = finished.length - 1; i >= 0 && dotBudget >= 1; i--) {
          const f = finished[i];
          // Failures are always worth showing; successes are sampled.
          if (f.ok && Math.random() > 0.6) continue;
          dotBudget -= 1;
          dots.current.push({ points: pathPoints(layoutRef.current, f), born: now, ok: f.ok, slow: f.latency > SLOW_MS });
        }
      }

      if (now - lastMetrics > 200) {
        lastMetrics = now;
        setMetrics(s.metrics());
      }

      const c = canvas.current;
      const ctx = c?.getContext("2d");
      if (!c || !ctx) return;
      const { width: w, height: h } = layoutRef.current;
      const dpr = window.devicePixelRatio || 1;
      if (c.width !== Math.round(w * dpr) || c.height !== Math.round(h * dpr)) {
        c.width = Math.round(w * dpr);
        c.height = Math.round(h * dpr);
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);
      ctx.lineCap = "round";

      dots.current = dots.current.filter((dot) => {
        const segments = dot.points.length - 1;
        const travel = segments * SEGMENT_MS;
        const age = now - dot.born;
        if (age > travel + 450) return false;
        const progress = Math.min(1, age / travel) * segments;
        const i = Math.min(segments - 1, Math.floor(progress));
        const t = progress - i;
        const a = dot.points[i];
        const b = dot.points[i + 1];
        const x = a.x + (b.x - a.x) * t;
        const y = a.y + (b.y - a.y) * t;
        const fade = age > travel ? 1 - (age - travel) / 450 : 1;
        ctx.globalAlpha = Math.max(0, fade) * (dot.ok ? 0.9 : 1);
        if (dot.ok) {
          ctx.fillStyle = dot.slow ? colors.slow : colors.ok;
          ctx.beginPath();
          ctx.arc(x, y, 2.6, 0, Math.PI * 2);
          ctx.fill();
        } else {
          // A failed request is an ×, so it reads without colour too.
          ctx.strokeStyle = colors.bad;
          ctx.lineWidth = 1.75;
          ctx.beginPath();
          ctx.moveTo(x - 3.5, y - 3.5);
          ctx.lineTo(x + 3.5, y + 3.5);
          ctx.moveTo(x + 3.5, y - 3.5);
          ctx.lineTo(x - 3.5, y + 3.5);
          ctx.stroke();
        }
        return true;
      });
      ctx.globalAlpha = 1;
    };

    const start = () => {
      last = performance.now();
      frame = requestAnimationFrame(loop);
    };
    const idle = (cb: () => void) => {
      if (typeof window.requestIdleCallback === "function") window.requestIdleCallback(cb, { timeout: 1500 });
      else setTimeout(cb, 300);
    };
    const begin = () => idle(start);
    if (document.readyState === "complete") begin();
    else window.addEventListener("load", begin, { once: true });

    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("load", begin);
      themeObserver.disconnect();
    };
  }, []);

  const markTouched = () => {
    if (!touched.current) {
      touched.current = true;
      trackEvent("sim:interact");
    }
  };

  const update = useCallback((next: Partial<SimConfig>) => {
    markTouched();
    setConfig((current) => {
      const merged = { ...current, ...next };
      sim.current!.setConfig(merged);
      return merged;
    });
  }, []);

  const downIndex = metrics?.serverUp.findIndex((up) => !up) ?? -1;
  const down = downIndex >= 0;
  const toggleKill = () => {
    markTouched();
    if (down) sim.current!.restartServer(downIndex);
    else sim.current!.killServer(Math.floor(Math.random() * config.servers));
    setMetrics(sim.current!.metrics());
  };

  const reset = () => {
    sim.current = new LiveSim(INITIAL, 7);
    dots.current = [];
    setConfig(INITIAL);
    setMetrics(null);
  };

  const hint = metrics ? diagnose(metrics, config) : "Starting the simulation.";
  const status = !metrics
    ? "var(--screen-graphite)"
    : metrics.errorRate > 0.01
      ? "var(--fail)"
      : metrics.p99 > 150 || down
        ? "var(--trace)"
        : "var(--screen-go)";

  const errorPct = metrics ? (metrics.errorRate * 100).toFixed(metrics.errorRate > 0 && metrics.errorRate < 0.1 ? 1 : 0) : null;
  const readouts = [
    { label: "p50", ...(metrics ? reading(metrics.p50) : { value: "–", unit: "" }) },
    { label: "p99", ...(metrics ? reading(metrics.p99) : { value: "–", unit: "" }) },
    { label: "served", value: metrics ? String(Math.round(metrics.throughput)) : "–", unit: metrics ? "/s" : "" },
    { label: "errors", value: errorPct ?? "–", unit: metrics ? "%" : "", bad: (metrics?.errorRate ?? 0) > 0.01 },
  ];

  const { node, app } = layout;
  const narrowApps = app.w < 96;

  return (
    <div>
      <figure className="panel p-2" aria-labelledby="live-system-title">
        <figcaption className="flex items-center justify-between gap-4 pb-2 pl-2.5 pr-0.5 pt-0.5">
          <p id="live-system-title" className="t-mono text-ink-2">
            <span className="text-graphite max-sm:hidden">sys 01</span>
            <span className="px-1.5 text-graphite max-sm:hidden" aria-hidden="true">
              ·
            </span>
            a small system you can break
          </p>
          <button type="button" onClick={reset} className="key key-sm">
            reset
          </button>
        </figcaption>

        <div className="screen overflow-hidden">
          <div className="flex items-start gap-2.5 border-b border-screen-line px-3.5 py-2.5">
            <span className="mt-[0.5em] size-1.5 shrink-0 rounded-full" style={{ background: status }} aria-hidden="true" />
            <p className="t-mono min-h-[2lh] text-[0.75rem] leading-[1.45] text-screen-ink" aria-live="polite">
              {hint}
            </p>
          </div>

          <div ref={box} className="screen-dots relative" style={{ height: layout.height }}>
            <svg width={layout.width} height={layout.height} className="absolute inset-0" aria-hidden="true">
              <g stroke="var(--screen-line)" strokeWidth={1} fill="none">
                <Edge from={layout.vertical ? { x: layout.entry.x, y: 0 } : { x: 0, y: layout.entry.y }} to={entryOf(layout, layout.lb, node)} dashed />
                {layout.apps.map((point, i) => (
                  <g key={i}>
                    <Edge from={exitOf(layout, layout.lb, node)} to={entryOf(layout, point, app)} />
                    <Edge from={exitOf(layout, point, app)} to={entryOf(layout, layout.cache, node)} />
                  </g>
                ))}
                <Edge from={exitOf(layout, layout.cache, node)} to={entryOf(layout, layout.db, node)} />
              </g>
            </svg>
            {/* Requests travel on the canvas, between the edges and the nodes, so they pass under the boxes. */}
            <canvas
              ref={canvas}
              className="pointer-events-none absolute inset-0"
              style={{ width: layout.width, height: layout.height }}
              aria-hidden="true"
            />
            <svg width={layout.width} height={layout.height} className="absolute inset-0 font-mono" aria-hidden="true">
              <Node at={layout.lb} size={node} title="balancer" detail="round robin" />
              {layout.apps.map((point, i) => {
                const up = metrics?.serverUp[i] ?? true;
                const util = metrics?.appUtilization[i] ?? 0;
                const pct = `${Math.round(util * 100)}%`;
                return (
                  <Node
                    key={i}
                    at={point}
                    size={app}
                    title={`app ${i + 1}`}
                    detail={up ? (narrowApps ? pct : `${pct} busy`) : "down"}
                    util={up ? util : 1}
                    color={utilColor(util, up)}
                    state={up ? "normal" : "down"}
                  />
                );
              })}
              <Node
                at={layout.cache}
                size={node}
                title="cache"
                detail={config.cache ? `${Math.round((metrics?.cacheHitRate ?? 0) * 100)}% hits` : "off"}
                state={config.cache ? "normal" : "off"}
              />
              <Node
                at={layout.db}
                size={node}
                title="database"
                detail={`${Math.round((metrics?.dbUtilization ?? 0) * 100)}% busy`}
                util={metrics?.dbUtilization ?? 0}
                color={utilColor(metrics?.dbUtilization ?? 0)}
              />
            </svg>
          </div>

          <dl className="grid grid-cols-4 border-t border-screen-line">
            {readouts.map((item, i) => (
              <div key={item.label} className={`min-w-0 px-3 py-2.5 sm:px-3.5 ${i > 0 ? "border-l border-screen-line" : ""}`}>
                <dt className="t-mono text-[0.75rem] text-screen-graphite">{item.label}</dt>
                <dd className="mt-1 whitespace-nowrap font-mono text-[1.125rem] font-medium leading-none tabular-nums tracking-tight sm:text-[1.375rem]">
                  <span className={item.bad ? "text-fail" : undefined}>{item.value}</span>
                  {item.unit && <span className="ml-1 text-[0.75rem] font-normal tracking-normal text-screen-graphite">{item.unit}</span>}
                </dd>
              </div>
            ))}
          </dl>
        </div>

        <div className="grid gap-x-6 gap-y-5 px-2.5 pb-2 pt-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-stretch">
          <div className="min-w-0 space-y-4">
            <div>
              <div className="t-mono flex items-baseline justify-between">
                <span className="text-graphite" aria-hidden="true">
                  traffic
                </span>
                <span className="text-ink">{config.rate} requests/s</span>
              </div>
              <Fader value={config.rate} onChange={(rate) => update({ rate })} />
            </div>

            <div className="grid grid-cols-2 gap-x-6 gap-y-4 sm:flex sm:flex-wrap sm:items-end">
              <div>
                <span id="servers-label" className="t-mono mb-1.5 block text-graphite">
                  app servers
                </span>
                <div className="flex items-center gap-1.5" role="group" aria-labelledby="servers-label">
                  <button
                    type="button"
                    aria-label="Remove a server"
                    disabled={config.servers <= 1}
                    onClick={() => update({ servers: config.servers - 1 })}
                    className="key key-icon h-10 min-h-10 w-10 text-lg"
                  >
                    −
                  </button>
                  <span className="w-7 text-center font-mono text-[1.0625rem] font-medium tabular-nums" aria-live="polite">
                    {config.servers}
                  </span>
                  <button
                    type="button"
                    aria-label="Add a server"
                    disabled={config.servers >= MAX_SERVERS}
                    onClick={() => update({ servers: config.servers + 1 })}
                    className="key key-icon h-10 min-h-10 w-10 text-lg"
                  >
                    +
                  </button>
                </div>
              </div>

              <div>
                <span id="cache-label" className="t-mono mb-1.5 block text-graphite">
                  cache
                </span>
                {/* A latching rocker: pressed in while the cache is on. */}
                <button
                  type="button"
                  role="switch"
                  aria-checked={config.cache}
                  aria-labelledby="cache-label"
                  data-latched={config.cache}
                  onClick={() => update({ cache: !config.cache })}
                  className="key h-10 min-h-10 w-[5.75rem] justify-between px-3"
                >
                  <span
                    className="size-1.5 rounded-full transition-colors"
                    style={{ background: config.cache ? "var(--go)" : "var(--rule-strong)" }}
                    aria-hidden="true"
                  />
                  <span className="font-mono text-[0.8125rem] font-medium">{config.cache ? "on" : "off"}</span>
                </button>
              </div>
            </div>
          </div>

          <div className="flex flex-col items-stretch gap-2 sm:w-[9.5rem] sm:items-center sm:justify-center sm:border-l sm:border-rule sm:pl-6">
            <button
              type="button"
              onClick={toggleKill}
              aria-label={down ? "Restart the server" : "Kill a server"}
              data-latched={down}
              className="key key-signal h-14 w-full text-[0.9375rem] font-semibold sm:size-[4.25rem] sm:min-h-0 sm:rounded-full sm:px-0 sm:text-[0.75rem] sm:leading-[1.15]"
            >
              {down ? (
                <>
                  Restart <br className="max-sm:hidden" />
                  the server
                </>
              ) : (
                <>
                  Kill a <br className="max-sm:hidden" />
                  server
                </>
              )}
            </button>
            <span className="t-mono text-center text-[0.75rem] text-graphite">{down ? `app ${downIndex + 1} is down` : "random app server"}</span>
          </div>
        </div>
      </figure>
      <p className="t-mono mt-3 px-1 text-graphite">
        Every request is simulated in your browser by a seeded event engine, the idea behind Systemlab.
      </p>
    </div>
  );
}

/** A long fader: a recessed groove, an ink fill, and an orange cap. */
function Fader({ value, onChange }: { value: number; onChange: (value: number) => void }) {
  return (
    <SliderPrimitive.Root
      className="relative mt-2 flex h-7 w-full touch-none select-none items-center"
      min={0}
      max={MAX_RATE}
      step={10}
      value={[value]}
      onValueChange={([next]) => onChange(next)}
    >
      <SliderPrimitive.Track className="relative h-1 grow overflow-hidden rounded-full bg-rule-strong shadow-[inset_0_1px_1px_rgb(0_0_0/0.18)]">
        <SliderPrimitive.Range className="absolute h-full bg-ink" />
      </SliderPrimitive.Track>
      <span aria-hidden="true" className="pointer-events-none absolute inset-x-[14px] top-[calc(50%+7px)] flex justify-between">
        {Array.from({ length: 10 }, (_, i) => (
          <span key={i} className={`w-px bg-rule-strong ${i % 3 === 0 ? "h-1.5" : "h-1"}`} />
        ))}
      </span>
      <SliderPrimitive.Thumb aria-label="Traffic, in requests per second" className="fader-cap focus-visible:outline-offset-4" />
    </SliderPrimitive.Root>
  );
}

function Edge({ from, to, dashed = false }: { from: Point; to: Point; dashed?: boolean }) {
  return <line x1={from.x} y1={from.y} x2={to.x} y2={to.y} strokeDasharray={dashed ? "3 4" : undefined} />;
}

function Node({
  at,
  size,
  title,
  detail,
  util,
  color = "var(--screen-ink)",
  state = "normal",
}: {
  at: Point;
  size: Size;
  title: string;
  detail: string;
  util?: number;
  color?: string;
  state?: "normal" | "off" | "down";
}) {
  const x = at.x - size.w / 2;
  const y = at.y - size.h / 2;
  const pad = size.w < 104 ? 8 : 10;
  const muted = state === "off";
  const hasTrack = util !== undefined;
  // Without a track, the two lines sit in the middle of the box.
  const titleY = y + (hasTrack ? 18 : size.h / 2 - 3);
  return (
    <g>
      {/* Opaque, so requests pass under the box instead of over its label. */}
      <rect x={x} y={y} width={size.w} height={size.h} rx={8} fill="var(--screen)" />
      <rect
        x={x + 0.5}
        y={y + 0.5}
        width={size.w - 1}
        height={size.h - 1}
        rx={8}
        fill={muted ? "none" : "var(--screen-fill)"}
        stroke={state === "down" ? "var(--fail)" : "var(--screen-line)"}
        strokeDasharray={state === "normal" ? undefined : "4 3"}
      />
      <text x={x + pad} y={titleY} fontSize={13} fontWeight={500} fill={muted ? "var(--screen-graphite)" : "var(--screen-ink)"}>
        {title}
      </text>
      <text x={x + pad} y={titleY + 15} fontSize={12} fill={state === "down" ? "var(--fail)" : "var(--screen-graphite)"}>
        {detail}
      </text>
      {hasTrack && (
        <>
          <rect x={x + pad} y={y + size.h - 10} width={size.w - pad * 2} height={3} rx={1.5} fill="var(--screen-track)" />
          <rect x={x + pad} y={y + size.h - 10} width={Math.max(0, (size.w - pad * 2) * Math.min(1, util))} height={3} rx={1.5} fill={color} />
        </>
      )}
    </g>
  );
}
