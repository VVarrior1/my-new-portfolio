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

The design is "Workbench": near-white warm paper with grey hardware on it, objects with a job, and
one colour, international orange, used on things you press and on "now". Read the token comments
at the top of `app/globals.css`.

- Colors only through the tokens in `app/globals.css` (`paper`, `paper-raised`, `key-face`, `ink`,
  `ink-2`, `graphite`, `rule`, `signal`, `signal-text`, `screen-*`, `trace`, `fail`, `go`). Every
  token has a dark value; check both themes. Every neutral sits on one warm hue at OKLCH chroma
  ≤ 0.006, so light and dark share one temperature. Check new neutrals with a script, not by eye.
- Every color has one job. `--signal` (orange) fills actuators (the simulator's kill key and fader
  cap, the contact console's "Email me") and marks the present: the current role's bar, dot and
  the "now" cursor in Experience, and the mat's section cursor. `--signal-text` is for orange text, hover underlines and arrows
  (links, Writing rows, the active nav item). The hero's "Email me" is an ink key (`.key-ink`) so
  the first viewport's only orange is on the device. Orange is never large areas and never text on
  paper (2.9:1). Never tint, blend or fade it. Status colours (`--trace`, `--fail`, `--screen-go`)
  appear only on screen material (`.screen`: the simulator, the hero's live status strip and the
  /stats chart); `--go` is the page's only status dot on paper (availability).
- Decoration is objects, never backgrounds: `.panel` (device, project mats, tools board),
  `.console` (the contact card: screen material, which re-points the page tokens at the screen's),
  the experience span strip, `.screen` (the simulator, the status strip and the /stats chart), `.key` /
  `.key-signal` / `.key-ink` (anything pressable), `.keycap` (a legend key that labels, never
  presses), `.spec` (label/value tables), `.stat-row` (a project's numbers, on the paper).
  No glows, blur, gradients (other than the 1px key highlights), textures or ambient animation.
  `backdrop-filter` only on the sticky header.
- The one background is the cutting mat under the home page (`components/mat.tsx`, `.mat*` in
  `globals.css`), because "bland" kept coming back. It is printed, never lit: a grid in ink at low
  alpha (`--mat-*` tokens) whose unit is one column pitch of the 12-column grid (fluid from 64rem,
  98px at the full container and below 64rem; whole units only on phones) anchored to the content
  edge, so each section edge is a mat line and the vertical lines sit on column edges at every
  width; a scale down the left edge (≥85rem) whose orange cursor holds the current section's
  number (plain `position: sticky`, no script: each section's scale is clipped to the section and
  its cursor waits out of sight above the top edge, so the number changes exactly at the edge and
  two never show at once); registration targets where section edges cross the content edges; crop
  marks (`.mat-crop`) around the hero device and the console; and angle guides, column numbers and
  a printed label at the bottom edge. Its numerals are 11px mono, the only size outside the type
  scale, on every second unit. If a mat line ever competes with content, lower its alpha; don't add
  more mat. It disappears in forced colours and print. The header is transparent at the top so the
  mat runs under it.
- Type: Archivo (variable, the width axis carries the display voice via `font-stretch`) and
  JetBrains Mono for data only: dates, numbers, stacks, URLs and everything on a screen. Words
  (spec values, captions) are Archivo. Seven sizes (13/15/17/20/26/40/56), weights 400–650; mono
  is 13px off-screen, 12px only on screens. Body prose is `ink` or `ink-2`; `graphite` is metadata only.
- "A · B · C" lists use `DotList` (`.sep-list`), which never leaves a separator dangling at a line end.
- Layout: one 12-column grid (74px columns, 24px gutters) in a 72rem container. Section titles sit
  on the content edge with the mono index on its own line above. Hero and Systemlab: text in
  cols 1-5, object in 6-12 (CYD mirrors it). Experience, Background, Writing and More projects
  share the 3/9 split, and the span strip and tools board put their content on the same col-4
  edge. Three radii: 8px (controls, nodes), 12px (inner frames, screens), 20px (panels, mats).
- The name is never printed twice in one viewport: the header wordmark waits on `/` until the h1
  scrolls out. The simulator stays the loudest object in the first viewport.
- No all-caps eyebrow labels, chips or card grids. Hierarchy comes from type size, weight and rules.
- The hero simulator is the only motion that isn't triggered by the user. Keep it that way,
  keep it starting on idle (it blocked first paint when it started on hydration: Lighthouse 72 → 97),
  and respect `prefers-reduced-motion`. The status line and diagram share a fixed height
  (`DISPLAY_HEIGHT`) so controls never move under the pointer, and the diagram flows top to bottom
  when the screen is narrower than 560px.
- shadcn components in `components/ui` are ours to edit. Theme them through the token mapping in
  `globals.css`, not per-component colors. cmdk separators inside the list break ARIA, so don't add them.
  Object classes live in `@layer components` so Tailwind utilities can still override them; keep
  element resets (`a`, `:focus-visible`) in `@layer base` for the same reason.
- History: the owner called the purely typographic versions "bland", rejected stock photos of
  Calgary as "forced and irrelevant", and scored the grid + blue/green/violet glows version 4/10
  ("the colors are off"). Don't bring back glows, colored section backgrounds or multiple accent hues.
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
