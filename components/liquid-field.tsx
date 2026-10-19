"use client";

import { useEffect, useRef } from "react";
import type { Fluid, FluidColors, FluidConfig, Palette } from "@/lib/fluid";
import { onFlow, type FlowEvent } from "@/lib/flow-bus";
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
// - In the hero the current comes out from behind the portrait: on laptops a river of ink runs in a
//   steady bed (Fluid.bed) from under the portrait's lower-left corner, beneath the hero copy, up the
//   left lane and back along the top, so the name sits inside its loop, with a cobalt thread in it.
//   An ambient curl-noise stir keeps the pool moving when nothing touches it, flying HUD letters
//   and the spine's packet stir it, and below the hero two slow currents keep the gutters alive.
//   Below the hero, ink only ever enters from the screen's left edge: a drop of ink landing in
//   open water is a closed contour by definition (a ring, an island), so pushes there (the
//   waterlines' wake, scroll eddies, hovered rows, flying letters) move the water but carry no dye.
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
/** The river's bed: its half width (a fraction of the screen's height) and its speed, in sim
 * texels/s (see Fluid.bed). */
const BED_WIDTH = 0.075;
const BED_SPEED = 37;
/** How much faster than the engine's base rate the page's ink fades, and how much more the ambient
 * noise stirs: the pool's look was tuned with these (they were the hero simulator's resting load). */
const TURNOVER = 1.16;
const STIR = 1.1;
/** How fast the ink fades while the bed runs, as a share of the page's rate: slow enough that the
 * river reaches round the name before it thins out. */
