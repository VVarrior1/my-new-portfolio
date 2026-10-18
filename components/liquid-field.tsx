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
// - In the hero the current comes out of the simulator: on laptops a river of ink runs in a steady
//   bed (Fluid.bed) from under the device's lower-left corner, beneath the hero copy, up the left
//   lane and back along the top, so the name sits inside its loop, with a cobalt thread in it that
//   thickens with traffic (lib/flow-bus.ts). More traffic is a faster, denser river; a killed
//   server swells the thread, and the swell runs down the river and settles back.
//   An ambient curl-noise stir keeps the pool moving when nothing touches it, flying HUD letters
//   and the spine's packet stir it, and below the hero two slow currents and the odd drip keep the
//   gutters alive.
// It starts after the page has loaded and gone idle, pauses with the tab, caps the pixel ratio,
// and under reduced motion renders one still frame. Without WebGL the page is plain paper.

const DESKTOP: FluidConfig = {
  simResolution: 128,
  dyeResolution: 1024,
  densityDissipation: 0.36,
  velocityDissipation: 0.4,
  pressure: 0.8,
  pressureIterations: 18,
  curl: 1,
};
const MOBILE: FluidConfig = { ...DESKTOP, simResolution: 96, dyeResolution: 640, pressureIterations: 12 };

/** How far the pool travels per pixel the page scrolls: under 1, so it sits below the page. */
const PARALLAX = 0.62;
/** The ambient curl-noise stir, in sim texels/s² (see FORCE in lib/fluid.ts). */
const AMBIENT = 1.6;
/** The river's bed: its half width (a fraction of the screen's height) and its speed at rest, in
 * sim texels/s (see Fluid.bed). */
const BED_WIDTH = 0.075;
const BED_SPEED = 34;
/** How fast the ink fades while the bed runs, as a share of the page's rate: slow enough that the
 * river reaches round the name before it thins out. */
const RIVER_FADE = 0.5;
/** The share of the ambient stir the hero keeps while its river runs. */
const RIVER_AMBIENT = 0.5;

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
    calmLines: num("--fluid-calm-lines", 0.05),
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
  /** The image whose texture is being made. */
  pending?: HTMLImageElement;
  texture: WebGLTexture | null;
  src: string;
  reveal: number;
  revealing: boolean;
  hover: number;
  mode: number;
};

