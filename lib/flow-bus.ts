// How the page pokes the liquid field behind it (components/liquid-field.tsx): the theme toggle's
// drop, the intro's drop, flying HUD letters, the spine's packet and rows you point at fire events,
// and the field turns each into a splat on its next frame. Points are in viewport pixels.

export type FlowEvent =
  /** An ink drop, e.g. from the theme toggle; `accent` is how much cobalt it carries (0.35 default).
   * With `river`, while the hero's river runs the drop is poured into it at its source instead of
   * bursting where it lands (the intro's drop), so it travels down the current as one swell. */
  | { kind: "drop"; x: number; y: number; size: number; accent?: number; river?: boolean }
  /** A push through the liquid (a flying letter, the spine's packet, a row you point at): velocity
   * in px/s, and how much of each dye it leaves. */
  | { kind: "stir"; x: number; y: number; dx: number; dy: number; ink: number; accent: number; radius: number };

const listeners = new Set<(event: FlowEvent) => void>();

export function emitFlow(event: FlowEvent) {
  for (const listener of listeners) listener(event);
}

export function onFlow(listener: (event: FlowEvent) => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
