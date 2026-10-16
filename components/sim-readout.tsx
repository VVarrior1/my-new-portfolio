"use client";

import { useSyncExternalStore } from "react";
import { getReadout, getServerReadout, subscribeReadout, type SimState } from "@/lib/sim-readout";

const LABEL: Record<SimState, string> = {
  idle: "Starting in your browser",
  healthy: "Running in your browser",
  slow: "Running in your browser, queues building",
  failing: "Running in your browser, shedding requests",
  paused: "Paused while off-screen",
};

const fmt = (n: number) => n.toLocaleString("en-US");

/**
 * The live readout above the headline, fed by the hero simulator (see lib/sim-readout.ts).
 * Selecting it moves focus to the simulator's traffic slider.
 */
export function SimReadout() {
  const readout = useSyncExternalStore(subscribeReadout, getReadout, getServerReadout);

  const focusSim = (event: React.MouseEvent<HTMLAnchorElement>) => {
    const slider = document.querySelector<HTMLElement>('#play [role="slider"]');
    if (!slider) return;
    event.preventDefault();
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    document.getElementById("play")?.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "nearest" });
    slider.focus({ preventScroll: true });
  };

  return (
    <a
      href="#play"
      onClick={focusSim}
      className="t-meta group inline-flex max-w-full flex-wrap items-center gap-x-2.5 gap-y-1 text-graphite no-underline"
    >
      <span className="sr-only">Jump to the live system simulator</span>
      <span aria-hidden="true" className="contents">
        <span className="inline-flex items-center gap-2.5">
          <span className="status-dot" data-state={readout.state} />
          <span className="text-ink-2 transition-colors group-hover:text-signal">{LABEL[readout.state]}</span>
        </span>
        <span className="hidden sm:inline">·</span>
        <span className="inline-flex flex-wrap items-center gap-x-2.5">
          <span>
            <span className="text-ink">{fmt(readout.requests)}</span> requests
          </span>
          <span>·</span>
          <span>
            p99 <span className="text-ink">{readout.p99 === null ? "–" : `${Math.round(readout.p99)} ms`}</span>
          </span>
          <span>·</span>
          <span>
            <span className="text-ink">{fmt(readout.errors)}</span> errors
          </span>
        </span>
      </span>
    </a>
  );
}
