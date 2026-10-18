// The hero simulator's demo: if nobody touches the device for a few seconds, it breaks itself once
// so the visitors who never press anything still see the point. Traffic climbs, a server dies, the
// survivor's queue fills and p99 spikes, then the server comes back, traffic eases and it recovers.
// It only scripts the controls (traffic, which server dies, when it restarts) and the narration:
// every number the device shows while it plays is still the simulation's own.

/** How long the device must sit on screen untouched before the demo starts. */
export const DEMO_IDLE_MS = 6000;
/** The whole demo, from the first cue to handing the device back healthy. Five lines of about three
 * seconds each: slow enough to read while you watch the diagram. */
export const DEMO_MS = 14400;
/** The rate the device starts at, and the one the demo climbs to. Two servers carry about 400 req/s,
 * so this is comfortable for two and far too much for one. */
export const DEMO_BASE_RATE = 160;
export const DEMO_PEAK_RATE = 320;
/** The server the demo kills (app 2). */
export const DEMO_VICTIM = 1;

const RISE = [0, 2400] as const;
const FALL = [8500, 10100] as const;
const KILL_AT = 3000;
const RESTART_AT = 8200;

export type DemoAction = "kill" | "restart" | null;
export type DemoCue = { at: number; say: string; action: DemoAction };

/** What happens, and the line the status narrates, in order. Each line stays on screen for at least
 * 2.5 s and fits two lines on a 360px phone. "Recovered" comes once the readouts' 3 s window has
 * really cleared (tests/unit/sim-demo.test.ts checks the simulation agrees). */
export const DEMO_CUES: readonly DemoCue[] = [
  { at: 0, say: "Traffic climbs toward what two servers can carry.", action: null },
  { at: KILL_AT, say: "A server dies. Its requests fail until the balancer notices.", action: "kill" },
  { at: 5600, say: "One server carries it all. Its queue overflows, p99 spikes.", action: null },
  { at: RESTART_AT, say: "The server restarts, traffic eases, and the backlog drains.", action: "restart" },
  { at: 12400, say: "Recovered. Your turn: kill a server.", action: null },
];

/** What the status says once a visitor takes over in the middle of the demo. */
export const DEMO_HANDOFF = "Demo stopped. It's yours: push the traffic or kill a server.";

const ease = (x: number) => {
  const t = Math.min(1, Math.max(0, x));
  return t * t * (3 - 2 * t);
};

/** The traffic the demo sets at time `t` ms, on the fader's 10 req/s steps. */
export function demoRate(t: number): number {
  let rate: number;
  if (t < FALL[0]) rate = DEMO_BASE_RATE + (DEMO_PEAK_RATE - DEMO_BASE_RATE) * ease((t - RISE[0]) / (RISE[1] - RISE[0]));
  else rate = DEMO_PEAK_RATE - (DEMO_PEAK_RATE - DEMO_BASE_RATE) * ease((t - FALL[0]) / (FALL[1] - FALL[0]));
  return Math.round(rate / 10) * 10;
}

/** The index of the last cue that has started by time `t` ms (-1 before the first). */
export function demoCueAt(t: number): number {
  let index = -1;
  for (let i = 0; i < DEMO_CUES.length; i++) if (DEMO_CUES[i].at <= t) index = i;
  return index;
}
