# abdelrahmanmohamed1.netlify.app

Personal site of Abdelrahman Mohamed: work, experience, writing, a gallery and public site stats.
Next.js 15 (App Router), TypeScript, Tailwind CSS v4, deployed on Netlify. Blog posts, gallery
images and analytics live in a Google Cloud Storage bucket.

## Run it

```bash
npm ci
cp .env.local.example .env.local   # fill in the GCS + admin values
npm run dev                        # http://localhost:3000
```

With no GCS credentials, set `CONTENT_SOURCE=local` to use the posts in `data/blogs.json`.

| Script | What it does |
|---|---|
| `npm run dev` | Dev server (Turbopack) |
| `npm run build` / `npm start` | Production build and server |
| `npm run lint` / `npm run typecheck` | ESLint, `tsc --noEmit` |
| `npm test` | Vitest unit tests |
| `npm run test:e2e` | Playwright tests (set `PW_CHROME` to an installed Chrome to skip the browser download) |
| `npm run ci` | All of the above, in order |

## Where things are

| Path | Contents |
|---|---|
| `lib/content.ts` | All profile content: intro, featured projects and their screenshots, experience, education, skills. Edit this to update the site. |
| `public/Abdelrahman_Mohamed_Resume.pdf` | The résumé every "Résumé" link points to. Replace the file, keep the name. |
| `app/page.tsx` | Home page. Sections use `components/section.tsx`. |
| `app/blogs`, `app/gallery`, `app/stats` | Writing, gallery, public stats |
| `app/admin` | Token-protected panel for publishing posts and uploading gallery images |
| `app/globals.css` | Design tokens (light and dark), shadcn token mapping, post typography |
| `lib/analytics-core.ts` | Pure analytics logic, unit tested |
| `lib/analytics.ts` | Analytics storage on GCS |
| `lib/live-sim.ts` | The hero's simulation engine, unit tested |
| `components/ui` | shadcn/ui primitives (generated, then themed) |

## Design

"Drafted instrument": a cool-white engineering drawing with one ultramarine. Light by default,
with a dark theme that follows the OS or the header toggle. The toggle reveals the new theme as a
circle using the View Transitions API, and switches instantly where that API isn't available or
the visitor prefers reduced motion.

**Color.** Every neutral sits at OKLCH hue 266-275, the same hue as the signal blue, at low
chroma (paper .004, graphite .027), so the page reads as one material; light and dark share that
temperature. Each token in `app/globals.css` has one job, written next to it: `--ink` (headings),
`--ink-2` (body prose), `--graphite` (metadata only), `--rule` (hairlines), `--signal` (slider,
switch, link hover, focus, the hard-part rule, the current role), and `--trace` / `--go` /
`--destructive`, which appear only in the simulator, its readout and status dots. Deep ultramarine
appears in three places, each with a meaning: the simulator's instrument panel (the loudest object
in the hero), the Systemlab stage (the product the simulator comes from) and the closing contact
band, which is the largest area and so has the lowest chroma. CYD's stage is pale in light and a
neutral raised surface in dark. On the panel everything is white, with amber for slow and coral
for failing.

