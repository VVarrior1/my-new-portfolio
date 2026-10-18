"use client";

import { useEffect, useRef } from "react";
import { setPacket, type PacketHealth } from "@/lib/flow-bus";
import { getReadout, subscribeReadout, type Readout } from "@/lib/sim-readout";
import { getSmooth } from "@/lib/smooth-scroll";

/**
 * The home page's scroll choreography, all driven by one requestAnimationFrame loop.
 *
 * - The spine: a wire that leaves the simulator, runs out to the frame's left edge and down the
 *   whole page to the contact section. A packet (one request) rides it at the middle of the screen,
 *   inking the wire behind it and lighting each section's station as it passes. It carries the
 *   simulator's health: its tag reads `GET /work · 66 ms`, or `503` once requests are failing, and
 *   its wake in the liquid (components/liquid-field.tsx) takes the same colour. At the contact
 *   section it is delivered.
 * - Screenshots open like a window as they enter, and the image settles inside the frame.
 * - Figures count up once, the experience strip lights the role you're reading, the contact
 *   portrait assembles, the marquee runs faster while you scroll, and hover fills on rows and cards
 *   come in from the side the pointer entered.
 *
 * Progressive enhancement: everything is readable and in place before this runs. Under reduced
 * motion the wire is drawn fully lit, the packet sits at the delivery end, and nothing moves.
 */

type Point = { x: number; y: number };

const METHOD: Record<PacketHealth, string> = { healthy: "GET", slow: "GET", failing: "503" };
const formatLatency = (ms: number) => (ms >= 1000 ? `${(ms / 1000).toFixed(1)} s` : `${Math.round(ms)} ms`);
const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);

