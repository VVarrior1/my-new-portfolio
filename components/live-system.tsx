"use client";

import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { Slider as SliderPrimitive } from "radix-ui";
import { LiveSim, MAX_SERVERS, diagnose, type Finished, type Metrics, type SimConfig, type Stage } from "@/lib/live-sim";
import { emitFlow, setFlowState, strainFrom } from "@/lib/flow-bus";
import { publishReadout, stateFrom } from "@/lib/sim-readout";
import { DEMO_CUES, DEMO_HANDOFF, DEMO_IDLE_MS, DEMO_MS, DEMO_VICTIM, demoCueAt, demoRate } from "@/lib/sim-demo";
import { trackEvent } from "./site-analytics";

// The hero simulator: an instrument floating on the liquid field (a pale body around a dark screen in
// light, all dark in dark). Its screen shows the system
// (and is the only place status colours appear); the deck under it holds the things you press, in
// cobalt the one that breaks it. It also drives the field behind the page (lib/flow-bus.ts):
// traffic sets the current, strain makes it turbulent, and a killed server swells the cobalt thread.
// Left alone on screen for a few seconds it breaks itself once (lib/sim-demo.ts), then recovers. A
// pointer passing over or a finger scrolling the page only restarts that wait; a press, a tap, focus
// or a key calls the demo off, or hands the visitor a fresh device if it is playing.

const INITIAL: SimConfig = { rate: 160, servers: 2, cache: false };
const MAX_RATE = 900;
const DOTS_PER_SECOND = 36;
const SEGMENT_MS = 240;
const SLOW_MS = 150;
/** Phones get the compact device: the same diagram, left to right, at about half the height.
 * The `compact:` variant in globals.css is the same query. */
const COMPACT_QUERY = "(width < 560px)";
/** The status line and the diagram share a fixed height, so a two-line status shrinks the diagram
 * a little instead of pushing the controls down under the pointer. */
const DISPLAY_HEIGHT = 276;
const DISPLAY_HEIGHT_COMPACT = 156;
/** How much of the device must be on screen for the idle clock (and so the demo) to run: all of it,
 * deck included, so the visitor sees the kill key the demo is about. */
const DEMO_VISIBLE = 0.9;
/** A touch that moves less than this is a tap; more, and it is the page scrolling under a finger. */
const TAP_SLOP = 10;
/** How long the demo's last line (or the hand-off line) stays before the live status returns. */
const AFTERWORD_MS = 2600;

type Point = { x: number; y: number };
type Size = { w: number; h: number };
type Layout = {
  width: number;
  height: number;
  compact: boolean;
  node: Size;
  app: Size;
  entry: Point;
  lb: Point;
  apps: Point[];
  cache: Point;
  db: Point;
};

/** One left-to-right diagram for every width: the nodes shrink before the wires do, so requests
 * always have a visible stretch of wire, and app servers stack in the second column. */
function computeLayout(width: number, measuredHeight: number, servers: number, compact: boolean): Layout {
  const height = Math.max(compact ? 88 : 180, measuredHeight);
  const mid = height / 2;
  const left = compact ? 14 : 28;
  const right = compact ? 8 : 14;
  const gapMin = compact ? 12 : width < 480 ? 18 : 26;
  const w = Math.min(compact ? 88 : 132, Math.floor((width - left - right - 3 * gapMin) / 4));
  const h = compact ? 42 : 72;
  const space = compact ? 4 : 8;
  const appH = Math.min(h, Math.floor((height - 12 - (servers - 1) * space) / servers));
  const pitch = servers > 1 ? Math.min(compact ? 54 : 124, (height - 12 - appH) / (servers - 1)) : 0;
  const gap = (width - left - right - 4 * w) / 3;
  const col = (i: number) => left + w / 2 + i * (w + gap);
  return {
    width,
    height,
    compact,
    node: { w, h },
    app: { w, h: appH },
    entry: { x: compact ? 4 : 10, y: mid },
    lb: { x: col(0), y: mid },
    apps: Array.from({ length: servers }, (_, i) => ({ x: col(1), y: mid + (i - (servers - 1) / 2) * pitch })),
    cache: { x: col(2), y: mid },
    db: { x: col(3), y: mid },
  };
}

