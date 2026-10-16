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

Light by default, with a dark theme that follows the OS or the header toggle (both are authored,
not inverted). The toggle reveals the new theme as a circle using the View Transitions API, and
switches instantly where that API isn't available or the visitor prefers reduced motion.
IBM Plex Sans (400-600) for prose and headings, IBM Plex Mono for every date, stack, number, URL
and readout. Colors are CSS variables on `:root` (`--paper`, `--paper-raised`, `--surface-2`,
`--ink`, `--ink-2`, `--graphite`, `--rule`, `--rule-strong`, `--signal`, `--trace`, `--go`,
`--plate-*`) exposed to Tailwind as `bg-paper`, `text-graphite` and so on. Every neutral sits at
OKLCH hue 258-274 with chroma at or below 0.017, so paper, ink and rules share one temperature.
The UI accent (`--signal`) is ink itself; the only hues are status colors (`--trace` strained,
`--destructive` failing, `--go` up), and they appear only in the simulator, its readouts and status dots.
Component classes (`.btn-key`, `.btn-ghost`, `.t-section`, `.frame`, `.device`…) live in
`@layer components`, so Tailwind utilities can still override them.

**shadcn/ui** (Radix base, `components.json`) supplies the primitives in `components/ui`: dialog,
command (⌘K menu), slider, switch, sonner (toasts) and kbd. Its tokens (`--background`,
`--primary`, `--border`…) are mapped onto ours in `app/globals.css`, and its `dark:` variant
follows the same `data-theme` rules. To add a component: `npx shadcn@latest add <name>`. It
writes to `components/ui`. Check its colors in both themes.

**The heat plate** is the one decoration, and it is data. Slatted, grained light sits under the
simulator (`.heat-plate` in `globals.css`): steel blue when the system is healthy, amber when a
component passes 70% busy or the p99 passes 150 ms, red when requests fail or a server is down.
`assessHealth()` in `lib/live-sim.ts` decides the state (with hysteresis, so it doesn't flicker),
the simulator sets `data-health` on `.sim-stage`, and CSS crossfades the matching layer's opacity:
no extra JavaScript, compositor-only, instant under reduced motion. The grain is one inline SVG
used as a mask. A faint stateless copy (`.end-plate`) sits under the contact block. The footer shows
the simulator's last-known state (`lib/sim-status.ts`). Project screenshots sit in edge-lit
`.frame` panels; light captures are dimmed in dark mode (`--shot-filter`).

**The hero simulator** (`components/live-system.tsx`, engine in `lib/live-sim.ts`) is a seeded
discrete-event simulation of balancer → app servers → cache → database that runs in the browser.
Capacities are set so visitors find each bottleneck in turn: two servers saturate near 400 req/s,
the database near 600 unless the cache is on. It starts when the page is idle, pauses off-screen
and in background tabs, and draws no request dots under reduced motion. `diagnose()` writes the
hint line from where requests actually failed. The behavior is pinned by `tests/unit/live-sim.test.ts`.

**Product screenshots** live in `public/work`. Refresh them with `node scripts/capture-work-shots.mjs`
(installed Chrome, retina resolution), then update `width`/`height` in `lib/content.ts` if they changed.

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
