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

The design is "Springs": everything has weight. A cool green-grey paper with white cards, near-black
ink, one colour (volt, a highlighter lime), a black screen for the simulator, and motion that is
physical: things morph, follow, stretch and settle on springs instead of popping in or out. Read the
token comments at the top of `app/globals.css`.

- Colors only through the tokens in `app/globals.css` (`paper`, `paper-raised`, `key-face`, `well`,
  `ink`, `ink-2`, `graphite`, `rule`, `rule-strong`, `signal`, `signal-ink`, `signal-text`, `screen-*`,
  `trace`, `fail`, `go`). Every token has a dark value; check both themes. Neutrals sit on one hue
  (OKLCH h≈125) at chroma ≤ 0.008. Check new colours with a contrast script, not by eye.
- Volt (`--signal`) is a fill, never text on paper (1.1:1). It is the highlighter behind a phrase
  (`.marker`, link and post-title hovers), the hardest-pressed keys (the simulator's kill key and
  fader cap, the contact "Email me", the music play key), and "now/live" (the availability lamp, the
  current role, the screen's healthy lamp). Text on volt is always `--signal-ink`. In dark, volt can
  also be text (`--signal-text`, the focus ring); in light both are ink. The hero's "Email me" is
  an ink key. Status colours (`--trace`, `--fail`) appear only on screens.
- Type: Bricolage Grotesque (variable; narrowed with `wdth` and heavy) for the name and every
  display line, Geist for text, Geist Mono for data only (dates, numbers, stacks, URLs, screens).
  The name is set as big as one line allows (two on a phone) from container units (`.hero-name`,
  `--name-ems` is its measured width in ems; re-measure if you change its axes or tracking).
- Objects: `.panel` (white cards: the device, case cards, tiles), `.spot` (adds the cursor-lit edge),
  `.screen` (black, the simulator and /stats chart), `.console` (the black contact card; it re-points
  the page tokens), `.key` / `.key-ink` / `.key-signal` (pill buttons), `.island-btn`, `.keycap`
  (label chips), `.spec`, `.stat-row`. Radii: 10 (nodes), 16 (frames, screens), 28 (cards, island);
  buttons are pills. No glows, gradient backgrounds, textures or stock photos.
- Motion rules:
  - Springs only. JS springs live in `components/springs.ts` (Motion, `motion/react`); the same
    curves exist in CSS as `linear()` easings (`--spring-bouncy`, `--spring-smooth`, `--spring-snappy`).
    Animate transform, opacity, clip-path and filter, never layout properties on in-flow elements.
  - Components use `m.*` under `LazyMotion` (strict), so the animation features load after first
    paint. Don't import `motion.*`.
  - The load sequence is CSS (`.a-rise`, `.a-pop`, `.a-settle`, `.name-letter`, `--d` delays) so it
    runs before and without JS, and every animated element rests at its normal style. Section
    entrances are scroll-driven CSS (`.s-rise`, fill forwards only) so nothing below the scroll is
    ever hidden. Never hide content in SSR waiting for JS.
  - The island (`components/site-header.tsx`) is one element that morphs (Motion `layout`) into the
    music player, the ⌘K menu and the phone menu. While open it is a modal dialog: focus in, Tab
    trapped, Escape/scrim closes, focus returns to the trigger.
  - Route changes go through `TransitionLink` / `navigate()` (View Transitions). Shared elements
    use `view-transition-name`: `shot-<slug>`, `title-<slug>`, `phone-<slug>` (case card ↔ case page)
    and `postVt(slug)` (post rows ↔ post heading). Names must be unique per page and the element must
    not be an inline box that wraps, or the browser skips the transition.
  - Pointer effects (magnetic keys, card tilt, the index preview, the name's swell) run only for a
    fine pointer without reduced motion. Touch gets press feedback (`:active` springs, the name
    ripple on tap). Hover never carries content.
  - Under `prefers-reduced-motion` nothing animates; the page must look finished and static.
- The simulator stays the memorable object: starts once the diagram has assembled and the page is
  idle (it blocked first paint when it started on hydration), pauses off-screen, draws no requests
  under reduced motion. The status line and diagram share a fixed height (`DISPLAY_HEIGHT`) so
  controls never move under the pointer, and the diagram flows top to bottom below 560px.
- shadcn components in `components/ui` are ours to edit. Theme them through the token mapping in
  `globals.css`. cmdk separators inside the list break ARIA, so don't add them.
- History: "bland" (typographic light), "forced and irrelevant" (Calgary stock photos), 4/10 for the
  multi-hue glows, Night Ops (dark, beams) "mid", Workbench (warm paper, orange hardware) "tidy",
  6.5–7. The owner scores 1.5–2 points under AI judges; tidy is not enough, it has to feel alive.
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
