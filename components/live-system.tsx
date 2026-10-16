"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { DatabaseIcon, NetworkIcon, ServerIcon, ZapIcon, type LucideIcon } from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { LiveSim, MAX_SERVERS, diagnose, type Finished, type Metrics, type SimConfig, type Stage } from "@/lib/live-sim";
import { publishReadout, stateFrom } from "@/lib/sim-readout";
import { trackEvent } from "./site-analytics";

const INITIAL: SimConfig = { rate: 160, servers: 2, cache: false };
const MAX_RATE = 900;
const DOTS_PER_SECOND = 36;
const SEGMENT_MS = 240;
const SLOW_MS = 150;
/** Below this canvas width the diagram flows top to bottom. */
const VERTICAL_BELOW = 480;

type Point = { x: number; y: number };
type Size = { w: number; h: number };
type Layout = {
  vertical: boolean;
  width: number;
  height: number;
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
    // Top-to-bottom flow for phones: balancer, a row of app servers, cache, database.
    const height = 304;
    const mid = width / 2;
    const node = { w: Math.min(150, width - 24), h: 48 };
    const gap = 8;
    const appW = Math.min(150, Math.floor((width - 8 - gap * (servers - 1)) / servers));
    const rowW = appW * servers + gap * (servers - 1);
    const apps = Array.from({ length: servers }, (_, i) => ({ x: mid - rowW / 2 + appW / 2 + i * (appW + gap), y: 116 }));
    return {
      vertical: true,
      width,
      height,
      node,
      app: { w: appW, h: 48 },
      entry: { x: mid, y: 0 },
      lb: { x: mid, y: 40 },
      apps,
      cache: { x: mid, y: 192 },
      db: { x: mid, y: 268 },
    };
  }
  const height = 96 + servers * 44;
  const mid = height / 2;
  const node = { w: Math.round(Math.min(132, Math.max(104, width * 0.18))), h: 52 };
  const spacing = 62;
  const apps = Array.from({ length: servers }, (_, i) => ({ x: width * 0.42, y: mid + (i - (servers - 1) / 2) * spacing }));
  return {
    vertical: false,
    width,
    height,
    node,
    app: node,
    entry: { x: 0, y: mid },
    lb: { x: Math.max(node.w / 2 + 28, width * 0.155), y: mid },
    apps,
    cache: { x: width * 0.665, y: mid },
    db: { x: width - node.w / 2 - 1, y: mid },
  };
}

/** Where an edge leaves a node (toward the next stage) and where it enters one. */
const outOf = (l: Layout, p: Point, s: Size): Point => (l.vertical ? { x: p.x, y: p.y + s.h / 2 } : { x: p.x + s.w / 2, y: p.y });
const into = (l: Layout, p: Point, s: Size): Point => (l.vertical ? { x: p.x, y: p.y - s.h / 2 } : { x: p.x - s.w / 2, y: p.y });

type Dot = { points: Point[]; born: number; ok: boolean; slow: boolean };

