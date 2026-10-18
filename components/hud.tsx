"use client";

import { useEffect, useRef } from "react";
import { easeInOutCubic, easeOutExpo, getSmooth } from "@/lib/smooth-scroll";
import { flipProgress, letterProgress, bezier, pctDigits } from "@/lib/hud-math";

/**
 * The instrument on the right edge (laptops and desktops with a mouse; after the getartcraft.com
 * scroll HUD):
 *
 * - Section words. Each section's name ([data-hud] on the section) is split into letters. Upcoming
 *   names wait at the bottom right; the next one stands on deck, turned up along the rail. As its
 *   section reaches the top of the screen, its letters peel off one by one, last letter first, and
 *   fly in arcs to the top-right slot, turning upright on the way. The name before it shrinks into
 *   the pile above, so the corner reads as a breadcrumb of where you've been. A flight never rests
 *   half done: if you stop mid-flight, the page settles to finish or undo it. Click a word to go
 *   to its section.
 * - The rail. A ruler tape of 1% ticks slides past a cobalt needle with a rolling percent readout;
 *   ticks near the needle stretch with scroll speed; each section start is a cobalt mark. Hover the
 *   rail and it zooms out into a map of the whole page: the words glide to where their sections
 *   are, and a bracket shows what's on screen. Click or drag on it to travel.
 *
 * It is decoration over a page that already works: aria-hidden, never focusable, and off on touch,
 * narrow screens and under reduced motion (the sections keep their own titles there).
 */

const RAIL = 60;
const NAV = 64;
const STAGGER = 0.16;
const PILE_SCALE = 0.5;
const QUEUE_SCALE = 0.48;

type Word = {
  section: HTMLElement;
  text: string;
  letters: HTMLSpanElement[];
  /** Cumulative advance before each letter and each letter's advance, at SIZE px. */
  cum: number[];
  adv: number[];
  total: number;
  /** The section's top in document px, and as a fraction of the page. */
  top: number;
  pct: number;
};

type Pose = { x: number; y: number; r: number; s: number; a: number };

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const lerpPose = (p: Pose, q: Pose, t: number): Pose => ({
  x: lerp(p.x, q.x, t),
  y: lerp(p.y, q.y, t),
  r: lerp(p.r, q.r, t),
  s: lerp(p.s, q.s, t),
  a: lerp(p.a, q.a, t),
});

export function Hud() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const host = ref.current;
    if (!host) return;
    const query = window.matchMedia("(pointer: fine) and (min-width: 1024px) and (prefers-reduced-motion: no-preference)");
    let teardown: (() => void) | null = null;
    const sync = () => {
      if (query.matches && !teardown) teardown = mount(host);
      else if (!query.matches && teardown) {
        teardown();
        teardown = null;
      }
    };
    sync();
    query.addEventListener("change", sync);
    return () => {
      query.removeEventListener("change", sync);
      teardown?.();
    };
  }, []);

  return <div ref={ref} aria-hidden="true" className="hud" />;
}

