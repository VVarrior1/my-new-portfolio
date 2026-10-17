// The site's springs, shared by every Motion animation. The CSS copies (--spring-* in
// app/globals.css) are the same curves sampled into linear() easings.
export const SPRING = {
  /** Morphs: the island, shared elements. Settles without a visible wobble. */
  morph: { type: "spring", stiffness: 420, damping: 36, mass: 1 },
  /** Things that land: a server added to the simulator, a preview appearing. One small overshoot. */
  bouncy: { type: "spring", stiffness: 380, damping: 22, mass: 0.9 },
  /** Followers: the cursor preview and magnetic buttons. Soft, with a little lag. */
  follow: { stiffness: 170, damping: 20, mass: 0.6 },
  /** Heavy readings: utilisation bars and numbers that should feel like they have mass. */
  heavy: { type: "spring", stiffness: 90, damping: 18, mass: 1.4 },
} as const;
