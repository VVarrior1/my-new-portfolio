"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Slider as SliderPrimitive } from "radix-ui";
import { LiveSim, MAX_SERVERS, diagnose, type Finished, type Metrics, type SimConfig, type Stage } from "@/lib/live-sim";
import { emitFlow, setFlowState, strainFrom } from "@/lib/flow-bus";
import { publishReadout, stateFrom } from "@/lib/sim-readout";
import { trackEvent } from "./site-analytics";

// The hero simulator: a dark instrument floating on the liquid field. Its screen shows the system
// (and is the only place status colours appear); the control deck under it holds the things you
// press, in cobalt, the biggest of which breaks it. It also drives the field behind the page
// (lib/flow-bus.ts): traffic sets the current, strain makes it turbulent, and a killed server
// blooms the accent at the node, at the node's real position on screen.

const INITIAL: SimConfig = { rate: 160, servers: 2, cache: false };
const MAX_RATE = 900;
const DOTS_PER_SECOND = 36;
const SEGMENT_MS = 240;
const SLOW_MS = 150;
/** Below this screen width the diagram flows top to bottom instead of left to right. */
const VERTICAL_BELOW = 500;
/** The status line and the diagram share a fixed height, so a two-line status shrinks the diagram
 * a little instead of pushing the controls down under the pointer. Narrow screens stack the
 * diagram top to bottom, so they get a taller display. */
const DISPLAY_HEIGHT = 300;
const DISPLAY_HEIGHT_VERTICAL = 400;
/** Where requests enter the diagram, clear of the screen's rounded edge. */
const ENTRY_X = 14;

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

