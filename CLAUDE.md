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

The design is "Liquid World": the whole home page floats on a real fluid simulation (marbled ink on
pale water in light, lit smoke on black in dark), with one accent, cobalt. Read `README.md` →
Design and the token comments at the top of `app/globals.css`.

- Colors only through the tokens in `app/globals.css` (`paper`, `pool`, `paper-raised`, `key-face`,
  `ink`, `ink-2`, `graphite`, `rule`, `signal`, `signal-text`, `screen-*`, `trace`, `fail`, `go`,
  `fluid-*`, and the `-x` twins). Every token has a dark value, and the inverted chapter re-points
  them at the opposite theme; check both themes and the chapter in both. Neutrals sit on one cool
  hue (OKLCH h≈265, chroma ≤ 0.016). Check new neutrals and contrast with a script, not by eye.
- One accent. `--signal` (cobalt) fills what you press, marks "now", runs the spine, the ruler's
  needle, the waterline and the wipe reveals, and voices the serif labels. The fluid may only paint
  the neutral dye and the accent (red and green channels of its dye texture); never add a hue. In
  the liquid, cobalt means traffic (a thread in the current, thicker with load), a killed server,
  the packet's thread and the theme blot; drips and the intro drop are ink. Calm water holds the
  accent back exactly like the ink, so text never sits on saturated cobalt.
  Status colours (`--trace`, `--fail`, `--screen-go`) mean status: the simulator's screen, the
  packet's 503 and the wire behind it while requests fail, the /stats chart; `--go` is the
  availability dot.
- There are no opaque sheets on the home page. Text over the liquid needs a `data-calm` ancestor
  (the value is how much dye is held back, 0–1; the shader takes the 10 on screen, after two fixed
  ones: the header's band and, where the HUD runs, the ruler's lane). Calm edges are ragged on
  purpose (noise that only ever widens the calm). Calm covers an element's content box, not its
  padding, so put `data-calm` on the text blocks themselves, not on whole sections. The current is
  only gently dragged inside calm (`#play` not at all, since the river leaves from it): a strong
  drag chokes the channels between blocks and the ink banks up against their shores. A section in the opposite theme is
  `data-chapter="invert"` with a `.chapter-ground` inside (the shader draws its band; the ground is
  for contrast checks and no-WebGL). Under reduced motion the still frame is redrawn as the page
  scrolls so the band stays under the chapter. Images that should live in the liquid get `data-gl`
  ("shot" or "portrait") on a wrapper of the `<img>`. They distort only while the page moves or the
  pointer is on them and are the plain image, sharp and in colour, at rest.
- Anything that sits in the opposite theme's colours re-points its tokens with the chapter's
  block in `globals.css`: the header while the chapter runs under it (`[data-site-header][data-x]`)
  and the phone HUD's bar (`[data-mhud][data-x]`). HUD frosts are tinted in two clipped layers
  (`.hud-tint`, `.hud-tint-x`), never one flipped colour, so a frost can't smear dark over light.
- Simulator → liquid goes through `lib/flow-bus.ts` only (`setFlowState`, `emitFlow`; `stir` for a
  push with dye). Points are viewport pixels.
- Anything per-frame subscribes to `lib/ticker.ts` (`onFrame`), never its own rAF, so it reads the
  scroll Lenis just set. Smooth scrolls go through `scrollToTarget`.
