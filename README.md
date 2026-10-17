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

"Liquid": the page is a stack of sheets floating on a pool of real fluid. A GPU fluid simulation
(`lib/fluid.ts`, adapted from Pavel Dobryakov's MIT-licensed WebGL-Fluid-Simulation) runs on one
fixed canvas behind everything (`components/liquid-field.tsx`). The hero and the contact section
are transparent windows onto it, and every other section is an opaque, rounded sheet inset by a
thin rail, so the liquid also shows in the channels between them. It is ink on paper in the light
theme and lit smoke on near-black in the dark one, and it can only paint the neutrals and the one
accent, cobalt (`--signal`).

The hero simulator drives it through `lib/flow-bus.ts`: incoming traffic is a current flowing
into the device, strain (latency, errors, a dead server) makes it turbulent and tints it cobalt,
and killing a server blooms cobalt out of the device at that node. The pointer stirs it,
scrolling drags a wake off the sheets' edges (`data-liquid-edge`), and the theme toggle drops
ink into it while the new theme floods out of the button as an ink blot (View Transitions,
`blotPath` in `lib/theme.ts`). The fluid holds back behind the hero's text and the contact block
(`data-liquid-protect`), so words always sit on clean water.

Below the fold, `components/motion-root.tsx` adds inertial scrolling (Lenis, loaded after
hydration) and reveals: section titles rise out of their own clip, rows rise in, and project
screenshots and the portrait open with the same ink blot as the theme switch (`data-reveal`).
Buttons are pills that pour full of ink (or cobalt) from the bottom on a spring. Reveals hide
content only after `html[data-motion="on"]` is set, so without JavaScript or under
`prefers-reduced-motion` everything is simply there; reduced motion also turns Lenis off and
renders the liquid as one still frame.

The field starts once the page has loaded and gone idle, caps the pixel ratio (1.5 desktop, 1.25
touch), pauses in background tabs, and runs at half rate when only the rails are in view. Without
WebGL the windows show the plain pool colour. On an M2 Pro it holds 60 fps at 1440×900 (2160×1350
canvas) with about 0.1 ms of main-thread time a frame.

Type is Instrument Sans (variable; set tight and large for the name and section titles) with
Instrument Serif italic as a second voice for one or two words, and JetBrains Mono for dates,
stacks, numbers and readouts. Colors are CSS variables on `:root` (`--paper`, `--pool`, `--ink`,
`--ink-2`, `--graphite`, `--rule`, `--signal`, `--screen`, `--fluid-*`…) exposed to Tailwind as
`bg-paper`, `text-graphite` and so on. The object classes (`.sheet`, `.device`, `.screen`, `.key`,
`.key-signal`, `.key-ink`, `.keycap`, `.stage`, `.spec`, `.stat-row`, `.pour-row`, `.sep-list`)
are in `app/globals.css`.

**shadcn/ui** (Radix base, `components.json`) supplies the primitives in `components/ui`: dialog,
command (⌘K menu), slider (the simulator's fader is built on its Radix primitive), sonner (toasts) and kbd. Its tokens (`--background`,
`--primary`, `--border`…) are mapped onto ours in `app/globals.css`, and its `dark:` variant
follows the same `data-theme` rules. To add a component: `npx shadcn@latest add <name>`. It
writes to `components/ui`. Check its colors in both themes.

**The hero simulator** (`components/live-system.tsx`, engine in `lib/live-sim.ts`) is a dark
instrument (`.device`) floating on the liquid. It is a seeded
discrete-event simulation of balancer → app servers → cache → database that runs in the browser.
Capacities are set so visitors find each bottleneck in turn: two servers saturate near 400 req/s,
the database near 600 unless the cache is on. It starts when the page is idle, pauses off-screen
and in background tabs, and draws no request dots under reduced motion. Status colours appear only
on its screen; failed requests are drawn as × marks so they read without colour. `diagnose()` writes the
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