export function Choreo() {
  const svgRef = useRef<SVGSVGElement>(null);
  const packetRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const svg = svgRef.current;
    const packet = packetRef.current;
    const main = document.getElementById("main");
    if (!svg || !packet || !main) return;
    const wire = svg.querySelector<SVGPathElement>("[data-wire]")!;
    const lit = svg.querySelector<SVGPathElement>("[data-lit]")!;
    const methodEl = packet.querySelector<SVGTSpanElement>("[data-method]")!;
    const routeEl = packet.querySelector<SVGTSpanElement>("[data-route]")!;
    const latencyEl = packet.querySelector<SVGTSpanElement>("[data-latency]")!;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
    const root = document.documentElement;

    // ---- Geometry: the spine's polyline in main's coordinates ----------------------------------
    let path: Point[] = [];
    let lengths: number[] = [];
    let total = 0;
    let originY = 0;
    let stations: Array<{ el: HTMLElement; s: number; route: string }> = [];

    const measure = () => {
      const box = main.getBoundingClientRect();
      const origin = document.querySelector<HTMLElement>("[data-spine-origin]");
      const frame = document.querySelector<HTMLElement>("[data-spine-frame]");
      const end = document.querySelector<HTMLElement>('[data-station="end"]');
      if (!origin || !frame || !end) return;
      const o = origin.getBoundingClientRect();
      const f = frame.getBoundingClientRect();
      const e = end.getBoundingClientRect();
      const x0 = Math.round(o.left - box.left + Math.min(28, o.width * 0.08));
      const y0 = Math.round(o.bottom - box.top);
      const spineX = Math.round(f.left - box.left) + 0.5;
      const turn = y0 + 40;
      const endY = Math.round(e.top - box.top + e.height / 2);
      path = [
        { x: x0, y: y0 },
        { x: x0, y: turn },
        { x: spineX, y: turn },
        { x: spineX, y: endY },
      ];
      lengths = [0];
      for (let i = 1; i < path.length; i++) lengths.push(lengths[i - 1] + Math.hypot(path[i].x - path[i - 1].x, path[i].y - path[i - 1].y));
      total = lengths[lengths.length - 1];
      originY = y0;
      const d = path.map((p, i) => `${i ? "L" : "M"}${p.x} ${p.y}`).join(" ");
      wire.setAttribute("d", d);
      lit.setAttribute("d", d);
      svg.setAttribute("viewBox", `0 0 ${Math.round(box.width)} ${Math.round(box.height)}`);
      svg.style.height = `${Math.round(box.height)}px`;
      stations = Array.from(document.querySelectorAll<HTMLElement>("[data-station]")).map((el) => {
        const r = el.getBoundingClientRect();
        const y = r.top - box.top + r.height / 2;
        return { el, s: lengths[2] + (y - turn), route: el.dataset.route ?? "/" };
      });
      svg.dataset.placed = "";
    };

    /** The point at arc length s along the path. */
    const at = (s: number): Point => {
      for (let i = 1; i < path.length; i++) {
        if (s <= lengths[i] || i === path.length - 1) {
          const t = clamp01((s - lengths[i - 1]) / Math.max(1, lengths[i] - lengths[i - 1]));
          return { x: path[i - 1].x + (path[i].x - path[i - 1].x) * t, y: path[i - 1].y + (path[i].y - path[i - 1].y) * t };
        }
      }
      return path[0];
    };

    /**
     * Where the packet is for a scroll position. Its target is the middle of the screen; while the
     * wire runs sideways (out of the simulator) the horizontal run is spread over some scroll, so the
     * packet slides along it instead of jumping.
     */
    const SIDE = 0.55;
    const CATCH = 700;
    const arcFor = (scrollY: number) => {
      const vh = window.innerHeight;
      const maxScroll = Math.max(0, document.documentElement.scrollHeight - vh);
      // The delivery point sits low on the last screen; over the last screen of scroll the packet
      // drifts down from the middle so it arrives exactly when the page bottoms out.
      const short = Math.max(0, path[path.length - 1].y + main.offsetTop - (maxScroll + vh * 0.5));
      const ramp = clamp01((scrollY - (maxScroll - vh)) / vh);
      const target = scrollY + vh * 0.5 + short * ramp;
      const u = target - main.offsetTop - originY;
      if (u <= 0) return 0;
      const drop = lengths[1];
      if (u <= drop) return u;
      const side = lengths[2] - lengths[1];
      if (u <= drop + side * SIDE) return drop + (u - drop) / SIDE;
      // Back on the vertical, it runs a little faster than the page until it has caught up with the
      // middle of the screen again (over CATCH px of scroll), then rides there.
      const v = u - drop - side * SIDE;
      const lag = side * SIDE;
      return Math.min(total, lengths[2] + Math.min(v * (1 + lag / CATCH), v + lag));
    };

    // ---- Health -------------------------------------------------------------------------------
    let health: PacketHealth = "healthy";
    let latency = "";
    let route = "/";
    let delivered = false;
    const label = () => {
      const method = delivered && health !== "failing" ? "200" : METHOD[health];
      if (methodEl.textContent !== method) methodEl.textContent = method;
      const r = delivered ? "/contact" : route;
      if (routeEl.textContent !== r) routeEl.textContent = r;
      const l = latency ? `· ${latency}` : "";
      if (latencyEl.textContent !== l) latencyEl.textContent = l;
    };
    const showHealth = (readout: Readout) => {
      if (readout.state === "paused" || readout.state === "idle") return;
      health = readout.state === "failing" ? "failing" : readout.state === "slow" ? "slow" : "healthy";
      latency = readout.p99 === null ? "" : formatLatency(readout.p99);
      packet.dataset.state = health;
      setPacket({ health });
      label();
    };
    showHealth(getReadout());
    const unsubscribe = subscribeReadout(() => showHealth(getReadout()));

    // ---- Things that only need an observer ------------------------------------------------------
    const cleanups: Array<() => void> = [];

    // Experience: light the lane of the role you're reading.
    const strip = document.querySelector<HTMLElement>("[data-strip]");
    if (strip) {
      const lanes = Array.from(strip.querySelectorAll<HTMLElement>("[data-lane]"));
      const visible = new Set<string>();
      const io = new IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            const role = (entry.target as HTMLElement).dataset.role ?? "";
            if (entry.isIntersecting) visible.add(role);
            else visible.delete(role);
          }
          const active = Array.from(visible).sort()[0];
          for (const lane of lanes) lane.toggleAttribute("data-on", lane.dataset.lane === active);
          if (active === undefined) delete strip.dataset.active;
          else strip.dataset.active = active;
        },
        { rootMargin: "-45% 0px -45% 0px" },
      );
      document.querySelectorAll("[data-role]").forEach((el) => io.observe(el));
      cleanups.push(() => io.disconnect());
    }

    // Hover fills that come in from the edge the pointer crossed (rows and cards).
    const onEnter = (event: PointerEvent) => {
      const el = (event.target as Element | null)?.closest?.("[data-dir-hover]") as HTMLElement | null;
      if (!el || event.pointerType === "touch") return;
      const r = el.getBoundingClientRect();
      const fromTop = event.clientY < r.top + r.height / 2;
      el.style.setProperty("--from", fromTop ? "-101%" : "101%");
    };
    document.addEventListener("pointerover", onEnter, { passive: true });
    document.addEventListener("pointerout", onEnter, { passive: true });
    cleanups.push(() => {
      document.removeEventListener("pointerover", onEnter);
      document.removeEventListener("pointerout", onEnter);
    });

    measure();
    const resize = new ResizeObserver(() => measure());
    resize.observe(main);
    cleanups.push(() => resize.disconnect());
    void document.fonts?.ready.then(measure);

    // ---- Reduced motion: a finished drawing -------------------------------------------------------
    if (reduce.matches) {
      lit.style.strokeDasharray = "none";
      for (const station of stations) station.el.setAttribute("data-lit", "");
      const end = at(total);
      packet.style.transform = `translate3d(${end.x}px, ${end.y}px, 0)`;
      delivered = true;
      packet.dataset.delivered = "";
      label();
      packet.dataset.on = "";
      return () => {
        unsubscribe();
        cleanups.forEach((fn) => fn());
      };
    }

    root.dataset.choreo = "on";

    // Counters run once, when they first scroll in.
    const counters = Array.from(document.querySelectorAll<HTMLElement>("[data-count]"));
    const countIo = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          countIo.unobserve(entry.target);
          runCount(entry.target as HTMLElement);
        }
      },
      { rootMargin: "0px 0px -12% 0px" },
    );
    counters.forEach((el) => {
      el.setAttribute("data-armed", "");
      countIo.observe(el);
    });
    cleanups.push(() => countIo.disconnect());

    // Scroll-scrubbed pieces: screenshot windows and the contact portrait.
    const windows = Array.from(document.querySelectorAll<HTMLElement>("[data-scrub]"));
    const marquees = Array.from(document.querySelectorAll<HTMLElement>("[data-marquee] [data-row]"));
    const rows = marquees.map((row) => row.getAnimations()[0]).filter(Boolean) as Animation[];

    let frame = 0;
    let lastY = -1;
    let velocity = 0;
    let shownS = -1;

    const update = () => {
      const y = window.scrollY;
      const vh = window.innerHeight;
      const raw = lastY < 0 ? 0 : y - lastY;
      lastY = y;
      const smooth = getSmooth();
      velocity += ((smooth ? smooth.velocity : raw) - velocity) * 0.25;

      // The packet.
      const s = arcFor(y);
      if (Math.abs(s - shownS) > 0.25) {
        shownS = s;
        const p = at(s);
        packet.style.transform = `translate3d(${p.x}px, ${p.y}px, 0)`;
        lit.style.strokeDasharray = `${s} ${total + 10}`;
        packet.toggleAttribute("data-side", s > lengths[1] && s < lengths[2]);
        let passed = "/";
        for (const station of stations) {
          const on = s >= station.s - 1;
          if (on !== station.el.hasAttribute("data-lit")) station.el.toggleAttribute("data-lit", on);
          if (on) passed = station.route;
        }
        route = passed;
        const end = s >= total - 1;
        if (end !== delivered) {
          delivered = end;
          packet.toggleAttribute("data-delivered", end);
          document.querySelector("[data-terminal]")?.toggleAttribute("data-delivered", end);
        }
        label();
      }
      const mainTop = main.getBoundingClientRect().top;
      const p = at(s);
      setPacket({ on: true, x: p.x + main.getBoundingClientRect().left, y: p.y + mainTop, speed: velocity });
      packet.style.setProperty("--stretch", String(1 + Math.min(1.4, Math.abs(velocity) / 24)));

      // Windows open as they rise through the bottom 80% of the screen.
      for (const el of windows) {
        const r = el.getBoundingClientRect();
        if (r.bottom < -100 || r.top > vh + 100) continue;
        const t = easeOutCubic(clamp01((vh - r.top) / (vh * 0.8)));
        el.style.setProperty("--open", t.toFixed(4));
      }

      // The marquee leans into the scroll.
      const rate = 1 + Math.min(5, Math.abs(velocity) * 0.22);
      for (const anim of rows) anim.playbackRate = rate;
    };

    const loop = () => {
      frame = requestAnimationFrame(loop);
      if (document.hidden) return;
      update();
    };
    frame = requestAnimationFrame(loop);
    packet.dataset.on = "";

    return () => {
      cancelAnimationFrame(frame);
      unsubscribe();
      cleanups.forEach((fn) => fn());
      setPacket({ on: false });
      delete root.dataset.choreo;
    };
  }, []);

  return (
    <div aria-hidden="true" className="spine">
      <svg ref={svgRef} className="spine-svg" preserveAspectRatio="none">
        <path data-wire className="spine-wire" pathLength={1} />
        <path data-lit className="spine-lit" />
      </svg>
      <span ref={packetRef} className="packet" data-state="healthy">
        <span className="packet-capsule" />
        {/* SVG text never registers as a layout shift while the tag changes. */}
        <svg className="packet-tag" width="16" height="240" viewBox="0 0 16 240">
          <text transform="translate(12 236) rotate(-90)">
            <tspan data-method>GET</tspan> <tspan data-route>/</tspan> <tspan data-latency />
          </text>
        </svg>
      </span>
    </div>
  );
}

/** Counts a figure up from zero over its final value (components/count.tsx). */
function runCount(el: HTMLElement) {
  const target = Number(el.dataset.count);
  const runner = el.querySelector<HTMLElement>("[data-run]");
  if (!runner || !Number.isFinite(target)) return;
  const decimals = (el.dataset.count?.split(".")[1] ?? "").length;
  const start = performance.now();
  const duration = 1400;
  el.setAttribute("data-counting", "");
  const tick = (now: number) => {
    const t = clamp01((now - start) / duration);
    const v = target * easeOutCubic(t);
    runner.textContent = `${el.dataset.prefix ?? ""}${v.toFixed(decimals)}${el.dataset.suffix ?? ""}`;
    if (t < 1) requestAnimationFrame(tick);
    else el.removeAttribute("data-counting");
  };
  requestAnimationFrame(tick);
}
