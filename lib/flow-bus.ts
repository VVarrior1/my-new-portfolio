// How the hero simulator drives the liquid field behind the page. The simulator publishes its
// state a few times a second and fires events when something dramatic happens; the field
// (components/liquid-field.tsx) reads the state every frame and turns events into splats.
// Points are in viewport pixels.

export type FlowState = {
  /** Incoming requests per second. */
  rate: number;
  /** 0 when healthy, rising to 1 as latency climbs and requests fail. */
  strain: number;
  /** Where requests enter the simulator's diagram (the dashed wire), so the current aims at it. */
  inlet: { x: number; y: number } | null;
};

export type FlowEvent =
  /** A server was killed: a bloom of the accent at the node. */
  | { kind: "kill"; x: number; y: number; device?: { top: number; bottom: number; left: number; right: number } }
  /** A server came back: a calm neutral ring. */
  | { kind: "restart"; x: number; y: number }
  /** A request failed at this point. */
  | { kind: "fail"; x: number; y: number }
  /** An ink drop, e.g. from the theme toggle; `accent` is how much cobalt it carries (0.35 default). */
  | { kind: "drop"; x: number; y: number; size: number; accent?: number }
  /** A push through the liquid (a flying letter, the spine's packet, a row you point at): velocity
   * in px/s, and how much of each dye it leaves. */
  | { kind: "stir"; x: number; y: number; dx: number; dy: number; ink: number; accent: number; radius: number };

const state: FlowState = { rate: 160, strain: 0, inlet: null };
const listeners = new Set<(event: FlowEvent) => void>();

export const flowState = (): Readonly<FlowState> => state;

export function setFlowState(next: Partial<FlowState>) {
  Object.assign(state, next);
}

export function emitFlow(event: FlowEvent) {
  for (const listener of listeners) listener(event);
}

export function onFlow(listener: (event: FlowEvent) => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Strain from the simulator's own numbers: p99 over 150 ms starts it, errors push it to 1. */
export function strainFrom(p99: number, errorRate: number, serverDown: boolean): number {
  const latency = Math.min(1, Math.max(0, (p99 - 120) / 900));
  const errors = Math.min(1, errorRate * 6);
  return Math.min(1, Math.max(latency * 0.7, errors, serverDown ? 0.35 : 0));
}
