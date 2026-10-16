"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { DatabaseIcon, NetworkIcon, ServerIcon, ZapIcon, type LucideIcon } from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { LiveSim, MAX_SERVERS, diagnose, type Finished, type Metrics, type SimConfig, type Stage } from "@/lib/live-sim";
import { trackEvent } from "./site-analytics";

const INITIAL: SimConfig = { rate: 160, servers: 2, cache: false };
const MAX_RATE = 900;
const DOTS_PER_SECOND = 36;
const SEGMENT_MS = 240;
const SLOW_MS = 150;

type Point = { x: number; y: number };
type Layout = {
  width: number;
  height: number;
  node: { w: number; h: number };
  entry: Point;
  lb: Point;
  apps: Point[];
  cache: Point;
  db: Point;
};

function computeLayout(width: number, servers: number): Layout {
  const height = 240;
  const mid = height / 2;
  const nodeW = Math.round(Math.min(104, Math.max(70, width * 0.19)));
  const nodeH = 44;
  const gap = (height - 28) / MAX_SERVERS;
  const apps = Array.from({ length: servers }, (_, i) => ({
    x: width * 0.42,
    y: mid + (i - (servers - 1) / 2) * gap,
  }));
  return {
    width,
    height,
    node: { w: nodeW, h: nodeH },
    entry: { x: 0, y: mid },
    lb: { x: Math.max(nodeW / 2 + 22, width * 0.16), y: mid },
    apps,
    cache: { x: width * 0.66, y: mid },
    db: { x: width - nodeW / 2 - 2, y: mid },
  };
}

type Dot = { points: Point[]; born: number; ok: boolean; slow: boolean };

function pathPoints(layout: Layout, f: Finished): Point[] {
  const jitter = (Math.random() - 0.5) * 30;
  const points: Point[] = [{ x: layout.entry.x, y: layout.entry.y + jitter }];
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
  if (!up) return "var(--destructive)";
  if (util > 0.9) return "var(--destructive)";
  if (util > 0.7) return "var(--trace)";
  return "var(--ink)";
}

const fmtMs = (ms: number) => (ms >= 1000 ? `${(ms / 1000).toFixed(1)} s` : `${Math.round(ms)} ms`);

