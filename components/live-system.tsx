"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { DatabaseIcon, NetworkIcon, ServerIcon, ZapIcon, type LucideIcon } from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import {
  LiveSim,
  MAX_SERVERS,
  STRAIN_UTIL,
  assessHealth,
  diagnose,
  type Finished,
  type Health,
  type Metrics,
  type SimConfig,
  type Stage,
} from "@/lib/live-sim";
import { publishSimStatus } from "@/lib/sim-status";
import { trackEvent } from "./site-analytics";

const INITIAL: SimConfig = { rate: 160, servers: 2, cache: false };
const MAX_RATE = 900;
const DOTS_PER_SECOND = 36;
const SEGMENT_MS = 240;
const SLOW_MS = 150;
/** Below this canvas width the diagram flows top to bottom. */
const VERTICAL_BELOW = 560;
const NODE_H = 52;

type Point = { x: number; y: number };
type Size = { w: number; h: number };
type Layout = {
  width: number;
  height: number;
  vertical: boolean;
  node: Size;
  appNode: Size;
  entry: Point;
  lb: Point;
  apps: Point[];
  cache: Point;
  db: Point;
};

function computeLayout(width: number, height: number, servers: number): Layout {
  const h = NODE_H;
  if (width >= VERTICAL_BELOW) {
    // Left to right: balancer, app servers (stacked), cache, database.
    const w = Math.round(Math.min(136, Math.max(96, (width - 64) / 4 - 36)));
    const left = 24 + w / 2 + 12;
    const right = width - 16 - w / 2;
    const step = (right - left) / 3;
    const mid = height / 2;
    // Fixed spacing sized for the most servers, so adding one doesn't move the others around.
    const gap = Math.min(h + 34, (height - 40 - h) / (MAX_SERVERS - 1));
    const apps = Array.from({ length: servers }, (_, i) => ({ x: left + step, y: mid + (i - (servers - 1) / 2) * gap }));
    return {
      width,
      height,
      vertical: false,
      node: { w, h },
      appNode: { w, h },
      entry: { x: 0, y: mid },
      lb: { x: left, y: mid },
      apps,
      cache: { x: left + 2 * step, y: mid },
      db: { x: right, y: mid },
    };
  }

  // Top to bottom on narrow screens: balancer, a row of app servers, cache, database.
  const w = Math.min(152, width - 48);
  const appGap = 10;
  const appW = Math.min(136, Math.floor((width - 24 - appGap * (servers - 1)) / servers));
  const top = 24;
  const bottom = 10;
  const step = (height - top - bottom - h) / 3;
  const row = (k: number) => top + h / 2 + k * step;
  const total = servers * appW + (servers - 1) * appGap;
  const apps = Array.from({ length: servers }, (_, i) => ({ x: (width - total) / 2 + appW / 2 + i * (appW + appGap), y: row(1) }));
  return {
    width,
    height,
    vertical: true,
    node: { w, h },
    appNode: { w: appW, h },
    entry: { x: width / 2, y: 0 },
    lb: { x: width / 2, y: row(0) },
    apps,
    cache: { x: width / 2, y: row(2) },
    db: { x: width / 2, y: row(3) },
  };
}

type Dot = { points: Point[]; born: number; ok: boolean; slow: boolean };