type Tuning = { parallax: number; scrollStir: number; drip: number; refract: number; ambient: number; current: number; ink: number };

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
    const tune: Tuning = { parallax: PARALLAX, scrollStir: 1, drip: 1, refract: 1, ambient: 1, current: 1, ink: 1 };
    window.__liquidTune = tune;

    const dpr = () => Math.min(window.devicePixelRatio || 1, coarse ? 1.25 : 1.5);
    /** Viewport px to the fluid's UV (y up). */
    const uv = (x: number, y: number) => [x / window.innerWidth, 1 - y / window.innerHeight] as const;

    // Calm rectangles: the blocks of text on screen. Strength is the attribute's value.
    const calmNodes = () => Array.from(document.querySelectorAll<HTMLElement>("[data-calm]"));
    let calmList = calmNodes();
    // Each block is calm over its content box, not its padding (a .wrap's side lanes, a section's
    // breathing room), so the liquid can come up to the text rather than stop a lane short of it.
    const insets = new WeakMap<HTMLElement, [number, number, number, number]>();
    const measureInsets = () => {
      for (const el of calmList) {
        const cs = getComputedStyle(el);
        insets.set(el, [parseFloat(cs.paddingLeft) || 0, parseFloat(cs.paddingTop) || 0, parseFloat(cs.paddingRight) || 0, parseFloat(cs.paddingBottom) || 0]);
      }
    };
    measureInsets();
    const chapterList = () => Array.from(document.querySelectorAll<HTMLElement>('[data-chapter="invert"]'));
    let chapters = chapterList();
    const refreshNodes = () => {
      calmList = calmNodes();
      chapters = chapterList();
      measureInsets();
    };

    const gather = (f: Fluid, vh: number, vw: number) => {
      const calm: Fluid["calm"] = [];
      // The header's band and, where the HUD runs, the ruler's lane on the right edge are always
      // calm water: the nav and the tick tape never sit on ink, and dye can't pile up by the rail.
      calm.push({ left: -60, top: -60, right: vw + 60, bottom: 52, strength: 0.8 });
      if (document.documentElement.dataset.hudActive !== undefined) calm.push({ left: vw - 112, top: -60, right: vw + 60, bottom: vh + 60, strength: 0.9 });
      for (const el of calmList) {
        const r = el.getBoundingClientRect();
        if (r.bottom < -40 || r.top > vh + 40 || r.width === 0) continue;
        const [pl, pt, pr, pb] = insets.get(el) ?? [0, 0, 0, 0];
        const strength = parseFloat(el.dataset.calm || "") || 0.9;
        calm.push({ left: r.left + pl, top: r.top + pt, right: r.right - pr, bottom: r.bottom - pb, strength, hold: el.id === "play" ? 0 : strength });
        if (calm.length >= 10) break; // MAX_CALM in lib/fluid.ts
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
    /** A killed server's bloom travelling down the river: `kick` jumps to 1 at the kill and decays,
     * and `pulse` follows it with a short attack, so the river swells smoothly rather than jolting
     * (a jolt at the mouth throws ripples down the whole current). */
    let kick = 0;
    let pulse = 0;
    /** Failing requests: they tint the river's thread rather than spatter the pool. */
    let failGlow = 0;
    /** Extra ink poured into the bed's river (a restarted server, the intro's drop), as a share of
     * its usual flow. It is added at once and drains away more slowly than the ink itself fades
     * (see `settle`), so the river thickens and thins along its length without a lump: a lump of
     * ink travelling down the current is a closed contour, an island. */
    let swell = 0;
    /** Whether the hero's river ran last frame (the device is on screen). */
    let riverLive = false;

    // The device (the simulator's figure) and the name's block, read fresh each frame.
    const deviceBox = () => document.querySelector<HTMLElement>("#play figure")?.getBoundingClientRect() ?? null;
    /** The device's box from layout alone, without its transforms: the river's bed is laid from
     * this, so the device's entrance (it rises into place over the first two seconds) doesn't drag
     * the river's mouth and kink the current. */
    const deviceLayout = () => {
      const el = document.querySelector<HTMLElement>("#play figure");
      if (!el) return null;
      let x = 0;
      let y = 0;
      for (let e: HTMLElement | null = el; e; e = e.offsetParent as HTMLElement | null) {
        x += e.offsetLeft;
        y += e.offsetTop;
      }
      return new DOMRect(x - window.scrollX, y - window.scrollY, el.offsetWidth, el.offsetHeight);
    };
    const nameBox = () => document.querySelector<HTMLElement>("[data-name]")?.closest<HTMLElement>("[data-calm]")?.getBoundingClientRect() ?? null;
    /** Where the river leaves the device, in viewport px. */
    const mouth = (dev: DOMRect) => ({ x: dev.left + 28, y: Math.min(dev.bottom - 18, window.innerHeight - 40) });

    const applyEvent = (f: Fluid, e: FlowEvent, rand: () => number) => {
      const [x, y] = uv(e.x, e.y);
      if (e.kind === "kill") {
        // One clean accent bloom: a soft drop of cobalt where the current leaves the device and a
        // swell in the river's thread, which the current carries off; it settles within a couple
        // of seconds. No radial burst: pushes that sharp ripple the whole river.
        // In the hero's bed the bloom is the thread's swell alone (see `kick` in river): a drop of
        // cobalt travelling down a laminar river is a closed contour.
        kick = 1;
        if (!f.bed) {
          const dev = deviceBox();
          const m = dev ? mouth(dev) : { x: e.x, y: e.y };
          const [bx, by] = uv(m.x - 24, m.y + 16);
          f.ink(bx, by, 0.04, 0.42, 0.07);
        }
      } else if (e.kind === "restart" && f.bed) {
        swell += 0.6;
      } else if (e.kind === "restart") {
        // The server is back: a quiet drop of ink into the river, no accent.
        const dev = deviceBox();
        const m = dev ? mouth(dev) : { x: e.x, y: e.y };
        const [bx, by] = uv(m.x - 24, m.y + 16);
        f.ink(bx, by, 0.25, 0, 0.06);
      } else if (e.kind === "fail") {
        failGlow = Math.min(1, failGlow + 0.06);
      } else if (e.kind === "stir") {
        f.splat(x, y, e.dx, -e.dy, e.ink, e.accent, e.radius);
      } else if (e.river && f.bed) {
        swell += e.size;
      } else if (e.river && riverLive) {
        // A drop meant for the river: poured in where the current leaves the device, like a
        // restarted server's ink, so the current carries it off as one swell.
        const dev = deviceBox();
        const m = dev ? mouth(dev) : { x: e.x, y: e.y };
        const [bx, by] = uv(m.x - 24, m.y + 16);
        f.ink(bx, by, 0.3 * e.size, (e.accent ?? 0) * e.size, 0.07);
      } else {
        const accent = e.accent ?? 0.35;
        for (let i = 0; i < 7; i++) {
          const a = (i / 7) * Math.PI * 2 + rand();
          const speed = 300 + rand() * 600 * e.size;
          f.splat(x, y, Math.cos(a) * speed, Math.sin(a) * speed, 0.5 * e.size, accent * e.size, 0.2 + 0.3 * e.size);
        }
      }
    };

    // The river: requests leaving the simulator. Beside the name (laptops) it leaves from under the
    // device's lower-left corner, runs left beneath the copy and is drawn up the left lane beside the
    // name; stacked (phones, tablets) it wells up from the device's top edge. Returns false while
    // the device is off screen, so the page's own weather takes over.
    let phase = 0;
    /** How fast a swell in the bed's river may drain, per second: under the rate the ink itself
     * fades. Ink poured in at a rate that falls faster than that leaves a lump downstream. */
    const settle = (f: Fluid) => 0.9 * f.config.densityDissipation;
    /** The traffic the river carries, eased toward the simulator's rate over about a second: a
     * sudden jump in the current at the mouth rolls the river's front into curls. */
    let carried = -1;
    let strained = 0;
    /** The bed's current, sim texels/s. A faster current spreads the same ink over more river,
     * which thins it like pouring less, so it speeds up no faster than the ink fades. */
    let flow = 0;
    const river = (f: Fluid, dt: number, vw: number, vh: number) => {
      const dev = deviceLayout();
      if (!dev || dev.width === 0 || dev.bottom < 60 || dev.top > vh - 60) {
        f.bed = null;
        return false;
      }
      const { rate, strain } = flowState();
      const target = Math.min(1, rate / 900);
      // In the bed less traffic drains away no faster than the ink fades (see `settle`).
      const ease = target < carried && f.bed ? settle(f) : 1.2;
      carried = carried < 0 ? target : carried + (target - carried) * Math.min(1, dt * ease);
      const q = carried;
      // Strain too: it thickens the thread, and a thread that thins faster than the ink fades
      // leaves a lump of cobalt downstream.
      strained += (strain - strained) * Math.min(1, dt * (strain > strained ? 3 : settle(f)));
      const k = dt * 60 * tune.ink;
      phase += dt * (0.45 + q * 0.9 + strained * 0.8);
      const speed = (52 + q * 64) * (1 + pulse * 0.15) * tune.current;
      const ink = (0.09 + q * 0.06) * k;
      const thread = (0.12 + q * 0.18 + strain * 0.08 + failGlow * 0.15 + pulse * 0.7) * k;
      const sway = (Math.sin(phase) * 0.1 + Math.sin(phase * 0.43 + 1.3) * 0.07) * (1 + strain * 0.3);
      const name = nameBox();
      const beside = !!name && name.right <= dev.left + 8;
      if (beside && name) {
        // The current runs in a bed (lib/fluid.ts): out of the device's lower-left corner, left
        // beneath the copy, up the left lane beside the name, right along the top under the header
        // and back in behind the device, so the name sits inside the river's loop. A steady bed
        // rather than pushes: every push throws a pair of eddies off its sides, and those are what
        // rolled the river's fringe into loops, hooks and islands beside the copy.
        const m = mouth(dev);
        const ty = Math.min(vh - 50, name.bottom + 56);
        const lx = Math.max(56, name.left - 54);
        const top = Math.max(98, name.top - 52);
        const path: Array<[number, number]> = [
          [dev.left + 120, (dev.top + dev.bottom) / 2],
          [dev.left + 70, m.y + 2],
          [m.x - 40, m.y + 16],
          [name.left + name.width * 0.55, ty],
          [name.left + 40, ty + 4],
          [lx + 6, ty - 50],
          [lx, (name.top + name.bottom) / 2],
          [lx + 10, top + 46],
          [name.left + 60, top],
          [name.left + name.width * 0.6, top - 2],
          [dev.left + 50, top + 8],
          [dev.left + 120, (dev.top + dev.bottom) / 2],
        ];
        // The river meanders a little: the bed's middle reaches sway slowly across the current
        // (never at the mouth, so the river always leaves the device in the same place).
        const last = path.length - 1;
        const flowTo = (BED_SPEED + q * 18) * tune.current;
        flow = flow === 0 ? flowTo : flow + (flowTo - flow) * Math.min(1, dt * (flowTo > flow ? settle(f) : 1.2));
        f.bed = {
          points: path.map(([x, y], i) => {
            const reach = i <= 2 || i >= last - 1 ? 0 : 1;
            const wob = (Math.sin(phase + i * 0.9) * 9 + Math.sin(phase * 0.43 + i * 1.7) * 6) * reach * (1 + strained * 0.3);
            return uv(x + wob * 0.6, y + wob);
          }),
          width: BED_WIDTH,
          speed: flow,
          // It heals a ripple (a cursor, a scroll) within a second, and ink torn off it clears.
          rate: 4,
          fade: 1.5,
        };
        // The ink is laid into the bed behind the device, on its way down to the mouth: where ink
        // is poured the river's ink is densest just downstream, and that crest (a closed contour)
        // stays hidden under the device instead of sitting at its corner.
        const [x, y] = uv(path[0][0] + (path[1][0] - path[0][0]) * 0.75, path[0][1] + (path[1][1] - path[0][1]) * 0.75);
        f.ink(x, y, ink * (1 + swell), 0, 0.06);
        // A kill's swell is lighter here than in the open pool: the bed may only drain it as fast as
        // the ink fades, so a smaller swell is what lets the river read calm again soon after the
        // server is back.
        f.ink(x, y, 0, (0.12 + q * 0.18 + strained * 0.08 + failGlow * 0.15 + pulse * 0.45) * k * 0.6, 0.024);
      } else {
        f.bed = null;
        for (const side of [0.22, 0.78]) {
          const [x, y] = uv(dev.left + dev.width * side, dev.top + 10);
          const out = side < 0.5 ? -1 : 1;
          const angle = Math.PI / 2 + out * (0.55 + sway);
          f.splat(x, y, Math.cos(angle) * speed * 0.8, Math.sin(angle) * speed * 0.8, ink * 0.7, 0, 0.1);
          f.ink(x, y, 0, thread * 0.7, 0.02);
        }
      }
      return true;
    };

    // Pointer stirring.
    const pointer = { x: -1, y: -1, dx: 0, dy: 0, moved: false, has: false };
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
        const accent = rand() < 0.16;
        f.splat(x, y, (rand() - 0.5) * 120, (rand() - 0.5) * 120, accent ? 0.12 : 0.5, accent ? 0.3 : 0, 0.06 + rand() * 0.09);
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
        // From just inside the edge, so the ink starts on screen rather than banked against its side.
        const [x, y] = uv((side === 0 ? 0.05 : 0.95) * vw, yy * vh);
        const angle = Math.sin(weather * 0.5 + side * 3) * 0.5;
        const speed = 240 + 80 * Math.sin(weather * 0.9 + side);
        // Only the left current carries ink: the right one is a push from behind the ruler, so dye
        // never collects by the rail.
        const ink = side === 0 ? 0.022 * dt * 60 * tune.drip : 0;
        const accent = side === 0 && rand() < 0.08 ? 0.12 : 0;
        f.splat(x, y, dir * Math.cos(angle) * speed, Math.sin(angle) * speed, ink, accent * dt * 60, 0.12);
      }
    };

    // Image planes.
    const planes: Plane[] = [];
    const pickImage = (host: HTMLElement) =>
      Array.from(host.querySelectorAll<HTMLImageElement>("img")).find((img) => img.offsetParent !== null || getComputedStyle(img).display !== "none") ?? null;
    // Textures are made one at a time, each in an idle moment, from a bitmap decoded off the main
    // thread at the size it's drawn, and the images are fetched as soon as the liquid runs rather
    // than when they scroll near: so no upload ever lands in the middle of a scroll.
    const uploads: Array<() => Promise<void>> = [];
    let uploading = false;
    const pump = () => {
      if (uploading || !uploads.length || disposed) return;
      uploading = true;
      const job = uploads.shift()!;
      const run = () =>
        void job().finally(() => {
          uploading = false;
          pump();
        });
      if (typeof window.requestIdleCallback === "function") window.requestIdleCallback(run, { timeout: 1500 });
      else setTimeout(run, 80);
    };
    const loadPlane = (f: Fluid, plane: Plane) => {
      const img = pickImage(plane.host);
      if (!img) return;
      const src = img.currentSrc || img.src;
      if ((plane.texture && plane.src === src) || plane.pending === img) return;
      plane.pending = img;
      if (img.loading === "lazy") img.loading = "eager";
      const ready = () => {
        uploads.push(async () => {
          if (disposed || plane.pending !== img) return;
          try {
            const box = plane.host.getBoundingClientRect().width || img.naturalWidth;
            const width = Math.max(1, Math.min(img.naturalWidth, Math.ceil(box * dpr() * 1.25)));
            const height = Math.max(1, Math.round((img.naturalHeight * width) / img.naturalWidth));
            const source: TexImageSource =
              typeof createImageBitmap === "function" ? await createImageBitmap(img, { resizeWidth: width, resizeHeight: height, resizeQuality: "high", premultiplyAlpha: "none" }) : img;
            if (disposed || plane.pending !== img) return;
            const texture = f.createTexture(source);
            if (source instanceof ImageBitmap) source.close();
            if (plane.texture) f.deleteTexture(plane.texture);
            plane.texture = texture;
            plane.img = img;
            plane.src = img.currentSrc || img.src;
            plane.host.dataset.glLive = "";
          } catch {
            // A texture that can't be read stays a plain image.
          }
        });
        pump();
      };
      if (img.complete && img.naturalWidth) ready();
      else img.addEventListener("load", ready, { once: true });
    };

    let lastY = window.scrollY;
    let bend = 0;
    let agitate = 0;

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
      // How much the pool is stirred on its own. In the hero the river is the motion, so while it
      // runs there is no vorticity confinement (it winds the river's fringe, and a failing
      // system's swell, into small closed curls beside the copy) and only half the ambient noise
      // (the full stir tears the fringe into islands). Below the hero the page's weather keeps both.
      const weatherFor = (fl: Fluid, live: boolean, strain: number, q: number) => {
        fl.config.curl = live ? 0 : base.curl + strain * 2;
        fl.ambient = AMBIENT * tune.ambient * (1 + q * 0.6) * (live ? RIVER_AMBIENT : 1);
      };
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

      // Runs the river (or, with the device off screen, the page's weather) for a while, so the
      // first frame is an established current rather than a blank pool.
      const prewarm = (steps: number) => {
        const vh = window.innerHeight;
        const vw = window.innerWidth;
        const dt = 1 / 30;
        for (let i = 0; i < steps; i++) {
          f.time += dt;
          riverLive = river(f, dt, vw, vh);
          weatherFor(f, riverLive, 0, 0);
          if (f.bed) f.config.densityDissipation = base.densityDissipation * RIVER_FADE;
          if (!riverLive) ambient(f, dt, rand, vw, vh);
          f.obstruct(dt);
          f.step(dt);
        }
      };

      if (motion.matches) {
        prewarm(320);
        f.render();
        canvas.dataset.ready = "still";
        // Nothing moves, but the chapter's band and the calm water under text follow the page: one
        // display pass per scrolled frame, no simulation.
        let queued = 0;
        const redraw = () => {
          queued = 0;
          gather(f, window.innerHeight, window.innerWidth);
          f.render();
        };
        const onScroll = () => {
          if (!queued) queued = requestAnimationFrame(redraw);
        };
        window.addEventListener("scroll", onScroll, { passive: true });
        cleanups.push(() => {
          window.removeEventListener("scroll", onScroll);
          cancelAnimationFrame(queued);
        });
        return;
      }

      prewarm(150);
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
        const q = Math.min(1, rate / 900);
        if (f.bed) {
          // In the bed every swell drains exponentially, a little slower than the ink fades, so
          // its trace down the river only ever thins with distance (no lump, no closed contour).
          const out = Math.exp(-dt * settle(f));
          kick *= out;
          failGlow *= out;
          swell *= out;
        } else {
          kick = Math.max(0, kick - dt * 0.6);
          failGlow = Math.max(0, failGlow - dt * 0.5);
        }
        pulse += (kick - pulse) * Math.min(1, dt * 3);
        weatherFor(f, riverLive, strain, q);
        // A busier system turns over its ink faster, so more traffic reads as more current, not
        // more mud.
        f.config.densityDissipation = base.densityDissipation * (1 + q * 0.9 + strain * 0.3) * (f.bed ? RIVER_FADE : 1);

        while (queue.length) applyEvent(f, queue.shift()!, rand);
        riverLive = river(f, dt, vw, vh);
        wake(f, delta, vh, vw);
        if (!riverLive) {
          drip(f, dt, rand, vw, vh);
          ambient(f, dt, rand, vw, vh);
        }
        if (pointer.moved) {
          // The cursor stirs along its whole path this frame (a fast sweep is several overlapping
          // splats, not a dotted line), with splats that grow with its speed.
          const dist = Math.hypot(pointer.dx, pointer.dy);
          const v = Math.min(4000, dist / Math.max(dt, 1 / 240));
          const n = Math.min(4, Math.max(1, Math.ceil(dist / 36)));
          const radius = (coarse ? 0.16 : 0.07) + Math.min(1, v / 2600) * (coarse ? 0.22 : 0.17);
          // Over the hero's river the cursor stirs more gently, so it ripples the current rather than
          // tearing it into eddies (the bed heals a ripple in a moment).
          const push = (coarse ? 0.15 : 0.11) * Math.min(1, 0.4 + v / 1600) * (f.bed ? 0.1 : 1);
          // A faint smoke of ink: enough to see the stroke, too little to draw contour lines of its own.
          const ink = Math.min(0.03, v * 0.000012) / n;
          for (let i = 0; i < n; i++) {
            const t = (i + 1) / n;
            const [x, y] = uv(pointer.x - pointer.dx * (1 - t), pointer.y - pointer.dy * (1 - t));
            f.splat(x, y, (pointer.dx / dt) * push / n * 1.1, (-pointer.dy / dt) * push / n * 1.1, ink, 0, radius);
          }
        }
        pointer.dx = pointer.dy = 0;
        pointer.moved = false;

        f.obstruct(dt);
        f.step(dt);
        f.render();

        // Planes, on top of the liquid, at their elements' boxes this frame. They bow and refract
        // only while the page moves (agitate rises at once and settles within half a second of
        // rest), so a still image is always sharp.
        bend += (Math.max(-1, Math.min(1, fr.velocity / 2600)) - bend) * (1 - Math.exp(-8 * dt));
        agitate = Math.max(Math.min(1, Math.abs(fr.velocity) / 900), agitate * Math.exp(-dt / 0.16));
        if (agitate < 0.002) agitate = 0;
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
            refract: tune.refract * Math.max(agitate, plane.hover * 0.5),
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