/** `glass` renders the panel as frosted glass, for use over the hero photo. */
export function LiveSystem({ glass = false }: { glass?: boolean }) {
  const [config, setConfig] = useState<SimConfig>(INITIAL);
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [width, setWidth] = useState(520);
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

  // Track container width so text renders at its real size.
  useEffect(() => {
    const element = box.current;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) => setWidth(Math.max(300, Math.round(entry.contentRect.width))));
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
    const colors = { ok: "#1f48d4", slow: "#d48f00", bad: "#c2341b" };
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
        ctx.globalAlpha = Math.max(0, fade) * (dot.ok ? 0.85 : 1);
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
    if (!touched.current) {
      touched.current = true;
      trackEvent("sim:interact");
    }
    if (downIndex >= 0) sim.current!.restartServer(downIndex);
    else sim.current!.killServer(0);
    setMetrics(sim.current!.metrics());
  };

  const reset = () => {
    sim.current = new LiveSim(INITIAL, 7);
    dots.current = [];
    setConfig(INITIAL);
    setMetrics(null);
  };

  const hint = metrics ? diagnose(metrics, config) : "Starting the simulation.";
  const { node } = layout;

  return (
    <figure className={`rounded-xl border p-4 sm:p-5 ${glass ? "glass" : "border-rule bg-paper"}`} aria-labelledby="live-system-title">
      <figcaption className="flex items-start justify-between gap-4">
        <div>
          <p id="live-system-title" className="font-semibold leading-snug">
            A small system you can break
          </p>
          <p className="mt-1 text-[0.9rem] leading-snug text-graphite">
            Every request is simulated live in your browser by a seeded event engine, the idea behind Systemlab.
          </p>
        </div>
        <button
          type="button"
          onClick={reset}
          className="shrink-0 rounded-md border border-rule px-2.5 py-1 text-sm font-medium transition-colors hover:border-ink"
        >
          Reset
        </button>
      </figcaption>

      <div ref={box} className="sim-canvas relative mt-4 rounded-lg" style={{ height: layout.height }}>
        <svg width={layout.width} height={layout.height} className="absolute inset-0" aria-hidden="true">
          <g stroke="var(--rule)" strokeWidth={1.5} fill="none">
            <line x1={layout.entry.x} y1={layout.entry.y} x2={layout.lb.x - node.w / 2} y2={layout.lb.y} strokeDasharray="3 4" />
            {layout.apps.map((app, i) => (
              <g key={i}>
                <line x1={layout.lb.x + node.w / 2} y1={layout.lb.y} x2={app.x - node.w / 2} y2={app.y} />
                <line x1={app.x + node.w / 2} y1={app.y} x2={layout.cache.x - node.w / 2} y2={layout.cache.y} />
              </g>
            ))}
            <line x1={layout.cache.x + node.w / 2} y1={layout.cache.y} x2={layout.db.x - node.w / 2} y2={layout.db.y} />
          </g>
        </svg>
        {/* Requests travel on the canvas, between the edges and the nodes, so they pass under the boxes. */}
        <canvas ref={canvas} className="pointer-events-none absolute inset-0" style={{ width: layout.width, height: layout.height }} aria-hidden="true" />
        <svg width={layout.width} height={layout.height} className="absolute inset-0" aria-hidden="true">

          <Node at={layout.lb} size={node} title="Balancer" detail="round robin" icon={NetworkIcon} accent="var(--signal)" />
          {layout.apps.map((app, i) => {
            const up = metrics?.serverUp[i] ?? true;
            const util = metrics?.appUtilization[i] ?? 0;
            return (
              <Node
                key={i}
                at={app}
                size={node}
                title={`App ${i + 1}`}
                icon={ServerIcon}
                accent={up ? "var(--ink)" : "var(--destructive)"}
                detail={up ? `${Math.round(util * 100)}% busy` : "down"}
                util={up ? util : 1}
                color={utilColor(util, up)}
                dashed={!up}
              />
            );
          })}
          <Node
            at={layout.cache}
            size={node}
            title="Cache"
            icon={ZapIcon}
            accent="var(--trace)"
            detail={config.cache ? `${Math.round((metrics?.cacheHitRate ?? 0) * 100)}% hits` : "off"}
            dashed={!config.cache}
            muted={!config.cache}
          />
          <Node
            at={layout.db}
            size={node}
            title="Database"
            icon={DatabaseIcon}
            accent="var(--go)"
            detail={`${Math.round((metrics?.dbUtilization ?? 0) * 100)}% busy`}
            util={metrics?.dbUtilization ?? 0}
            color={utilColor(metrics?.dbUtilization ?? 0)}
          />
        </svg>
      </div>

      <dl className="mt-4 grid grid-cols-4 gap-2 border-y border-rule py-3 text-center">
        {[
          { label: "p50", value: metrics ? fmtMs(metrics.p50) : "–" },
          { label: "p99", value: metrics ? fmtMs(metrics.p99) : "–" },
          { label: "served", value: metrics ? `${Math.round(metrics.throughput)}/s` : "–" },
          {
            label: "errors",
            value: metrics ? `${(metrics.errorRate * 100).toFixed(metrics.errorRate > 0 && metrics.errorRate < 0.1 ? 1 : 0)}%` : "–",
            bad: (metrics?.errorRate ?? 0) > 0.01,
          },
        ].map((item) => (
          <div key={item.label}>
            <dt className="text-[0.8rem] text-graphite">{item.label}</dt>
            <dd className={`text-[1.05rem] font-bold tabular-nums tracking-tight sm:text-[1.2rem] ${item.bad ? "text-destructive" : ""}`}>
              {item.value}
            </dd>
          </div>
        ))}
      </dl>

      <div className="mt-4 space-y-4">
        <div>
          <div className="flex items-baseline justify-between">
            <span className="text-[0.95rem] font-medium" aria-hidden="true">
              Traffic
            </span>
            <span className="text-[0.95rem] tabular-nums text-graphite">{config.rate} requests/s</span>
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

        <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
          <div className="flex items-center gap-2">
            <span id="servers-label" className="text-[0.95rem] font-medium">
              App servers
            </span>
            <div className="flex items-center rounded-md border border-rule" role="group" aria-labelledby="servers-label">
              <button
                type="button"
                aria-label="Remove a server"
                disabled={config.servers <= 1}
                onClick={() => update({ servers: config.servers - 1 })}
                className="h-8 w-8 text-lg leading-none disabled:opacity-35"
              >
                −
              </button>
              <span className="w-6 text-center tabular-nums" aria-live="polite">
                {config.servers}
              </span>
              <button
                type="button"
                aria-label="Add a server"
                disabled={config.servers >= MAX_SERVERS}
                onClick={() => update({ servers: config.servers + 1 })}
                className="h-8 w-8 text-lg leading-none disabled:opacity-35"
              >
                +
              </button>
            </div>
          </div>

          <label className="flex items-center gap-2 text-[0.95rem] font-medium">
            <Switch checked={config.cache} onCheckedChange={(cache) => update({ cache })} className="data-[size=default]:h-5 data-[size=default]:w-9" />
            Cache
          </label>

          <button type="button" onClick={toggleKill} className="ml-auto rounded-md border border-rule px-3 py-1.5 text-sm font-medium transition-colors hover:border-ink">
            {downIndex >= 0 ? "Restart the server" : "Kill a server"}
          </button>
        </div>

        <p className="min-h-[2.6em] text-[0.95rem] leading-snug" aria-live="polite">
          {hint}
        </p>
      </div>
    </figure>
  );
}

