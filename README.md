# Abdelrahman Mohamed — AI Engineer Portfolio

A modern, story-driven personal site for Abdelrahman Mohamed. Built with the Next.js App Router, typed end-to-end with TypeScript, and styled via Tailwind CSS v4. It spotlights AI agent work, full-stack delivery, and research-driven projects while offering a lightweight CMS experience for blog posts and résumé-driven content.

## Feature Overview
- Cinematic hero with matrix rain background, stats, and terminal-style typewriter.
- Sticky navbar with scroll progress, active-section tracking, and mobile-friendly hamburger menu.
- Resume-driven content model (`lib/content.ts`) powering skills, projects, stats, and contact cards.
- Blog engine sourced from `data/blogs.json`, with an authenticated `/admin` UI to publish Markdown and image blocks.
- Gallery pipeline fully backed by Google Cloud Storage (images + JSON metadata), with admin uploads/deletions routed through signed URLs.
- Responsive layouts across hero, timeline, gallery-ready sections, and call-to-action cards.
- Netlify-ready configuration (Next.js runtime plugin + `.next` publish folder).

## Tech Stack
- **Framework**: Next.js 15 (App Router, server components)
- **Language**: TypeScript (strict)
- **Styling**: Tailwind CSS v4, custom globals for matrix rain aesthetic
- **Fonts**: System stack (Inter/SF) via CSS
- **Tooling**: ESLint (Next config), Turbopack dev server
- **Deployment**: Netlify with `@netlify/plugin-nextjs`

## Directory Structure
```
app/              # App Router pages, layouts, API routes
components/       # Reusable UI building blocks (hero, navbar, cards, etc.)
data/blogs.json   # Serialized blog posts consumed at build time
lib/              # Content models and helper utilities
public/           # Static assets (favicon, résumé PDF)
docs/             # Additional documentation (roadmap, ideas)
netlify.toml      # Netlify build + plugin configuration
```

## Getting Started
```bash
npm install
npm run dev
```
Visit http://localhost:3000 to browse the site.

### Environment Variables
Create `.env.local` in the project root:
```
ADMIN_TOKEN=your-secret-token
# Gallery configuration
GCS_BUCKET_NAME=your-public-gallery-bucket
GCS_SERVICE_ACCOUNT_EMAIL=service-account@project.iam.gserviceaccount.com
GCS_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
NEXT_PUBLIC_GALLERY_HOST=storage.googleapis.com
NEXT_PUBLIC_GALLERY_PATH=your-public-gallery-bucket
```
- `ADMIN_TOKEN` gates the `/admin` publishing UI and API routes.
- `GCS_*` values come from a service account with `storage.objects.create` on the bucket.
- `NEXT_PUBLIC_GALLERY_*` controls which remote host Next.js allows; point it at your public bucket (e.g. `storage.googleapis.com` + bucket name).

### Useful Scripts
| Command          | Description                                     |
| ---------------- | ----------------------------------------------- |
| `npm run dev`    | Start the dev server (Turbopack)                |
| `npm run lint`   | Run ESLint against the entire project           |
| `npm run build`  | Production build (required for Netlify deploys) |
| `npm run start`  | Run the production server locally               |

## Content Management
- **Résumé & stats**: Update copy and metadata in `lib/content.ts`.
- **Projects**: Each entry contains tech tags, highlights, and optional URLs.
- **Blog posts**: Sourced from `data/blogs.json`. Each post includes `slug`, `title`, `date`, `excerpt`, and mixed content blocks.
- **Gallery**: Items are stored as JSON in your bucket (`gallery/metadata/index.json`) and contain `title`, `description`, `tags`, `imageUrl`, `objectPath`, and `createdAt`. Assets and metadata are served straight from Google Cloud Storage.

## Blog Admin Workflow
1. Ensure `ADMIN_TOKEN` is set (and pass it to Netlify if deployed).
2. Navigate to `/admin`.
3. Enter your token once per session.
4. Draft Markdown content (`## headings`, blank lines to split paragraphs, `![alt](url)` for images).
5. Publish to store the post in `data/blogs.json` and trigger incremental revalidation for `/`, `/blogs`, and `/blogs/[slug]`.

## Deployment (Netlify)
The repository includes `netlify.toml` pointing Netlify at `.next` and enabling the Next.js runtime.

If configuring through the UI:
- **Build command**: `npm run build`
- **Publish directory**: `.next`
- **Environment**: define `ADMIN_TOKEN`, `GCS_BUCKET_NAME`, `GCS_SERVICE_ACCOUNT_EMAIL`, `GCS_PRIVATE_KEY`, `NEXT_PUBLIC_GALLERY_HOST`, and `NEXT_PUBLIC_GALLERY_PATH`.

Netlify installs `@netlify/plugin-nextjs` automatically when it sees the plugin entry in `netlify.toml`. Ensure your bucket allows public reads so gallery images render (Uniform bucket-level access + public IAM or signed-serving CDN).

## Roadmap & Ideas
Future enhancements and recruiter-focused ideas live in [`docs/portfolio-growth.md`](docs/portfolio-growth.md). Highlights:
- Visual gallery with filtering and lightbox
- Case-study deep dives with architecture diagrams
- Testimonials, logos, and shareable recruiter packs
- Calendly “coffee chat” CTA and health indicators for live products

## Maintenance Checklist
- Refresh `lib/content.ts` with your latest achievements before application cycles.
- Keep `data/blogs.json` and blog posts fresh (the admin UI makes it easy).
- Confirm Netlify deploys succeed with the `.next` publish folder.
- Run `npm run lint` before pushing substantial changes.

## License
Personal portfolio—feel free to reference for learning, but please do not republish wholesale.
