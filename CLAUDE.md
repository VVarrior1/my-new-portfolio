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
  the neutral dye and the accent (red and green channels of its dye texture); never add a hue.
  Status colours (`--trace`, `--fail`, `--screen-go`) mean status: the simulator's screen, the
  packet's 503, the /stats chart; `--go` is the availability dot.
- There are no opaque sheets on the home page. Text over the liquid needs a `data-calm` ancestor
  (the value is how much dye is held back, 0–1; the shader takes the 8 on screen). A section in
  the opposite theme is `data-chapter="invert"` with a `.chapter-ground` inside (the shader draws
  its band; the ground is for contrast checks and no-WebGL). Images that should live in the liquid
  get `data-gl` ("shot" or "portrait") on a wrapper of the `<img>`.
- Simulator → liquid goes through `lib/flow-bus.ts` only (`setFlowState`, `emitFlow`; `stir` for a
  push with dye). Points are viewport pixels.
- Anything per-frame subscribes to `lib/ticker.ts` (`onFrame`), never its own rAF, so it reads the
  scroll Lenis just set. Smooth scrolls go through `scrollToTarget`.
- The HUD (`components/hud.tsx`) reads `main [data-hud]`: a section's name queues and flies; an
  element with `data-hud-source` (a poster built with `<Letters>`) lifts its own letters. Its math is
  in `lib/hud-math.ts` with tests. It, the cursor and the snap-to-resolve exist only on fine pointers
  ≥1024px with motion; section heads switch between a big title and the sticky "01 / WORK" bar by
  the same media query, so nothing moves after load.
- Motion: springs (`--ease-spring`) for things with weight, `--ease-out` for glides, `--ease-pour`
  for fills and wipes. Animate transform, opacity and clip-path only (the wipe also flips
  `-webkit-text-fill-color`). Entrances use `data-reveal` (`rise`, `title`, `blot`, `wipe`) and must
  never be required to read anything: they hide content only under `html[data-motion="on"]`. Every
  loop pauses in hidden tabs; the liquid starts on idle after load, caps DPR, renders one still
  frame under reduced motion, and must keep 60 fps on a laptop (measure with `window.__liquid`).
  `?tune` opens a tuner for its constants.
- Hover is decoration only (tides, ripples, the cursor label). Nothing is hidden behind hover.
- Type: Instrument Sans for everything (semi-condensed 650 for posters, the odometer, counts and the
  HUD), Instrument Serif italic for one or two words (the surname, "2027?", the rivers' labels),
  JetBrains Mono for data and HUD labels. The name is sized on its column (`.t-name`).
- Layout: one 12-column grid inside `.wrap`; on laptops `.wrap` leaves a left lane for the spine
  and room on the right for the ruler. Radii: 10px (nodes), 14px (screenshots, screens), 24px
  (device, portrait); buttons are pills.
- The name is never printed twice in one viewport: the header wordmark waits on `/` until the h1
  scrolls out.
- The simulator's status line and diagram share a fixed height (`DISPLAY_HEIGHT`) so controls
  never move under the pointer, and the diagram flows top to bottom below 560px.
- shadcn components in `components/ui` are ours to edit. Theme them through the token mapping in
  `globals.css`, not per-component colors. cmdk separators inside the list break ARIA, so don't add them.
  Object classes live in `@layer components` so Tailwind utilities can still override them; keep
  element resets (`a`, `:focus-visible`) in `@layer base` for the same reason.
- History: the owner called the typographic versions "bland", rejected stock photos of Calgary
  ("forced and irrelevant"), scored the multi-hue glow version 4/10 ("the colors are off"), found
  Night Ops "mid" and Workbench "6.5/7, something is missing". Of three motion builds they liked
  Liquid best, then Scroll; Springs had nothing special. Liquid World merges Liquid with Scroll's
  spine and poster type, and takes its scroll signature from getartcraft.com/apps and its reveals
  from landonorris.com. Don't bring back multiple accent hues, glows or stock imagery.
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
