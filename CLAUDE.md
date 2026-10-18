# CLAUDE.md

Read `README.md` first: it covers setup, file layout, the design system and how analytics works.
This file holds the rules that aren't obvious from the code.

## Commands

`npm run lint`, `npm run typecheck`, `npm test` (Vitest), `npm run build`,
`PW_CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" npm run test:e2e`.
Run all of them before pushing; `npm run ci` chains them.

## Content

- Profile content lives only in `lib/content.ts`. Keep CYD as one project among several, not the headline. Facts there come from the résumés and the CYD
  case study (github.com/VVarrior1/cyd-platform-case-study). Don't invent numbers; if two
  sources disagree, use the newer one and say so.
- The résumé file name `public/Abdelrahman_Mohamed_Resume.pdf` is linked from outside the site
  (LinkedIn, applications). Replace the file; never rename it.
- Posts and gallery items come from GCS (`lib/blogs.ts`, `lib/gallery.ts`) and are managed in `/admin`.

## Design rules

The design is "Liquid Signal": the home page floats on a real fluid simulation (ink in water in
the light theme, lit smoke on black in the dark one) with one accent, cobalt. A packet (one
request) leaves the simulator on a wire and rides it down the page; a ruler on the right edge
carries the section names, which fly letter by letter to the top-right corner as their sections
arrive (after getartcraft.com/apps). Read `README.md` → Design and the token comments at the top
of `app/globals.css`.

- Colors only through the tokens in `app/globals.css` (`paper`, `pool`, `paper-raised`, `key-face`,
  `ink`, `ink-2`, `graphite`, `rule`, `wire`, `wire-lit`, `signal`, `signal-text`, `screen-*`,
  `trace`, `fail`, `go`, `fluid-*`). Every token has a dark value; check both themes. Neutrals sit
  on one cool hue (OKLCH h≈265, chroma ≤ 0.016). Check new neutrals and contrast with a script.
