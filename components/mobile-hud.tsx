"use client";

import { useEffect, useRef, useState } from "react";
import { clamp01, easeInOutCubic as ease, letterProgress, quad } from "@/lib/hud-math";
import { onFrame } from "@/lib/ticker";

// The HUD's scroll signature on phones and tablets: as each section's big title reaches the top of
// the screen, its letters lift off the page one by one, leaving their outline behind, and fly
// (shrinking, tumbling a little) into a frosted bar under the header that reads "01 / Work". When
// the next section arrives, the docked name lifts out of the bar and the new one flies in. Scroll
// back and everything flies home. The laptop HUD (components/hud.tsx) does the same into the
// top-right corner; this one exists where that one doesn't (touch screens, under 1024px).
// Decoration only (aria-hidden): the titles stay in the page for everyone.

const BAR_TOP = 64;
const BAR_H = 34;
/** A title starts to lift when its top is this far down the screen, and has docked RANGE px later. */
const START = BAR_TOP + BAR_H + 150;
const RANGE = 150;
const STAGGER = 0.12;
const SIZE = 15;

export function MobileHud() {
  const [on, setOn] = useState(false);
  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
    const laptop = window.matchMedia("(pointer: fine) and (min-width: 1024px)");
    const update = () => setOn(!reduce.matches && !laptop.matches);
    update();
    reduce.addEventListener("change", update);
    laptop.addEventListener("change", update);
    return () => {
      reduce.removeEventListener("change", update);
      laptop.removeEventListener("change", update);
    };
  }, []);
  return on ? <MobileHudLayer /> : null;
}

type Entry = {
  index: string;
  title: HTMLElement;
  sources: HTMLElement[];
  letters: HTMLSpanElement[];
  adv: number[];
  cum: number[];
  size: number;
  tumble: number[];
  tag: HTMLSpanElement;
};