function mount(host: HTMLElement) {
  const root = document.documentElement;
  const sections = Array.from(document.querySelectorAll<HTMLElement>("[data-hud]"));
  if (sections.length === 0) return () => undefined;

  host.innerHTML = "";
  const make = <K extends keyof HTMLElementTagNameMap>(tag: K, className: string, parent: HTMLElement = host) => {
    const el = document.createElement(tag);
    el.className = className;
    parent.appendChild(el);
    return el;
  };

  // Frosted pools behind the slot and the queue, so letters read over anything.
  const poolTop = make("div", "hud-pool hud-pool-top");
  const poolBottom = make("div", "hud-pool hud-pool-bottom");

  // The rail.
  const rail = make("div", "hud-rail");
  make("div", "hud-rail-frost", rail);
  const tape = make("div", "hud-tape", rail);
  const ticks: HTMLSpanElement[] = [];
  for (let q = 0; q <= 100; q++) {
    const tick = make("span", q % 5 === 0 ? "hud-tick hud-tick-major" : "hud-tick", tape);
    tick.style.setProperty("--i", String(q));
    if (q % 5 === 0 && q < 100) {
      const n = make("span", "hud-tick-num", tick);
      n.textContent = String(q);
    }
    ticks.push(tick);
  }
  const marks = sections.map(() => make("span", "hud-mark", tape));
  const bracket = make("div", "hud-bracket", rail);
  const ghost = make("div", "hud-ghost", rail);
  const needle = make("div", "hud-needle", rail);
  const readout = make("div", "hud-readout", needle);
  const digits = [0, 1, 2].map(() => {
    const col = make("span", "hud-digit", readout);
    const strip = make("span", "hud-digit-strip", col);
    strip.textContent = "0123456789";
    return strip;
  });
  make("span", "hud-pct", readout).textContent = "%";

  // The words.
  const layer = make("div", "hud-words");
  const measurer = make("span", "hud-letter hud-measure", layer);
  const words: Word[] = sections.map((section, i) => {
    const text = (section.dataset.hud ?? "").toUpperCase();
    const letters = Array.from(text).map((ch) => {
      const span = make("span", "hud-letter", layer);
      span.textContent = ch === " " ? " " : ch;
      span.dataset.word = String(i);
      return span;
    });
    return { section, text, letters, cum: [], adv: [], total: 0, top: 0, pct: 0 };
  });

  const measureLetters = () => {
    pooled = -1;
    for (const word of words) {
      word.cum = [];
      word.adv = [];
      let prev = 0;
      for (let k = 0; k < word.text.length; k++) {
        measurer.textContent = word.text.slice(0, k + 1).replace(/ /g, " ");
        const w = measurer.getBoundingClientRect().width;
        word.cum.push(prev);
        word.adv.push(w - prev);
        prev = w;
      }
      word.total = prev;
    }
  };

  let docH = 1;
  let vh = window.innerHeight;
  let vw = window.innerWidth;
  const measureLayout = () => {
    vh = window.innerHeight;
    vw = document.documentElement.clientWidth;
    docH = document.documentElement.scrollHeight;
    for (const word of words) {
      word.top = word.section.getBoundingClientRect().top + window.scrollY;
      word.pct = word.top / Math.max(1, docH - vh);
    }
    dirty = true;
  };

  // ---- Rail geometry -------------------------------------------------------------------------
  const RT = NAV + 24;
  const RB = 28;
  const span = () => vh - RT - RB;
  const range = () => Math.max(1, docH - vh);

  // ---- State -----------------------------------------------------------------------------------
  let dirty = true;
  let zoom = 0;
  let zoomTarget = 0;
  let hoverTimer = 0;
  let pointerY: number | null = null;
  let dragging = false;
  let velocity = 0;
  let lastY = window.scrollY;
  let still = 0;
  let snapped = false;
  let lastDigits = "";
  let intro = 0;
  let lastRenderY = -1;
  let pooled = -1;
  const introStart = performance.now();

  const pose = (word: Word, i: number, k: number, fp: number[]): Pose => {
    const n = word.letters.length;
    const right = vw - RAIL - 18;
    const center = (word.cum[k] ?? 0) + (word.adv[k] ?? 0) / 2;
    // From the right edge, at scale s.
    const fromRight = (s: number) => right - (word.total - center) * s;

    const slot: Pose = { x: fromRight(1), y: NAV + 26 + i * 20 + 6, r: 0, s: 1, a: 1 };
    const pile: Pose = { x: fromRight(PILE_SCALE), y: NAV + 26 + i * 20, r: 0, s: PILE_SCALE, a: 0.45 };
    const queueY = vh - 34 - (words.length - 1 - i) * 19;
    const queue: Pose = { x: fromRight(QUEUE_SCALE), y: queueY, r: 0, s: QUEUE_SCALE, a: 0.34 };
    // On deck: turned up the rail, reading bottom to top from just above its queue line.
    const deckBottom = vh - 34 - (words.length - 1) * 19 - 30;
    const deck: Pose = { x: vw - RAIL - 16, y: deckBottom - center * 0.62, r: -90, s: 0.62, a: 0.5 };
    // Zoomed out: every word at its place on the page map.
    const zoomed: Pose = { x: right + 6 - (word.total - center) * 0.5, y: RT + word.pct * span(), r: 0, s: 0.5, a: 0.9 };

    const f = fp[i];
    const prev = i === 0 ? 1 : fp[i - 1];
    const next = i === words.length - 1 ? 0 : fp[i + 1];
    let p: Pose;
    if (f <= 0) {
      p = lerpPose(queue, deck, easeInOutCubic(Math.min(1, prev * 1.4)));
    } else if (next <= 0) {
      // In flight: last letter first, along an arc that bows into the page.
      const t = easeInOutCubic(letterProgress(f, n - 1 - k, n, STAGGER));
      const bow = 70 + Math.abs(deck.y - slot.y) * 0.06;
      const c = { x: (deck.x + slot.x) / 2 - bow, y: (deck.y + slot.y) / 2 };
      const xy = bezier(deck, c, slot, t);
      // Letters tumble a little past upright mid-flight, then settle.
      const r = lerp(deck.r, slot.r, t) + Math.sin(t * Math.PI) * 14;
      p = { x: xy.x, y: xy.y, r, s: lerp(deck.s, slot.s, t), a: lerp(deck.a, slot.a, t) };
    } else {
      p = lerpPose(slot, pile, easeInOutCubic(next));
    }
    if (zoom > 0.001) {
      const z = { ...zoomed, a: f > 0 && next <= 0 ? 1 : 0.6 };
      p = lerpPose(p, z, zoom);
    }
    // The intro: the deck and the queue settle in once.
    if (intro < 1) p.a *= easeInOutCubic(Math.min(1, Math.max(0, intro * 1.6 - (i * 0.08))));
    return p;
  };

  const render = () => {
    const y = window.scrollY;
    const fp = words.map((w) => flipProgress(w.top - y, vh));
    for (let i = 0; i < words.length; i++) {
      const word = words[i];
      for (let k = 0; k < word.letters.length; k++) {
        const p = pose(word, i, k, fp);
        const el = word.letters[k];
        el.style.transform = `translate3d(${p.x.toFixed(2)}px, ${p.y.toFixed(2)}px, 0) translate(-50%, -50%) rotate(${p.r.toFixed(2)}deg) scale(${p.s.toFixed(4)})`;
        el.style.opacity = p.a.toFixed(3);
      }
    }
    const current = fp.reduce((n, f) => (f > 0.5 ? n + 1 : n), 0);
    // The frost hugs the pile: as wide as the longest name in it, as tall as the stack.
    if (current !== pooled) {
      pooled = current;
      const widest = words.slice(0, Math.max(1, current)).reduce((m, w, i) => Math.max(m, w.total * (i === current - 1 ? 1 : PILE_SCALE)), 0);
      poolTop.style.width = `${Math.round(widest + RAIL + 120)}px`;
      poolTop.style.height = `${Math.round(26 + Math.max(0, current - 1) * 20 + 90)}px`;
    }
    poolTop.style.opacity = (Math.max(...fp) * (1 - zoom)).toFixed(3);
    poolBottom.style.opacity = ((current < words.length ? 1 : 1 - fp[words.length - 1]) * (1 - zoom) * Math.min(1, intro * 2)).toFixed(3);
    for (let i = 0; i < words.length; i++) words[i].letters.forEach((el) => el.toggleAttribute("data-current", i === current - 1));

    // The rail.
    const p = Math.min(1, Math.max(0, y / range()));
    const s = span();
    const needleY = RT + p * s;
    const tapeLen = s + range();
    const unit = lerp(tapeLen, s, zoom) / 100;
    const origin = lerp(needleY - p * tapeLen, RT, zoom);
    const v = Math.min(1, Math.abs(velocity) / 30);
    for (let q = 0; q <= 100; q++) {
      const ty = origin + q * unit;
      const near = Math.max(0, 1 - Math.abs(ty - needleY) / 180);
      const stretch = 1 + near * v * 0.6 * (1 - zoom);
      const intro01 = Math.min(1, Math.max(0, intro * 2.2 - q * 0.012));
      ticks[q].style.transform = `translate3d(0, ${ty.toFixed(2)}px, 0) scaleX(${(stretch * intro01).toFixed(3)})`;
    }
    words.forEach((w, i) => {
      marks[i].style.transform = `translate3d(0, ${(origin + w.pct * 100 * unit).toFixed(2)}px, 0)`;
    });
    needle.style.transform = `translate3d(0, ${needleY.toFixed(2)}px, 0)`;
    needle.style.opacity = Math.min(1, intro * 2).toFixed(3);
    const top = RT + (y / docH) * s;
    const bottom = RT + ((y + vh) / docH) * s;
    bracket.style.transform = `translate3d(0, ${top.toFixed(1)}px, 0)`;
    bracket.style.height = `${Math.max(6, bottom - top).toFixed(1)}px`;
    bracket.style.opacity = zoom.toFixed(3);
    const d = pctDigits(p);
    if (d.join("") !== lastDigits) {
      lastDigits = d.join("");
      d.forEach((digit, i) => (digits[i].style.transform = `translateY(${-digit}em)`));
    }
    if (pointerY !== null) {
      ghost.style.opacity = "1";
      ghost.style.transform = `translate3d(0, ${pointerY}px, 0)`;
    } else ghost.style.opacity = "0";
  };

  // ---- Travel ------------------------------------------------------------------------------------
  const targetFor = (clientY: number) => {
    const s = span();
    const y = window.scrollY;
    const p = Math.min(1, Math.max(0, y / range()));
    const needleY = RT + p * s;
    const unit = lerp(s + range(), s, zoom);
    const q = zoom > 0.5 ? (clientY - RT) / s : p + (clientY - needleY) / unit;
    return Math.min(1, Math.max(0, q)) * range();
  };
  const go = (top: number, duration = 1.25) => {
    const smooth = getSmooth();
    if (smooth) smooth.scrollTo(top, { duration, easing: easeOutExpo });
    else window.scrollTo({ top, behavior: "smooth" });
  };
  const onRailEnter = () => {
    window.clearTimeout(hoverTimer);
    hoverTimer = window.setTimeout(() => (zoomTarget = 1), 150);
  };
  const onRailLeave = () => {
    window.clearTimeout(hoverTimer);
    zoomTarget = 0;
    pointerY = null;
    dirty = true;
  };
  const onRailMove = (event: PointerEvent) => {
    pointerY = event.clientY;
    dirty = true;
    if (dragging) {
      const smooth = getSmooth();
      const top = targetFor(event.clientY);
      if (smooth) smooth.scrollTo(top, { lerp: 0.18 });
      else window.scrollTo({ top });
    }
  };
  const onRailDown = (event: PointerEvent) => {
    dragging = true;
    rail.setPointerCapture(event.pointerId);
    go(targetFor(event.clientY), 1);
  };
  const onRailUp = (event: PointerEvent) => {
    dragging = false;
    if (rail.hasPointerCapture(event.pointerId)) rail.releasePointerCapture(event.pointerId);
  };
  rail.addEventListener("pointerenter", onRailEnter);
  rail.addEventListener("pointerleave", onRailLeave);
  rail.addEventListener("pointermove", onRailMove);
  rail.addEventListener("pointerdown", onRailDown);
  rail.addEventListener("pointerup", onRailUp);

  const onWordClick = (event: MouseEvent) => {
    const el = (event.target as HTMLElement | null)?.closest?.("[data-word]") as HTMLElement | null;
    if (!el) return;
    const word = words[Number(el.dataset.word)];
    if (word) go(Math.max(0, word.top - vh * 0.12 + 1));
  };
  layer.addEventListener("click", onWordClick);

  // Any input re-arms the settle.
  const rearm = () => {
    snapped = false;
    still = 0;
  };
  window.addEventListener("wheel", rearm, { passive: true });
  window.addEventListener("keydown", rearm);
  window.addEventListener("pointerdown", rearm);

  // ---- Loop --------------------------------------------------------------------------------------
  let frame = 0;
  let last = performance.now();
  const loop = (now: number) => {
    frame = requestAnimationFrame(loop);
    if (document.hidden) return;
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    const y = window.scrollY;
    const raw = (y - lastY) / Math.max(dt, 1 / 240) / 60;
    lastY = y;
    velocity += (raw - velocity) * (1 - Math.exp(-6 * dt));
    if (y !== lastRenderY) dirty = true;
    if (intro < 1) {
      intro = Math.min(1, (now - introStart) / 1400);
      dirty = true;
    }
    const z = zoom + (zoomTarget - zoom) * (1 - Math.exp(-10 * dt));
    if (Math.abs(z - zoom) > 0.0005) {
      zoom = Math.abs(z - zoomTarget) < 0.001 ? zoomTarget : z;
      dirty = true;
    }
    if (Math.abs(velocity) > 0.01) dirty = true;

    // Settle a half-finished flight once the page has been still for 400 ms.
    if (!dragging && !snapped && Math.abs(velocity) < 0.5) {
      still += dt;
      if (still > 0.4) {
        snapped = true;
        for (const word of words) {
          const f = flipProgress(word.top - y, vh);
          if (f > 0.04 && f < 0.96) {
            const done = word.top - vh * 0.12 + 1;
            const undone = word.top - vh * 0.12 - 201;
            const smooth = getSmooth();
            const top = f >= 0.5 ? done : Math.max(0, undone);
            if (smooth) smooth.scrollTo(top, { duration: 0.7, easing: easeInOutCubic });
            break;
          }
        }
      }
    } else if (Math.abs(velocity) >= 0.5) still = 0;

    if (dirty) {
      dirty = false;
      lastRenderY = y;
      render();
    }
  };
  const onResize = () => measureLayout();
  window.addEventListener("resize", onResize);
  const resize = new ResizeObserver(() => measureLayout());
  resize.observe(document.body);

  const ready = () => {
    measureLetters();
    measureLayout();
    dirty = true;
  };
  measureLetters();
  measureLayout();
  void document.fonts?.ready.then(ready);
  document.fonts?.addEventListener?.("loadingdone", ready);

  root.dataset.hud = "on";
  frame = requestAnimationFrame(loop);

  return () => {
    cancelAnimationFrame(frame);
    window.clearTimeout(hoverTimer);
    window.removeEventListener("resize", onResize);
    window.removeEventListener("wheel", rearm);
    window.removeEventListener("keydown", rearm);
    window.removeEventListener("pointerdown", rearm);
    document.fonts?.removeEventListener?.("loadingdone", ready);
    resize.disconnect();
    host.innerHTML = "";
    delete root.dataset.hud;
  };
}
