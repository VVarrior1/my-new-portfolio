"use client";

import { useSyncExternalStore } from "react";
import { getReadout, getServerReadout, subscribeReadout, type SimState } from "@/lib/sim-readout";

const LABEL: Record<SimState, { long: string; short: string }> = {
  idle: { long: "Starting up", short: "Starting" },
  healthy: { long: "Live in your browser", short: "Live" },
  slow: { long: "Queues building", short: "Strained" },
  failing: { long: "Dropping requests", short: "Failing" },
  paused: { long: "Paused off-screen", short: "Paused" },
};

const fmt = (n: number) => n.toLocaleString("en-US");

function latency(ms: number | null) {
  if (ms === null) return "–";
  return ms >= 1000 ? `${(ms / 1000).toFixed(1)} s` : `${Math.round(ms)} ms`;
}

/**
 * The live status strip above the name: a sliver of the simulator's screen, fed by it (see
 * lib/sim-readout.ts). Its lamp is green while the system is healthy, amber when it is strained
 * and red when it drops requests. Selecting it moves focus to the simulator's traffic fader.
 */
export function SimStatus() {
  const readout = useSyncExternalStore(subscribeReadout, getReadout, getServerReadout);
  const label = LABEL[readout.state];

  const focusSim = (event: React.MouseEvent<HTMLAnchorElement>) => {
    const fader = document.querySelector<HTMLElement>('#play [role="slider"]');
    if (!fader) return;
    event.preventDefault();
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    document.getElementById("play")?.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "nearest" });
    fader.focus({ preventScroll: true });
  };

  return (
    <a href="#play" onClick={focusSim} className="screen sim-status" aria-label="Jump to the live system simulator">
      <span className="sim-status-lamp" data-state={readout.state} aria-hidden="true" />
      <span className="sim-status-label" aria-hidden="true">
        {/* The long label wherever the strip has the room: phones and the narrow desktop column get the short one. */}
        <span className="max-sm:hidden lg:max-xl:hidden">{label.long}</span>
        <span className="sm:max-lg:hidden xl:hidden">{label.short}</span>
      </span>
      <span aria-hidden="true">
        <b>{fmt(readout.requests)}</b> req
      </span>
      <span aria-hidden="true">
        p99 <b>{latency(readout.p99)}</b>
      </span>
      <span aria-hidden="true">
        <b>{fmt(readout.errors)}</b> errors
      </span>
    </a>
  );
}
