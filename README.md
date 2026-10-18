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

"Liquid Signal": the home page floats on a pool of real fluid, and one request travels down it.

**The liquid.** A GPU fluid simulation (`lib/fluid.ts`, adapted from Pavel Dobryakov's
MIT-licensed WebGL-Fluid-Simulation) runs on one fixed canvas behind the whole page
(`components/liquid-field.tsx`). There are no opaque sheets: the page is transparent over it, and
the display shader holds the dye back behind every block of text (`data-liquid-protect`, up to 16
boxes), so words sit on clean water while the liquid moves in the margins and between blocks. It is
ink in water in the light theme and lit smoke on near-black in the dark one. Its dye channels are
meanings: neutral, cobalt (`--signal`) and failure. A tone curve with a floor keeps a busy system
from silting up into a grey or indigo wash; cobalt is drawn mostly on the dye's edges, as
filaments, and a hairline drafting grid shows only where the ink is.

The hero simulator drives it through `lib/flow-bus.ts`: incoming traffic is a current flowing
into the device, strain makes it turbulent and threads it with cobalt, and killing a server
blooms cobalt out of the device. The pointer stirs it, screenshots drag a wake as they scroll
(`data-liquid-edge`), and the theme toggle drops ink into it while the new theme floods out of
the button as an ink blot (View Transitions, `blotPath` in `lib/theme.ts`).

**The spine** (`components/choreo.tsx`). A wire leaves the simulator, runs out to the frame's
left edge and down the page to the contact keys. A packet rides it at the middle of the screen,
inking the wire behind it and lighting a station at every section; its tag reads
`GET /work · 66 ms` from the simulator's live p99. It trails dye into the liquid while you
scroll, a comet tail that streams back up the page and curls when you stop. If you broke the
simulator, the packet turns red, reads `503`, and its tail is the fail colour; at the contact
section it is delivered (`200`) beside "Email me".

**The rail** (`components/hud.tsx`, after getartcraft.com/apps). On laptops a ruler runs down the
right edge: a 1% tick tape slides past a cobalt needle with a rolling percent readout, ticks near
the needle stretch with scroll speed, and each section start is a cobalt mark. Each section's
name is split into letters: upcoming names wait at the bottom right, the next stands on deck up
the rail, and as its section reaches the top the letters peel off (last first) and fly in arcs
to the top-right corner, turning upright; the previous name shrinks into the pile above. A
half-finished flight settles once you stop scrolling. Hover the rail and it zooms out into a map
of the page (the words glide to their sections, a bracket marks the screen); click or drag to
travel. The maths is in `lib/hud-math.ts`.

**Sections** open on a sticky eyebrow bar (`01 / WORK`, mono, frosted) inside one framed column
with hairlines down both sides. Projects pair a screenshot that opens like a window as it rises
with a two-voice name, a hairline grid of figures that count up, the hard part, mono tags and
links; the smaller projects and the toolkits sit on hairline card grids with cobalt number chips
and fills that slide in from the side the pointer entered. Experience pins its timeline strip
and lights the role you're reading. The personal line runs as two marquee rows (Archivo caps and
Instrument Serif italic) in opposite directions, faster while you scroll. Poster lines are
revealed by a cobalt bar that sweeps across and pulls away (`data-reveal="wipe"`).

**Progressive enhancement.** Everything is in the HTML and readable without JavaScript. Reveals
hide content only under `html[data-motion="on"]`. Under `prefers-reduced-motion` the page is a
finished drawing: Lenis off, the liquid one still frame, the wire fully inked, the packet
delivered, the marquee replaced by the plain list, no rail. The rail only mounts on a fine pointer
at 1024px and up; elsewhere each section shows its name large. The liquid starts once the page
has loaded and gone idle, caps the pixel ratio (1.5 desktop, 1.25 touch) and pauses in background
tabs; every loop pauses when hidden. Without WebGL the page shows the plain pool colour.

Type is Instrument Sans (text and the name) with Instrument Serif italic as a second voice,
Archivo (variable, wide caps) for the rail's words, section words, the marquee and big figures,
and JetBrains Mono for data and HUD labels. Colors are CSS variables on `:root` (`--pool`,
`--ink`, `--graphite`, `--rule`, `--wire`, `--signal`, `--screen`, `--fluid-*`…) exposed to
Tailwind as `bg-pool`, `text-graphite` and so on; the object classes (`.frame`, `.eyebrow`,
`.station`, `.packet`, `.hud-*`, `.marquee`, `.project`, `.stat-grid`, `.lineup`, `.tag-mono`,
`.chip`, `.device`, `.key`, `.spec`) are in `app/globals.css`.

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
