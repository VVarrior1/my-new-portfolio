"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { DatabaseIcon, NetworkIcon, ServerIcon, ZapIcon, type LucideIcon } from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import {
  HealthMonitor,
  LiveSim,
  MAX_SERVERS,
  STRAIN_UTIL,
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
const SEED = 7;
const MAX_RATE = 900;
const DOTS_PER_SECOND = 32;
/** Never start two requests closer than this, so packets on an edge stay at least ~10px apart. */
const MIN_DOT_GAP_MS = 32;
const SEGMENT_MS = 240;
const SLOW_MS = 150;
/** Below this canvas width the diagram flows top to bottom. */
const VERTICAL_BELOW = 560;
/** Below this canvas width (left to right) there's no room for the clients box, so traffic enters from the edge. */
const CLIENTS_FROM = 640;
/** Nothing is drawn closer than this to the well's edge. */
const INSET = 12;
const CLIENTS = { w: 76, h: 48 };
const CLIENTS_PILL_H = 26;

type Point = { x: number; y: number };
type Size = { w: number; h: number };
type Layout = {
  width: number;
  height: number;
  vertical: boolean;
  node: Size;
  appNode: Size;
  /** The clients box traffic comes from, if there is room for it. */
  clients: (Point & Size) | null;
  entry: Point;
  lb: Point;
  apps: Point[];
  cache: Point;
  db: Point;
};

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

function computeLayout(width: number, height: number, servers: number): Layout {
  if (width >= VERTICAL_BELOW) {
    // Left to right: clients, balancer, app servers (stacked), cache, database.
    const h = 60;
    const showClients = width >= CLIENTS_FROM;
    const start = INSET + (showClients ? CLIENTS.w : 20);
    // Four columns, each a node plus the gap before it.
    const column = (width - INSET - start) / 4;
    const w = Math.round(clamp(column - 48, 108, 148));
    const gap = column - w;
    const x = (k: number) => start + gap + w / 2 + k * column;
    const mid = height / 2;
    // App servers spread over the well: the row pitch grows with the room, within 72-112px.
    const pitch = clamp((height - 96) / servers, 72, 120);
    const apps = Array.from({ length: servers }, (_, i) => ({ x: x(1), y: mid + (i - (servers - 1) / 2) * pitch }));
    return {
      width,
      height,
      vertical: false,
      node: { w, h },
      appNode: { w, h },
      clients: showClients ? { x: INSET, y: mid - CLIENTS.h / 2, ...CLIENTS } : null,
      entry: { x: showClients ? INSET + CLIENTS.w : INSET, y: mid },
      lb: { x: x(0), y: mid },
      apps,
      cache: { x: x(2), y: mid },
      db: { x: x(3), y: mid },
    };
  }

  // Top to bottom on narrow screens: clients, balancer, a row of app servers, cache, database.
  const h = 52;
  const w = Math.min(152, width - 48);
  const appGap = 10;
  const appW = Math.min(136, Math.floor((width - 2 * INSET - appGap * (servers - 1)) / servers));
  const pillW = 128;
  const pillBottom = INSET + CLIENTS_PILL_H;
  const gap = (height - INSET - pillBottom - 4 * h) / 4;
  const row = (k: number) => pillBottom + gap + h / 2 + k * (h + gap);
  const total = servers * appW + (servers - 1) * appGap;
  const apps = Array.from({ length: servers }, (_, i) => ({ x: (width - total) / 2 + appW / 2 + i * (appW + appGap), y: row(1) }));
  return {
    width,
    height,
    vertical: true,
    node: { w, h },
    appNode: { w: appW, h },
    clients: { x: width / 2 - pillW / 2, y: INSET, w: pillW, h: CLIENTS_PILL_H },
    entry: { x: width / 2, y: pillBottom },
    lb: { x: width / 2, y: row(0) },
    apps,
    cache: { x: width / 2, y: row(2) },
    db: { x: width / 2, y: row(3) },
  };
}

type Dot = { points: Point[]; born: number; ok: boolean; slow: boolean };