function computeLayout(width: number, measuredHeight: number, servers: number): Layout {
  if (width < VERTICAL_BELOW) {
    const height = Math.max(300, measuredHeight);
    // The first row leaves room for the incoming wire and its label; the rest share the height.
    const top = 64;
    const step = (height - 36 - top) / 3;
    const rows = [top, top + step, top + 2 * step, top + 3 * step];
    const node = { w: Math.min(156, width - 48), h: 48 };
    const gap = 8;
    const appW = Math.min(132, Math.floor((width - 24 - (servers - 1) * gap) / servers));
    const first = (width - (servers * appW + (servers - 1) * gap)) / 2 + appW / 2;
    const mid = width / 2;
    return {
      width,
      height,
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

  const height = Math.max(220, measuredHeight);
  const mid = height / 2;
  const left = 52;
  const right = 14;
  // Nodes shrink before the edges do, so requests always have a visible stretch of wire.
  const node = { w: Math.min(120, Math.floor((width - left - right - 3 * 36) / 4)), h: 52 };
  const app = { w: node.w, h: servers >= 4 ? 46 : 52 };
  const gap = (width - left - right - 4 * node.w) / 3;
  const col = (i: number) => left + node.w / 2 + i * (node.w + gap);
  // Spread the app servers over the screen: 2 sit well apart, 4 still leave a gap between boxes.
  const pitch = servers > 1 ? Math.min(112, (height - 24 - app.h) / (servers - 1)) : 0;
  return {
    width,
    height,
    vertical: false,
    node,
    app,
    entry: { x: ENTRY_X, y: mid },
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
  const jitter = (Math.random() - 0.5) * 16;
  const start = layout.vertical ? { x: layout.entry.x + jitter, y: 0 } : { x: layout.entry.x, y: layout.entry.y + jitter };
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
  if (!up || util > 0.95) return "var(--fail)";
  if (util > 0.85) return "var(--trace)";
  return "var(--screen-ink)";
}

function reading(ms: number): { value: string; unit: string } {
  return ms >= 1000 ? { value: (ms / 1000).toFixed(1), unit: "s" } : { value: String(Math.round(ms)), unit: "ms" };
}

export function LiveSystem() {
  const [config, setConfig] = useState<SimConfig>(INITIAL);
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [size, setSize] = useState({ w: 600, h: DISPLAY_HEIGHT - 40 });
  const box = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const sim = useRef<LiveSim | null>(null);
  const dots = useRef<Dot[]>([]);
  const visible = useRef(true);
  const reduced = useRef(false);
  const touched = useRef(false);
  /** Requests finished (and failed) since load or reset, for the status strip above the name. */
  const totals = useRef({ requests: 0, errors: 0 });

  const layout = useMemo(() => computeLayout(size.w, size.h, config.servers), [size, config.servers]);
  const layoutRef = useRef(layout);
  layoutRef.current = layout;
  const rateRef = useRef(config.rate);
  rateRef.current = config.rate;

  /** A point in the diagram, in viewport pixels. */
  const toViewport = (p: Point) => {
    const r = box.current?.getBoundingClientRect();
    return r ? { x: r.left + p.x, y: r.top + p.y } : null;
  };
  const toViewportRef = useRef(toViewport);
  toViewportRef.current = toViewport;

  if (sim.current === null) sim.current = new LiveSim(INITIAL, 7);

  // Track the diagram's size so text renders at its real size.
  useEffect(() => {
    const element = box.current;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) => {
      const w = Math.max(280, Math.round(entry.contentRect.width));
      const h = Math.round(entry.contentRect.height);
      setSize((current) => (current.w === w && current.h === h ? current : { w, h }));
    });
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
      let failedAt = -1;
      for (const f of finished) {
        totals.current.requests++;
        if (!f.ok) {
          totals.current.errors++;
          failedAt = f.server;
        }
      }
      // One failure per frame is plenty for the field; it rate-limits further on its side.
      if (failedAt >= 0 && !reduced.current) {
        const at = toViewportRef.current(layoutRef.current.apps[failedAt] ?? layoutRef.current.apps[0]);
        if (at) emitFlow({ kind: "fail", ...at });
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

      if (now - lastMetrics > 200) {
        lastMetrics = now;
        const m = s.metrics();
        setMetrics(m);
        const anyDown = m.serverUp.some((up) => !up);
        setFlowState({
          rate: rateRef.current,
          strain: strainFrom(m.p99, m.errorRate, anyDown),
          inlet: toViewportRef.current(layoutRef.current.entry),
        });
        // The status strip ticks with the readouts, from the same metrics (once a second under reduced motion).
        if (!reduced.current || now - lastReadout > 1000) {
          lastReadout = now;
          const state = stateFrom(m.errorRate, m.p99, m.serverUp.some((up) => !up));
          publishReadout({ state, ...totals.current, p99: m.p99 || null });
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
    if (down) {
      sim.current!.restartServer(downIndex);
      const at = toViewport(layout.apps[downIndex]);
      if (at) emitFlow({ kind: "restart", ...at });
    } else {
      const victim = Math.floor(Math.random() * config.servers);
      sim.current!.killServer(victim);
      const at = toViewport(layout.apps[victim]);
      const device = box.current?.closest("figure")?.getBoundingClientRect();
      if (at) emitFlow({ kind: "kill", ...at, device: device ? { top: device.top, bottom: device.bottom, left: device.left, right: device.right } : undefined });
    }
    setMetrics(sim.current!.metrics());
  };

  const reset = () => {
    sim.current = new LiveSim(INITIAL, 7);
    dots.current = [];
    totals.current = { requests: 0, errors: 0 };
    publishReadout({ state: "healthy", requests: 0, errors: 0, p99: null });
    setFlowState({ rate: INITIAL.rate, strain: 0 });
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
  const killLabel = down ? `restart app ${downIndex + 1}` : "kill a server";

  return (
    <div>
      <figure className="device p-2" aria-labelledby="live-system-title">
        <figcaption className="flex items-center justify-between gap-4 pb-2 pl-3 pr-0.5 pt-0.5">
          <p id="live-system-title" className="t-mono flex items-center gap-2 text-ink-2">
            <span className="relative flex size-1.5" aria-hidden="true">
              <span className="absolute inset-0 rounded-full motion-safe:animate-ping" style={{ background: status, opacity: 0.6 }} />
              <span className="relative size-1.5 rounded-full" style={{ background: status }} />
            </span>
            a small system you can break
          </p>
          <button type="button" onClick={reset} className="key key-sm">
            reset
          </button>
        </figcaption>

        <div className="screen overflow-hidden">
          {/* Status and diagram share a fixed height (see DISPLAY_HEIGHT). */}
          <div className="flex flex-col" style={{ height: layout.vertical ? DISPLAY_HEIGHT_VERTICAL : DISPLAY_HEIGHT }}>
            <div className="flex shrink-0 items-start gap-2.5 border-b border-screen-line px-3.5 py-2.5">
              <span className="mt-[0.5em] size-1.5 shrink-0 rounded-full" style={{ background: status }} aria-hidden="true" />
              <p className="t-mono text-[0.75rem] leading-[1.45] text-screen-ink" aria-live="polite">
                {hint}
              </p>
            </div>

            <div ref={box} className="screen-dots relative min-h-0 flex-1">
              <svg width={layout.width} height={layout.height} className="absolute inset-0" aria-hidden="true">
                <g stroke="var(--screen-wire)" strokeWidth={1.5} fill="none">
                  <Edge from={layout.entry} to={entryOf(layout, layout.lb, node)} dashed />
                  {layout.apps.map((point, i) => (
                    <g key={i}>
                      <Edge from={exitOf(layout, layout.lb, node)} to={entryOf(layout, point, app)} />
                      <Edge from={exitOf(layout, point, app)} to={entryOf(layout, layout.cache, node)} />
                    </g>
                  ))}
                  <Edge from={exitOf(layout, layout.cache, node)} to={entryOf(layout, layout.db, node)} />
                </g>
                {/* The incoming rate, where requests enter. */}
                <text
                  x={layout.vertical ? layout.entry.x + 12 : layout.entry.x}
                  y={layout.vertical ? 18 : layout.lb.y - node.h / 2 - 12}
                  fontSize={12}
                  className="font-mono"
                  fill="var(--screen-graphite)"
                >
                  in · {config.rate}/s
                </text>
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

        {/* The control deck. Phones: fader, then servers · cache · kill on one row. Wider: the kill key gets its own bay. */}
        <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-4 gap-y-4 px-2.5 pb-2 pt-4 sm:gap-x-6">
          <div className="col-span-2 min-w-0 sm:col-span-1">
            <div className="t-mono flex items-baseline justify-between">
              <span className="text-graphite" aria-hidden="true">
                traffic
              </span>
              <span className="text-ink">
                <span className="tabular-nums">{config.rate}</span> requests/s
              </span>
            </div>
            <Fader value={config.rate} onChange={(rate) => update({ rate })} />
          </div>

          <div className="col-start-1 flex min-w-0 flex-wrap items-end gap-x-4 gap-y-4 self-start sm:row-start-2 sm:gap-x-6">
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
              {/* A latching rocker: pressed in while the cache is on, with an ink dot as its lamp. */}
              <button
                type="button"
                role="switch"
                aria-checked={config.cache}
                aria-labelledby="cache-label"
                data-latched={config.cache}
                onClick={() => update({ cache: !config.cache })}
                className="key h-10 min-h-10 w-[5rem] justify-between px-3 sm:w-[5.75rem]"
              >
                <span
                  className="size-1.5 rounded-full transition-colors"
                  style={{ background: config.cache ? "var(--ink)" : "var(--rule-strong)" }}
                  aria-hidden="true"
                />
                <span className="font-mono text-[0.8125rem] font-medium">{config.cache ? "on" : "off"}</span>
              </button>
            </div>
          </div>

          {/* The signature: a cobalt button, labelled on the panel the way hardware is. */}
          <div className="col-start-2 row-start-2 flex flex-col items-end justify-start gap-1.5 sm:row-span-2 sm:row-start-1 sm:w-[9.5rem] sm:items-center sm:justify-center sm:gap-2.5 sm:border-l sm:border-rule sm:pl-6">
            <button
              type="button"
              onClick={toggleKill}
              aria-label={down ? `Restart app ${downIndex + 1}` : "Kill a server"}
              data-latched={down}
              className="key key-signal size-14 min-h-0 rounded-full p-0 sm:size-[4.75rem]"
            >
              {down ? <RestartGlyph /> : <PowerGlyph />}
            </button>
            <span className="t-mono whitespace-nowrap text-ink max-sm:order-first" aria-hidden="true">
              <span className="sm:hidden">{down ? "restart" : "kill"}</span>
              <span className="max-sm:hidden">{killLabel}</span>
            </span>
          </div>
        </div>
      </figure>
      <p className="mt-3 px-1 text-[0.9375rem] leading-snug text-graphite">
        Every request is simulated in your browser by a seeded event engine, the idea behind Systemlab.
      </p>
    </div>
  );
}

/** Kill: a power symbol, 22px, in the key's ink. */
function PowerGlyph() {
  return (
    <svg viewBox="0 0 24 24" className="size-[18px] sm:size-[22px]" fill="none" stroke="currentColor" strokeWidth={2.25} strokeLinecap="round" aria-hidden="true">
      <path d="M12 3v8" />
      <path d="M6.4 6.6a8 8 0 1 0 11.2 0" />
    </svg>
  );
}

/** Restart: a circular arrow. */
function RestartGlyph() {
  return (
    <svg viewBox="0 0 24 24" className="size-[18px] sm:size-[22px]" fill="none" stroke="currentColor" strokeWidth={2.25} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M20 12a8 8 0 1 1-2.6-5.9" />
      <path d="M20 4v4.5h-4.5" />
    </svg>
  );
}

/** A long fader: a groove, a light fill, and a cobalt cap that springs when you grab it. */
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
      <SliderPrimitive.Track className="relative h-1 grow overflow-hidden rounded-full bg-rule-strong">
        <SliderPrimitive.Range className="absolute h-full rounded-full bg-ink" />
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
  const titleY = y + (hasTrack ? Math.round(size.h * 0.36) : size.h / 2 - 3);
  const lineGap = size.h < 50 ? 14 : 15;
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
        stroke={state === "down" ? "var(--fail)" : "var(--screen-outline)"}
        strokeDasharray={state === "normal" ? undefined : "4 3"}
      />
      <text x={x + pad} y={titleY} fontSize={13} fontWeight={500} fill={muted ? "var(--screen-graphite)" : "var(--screen-ink)"}>
        {title}
      </text>
      <text x={x + pad} y={titleY + lineGap} fontSize={12} fill={state === "down" ? "var(--fail)" : "var(--screen-graphite)"}>
        {detail}
      </text>
      {hasTrack && (
        <>
          <rect x={x + pad} y={y + size.h - (size.h < 50 ? 9 : 11)} width={size.w - pad * 2} height={3} rx={1.5} fill="var(--screen-track)" />
          <rect x={x + pad} y={y + size.h - (size.h < 50 ? 9 : 11)} width={Math.max(0, (size.w - pad * 2) * Math.min(1, util))} height={3} rx={1.5} fill={color} />
        </>
      )}
    </g>
  );
}