**Type.** Schibsted Grotesk at 400/500/600: `.t-meta` 13 mono, `.t-caption` 14, `.t-small` 15,
`.t-body` 17, `.t-item` 20, `.t-title` 28, the email 40, `.t-section` 44 and `.t-display` 52 (the
headline's second half is weight 500 graphite). 15px is 400 for text and 600 for buttons and links.
JetBrains Mono is only for numbers, dates, stacks, URLs, the readout, simulator labels and the
`Fig. n` token (about a third of the text on `/`); 12px mono appears only inside the simulator, in
URL bars and on the ⌘K keycap. Radii are 8 (controls, nodes), 10 (frames, the panel) and 16
(cards, stages), plus full pills.

**Structure instead of decoration.** Everything sits on one 12-column grid (1152px, 24px gutters).
The page frame (`.frame` on `<main>`) draws two hairline verticals one gutter outside the grid,
section rules (`.ruled`) run full-bleed, and 9px registration marks sit where they cross. The
Experience timeline is drawn on the frame line on wide screens, under Fig. 4, a year ruler of every
role (`components/role-timeline.tsx`) whose bars and rows light each other up on hover, in CSS.
Figures carry a mono `Fig. n` token and a sans caption. Dot fields appear only inside bounded objects (the simulator canvas, the stages, the
band). There are no blurred glows, no background grid and no ambient animation.

**The live readout** above the headline (`components/sim-readout.tsx`) is fed by the simulator
through a tiny store (`lib/sim-readout.ts`): requests, p99 and errors, with a status dot that
follows the system's state and reads "paused" while the simulator is off-screen. It is
`aria-hidden`; the simulator's own `aria-live` hint is the accessible source.

**shadcn/ui** (Radix base, `components.json`) supplies the primitives in `components/ui`: dialog,
command (⌘K menu), slider, switch, sonner (toasts) and kbd. Its tokens (`--background`,
`--primary`, `--border`…) are mapped onto ours in `app/globals.css`, and its `dark:` variant
follows the same `data-theme` rules. To add a component: `npx shadcn@latest add <name>`. It
writes to `components/ui`. Check its colors in both themes.

**The hero simulator** (`components/live-system.tsx`, engine in `lib/live-sim.ts`) is a seeded
discrete-event simulation of balancer → app servers → cache → database that runs in the browser.
Capacities are set so visitors find each bottleneck in turn: two servers saturate near 400 req/s,
the database near 600 unless the cache is on. It starts when the page is idle, pauses off-screen
and in background tabs, and draws no request dots under reduced motion. Below a 480px canvas the
diagram flows top to bottom. The panel keeps one height whatever the server count (three or four
servers get one-line boxes), so the hero never reflows. Utilization shows by state only: white,
then amber above 70%, then coral above 90% or when a server is down; a dashed outline means only
"down". `diagnose()` writes the
hint line from where requests actually failed. The behavior is pinned by `tests/unit/live-sim.test.ts`.

**Product screenshots** live in `public/work`. Refresh them with `node scripts/capture-work-shots.mjs`
(installed Chrome, retina resolution), then update `width`/`height` in `lib/content.ts` if they changed. Systemlab is
captured at a 1320px viewport and cropped to the architecture canvas and its metrics, so its labels
stay readable at display size. Captures of a light UI are marked `light: true`; the dark theme
inverts them with `--shot-filter` (Systemlab has no dark mode), so no white rectangle glares on a
dark page.

**⌘K / Ctrl+K** opens the command menu (`components/command-menu.tsx`). The palette itself
(`command-palette.tsx`) loads on first use to keep cmdk out of the initial bundle.

## Analytics

First-party and cookie based, with no third-party scripts. `components/site-analytics.tsx`
sends a page view on every route change and an event when someone clicks a tracked link
(`data-track="..."`, external links, `mailto:` and the résumé).

`POST /api/analytics/track` drops bots, localhost and opted-out browsers, decides whether the
hit is a new visitor, a first view of that page, or a first visit today using three cookies
(`pf_vid`, `pf_seen`, `pf_day`), and then:

1. **Writes the hit to its own object** in `analytics/inbox/`. GCS allows only about one write
   per second to a single object, so hits never write the totals directly. The old version did,
   and lost counts whenever two visits landed close together.
2. **Folds the inbox into `analytics/index.json`** at most every 15 seconds, from the track
   route or the stats page. The write is conditional on the object's generation, so concurrent
   compactions can't overwrite each other. The index stores the last inbox key it folded (the
   cursor), so a retry never double counts.

`/stats` shows totals, the last 30 days, top pages and posts, referrers (including `?ref=` tags,
so a résumé link can be `.../?ref=resume`) and link clicks.

- **Stop counting your own visits:** open `/api/analytics/optout` once in each browser. Use
  `/api/analytics/optout?undo=1` to start counting again.
- **Testing without touching real numbers:** set `ANALYTICS_NAMESPACE=analytics-dev` to use a
  different prefix, and `ANALYTICS_COUNT_LOCALHOST=1` to count localhost.
- **Reset:** from the admin panel, or `POST /api/analytics/reset` with `x-admin-token`.

## Environment

| Variable | Used for |
|---|---|
| `ADMIN_TOKEN` | Admin panel and admin API routes |
| `GCS_BUCKET_NAME`, `GCS_SERVICE_ACCOUNT_EMAIL`, `GCS_PRIVATE_KEY` | Signed GCS writes (posts, gallery, analytics) |
| `NEXT_PUBLIC_GALLERY_HOST`, `NEXT_PUBLIC_GALLERY_PATH` | Allowed image host for `next/image` |
| `ANALYTICS_NAMESPACE`, `ANALYTICS_COUNT_LOCALHOST` | Optional, for testing analytics |

## Deploying

Pushing to `master` deploys to Netlify (`netlify.toml` pins Node 22). Netlify refuses to deploy
Next.js versions affected by CVE-2025-55182, so keep `next` on a patched 15.5.x release. To
read a failed build's log: `netlify logs -d <deploy-id> -s deploy --since <ISO time>`.