function MobileHudLayer() {
  const barRef = useRef<HTMLDivElement>(null);
  const layerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const bar = barRef.current;
    const layer = layerRef.current;
    if (!bar || !layer) return;
    let off: (() => void) | null = null;
    let disposed = false;
    const tags = bar.querySelector<HTMLElement>("[data-tags]")!;
    const chapter = document.querySelector<HTMLElement>('[data-chapter="invert"]');
    const entries: Entry[] = [];

    const build = () => {
      if (disposed) return;
      const titles = Array.from(document.querySelectorAll<HTMLElement>("main [data-mtitle]"));
      const probe = document.createElement("span");
      probe.style.cssText = "position:absolute;visibility:hidden;white-space:pre;left:-9999px;top:0";
      document.body.appendChild(probe);
      for (const title of titles) {
        const sources = Array.from(title.querySelectorAll<HTMLElement>("[data-tl]"));
        const tag = document.createElement("span");
        tag.className = "mhud-index";
        tags.appendChild(tag);
        if (!sources.length) {
          // A section without a big title (contact): its name simply shows in the bar.
          tag.innerHTML = "";
          tag.append(`${title.dataset.mtitle} / `, Object.assign(document.createElement("span"), { className: "mhud-word", textContent: title.dataset.mword ?? "" }));
          entries.push({ index: title.dataset.mtitle ?? "", title, sources, letters: [], adv: [], cum: [], size: SIZE, tumble: [], tag });
          continue;
        }
        tag.textContent = `${title.dataset.mtitle} /`;
        const cs = getComputedStyle(sources[0]);
        const size = parseFloat(cs.fontSize) || 46;
        // Advances in the title's own font and tracking, so the docked word is set like the title.
        // One property at a time: the font shorthand won't take a percentage width.
        const font = { fontFamily: cs.fontFamily, fontStyle: cs.fontStyle, fontWeight: cs.fontWeight, fontStretch: cs.fontStretch };
        Object.assign(probe.style, font, { fontSize: "100px", letterSpacing: `${((parseFloat(cs.letterSpacing) || 0) / size) * 100}px` });
        const word = sources.map((s) => s.textContent ?? "").join("");
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
        const letters = sources.map((src) => {
          const el = document.createElement("span");
          el.className = "mhud-fly";
          el.textContent = src.textContent;
          Object.assign(el.style, font, { fontSize: `${size}px` });
          layer.appendChild(el);
          return el;
        });
        const i = entries.length;
        entries.push({ index: title.dataset.mtitle ?? "", title, sources, letters, adv, cum, size, tumble: sources.map((_, k) => (((i * 5 + k * 7) % 9) - 4) * 5), tag });
      }
      probe.remove();

      let invert = false;
      const frame = () => {
        const vw = window.innerWidth;
        let presence = 0;
        const pad = vw >= 640 ? 32 : 16;
        tags.style.left = `${pad}px`;
        const x0 = pad + 38;
        const y1 = BAR_TOP + BAR_H / 2;
        entries.forEach((e, i) => {
          const top = e.title.getBoundingClientRect().top;
          const inP = clamp01((START - top) / RANGE);
          const next = entries[i + 1];
          const outP = next ? clamp01((START - next.title.getBoundingClientRect().top) / RANGE) : 0;
          const n = e.letters.length;
          const here = inP * (1 - outP);
          presence = Math.max(presence, here);
          e.tag.style.opacity = here.toFixed(3);
          e.tag.style.transform = `translate3d(0,${((1 - inP) * 10 - outP * 10).toFixed(1)}px,0)`;
          for (let k = 0; k < n; k++) {
            const el = e.letters[k];
            const src = e.sources[k];
            const d = ease(letterProgress(inP, k, n, STAGGER));
            const away = d > 0.002;
            if (src.hasAttribute("data-away") !== away) src.toggleAttribute("data-away", away);
            if (!away) {
              el.style.opacity = "0";
              continue;
            }
            const dOut = outP > 0 ? ease(letterProgress(outP, n - 1 - k, n, STAGGER)) : 0;
            const r = src.getBoundingClientRect();
            const p0 = { x: r.left + r.width / 2, y: r.top + r.height / 2 };
            const p1 = { x: x0 + (e.cum[k] + e.adv[k] / 2) * SIZE, y: y1 };
            const c = { x: p0.x + (p1.x - p0.x) * 0.25, y: p1.y + (p0.y - p1.y) * 0.15 };
            let { x, y } = quad(p0, c, p1, d);
            const s1 = SIZE / e.size;
            let scale = 1 + (s1 - 1) * d;
            const rot = Math.sin(Math.PI * d) * e.tumble[k];
            // Leaving: the docked letters lift out of the bar and fade, the last letter first.
            y -= dOut * 26;
            x += dOut * 6;
            scale *= 1 - dOut * 0.25;
            el.style.transform = `translate3d(${x.toFixed(1)}px,${y.toFixed(1)}px,0) translate(-50%,-50%) rotate(${(rot + dOut * 8).toFixed(2)}deg) scale(${scale.toFixed(4)})`;
            el.style.opacity = (1 - dOut).toFixed(3);
          }
        });
        bar.style.opacity = presence > 0 ? "1" : "0";
        // The bar takes the chapter's colours while the chapter is under it.
        if (chapter) {
          const r = chapter.getBoundingClientRect();
          const next = r.top < y1 && r.bottom > y1;
          if (next !== invert) {
            invert = next;
            bar.toggleAttribute("data-x", next);
            layer.toggleAttribute("data-x", next);
          }
        }
      };
      off = onFrame(frame, 12);
    };

    const ready = document.fonts?.ready ?? Promise.resolve();
    ready.then(build);

    return () => {
      disposed = true;
      off?.();
      for (const e of entries) e.sources.forEach((s) => s.removeAttribute("data-away"));
      layer.replaceChildren();
      tags.replaceChildren();
    };
  }, []);

  return (
    <div aria-hidden="true">
      <div ref={barRef} className="mhud-bar" data-mhud="">
        <span className="mhud-tags" data-tags />
      </div>
      <div ref={layerRef} className="mhud-layer" data-mhud="" />
    </div>
  );
}
