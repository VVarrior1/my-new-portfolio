"use client";

import { useEffect, useRef } from "react";
import { Fluid, type FluidColors, type FluidConfig } from "@/lib/fluid";
import { flowState, onFlow, type FlowEvent } from "@/lib/flow-bus";

// The liquid under the page. One fixed canvas sits behind everything; the hero and the contact
// section are transparent "windows" onto it, and every other section is an opaque sheet sliding
// over it. What moves it:
// - the hero simulator: incoming traffic is a current flowing into the device, strain makes it
//   turbulent and tints it with the accent, and a killed server blooms the accent at the node;
// - the pointer (and touch), which stirs it;
// - scrolling, which drags a wake off the edge of the sheet that slides over it;
// - the theme toggle, which drops ink into it.
// It starts after the page has loaded and gone idle, runs only while a window is on screen and the
// tab is visible, and caps the pixel ratio. Under reduced motion it renders one still frame and
// never animates; without WebGL the windows simply show the paper.

const DESKTOP: FluidConfig = {
  simResolution: 128,
  dyeResolution: 1024,
  densityDissipation: 0.6,
  velocityDissipation: 0.35,
  pressure: 0.8,
  pressureIterations: 20,
  curl: 6,
};
const MOBILE: FluidConfig = { ...DESKTOP, simResolution: 96, dyeResolution: 512, pressureIterations: 16 };

