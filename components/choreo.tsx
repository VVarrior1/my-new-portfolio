"use client";

import { useEffect } from "react";
import { emitFlow } from "@/lib/flow-bus";
import { lastFrame, onFrame } from "@/lib/ticker";

/**
 * The home page's smaller motions, all off under reduced motion (the page is complete without them):
 * - figures count up as they scroll in;
 * - the off-the-clock rivers of type run at the speed you scroll, in opposite directions;
 * - rows (more projects, writing) fill with a tide from the edge the pointer came in by, and leave
 *   by the edge it goes out of, dropping a little ink into the liquid;
 * - the experience odometer rolls to the start date of the role you're reading, and its lane lights;
 * - on laptops the simulator sinks back into the liquid as you leave the hero;
 * - the contact card assembles from its parts as it arrives;
 * - after the intro, one drop lands in the liquid.
 */
export function Choreo() {
  useEffect(() => {
    // The header takes the chapter's colours while the chapter runs under it, the way the whole
    // page turns over at the waterline. Not motion, so it runs under reduced motion too.
    const header = document.querySelector<HTMLElement>("[data-site-header]");
    const chapter = document.querySelector<HTMLElement>('[data-chapter="invert"]');
    let headerOff: () => void = () => undefined;
    if (header && chapter) {
      let under = false;
      const check = () => {
        const r = chapter.getBoundingClientRect();
        const next = r.top < 32 && r.bottom > 32;
        if (next !== under) {
          under = next;
          header.toggleAttribute("data-x", next);
        }
      };
      check();
      window.addEventListener("scroll", check, { passive: true });
      headerOff = () => {
        window.removeEventListener("scroll", check);
        header.removeAttribute("data-x");
      };
    }
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return headerOff;
    const root = document.documentElement;
    const cleanups: Array<() => void> = [headerOff];

    // Counts.
    const counts = Array.from(document.querySelectorAll<HTMLElement>("[data-count]"));
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          io.unobserve(entry.target);
          const el = entry.target as HTMLElement;
          const run = el.querySelector<HTMLElement>(".count-run");
          const target = Number(el.dataset.count);
          if (!run || !Number.isFinite(target)) continue;
          const decimals = (el.dataset.count?.split(".")[1] ?? "").length;
          const t0 = performance.now();
          const duration = 1400;
          const step = (now: number) => {
            const t = Math.min(1, (now - t0) / duration);
            const e = t === 1 ? 1 : 1 - Math.pow(2, -10 * t);
            run.textContent = `${el.dataset.prefix ?? ""}${(target * e).toFixed(decimals)}${el.dataset.suffix ?? ""}`;
            if (t < 1) requestAnimationFrame(step);
          };
          run.textContent = `${el.dataset.prefix ?? ""}${(0).toFixed(decimals)}${el.dataset.suffix ?? ""}`;
          requestAnimationFrame(step);
        }
      },
      { rootMargin: "0px 0px -12% 0px" },
    );
    counts.forEach((el) => io.observe(el));
    cleanups.push(() => io.disconnect());

    // Rivers of type.
    const rows = Array.from(document.querySelectorAll<HTMLElement>("[data-marquee]"));
    if (rows.length) {
      root.dataset.marquee = "js";
      const offsets = rows.map(() => 0);
      const visible = new Set<Element>();
      const vio = new IntersectionObserver((entries) => entries.forEach((e) => (e.isIntersecting ? visible.add(e.target) : visible.delete(e.target))));
      rows.forEach((row) => vio.observe(row));
      cleanups.push(() => vio.disconnect());
      cleanups.push(
        onFrame((fr) => {
          rows.forEach((row, i) => {
            if (!visible.has(row)) return;
            const run = row.firstElementChild as HTMLElement | null;
            const width = run?.offsetWidth || 1;
            const dir = Number(row.dataset.marquee) || 1;
            const speed = 46 + Math.min(1400, Math.abs(fr.velocity)) * 0.42;
            offsets[i] = (offsets[i] + speed * fr.dt) % width;
            const x = dir > 0 ? -offsets[i] : offsets[i] - width;
            row.style.transform = `translate3d(${x.toFixed(1)}px,0,0) skewX(${(-Math.max(-12, Math.min(12, fr.velocity / 120)) * dir).toFixed(2)}deg)`;
          });
        }, 50),
      );
      cleanups.push(() => delete root.dataset.marquee);
    }

    // Tide rows and cards: the fill comes in from the edge the pointer entered by. Only with a real
    // hover (a mouse or trackpad); touch screens get none of it, so nothing can stick.
    const hover = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
    const tides = hover ? Array.from(document.querySelectorAll<HTMLElement>(".tide-row")) : [];
    // A row that slides under a still pointer while the page scrolls isn't being pointed at.
    const scrolling = () => Math.abs(lastFrame().velocity) > 150;
    const onEnter = (e: PointerEvent) => {
      if (e.pointerType === "touch" || scrolling()) return;
      const row = e.currentTarget as HTMLElement;
      const r = row.getBoundingClientRect();
      const fromTop = e.clientY < r.top + r.height / 2;
      row.style.setProperty("--from", fromTop ? "-101%" : "101%");
      row.dataset.tide = "pre";
      void row.offsetWidth;
      row.dataset.tide = "in";
      emitFlow({ kind: "stir", x: e.clientX, y: e.clientY, dx: 0, dy: fromTop ? 300 : -300, ink: 0.12, accent: 0.06, radius: 0.08 });
    };
    const onLeave = (e: PointerEvent) => {
      const row = e.currentTarget as HTMLElement;
      if (row.dataset.tide !== "in" && row.dataset.tide !== "pre") return;
      const r = row.getBoundingClientRect();
      row.style.setProperty("--to", e.clientY < r.top + r.height / 2 ? "-101%" : "101%");
      row.dataset.tide = "out";
    };
    tides.forEach((row) => {
      row.addEventListener("pointerenter", onEnter);
      row.addEventListener("pointerleave", onLeave);
    });
    cleanups.push(() =>
      tides.forEach((row) => {
        row.removeEventListener("pointerenter", onEnter);
        row.removeEventListener("pointerleave", onLeave);
      }),
    );
    const cards = hover ? Array.from(document.querySelectorAll<HTMLElement>("[data-dir-hover]")) : [];
    const onCard = (e: PointerEvent) => {
      const card = e.currentTarget as HTMLElement;
      const r = card.getBoundingClientRect();
      const fromTop = e.clientY < r.top + r.height / 2;
      if (e.type === "pointerenter") {
        if (e.pointerType === "touch" || scrolling()) return;
        card.style.setProperty("--from", fromTop ? "-101%" : "101%");
        void card.offsetWidth;
        card.toggleAttribute("data-fill", true);
        emitFlow({ kind: "stir", x: e.clientX, y: e.clientY, dx: 0, dy: fromTop ? 260 : -260, ink: 0.08, accent: 0.04, radius: 0.07 });
      } else {
        card.style.setProperty("--from", fromTop ? "-101%" : "101%");
        card.toggleAttribute("data-fill", false);
      }
    };
    cards.forEach((card) => {
      card.addEventListener("pointerenter", onCard);
      card.addEventListener("pointerleave", onCard);
    });
    cleanups.push(() =>
      cards.forEach((card) => {
        card.removeEventListener("pointerenter", onCard);
        card.removeEventListener("pointerleave", onCard);
      }),
    );



    // Experience: the odometer and the lit lane follow the role you're reading.
    const exp = document.querySelector<HTMLElement>("[data-experience]");
    if (exp) {
      const roles = Array.from(exp.querySelectorAll<HTMLElement>("[data-role]"));
      const reels = Array.from(exp.querySelectorAll<HTMLElement>("[data-reel]"));
      const lanes = Array.from(exp.querySelectorAll<HTMLElement>("[data-lane]"));
      const monthEl = exp.querySelector<HTMLElement>("[data-exp-month]");
      const companyEl = exp.querySelector<HTMLElement>("[data-exp-company]");
      let active = -1;
      cleanups.push(
        onFrame((fr) => {
          let next = 0;
          for (let i = 0; i < roles.length; i++) if (roles[i].getBoundingClientRect().top < fr.vh * 0.58) next = i;
          if (next === active) return;
          active = next;
          const role = roles[next];
          const digits = role.dataset.odo ?? "";
          reels.forEach((reel, i) => reel.style.setProperty("--n", digits[i] ?? "0"));
          if (monthEl) monthEl.textContent = role.dataset.month ?? "";
          if (companyEl) companyEl.textContent = role.dataset.company ?? "";
          lanes.forEach((lane) => lane.toggleAttribute("data-on", lane.dataset.lane === String(next)));
          exp.dataset.active = String(next);
        }, 60),
      );
    }

    // Leaving the hero on a laptop: while the name flies into the header, the simulator sinks back
    // into the liquid, tilting away and settling a little lower, like Lando Norris's head plane
    // handing over to the page. Scrubbed by the scroll; it is still fully usable at any point.
    // (The inner box, since #play's own entrance animation holds its transform.)
    const device = document.getElementById("play")?.firstElementChild as HTMLElement | null | undefined;
    if (device && window.matchMedia("(min-width: 1024px)").matches) {
      let last = -1;
      cleanups.push(
        onFrame((fr) => {
          const p = Math.max(0, Math.min(1, fr.y / (fr.vh * 0.85)));
          if (Math.abs(p - last) < 0.001) return;
          last = p;
          const e = p * p * (3 - 2 * p);
          device.style.transformOrigin = "50% 0%";
          device.style.transform = e > 0 ? `perspective(1400px) translate3d(0,${(e * 70).toFixed(1)}px,0) rotateX(${(e * 14).toFixed(2)}deg) scale(${(1 - e * 0.08).toFixed(4)})` : "";
        }, 55),
      );
      cleanups.push(() => (device.style.transform = ""));
    }

    // Contact: the parts rise into place as the section arrives.
    const contact = document.querySelector<HTMLElement>("[data-contact]");
    if (contact) {
      const parts = Array.from(contact.querySelectorAll<HTMLElement>("[data-part]"));
      cleanups.push(
        onFrame((fr) => {
          const top = contact.getBoundingClientRect().top;
          if (top > fr.vh * 1.2 || top < -fr.vh) return;
          const p = Math.max(0, Math.min(1, (fr.vh - top) / (fr.vh * 0.62)));
          const e = 1 - Math.pow(1 - p, 3);
          parts.forEach((part, i) => {
            const y = (1 - e) * (70 + i * 34);
            part.style.transform = y > 0.2 ? `translate3d(0,${y.toFixed(1)}px,0)` : "";
            part.style.opacity = (0.15 + 0.85 * Math.min(1, e * 1.3)).toFixed(3);
          });
        }, 60),
      );
      cleanups.push(() => parts.forEach((part) => ((part.style.transform = ""), (part.style.opacity = ""))));
    }

    // The intro ends with a drop landing in the pool.
    if (root.hasAttribute("data-intro")) {
      // Ink only: the accent is kept for what the simulator does.
      const t = window.setTimeout(() => emitFlow({ kind: "drop", x: window.innerWidth * 0.5, y: window.innerHeight * 0.96, size: 0.9, accent: 0.04 }), 1250);
      cleanups.push(() => window.clearTimeout(t));
    }

    return () => cleanups.forEach((fn) => fn());
  }, []);

  return null;
}
