"use client";

import { useEffect, useRef, useState } from "react";
import { emitFlow } from "@/lib/flow-bus";
import { clamp01, easeInOutCubic, flipProgress, letterProgress, quad } from "@/lib/hud-math";
import { getLenis, onFrame, scrollToTarget, type Frame } from "@/lib/ticker";

// The HUD: the page's scroll signature, after getartcraft.com/apps.
//
// Section names wait in a queue on the right edge, set sideways like the spines of books. When a
// section reaches the top of the screen its name's letters fly one by one along curved paths,
// tumbling as they go, and dock upright in the top-right corner; earlier names shrink into a
// breadcrumb stack above it. Project names don't queue: their poster letters lift off the page
// itself and fly into the stack. Flying letters stir the liquid under them. A flip left half-done
// when you stop scrolling finishes (or reverts) on its own, so letters never rest mid-air.
//
// On the right edge, a ruler: tick tape that slides with the page, a needle and a rolling percent
// readout; point at it and it zooms out into a map of the whole page with every section on it.
// Click or drag to travel.
//
// Laptops and desktops only (a fine pointer, 1024px and up, motion allowed). Everything here is
// decoration (aria-hidden); the header nav and the in-page headings carry the same information.

const SIZE = 40; // HUD letter size, px
const STAGGER = 0.16;
const QUEUE_SCALE = 0.4;
const STACK_SCALE = 0.5;
const RAIL = 56;
const NAV = 64;

type Entry = {
  word: string;
  index: string;
  anchor: HTMLElement;
  /** Letters on the page that lift off (project posters); null for queued section names. */
  source: HTMLElement[] | null;
  queued: boolean;
  letters: HTMLSpanElement[];
  adv: number[];
  cum: number[];
  total: number;
  tumble: number[];
  flipP: number;
  detach: number;
  /** Section entries own the project entries that follow them until the next section. */
  parent: number;
  prev: Array<{ x: number; y: number }>;
};

const ease = easeInOutCubic;

function measure(word: string, font: string) {
  const probe = document.createElement("span");
  probe.style.cssText = `position:absolute;visibility:hidden;white-space:pre;font:${font};left:-9999px;top:0`;
  document.body.appendChild(probe);
  const cum: number[] = [];
  const adv: number[] = [];
  let last = 0;
  for (let k = 0; k < word.length; k++) {
    probe.textContent = word.slice(0, k + 1);
    const w = probe.getBoundingClientRect().width / 100;
    cum.push(last);
    adv.push(w - last);
    last = w;
  }
  probe.remove();
  return { cum, adv, total: last };
}

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

