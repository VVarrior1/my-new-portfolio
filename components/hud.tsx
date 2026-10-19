"use client";

import { useEffect, useRef, useState } from "react";
import { emitFlow } from "@/lib/flow-bus";
import { arrivalProgress, clamp01, easeInOutCubic, letterProgress, quad } from "@/lib/hud-math";
import { getLenis, onFrame, scrollToTarget, type Frame } from "@/lib/ticker";
import { redrawMark } from "./brand-mark";

// The HUD: the page's scroll signature, after getartcraft.com/apps.
//
// The sections still to come wait in a queue on the right edge, set sideways like the spines of
// books, small and quiet; as a section reaches the top of the screen its name leaves the queue
// (it slides into the rail and fades) and the ones behind it close up. Click a name to travel to
// its section. Nothing docks in the corner: the sticky "01 / WORK" bar under the header already
// says where you are, and a name parked over the page sat on the text as it scrolled by.
//
// On the right edge, a ruler: tick tape that slides with the page, a needle and a rolling percent
// readout; point at it and it zooms out into a map of the whole page with every section on it.
// Click or drag to travel.
//
// Laptops and desktops only (a fine pointer, 1024px and up, motion allowed). Everything here is
// decoration (aria-hidden); the header nav and the in-page headings carry the same information.

const RAIL = 56;
const NAV = 64;
/** The queue's names: their line height across the rail (px) and the gap between them. */
const QUEUE_LINE = 15;
const QUEUE_GAP = 18;

type Entry = {
  word: string;
  anchor: HTMLElement;
  el: HTMLSpanElement;
  /** The name's length along the queue, px. */
  length: number;
  /** How far its section has arrived, 0 (still to come) to 1 (here). */
  gone: number;
};

const ease = easeInOutCubic;

