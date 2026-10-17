// A tiny external store that lets the hero simulator feed the live status strip above the
// name. The simulator publishes at most 4 times a second; the strip subscribes with
// useSyncExternalStore. It is decoration only (aria-hidden): the simulator's own aria-live
// hint stays the accessible source of truth.

export type SimState = "idle" | "healthy" | "slow" | "failing" | "paused";

export type Readout = {
  state: SimState;
  /** Requests finished since the page loaded (or since Reset). */
  requests: number;
  /** Requests that failed in the same period. */
  errors: number;
  /** p99 latency over the simulator's recent window, in ms. */
  p99: number | null;
};

const IDLE: Readout = { state: "idle", requests: 0, errors: 0, p99: null };

let current: Readout = IDLE;
const listeners = new Set<() => void>();

export function publishReadout(next: Readout) {
  if (
    next.state === current.state &&
    next.requests === current.requests &&
    next.errors === current.errors &&
    next.p99 === current.p99
  ) {
    return;
  }
  current = next;
  for (const listener of listeners) listener();
}

export function subscribeReadout(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export const getReadout = () => current;
export const getServerReadout = () => IDLE;

/** Healthy, slow (strained) or failing, from the same thresholds as the simulator's own status lamp. */
export function stateFrom(errorRate: number, p99: number, serverDown = false): SimState {
  if (errorRate > 0.01) return "failing";
  if (p99 > 150 || serverDown) return "slow";
  return "healthy";
}
