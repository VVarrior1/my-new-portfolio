"use client";

import { useEffect, useRef } from "react";
import { emitFlow } from "@/lib/flow-bus";
import { getReadout, subscribeReadout, type Readout } from "@/lib/sim-readout";
import { onFrame } from "@/lib/ticker";

/**
 * A point on the spine: where the wire meets a section. A zero-size marker; the spine draws the
 * node. `route` is what the packet's tag shows once it has passed here.
 */
export function Station({ route, role, className = "" }: { route: string; role?: "origin" | "end"; className?: string }) {
  return <span aria-hidden="true" className={`station ${className}`} data-station={role ?? ""} data-route={route} />;
}

/**
 * The spine: one wire in the left lane, from the simulator down to the contact section. A request
 * (the packet) rides it at the middle of the screen as you scroll, lighting each station it passes,
 * and leaves a thread of the accent in the liquid behind it. Its tag carries the simulator's health:
 * "GET /work · 84 ms" while it is healthy, "503" in the fail colour once you've broken it.
 * Laptops and up; decoration only.
 */
export function Spine() {
  const lineRef = useRef<HTMLSpanElement>(null);
  const packetRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const line = lineRef.current;
    const packet = packetRef.current;
    if (!line || !packet) return;
    const lit = line.querySelector<HTMLElement>("[data-lit]")!;
    const nodes = line.querySelector<HTMLElement>("[data-nodes]")!;
    const main = line.parentElement!;
    const methodEl = packet.querySelector<HTMLElement>("[data-method]")!;
    const routeEl = packet.querySelector<HTMLElement>("[data-route]")!;
    const latencyEl = packet.querySelector<HTMLElement>("[data-latency]")!;
    const desktop = window.matchMedia("(min-width: 1024px)");
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");

    type Stop = { el: HTMLElement; y: number; node: HTMLElement; route: string };
    let stops: Stop[] = [];
    let top = 0;
    let bottom = 0;
    let lane = 0;

    const place = () => {
      const stations = Array.from(document.querySelectorAll<HTMLElement>("[data-station]"));
      const base = main.getBoundingClientRect().top + window.scrollY;
      const wrap = document.querySelector<HTMLElement>(".wrap");
      if (wrap) {
        const r = wrap.getBoundingClientRect();
        const pad = parseFloat(getComputedStyle(wrap).paddingLeft) || 32;
        lane = Math.round(r.left + pad * 0.42);
      }
      nodes.replaceChildren();
      stops = stations.map((el) => {
        const y = el.getBoundingClientRect().top + window.scrollY - base;
        const node = document.createElement("span");
        node.className = "spine-node";
        node.style.top = `${y - top}px`;
        nodes.appendChild(node);
        return { el, y, node, route: el.dataset.route || "/" };
      });
      const origin = stops.find((s) => s.el.dataset.station === "origin");
      const end = stops.find((s) => s.el.dataset.station === "end");
      top = origin ? origin.y : 0;
      bottom = end ? end.y : main.offsetHeight;
      for (const s of stops) s.node.style.top = `${s.y - top}px`;
      line.style.transform = `translate3d(${lane}px, ${top}px, 0)`;
      line.style.height = `${Math.max(0, bottom - top)}px`;
      packet.style.left = `${lane}px`;
      line.dataset.placed = "";
    };
    place();
    const ro = new ResizeObserver(place);
    ro.observe(main);
    document.fonts?.ready.then(place);

    const showHealth = (r: Readout) => {
      if (r.state === "paused" || r.state === "idle") return;
      packet.dataset.state = r.state;
      methodEl.textContent = r.state === "failing" ? "503" : "GET";
      latencyEl.textContent = r.p99 === null ? "" : `· ${r.p99 >= 1000 ? `${(r.p99 / 1000).toFixed(1)} s` : `${Math.round(r.p99)} ms`}`;
    };
    showHealth(getReadout());
    const unsubscribe = subscribeReadout(() => showHealth(getReadout()));

    let lastRoute = "";
    let trail = 0;
    const off = onFrame((fr) => {
      if (!desktop.matches || reduced.matches) {
        packet.dataset.on = "false";
        return;
      }
      const base = main.getBoundingClientRect().top + fr.y;
      const at = fr.y + fr.vh * 0.5 - base;
      const on = at > top && at < bottom;
      packet.dataset.on = on ? "true" : "false";
      lit.style.transform = `scaleY(${Math.max(0, Math.min(1, (at - top) / Math.max(1, bottom - top))).toFixed(4)})`;
      let route = "/";
      for (const s of stops) {
        const passed = s.y <= at;
        if (passed) route = s.route;
        s.node.toggleAttribute("data-lit", passed);
      }
      if (route !== lastRoute) {
        lastRoute = route;
        routeEl.textContent = route;
      }
      // The packet stretches with speed and pulls a thread of the accent through the liquid.
      const v = fr.velocity;
      packet.style.setProperty("--stretch", (1 + Math.min(1.4, Math.abs(v) / 1400)).toFixed(3));
      trail += fr.dt;
      if (on && Math.abs(v) > 60 && trail > 1 / 40) {
        trail = 0;
        const strength = Math.min(1, Math.abs(v) / 2400);
        const failing = packet.dataset.state === "failing";
        emitFlow({
          kind: "stir",
          x: lane,
          y: fr.vh * 0.5 + Math.sign(v) * 10,
          dx: 0,
          dy: Math.sign(v) * 260 * strength,
          ink: failing ? 0.05 * strength : 0,
          accent: failing ? 0 : 0.05 * strength,
          radius: 0.012,
        });
      }
    }, 30);

    return () => {
      ro.disconnect();
      unsubscribe();
      off();
    };
  }, []);

  return (
    <>
      <span ref={lineRef} aria-hidden="true" className="spine">
        <span className="spine-lit" data-lit />
        <span data-nodes />
      </span>
      <span ref={packetRef} aria-hidden="true" className="packet" data-on="false">
        <svg className="packet-tag" width="16" height="260" viewBox="0 0 16 260">
          <text transform="translate(12 252) rotate(-90)">
            <tspan data-method>GET</tspan> <tspan data-route>/</tspan> <tspan data-latency />
          </text>
        </svg>
        <span className="packet-capsule" />
      </span>
    </>
  );
}