function pathPoints(layout: Layout, f: Finished): Point[] {
  const jitter = (Math.random() - 0.5) * (layout.vertical ? 40 : 30);
  const points: Point[] = [
    layout.vertical ? { x: layout.entry.x + jitter, y: layout.entry.y } : { x: layout.entry.x, y: layout.entry.y + jitter },
  ];
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

/** Utilization is shown by state only: signal when fine, trace above 70%, destructive above 90% or down. */
function utilColor(util: number, up = true) {
  if (!up || util > 0.9) return "var(--destructive)";
  if (util > 0.7) return "var(--trace)";
  return "var(--signal)";
}

const fmtMs = (ms: number) => (ms >= 1000 ? `${(ms / 1000).toFixed(1)} s` : `${Math.round(ms)} ms`);

export function LiveSystem() {
  const [config, setConfig] = useState<SimConfig>(INITIAL);
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [width, setWidth] = useState(560);
  const box = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const sim = useRef<LiveSim | null>(null);
  const dots = useRef<Dot[]>([]);
  const totals = useRef({ requests: 0, errors: 0 });
  const visible = useRef(true);
  const reduced = useRef(false);
  const touched = useRef(false);

  const layout = useMemo(() => computeLayout(width, config.servers), [width, config.servers]);
  const layoutRef = useRef(layout);
  layoutRef.current = layout;

  if (sim.current === null) sim.current = new LiveSim(INITIAL, 7);

  // Track container width so text renders at its real size.
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
    let lastReadout = 0;
    let dotBudget = 0;
    let paused = false;
    const colors = { ok: "#2c3fd8", slow: "#a35f00", bad: "#c7341f" };
    const readColors = () => {
      const styles = getComputedStyle(document.documentElement);
      colors.ok = styles.getPropertyValue("--signal").trim() || colors.ok;
      colors.slow = styles.getPropertyValue("--trace").trim() || colors.slow;
      colors.bad = styles.getPropertyValue("--destructive").trim() || colors.bad;
    };
    readColors();
    const themeObserver = new MutationObserver(readColors);
    themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    const scheme = window.matchMedia("(prefers-color-scheme: dark)");
    scheme.addEventListener("change", readColors);

    const loop = (now: number) => {
      frame = requestAnimationFrame(loop);
      const dt = Math.min(64, now - last);
      last = now;
      const s = sim.current!;
      if (!visible.current || document.hidden) {
        if (!paused) {
          paused = true;
          publishReadout({ state: "paused", ...totals.current, p99: s.metrics().p99 || null });
        }
        return;
      }
      paused = false;

      const finished = s.step(dt);
      for (const f of finished) {
        totals.current.requests++;
        if (!f.ok) totals.current.errors++;
      }

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

      const metricsDue = now - lastMetrics > 200;
      // The readout ticks at 4 Hz (1 Hz under reduced motion).
      const readoutDue = now - lastReadout > (reduced.current ? 1000 : 250);
      if (metricsDue || readoutDue) {
        const m = s.metrics();
        if (metricsDue) {
          lastMetrics = now;
          setMetrics(m);
        }
        if (readoutDue) {
          lastReadout = now;
          publishReadout({ state: stateFrom(m.errorRate, m.p99), ...totals.current, p99: m.p99 || null });
        }
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
        ctx.fillStyle = dot.ok ? (dot.slow ? colors.slow : colors.ok) : colors.bad;
        ctx.beginPath();
        ctx.arc(x, y, dot.ok ? 3 : 3.6, 0, Math.PI * 2);
        ctx.fill();
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
      scheme.removeEventListener("change", readColors);
    };
  }, []);

  const markTouched = () => {
    if (!touched.current) {
      touched.current = true;
      trackEvent("sim:interact");
    }
  };

  const update = useCallback((next: Partial<SimConfig>) => {
    if (!touched.current) {
      touched.current = true;
      trackEvent("sim:interact");
    }
    setConfig((current) => {
      const merged = { ...current, ...next };
      sim.current!.setConfig(merged);
      return merged;
    });
  }, []);

  const downIndex = metrics?.serverUp.findIndex((up) => !up) ?? -1;
  const toggleKill = () => {
    markTouched();
    if (downIndex >= 0) sim.current!.restartServer(downIndex);
    else sim.current!.killServer(0);
    setMetrics(sim.current!.metrics());
  };

  const reset = () => {
    sim.current = new LiveSim(INITIAL, 7);
    dots.current = [];
    totals.current = { requests: 0, errors: 0 };
    publishReadout({ state: "healthy", requests: 0, errors: 0, p99: null });
    setConfig(INITIAL);
    setMetrics(null);
  };

  const hint = metrics ? diagnose(metrics, config) : "Starting the simulation.";
  const { node, app } = layout;
  const errorRate = metrics?.errorRate ?? 0;

  const readings = [
    { label: "p50", value: metrics ? fmtMs(metrics.p50) : "–" },
    { label: "p99", value: metrics ? fmtMs(metrics.p99) : "–", warn: (metrics?.p99 ?? 0) > SLOW_MS },
    { label: "served", value: metrics ? `${Math.round(metrics.throughput)}/s` : "–" },
    {
      label: "errors",
      value: metrics ? `${(errorRate * 100).toFixed(errorRate > 0 && errorRate < 0.1 ? 1 : 0)}%` : "–",
      bad: errorRate > 0.01,
    },
  ];

  return (
    <figure aria-labelledby="live-system-title" className="min-w-0">
      <figcaption className="mb-3 flex items-center justify-between gap-4">
        <span className="t-meta text-graphite">
          <span className="mr-3 text-ink">Fig. 1</span>
          <span id="live-system-title">A small system you can break</span>
          <span className="hidden xl:inline"> · a seeded event engine, the idea behind Systemlab</span>
        </span>
        <button
          type="button"
          onClick={reset}
          className="t-meta -my-1 inline-flex h-7 shrink-0 items-center rounded-lg border border-rule px-2.5 text-ink transition-colors hover:border-ink"
        >
          Reset
        </button>
      </figcaption>

      <div className="rounded-[1rem] border border-rule bg-paper p-4 sm:p-5">
        <div ref={box} className="sim-canvas relative" style={{ height: layout.height }}>
          <svg width={layout.width} height={layout.height} className="absolute inset-0" aria-hidden="true">
            <g stroke="var(--edge)" strokeWidth={1} fill="none">
              <Edge from={layout.entry} to={into(layout, layout.lb, node)} vertical={layout.vertical} dashed />
              {layout.apps.map((point, i) => (
                <g key={i}>
                  <Edge from={outOf(layout, layout.lb, node)} to={into(layout, point, app)} vertical={layout.vertical} />
                  <Edge from={outOf(layout, point, app)} to={into(layout, layout.cache, node)} vertical={layout.vertical} />
                </g>
              ))}
              <Edge from={outOf(layout, layout.cache, node)} to={into(layout, layout.db, node)} vertical={layout.vertical} />
            </g>
          </svg>
          {/* Requests travel on the canvas, between the edges and the nodes, so they pass under the boxes. */}
          <canvas
            ref={canvas}
            className="pointer-events-none absolute inset-0"
            style={{ width: layout.width, height: layout.height }}
            aria-hidden="true"
          />
          <svg width={layout.width} height={layout.height} className="absolute inset-0" aria-hidden="true">
            <Node at={layout.lb} size={node} title="Balancer" detail="round robin" icon={NetworkIcon} />
            {layout.apps.map((point, i) => {
              const up = metrics?.serverUp[i] ?? true;
              const util = metrics?.appUtilization[i] ?? 0;
              return (
                <Node
                  key={i}
                  at={point}
                  size={app}
                  title={`App ${i + 1}`}
                  icon={ServerIcon}
                  detail={up ? `${Math.round(util * 100)}%${app.w < 96 ? "" : " busy"}` : "down"}
                  util={up ? util : 1}
                  color={utilColor(util, up)}
                  dashed={!up}
                  failed={!up}
                />
              );
            })}
            <Node
              at={layout.cache}
              size={node}
              title="Cache"
              icon={ZapIcon}
              detail={config.cache ? `${Math.round((metrics?.cacheHitRate ?? 0) * 100)}% hits` : "off"}
              dashed={!config.cache}
              muted={!config.cache}
            />
            <Node
              at={layout.db}
              size={node}
              title="Database"
              icon={DatabaseIcon}
              detail={`${Math.round((metrics?.dbUtilization ?? 0) * 100)}% busy`}
              util={metrics?.dbUtilization ?? 0}
              color={utilColor(metrics?.dbUtilization ?? 0)}
            />
          </svg>
        </div>

        <dl className="mt-3 grid grid-cols-4 border-y border-rule sm:mt-4">
          {readings.map((item, i) => (
            <div key={item.label} className={`px-2 py-2.5 sm:px-3 ${i > 0 ? "border-l border-rule" : ""}`}>
              <dt className="font-mono text-[0.75rem] leading-tight text-graphite">{item.label}</dt>
              <dd
                className={`mt-1 font-mono text-[1.0625rem] font-medium leading-tight tabular-nums tracking-[-0.01em] sm:text-[1.25rem] ${
                  item.bad ? "text-destructive" : ""
                }`}
              >
                {item.value}
              </dd>
            </div>
          ))}
        </dl>

        <div className="mt-4 space-y-3.5">
          <div>
            <div className="flex items-baseline justify-between">
              <span className="t-small font-medium" aria-hidden="true">
                Traffic
              </span>
              <span className="t-meta text-graphite">{config.rate} requests/s</span>
            </div>
            <Slider
              className="mt-2.5"
              thumbLabel="Traffic, in requests per second"
              min={0}
              max={MAX_RATE}
              step={10}
              value={[config.rate]}
              onValueChange={([rate]) => update({ rate })}
            />
          </div>

          <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
            <div className="flex items-center gap-2.5">
              <span id="servers-label" className="t-small font-medium">
                App servers
              </span>
              <div className="flex h-8 items-center rounded-lg border border-rule" role="group" aria-labelledby="servers-label">
                <button
                  type="button"
                  aria-label="Remove a server"
                  disabled={config.servers <= 1}
                  onClick={() => update({ servers: config.servers - 1 })}
                  className="h-full w-8 rounded-l-lg text-lg leading-none transition-colors hover:bg-paper-raised disabled:opacity-35"
                >
                  −
                </button>
                <span className="w-6 text-center font-mono text-[0.875rem] tabular-nums" aria-live="polite">
                  {config.servers}
                </span>
                <button
                  type="button"
                  aria-label="Add a server"
                  disabled={config.servers >= MAX_SERVERS}
                  onClick={() => update({ servers: config.servers + 1 })}
                  className="h-full w-8 rounded-r-lg text-lg leading-none transition-colors hover:bg-paper-raised disabled:opacity-35"
                >
                  +
                </button>
              </div>
            </div>

            <button
              type="button"
              onClick={toggleKill}
              className="t-small ml-auto inline-flex h-8 items-center rounded-lg border border-rule px-3 font-medium transition-colors hover:border-ink sm:order-last"
            >
              {downIndex >= 0 ? "Restart the server" : "Kill a server"}
            </button>

            <label className="t-small flex items-center gap-2.5 font-medium">
              <Switch checked={config.cache} onCheckedChange={(cache) => update({ cache })} />
              Cache
            </label>
          </div>

          <p className="t-small min-h-[3em] text-ink-2 sm:min-h-[1.5em]" aria-live="polite">
            {hint}
          </p>
        </div>
      </div>
    </figure>
  );
}