const RIVER_FADE = 0.5;
/** The share of the ambient stir the hero keeps while its river runs. */
const RIVER_AMBIENT = 0.5;
/** The share of the vorticity confinement the page keeps below the hero. */
const BELOW_CURL = 0.3;
/** Where the neutral ink's lines switch from the wide blur to the fine field (see Fluid.trace). */
const RIVER_TRACE: [number, number] = [0.1, 0.3];
const PAGE_TRACE: [number, number] = [0.24, 0.55];
const POUR = 0.3;

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
        calm.push({ left: r.left + pl, top: r.top + pt, right: r.right - pr, bottom: r.bottom - pb, strength });
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
    /** Extra ink poured into the bed's river (the intro's drop), as a share of its usual flow. It is
     * added at once and drains away more slowly than the ink itself fades (see `settle`), so the
     * river thickens and thins along its length without a lump: a lump of ink travelling down the
     * current is a closed contour, an island. */
    let swell = 0;
    /** Whether the hero's river ran last frame (the portrait is on screen). */
    let riverLive = false;

    /** The hero portrait's image box from layout alone, without its transforms: the river's bed is
     * laid from this, so the portrait's entrance (it rises into place) doesn't drag the river's mouth
     * and kink the current. */
    const portraitLayout = () => {
      const el = document.querySelector<HTMLElement>("[data-hero-portrait] [data-gl]");
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
    /** Where the river leaves the portrait beside the name, in viewport px. */
    const mouth = (p: DOMRect) => ({ x: p.left + 28, y: Math.min(p.bottom - 18, window.innerHeight - 40) });
    /** Stacked (phones, tablets), where the current wells out from behind the small portrait's right
     * edge, into the open water beside it. */
    const spring = (p: DOMRect) => ({ x: p.right - Math.min(40, p.width * 0.45), y: p.top + p.height * 0.55 });

    const applyEvent = (f: Fluid, e: FlowEvent, rand: () => number) => {
      const [x, y] = uv(e.x, e.y);
      if (e.kind === "stir") {
        f.splat(x, y, e.dx, -e.dy, e.ink, e.accent, e.radius);
      } else if (e.river && f.bed) {
        swell += e.size;
      } else if (e.river && riverLive) {
        // A drop meant for the river: poured in behind the portrait, so the current carries it
        // off as one swell.
        const p = portraitLayout();
        const s = p ? spring(p) : { x: e.x, y: e.y };
        const [bx, by] = uv(s.x, s.y);
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

    // The river, coming out from behind the hero's portrait. Beside the name (laptops) it leaves from
    // under the portrait's lower-left corner, runs left beneath the copy and is drawn up the left
    // lane beside the name; stacked (phones, tablets) it wells out from behind the portrait's right
    // edge. Returns false while the portrait is off screen, so the page's own weather takes over.
    let phase = 0;
    /** How fast a swell in the bed's river may drain, per second: under the rate the ink itself
     * fades. Ink poured in at a rate that falls faster than that leaves a lump downstream. */
    const settle = (f: Fluid) => 0.9 * f.config.densityDissipation;
    const river = (f: Fluid, dt: number, vh: number) => {
      const dev = portraitLayout();
      if (!dev || dev.width === 0 || dev.bottom < 60 || dev.top > vh - 60) {
        f.bed = null;
        return false;
      }
      const k = dt * 60 * tune.ink;
      phase += dt * 0.6;
      const name = nameBox();
      const beside = !!name && name.right <= dev.left + 8;
      if (beside && name) {
        // The current runs in a bed (lib/fluid.ts): out of the portrait's lower-left corner, left
        // beneath the copy, up the left lane beside the name, right along the top under the header
        // and back in behind the portrait, so the name sits inside the river's loop. A steady bed
        // rather than pushes: every push throws a pair of eddies off its sides, and those are what
        // rolled the river's fringe into loops, hooks and islands beside the copy.
        const m = mouth(dev);
        const ty = Math.min(vh - 50, name.bottom + 56);
        const lx = Math.max(56, name.left - 54);
        const top = Math.max(98, name.top - 52);
        const mid = dev.top + dev.height * 0.55;
        const path: Array<[number, number]> = [
          [dev.left + dev.width * 0.55, mid],
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
          [dev.left + dev.width * 0.55, mid],
        ];
        // The river meanders a little: the bed's middle reaches sway slowly across the current
        // (never at the mouth, so the river always leaves the portrait in the same place).
        const last = path.length - 1;
        f.bed = {
          points: path.map(([x, y], i) => {
            const reach = i <= 2 || i >= last - 1 ? 0 : 1;
            const wob = (Math.sin(phase + i * 0.9) * 9 + Math.sin(phase * 0.43 + i * 1.7) * 6) * reach;
            return uv(x + wob * 0.6, y + wob);
          }),
          width: BED_WIDTH,
          speed: BED_SPEED * tune.current,
          // It heals a ripple (a cursor, a scroll) within a second, and ink torn off it clears.
          rate: 4,
          fade: 1.5,
        };
        // The ink and its cobalt thread are laid into the bed behind the portrait, on their way down
        // to the mouth: where ink is poured the river's ink is densest just downstream, and that
        // crest (a closed contour) stays hidden under the photo instead of sitting at its corner.
        const [x, y] = uv(path[0][0] + (path[1][0] - path[0][0]) * POUR, path[0][1] + (path[1][1] - path[0][1]) * POUR);
        f.ink(x, y, 0.1 * k * (1 + swell), 0, 0.06);
        f.ink(x, y, 0, 0.09 * k, 0.024);
      } else {
        // One quiet stream, out to the right and a little down, swaying slowly.
        f.bed = null;
        const speed = 40 * tune.current;
        const angle = -0.18 + Math.sin(phase) * 0.06 + Math.sin(phase * 0.43 + 1.3) * 0.04;
        const [x, y] = uv(spring(dev).x, spring(dev).y);
        f.splat(x, y, Math.cos(angle) * speed, Math.sin(angle) * speed, 0.045 * k, 0, 0.1);
        f.ink(x, y, 0, 0.06 * k, 0.02);
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
            f.splat(x, y, (Math.random() - 0.5) * 220, push, 0, 0, 0.3);
          }
        }
      }
      // Fast scrolling stirs the whole pool a little: two slow eddies in the gutters.
      const speed = Math.min(1, Math.abs(delta) / 60) * tune.scrollStir;
      if (speed > 0.15) {
        for (const side of [0.04, 0.96]) {
          const [x, y] = uv(side * vw, vh * (0.3 + Math.random() * 0.4));
          f.splat(x, y, (side < 0.5 ? 1 : -1) * 260 * speed, push * 0.6, 0, 0, 0.25);
        }
      }
    };

    // Below the hero the page has its own weather: two slow currents wander in from the side edges,
    // so there is always marbling moving in the gutters around the text. (There used to be drips
    // too, drops landing in empty water: each one spread into a ring of contours, a loose oval.)
    let weather = 0;
    const ambient = (f: Fluid, dt: number, vw: number, vh: number) => {
      weather += dt;
      const sides: Array<[number, number, number]> = [
        [0, 0.5 + 0.34 * Math.sin(weather * 0.21), 1],
        [1, 0.5 + 0.34 * Math.sin(weather * 0.17 + 2.1), -1],
      ];
      for (const [side, yy, dir] of sides) {
        // The ink is laid at the very edge, half of it off screen, so its body always reaches back to
        // the side of the screen (where the display fades it out) and never closes into an island.
        const [x, y] = uv((side === 0 ? 0.004 : 0.95) * vw, yy * vh);
        const angle = Math.sin(weather * 0.5 + side * 3) * 0.5;
        const speed = 240 + 80 * Math.sin(weather * 0.9 + side);
        // Only the left current carries ink: the right one is a push from behind the ruler, so dye
        // never collects by the rail. No accent: a flick of cobalt every so often was a loose dot.
        f.splat(x, y, dir * Math.cos(angle) * speed, Math.sin(angle) * speed, 0, 0, 0.12);
        // The ink goes in wider and thinner than the push (about the same amount as one narrow
        // drop): a broad plume marbles into long smooth tongues, where a narrow one pinched into
        // little hooks in the lane beside the text.
        if (side === 0) f.ink(x, y, 0.009 * dt * 60 * tune.drip, 0, 0.3);
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
          // An image still running its entrance (the hero portrait's fade-up) goes into the liquid
          // once it has settled: the plane is drawn at full opacity, so taking over mid-fade would
          // pop it in.
          const entering = document.getAnimations().filter((a) => {
            const target = (a.effect as KeyframeEffect | null)?.target;
            return a.playState === "running" && target instanceof Element && target.contains(plane.host);
          });
          if (entering.length) await Promise.all(entering.map((a) => a.finished.catch(() => undefined)));
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
      // runs there is no vorticity confinement (it winds the river's fringe into small closed curls
      // beside the copy) and only half the ambient noise (the full stir tears the fringe into
      // islands). Below the hero the page's weather keeps the full stir but only a little
      // confinement (BELOW_CURL): confinement is what rolled the left current's wisps into small
      // closed curls in the lane beside the text.
      const weatherFor = (fl: Fluid, live: boolean) => {
        fl.config.curl = live ? 0 : base.curl * BELOW_CURL;
        // Below the hero the ink's lines follow the smooth wide blur further into its bodies, so a
        // wrinkle in a thin wisp can't close into a small ring (the hero's river keeps its detail).
        fl.trace = live ? RIVER_TRACE : PAGE_TRACE;
        fl.ambient = AMBIENT * STIR * tune.ambient * (live ? RIVER_AMBIENT : 1);
        // The ink fades at half the page's rate while the bed runs, so the river reaches round the name.
        fl.config.densityDissipation = base.densityDissipation * TURNOVER * (fl.bed ? RIVER_FADE : 1);
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

      // Runs the river (or, with the portrait off screen, the page's weather) for a while, so the
      // first frame is an established current rather than a blank pool.
      const prewarm = (steps: number) => {
        const vh = window.innerHeight;
        const vw = window.innerWidth;
        const dt = 1 / 30;
        for (let i = 0; i < steps; i++) {
          f.time += dt;
          riverLive = river(f, dt, vh);
          weatherFor(f, riverLive);
          if (!riverLive) ambient(f, dt, vw, vh);
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
          // An image already on screen when the liquid starts (the hero portrait) is taken over as
          // it is; the rest condense out of the ink as they first scroll in.
          const r = host.getBoundingClientRect();
          const shown = r.width > 0 && r.bottom > 0 && r.top < window.innerHeight;
          const plane: Plane = { host, img: null, texture: null, src: "", reveal: shown ? 1 : 0, revealing: shown, hover: 0, mode: host.dataset.gl === "portrait" ? 1 : 0 };
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

        // In the bed a swell drains exponentially, a little slower than the ink fades, so its trace
        // down the river only ever thins with distance (no lump, no closed contour).
        swell = f.bed ? swell * Math.exp(-dt * settle(f)) : 0;
        weatherFor(f, riverLive);

        while (queue.length) applyEvent(f, queue.shift()!, rand);
        riverLive = river(f, dt, vh);
        wake(f, delta, vh, vw);
        if (!riverLive) {
          ambient(f, dt, vw, vh);
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
          // The portrait doesn't answer the pointer: no ripple or lens ever passes over his face.
          plane.hover += ((inside && !plane.mode ? 1 : 0) - plane.hover) * (1 - Math.exp(-6 * dt));
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
          // The <img> hides only once the plane has been drawn in its place, so it never blinks.
          if (plane.host.dataset.glLive === undefined) plane.host.dataset.glLive = "";
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