/** Where an edge leaves a node, and where it enters the next one. */
const exitOf = (p: Point, s: Size): Point => ({ x: p.x + s.w / 2, y: p.y });
const entryOf = (p: Point, s: Size): Point => ({ x: p.x - s.w / 2, y: p.y });

type Dot = { points: Point[]; born: number; ok: boolean; slow: boolean };

function pathPoints(layout: Layout, f: Finished): Point[] {
  const jitter = (Math.random() - 0.5) * (layout.compact ? 10 : 16);
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

function loadColor(util: number, up = true) {
  if (!up || util > 0.95) return "var(--fail)";
  if (util > 0.85) return "var(--trace)";
  return "var(--screen-ink)";
}

function reading(ms: number): { value: string; unit: string } {
  return ms >= 1000 ? { value: (ms / 1000).toFixed(1), unit: "s" } : { value: String(Math.round(ms)), unit: "ms" };
}

type DemoPhase = "waiting" | "playing" | "done";

export function LiveSystem() {
  const [config, setConfig] = useState<SimConfig>(INITIAL);
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [size, setSize] = useState({ w: 560, h: DISPLAY_HEIGHT - 48 });
  const [compact, setCompact] = useState(false);
  /** A line the status shows instead of the live diagnosis: the demo's narration, then its last word. */
  const [narration, setNarration] = useState<string | null>(null);
  const [demoOn, setDemoOn] = useState(false);
  const figure = useRef<HTMLElement>(null);
  const box = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const sim = useRef<LiveSim | null>(null);
  const dots = useRef<Dot[]>([]);
  const visible = useRef(true);
  /** How much of the whole device is on screen (the demo waits for all of it). */
  const shown = useRef(0);
  /** A touch that has gone down on the device: a tap if it comes up where it started. */
  const press = useRef<{ id: number; x: number; y: number } | null>(null);
  const reduced = useRef(false);
  const touched = useRef(false);
  const demo = useRef({ phase: "waiting" as DemoPhase, idle: 0, t: 0, cue: -1, rate: INITIAL.rate });
  const afterword = useRef(0);
  /** A tap that stops the demo on the kill key isn't also a kill: the key said "restart" under the finger. */
  const swallowKillUntil = useRef(0);
  /** Requests finished (and failed) since load or reset, for the status strip above the name. */
  const totals = useRef({ requests: 0, errors: 0 });

  const layout = useMemo(() => computeLayout(size.w, size.h, config.servers, compact), [size, config.servers, compact]);
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

  // Track the diagram's size so text renders at its real size, and the phone layout's query.
  useEffect(() => {
    const element = box.current;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) => {
      const w = Math.max(260, Math.round(entry.contentRect.width));
      const h = Math.round(entry.contentRect.height);
      setSize((current) => (current.w === w && current.h === h ? current : { w, h }));
    });
    observer.observe(element);
    const query = window.matchMedia(COMPACT_QUERY);
    const onQuery = () => setCompact(query.matches);
    onQuery();
    query.addEventListener("change", onQuery);
    return () => {
      observer.disconnect();
      query.removeEventListener("change", onQuery);
    };
  }, []);

  // Only run while on screen and the tab is visible.
  useEffect(() => {
    const element = box.current;
    const device = figure.current;
    if (!element || !device) return;
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.target === element) visible.current = entry.isIntersecting;
          else shown.current = entry.intersectionRatio;
        }
      },
      { threshold: [0, 0.05, 0.6, DEMO_VISIBLE, 1] },
    );
    io.observe(element);
    io.observe(device);
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    reduced.current = media.matches;
    const onMedia = () => (reduced.current = media.matches);
    media.addEventListener("change", onMedia);
    return () => {
      io.disconnect();
      media.removeEventListener("change", onMedia);
      window.clearTimeout(afterword.current);
    };
  }, []);

  /** Applies controls without counting a visitor (the demo uses this too). */
  const applyConfig = useCallback((next: Partial<SimConfig>) => {
    setConfig((current) => {
      const merged = { ...current, ...next };
      sim.current!.setConfig(merged);
      return merged;
    });
  }, []);

  const deviceRect = () => {
    const r = figure.current?.getBoundingClientRect();
    return r ? { top: r.top, bottom: r.bottom, left: r.left, right: r.right } : undefined;
  };
  const kill = (index: number) => {
    sim.current!.killServer(index);
    const at = toViewport(layout.apps[index] ?? layout.apps[0]);
    if (at) emitFlow({ kind: "kill", ...at, device: deviceRect() });
    setMetrics(sim.current!.metrics());
  };
  const restart = (index: number) => {
    sim.current!.restartServer(index);
    const at = toViewport(layout.apps[index] ?? layout.apps[0]);
    if (at) emitFlow({ kind: "restart", ...at });
    setMetrics(sim.current!.metrics());
  };

  const sayFor = (line: string | null, ms = AFTERWORD_MS) => {
    window.clearTimeout(afterword.current);
    setNarration(line);
    if (line) afterword.current = window.setTimeout(() => setNarration(null), ms);
  };

  /** A fresh run at the starting controls. `keepTotals` leaves the status strip's counts running. */
  const restore = (keepTotals: boolean) => {
    sim.current = new LiveSim(INITIAL, 7);
    dots.current = [];
    if (!keepTotals) totals.current = { requests: 0, errors: 0 };
    publishReadout({ state: "healthy", ...totals.current, p99: null });
    setFlowState({ rate: INITIAL.rate, strain: 0 });
    setConfig(INITIAL);
    setMetrics(null);
  };

  /** The demo, one frame at a time, on the simulation's own clock (so it pauses with it). */
  const tickDemo = (dt: number) => {
    const d = demo.current;
    if (d.phase === "done") return;
    if (reduced.current) {
      // Never under reduced motion; if it was switched on mid-demo, hand back a clean device.
      if (d.phase === "playing") takeOver(null);
      d.phase = "done";
      return;
    }
    if (d.phase === "waiting") {
      if (shown.current < DEMO_VISIBLE) return;
      d.idle += dt;
      if (d.idle < DEMO_IDLE_MS) return;
      d.phase = "playing";
      d.t = 0;
      d.cue = -1;
      setDemoOn(true);
      trackEvent("sim:demo");
    }
    d.t += dt;
    const rate = demoRate(d.t);
    if (rate !== d.rate) {
      d.rate = rate;
      applyConfig({ rate });
    }
    const cue = demoCueAt(d.t);
    while (d.cue < cue) {
      d.cue++;
      const step = DEMO_CUES[d.cue];
      window.clearTimeout(afterword.current);
      setNarration(step.say);
      if (step.action === "kill") kill(DEMO_VICTIM);
      if (step.action === "restart") restart(DEMO_VICTIM);
    }
    if (d.t >= DEMO_MS) {
      d.phase = "done";
      setDemoOn(false);
      sayFor(DEMO_CUES[DEMO_CUES.length - 1].say);
    }
  };
  const tickDemoRef = useRef(tickDemo);
  tickDemoRef.current = tickDemo;

  /** The visitor takes over mid-demo: a fresh device at the starting setup, every server up. */
  const takeOver = (event: React.SyntheticEvent | null) => {
    const d = demo.current;
    if (d.phase !== "playing") return;
    d.phase = "done";
    // A press on the kill key while it read "Restart" isn't also a kill once every server is back:
    // a click follows the pointer or key that stopped the demo, and a key reached by Tab was
    // announced as "Restart", so an Enter straight after means restart, not kill.
    const onKill = event?.target instanceof Element && event.target.closest("[data-kill]");
    if (onKill && metrics?.serverUp.some((up) => !up)) {
      swallowKillUntil.current = performance.now() + 1000;
    }
    setDemoOn(false);
    restore(true);
    sayFor(DEMO_HANDOFF, 3600);
  };

  /** A real press, a tap, focus or a key: the demo never starts, or stops right here. */
  const engage = (event: React.SyntheticEvent | null) => {
    const d = demo.current;
    if (d.phase === "waiting") d.phase = "done";
    else takeOver(event);
  };
  /** A pointer passing over, a wheel or a finger scrolling the page only restarts the idle clock:
   * the demo waits for the device to be left alone, it isn't called off by a near miss. */
  const stir = () => {
    if (demo.current.phase === "waiting") demo.current.idle = 0;
  };
  const onPointerDown = (event: React.PointerEvent) => {
    stir();
    // A touch might be the start of a scroll: it counts once it comes up as a tap.
    if (event.pointerType === "touch") press.current = { id: event.pointerId, x: event.clientX, y: event.clientY };
    else engage(event);
  };
  const onPointerUp = (event: React.PointerEvent) => {
    const start = press.current;
    press.current = null;
    if (event.pointerType !== "touch" || !start || start.id !== event.pointerId) return;
    if (Math.hypot(event.clientX - start.x, event.clientY - start.y) < TAP_SLOP) engage(event);
  };

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
      if (!visible.current || document.hidden) {
        if (!paused) {
          paused = true;
          publishReadout({ state: "paused", ...totals.current, p99: sim.current!.metrics().p99 || null });
        }
        return;
      }
      paused = false;

      tickDemoRef.current(dt);
      const s = sim.current!;
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
          const state = stateFrom(m.errorRate, m.p99, anyDown);
          publishReadout({ state, ...totals.current, p99: m.p99 || null });
        }
      }

      const c = canvas.current;
      const ctx = c?.getContext("2d");
      if (!c || !ctx) return;
      const { width: w, height: h, compact: small } = layoutRef.current;
      const dpr = window.devicePixelRatio || 1;
      if (c.width !== Math.round(w * dpr) || c.height !== Math.round(h * dpr)) {
        c.width = Math.round(w * dpr);
        c.height = Math.round(h * dpr);
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);
      ctx.lineCap = "round";
      const radius = small ? 2.2 : 2.6;
      const arm = small ? 3 : 3.5;

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
          ctx.arc(x, y, radius, 0, Math.PI * 2);
          ctx.fill();
        } else {
          // A failed request is an ×, so it reads without colour too.
          ctx.strokeStyle = colors.bad;
          ctx.lineWidth = 1.75;
          ctx.beginPath();
          ctx.moveTo(x - arm, y - arm);
          ctx.lineTo(x + arm, y + arm);
          ctx.moveTo(x + arm, y - arm);
          ctx.lineTo(x - arm, y + arm);
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

  const update = (next: Partial<SimConfig>) => {
    // A control moved under a finger (the fader takes a touch at once) is the visitor's now.
    takeOver(null);
    markTouched();
    sayFor(null);
    applyConfig(next);
  };

  const downIndex = metrics?.serverUp.findIndex((up) => !up) ?? -1;
  const down = downIndex >= 0;
  const toggleKill = () => {
    // A click with no press or key before it (assistive tech) while the demo runs: the hand-off alone.
    if (demo.current.phase === "playing") return takeOver(null);
    if (performance.now() < swallowKillUntil.current) {
      swallowKillUntil.current = 0;
      return;
    }
    markTouched();
    sayFor(null);
    if (down) restart(downIndex);
    else kill(Math.floor(Math.random() * config.servers));
  };

  const reset = () => {
    takeOver(null);
    sayFor(null);
    restore(false);
  };

  const hint = narration ?? (metrics ? diagnose(metrics, config) : "Starting the simulation.");
  const status = !metrics
    ? "var(--screen-graphite)"
    : metrics.errorRate > 0.01
      ? "var(--fail)"
      : metrics.p99 > 150 || down
        ? "var(--trace)"
        : "var(--screen-go)";

  const errorPct = metrics ? (metrics.errorRate * 100).toFixed(metrics.errorRate > 0 && metrics.errorRate < 0.1 ? 1 : 0) : null;
  const readouts: Array<{ label: string; value: string; unit: string; warn?: boolean; bad?: boolean }> = [
    { label: "median", ...(metrics ? reading(metrics.p50) : { value: "–", unit: "" }) },
    { label: "p99", ...(metrics ? reading(metrics.p99) : { value: "–", unit: "" }), warn: (metrics?.p99 ?? 0) > 150 },
    { label: "served", value: metrics ? String(Math.round(metrics.throughput)) : "–", unit: metrics ? "/s" : "" },
    { label: "errors", value: errorPct ?? "–", unit: metrics ? "%" : "", bad: (metrics?.errorRate ?? 0) > 0.01 },
  ];

  const { node, app } = layout;
  const roomy = node.w >= 100;
  const percent = (u: number) => `${Math.round(u * 100)}%${roomy ? " busy" : ""}`;

  return (
    <div>
      <figure
        ref={figure}
        className="device p-2 compact:p-1.5"
        aria-labelledby="live-system-title"
        onPointerMoveCapture={stir}
        onWheelCapture={stir}
        onPointerDownCapture={onPointerDown}
        onPointerUpCapture={onPointerUp}
        onPointerCancelCapture={() => (press.current = null)}
        onFocusCapture={engage}
        onKeyDownCapture={engage}
      >
        <figcaption className="flex items-center justify-between gap-3 pb-2 pl-3 pr-0.5 pt-0.5 compact:pb-1 compact:pl-2.5 compact:pt-0 compact:pr-0">
          <p id="live-system-title" className="text-[0.9375rem] font-[550] leading-tight tracking-[-0.01em] text-ink compact:text-[0.875rem]">
            A small system you can break
          </p>
          <button type="button" onClick={reset} className="key key-sm font-sans font-[550] compact:min-h-10 compact:px-3.5">
            Reset
          </button>
        </figcaption>

        <div className="screen overflow-hidden">
          {/* Status and diagram share a fixed height (see DISPLAY_HEIGHT). */}
          <div className="flex flex-col" style={{ height: compact ? DISPLAY_HEIGHT_COMPACT : DISPLAY_HEIGHT }}>
            <div className="flex shrink-0 items-start gap-2.5 border-b border-screen-line px-4 py-3 compact:gap-2 compact:px-3 compact:py-1.5">
              <span className="mt-[0.5em] size-1.5 shrink-0 rounded-full transition-colors" style={{ background: status }} aria-hidden="true" />
              <p className="text-[0.875rem] leading-[1.4] text-screen-ink compact:text-[0.8125rem] compact:leading-[1.35]" aria-live="polite">
                {demoOn && (
                  <>
                    <span className="sim-tag mr-1.5">Demo</span>{" "}
                  </>
                )}
                {hint}
              </p>
            </div>

            <div ref={box} className="relative min-h-0 flex-1">
              <svg width={layout.width} height={layout.height} className="absolute inset-0" aria-hidden="true">
                <g stroke="var(--screen-wire)" strokeWidth={1.5} fill="none">
                  <Edge from={layout.entry} to={entryOf(layout.lb, node)} dashed />
                  {layout.apps.map((point, i) => (
                    <g key={i}>
                      <Edge from={exitOf(layout.lb, node)} to={entryOf(point, app)} />
                      <Edge from={exitOf(point, app)} to={entryOf(layout.cache, node)} />
                    </g>
                  ))}
                  <Edge from={exitOf(layout.cache, node)} to={entryOf(layout.db, node)} />
                </g>
              </svg>
              {/* Requests travel on the canvas, between the wires and the nodes, so they pass under the boxes. */}
              <canvas
                ref={canvas}
                className="pointer-events-none absolute inset-0"
                style={{ width: layout.width, height: layout.height }}
                aria-hidden="true"
              />
              <svg width={layout.width} height={layout.height} className="absolute inset-0" aria-hidden="true">
                <Node at={layout.lb} size={node} compact={compact} title="balancer" />
                {layout.apps.map((point, i) => {
                  const up = metrics?.serverUp[i] ?? true;
                  const util = metrics?.appUtilization[i] ?? 0;
                  return (
                    <Node
                      key={i}
                      at={point}
                      size={app}
                      compact={compact}
                      title={`app ${i + 1}`}
                      value={up ? percent(util) : "down"}
                      load={up ? util : 0}
                      color={loadColor(util, up)}
                      state={up ? "normal" : "down"}
                    />
                  );
                })}
                <Node
                  at={layout.cache}
                  size={node}
                  compact={compact}
                  title="cache"
                  value={config.cache ? `${Math.round((metrics?.cacheHitRate ?? 0) * 100)}% hits` : "off"}
                  state={config.cache ? "normal" : "off"}
                />
                <Node
                  at={layout.db}
                  size={node}
                  compact={compact}
                  title="database"
                  value={percent(metrics?.dbUtilization ?? 0)}
                  load={metrics?.dbUtilization ?? 0}
                  color={loadColor(metrics?.dbUtilization ?? 0)}
                />
              </svg>
            </div>
          </div>

          <dl className="grid grid-cols-4 border-t border-screen-line">
            {readouts.map((item, i) => (
              <div key={item.label} className={`min-w-0 px-4 pb-3 pt-2.5 compact:px-2.5 compact:pb-2 compact:pt-1.5 ${i > 0 ? "border-l border-screen-line" : ""}`}>
                <dt className="text-[0.8125rem] font-medium leading-none text-screen-graphite compact:text-[0.6875rem]">{item.label}</dt>
                <dd className="sim-num mt-1.5 whitespace-nowrap text-[1.75rem] leading-none compact:mt-1 compact:text-[1.1875rem]">
                  <span className={item.bad ? "text-fail" : item.warn ? "text-trace" : undefined}>{item.value}</span>
                  {item.unit && <span className="ml-0.5 text-[0.8125rem] font-medium tracking-normal text-screen-graphite compact:text-[0.6875rem]">{item.unit}</span>}
                </dd>
              </div>
            ))}
          </dl>
        </div>

        {/* The deck: traffic on its fader, then servers and the cache, and the one key that breaks it. */}
        <div className="px-2.5 pb-1.5 pt-3.5 compact:px-1.5 compact:pb-0.5 compact:pt-2">
          <div className="flex items-center gap-4 compact:gap-3">
            <span className="w-[7.25rem] shrink-0 whitespace-nowrap text-[0.9375rem] text-ink compact:w-[4.75rem] compact:text-[0.8125rem]">
              <span className="font-[600] tabular-nums">{config.rate}</span>{" "}
              <span className="text-graphite">
                <span className="compact:hidden">requests/s</span>
                <span className="hidden compact:inline">req/s</span>
              </span>
            </span>
            <Fader value={config.rate} onChange={(rate) => update({ rate })} />
          </div>

          <div className="mt-3 flex items-center gap-2 compact:mt-1.5 compact:gap-1">
            <div className="flex items-center" role="group" aria-label="App servers">
              <button
                type="button"
                aria-label="Remove a server"
                disabled={config.servers <= 1}
                onClick={() => update({ servers: config.servers - 1 })}
                className="key key-icon size-10 min-h-10 text-lg"
              >
                −
              </button>
              <span className="min-w-[4.75rem] text-center text-[0.875rem] compact:min-w-[3rem] compact:text-[0.8125rem]" aria-live="polite">
                <span className="font-[600] tabular-nums text-ink">{config.servers}</span>{" "}
                <span className="text-graphite">
                  <span className="compact:hidden">{config.servers === 1 ? "server" : "servers"}</span>
                  <span className="hidden compact:inline">{config.servers === 1 ? "app" : "apps"}</span>
                </span>
              </span>
              <button
                type="button"
                aria-label="Add a server"
                disabled={config.servers >= MAX_SERVERS}
                onClick={() => update({ servers: config.servers + 1 })}
                className="key key-icon size-10 min-h-10 text-lg"
              >
                +
              </button>
            </div>

            {/* A latching switch: it lights up (fills) while the cache is on, with a dot as its lamp. */}
            <button
              type="button"
              role="switch"
              aria-checked={config.cache}
              aria-label="Cache"
              data-latched={config.cache}
              onClick={() => update({ cache: !config.cache })}
              className="key key-latch h-10 min-h-10 gap-2 px-3.5 text-[0.875rem] font-medium compact:h-[2.625rem] compact:min-h-[2.625rem] compact:gap-1.5 compact:px-3 compact:text-[0.8125rem]"
            >
              <span
                className="size-1.5 shrink-0 rounded-full transition-colors"
                style={{ background: config.cache ? "var(--paper)" : "var(--rule-strong)" }}
                aria-hidden="true"
              />
              cache
              <span className="text-graphite compact:hidden" aria-hidden="true">
                {config.cache ? "on" : "off"}
              </span>
            </button>

            {/* The invitation: the one cobalt key on the deck. */}
            <button
              type="button"
              onClick={toggleKill}
              aria-label={down ? `Restart app ${downIndex + 1}` : "Kill a server"}
              data-latched={down}
              data-kill
              className="key key-signal ml-auto h-11 min-h-11 shrink-0 gap-2 px-5 text-[0.9375rem] compact:h-[2.625rem] compact:min-h-[2.625rem] compact:gap-1.5 compact:px-3.5 compact:text-[0.875rem]"
            >
              {down ? <RestartGlyph /> : <PowerGlyph />}
              <span className="compact:hidden">{down ? `Restart app ${downIndex + 1}` : "Kill a server"}</span>
              <span className="hidden compact:inline">{down ? "Restart" : "Kill"}</span>
            </button>
          </div>
        </div>
      </figure>
      <p className="mt-3 px-1 text-[0.9375rem] leading-snug text-graphite compact:text-[0.875rem]">
        Every request is simulated in your browser by a seeded event engine, the idea behind Systemlab.
      </p>
    </div>
  );
}

