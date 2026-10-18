# abdelrahmanm.dev

Personal site of Abdelrahman Mohamed: work, experience, writing, a gallery and public site stats.
Next.js 15 (App Router), TypeScript, Tailwind CSS v4, deployed on Vercel. Blog posts, gallery
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

"Liquid World": the whole home page floats on a real fluid. A GPU fluid simulation
(`lib/fluid.ts`, adapted from Pavel Dobryakov's MIT-licensed WebGL-Fluid-Simulation) runs on one
fixed canvas under everything (`components/liquid-field.tsx`); there are no opaque sheets. Its dye
is drawn as marbling: a faint fill plus thin contour lines at even steps of density, so a busy
system adds lines instead of turning the page into a wash. It is ink on pale water in the light
theme and lit smoke on near-black in the dark one, and it can only paint the neutrals and the one
accent, cobalt (`--signal`).

How the liquid behaves:

- The pool scrolls with the page at a parallax (0.62), and scroll speed stirs it.
- Text sits on calm water: every `data-calm` block is a rectangle (with a ragged, noisy shore) where
  both dyes are held back and the current slowed, so the liquid flows around text like water round
  stones. The header's band and the ruler's lane are always calm.
- The Experience and Background chapter (`data-chapter="invert"`) is set in the opposite theme. The
  shader draws that band of the pool, edged by a wobbling cobalt waterline the current pushes
  around, so entering it is a liquid hand-off. A `.chapter-ground` under the canvas carries the same
  colour for contrast checks and for browsers without WebGL.
- The hero simulator drives it through `lib/flow-bus.ts`: the current comes out of the device, a
  river of ink that leaves from under its lower-left corner, runs beneath the hero copy and turns up
  the left lane beside the name, with a cobalt thread that thickens with load. More traffic is a
  faster, denser river; strain makes it sway; failing requests tint the thread; a killed server
  sends one cobalt bloom down it that settles back. An ambient curl-noise force keeps the whole
  pool drifting at idle. The pointer stirs it along its path (splats grow with its speed), the
  HUD's flying letters and the spine's packet drag it, rows and cards drop ink when you enter
  them, and below the hero drips (ink) and a slow current from the left keep it moving.
- The display traces everything on a blurred copy of the dye: the fill is a smooth gradient and
  each contour is a constant-width, anti-aliased hairline (from the field's value and gradient);
  levels too close to resolve fade into the fill, and flecks too small to matter draw no lines.
- The product screenshots and the portrait are drawn into the same GL context (`data-gl`): they
  condense out of the ink as they arrive, bow with scroll speed, are refracted by the current while
  the page moves, and ripple and magnify under the pointer. Within half a second of rest they are
  the plain image again, sharp and in colour. The `<img>` keeps its box (and is what phones and
  no-WebGL browsers see).

On top of it (`components/hud.tsx`, `components/spine.tsx`, `components/cursor.tsx`):

- The HUD, after getartcraft.com/apps: as you leave the hero, the name's letters fly into the
  header's brand ("Am. Mohamed": the A into the mark's A, the rest of the first name into its
  cobalt full stop, which then runs the mark's route and writes the m again). The mark itself is
  generated by `scripts/brand/build_mark.py` (paths, pen route, keyframes, favicons). Section names wait sideways on the right edge and, as each
  section reaches the top, fly letter by letter along curves into the top-right corner, where
  earlier names shrink into a breadcrumb stack. Project names lift off their own poster type on the
  page and leave an outline behind. A flip left half-done when you stop scrolling finishes on its
  own. On the right edge a ruler (tick tape, needle, rolling percent) zooms out into a map of the
  page when you point at it, behind its own frost, while the docked names step aside; click or drag
  to travel. The stack also steps aside rather than sit on the portrait. Laptops with motion only.
- Phones and tablets get the small HUD (`components/mobile-hud.tsx`): each section's big title lifts
  off letter by letter, leaving its outline, and flies into a frosted "01 / Work" bar under the header.
- The spine: a wire in the left lane from the simulator to the contact keys. A packet rides it at
  mid-screen, lights each station, leaves a cobalt thread in the liquid, and carries the simulator's
  health ("GET /work · 84 ms", or "503" in the fail colour once you've broken it, with the wire
  behind it in the fail colour too). At the bottom of the page it is delivered beside "Email me"
  ("200 /contact") and the wire branches across to the key.
- The cursor: a cobalt drop on the pointer with an ink ring that trails and stretches; over things
  that say what they do it puts a labelled disc ("Enlarge", "Open", "Read") just below and right of
  the pointer, so the word you're pointing at stays readable.
- The intro (`components/intro.tsx`): once per tab, a counter rolls to the simulator's 160 req/s
  and the sheet lifts away with a bowed edge. Pure CSS, gated by the head script.
- Smaller motions (`components/choreo.tsx`): count-ups, the off-the-clock "rivers of type" that run
  at scroll speed (the first one peeks in under the hero on laptops), tide rows and project cards
  that fill from the edge the pointer entered by (real hovers only), the experience odometer that
  rolls to the start date of the role you're reading, the contact card assembling, cobalt wipe
  reveals on the poster type line by line, and the header turning over to the chapter's colours
  while the chapter runs under it.

One frame loop (`lib/ticker.ts`) drives Lenis first and then every subscriber, so the canvas, the
HUD and the DOM always agree on the scroll position. Reveals hide content only after
`html[data-motion="on"]` is set, so without JavaScript or under `prefers-reduced-motion`
everything is simply there; reduced motion also drops the HUD, cursor, intro, rivers and Lenis,
renders the liquid as one still frame (redrawn as you scroll, so the chapter keeps its ground), and
shows the spine as a finished drawing with the packet delivered. The fluid engine, the HUD and the cursor are separate
chunks loaded after hydration (the HUD and cursor only on fine pointers), so the home page's first
load is the same size as before. The field caps the pixel ratio (1.5 desktop, 1.25 touch), pauses
in background tabs, and on an M2 Pro uses about 0.2 ms of main-thread time a frame. `?tune` on the
home page opens a tuner for the liquid's constants.

Type is Instrument Sans (variable; semi-condensed and heavy for the poster type, tight and large for
the name) with Instrument Serif italic as a second voice, and JetBrains Mono for dates, stacks,
numbers and readouts. Colors are CSS variables on `:root` (`--paper`, `--pool`, `--ink`, `--ink-2`,
`--graphite`, `--rule`, `--signal`, `--screen`, `--fluid-*`, and `-x` twins for the opposite theme)
exposed to Tailwind as `bg-paper`, `text-graphite` and so on. The object classes (`.wrap`,
`.sec-head`, `.poster`, `.device`, `.screen`, `.key`, `.keycap`, `.spec`, `.stat-stack`,
`.tide-row`, `.lineup-grid`, `.chip`, `.tag-mono`, `.odometer`, `.marquee`) are in `app/globals.css`.

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

Pushing to `master` deploys to Vercel (project `abdelrahmanm`, team vvarrior1s-projects), and every other
branch gets a preview URL. Production is https://abdelrahmanm.dev; `www` 308-redirects to the apex. The domain is
registered at Namecheap with its nameservers pointed at Vercel (`ns1/ns2.vercel-dns.com`), so DNS is managed in Vercel.
Deploy through git pushes, not `vercel deploy`: CLI uploads ignore `.gitignore` (see `.vercelignore`).

The old address https://abdelrahmanmohamed1.netlify.app is printed on résumés that are already out, so the Netlify site
must stay up. It still builds `master`, and `netlify.toml` 301s every request on that host to the same path on
abdelrahmanm.dev. Never delete that site. Keep `next` on a patched 15.5.x release
(CVE-2025-55182); Netlify refuses to build affected versions. To read a failed Netlify build's log:
`netlify logs -d <deploy-id> -s deploy --since <ISO time>`.