function Node({
  at,
  size,
  title,
  detail,
  util,
  color = "var(--ink)",
  dashed = false,
  muted = false,
  icon: Icon,
  accent = "var(--ink)",
}: {
  at: Point;
  size: { w: number; h: number };
  title: string;
  detail: string;
  util?: number;
  color?: string;
  dashed?: boolean;
  muted?: boolean;
  icon?: LucideIcon;
  accent?: string;
}) {
  const x = at.x - size.w / 2;
  const y = at.y - size.h / 2;
  // Icons only where the boxes are wide enough to hold them next to the label.
  const showIcon = !!Icon && size.w >= 96;
  const textX = x + (showIcon ? 30 : 9);
  return (
    <g>
      <rect
        x={x}
        y={y}
        width={size.w}
        height={size.h}
        rx={6}
        fill="var(--paper-raised)"
        stroke={dashed ? "var(--graphite)" : "var(--rule)"}
        strokeDasharray={dashed ? "4 3" : undefined}
      />
      <rect x={x} y={y + 6} width={3} height={size.h - 12} rx={1.5} fill={muted ? "var(--rule)" : accent} />
      {showIcon && Icon && (
        <Icon x={x + 10} y={y + size.h / 2 - 8} width={16} height={16} strokeWidth={1.75} color={muted ? "var(--graphite)" : accent} />
      )}
      <text x={textX} y={y + 17} fontSize={12} fontWeight={600} fill={muted ? "var(--graphite)" : "var(--ink)"}>
        {title}
      </text>
      <text x={textX} y={y + 32} fontSize={11} fill="var(--graphite)" className="tabular-nums">
        {detail}
      </text>
      {util !== undefined && (
        <rect x={x + 1} y={y + size.h - 4} width={Math.max(0, (size.w - 2) * Math.min(1, util))} height={3} rx={1.5} fill={color} />
      )}
    </g>
  );
}
