"use client";

import { useEffect, useRef } from "react";
import { emitFlow } from "@/lib/flow-bus";
import { clamp01, packetScreenY } from "@/lib/hud-math";
import { onFrame } from "@/lib/ticker";

/**
 * A point on the spine: where the wire meets a section. A zero-size marker; the spine draws the
 * node. `route` is what the packet's tag shows once it has passed here. The "end" station sits
 * beside the key the packet is delivered to.
 */
export function Station({ route, role, className = "" }: { route: string; role?: "origin" | "end"; className?: string }) {
  return <span aria-hidden="true" className={`station ${className}`} data-station={role ?? ""} data-route={route} />;
}

/** An element's top inside `root` from the offset chain, so a part caught mid-entrance (moved by a
 * transform) is still measured where it rests. Null when `root` isn't an offset ancestor. */
function topIn(el: HTMLElement, root: HTMLElement): number | null {
  let y = 0;
  let node: HTMLElement | null = el;
  while (node && node !== root) {
    y += node.offsetTop;
    node = node.offsetParent as HTMLElement | null;
  }
  return node === root ? y : null;
}

/**
 * The spine: one wire in the left lane, from the hero down to the contact keys. A request (the
 * packet) rides it at the middle of the screen as you scroll, lighting each station it passes, and
 * leaves a thread of the accent in the liquid behind it. Its tag reads the route it has reached
 * ("GET /work"). Over the last screen of scroll it drifts down from the middle so that it arrives at
 * the bottom of the page exactly beside "Email me": the wire branches across to the key and the tag
 * reads "200 /contact".
 * Laptops and up; decoration only. Under reduced motion it is a finished drawing: the wire lit, the
 * packet delivered.
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
    const branch = line.querySelector<HTMLElement>("[data-branch]")!;
    const main = line.parentElement!;
    const methodEl = packet.querySelector<HTMLElement>("[data-method]")!;
    const routeEl = packet.querySelector<HTMLElement>("[data-route]")!;
    const terminal = document.querySelector<HTMLElement>("[data-terminal]");
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
        const y = topIn(el, main) ?? el.getBoundingClientRect().top + window.scrollY - base;
        const node = document.createElement("span");
        node.className = el.dataset.station === "end" ? "spine-node spine-node-end" : "spine-node";
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
      // The branch from the wire's end across to the key it delivers to.
      if (terminal) {
        const k = terminal.getBoundingClientRect();
        branch.style.width = `${Math.max(0, Math.round(k.left - lane - 10))}px`;
      }
      line.dataset.placed = "";
      if (reduced.matches) rest();
    };

    let route = "/";
    let delivered = false;
    const label = () => {
      const method = delivered ? "200" : "GET";
      if (methodEl.textContent !== method) methodEl.textContent = method;
      const r = delivered ? "/contact" : route;
      if (routeEl.textContent !== r) routeEl.textContent = r;
    };
    const setDelivered = (value: boolean) => {
      if (value === delivered) return;
      delivered = value;
      packet.toggleAttribute("data-delivered", value);
      line.toggleAttribute("data-delivered", value);
      terminal?.toggleAttribute("data-delivered", value);
      label();
    };

    /** Reduced motion: the finished drawing. */
    const rest = () => {
      lit.style.transform = "none";
      for (const s of stops) s.node.setAttribute("data-lit", "");
      packet.dataset.rest = "";
      packet.dataset.on = "true";
      packet.style.top = `${bottom}px`;
      packet.style.transform = "";
      setDelivered(true);
    };

    place();
    const ro = new ResizeObserver(place);
    ro.observe(main);
    document.fonts?.ready.then(place);

    if (reduced.matches) return () => ro.disconnect();

    let lastRoute = "";
    let trail = 0;
    const off = onFrame((fr) => {
      if (!desktop.matches) {
        packet.dataset.on = "false";
        return;
      }
      const base = main.getBoundingClientRect().top + fr.y;
      // Where on screen the packet rides: the middle, until the last screen of scroll, where it
      // drifts down so that it reaches the end station exactly when the page bottoms out.
      const screenY = packetScreenY(fr.y, fr.limit, fr.vh, base + bottom);
      const at = Math.min(bottom, fr.y + screenY - base);
      const on = at > top;
      packet.dataset.on = on ? "true" : "false";
      packet.style.transform = `translate3d(0,${(screenY - fr.vh * 0.5).toFixed(1)}px,0)`;
      lit.style.transform = `scaleY(${clamp01((at - top) / Math.max(1, bottom - top)).toFixed(4)})`;
      let passed = "/";
      for (const s of stops) {
        const p = s.y <= at + 1;
        if (p) passed = s.route;
        if (p !== s.node.hasAttribute("data-lit")) s.node.toggleAttribute("data-lit", p);
      }
      setDelivered(at >= bottom - 2);
      if (passed !== lastRoute) {
        lastRoute = passed;
        route = passed;
        label();
      }
      // The packet stretches with speed and pulls a thread of the accent through the liquid.
      const v = fr.velocity;
      packet.style.setProperty("--stretch", (1 + Math.min(1.4, Math.abs(v) / 1400)).toFixed(3));
      trail += fr.dt;
      if (on && !delivered && Math.abs(v) > 40 && trail > 1 / 40) {
        trail = 0;
        const strength = Math.min(1, 0.25 + Math.abs(v) / 2000);
        emitFlow({
          kind: "stir",
          x: lane,
          y: screenY + Math.sign(v) * 10,
          dx: 0,
          dy: Math.sign(v) * 260 * strength,
          ink: 0.01 * strength,
          accent: 0.07 * strength,
          radius: 0.012,
        });
      }
    }, 30);

    return () => {
      ro.disconnect();
      off();
    };
  }, []);

  return (
    <>
      <span ref={lineRef} aria-hidden="true" className="spine">
        <span className="spine-lit" data-lit />
        <span data-nodes />
        <span className="spine-branch" data-branch />
      </span>
      <span ref={packetRef} aria-hidden="true" className="packet" data-on="false">
        <svg className="packet-tag" width="16" height="260" viewBox="0 0 16 260">
          <text transform="translate(12 252) rotate(-90)">
            <tspan data-method>GET</tspan> <tspan data-route>/</tspan>
          </text>
        </svg>
        <span className="packet-capsule" />
      </span>
    </>
  );
}
