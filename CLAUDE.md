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

The design is "Signal": scroll is the timeline. The page opens on a title card (the name as a
poster), a sheet carrying the live simulator slides over it, and one wire (the spine) runs from
the simulator past every project and role to the contact console, with a volt packet riding it at
the middle of the screen. Read the token comments at the top of `app/globals.css` and the header of
`components/choreography.tsx`.

- Colors only through the tokens in `app/globals.css` (`stage`, `paper`, `paper-raised`, `key-face`,
  `ink`, `ink-2`, `graphite`, `rule`, `rule-strong`, `signal`, `signal-edge`, `signal-text`, `spine`,
  `spine-lit`, `screen-*`, `trace`, `fail`, `fail-paper`, `go`). Every token has a dark value; check
  both themes. Neutrals sit on one olive hue (OKLCH h 106–129, chroma ≤ 0.012) so they agree with the
  volt; check new neutrals with a script, not by eye.
- One accent: volt (`--signal`), meaning "live". It fills the packet, lit station nodes and the branch
  sweep, the hero's marker stroke, the simulator's kill key and fader cap, and the console's
  "Email me". It is a fill, never text on a light surface (1.2:1): on light paper it always carries
  an ink edge (`--signal-edge`), and `--signal-text` falls back to ink. Status colours (`--trace`,
  `--fail`, `--screen-go`) live on screens; on the paper only `--go` (the availability dot) and
  `--fail-paper` (the packet while the simulator is failing) carry status. No second accent, no
  glows, no coloured section backgrounds.
- Type: Archivo at its condensed end (wdth 62–70, wght 800, capitals) for the name, section titles,
  project names and big figures (`.t-poster`, `.t-section`, `.t-title`, `.t-number`, `.t-display` on
  other pages); Instrument Sans for everything you read (15/17/20); JetBrains Mono for data (dates,
  stacks, URLs, station labels, screens), 13px on paper and 12px on screens. The contrast between a
  poster above and a spec sheet below is the hierarchy; don't add mid sizes.
- The name fills its line: `.hero-name`'s size is the content width divided by ABDELRAHMAN's
  measured width in em (5.57). Re-measure if the face, cut or name changes, and check 390/1024/1440
  for horizontal overflow.
- Layout: one container (`.wrap`, 78rem) with a wider left padding (`--pad-l`) that holds the spine's
  lane (`--lane`). Anything a station attaches to must start on the content edge and be `relative`
  (see `components/spine.tsx`). Experience, Background and Writing share the 3/9 split. Three radii:
  8px (controls, nodes), 12px (frames, screens), 20px (panels, the console); the sheet is 28px.
- Motion lives in `components/choreography.tsx` (GSAP + ScrollTrigger + Lenis, imported after load)
  and in the CSS load intro (`.intro-*` in `globals.css`). Rules:
  - Every scroll effect is scrubbed or reversible: scrolling back plays it backwards. Text reveals
    play to completion once triggered (never leave words half-faded at rest); graphics may scrub.
  - Progressive enhancement: the markup's resting state is the finished state. Hidden "from" states
    are set only by the script, and CSS states that wait for it are scoped to `html[data-motion]`.
  - Animate only transform, opacity and clip-path. Text that changes while scrolling (the packet's
    tag) is SVG text, which never registers as a layout shift. Check CLS with a PerformanceObserver.
  - Under `prefers-reduced-motion: reduce` nothing loads: no Lenis, no scrubbing, no intro; the spine
    is a static drawing. The simulator draws no request dots.
  - No pinned (`pin: true`) sections: the experience strip uses CSS `position: sticky`, so anchors
    (`#work`, `#contact`), the command menu and the browser's find all keep working. In-page links
    and the command menu glide through `lib/smooth-scroll.ts`; dialogs and popovers carry
    `data-lenis-prevent`, and Lenis stops while a modal holds the scroll lock.
  - The simulator still starts on idle (it blocked first paint when it started on hydration:
    Lighthouse 72 → 97). The status line and diagram share a fixed height (`DISPLAY_HEIGHT`), and the
    diagram flows top to bottom below 560px. The packet carries the simulator's last health: break the
    system and every request on the page fails (503) until you fix it.
- "A · B · C" lists use `DotList` (`.sep-list`), which never leaves a separator dangling at a line end.
- shadcn components in `components/ui` are ours to edit. Theme them through the token mapping in
  `globals.css`, not per-component colors. cmdk separators inside the list break ARIA, so don't add them.
  Object classes live in `@layer components` so Tailwind utilities can still override them; keep
  element resets (`a`, `:focus-visible`) in `@layer base` for the same reason.
- History, so it isn't repeated: purely typographic light versions were "bland"; Calgary stock photos
  "forced and irrelevant"; grid + blue/green/violet glows 4/10 ("the colors are off"); Night Ops (dark,
  light beams) liked, then "mid"; Workbench (warm paper, international orange, hardware objects) and
  its cutting-mat variant read as tidy but "something is missing" (about 6.5/7 to the owner). The
  owner scores 1.5–2 points below AI judges; tidy and coherent lands at 6.5. What they asked for is
  life: fluid motion with meaning, scale, and a through-line.
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
