"use client";

import { useEffect, useRef } from "react";
import type { Fluid, FluidColors, FluidConfig, Palette } from "@/lib/fluid";
import { flowState, onFlow, type FlowEvent } from "@/lib/flow-bus";
import { onFrame, type Frame } from "@/lib/ticker";

// The liquid world. One fixed canvas sits under the whole home page and everything floats on it:
// there are no opaque sheets. What it does:
// - The pool scrolls with the page at a parallax (the dye is carried up as you scroll down), and
//   scroll speed stirs it, so it reads as a world under the page rather than a screen effect.
// - Text never sits on busy liquid: every [data-calm] block is a calm rectangle where the dye is held
//   back and the current is slowed, so the liquid parts around text like water round stones.
// - A [data-chapter="invert"] section is a band of the opposite theme drawn by the shader, edged by
//   a wobbling waterline the current pushes around; scrolling into it is a liquid hand-off.
// - [data-gl] images (the product screenshots, the portrait) are drawn as planes in the same
//   context, so the current refracts them, the pointer ripples them and scroll speed bows them.
// - The hero simulator drives a current into the device (lib/flow-bus.ts), flying HUD letters and
//   the spine's packet stir it, a killed server blooms the accent, and an idle drip keeps it alive.
// It starts after the page has loaded and gone idle, pauses with the tab, caps the pixel ratio,
// and under reduced motion renders one still frame. Without WebGL the page is plain paper.

const DESKTOP: FluidConfig = {
  simResolution: 128,
  dyeResolution: 1024,
  densityDissipation: 0.36,
  velocityDissipation: 0.4,
  pressure: 0.8,
  pressureIterations: 18,
  curl: 6,
};
const MOBILE: FluidConfig = { ...DESKTOP, simResolution: 96, dyeResolution: 640, pressureIterations: 12 };

/** How far the pool travels per pixel the page scrolls: under 1, so it sits below the page. */
const PARALLAX = 0.62;