export function Hud() {
  const [on, setOn] = useState(false);

  useEffect(() => {
    const query = window.matchMedia("(pointer: fine) and (min-width: 1024px) and (prefers-reduced-motion: no-preference)");
    const update = () => setOn(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);

  return on ? <HudLayer /> : null;
}

/**
 * The hero's name flies into the header. As you scroll out of the hero, the name's letters lift off
 * (the first letter first, the rest a beat behind) and fly, shrinking and tumbling a little, into
 * the brand "Am. Mohamed": the A docks on the mark's A, the rest of the first name pours into the
 * mark's cobalt full stop, and the surname lands letter by letter on the surname. When the first
 * name has been delivered into the stop, the stop runs the mark's route like a request packet and
 * writes the m again. It is scrubbed by the scroll, not snapped, so the hero's keys under it can be
 * used at any scroll position. Scroll back and the letters fly home (the mark stays; only the
 * surname empties). After getartcraft.com, where the hero wordmark docks as the first heading.
 */
const NAME_START = 24;
const NAME_RANGE = 330;
const NAME_STAGGER = 0.022;

function createNameFlight(layer: HTMLElement) {
  const sources = Array.from(document.querySelectorAll<HTMLElement>("[data-name] [data-nl]"));
  const targets = Array.from(document.querySelectorAll<HTMLElement>("[data-wordmark] [data-wl]"));
  if (sources.length < 2 || targets.length < 3) return null;
  const root = document.documentElement;
  root.dataset.nameFlight = "";
  // Map each letter of the name to the brand (A . M o h a m e d): the first letter to the mark's A,
  // the surname to the surname, and the rest of the first name into the mark's full stop. The A and
  // the stop are the mark's own paths (data-keep): they never leave, so the hero's A dives into the
  // mark's A and dissolves into it over the last stretch rather than covering it.
  const first = sources.filter((el) => !el.closest(".t-serif"));
  const last = sources.filter((el) => el.closest(".t-serif"));
  const dot = targets[1];
  const surname = targets.slice(2);
  type L = {
    src: HTMLElement;
    dst: HTMLElement;
    pour: boolean;
    el: HTMLSpanElement;
    size: number;
    /** Ink centre minus box centre, per px of font size, and cap height per px (for SVG targets). */
    ink: { x: number; y: number; cap: number };
    tumble: number;
    prev: { x: number; y: number };
  };
  const letters: L[] = [];
  const make = (src: HTMLElement, dst: HTMLElement, pour: boolean, i: number) => {
    const el = document.createElement("span");
    el.className = "hud-name-ltr";
    el.textContent = src.textContent;
    layer.appendChild(el);
    letters.push({
      src,
      dst,
      pour,
      el,
      size: 0,
      ink: { x: 0, y: 0, cap: 0.7 },
      tumble: (((i * 5 + 3) % 7) - 3) * 4,
      prev: { x: 0, y: 0 },
    });
  };
  first.forEach((src, i) => make(src, i === 0 ? targets[0] : dot, i > 0, i));
  last.forEach((src, i) => make(src, surname[i] ?? surname[surname.length - 1], false, first.length + i));

  const ctx = document.createElement("canvas").getContext("2d");
  const style = () => {
    for (const l of letters) {
      const cs = getComputedStyle(l.src);
      l.size = parseFloat(cs.fontSize) || 100;
      // One property at a time: the font shorthand won't take a percentage width.
      Object.assign(l.el.style, { fontFamily: cs.fontFamily, fontStyle: cs.fontStyle, fontWeight: cs.fontWeight, fontStretch: cs.fontStretch, fontSize: `${l.size}px` });
      // Where the glyph's ink sits in its box, so a letter can land ink to ink on a drawn mark.
      if (ctx && l.dst instanceof SVGElement) {
        ctx.font = `${cs.fontStyle} ${cs.fontWeight} 100px ${cs.fontFamily}`;
        const m = ctx.measureText(l.el.textContent || "A");
        l.ink = {
          x: ((m.actualBoundingBoxRight - m.actualBoundingBoxLeft) / 2 - m.width / 2) / 100,
          y: (m.actualBoundingBoxDescent - m.actualBoundingBoxAscent + m.fontBoundingBoxAscent - m.fontBoundingBoxDescent) / 2 / 100,
          cap: (m.actualBoundingBoxAscent + m.actualBoundingBoxDescent) / 100 || 0.7,
        };
      }
    }
  };
  style();
  window.addEventListener("resize", style);

  const shown = new Map<HTMLElement, boolean>();
  const show = (el: HTMLElement, value: boolean) => {
    if (shown.get(el) === value) return;
    shown.set(el, value);
    el.style.opacity = value ? "1" : "0";
  };
  const hidden = new Map<HTMLElement, boolean>();
  const hide = (el: HTMLElement, value: boolean) => {
    if (hidden.get(el) === value) return;
    hidden.set(el, value);
    el.style.visibility = value ? "hidden" : "";
  };

  // The mark writes itself again when the last letter of the first name pours into its stop.
  const mark = dot.closest("svg");
  const lastPour = letters.filter((l) => l.pour).pop();
  let delivered: boolean | null = null;
  let lastDraw = 0;

  let p = 0;
  const frame = (fr: Frame) => {
    p = clamp01((fr.y - NAME_START) / NAME_RANGE);
    const n = letters.length;
    let pourDone = false;
    const docked = new Set<HTMLElement>();
    letters.forEach((l, k) => {
      const d = ease(letterProgress(p, n - 1 - k, n, NAME_STAGGER));
      const away = d > 0.002;
      hide(l.src, away);
      if (!away || d >= 0.999) {
        l.el.style.opacity = "0";
        l.prev.x = 0;
        if (d >= 0.999) {
          if (!l.pour) docked.add(l.dst);
          if (l === lastPour) pourDone = true;
        }
        return;
      }
      const a = l.src.getBoundingClientRect();
      const b = l.dst.getBoundingClientRect();
      const p0 = { x: a.left + a.width / 2, y: a.top + a.height / 2 };
      // A drawn target (the mark's A) is sized by its cap height and met ink to ink.
      const drawn = l.dst instanceof SVGElement;
      const target = drawn ? b.height / l.ink.cap : parseFloat(getComputedStyle(l.dst).fontSize) || 15;
      const end = drawn && !l.pour ? target : 0; // the letter's size in px as it lands
      const p1 = { x: b.left + b.width / 2 - l.ink.x * end, y: b.top + b.height / 2 - l.ink.y * end };
      // Up first, then across: the control point sits above the start, a third of the way over.
      const c = {
        x: p1.x + (p0.x - p1.x) * 0.62,
        y: p1.y + (p0.y - p1.y) * 0.08,
      };
      const { x, y } = quad(p0, c, p1, d);
      const s1 = l.pour ? 0.04 : target / l.size;
      const scale = 1 + (s1 - 1) * d;
      const rot = Math.sin(Math.PI * d) * l.tumble;
      const alpha = l.pour ? 1 - clamp01((d - 0.55) / 0.4) : drawn ? 1 - clamp01((d - 0.72) / 0.26) : 1;
      l.el.style.transform = `translate3d(${x.toFixed(1)}px,${y.toFixed(1)}px,0) translate(-50%,-50%) rotate(${rot.toFixed(2)}deg) scale(${scale.toFixed(4)})`;
      l.el.style.opacity = alpha.toFixed(3);
      // A letter in flight drags the liquid with it.
      if (l.prev.x) {
        const vx = (x - l.prev.x) / fr.dt;
        const vy = (y - l.prev.y) / fr.dt;
        const sp = Math.hypot(vx, vy);
        if (sp > 160 && (k + Math.round(fr.now / 16)) % 3 === 0) {
          emitFlow({
            kind: "stir",
            x,
            y,
            dx: vx * 0.3,
            dy: vy * 0.3,
            ink: Math.min(0.05, sp * 0.00002),
            accent: 0,
            radius: 0.04 + 0.05 * (1 - d),
          });
        }
      }
      l.prev.x = x;
      l.prev.y = y;
    });
    // The surname's letters show as their twins land.
    targets.forEach((t) => t.dataset.keep === undefined && show(t, docked.has(t)));
    // "Request delivered": on the way down, not on the way back, and not for a page loaded below it.
    if (delivered === false && pourDone && fr.now - lastDraw > 1200) {
      lastDraw = fr.now;
      redrawMark(mark);
    }
    delivered = pourDone;
  };

  return {
    frame,
    dispose: () => {
      window.removeEventListener("resize", style);
      for (const l of letters) l.src.style.visibility = "";
      for (const t of targets) t.style.opacity = "";
      delete root.dataset.nameFlight;
    },
  };
}

function HudLayer() {
  const queueRef = useRef<HTMLDivElement>(null);
  const nameRef = useRef<HTMLDivElement>(null);
  const railRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const layer = queueRef.current;
    const rail = railRef.current;
    const nameLayer = nameRef.current;
    if (!layer || !rail) return;
    let disposed = false;
    let off: (() => void) | null = null;
    const root = document.documentElement;
    root.dataset.hudActive = "";

    const build = () => {
      if (disposed) return;
      const entries: Entry[] = Array.from(document.querySelectorAll<HTMLElement>("main [data-hud]")).map((anchor, i) => {
        const word = (anchor.dataset.hud || "").toUpperCase();
        const el = document.createElement("span");
        el.className = "hud-q";
        el.textContent = word;
        el.dataset.entry = String(i);
        layer.appendChild(el);
        return { word, anchor, el, length: el.offsetWidth, gone: 0 };
      });

      const name = nameLayer ? createNameFlight(nameLayer) : null;

      // Click a name to travel to its section.
      const onClick = (event: MouseEvent) => {
        const el = (event.target as HTMLElement).closest<HTMLElement>(".hud-q");
        const entry = el ? entries[Number(el.dataset.entry)] : undefined;
        if (entry) scrollToTarget(entry.anchor, { offset: -NAV, duration: 1.25 });
      };
      layer.addEventListener("click", onClick);

      // The ruler's tape.
      const tape = rail.querySelector<HTMLElement>("[data-tape]")!;
      const ticks: HTMLElement[] = [];
      const tickLabels: Array<HTMLElement | null> = [];
      for (let i = 0; i <= 100; i++) {
        const t = document.createElement("span");
        t.className = i % 5 === 0 ? "hud-tick hud-tick-major" : "hud-tick";
        let n: HTMLElement | null = null;
        if (i % 10 === 0) {
          n = document.createElement("span");
          n.className = "hud-tick-n";
          n.textContent = String(i);
          t.appendChild(n);
        }
        tickLabels.push(n);
        tape.appendChild(t);
        ticks.push(t);
      }
      const words = rail.querySelector<HTMLElement>("[data-words]")!;
      const mapWords = entries.map((e) => {
          const w = document.createElement("span");
          w.className = "hud-mapword";
          w.textContent = e.word;
          words.appendChild(w);
          return { entry: e, el: w };
        });
      const needle = rail.querySelector<HTMLElement>("[data-needle]")!;
      const digits = Array.from(rail.querySelectorAll<HTMLElement>("[data-digit]"));
      const bracket = rail.querySelector<HTMLElement>("[data-bracket]")!;
      const ghost = rail.querySelector<HTMLElement>("[data-ghost]")!;

      // Rail interaction: hover zooms into the map, click jumps, drag scrubs.
      let zoom = 0;
      let wantZoom = false;
      let hoverTimer = 0;
      let dragging = false;
      let ghostY = -1;
      const railTop = NAV + 24;
      const railH = () => window.innerHeight - railTop - 16;
      const progressAt = (clientY: number) => clamp01((clientY - railTop) / railH());
      const seek = (clientY: number, smooth: boolean) => {
        const limit = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
        const lenis = getLenis();
        const y = progressAt(clientY) * limit;
        if (lenis) lenis.scrollTo(y, smooth ? { duration: 1, easing: ease, force: true } : { lerp: 0.18, force: true });
        else window.scrollTo({ top: y });
      };
      const onEnter = () => {
        window.clearTimeout(hoverTimer);
        hoverTimer = window.setTimeout(() => (wantZoom = true), 150);
      };
      const onLeave = () => {
        window.clearTimeout(hoverTimer);
        if (!dragging) wantZoom = false;
        ghostY = -1;
      };
      const onMove = (event: PointerEvent) => {
        ghostY = event.clientY;
        if (dragging) seek(event.clientY, false);
      };
      const onDown = (event: PointerEvent) => {
        dragging = true;
        rail.setPointerCapture(event.pointerId);
        seek(event.clientY, true);
      };
      const onUp = (event: PointerEvent) => {
        dragging = false;
        if (rail.hasPointerCapture(event.pointerId)) rail.releasePointerCapture(event.pointerId);
        if (!rail.matches(":hover")) wantZoom = false;
      };
      rail.addEventListener("pointerenter", onEnter);
      rail.addEventListener("pointerleave", onLeave);
      rail.addEventListener("pointermove", onMove);
      rail.addEventListener("pointerdown", onDown);
      rail.addEventListener("pointerup", onUp);

      const chapterEls = Array.from(document.querySelectorAll<HTMLElement>('[data-chapter="invert"]'));
      const mapFrost = rail.querySelector<HTMLElement>("[data-mapfrost]")!;
      let lastPct = -1;
      let needleShown = -1;
      const lit = new Map<HTMLElement, boolean>();
      const setInvert = (el: HTMLElement, value: boolean) => {
        if (lit.get(el) === value) return;
        lit.set(el, value);
        el.toggleAttribute("data-x", value);
      };
      // The map's frost is tinted the pool's colour, and the opposite theme's where the chapter runs
      // under it: two layers, each clipped to its part, so it never smears dark over light water.
      const clips = new Map<HTMLElement, string>();
      const clip = (el: HTMLElement, value: string) => {
        if (clips.get(el) === value) return;
        clips.set(el, value);
        el.style.clipPath = value;
      };
      const tint = (host: HTMLElement | null, bands: DOMRect[]) => {
        if (!host) return;
        const base = host.children[0] as HTMLElement;
        const other = host.children[1] as HTMLElement;
        const r = host.getBoundingClientRect();
        const b = bands.find((band) => band.bottom > r.top && band.top < r.bottom);
        if (!b) {
          clip(base, "none");
          clip(other, "inset(0 0 100% 0)");
          return;
        }
        const y0 = Math.round(Math.max(0, b.top - r.top));
        const y1 = Math.round(Math.min(r.height, b.bottom - r.top));
        const w = Math.ceil(r.width);
        const h = Math.ceil(r.height);
        clip(other, `inset(${y0}px 0 ${h - y1}px 0)`);
        clip(base, `polygon(evenodd, 0 0, ${w}px 0, ${w}px ${h}px, 0 ${h}px, 0 0, 0 ${y0}px, ${w}px ${y0}px, ${w}px ${y1}px, 0 ${y1}px, 0 ${y0}px)`);
      };

      const frame = (fr: Frame) => {
        const { vh, vw, y: scrollY, dt, velocity } = fr;
        name?.frame(fr);
        const bands = chapterEls.map((el) => el.getBoundingClientRect());
        const inBand = (py: number, px = vw) => bands.some((b) => py > b.top + 8 && py < b.bottom - 8 && px > b.left);

        // 1. The queue, bottom-right, closing up as each section arrives. It runs in the ruler's
        // lane, right of the page's text column, on calm water (no fade needed behind it). While
        // the ruler is zoomed into its map the names step aside, so its labels never sit on them.
        const fade = 1 - zoom;
        let queueBottom = vh - 30;
        const x = vw - RAIL - 14 - QUEUE_LINE / 2;
        for (const e of entries) {
          e.gone = arrivalProgress(e.anchor.getBoundingClientRect().top, vh);
          const g = ease(e.gone);
          const y = queueBottom - e.length / 2;
          queueBottom -= (e.length + QUEUE_GAP) * (1 - g);
          e.el.style.transform = `translate3d(${(x + g * 22).toFixed(1)}px,${y.toFixed(1)}px,0) translate(-50%,-50%) rotate(-90deg)`;
          const alpha = 0.6 * (1 - g) * fade;
          e.el.style.opacity = alpha.toFixed(3);
          const hit = alpha > 0.2 ? "" : "none";
          if (e.el.style.pointerEvents !== hit) e.el.style.pointerEvents = hit;
          setInvert(e.el, inBand(y, x));
        }

        // 2. Ruler.
        // 6. Ruler.
        zoom += ((wantZoom ? 1 : 0) - zoom) * (1 - Math.exp(-10 * dt));
        if (Math.abs(zoom - (wantZoom ? 1 : 0)) < 0.002) zoom = wantZoom ? 1 : 0;
        const limit = Math.max(1, fr.limit);
        const p = clamp01(scrollY / limit);
        const h = railH();
        const needleY = railTop + p * h;
        needle.style.transform = `translate3d(0,${needleY.toFixed(1)}px,0)`;
        // The needle and its readout fade in over the first few percent, as on getartcraft.com: at
        // the very top of the page there is nothing to read yet.
        const needleIn = Math.max(zoom, clamp01((p - 0.004) / 0.026));
        if (Math.abs(needleIn - needleShown) > 0.004 || (needleIn === 0) !== (needleShown === 0)) {
          needleShown = needleIn;
          needle.style.opacity = needleIn.toFixed(3);
        }
        const span = limit + h;
        const speed = Math.min(1, Math.abs(velocity) / 1600);
        for (let i = 0; i <= 100; i++) {
          const tapeY = railTop + (i / 100) * span - scrollY;
          const mapY = railTop + (i / 100) * h;
          const ty = tapeY + (mapY - tapeY) * zoom;
          const dist = Math.abs(ty - needleY);
          const stretch = 1 + 0.6 * speed * Math.max(0, 1 - dist / 180);
          const visible = ty > railTop - 20 && ty < railTop + h + 20;
          const tick = ticks[i];
          tick.style.transform = `translate3d(0,${ty.toFixed(1)}px,0) scaleX(${stretch.toFixed(3)})`;
          tick.style.opacity = visible ? "" : "0";
          if (visible) setInvert(tick, inBand(ty));
          // A tick's number never sits under the readout riding the needle.
          const label = tickLabels[i];
          if (label) {
            const near = dist < 18 && zoom < 0.5 && needleShown > 0.3;
            if (label.dataset.near !== String(near)) {
              label.dataset.near = String(near);
              label.style.opacity = near ? "0" : "";
            }
          }
        }
        bracket.style.opacity = zoom.toFixed(3);
        mapFrost.style.opacity = zoom.toFixed(3);
        if (zoom > 0) tint(mapFrost, bands);
        const vis0 = scrollY / (limit + vh);
        const vis1 = (scrollY + vh) / (limit + vh);
        bracket.style.transform = `translate3d(0,${(railTop + vis0 * h).toFixed(1)}px,0)`;
        bracket.style.height = `${((vis1 - vis0) * h).toFixed(1)}px`;
        for (const mw of mapWords) {
          const top = mw.entry.anchor.getBoundingClientRect().top + scrollY;
          const yy = railTop + clamp01(top / (limit + vh)) * h;
          mw.el.style.transform = `translate3d(0,${yy.toFixed(1)}px,0) translateY(-50%)`;
          mw.el.style.opacity = zoom.toFixed(3);
          if (zoom > 0) setInvert(mw.el, inBand(yy));
        }
        ghost.style.opacity = ghostY >= 0 ? "1" : "0";
        if (ghostY >= 0) ghost.style.transform = `translate3d(0,${ghostY.toFixed(1)}px,0)`;
        const pct = Math.round(p * 100);
        if (pct !== lastPct) {
          lastPct = pct;
          const str = String(pct).padStart(3, "0");
          digits.forEach((dEl, i) => (dEl.style.transform = `translateY(${-Number(str[i])}em)`));
        }
      };
      off = onFrame(frame, 10);
      layer.dataset.ready = "";

      return () => {
        layer.removeEventListener("click", onClick);
        rail.removeEventListener("pointerenter", onEnter);
        rail.removeEventListener("pointerleave", onLeave);
        rail.removeEventListener("pointermove", onMove);
        rail.removeEventListener("pointerdown", onDown);
        rail.removeEventListener("pointerup", onUp);
        name?.dispose();
      };
    };

    let teardown: (() => void) | undefined;
    const ready = document.fonts?.ready ?? Promise.resolve();
    ready.then(() => {
      if (!disposed) teardown = build();
    });

    return () => {
      disposed = true;
      off?.();
      teardown?.();
      layer.replaceChildren();
      nameLayer?.replaceChildren();
      delete root.dataset.hudActive;
    };
  }, []);

  return (
    <>
      <div ref={nameRef} aria-hidden="true" className="hud-name" />
      <div aria-hidden="true" className="hud">
        <div ref={queueRef} className="hud-queue" />
        <div ref={railRef} className="hud-rail">
          <span className="hud-rail-frost" />
          <span className="hud-mapfrost" data-mapfrost>
            <span className="hud-tint" />
            <span className="hud-tint hud-tint-x" />
          </span>
          <span className="hud-tape" data-tape />
          <span className="hud-words" data-words />
          <span className="hud-bracket" data-bracket />
          <span className="hud-ghost" data-ghost />
          <span className="hud-needle" data-needle>
            <span className="hud-readout">
              {[0, 1, 2].map((i) => (
                <span key={i} className="hud-digit">
                  <span data-digit>
                    {Array.from({ length: 10 }, (_, n) => (
                      <span key={n}>{n}</span>
                    ))}
                  </span>
                </span>
              ))}
              <span className="hud-pct">%</span>
            </span>
          </span>
        </div>
      </div>
    </>
  );
}
