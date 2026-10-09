# CLAUDE.md

Read `README.md` first: it covers setup, file layout, the design system and how analytics works.
This file holds the rules that aren't obvious from the code.

## Commands

`npm run lint`, `npm run typecheck`, `npm test` (Vitest), `npm run build`,
`PW_CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" npm run test:e2e`.
Run all of them before pushing; `npm run ci` chains them.

## Content

- Profile content lives only in `lib/content.ts`. Facts there come from the résumés and the CYD
  case study (github.com/VVarrior1/cyd-platform-case-study). Don't invent numbers; if two
  sources disagree, use the newer one and say so.
- The résumé file name `public/Abdelrahman_Mohamed_Resume.pdf` is linked from outside the site
  (LinkedIn, applications). Replace the file; never rename it.
- Posts and gallery items come from GCS (`lib/blogs.ts`, `lib/gallery.ts`) and are managed in `/admin`.

## Design rules

- Colors only through the tokens in `app/globals.css` (`paper`, `ink`, `graphite`, `rule`,
  `signal`, `trace`, `chart`). Every token has a dark value; check both themes.
- No all-caps eyebrow labels, chips or card grids. Hierarchy comes from type size, weight and rules.
- The hero trace is the only motion that isn't triggered by the user. Keep it that way, and
  respect `prefers-reduced-motion`.

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
