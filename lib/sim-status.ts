import type { Health } from "./live-sim";

/** The hero simulator's last-known state, shared with the footer readout. Client-side only. */
export type SimStatus = { health: Health; p99: number };

let current: SimStatus | null = null;
const listeners = new Set<() => void>();

export function publishSimStatus(next: SimStatus) {
  if (current && current.health === next.health && Math.round(current.p99) === Math.round(next.p99)) return;
  current = next;
  for (const listener of listeners) listener();
}

export function subscribeSimStatus(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export const getSimStatus = () => current;
export const getServerSimStatus = () => null;