function hex(value: string, fallback: [number, number, number]): [number, number, number] {
  const m = value.trim().match(/^#([0-9a-f]{6})$/i);
  if (!m) return fallback;
  const n = parseInt(m[1], 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}

function readColors(): FluidColors {
  const s = getComputedStyle(document.documentElement);
  const v = (name: string) => s.getPropertyValue(name);
  return {
    bg: hex(v("--pool"), [0.04, 0.04, 0.05]),
    neutral: hex(v("--fluid-neutral"), [0.8, 0.8, 0.82]),
    accent: hex(v("--fluid-accent"), [0.3, 0.4, 1]),
    neutralMax: parseFloat(v("--fluid-neutral-max")) || 0.6,
    accentMax: parseFloat(v("--fluid-accent-max")) || 0.9,
    shading: parseFloat(v("--fluid-shading")) || 0,
  };
}

/** A deterministic pseudo-random sequence, so the still frame is the same on every visit. */
function seeded(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

export function LiquidField() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const coarse = window.matchMedia("(pointer: coarse)").matches || window.innerWidth < 640;
    let fluid: Fluid | null = null;
    let frame = 0;
    let disposed = false;
    const cleanups: Array<() => void> = [];

    // Anything the liquid shows through: the hero, the contact section, and the rails and channels
    // around the sheets (the page body itself, on the home page).
    const windows = () => Array.from(document.querySelectorAll<HTMLElement>("[data-liquid-window]"));
    const visibleWindows = new Set<Element>();

    const dpr = () => Math.min(window.devicePixelRatio || 1, coarse ? 1.25 : 1.5);

    /** Viewport px to the fluid's UV (y up). */
    const uv = (x: number, y: number) => [x / window.innerWidth, 1 - y / window.innerHeight] as const;

    const updateProtect = (f: Fluid) => {
      const vh = window.innerHeight;
      const el = Array.from(document.querySelectorAll<HTMLElement>("[data-liquid-protect]")).find((node) => {
        const r = node.getBoundingClientRect();
        return r.bottom > 0 && r.top < vh;
      });
      if (!el) {
        f.protectStrength = 0;
        return;
      }
      const r = el.getBoundingClientRect();
      const [x0, y1] = uv(r.left, r.top);
      const [x1, y0] = uv(r.right, r.bottom);
      f.protect = [x0, y0, x1, y1];
      f.protectStrength = parseFloat(el.dataset.liquidProtect || "") || 0.75;
    };

    // Things that happened since the last frame, applied at the start of the next one.
    const queue: FlowEvent[] = [];
    let failBudget = 0;
    let curlBoost = 0;

    const applyEvent = (f: Fluid, e: FlowEvent, rand: () => number) => {
      const [x, y] = uv(e.x, e.y);
      if (e.kind === "kill") {
        curlBoost = 1;
        for (let i = 0; i < 9; i++) {
          const a = (i / 9) * Math.PI * 2 + rand() * 0.5;
          const speed = 500 + rand() * 500;
          f.splat(x, y, Math.cos(a) * speed, Math.sin(a) * speed, 0.1, 0.55, 0.12 + rand() * 0.12);
        }
        f.splat(x, y, 0, 0, 0, 1.4, 0.5);
        // The device hides the node, so the bloom also bursts out of its edges, above and below
        // the dead server and off its right side.
        if (e.device) {
          const d = e.device;
          const out: Array<[number, number, number, number]> = [
            [e.x, d.top - 6, 0, 1],
            [e.x, d.bottom + 6, 0, -1],
            [d.right + 6, e.y, 1, 0],
            [d.left - 6, e.y, -1, 0],
          ];
          for (const [px, py, vx, vy] of out) {
            const [ux, uy] = uv(px, py);
            f.splat(ux, uy, vx * 900 + (rand() - 0.5) * 300, vy * 1000 + (rand() - 0.5) * 300, 0.05, 1.4, 0.5);
          }
        }
      } else if (e.kind === "restart") {
        for (let i = 0; i < 8; i++) {
          const a = (i / 8) * Math.PI * 2;
          f.splat(x, y, Math.cos(a) * 320, Math.sin(a) * 320, 0.25, 0, 0.1);
        }
      } else if (e.kind === "fail") {
        if (failBudget < 1) return;
        failBudget -= 1;
        const a = rand() * Math.PI * 2;
        f.splat(x, y, Math.cos(a) * 300, Math.sin(a) * 300, 0, 0.3, 0.18);
      } else {
        for (let i = 0; i < 7; i++) {
          const a = (i / 7) * Math.PI * 2 + rand();
          const speed = 300 + rand() * 600 * e.size;
          f.splat(x, y, Math.cos(a) * speed, Math.sin(a) * speed, 0.5 * e.size, 0.35 * e.size, 0.2 + 0.3 * e.size);
        }
      }
    };

    // The incoming current: a few jets from the left edge, aimed at the simulator's inlet.
    let phase = 0;
    const inflow = (f: Fluid, dt: number, rand: () => number) => {
      const { rate, strain, inlet } = flowState();
      const q = Math.min(1, rate / 900);
      const vh = window.innerHeight;
      const vw = window.innerWidth;
      const targetY = inlet && inlet.y > 40 && inlet.y < vh - 40 ? inlet.y : vh * (coarse ? 0.7 : 0.58);
      const targetX = inlet && inlet.y > 40 && inlet.y < vh - 40 ? inlet.x : vw * 0.62;
      phase += dt * (0.6 + q * 1.6 + strain * 2.5);
      const jets = coarse ? 2 : 3;
      for (let j = 0; j < jets; j++) {
        const spread = (j - (jets - 1) / 2) * (coarse ? 0.09 : 0.075);
        const wobble = Math.sin(phase * (1 + j * 0.37) + j * 2.1) * (0.03 + strain * 0.06);
        const [x, y] = uv(0, targetY);
        const yy = y + spread + wobble;
        // Aim slightly toward the inlet's height, so the jets converge on the device.
        const [tx, ty] = uv(targetX, targetY);
        const angle = Math.atan2(ty - yy, Math.max(0.2, tx - x)) * 0.6 + (rand() - 0.5) * strain * 0.6;
        const speed = (260 + q * 640) * (0.85 + rand() * 0.3);
        const ink = (0.045 + q * 0.045) * (dt * 60);
        f.splat(x + 0.015, yy, Math.cos(angle) * speed, Math.sin(angle) * speed, ink * (1 - strain * 0.25), ink * strain * 0.4, 0.2 + q * 0.12);
      }
      // A strained system boils near the device: accent rising through the current.
      if (strain > 0.25 && rand() < strain * dt * 6) {
        const [x, y] = uv(targetX + (rand() - 0.2) * 260, targetY + (rand() - 0.5) * 240);
        const a = rand() * Math.PI * 2;
        f.splat(x, y, Math.cos(a) * 420 * strain, Math.sin(a) * 420 * strain, 0.02, 0.18 * strain, 0.22);
      }
    };

    // Pointer stirring.
    const pointer = { x: 0, y: 0, dx: 0, dy: 0, moved: false, has: false };
    const onMove = (x: number, y: number) => {
      if (pointer.has) {
        pointer.dx += x - pointer.x;
        pointer.dy += y - pointer.y;
        pointer.moved = true;
      }
      pointer.x = x;
      pointer.y = y;
      pointer.has = true;
    };
    const onPointer = (e: PointerEvent) => e.pointerType !== "touch" && onMove(e.clientX, e.clientY);
    const onTouch = (e: TouchEvent) => {
      const t = e.touches[0];
      if (t) onMove(t.clientX, t.clientY);
    };
    const onTouchStart = (e: TouchEvent) => {
      const t = e.touches[0];
      if (t) {
        pointer.x = t.clientX;
        pointer.y = t.clientY;
        pointer.has = true;
      }
    };

    let lastScroll = window.scrollY;
    const wake = (f: Fluid) => {
      const delta = window.scrollY - lastScroll;
      lastScroll = window.scrollY;
      if (Math.abs(delta) < 0.5) return;
      const vh = window.innerHeight;
      const push = Math.max(-40, Math.min(40, delta)) * 14;
      // The edges of the sheets that slide over the liquid drag a wake behind them.
      for (const el of document.querySelectorAll<HTMLElement>("[data-liquid-edge]")) {
        const r = el.getBoundingClientRect();
        for (const edge of [r.top, r.bottom]) {
          if (edge <= 8 || edge >= vh - 8) continue;
          for (let i = 0; i < 5; i++) {
            const [x, y] = uv(((i + 0.5) / 5) * window.innerWidth, edge);
            f.splat(x, y, (Math.random() - 0.5) * 160, push, Math.min(0.14, Math.abs(delta) * 0.003), 0, 0.35);
          }
        }
      }
    };

    const prewarm = (f: Fluid, rand: () => number, steps: number) => {
      const vh = window.innerHeight;
      const vw = window.innerWidth;
      // A still that reads as a current already flowing: a few strands and two eddies.
      for (let i = 0; i < 4; i++) {
        const [x, y] = uv(vw * (0.1 + i * 0.22), vh * (0.45 + (rand() - 0.5) * 0.4));
        f.splat(x, y, 400 + rand() * 400, (rand() - 0.5) * 600, 0.5 + rand() * 0.3, 0, 0.12 + rand() * 0.12);
      }
      for (let i = 0; i < steps; i++) {
        inflow(f, 1 / 60, rand);
        f.step(1 / 60);
      }
    };

    const start = () => {
      if (disposed) return;
      try {
        fluid = Fluid.create(canvas, coarse ? MOBILE : DESKTOP, readColors());
      } catch {
        fluid = null;
      }
      if (!fluid) return;
      const f = fluid;
      const base = { ...f.config };
      f.resize(dpr());
      const rand = seeded(11);
      updateProtect(f);

      const recolor = () => {
        f.colors = readColors();
        if (motion.matches) {
          updateProtect(f);
          f.render();
        }
      };
      const themeObserver = new MutationObserver(recolor);
      themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
      const scheme = window.matchMedia("(prefers-color-scheme: dark)");
      scheme.addEventListener("change", recolor);
      cleanups.push(() => {
        themeObserver.disconnect();
        scheme.removeEventListener("change", recolor);
      });

      const io = new IntersectionObserver((entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) visibleWindows.add(entry.target);
          else visibleWindows.delete(entry.target);
        }
      });
      windows().forEach((el) => io.observe(el));
      cleanups.push(() => io.disconnect());

      const onResize = () => {
        if (f.resize(dpr()) && motion.matches) {
          updateProtect(f);
          f.render();
        }
      };
      window.addEventListener("resize", onResize);
      cleanups.push(() => window.removeEventListener("resize", onResize));

      if (motion.matches) {
        // Reduced motion: one still frame, no loop.
        prewarm(f, rand, 90);
        f.render();
        canvas.dataset.ready = "still";
        return;
      }

      prewarm(f, rand, 40);
      f.render();
      canvas.dataset.ready = "live";

      const unsubscribe = onFlow((e) => queue.push(e));
      window.addEventListener("pointermove", onPointer, { passive: true });
      window.addEventListener("touchstart", onTouchStart, { passive: true });
      window.addEventListener("touchmove", onTouch, { passive: true });
      cleanups.push(() => {
        unsubscribe();
        window.removeEventListener("pointermove", onPointer);
        window.removeEventListener("touchstart", onTouchStart);
        window.removeEventListener("touchmove", onTouch);
      });

      let last = performance.now();
      let tick = 0;
      const stats = { frames: 0, ms: 0 };
      (window as unknown as { __liquid?: typeof stats }).__liquid = stats;

      const loop = (now: number) => {
        frame = requestAnimationFrame(loop);
        const dt = Math.min(1 / 20, (now - last) / 1000);
        if (document.hidden || visibleWindows.size === 0) {
          queue.length = 0;
          pointer.moved = false;
          lastScroll = window.scrollY;
          return;
        }
        // With only the thin rails between sheets in view, the liquid runs at half rate.
        const open = Array.from(visibleWindows).some((el) => el.tagName !== "MAIN");
        tick++;
        if (!open && tick % 2 === 1) {
          lastScroll = window.scrollY;
          return;
        }
        last = now;
        const t0 = performance.now();
        updateProtect(f);
        const { strain } = flowState();
        curlBoost = Math.max(0, curlBoost - dt * 0.6);
        f.config.curl = 5 + strain * 32 + curlBoost * 30;
        // More traffic pours in more dye, so it also clears faster: the field stays a current with
        // clean water around it instead of silting up.
        const q = Math.min(1, flowState().rate / 900);
        f.config.densityDissipation = base.densityDissipation * (1 + q * 0.5 + strain * 0.2);
        failBudget = Math.min(failBudget + dt * 10, 3);

        while (queue.length) applyEvent(f, queue.shift()!, rand);
        inflow(f, dt, rand);
        wake(f);
        if (pointer.moved) {
          const [x, y] = uv(pointer.x, pointer.y);
          const speed = Math.hypot(pointer.dx, pointer.dy);
          const force = coarse ? 9 : 7;
          f.splat(x, y, pointer.dx * force, -pointer.dy * force, Math.min(0.28, speed * 0.004), 0, coarse ? 0.4 : 0.3);
        }
        pointer.dx = pointer.dy = 0;
        pointer.moved = false;

        f.step(dt);
        f.render();
        stats.frames++;
        stats.ms += performance.now() - t0;
      };
      frame = requestAnimationFrame(loop);
    };

    const idle = () => {
      if (typeof window.requestIdleCallback === "function") window.requestIdleCallback(start, { timeout: 1200 });
      else setTimeout(start, 200);
    };
    if (document.readyState === "complete") idle();
    else window.addEventListener("load", idle, { once: true });

    return () => {
      disposed = true;
      cancelAnimationFrame(frame);
      window.removeEventListener("load", idle);
      cleanups.forEach((fn) => fn());
      fluid?.dispose();
    };
  }, []);

  return <canvas ref={ref} aria-hidden="true" className="liquid-field" />;
}
