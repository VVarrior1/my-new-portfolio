# Abdelrahman Mohamed — Portfolio

Modern AI-first engineering portfolio built with Next.js 15, TypeScript, and Tailwind CSS 4. It showcases Abdelrahman Mohamed’s experience across AI agents, ML pipelines, and full-stack product delivery.

## Tech stack
- Next.js (App Router + Turbopack)
- TypeScript with strict mode
- Tailwind CSS v4 (utility-first styling)
- System font stack with custom gradients and glassmorphism accents

## Highlights
- Glassmorphism hero with animated stats and gradient-backed background system
- Sticky navigation with scroll progress indicator for deep scrolling
- Auto-rotating skill marquee and hover-reactive cards across skills, experience, and projects
- Resume-driven data model for one-touch content edits and PDF download CTA
- Matrix-style rainy background and terminal typewriter to set the tone for AI-first work
- Blog system with legacy articles, dynamic admin publishing, and statically generated detail pages

## Structure
- `app/` – App Router pages and global layout
- `components/` – Reusable UI building blocks (hero, navigation, grids)
- `lib/content.ts` – Resume-driven content and structured data
- `public/` – Static assets, including downloadable résumé

## Getting started
```bash
npm install
npm run dev
```
Visit [http://localhost:3000](http://localhost:3000) to view the site. Edit `lib/content.ts` to update projects, experience, or skills.

## Deployment
The app is production-ready for platforms like Vercel or Netlify:
```bash
npm run build
npm start
```
This runs the optimized Next.js production build.

## Blog admin
- Set an `ADMIN_TOKEN` environment variable before running `npm run dev` or deploying.
- Visit `/admin`, enter the token, and draft markdown content (supports `## Headings` and `![alt](url)` images).
- The form publishes through `/api/blogs`, updates `data/blogs.json`, and triggers ISR on `/`, `/blogs`, and `/blogs/[slug]`.

## Customization tips
- Adjust palette, spacing, and global styles in `app/globals.css`
- Update SEO metadata (Open Graph, Twitter) in `app/layout.tsx`
- Add new sections by composing the existing SectionHeading + grid components

Pull requests and issues are welcome.
