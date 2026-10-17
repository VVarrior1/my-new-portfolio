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

The design is "Liquid": sheets floating on a real fluid simulation, ink on paper (light) or smoke
on black (dark), with one accent, cobalt. Read `README.md` → Design and the token comments at the
top of `app/globals.css`.

- Colors only through the tokens in `app/globals.css` (`paper`, `pool`, `paper-raised`, `key-face`,
  `ink`, `ink-2`, `graphite`, `rule`, `signal`, `signal-text`, `screen-*`, `trace`, `fail`, `go`,
  `fluid-*`). Every token has a dark value; check both themes. Neutrals sit on one cool hue
  (OKLCH h≈265, chroma ≤ 0.016). Check new neutrals and contrast with a script, not by eye.
- One accent. `--signal` (cobalt) fills what you press (the main "Email me", the kill button, the
  fader cap), marks "now" (the current role's bar, the timeline cursor) and section indexes;
  `--signal-text` is cobalt text, hover strokes and arrows. The fluid may only paint the neutral
  dye and the accent (red and green channels of its dye texture); never add a second hue to it.
  Status colours (`--trace`, `--fail`, `--screen-go`) appear only on the simulator's screen and
  the /stats chart; `--go` is the availability dot.
- The liquid (`components/liquid-field.tsx`) is seen only through windows: `data-liquid-window`
  (the hero, the contact section, and `main` for the rails). Sections are `.sheet`s; give a new
  sheet `data-liquid-edge` so scrolling drags a wake off it. Text over the liquid needs a
  `data-liquid-protect` ancestor (the value is how much dye is held back, 0–1).
- Simulator → liquid goes through `lib/flow-bus.ts` only (`setFlowState`, `emitFlow`). Points
  are viewport pixels.
- Motion: springs (`--ease-spring`) for things with weight, `--ease-out` for glides, `--ease-pour`
  for fills. Animate transform, opacity and clip-path only. Entrances use `data-reveal`
  (`rise`, `title`, `blot`) and must never be required to read anything: they hide content only
  under `html[data-motion="on"]`. Every loop pauses in hidden tabs; the liquid also starts on
  idle after load (LCP), caps DPR, renders one still frame under reduced motion, and must keep
  60 fps on a laptop (measure with `window.__liquid`).
- Hover is decoration only (pour fills, lifts, strokes). Nothing is hidden behind hover, so touch
  loses nothing.
- Type: Instrument Sans for everything, Instrument Serif italic for at most one or two words in a
  heading (the surname, "2027?"), JetBrains Mono for data only. The name is sized on its column
  (`.t-name`, container units) so it always fits on one line per word.
- Layout: one 12-column grid in an 88rem container; the hero is text 1–6, device 7–12.
  Experience, Background, Writing and More projects share the 3/9 split. Radii: 10px (nodes),
  14px (frames, screens), 24–28px (device, sheets, stages); buttons are pills.
- The name is never printed twice in one viewport: the header wordmark waits on `/` until the h1
  scrolls out.
- No all-caps eyebrow labels or card grids. Hierarchy comes from scale: the name and section
  titles are very large, everything else is calm.
- The simulator's status line and diagram share a fixed height (`DISPLAY_HEIGHT`) so controls
  never move under the pointer, and the diagram flows top to bottom below 560px.
- shadcn components in `components/ui` are ours to edit. Theme them through the token mapping in
  `globals.css`, not per-component colors. cmdk separators inside the list break ARIA, so don't add them.
  Object classes live in `@layer components` so Tailwind utilities can still override them; keep
  element resets (`a`, `:focus-visible`) in `@layer base` for the same reason.
- History: the owner called the typographic versions "bland", rejected stock photos of Calgary
  ("forced and irrelevant"), scored the multi-hue glow version 4/10 ("the colors are off"), found
  Night Ops (dark, light beams) "mid", and Workbench (warm paper, orange, hardware) "6.5/7,
  something is missing". Liquid is the answer to "we need some fluid animations". Don't bring back
  multiple accent hues, glows or stock imagery.
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