function hex(value: string, fallback: [number, number, number]): [number, number, number] {
  const m = value.trim().match(/^#([0-9a-f]{6})$/i);
  if (!m) return fallback;
  const n = parseInt(m[1], 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}

function readColors(): FluidColors {
  const s = getComputedStyle(document.documentElement);
  const v = (name: string) => s.getPropertyValue(name);
  const num = (name: string, fallback: number) => {
    const n = parseFloat(v(name));
    return Number.isFinite(n) ? n : fallback;
  };
  const invert: Palette = {
    bg: hex(v("--pool-x"), [0.03, 0.03, 0.04]),
    neutral: hex(v("--fluid-neutral-x"), [0.8, 0.8, 0.82]),
    accent: hex(v("--fluid-accent-x"), [0.33, 0.44, 1]),
    shading: num("--fluid-shading-x", 0),
  };
  return {
    bg: hex(v("--pool"), [0.9, 0.9, 0.91]),
    neutral: hex(v("--fluid-neutral"), [0.08, 0.09, 0.12]),
    accent: hex(v("--fluid-accent"), [0.16, 0.27, 1]),
    shading: num("--fluid-shading", 0),
    invert,
    neutralMax: num("--fluid-neutral-max", 0.5),
    accentMax: num("--fluid-accent-max", 0.9),
    fill: num("--fluid-fill", 0.5),
    lines: num("--fluid-lines", 0.8),
    steps: num("--fluid-steps", 7),
    ink: hex(v("--ink"), [0.05, 0.06, 0.07]),
    paper: hex(v("--paper"), [0.96, 0.96, 0.96]),
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

type Plane = {
  host: HTMLElement;
  img: HTMLImageElement | null;
  texture: WebGLTexture | null;
  src: string;
  reveal: number;
  revealing: boolean;
  hover: number;
  mode: number;
};

type Tuning = { parallax: number; scrollStir: number; drip: number; refract: number };

declare global {
  interface Window {
    __liquid?: { frames: number; ms: number; planes: number };
    __liquidTune?: Tuning;
    __liquidRecolor?: () => void;
  }
}

export function LiquidField() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const coarse = window.matchMedia("(pointer: coarse)").matches || window.innerWidth < 640;
    const planesOn = window.matchMedia("(pointer: fine) and (min-width: 1024px)").matches;
    let fluid: Fluid | null = null;
    let disposed = false;
    const cleanups: Array<() => void> = [];
    const tune: Tuning = { parallax: PARALLAX, scrollStir: 1, drip: 1, refract: 1 };
    window.__liquidTune = tune;

    const dpr = () => Math.min(window.devicePixelRatio || 1, coarse ? 1.25 : 1.5);
    /** Viewport px to the fluid's UV (y up). */
    const uv = (x: number, y: number) => [x / window.innerWidth, 1 - y / window.innerHeight] as const;

    // Calm rectangles: the blocks of text on screen. Strength is the attribute's value.
    const calmNodes = () => Array.from(document.querySelectorAll<HTMLElement>("[data-calm]"));
    let calmList = calmNodes();
    const chapterList = () => Array.from(document.querySelectorAll<HTMLElement>('[data-chapter="invert"]'));
    let chapters = chapterList();
    const refreshNodes = () => {
      calmList = calmNodes();
      chapters = chapterList();
    };

    const gather = (f: Fluid, vh: number, vw: number) => {
      const calm: Fluid["calm"] = [];
      for (const el of calmList) {
        const r = el.getBoundingClientRect();
        if (r.bottom < -40 || r.top > vh + 40 || r.width === 0) continue;
        calm.push({ left: r.left, top: r.top, right: r.right, bottom: r.bottom, strength: parseFloat(el.dataset.calm || "") || 0.9 });
        if (calm.length >= 8) break; // MAX_CALM in lib/fluid.ts
      }
      f.calm = calm;
      const bands: Fluid["bands"] = [];
      for (const el of chapters) {
        const r = el.getBoundingClientRect();
        if (r.bottom < -60 || r.top > vh + 60) continue;
        bands.push({ top: r.top, bottom: r.bottom });
      }
      f.bands = bands;
      return vw;
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
          f.splat(x, y, Math.cos(a) * speed, Math.sin(a) * speed, 0.12, 0.28, 0.1 + rand() * 0.1);
        }
        f.splat(x, y, 0, 0, 0.2, 0.6, 0.35);
        // The device hides the node, so the bloom also bursts out of its edges.
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
            f.splat(ux, uy, vx * 900 + (rand() - 0.5) * 300, vy * 1000 + (rand() - 0.5) * 300, 0.15, 0.45, 0.3);
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
      } else if (e.kind === "stir") {
        f.splat(x, y, e.dx, -e.dy, e.ink, e.accent, e.radius);
      } else {
        for (let i = 0; i < 7; i++) {
          const a = (i / 7) * Math.PI * 2 + rand();
          const speed = 300 + rand() * 600 * e.size;
          f.splat(x, y, Math.cos(a) * speed, Math.sin(a) * speed, 0.5 * e.size, 0.35 * e.size, 0.2 + 0.3 * e.size);
        }
      }
    };

    // The incoming current: jets from the left edge, aimed at the simulator's inlet while it is on
    // screen. Off screen the simulator pauses and the jets stop.
    let phase = 0;
    const inflow = (f: Fluid, dt: number, rand: () => number) => {
      const { rate, strain, inlet } = flowState();
      const vh = window.innerHeight;
      const vw = window.innerWidth;
      const onScreen = inlet && inlet.y > 40 && inlet.y < vh - 40;
      if (!onScreen && inlet) return;
      const q = Math.min(1, rate / 900);
      const targetY = onScreen ? inlet!.y : vh * (coarse ? 0.7 : 0.58);
      const targetX = onScreen ? inlet!.x : vw * 0.62;
      phase += dt * (0.6 + q * 1.6 + strain * 2.5);
      const jets = coarse ? 2 : 3;
      for (let j = 0; j < jets; j++) {
        const spread = (j - (jets - 1) / 2) * (coarse ? 0.09 : 0.075);
        const wobble = Math.sin(phase * (1 + j * 0.37) + j * 2.1) * (0.03 + strain * 0.06);
        const [x, y] = uv(0, targetY);
        const yy = y + spread + wobble;
        const [tx, ty] = uv(targetX, targetY);
        const angle = Math.atan2(ty - yy, Math.max(0.2, tx - x)) * 0.6 + (rand() - 0.5) * strain * 0.6;
        const speed = (260 + q * 600) * (0.85 + rand() * 0.3);
        // More traffic pours in more ink but in thinner jets, so it reads as more lines, not a wash.
        const ink = (0.05 + q * 0.03) * (dt * 60);
        f.splat(x + 0.015, yy, Math.cos(angle) * speed, Math.sin(angle) * speed, ink * (1 - strain * 0.2), ink * strain * 0.3, 0.16 + q * 0.06);
      }
      if (strain > 0.25 && rand() < strain * dt * 6) {
        const [x, y] = uv(targetX + (rand() - 0.2) * 260, targetY + (rand() - 0.5) * 240);
        const a = rand() * Math.PI * 2;
        f.splat(x, y, Math.cos(a) * 420 * strain, Math.sin(a) * 420 * strain, 0.04 * strain, 0.08 * strain, 0.16);
      }
    };

    // Pointer stirring.
    const pointer = { x: -1, y: -1, dx: 0, dy: 0, moved: false, has: false, idle: 0 };
    const onMove = (x: number, y: number) => {
      if (pointer.has) {
        pointer.dx += x - pointer.x;
        pointer.dy += y - pointer.y;
        pointer.moved = true;
      }
      pointer.x = x;
      pointer.y = y;
      pointer.has = true;
      pointer.idle = 0;
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

    // The waterlines drag a wake as they move.
    const wake = (f: Fluid, delta: number, vh: number, vw: number) => {
      if (Math.abs(delta) < 0.5) return;
      const push = Math.max(-40, Math.min(40, delta)) * 16;
      for (const band of f.bands) {
        for (const edge of [band.top, band.bottom]) {
          if (edge <= 8 || edge >= vh - 8) continue;
          for (let i = 0; i < 6; i++) {
            const [x, y] = uv(((i + 0.5) / 6) * vw, edge);
            f.splat(x, y, (Math.random() - 0.5) * 220, push, Math.min(0.1, Math.abs(delta) * 0.002), 0, 0.3);
          }
        }
      }
      // Fast scrolling stirs the whole pool a little: two slow eddies in the gutters.
      const speed = Math.min(1, Math.abs(delta) / 60) * tune.scrollStir;
      if (speed > 0.15) {
        for (const side of [0.04, 0.96]) {
          const [x, y] = uv(side * vw, vh * (0.3 + Math.random() * 0.4));
          f.splat(x, y, (side < 0.5 ? 1 : -1) * 260 * speed, push * 0.6, 0.04 * speed, 0, 0.25);
        }
      }
    };

    // Drips: when nothing else moves, a drop lands in an empty part of the screen now and then and
    // spreads into rings (the contour lines of the drop), like ink on water.
    let dripClock = 0.6;
    const drip = (f: Fluid, dt: number, rand: () => number, vw: number, vh: number) => {
      dripClock -= dt * tune.drip;
      if (dripClock > 0) return;
      dripClock = 0.7 + rand() * 1.1;
      for (let attempt = 0; attempt < 6; attempt++) {
        const px = vw * (0.04 + rand() * 0.92);
        const py = vh * (0.12 + rand() * 0.8);
        const inside = f.calm.some((r) => px > r.left - 30 && px < r.right + 30 && py > r.top - 30 && py < r.bottom + 30);
        if (inside) continue;
        const [x, y] = uv(px, py);
        const accent = rand() < 0.28;
        f.splat(x, y, (rand() - 0.5) * 120, (rand() - 0.5) * 120, accent ? 0.12 : 0.5, accent ? 0.45 : 0, 0.06 + rand() * 0.09);
        break;
      }
    };

    // Below the hero the page has its own weather: two slow currents wander in from the side edges,
    // so there is always marbling moving in the gutters around the text.
    let weather = 0;
    const ambient = (f: Fluid, dt: number, rand: () => number, vw: number, vh: number) => {
      const { inlet } = flowState();
      const heroLive = inlet && inlet.y > 40 && inlet.y < vh - 40;
      if (heroLive) return;
      weather += dt;
      const sides: Array<[number, number, number]> = [
        [0, 0.5 + 0.34 * Math.sin(weather * 0.21), 1],
        [1, 0.5 + 0.34 * Math.sin(weather * 0.17 + 2.1), -1],
      ];
      for (const [side, yy, dir] of sides) {
        const [x, y] = uv(side * vw, yy * vh);
        const angle = Math.sin(weather * 0.5 + side * 3) * 0.5;
        const speed = 240 + 80 * Math.sin(weather * 0.9 + side);
        const ink = 0.03 * dt * 60 * tune.drip;
        const accent = rand() < 0.08 ? 0.12 : 0;
        f.splat(x + dir * 0.01, y, dir * Math.cos(angle) * speed, Math.sin(angle) * speed, ink, accent * dt * 60, 0.12);
      }
    };

    // An idle pointer still moves the water: a slow figure-eight near where it rests.
    let idleT = 0;
    const idleStir = (f: Fluid, dt: number, vw: number, vh: number) => {
      pointer.idle += dt;
      if (pointer.idle < 2.4 || coarse) return;
      idleT += dt * 0.55;
      const cx = vw * 0.5 + Math.sin(idleT) * vw * 0.36;
      const cy = vh * 0.55 + Math.sin(idleT * 2) * vh * 0.16;
      const vx = Math.cos(idleT) * vw * 0.36 * 0.55;
      const vy = Math.cos(idleT * 2) * 2 * vh * 0.16 * 0.55;
      const [x, y] = uv(cx, cy);
      f.splat(x, y, vx * 0.6, -vy * 0.6, 0.012, 0, 0.18);
    };

    // Image planes.
    const planes: Plane[] = [];
    const pickImage = (host: HTMLElement) =>
      Array.from(host.querySelectorAll<HTMLImageElement>("img")).find((img) => img.offsetParent !== null || getComputedStyle(img).display !== "none") ?? null;
    const loadPlane = (f: Fluid, plane: Plane) => {
      const img = pickImage(plane.host);
      if (!img) return;
      const src = img.currentSrc || img.src;
      if (plane.texture && plane.src === src) return;
      const ready = () => {
        if (disposed) return;
        try {
          const texture = f.createTexture(img);
          if (plane.texture) f.deleteTexture(plane.texture);
          plane.texture = texture;
          plane.img = img;
          plane.src = img.currentSrc || img.src;
          plane.host.dataset.glLive = "";
        } catch {
          // A texture that can't be read stays a plain image.
        }
      };
      if (img.complete && img.naturalWidth) img.decode().then(ready, ready);
      else img.addEventListener("load", () => img.decode().then(ready, ready), { once: true });
    };

    let lastY = window.scrollY;
    let bend = 0;

    const start = async () => {
      if (disposed) return;
      // The engine (and its shaders) is its own chunk, fetched once the page is idle.
      const { Fluid } = await import("@/lib/fluid");
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
      gather(f, window.innerHeight, window.innerWidth);

      let colors = readColors();
      const recolor = () => {
        colors = readColors();
        f.colors = colors;
        for (const plane of planes) loadPlane(f, plane);
        if (motion.matches) {
          gather(f, window.innerHeight, window.innerWidth);
          f.render();
        }
      };
      window.__liquidRecolor = recolor;
      const themeObserver = new MutationObserver(recolor);
      themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
      const scheme = window.matchMedia("(prefers-color-scheme: dark)");
      scheme.addEventListener("change", recolor);
      cleanups.push(() => {
        themeObserver.disconnect();
        scheme.removeEventListener("change", recolor);
      });

      const onResize = () => {
        refreshNodes();
        if (f.resize(dpr()) && motion.matches) {
          gather(f, window.innerHeight, window.innerWidth);
          f.render();
        }
      };
      window.addEventListener("resize", onResize);
      cleanups.push(() => window.removeEventListener("resize", onResize));

      const prewarm = (steps: number) => {
        const vh = window.innerHeight;
        const vw = window.innerWidth;
        for (let i = 0; i < 4; i++) {
          const [x, y] = uv(vw * (0.1 + i * 0.22), vh * (0.45 + (rand() - 0.5) * 0.4));
          f.splat(x, y, 400 + rand() * 400, (rand() - 0.5) * 600, 0.45 + rand() * 0.3, i === 2 ? 0.25 : 0, 0.1 + rand() * 0.1);
        }
        for (let i = 0; i < steps; i++) {
          inflow(f, 1 / 60, rand);
          f.obstruct();
          f.step(1 / 60);
        }
      };

      if (motion.matches) {
        prewarm(90);
        f.render();
        canvas.dataset.ready = "still";
        return;
      }

      prewarm(36);
      f.colors = { ...colors, fill: 0, lines: 0 };
      f.render();
      canvas.dataset.ready = "live";
      document.documentElement.dataset.liquid = "live";

      if (planesOn) {
        for (const host of document.querySelectorAll<HTMLElement>("[data-gl]")) {
          const plane: Plane = { host, img: null, texture: null, src: "", reveal: 0, revealing: false, hover: 0, mode: host.dataset.gl === "portrait" ? 1 : 0 };
          planes.push(plane);
          loadPlane(f, plane);
        }
      }

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

      const stats = { frames: 0, ms: 0, planes: 0 };
      window.__liquid = stats;
      let fade = 0;
      let tick = 0;
      lastY = window.scrollY;

      const frame = (fr: Frame) => {
        const t0 = performance.now();
        const { dt, vh, vw } = fr;
        tick++;
        if (tick % 30 === 0) refreshNodes();
        f.time += dt;
        fade = Math.min(1, fade + dt / 1.4);
        const e = 1 - Math.pow(1 - fade, 3);
        f.colors = fade < 1 ? { ...colors, fill: colors.fill * e, lines: colors.lines * e } : colors;

        gather(f, vh, vw);
        const delta = fr.y - lastY;
        lastY = fr.y;
        // The page carries the pool: shift the field by the scroll, at the parallax.
        f.shift = Math.max(-0.2, Math.min(0.2, (delta / vh) * tune.parallax));

        const { strain, rate } = flowState();
        curlBoost = Math.max(0, curlBoost - dt * 0.6);
        f.config.curl = 5 + strain * 30 + curlBoost * 30;
        const q = Math.min(1, rate / 900);
        f.config.densityDissipation = base.densityDissipation * (1 + q * 0.7 + strain * 0.3);
        failBudget = Math.min(failBudget + dt * 10, 3);

        while (queue.length) applyEvent(f, queue.shift()!, rand);
        inflow(f, dt, rand);
        wake(f, delta, vh, vw);
        drip(f, dt, rand, vw, vh);
        ambient(f, dt, rand, vw, vh);
        idleStir(f, dt, vw, vh);
        if (pointer.moved) {
          const [x, y] = uv(pointer.x, pointer.y);
          const speed = Math.hypot(pointer.dx, pointer.dy);
          const force = coarse ? 9 : 7;
          f.splat(x, y, pointer.dx * force, -pointer.dy * force, Math.min(0.22, speed * 0.0032), 0, coarse ? 0.4 : 0.26);
        }
        pointer.dx = pointer.dy = 0;
        pointer.moved = false;

        f.obstruct();
        f.step(dt);
        f.render();

        // Planes, on top of the liquid, at their elements' boxes this frame.
        bend += (Math.max(-1, Math.min(1, fr.velocity / 2600)) - bend) * (1 - Math.exp(-8 * dt));
        let drawn = 0;
        for (const plane of planes) {
          if (!plane.texture || !plane.img) continue;
          const r = plane.img.getBoundingClientRect();
          if (r.bottom < -80 || r.top > vh + 80 || r.width === 0) continue;
          if (!plane.revealing && r.top < vh * 0.98) plane.revealing = true;
          if (plane.revealing) plane.reveal = Math.min(1, plane.reveal + dt / 1.1);
          const inside = pointer.has && pointer.x >= r.left && pointer.x <= r.right && pointer.y >= r.top && pointer.y <= r.bottom;
          plane.hover += ((inside ? 1 : 0) - plane.hover) * (1 - Math.exp(-6 * dt));
          const radius = parseFloat(getComputedStyle(plane.img).borderTopLeftRadius) || 0;
          f.drawPlane({
            texture: plane.texture,
            rect: { left: r.left, top: r.top, width: r.width, height: r.height },
            radius,
            bend: plane.mode ? bend * 0.4 : bend,
            mouse: { x: pointer.x - r.left, y: pointer.y - r.top },
            hover: plane.hover,
            reveal: 1 - Math.pow(1 - plane.reveal, 2.2),
            mode: plane.mode,
            refract: tune.refract,
          });
          drawn++;
        }
        stats.planes = drawn;
        stats.frames++;
        stats.ms += performance.now() - t0;
      };
      cleanups.push(onFrame(frame, 20));
    };

    const idle = () => {
      if (typeof window.requestIdleCallback === "function") window.requestIdleCallback(() => void start(), { timeout: 900 });
      else setTimeout(() => void start(), 200);
    };
    if (document.readyState === "complete") idle();
    else window.addEventListener("load", idle, { once: true });

    return () => {
      disposed = true;
      window.removeEventListener("load", idle);
      cleanups.forEach((fn) => fn());
      for (const plane of planes) delete plane.host.dataset.glLive;
      delete document.documentElement.dataset.liquid;
      fluid?.dispose();
    };
  }, []);

  return <canvas ref={ref} aria-hidden="true" className="liquid-field" />;
}