- One accent. `--signal` (cobalt) fills what you press (the main "Email me", the kill button, the
  fader cap), marks "now" (the packet, the rail's needle and section marks, the current role) and
  numbers things (section indexes, the number chips). The fluid paints only its neutral dye (red
  channel) and the accent (green). Its blue channel is failure: only the packet trails it, and only
  while the simulator is failing requests (the packet's tag reads `503` then). Status colours
  (`--trace`, `--fail`, `--screen-go`) otherwise stay on the simulator's screen and /stats; `--go`
  is the availability dot.
- There are no sheets. The page is transparent over the liquid (`components/liquid-field.tsx`) and
  the dye is held back behind every block of text: give text over the liquid a
  `data-liquid-protect` ancestor (the value is how much is held back, 0–1; at most 16 boxes are on
  screen at once, `MAX_RECTS`). Screenshots get `data-liquid-edge` so they drag a wake through it.
- Simulator → liquid goes through `lib/flow-bus.ts` only (`setFlowState`, `emitFlow`), and so does
  the packet (`setPacket`). Points are viewport pixels.
- The spine (`components/choreo.tsx`): the wire runs from `[data-spine-origin]` (under the
  simulator) out to the frame's left edge (`[data-spine-frame]`) and down to the delivery station
  beside the contact keys (`[data-station="end"]`). Every `Section` has a station; the packet lights
  them and its tag names the last one passed. Keep the packet's tag in SVG text (no layout shift).
- The rail (`components/hud.tsx`) reads every `[data-hud]` section (`Section` sets it from its
  title). It is decoration: aria-hidden, never focusable, and only on `(pointer: fine) and
  (min-width: 1024px)` without reduced motion. Elsewhere the section shows its name large
  (`.section-word`), hidden by the same media query, so nothing shifts when the rail mounts. Pure
  maths lives in `lib/hud-math.ts` with tests. A flight never rests half done: it settles after
  400 ms of stillness. Leave the top-right corner (about 15rem by 12rem under the header) free of
  anything that must stay readable; the frost behind the pile only hugs the words.
- Motion: one requestAnimationFrame loop per system (liquid, choreography, rail), all paused in
  hidden tabs. Lenis smooths scrolling (`lib/smooth-scroll.ts` holds the instance; use
  `scrollToHash`/`getSmooth` to glide). Springs (`--ease-spring`) for things with weight,
  `--ease-out` for glides, `--ease-pour` for fills. Animate transform, opacity and clip-path only.
  Entrances use `data-reveal` (`rise`, `title`, `blot`, `wipe`, the last being the cobalt bar that
  sweeps across a poster line) and must never be required to read anything: they hide content
  only under `html[data-motion="on"]`. The liquid starts on idle after load (LCP), caps DPR,
  renders one still frame under reduced motion, and must keep 60 fps (`window.__liquid`).
- Reduced motion is a finished drawing: the wire fully inked, every station lit, the packet
  delivered, the marquee replaced by the plain list, no rail.
- Hover is decoration only (pour fills, fills that slide in from the edge the pointer crossed via
  `data-dir-hover`, lifts, strokes). Nothing is hidden behind hover, so touch loses nothing.
- Type: Instrument Sans for text and the name, Instrument Serif italic for the second voice (the
  surname, "lab", "platform", "2027?", the marquee's sentence), Archivo (wide caps) for the rail's
  words, the section words, the marquee and big figures, JetBrains Mono for data and the HUD labels
  (`.t-hud`, uppercase, tracked). The name is sized on its column (`.t-name`, container units).
- Layout: one frame (`.wrap`/`.frame`, 76rem, `--gutter` leaves room for the rail on laptops,
  `--inset` pads inside it) with hairlines down both sides. The hero is text 1–6, simulator 7–12;
  the simulator's diagram turns vertical below 500px (`VERTICAL_BELOW`). Sections open on a sticky
  eyebrow bar (`01 / WORK … meta`). Projects and toolkits sit on hairline grids with mono tags
  and cobalt number chips. Don't name a class after a Tailwind utility (`.block` was one).
- The name is never printed twice in one viewport: the header wordmark waits on `/` until the h1
  scrolls out.
- The simulator's status line and diagram share a fixed height (`DISPLAY_HEIGHT`) so controls
  never move under the pointer.
- shadcn components in `components/ui` are ours to edit. Theme them through the token mapping in
  `globals.css`, not per-component colors. cmdk separators inside the list break ARIA, so don't add them.
  Object classes live in `@layer components` so Tailwind utilities can still override them; keep
  element resets (`a`, `:focus-visible`) in `@layer base` for the same reason.
- History: the owner called the typographic versions "bland", rejected stock photos of Calgary
  ("forced and irrelevant"), scored the multi-hue glow version 4/10 ("the colors are off"), found
  Night Ops "mid" and Workbench "6.5/7, something is missing". Of three motion builds he preferred
  Liquid (the fluid) over Scroll (Signal's spine), and saw nothing special in Springs. He named
  getartcraft.com/apps's scroll animation and landonorris.com as the bar. Don't bring back multiple
  accent hues, glows, sheets of plain lists, or stock imagery.
- Public counts under 50 (post reads) aren't shown; the visit total lives on `/stats` only.
- Don't feature ApplyOps anywhere (the owner doesn't want it shown; the repo is private).
- Product screenshots: `node scripts/capture-work-shots.mjs` (it also writes the Systemlab dark copy,
  `darkSrc` in `lib/content.ts`; never dim a light capture with a filter). Don't submit forms on cydsoccer.com
  while capturing, because it triggers real lead SMS and email. Avoid pages showing children or staff names.

## Analytics

- Never write `analytics/index.json` from a request path directly. GCS rate-limits a single
  object to about one write per second; hits go to the inbox and `compactInbox()` folds them in.
- Pure logic belongs in `lib/analytics-core.ts`, with tests in `tests/unit/analytics-core.test.ts`.
- When testing against the real bucket, set `ANALYTICS_NAMESPACE` so production numbers stay clean.
- `/stats` is dynamic and reads uncached (`getFreshAnalytics`). Other pages use the 60-second
  cached `getAnalytics`.

## Deploying

Push to `master` and Netlify builds it. Netlify blocks Next.js versions with CVE-2025-55182, so
keep `next` on a patched 15.5.x release. Read a failed build with
`netlify logs -d <deploy-id> -s deploy --since <ISO time>`.
