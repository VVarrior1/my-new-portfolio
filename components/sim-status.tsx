"use client";

import { useSyncExternalStore } from "react";
import { getServerSimStatus, getSimStatus, subscribeSimStatus } from "@/lib/sim-status";

const DOT = { healthy: "bg-go", strained: "bg-trace", failing: "bg-destructive" } as const;

/** "sim: healthy · p99 81 ms": the hero simulator's last-known state, shown in the footer. */
export function SimStatus() {
  const status = useSyncExternalStore(subscribeSimStatus, getSimStatus, getServerSimStatus);
  if (!status) return null;
  const p99 = status.p99 >= 1000 ? `${(status.p99 / 1000).toFixed(1)} s` : `${Math.round(status.p99)} ms`;
  return (
    <p className="t-mono inline-flex items-center gap-2 text-graphite">
      <span aria-hidden="true" className={`size-1.5 rounded-full ${DOT[status.health]}`} />
      sim: {status.health} · p99 {p99}
    </p>
  );
}