function pathPoints(layout: Layout, f: Finished): Point[] {
  // Requests leave the clients box from one port; only the bare edge entry spreads them a little.
  const jitter = layout.clients ? 0 : (Math.random() - 0.5) * 12;
  const start = { x: layout.entry.x, y: layout.entry.y + jitter };
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

/** 75 -> "01:15". */
const clock = (s: number) => `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

const HEALTH_DOT: Record<Health, string> = { healthy: "bg-go", strained: "bg-trace", failing: "bg-destructive" };

export function LiveSystem({ className = "" }: { className?: string }) {
  const [config, setConfig] = useState<SimConfig>(INITIAL);
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [health, setHealth] = useState<Health>("healthy");
  /** Simulated time, in whole seconds, for the clock in the well's corner. */
  const [seconds, setSeconds] = useState(0);
  const [box, setBox] = useState({ width: 760, height: 320 });
  const boxRef = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const sim = useRef<LiveSim | null>(null);
  const dots = useRef<Dot[]>([]);
  const visible = useRef(true);
  const reduced = useRef(false);
  const touched = useRef(false);
  const monitor = useRef(new HealthMonitor());

  const layout = useMemo(() => computeLayout(box.width, box.height, config.servers), [box, config.servers]);
  const layoutRef = useRef(layout);
  layoutRef.current = layout;

  if (sim.current === null) sim.current = new LiveSim(INITIAL, SEED);

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
    let lastDot = 0;
    const colors = { ok: "#5a5f69", slow: "#a85500", bad: "#cf2f22" };
    const readColors = () => {
      const styles = getComputedStyle(document.documentElement);
      colors.ok = styles.getPropertyValue("--packet").trim() || colors.ok;
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

      // Draw a steady, evenly spaced sample of requests, so 900 req/s doesn't become noise and
      // packets never bunch up on an edge. A random pick keeps the share of failures honest.
      dotBudget = Math.min(dotBudget + (DOTS_PER_SECOND * dt) / 1000, 1.5);
      if (!reduced.current && finished.length > 0 && dotBudget >= 1 && now - lastDot >= MIN_DOT_GAP_MS) {
        const f = finished[Math.floor(Math.random() * finished.length)];
        dotBudget -= 1;
        lastDot = now;
        dots.current.push({ points: pathPoints(layoutRef.current, f), born: now, ok: f.ok, slow: f.latency > SLOW_MS });
      }

      if (now - lastMetrics > 200) {
        lastMetrics = now;
        const m = s.metrics();
        setMetrics(m);
        setSeconds(Math.floor(s.now / 1000));
        const next = monitor.current.update(m, now);
        setHealth(next);
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
      // Packets stay inside the well's inset, so none is ever cut in half by its edge.
      ctx.save();
      ctx.beginPath();
      ctx.rect(INSET, INSET, w - 2 * INSET, h - 2 * INSET);
      ctx.clip();

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
        ctx.arc(x, y, dot.ok ? 2.5 : 3, 0, Math.PI * 2);
        ctx.fill();
        return true;
      });
      ctx.globalAlpha = 1;
      ctx.restore();
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
    setHealth(monitor.current.update(m, performance.now()));
  };

  const reset = () => {
    sim.current = new LiveSim(INITIAL, SEED);
    setSeconds(0);
    dots.current = [];
    monitor.current.reset();
    setHealth("healthy");
    setConfig(INITIAL);
    setMetrics(null);
  };

  const hint = metrics ? diagnose(metrics, config, health) : "Starting the simulation.";
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
        <span data-layer="healthy" className="beams" />
        <span data-layer="strained" className="beams" />
        <span data-layer="failing" className="beams" />
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

        <div className="grid gap-4 p-3 sm:p-5 lg:grid-cols-[minmax(0,1fr)_19rem] lg:gap-5 xl:grid-cols-[minmax(0,1fr)_20.5rem]">
          <div className="flex min-w-0 flex-col gap-3">
            <div ref={boxRef} className="sim-canvas relative h-[380px] overflow-hidden rounded-[10px] md:h-[320px] lg:h-auto lg:min-h-[19rem] lg:flex-1">
              <svg width={layout.width} height={layout.height} className="absolute inset-0" aria-hidden="true">
                <Edges layout={layout} />
              </svg>
              {/* Requests travel on the canvas, between the edges and the nodes, so they pass under the boxes. */}
              <canvas ref={canvas} className="pointer-events-none absolute inset-0" style={{ width: layout.width, height: layout.height }} aria-hidden="true" />
              <svg width={layout.width} height={layout.height} className="absolute inset-0" aria-hidden="true">
                {layout.clients && <Clients box={layout.clients} rate={config.rate} pill={layout.vertical} />}
                <Node at={layout.lb} size={layout.node} title="Balancer" detail="round robin" icon={NetworkIcon} />
                {layout.apps.map((app, i) => {
                  const up = metrics?.serverUp[i] ?? true;
                  const util = metrics?.appUtilization[i] ?? 0;
                  const compact = layout.appNode.w < 100;
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
              <p aria-hidden="true" className="t-mono pointer-events-none absolute left-3 top-2.5 text-[0.75rem] tabular-nums text-graphite max-sm:hidden">
                seed {SEED} · {clock(seconds)}
              </p>
              {!layout.vertical && (
                <ul aria-hidden="true" className="t-mono pointer-events-none absolute bottom-3 left-3 flex gap-4 text-[0.75rem] text-graphite">
                  <li className="flex items-center gap-1.5">
                    <span className="size-[5px] rounded-full bg-[var(--packet)]" />
                    request
                  </li>
                  <li className="flex items-center gap-1.5">
                    <span className="size-[5px] rounded-full bg-trace" />
                    slow, over {SLOW_MS} ms
                  </li>
                  <li className="flex items-center gap-1.5">
                    <span className="size-1.5 rounded-full bg-destructive" />
                    failed
                  </li>
                </ul>
              )}
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
  const { node, appNode, lb, apps, cache, db, entry, vertical, clients } = layout;
  const hw = node.w / 2;
  const hh = node.h / 2;
  const ahw = appNode.w / 2;
  // A bare entry from the well's edge is dashed; from the clients box it's a real edge.
  const entryDash = clients ? undefined : "3 4";
  return (
    <g stroke="var(--rule-strong)" strokeWidth={1} fill="none">
      {vertical ? (
        <>
          <line x1={entry.x} y1={entry.y} x2={lb.x} y2={lb.y - hh} strokeDasharray={entryDash} />
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
          <line x1={entry.x} y1={entry.y} x2={lb.x - hw} y2={lb.y} strokeDasharray={entryDash} />
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

/** Where the traffic comes from: a small box (or, top to bottom, a pill) with the current rate. */
function Clients({ box, rate, pill }: { box: Point & Size; rate: number; pill: boolean }) {
  return (
    <g>
      <rect
        x={box.x + 0.5}
        y={box.y + 0.5}
        width={box.w - 1}
        height={box.h - 1}
        rx={pill ? box.h / 2 : 8}
        fill="var(--surface-2)"
        stroke="var(--rule-strong)"
      />
      {pill ? (
        <text
          x={box.x + box.w / 2}
          y={box.y + box.h / 2 + 4}
          textAnchor="middle"
          fontSize={12}
          fill="var(--graphite)"
          style={{ fontFamily: "var(--mono)", fontVariantNumeric: "tabular-nums" }}
        >
          <tspan fill="var(--ink)">Clients</tspan> · {rate}/s
        </text>
      ) : (
        <>
          <text x={box.x + 12} y={box.y + 20} fontSize={13} fontWeight={500} fill="var(--ink)" style={{ fontFamily: "var(--sans)" }}>
            Clients
          </text>
          <text
            x={box.x + 12}
            y={box.y + 36}
            fontSize={12}
            fill="var(--graphite)"
            style={{ fontFamily: "var(--mono)", fontVariantNumeric: "tabular-nums" }}
          >
            {rate}/s
          </text>
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
  const large = size.h >= 60;
  // Icons only where the boxes are wide enough to hold them next to the label.
  const showIcon = !!Icon && size.w >= 124;
  const pad = size.w < 80 ? 8 : 12;
  const textX = x + (showIcon ? 34 : pad);
  const titleY = y + (large ? 25 : 22);
  const detailY = titleY + (large ? 17 : 15);
  const dashed = down || muted;
  return (
    <g>
      <rect
        x={x + 0.5}
        y={y + 0.5}
        width={size.w - 1}
        height={size.h - 1}
        rx={8}
        fill="var(--node-bg)"
        stroke={down ? "var(--destructive)" : "var(--rule-strong)"}
        strokeDasharray={dashed ? "4 3" : undefined}
      />
      {showIcon && Icon && (
        <Icon x={x + 12} y={titleY - 12} width={14} height={14} strokeWidth={1.75} color="var(--graphite)" />
      )}
      <text
        x={textX}
        y={titleY}
        fontSize={large ? 15 : 14}
        fontWeight={500}
        fill={muted ? "var(--graphite)" : "var(--ink)"}
        style={{ fontFamily: "var(--sans)" }}
      >
        {title}
      </text>
      <text
        x={textX}
        y={detailY}
        fontSize={12}
        fill={down ? "var(--destructive)" : "var(--graphite)"}
        style={{ fontFamily: "var(--mono)", fontVariantNumeric: "tabular-nums" }}
      >
        {detail}
      </text>
      {util !== undefined && (
        <>
          <rect x={x + pad} y={y + size.h - (large ? 11 : 9)} width={size.w - pad * 2} height={3} rx={1.5} fill="var(--rule-strong)" />
          <rect
            x={x + pad}
            y={y + size.h - (large ? 11 : 9)}
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