function pathPoints(layout: Layout, f: Finished): Point[] {
  const jitter = (Math.random() - 0.5) * 30;
  const start = layout.vertical ? { x: layout.entry.x + jitter, y: layout.entry.y } : { x: layout.entry.x, y: layout.entry.y + jitter };
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

/** Utilization tracks change color by state only: ink, then amber above 70%, red above 90% or down. */
function utilColor(util: number, up = true) {
  if (!up || util > 0.9) return "var(--destructive)";
  if (util > STRAIN_UTIL) return "var(--trace)";
  return "var(--signal)";
}

/** A readout as a number plus a smaller unit ("27" + "ms"). */
const msParts = (ms: number): [string, string] => (ms >= 1000 ? [(ms / 1000).toFixed(1), "s"] : [String(Math.round(ms)), "ms"]);

const HEALTH_DOT: Record<Health, string> = { healthy: "bg-go", strained: "bg-trace", failing: "bg-destructive" };

export function LiveSystem({ className = "" }: { className?: string }) {
  const [config, setConfig] = useState<SimConfig>(INITIAL);
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [health, setHealth] = useState<Health>("healthy");
  const [box, setBox] = useState({ width: 760, height: 320 });
  const boxRef = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const sim = useRef<LiveSim | null>(null);
  const dots = useRef<Dot[]>([]);
  const visible = useRef(true);
  const reduced = useRef(false);
  const touched = useRef(false);
  const healthRef = useRef<Health>("healthy");

  const layout = useMemo(() => computeLayout(box.width, box.height, config.servers), [box, config.servers]);
  const layoutRef = useRef(layout);
  layoutRef.current = layout;

  if (sim.current === null) sim.current = new LiveSim(INITIAL, 7);

  // Track the canvas size so text renders at its real size.
  useEffect(() => {
    const element = boxRef.current;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) =>
      setBox({ width: Math.max(280, Math.round(entry.contentRect.width)), height: Math.max(240, Math.round(entry.contentRect.height)) }),
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  // Only run while on screen and the tab is visible.
  useEffect(() => {
    const element = boxRef.current;
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
    let lastPublished = 0;
    let dotBudget = 0;
    const colors = { ok: "#0c0d11", slow: "#a85500", bad: "#cf2f22" };
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
        const m = s.metrics();
        setMetrics(m);
        const next = assessHealth(m, healthRef.current);
        if (next !== healthRef.current) {
          healthRef.current = next;
          setHealth(next);
        }
        if (now - lastPublished > 1000) {
          lastPublished = now;
          publishSimStatus({ health: next, p99: m.p99 });
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
        ctx.arc(x, y, dot.ok ? 2.75 : 3.25, 0, Math.PI * 2);
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
    const m = sim.current!.metrics();
    setMetrics(m);
    const next = assessHealth(m, healthRef.current);
    healthRef.current = next;
    setHealth(next);
  };

  const reset = () => {
    sim.current = new LiveSim(INITIAL, 7);
    dots.current = [];
    healthRef.current = "healthy";
    setHealth("healthy");
    setConfig(INITIAL);
    setMetrics(null);
  };

  const hint = metrics ? diagnose(metrics, config) : "Starting the simulation.";
  const errorRate = metrics?.errorRate ?? 0;
  const readouts: Array<{ label: string; value: [string, string]; tone: string }> = [
    { label: "p50", value: metrics ? msParts(metrics.p50) : ["–", ""], tone: "" },
    { label: "p99", value: metrics ? msParts(metrics.p99) : ["–", ""], tone: (metrics?.p99 ?? 0) > SLOW_MS ? "text-trace" : "" },
    { label: "served", value: metrics ? [String(Math.round(metrics.throughput)), "/s"] : ["–", ""], tone: "" },
    {
      label: "errors",
      value: metrics ? [(errorRate * 100).toFixed(errorRate > 0 && errorRate < 0.1 ? 1 : 0), "%"] : ["–", ""],
      tone: errorRate > 0.01 ? "text-destructive" : "",
    },
  ];

  return (
    <div className={`sim-stage ${className}`} data-health={health}>
      <div aria-hidden="true" className="heat-plate">
        <span data-layer="healthy" />
        <span data-layer="strained" />
        <span data-layer="failing" />
      </div>

      <figure className="device" aria-labelledby="live-system-title">
        <figcaption className="flex h-11 items-center gap-3 border-b border-rule pl-4 pr-2 sm:pl-5">
          <span className="t-mono hidden text-graphite sm:inline">sim://live</span>
          <span id="live-system-title" className="truncate text-[0.875rem] font-medium">
            A small system you can break
          </span>
          <span className="t-mono ml-auto flex shrink-0 items-center gap-2 text-ink-2">
            <span aria-hidden="true" className={`size-1.5 rounded-full transition-colors ${HEALTH_DOT[health]}`} />
            {health}
          </span>
          <button type="button" onClick={reset} className="btn btn-ghost h-8 rounded-md px-2.5 text-[0.8125rem]">
            Reset
          </button>
        </figcaption>

        <div className="grid gap-4 p-3 sm:p-5 lg:grid-cols-[minmax(0,1fr)_21rem] lg:gap-5 xl:grid-cols-[minmax(0,1fr)_23.75rem]">
          <div className="flex min-w-0 flex-col gap-3">
            <div ref={boxRef} className="sim-canvas relative h-[312px] overflow-hidden rounded-[10px] md:h-[300px] lg:h-auto lg:min-h-[17.5rem] lg:flex-1">
              <svg width={layout.width} height={layout.height} className="absolute inset-0" aria-hidden="true">
                <Edges layout={layout} />
              </svg>
              {/* Requests travel on the canvas, between the edges and the nodes, so they pass under the boxes. */}
              <canvas ref={canvas} className="pointer-events-none absolute inset-0" style={{ width: layout.width, height: layout.height }} aria-hidden="true" />
              <svg width={layout.width} height={layout.height} className="absolute inset-0" aria-hidden="true">
                <Node at={layout.lb} size={layout.node} title="Balancer" detail="round robin" icon={NetworkIcon} />
                {layout.apps.map((app, i) => {
                  const up = metrics?.serverUp[i] ?? true;
                  const util = metrics?.appUtilization[i] ?? 0;
                  const compact = layout.appNode.w < 96;
                  return (
                    <Node
                      key={i}
                      at={app}
                      size={layout.appNode}
                      title={`App ${i + 1}`}
                      icon={ServerIcon}
                      detail={up ? (compact ? `${Math.round(util * 100)}%` : `${Math.round(util * 100)}% busy`) : "down"}
                      util={up ? util : 1}
                      color={utilColor(util, up)}
                      down={!up}
                    />
                  );
                })}
                <Node
                  at={layout.cache}
                  size={layout.node}
                  title="Cache"
                  icon={ZapIcon}
                  detail={config.cache ? `${Math.round((metrics?.cacheHitRate ?? 0) * 100)}% hits` : "off"}
                  muted={!config.cache}
                />
                <Node
                  at={layout.db}
                  size={layout.node}
                  title="Database"
                  icon={DatabaseIcon}
                  detail={`${Math.round((metrics?.dbUtilization ?? 0) * 100)}% busy`}
                  util={metrics?.dbUtilization ?? 0}
                  color={utilColor(metrics?.dbUtilization ?? 0)}
                />
              </svg>
            </div>
            <p className="text-[0.8125rem] leading-snug text-graphite">
              Every request is simulated live in your browser by a seeded event engine, the idea behind Systemlab.
            </p>
          </div>

          <div className="flex flex-col gap-5">
            <dl className="grid grid-cols-2 gap-2">
              {readouts.map((item) => (
                <div key={item.label} className="well px-3 py-2.5">
                  <dt className="t-mono text-[0.75rem] text-graphite">{item.label}</dt>
                  <dd className={`readout mt-0.5 ${item.tone}`}>
                    {item.value[0]}
                    {item.value[1] && <span className="ml-1 text-[0.8125rem] font-normal tracking-normal text-graphite">{item.value[1]}</span>}
                  </dd>
                </div>
              ))}
            </dl>

            <div>
              <div className="flex items-baseline justify-between">
                <span className="text-[0.875rem] font-medium" aria-hidden="true">
                  Traffic
                </span>
                <span className="t-mono tabular-nums text-graphite">{config.rate} requests/s</span>
              </div>
              <Slider
                className="mt-3"
                thumbLabel="Traffic, in requests per second"
                min={0}
                max={MAX_RATE}
                step={10}
                value={[config.rate]}
                onValueChange={([rate]) => update({ rate })}
              />
            </div>

            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-2.5">
                <span id="servers-label" className="text-[0.875rem] font-medium">
                  Servers
                </span>
                <div className="flex h-9 items-center rounded-lg border border-rule-strong" role="group" aria-labelledby="servers-label">
                  <button
                    type="button"
                    aria-label="Remove a server"
                    disabled={config.servers <= 1}
                    onClick={() => update({ servers: config.servers - 1 })}
                    className="h-full w-9 rounded-l-lg text-lg leading-none text-ink-2 transition-colors hover:bg-ink/5 hover:text-ink disabled:opacity-35"
                  >
                    −
                  </button>
                  <span className="t-mono w-6 text-center text-[0.875rem] tabular-nums" aria-live="polite">
                    {config.servers}
                  </span>
                  <button
                    type="button"
                    aria-label="Add a server"
                    disabled={config.servers >= MAX_SERVERS}
                    onClick={() => update({ servers: config.servers + 1 })}
                    className="h-full w-9 rounded-r-lg text-lg leading-none text-ink-2 transition-colors hover:bg-ink/5 hover:text-ink disabled:opacity-35"
                  >
                    +
                  </button>
                </div>
              </div>

              <label className="flex items-center gap-2.5 text-[0.875rem] font-medium">
                Cache
                <Switch checked={config.cache} onCheckedChange={(cache) => update({ cache })} />
              </label>
            </div>

            <button
              type="button"
              onClick={toggleKill}
              className="btn btn-ghost btn-sm w-full hover:border-destructive hover:bg-destructive/10 hover:text-destructive"
            >
              {downIndex >= 0 ? "Restart the server" : "Kill a server"}
            </button>

            <p className="min-h-[2.9em] text-[0.875rem] leading-[1.45] text-ink-2" aria-live="polite">
              {hint}
            </p>
          </div>
        </div>
      </figure>
    </div>
  );
}

function Edges({ layout }: { layout: Layout }) {
  const { node, appNode, lb, apps, cache, db, entry, vertical } = layout;
  const hw = node.w / 2;
  const hh = node.h / 2;
  const ahw = appNode.w / 2;
  return (
    <g stroke="var(--rule-strong)" strokeWidth={1} fill="none">
      {vertical ? (
        <>
          <line x1={entry.x} y1={entry.y} x2={lb.x} y2={lb.y - hh} strokeDasharray="3 4" />
          {apps.map((app, i) => (
            <g key={i}>
              <line x1={lb.x} y1={lb.y + hh} x2={app.x} y2={app.y - hh} />
              <line x1={app.x} y1={app.y + hh} x2={cache.x} y2={cache.y - hh} />
            </g>
          ))}
          <line x1={cache.x} y1={cache.y + hh} x2={db.x} y2={db.y - hh} />
        </>
      ) : (
        <>
          <line x1={entry.x} y1={entry.y} x2={lb.x - hw} y2={lb.y} strokeDasharray="3 4" />
          {apps.map((app, i) => (
            <g key={i}>
              <line x1={lb.x + hw} y1={lb.y} x2={app.x - ahw} y2={app.y} />
              <line x1={app.x + ahw} y1={app.y} x2={cache.x - hw} y2={cache.y} />
            </g>
          ))}
          <line x1={cache.x + hw} y1={cache.y} x2={db.x - hw} y2={db.y} />
        </>
      )}
    </g>
  );
}

function Node({
  at,
  size,
  title,
  detail,
  util,
  color = "var(--signal)",
  down = false,
  muted = false,
  icon: Icon,
}: {
  at: Point;
  size: Size;
  title: string;
  detail: string;
  util?: number;
  color?: string;
  down?: boolean;
  muted?: boolean;
  icon?: LucideIcon;
}) {
  const x = at.x - size.w / 2;
  const y = at.y - size.h / 2;
  // Icons only where the boxes are wide enough to hold them next to the label.
  const showIcon = !!Icon && size.w >= 120;
  const pad = size.w < 80 ? 8 : 12;
  const textX = x + (showIcon ? 34 : pad);
  const dashed = down || muted;
  return (
    <g>
      <rect
        x={x + 0.5}
        y={y + 0.5}
        width={size.w - 1}
        height={size.h - 1}
        rx={8}
        fill="var(--paper-raised)"
        stroke={down ? "var(--destructive)" : "var(--rule-strong)"}
        strokeDasharray={dashed ? "4 3" : undefined}
      />
      {showIcon && Icon && (
        <Icon x={x + 12} y={y + 11} width={14} height={14} strokeWidth={1.75} color="var(--graphite)" />
      )}
      <text
        x={textX}
        y={y + 22}
        fontSize={14}
        fontWeight={500}
        fill={muted ? "var(--graphite)" : "var(--ink)"}
        style={{ fontFamily: "var(--sans)" }}
      >
        {title}
      </text>
      <text
        x={textX}
        y={y + 37}
        fontSize={12}
        fill={down ? "var(--destructive)" : "var(--graphite)"}
        style={{ fontFamily: "var(--mono)", fontVariantNumeric: "tabular-nums" }}
      >
        {detail}
      </text>
      {util !== undefined && (
        <>
          <rect x={x + pad} y={y + size.h - 9} width={size.w - pad * 2} height={3} rx={1.5} fill="var(--rule-strong)" />
          <rect
            x={x + pad}
            y={y + size.h - 9}
            width={Math.max(0, (size.w - pad * 2) * Math.min(1, util))}
            height={3}
            rx={1.5}
            fill={color}
          />
        </>
      )}
    </g>
  );
}
