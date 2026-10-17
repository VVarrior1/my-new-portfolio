"use client";

import { useSyncExternalStore } from "react";
import { getReadout, getServerReadout, subscribeReadout, type SimState } from "@/lib/sim-readout";

const LABEL: Record<SimState, { long: string; short: string }> = {
  idle: { long: "Starting in your browser", short: "Starting" },
  healthy: { long: "Running in your browser", short: "Live" },
  slow: { long: "Running, queues building", short: "Slow" },
  failing: { long: "Running, shedding requests", short: "Failing" },
  paused: { long: "Paused while off-screen", short: "Paused" },
};

const fmt = (n: number) => n.toLocaleString("en-US");

/**
 * The live readout above the headline: a chip fed by the hero simulator (see lib/sim-readout.ts),
 * proof that a real system is running before anyone reads a word. Selecting it moves focus to
 * the simulator's traffic slider.
 */
export function SimReadout() {
  const readout = useSyncExternalStore(subscribeReadout, getReadout, getServerReadout);
  const label = LABEL[readout.state];

  const focusSim = (event: React.MouseEvent<HTMLAnchorElement>) => {
    const slider = document.querySelector<HTMLElement>('#play [role="slider"]');
    if (!slider) return;
    event.preventDefault();
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    document.getElementById("play")?.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "nearest" });
    slider.focus({ preventScroll: true });
  };

  return (
    <a href="#play" onClick={focusSim} className="readout t-meta" aria-label="Jump to the live system simulator">
      <span aria-hidden="true">
        <span className="status-dot" data-state={readout.state} />
        <span className="hidden text-ink-2 sm:inline">{label.long}</span>
        <span className="text-ink-2 sm:hidden">{label.short}</span>
      </span>
      <span aria-hidden="true">
        <span>
          <b>{fmt(readout.requests)}</b> <span className="sm:hidden">req</span>
          <span className="hidden sm:inline">requests</span>
        </span>
      </span>
      <span aria-hidden="true">
        <span>
          p99 <b>{readout.p99 === null ? "–" : `${Math.round(readout.p99)} ms`}</b>
        </span>
      </span>
      <span aria-hidden="true">
        <span>
          <b>{fmt(readout.errors)}</b> errors
        </span>
      </span>
    </a>
  );
}
