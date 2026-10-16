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

The design is "Workbench": warm grey paper, objects with a job, and one colour, international
orange, used only on things you press. Read the token comments at the top of `app/globals.css`.

- Colors only through the tokens in `app/globals.css` (`paper`, `paper-raised`, `key-face`, `ink`,
  `ink-2`, `graphite`, `rule`, `signal`, `signal-text`, `screen-*`, `trace`, `fail`, `go`). Every
  token has a dark value; check both themes. Every neutral sits on one warm hue at OKLCH chroma
  ≤ 0.006, so light and dark share one temperature. Check new neutrals with a script, not by eye.
- Every color has one job. `--signal` (orange) is only the fill of actuators: the "Email me" keys,
  the simulator's kill key and its fader cap. It is never text (2.9:1); use `--signal-text` for
  orange text or underlines. Never tint, blend or fade the orange. Status colours (`--trace`,
  `--fail`, `--screen-go`) appear only on the dark screens (`.screen`: the simulator and readouts);
  `--go` is the page's only status dot (availability, current job).
- Decoration is objects, never backgrounds: `.panel` (device, project mats, nameplate), `.screen`
  (where numbers live), `.key` / `.key-signal` (anything pressable), `.spec` (label/value tables).
  No glows, blur, gradients (other than the 1px key highlights), textures or ambient animation.
  `backdrop-filter` only on the sticky header.
- Type: Archivo (variable, the width axis carries the display voice via `font-stretch`) and
  JetBrains Mono for every date, stack, number, URL, caption and readout. Seven sizes
  (13/15/17/20/26/40/56), weights 400–650. Body prose is `ink` or `ink-2`; `graphite` is metadata only.
- Layout: one 12-column grid in a 72rem container. Section titles sit above content with a mono
  index. Experience, Background and Writing rows share the 3/9 split. Three radii: 8px (controls,
  nodes), 12px (inner frames, screens), 20px (panels, mats).
- The name is never printed twice in one viewport: the header wordmark waits on `/` until the h1
  scrolls out. The simulator stays the loudest object in the first viewport.
- No all-caps eyebrow labels, chips or card grids. Hierarchy comes from type size, weight and rules.
- The hero simulator is the only motion that isn't triggered by the user. Keep it that way,
  keep it starting on idle (it blocked first paint when it started on hydration: Lighthouse 72 → 97),
  and respect `prefers-reduced-motion`. Its layout has a fixed height so controls never move under
  the pointer, and it flows top to bottom when the screen is narrower than 560px.
- shadcn components in `components/ui` are ours to edit. Theme them through the token mapping in
  `globals.css`, not per-component colors. cmdk separators inside the list break ARIA, so don't add them.
  Object classes live in `@layer components` so Tailwind utilities can still override them; keep
  element resets (`a`, `:focus-visible`) in `@layer base` for the same reason.
- History: the owner called the purely typographic versions "bland", rejected stock photos of
  Calgary as "forced and irrelevant", and scored the grid + blue/green/violet glows version 4/10
  ("the colors are off"). Don't bring back glows, colored section backgrounds or multiple accent hues.
- Public counts under 50 (post reads) aren't shown; the visit total lives on `/stats` only.
- Don't feature ApplyOps anywhere (the owner doesn't want it shown; the repo is private).
- Product screenshots: `node scripts/capture-work-shots.mjs`. Don't submit forms on cydsoccer.com
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