function Edge({ from, to, vertical, dashed = false }: { from: Point; to: Point; vertical: boolean; dashed?: boolean }) {
  // Orthogonal-ish curves read as a drawn diagram; straight lines when the points line up.
  const d = vertical
    ? `M${from.x},${from.y} C${from.x},${(from.y + to.y) / 2} ${to.x},${(from.y + to.y) / 2} ${to.x},${to.y}`
    : `M${from.x},${from.y} C${(from.x + to.x) / 2},${from.y} ${(from.x + to.x) / 2},${to.y} ${to.x},${to.y}`;
  return <path d={d} strokeDasharray={dashed ? "3 4" : undefined} />;
}

function Node({
  at,
  size,
  title,
  detail,
  util,
  color = "var(--signal)",
  dashed = false,
  muted = false,
  failed = false,
  icon: Icon,
}: {
  at: Point;
  size: Size;
  title: string;
  detail: string;
  util?: number;
  color?: string;
  dashed?: boolean;
  muted?: boolean;
  failed?: boolean;
  icon?: LucideIcon;
}) {
  const x = at.x - size.w / 2;
  const y = at.y - size.h / 2;
  // Icons only where the boxes are wide enough to hold them next to the label.
  const showIcon = !!Icon && size.w >= 124;
  const pad = size.w < 90 ? 8 : 11;
  const textX = x + (showIcon ? pad + 22 : pad);
  const compact = size.h < 50;
  const titleY = y + (compact ? 19 : 20);
  const detailY = y + (compact ? 33 : 35);
  return (
    <g>
      <rect
        x={x + 0.5}
        y={y + 0.5}
        width={size.w - 1}
        height={size.h - 1}
        rx={8}
        fill="var(--paper-raised)"
        stroke={failed ? "var(--destructive)" : dashed ? "var(--graphite)" : "var(--rule)"}
        strokeDasharray={dashed ? "4 3" : undefined}
      />
      {showIcon && Icon && (
        <Icon
          x={x + pad}
          y={titleY - 12}
          width={15}
          height={15}
          strokeWidth={1.75}
          color={failed ? "var(--destructive)" : "var(--graphite)"}
        />
      )}
      <text
        x={textX}
        y={titleY}
        fontSize={size.w < 90 ? 13 : 14}
        fontWeight={600}
        fill={muted ? "var(--graphite)" : "var(--ink)"}
      >
        {title}
      </text>
      <text x={textX} y={detailY} fontSize={12} fontFamily="var(--font-mono)" fill="var(--graphite)">
        {detail}
      </text>
      {util !== undefined && (
        <g>
          <rect x={x + pad} y={y + size.h - 8} width={size.w - pad * 2} height={3} rx={1.5} fill="var(--rule)" />
          <rect
            x={x + pad}
            y={y + size.h - 8}
            width={Math.max(0, (size.w - pad * 2) * Math.min(1, util))}
            height={3}
            rx={1.5}
            fill={color}
          />
        </g>
      )}
    </g>
  );
}