/** Kill: a power symbol, in the key's ink. */
function PowerGlyph() {
  return (
    <svg viewBox="0 0 24 24" className="size-[17px] shrink-0" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" aria-hidden="true">
      <path d="M12 3v8" />
      <path d="M6.4 6.6a8 8 0 1 0 11.2 0" />
    </svg>
  );
}

/** Restart: a circular arrow. */
function RestartGlyph() {
  return (
    <svg viewBox="0 0 24 24" className="size-[17px] shrink-0" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M20 12a8 8 0 1 1-2.6-5.9" />
      <path d="M20 4v4.5h-4.5" />
    </svg>
  );
}

/** A long fader: a groove, a light fill, and a cobalt cap that springs when you grab it. */
function Fader({ value, onChange }: { value: number; onChange: (value: number) => void }) {
  return (
    <SliderPrimitive.Root
      className="relative flex h-10 min-w-0 flex-1 touch-none select-none items-center"
      min={0}
      max={MAX_RATE}
      step={10}
      value={[value]}
      onValueChange={([next]) => onChange(next)}
    >
      <SliderPrimitive.Track className="relative h-1 grow overflow-hidden rounded-full bg-rule-strong">
        <SliderPrimitive.Range className="absolute h-full rounded-full bg-ink" />
      </SliderPrimitive.Track>
      <SliderPrimitive.Thumb aria-label="Traffic, in requests per second" className="fader-cap focus-visible:outline-offset-4" />
    </SliderPrimitive.Root>
  );
}