- The HUD (`components/hud.tsx`) reads `main [data-hud]`: a section's name queues and flies; an
  element with `data-hud-source` (a poster built with `<Letters>`) lifts its own letters. It also
  flies the hero's name (`[data-name] [data-nl]`, built with `<InlineLetters>`, which keeps the
  kerning) into the header brand (`[data-wordmark] [data-wl]`; the "Am." mark's A and stop are
  targets marked `data-keep`, which never hide; the surname's letters show as they land); that flight is scrubbed, never
  snapped, so the simulator stays usable. Elements marked `data-hud-avoid` (the portrait) make the
  docked stack step aside if it would overlap them, and the stack also steps aside while the ruler
  is zoomed into its map. Its math is in `lib/hud-math.ts` with tests. It, the cursor and the
  snap-to-resolve exist only on fine pointers ≥1024px with motion; section heads switch between a
  big title and the sticky "01 / WORK" bar by the same media query, so nothing moves after load.
  Everywhere else with motion (phones, tablets, touch laptops) `components/mobile-hud.tsx` flies each
  section's big title (`[data-mtitle]`, letters marked `data-tl`) into a frosted bar under the
  header, leaving the title's outline behind. On the contact section the corner the HUD docks in is
  kept clear (the portrait column ends left of it).
- The spine (`components/spine.tsx`) runs from the hero's origin station to the end station beside
  the key marked `data-terminal` (Email me); over the last screen of scroll the packet drifts down
  (`packetScreenY`) to arrive there exactly at the bottom of the page.
- Motion: springs (`--ease-spring`) for things with weight, `--ease-out` for glides, `--ease-pour`
  for fills and wipes. Animate transform, opacity and clip-path only (the wipe also flips
  `-webkit-text-fill-color`). Entrances use `data-reveal` (`rise`, `title`, `blot`, `wipe`) and must
  never be required to read anything: they hide content only under `html[data-motion="on"]`. Every
  loop pauses in hidden tabs; the liquid starts on idle after load, caps DPR, renders one still
  frame under reduced motion, and must keep 60 fps on a laptop (measure with `window.__liquid`).
  `?tune` opens a tuner for its constants.
- Hover is decoration only (tides, card fills, ripples, the cursor label). Nothing is hidden behind
  hover, and the fills only run under `(hover: hover) and (pointer: fine)` (CSS and JS), so a tap
  can never leave one stuck. A key's label changes colour only once its fill has covered it. The
  cursor's label disc sits below and right of the pointer, never on the word you're pointing at.
- Type: Instrument Sans for everything (semi-condensed 650 for posters, the odometer, counts and the
  HUD), Instrument Serif italic for one or two words (the surname, "2027?", the rivers' labels),
  JetBrains Mono for data and HUD labels. The name is sized on its column (`.t-name`).
- Layout: one 12-column grid inside `.wrap`; on laptops `.wrap` leaves a left lane for the spine
  and room on the right for the ruler. Radii: 10px (nodes), 14px (screenshots, screens), 24px
  (device, portrait); buttons are pills.
- The brand is the "Am." mark (`components/brand-mark.tsx`): ink, with the one accent in its full
  stop. Its paths, pen route, keyframes and the favicons are generated by
  `scripts/brand/build_mark.py`; edit that, not the generated files. The 16px favicon is its own
  cut (the bold A and a cobalt pixel), chosen inside `app/icon.svg` by a size media query.
- The name is never printed twice in one viewport: the header wordmark waits on `/` until the h1
  scrolls out (on laptops it is assembled, letter by letter, by the name's own flight).
- The simulator's status line and diagram share a fixed height (`DISPLAY_HEIGHT`) so controls
  never move under the pointer. The diagram always flows left to right; below 560px (the `compact:`
  variant) the device is about half height, so status lines (`diagnose()`, the demo's cues) stay
  under ~80 characters to fit two lines at 360px. The self-running demo (`lib/sim-demo.ts`) must
  stay once per load, idle-gated, cancelled by any touch on the device, off under reduced motion,
  and must never fire `sim:interact`.
- shadcn components in `components/ui` are ours to edit. Theme them through the token mapping in
  `globals.css`, not per-component colors. cmdk separators inside the list break ARIA, so don't add them.
  Object classes live in `@layer components` so Tailwind utilities can still override them; keep
  element resets (`a`, `:focus-visible`) in `@layer base` for the same reason.
- History: the owner called the typographic versions "bland", rejected stock photos of Calgary
  ("forced and irrelevant"), scored the multi-hue glow version 4/10 ("the colors are off"), found
  Night Ops "mid" and Workbench "6.5/7, something is missing". Of three motion builds they liked
  Liquid best, then Scroll; Springs had nothing special. Liquid World merges Liquid with Scroll's
  spine and poster type, and takes its scroll signature from getartcraft.com/apps and its reveals
  from landonorris.com. Design judges then asked for a clean finish (nothing overlapping, smearing
  or sticking), a sharp colour portrait, a packet that is delivered, and a signature on phones.
  Don't bring back multiple accent hues, glows, stock imagery or the two-tone portrait.
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