function HudLayer() {
  const lettersRef = useRef<HTMLDivElement>(null);
  const railRef = useRef<HTMLDivElement>(null);
  const poolTop = useRef<HTMLDivElement>(null);
  const poolBottom = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const layer = lettersRef.current;
    const rail = railRef.current;
    if (!layer || !rail) return;
    let disposed = false;
    let off: (() => void) | null = null;
    const root = document.documentElement;
    root.dataset.hudActive = "";

    const build = () => {
      if (disposed) return;
      const font = getComputedStyle(layer).getPropertyValue("--hud-font").trim() || `650 100px sans-serif`;
      const nodes = Array.from(document.querySelectorAll<HTMLElement>("main [data-hud]"));
      const entries: Entry[] = [];
      let parent = -1;
      nodes.forEach((anchor, i) => {
        const word = (anchor.dataset.hud || "").toUpperCase();
        const source = anchor.dataset.hudSource !== undefined ? Array.from(anchor.querySelectorAll<HTMLElement>("[data-ltr]")) : null;
        const queued = !source;
        if (queued) parent = entries.length;
        const { cum, adv, total } = measure(word, font);
        const letters = Array.from(word).map((ch, k) => {
          const el = document.createElement("span");
          el.className = "hud-ltr";
          el.textContent = ch === " " ? " " : ch;
          el.dataset.entry = String(entries.length);
          el.dataset.k = String(k);
          layer.appendChild(el);
          return el;
        });
        // Each letter tumbles its own way, the same way on every visit.
        const tumble = Array.from(word).map((_, k) => (((i * 7 + k * 13) % 9) - 4) * 11);
        entries.push({ word, index: anchor.dataset.hudIndex || "", anchor, source, queued, letters, adv, cum, total, tumble, flipP: 0, detach: 0, parent: queued ? -1 : parent, prev: letters.map(() => ({ x: 0, y: 0 })) });
      });

      // Click a name to travel to its section.
      const onClick = (event: MouseEvent) => {
        const el = (event.target as HTMLElement).closest<HTMLElement>(".hud-ltr");
        if (!el) return;
        const entry = entries[Number(el.dataset.entry)];
        if (entry) scrollToTarget(entry.anchor, { offset: entry.queued ? -NAV : -NAV - 120, duration: 1.25 });
      };
      layer.addEventListener("click", onClick);

      // The ruler's tape.
      const tape = rail.querySelector<HTMLElement>("[data-tape]")!;
      const ticks: HTMLElement[] = [];
      for (let i = 0; i <= 100; i++) {
        const t = document.createElement("span");
        t.className = i % 5 === 0 ? "hud-tick hud-tick-major" : "hud-tick";
        if (i % 5 === 0 && i % 10 === 0) {
          const n = document.createElement("span");
          n.className = "hud-tick-n";
          n.textContent = String(i);
          t.appendChild(n);
        }
        tape.appendChild(t);
        ticks.push(t);
      }
      const words = rail.querySelector<HTMLElement>("[data-words]")!;
      const mapWords = entries
        .filter((e) => e.queued)
        .map((e) => {
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

      // Snap-to-resolve: a flip left between 4% and 96% when scrolling stops finishes on its own.
      let still = 0;
      let snapping = false;
      let inputAt = 0;
      const onInput = () => {
        inputAt = performance.now();
        snapping = false;
      };
      window.addEventListener("wheel", onInput, { passive: true });
      window.addEventListener("keydown", onInput);
      window.addEventListener("touchstart", onInput, { passive: true });

      const chapterEls = Array.from(document.querySelectorAll<HTMLElement>('[data-chapter="invert"]'));
      let lastPct = -1;
      const lit = new Map<HTMLElement, boolean>();
      const setInvert = (el: HTMLElement, value: boolean) => {
        if (lit.get(el) === value) return;
        lit.set(el, value);
        el.toggleAttribute("data-x", value);
      };

      const frame = (fr: Frame) => {
        const { vh, vw, y: scrollY, dt, velocity } = fr;
        const bands = chapterEls.map((el) => el.getBoundingClientRect());
        const inBand = (py: number, px = vw) => bands.some((b) => py > b.top + 8 && py < b.bottom - 8 && px > b.left);

        // 1. Flip progress per entry.
        for (const e of entries) {
          const top = e.anchor.getBoundingClientRect().top;
          e.flipP = flipProgress(top, vh, e.queued);
        }
        // Project names leave the stack when the next section arrives.
        for (const e of entries) {
          if (e.queued) continue;
          const next = entries.find((o, j) => o.queued && j > entries.indexOf(e));
          e.detach = next ? next.flipP : 0;
        }

        // 2. Stack positions (top-right) and queue positions (bottom-right), continuous.
        const right = vw - RAIL - 22;
        let stackY = NAV + 62;
        const flipped = entries.filter((e) => e.flipP > 0);
        const slot = new Map<Entry, { y: number; scale: number; alpha: number }>();
        flipped.forEach((e, i) => {
          // Older names shrink as the ones after them arrive; detached ones (project names once the
          // next section is here) fade out where they are and give up their room.
          const older = clamp01(flipped.slice(i + 1).reduce((s, o) => s + o.flipP * (1 - o.detach), 0));
          const scale = 1 - (1 - STACK_SCALE) * older;
          const presence = e.flipP * (1 - e.detach);
          slot.set(e, { y: stackY + (SIZE * scale) / 2, scale, alpha: (1 - 0.58 * older) * (1 - e.detach) });
          stackY += (SIZE * scale * 0.9 + 4 + 14 * (1 - older)) * presence;
        });

        let queueBottom = vh - 30;
        const queuePos = new Map<Entry, number>();
        for (const e of entries) {
          if (!e.queued) continue;
          queuePos.set(e, queueBottom);
          queueBottom -= (e.total * SIZE * QUEUE_SCALE + 18) * (1 - e.flipP);
        }

        // 3. Letters.
        let anyMid = false;
        for (const e of entries) {
          const n = e.letters.length;
          const s = slot.get(e) ?? { y: NAV + 62 + SIZE / 2, scale: 1, alpha: 1 };
          const qb = queuePos.get(e) ?? vh - 30;
          if (e.queued && e.flipP > 0.04 && e.flipP < 0.96) anyMid = true;
          const sourceRects = e.source ? e.source.map((el) => el.getBoundingClientRect()) : null;
          for (let k = 0; k < n; k++) {
            const el = e.letters[k];
            const d = ease(letterProgress(e.flipP, k, n, STAGGER));
            // Where the letter docks.
            const cx = right - (e.total - e.cum[k] - e.adv[k] / 2) * SIZE * s.scale;
            const p1 = { x: cx + e.detach * 60, y: s.y, rot: 0, scale: s.scale, alpha: s.alpha };
            // Where it waits.
            let p0: { x: number; y: number; rot: number; scale: number; alpha: number };
            if (sourceRects) {
              const r = sourceRects[k];
              const px = r ? r.left + r.width / 2 : cx;
              const py = r ? r.top + r.height / 2 : s.y;
              const scale = r ? r.height / SIZE : 1;
              p0 = { x: px, y: py, rot: 0, scale, alpha: 1 };
            } else {
              p0 = {
                x: vw - RAIL - 14 - (SIZE * QUEUE_SCALE) / 2,
                y: qb - (e.cum[k] + e.adv[k] / 2) * SIZE * QUEUE_SCALE,
                rot: -90,
                scale: QUEUE_SCALE,
                alpha: 0.42,
              };
            }
            const c = { x: (p0.x + p1.x) / 2 - (sourceRects ? 0 : 90 + k * 6), y: (p0.y + p1.y) / 2 - (sourceRects ? 120 : 0) };
            const { x, y } = quad(p0, c, p1, d);
            const rot = p0.rot + (p1.rot - p0.rot) * d + Math.sin(Math.PI * d) * e.tumble[k];
            const scale = p0.scale + (p1.scale - p0.scale) * d;
            let alpha = p0.alpha + (p1.alpha - p0.alpha) * d;
            if (sourceRects) {
              // Hand-off: the page letter shows until its twin leaves.
              const away = d > 0.002;
              const src = e.source![k];
              if (src) src.style.opacity = away ? "0" : "";
              if (!away) alpha = 0;
              if (!sourceRects[k] || sourceRects[k].bottom < -200) alpha *= 1;
            }
            el.style.transform = `translate3d(${x.toFixed(1)}px,${y.toFixed(1)}px,0) translate(-50%,-50%) rotate(${rot.toFixed(2)}deg) scale(${scale.toFixed(3)})`;
            el.style.opacity = alpha.toFixed(3);
            setInvert(el, inBand(y, x));
            // A letter in flight drags the liquid with it.
            const pv = e.prev[k];
            if (d > 0.02 && d < 0.98 && pv.x) {
              const vx = (x - pv.x) / dt;
              const vy = (y - pv.y) / dt;
              const sp = Math.hypot(vx, vy);
              if (sp > 120 && (k + Math.round(fr.now / 16)) % 2 === 0) {
                emitFlow({ kind: "stir", x, y, dx: vx * 0.35, dy: vy * 0.35, ink: Math.min(0.05, sp * 0.00002), accent: Math.min(0.06, sp * 0.00003), radius: 0.05 });
              }
            }
            pv.x = x;
            pv.y = y;
          }
        }

        // 4. Frost pools follow the letters.
        const topP = Math.max(0, ...entries.map((e) => e.flipP * (1 - e.detach)));
        if (poolTop.current) {
          poolTop.current.style.opacity = topP.toFixed(3);
          setInvert(poolTop.current, inBand(NAV + 80));
        }
        if (poolBottom.current) {
          const queued = entries.some((e) => e.queued && e.flipP < 1);
          poolBottom.current.style.opacity = queued ? "1" : "0";
          setInvert(poolBottom.current, inBand(vh - 80));
        }

        // 5. Snap-to-resolve.
        const lenis = getLenis();
        if (lenis && !dragging && !(window as { __hudNoSnap?: boolean }).__hudNoSnap) {
          still = Math.abs(velocity) < 30 ? still + dt : 0;
          if (anyMid && still > 0.4 && !snapping && performance.now() - inputAt > 400) {
            const e = entries.find((o) => o.queued && o.flipP > 0.04 && o.flipP < 0.96);
            if (e) {
              snapping = true;
              const top = e.anchor.getBoundingClientRect().top;
              const target = e.flipP >= 0.5 ? scrollY + top - 0.12 * vh + 1 : scrollY + top - (0.12 * vh + 200) - 1;
              lenis.scrollTo(Math.max(0, target), { duration: 0.7, easing: ease, force: true, onComplete: () => (snapping = false) });
            }
          }
        }

        // 6. Ruler.
        zoom += ((wantZoom ? 1 : 0) - zoom) * (1 - Math.exp(-10 * dt));
        if (Math.abs(zoom - (wantZoom ? 1 : 0)) < 0.002) zoom = wantZoom ? 1 : 0;
        const limit = Math.max(1, fr.limit);
        const p = clamp01(scrollY / limit);
        const h = railH();
        const needleY = railTop + p * h;
        needle.style.transform = `translate3d(0,${needleY.toFixed(1)}px,0)`;
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
        }
        bracket.style.opacity = zoom.toFixed(3);
        const vis0 = scrollY / (limit + vh);
        const vis1 = (scrollY + vh) / (limit + vh);
        bracket.style.transform = `translate3d(0,${(railTop + vis0 * h).toFixed(1)}px,0)`;
        bracket.style.height = `${((vis1 - vis0) * h).toFixed(1)}px`;
        for (const mw of mapWords) {
          const top = mw.entry.anchor.getBoundingClientRect().top + scrollY;
          const yy = railTop + clamp01(top / (limit + vh)) * h;
          mw.el.style.transform = `translate3d(0,${yy.toFixed(1)}px,0) translateY(-50%)`;
          mw.el.style.opacity = zoom.toFixed(3);
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
        window.removeEventListener("wheel", onInput);
        window.removeEventListener("keydown", onInput);
        window.removeEventListener("touchstart", onInput);
        for (const e of entries) e.source?.forEach((el) => (el.style.opacity = ""));
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
      delete root.dataset.hudActive;
    };
  }, []);

  return (
    <div aria-hidden="true" className="hud">
      <div ref={poolTop} className="hud-pool hud-pool-top" />
      <div ref={poolBottom} className="hud-pool hud-pool-bottom" />
      <div ref={lettersRef} className="hud-letters" />
      <div ref={railRef} className="hud-rail">
        <span className="hud-rail-frost" />
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
  );
}