function Edge({ from, to, dashed = false }: { from: Point; to: Point; dashed?: boolean }) {
  return <line x1={from.x} y1={from.y} x2={to.x} y2={to.y} strokeDasharray={dashed ? "3 4" : undefined} />;
}

/** A box in the diagram: its name, one value, and its load as a level rising inside it. */
function Node({
  at,
  size,
  compact,
  title,
  value,
  load,
  color = "var(--screen-ink)",
  state = "normal",
}: {
  at: Point;
  size: Size;
  compact: boolean;
  title: string;
  value?: string;
  load?: number;
  color?: string;
  state?: "normal" | "off" | "down";
}) {
  const clip = `node-${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;
  const x = at.x - size.w / 2;
  const y = at.y - size.h / 2;
  const small = compact || size.w < 92;
  const pad = small ? 8 : 12;
  const muted = state === "off";
  const titleSize = small ? 12.5 : 15;
  const valueSize = small ? 11.5 : 13;
  const stacked = value !== undefined && size.h >= 34;
  // A short box (four servers on a phone) keeps its name and drops the number; the level still shows the load.
  const valueBeside = value !== undefined && !stacked && size.w >= 84;
  const titleY = stacked ? at.y - (small ? 2 : 4) : at.y + titleSize * 0.36;
  const valueY = at.y + (small ? 12 : 16);
  const level = Math.max(0, Math.min(1, load ?? 0));
  const alpha = color === "var(--screen-ink)" ? 0.11 : 0.3;
  return (
    <g>
      <clipPath id={clip}>
        <rect x={x} y={y} width={size.w} height={size.h} rx={10} />
      </clipPath>
      {/* Opaque, so requests pass under the box instead of over its label. */}
      <rect x={x} y={y} width={size.w} height={size.h} rx={10} fill="var(--screen)" />
      {!muted && <rect x={x} y={y} width={size.w} height={size.h} rx={10} fill="var(--screen-fill)" />}
      {load !== undefined && (
        <g clipPath={`url(#${clip})`}>
          <g className="sim-level" style={{ transform: `translateY(${((1 - level) * size.h).toFixed(1)}px)` }}>
            <rect x={x} y={y} width={size.w} height={size.h} fill={color} fillOpacity={alpha} />
          </g>
        </g>
      )}
      <rect
        x={x + 0.5}
        y={y + 0.5}
        width={size.w - 1}
        height={size.h - 1}
        rx={9.5}
        fill="none"
        stroke={state === "down" ? "var(--fail)" : "var(--screen-outline)"}
        strokeDasharray={state === "normal" ? undefined : "4 3"}
      />
      <text
        x={value === undefined ? at.x : x + pad}
        y={titleY}
        textAnchor={value === undefined ? "middle" : "start"}
        fontSize={titleSize}
        fontWeight={550}
        letterSpacing="-0.01em"
        fill={muted ? "var(--screen-graphite)" : "var(--screen-ink)"}
      >
        {title}
      </text>
      {(stacked || valueBeside) && (
        <text
          x={stacked ? x + pad : x + size.w - pad}
          y={stacked ? valueY : titleY}
          textAnchor={stacked ? "start" : "end"}
          fontSize={valueSize}
          fontWeight={500}
          style={{ fontVariantNumeric: "tabular-nums" }}
          fill={state === "down" ? "var(--fail)" : "var(--screen-graphite)"}
        >
          {value}
        </text>
      )}
    </g>
  );
}
