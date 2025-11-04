# CLAUDE.md: AI Engineer Portfolio Codebase Guide

This document provides a comprehensive overview of the portfolio project's architecture, development setup, and key patterns for effective collaboration.

## NPM Scripts & Development Commands

### Development & Build
```bash
npm run dev          # Start dev server with Turbopack (fast iteration)
npm run build        # Production Next.js build
npm run start        # Start production server
npm run typecheck    # TypeScript strict type checking (no emit)
npm run lint         # ESLint code quality checks
```

### Testing
```bash
npm run test         # Run unit tests once (vitest)
npm run test:watch   # Run tests in watch mode
npm run test:coverage # Generate coverage report (v8 provider)
npm run test:e2e     # Run Playwright E2E tests
npm run ci           # Full CI pipeline: lint → typecheck → test → build → e2e
```

### Development Workflow
```bash
# Typical development cycle
npm run dev          # Start dev server
npm run lint         # Check code quality
npm run typecheck    # Verify types before committing
npm run test:watch   # Run tests while coding
```

## High-Level Architecture

### Tech Stack Overview
- **Framework**: Next.js 15 (App Router, Server Components)
- **Language**: TypeScript 5 (strict mode)
- **Styling**: Tailwind CSS v4 + CSS Modules
- **Runtime**: Node.js 18+ (React 19.1.0)
- **Cloud**: Google Cloud Storage (GCS) for blogs and gallery
- **Deployment**: Netlify with `@netlify/plugin-nextjs`
- **Testing**: Vitest (unit) + Playwright (E2E)
- **Build**: Turbopack (dev) + Next.js (production)

### Content Management Strategy

The portfolio uses a **hybrid content model**:

```
┌─────────────────────────────────────────────────────────┐
│  STATIC CONTENT (lib/content.ts)                        │
│  - Hero section, experience, projects, skills           │
│  - Updated via code commit to git                       │
└─────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────┐
│  DYNAMIC CONTENT (Google Cloud Storage)                 │
│  - Blogs: storage.googleapis.com/bucket/blogs/          │
│  - Gallery: storage.googleapis.com/bucket/gallery/      │
│  - Updated via admin panel without code changes         │
└─────────────────────────────────────────────────────────┘
```

### Data Flow Architecture

```
Client (Next.js Page Components)
    ↓
API Routes (/app/api/*)
    ↓
GCS Utilities (lib/gcs.ts) or Local Content (lib/content.ts)
    ↓
Google Cloud Storage / Static Files
```

### Key Architectural Decisions

1. **App Router (Next.js 15)**: Modern server-first approach with seamless SSR/SSG
2. **Server Components by Default**: Optimizes JavaScript delivery and enhances SEO
3. **Signed URLs**: Time-limited (15 min) GCS access for secure admin operations
4. **Cache Revalidation**: Immediate updates after admin actions without full rebuild
5. **Hybrid Content**: Static config for profile data, cloud for dynamic content
6. **Client Tracking**: localStorage-based unique view tracking with version management
7. **Token-Based Admin Auth**: Simple environment variable-based authentication

## Directory Structure & Purpose

```
my-new-portfolio/
├── app/                          # Next.js App Router (routing & pages)
│   ├── layout.tsx               # Root layout with metadata & providers
│   ├── page.tsx                 # Homepage (hero, skills, experience, projects)
│   ├── globals.css              # Global styles & Tailwind directives
│   ├── blogs/
│   │   ├── page.tsx             # Blog listing page (all posts)
│   │   └── [slug]/page.tsx      # Individual blog post page
│   ├── gallery/
│   │   └── page.tsx             # Gallery grid page (responsive masonry)
│   ├── admin/
│   │   └── page.tsx             # Hidden content management UI
│   └── api/                      # Backend API routes
│       ├── auth/                # Authentication utilities
│       ├── blogs/route.ts       # Blog CRUD: GET all, POST create
│       ├── blogs/[slug]/route.ts # Blog DELETE endpoint
│       ├── gallery/route.ts     # Gallery CRUD endpoints
│       ├── gallery/upload-url/route.ts # Generate signed URLs
│       ├── gallery/[id]/route.ts # Gallery item DELETE
│       └── analytics/
│           ├── track/route.ts   # Track page & blog views
│           └── reset/route.ts   # Admin analytics reset
│
├── components/                   # Reusable React components
│   ├── hero.tsx                 # Animated hero with typewriter effect
│   ├── navbar.tsx               # Top navigation with scroll tracking
│   ├── background.tsx           # Matrix rain animation
│   ├── gallery-grid.tsx         # Responsive gallery masonry layout
│   ├── blog-card.tsx            # Blog preview card
│   ├── blog-detail.tsx          # Full blog post display
│   ├── experience-timeline.tsx  # Professional timeline visualization
│   ├── project-grid.tsx         # Featured projects showcase
│   ├── skills-grid.tsx          # Skills categorized display
│   ├── analytics-display.tsx    # View counter widget
│   ├── scroll-progress.tsx      # Reading progress bar
│   └── ...                      # Additional UI components
│
├── lib/                          # Business logic & utilities
│   ├── content.ts               # Static content configuration (hero, skills, projects)
│   ├── blogs.ts                 # Blog data operations (fetch, save, delete from GCS)
│   ├── gallery.ts               # Gallery data operations (CRUD)
│   ├── gcs.ts                   # Google Cloud Storage utilities (signed URLs)
│   ├── analytics.ts             # Analytics tracking utilities
│   └── date-utils.ts            # Consistent date formatting (prevents hydration errors)
│
├── hooks/                        # Custom React hooks
│   └── use-track-view.ts        # Analytics tracking hook with localStorage
│
├── contexts/                     # React Context providers
│   └── audio-context.tsx        # Audio player state management
│
├── public/                       # Static assets (CDN)
│   ├── Abdelrahman_Mohamed_Resume.pdf
│   └── favicon.ico
│
├── data/                         # Legacy data files
│   └── blogs.json               # Fallback blog data (local)
│
├── test/                         # Test setup & utilities
│   └── setup.ts                 # Vitest configuration
│
├── tests/
│   ├── unit/                    # Unit tests for components/utilities
│   └── e2e/                     # Playwright E2E tests
│
├── .github/workflows/            # GitHub Actions CI/CD
├── .netlify/                     # Netlify configuration
├── .claude/                      # Claude Code settings
│   └── settings.local.json      # Permissions & allowed tools
│
├── Configuration Files
│   ├── package.json             # Dependencies & scripts
│   ├── tsconfig.json            # TypeScript configuration (strict mode)
│   ├── next.config.ts           # Next.js configuration (images, optimization)
│   ├── eslint.config.mjs         # ESLint rules (next/typescript)
│   ├── vitest.config.ts         # Unit test configuration
│   ├── playwright.config.ts     # E2E test configuration
│   ├── postcss.config.mjs        # PostCSS for Tailwind
│   ├── netlify.toml             # Netlify build & deployment
│   └── .env.local.example       # Environment variables template
│
└── .gitignore                    # Git exclusions
```

## Important Patterns & Conventions

### 1. Content Management

**Static Content (lib/content.ts)**
- Hero, experience, projects, skills, education, stats
- Edit directly in TypeScript with types
- Changes require git commit + deployment
- Used for permanent profile information

**Dynamic Content (Google Cloud Storage)**
- Blogs: Stored as JSON with markdown blocks
- Gallery: Images + metadata in separate GCS paths
- Updated via admin panel at `/admin` (hidden)
- Survives deployments without rebuilds

### 2. Blog Architecture

**Blog Data Structure:**
```typescript
type BlogPost = {
  slug: string;           // URL identifier
  title: string;          // Display title
  date: string;           // Publication date (ISO)
  excerpt: string;        // Summary (auto-generated if not provided)
  content: BlogContentBlock[]; // Markdown parsed into blocks
};
```

**Blog Operations:**
- `getAllBlogs()` - Fetch metadata list, sorted by date (descending)
- `getBlogBySlug(slug)` - Get full post with content
- `appendBlog(blog)` - Save new post + update index
- `deleteBlog(slug)` - Remove post + update index

**Markdown Support:**
```markdown
## Heading
Paragraph with **bold** and *italic*.
![Image alt](https://example.com/image.jpg)
```

### 3. Admin Panel Authentication

**Security Model:**
- Admin token stored in `ADMIN_TOKEN` environment variable
- Token passed via request headers or body
- No public links to admin interface (URL-based hiding)
- Client-side session storage for convenience during editing

**Protected Operations:**
- Blog creation/deletion
- Gallery uploads/deletions
- Analytics reset
- All routes validate token before executing

### 4. Analytics & Tracking

**Unique View Tracking:**
```typescript
// useTrackPageView(path) - Track pages (/, /gallery, /blogs)
// useTrackBlogView(slug)  - Track individual blog posts

// Tracks per 24 hours with localStorage
// Versioned to auto-clear stale data on schema changes
```

**View Counter Widget:**
- `<AnalyticsDisplay />` - Shows total + unique views
- Fetches from `/api/analytics/track`
- Real-time update on mount

### 5. Image & Asset Handling

**Next.js Image Optimization:**
```typescript
// next.config.ts
remotePatterns: [{
  protocol: "https",
  hostname: "storage.googleapis.com",
  pathname: "/portfolio-gallery1/**"
}]

// Formats: WebP, AVIF
// Device sizes: 640, 750, 828, 1080, 1200, 1920, 2048, 3840
// Cache: 60s minimum
```

**GCS Signed URLs:**
- Method: `generateSignedUrl({ objectName, method, contentType })`
- Algorithm: GOOG4-RSA-SHA256
- Expiry: 15 minutes (configurable)
- Purpose: Secure PUT/DELETE for admin operations

### 6. TypeScript Patterns

**Strict Mode Enabled:**
```json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true
  }
}
```

**Path Aliases:**
```json
{
  "paths": {
    "@/*": ["./*"]
  }
}
```

Use: `import { hero } from "@/lib/content"` (not `../../lib/content`)

### 7. Component Patterns

**Server Components (Default):**
- Used for data fetching and layout
- Zero JavaScript overhead
- Example: Blog listing, gallery grid

**Client Components (When Needed):**
```typescript
"use client"; // Directive at top

// Use for:
// - Event handlers (onClick, onChange)
// - React hooks (useState, useEffect)
// - Context consumption
```

**Example:**
```typescript
// components/hero.tsx - Client component
"use client";
import { useState, useEffect } from "react";

export function Hero() {
  // Hooks and interactivity here
  return <section>...</section>;
}
```

### 8. Error Handling

**API Routes:**
```typescript
// All endpoints:
// 1. Validate request (token, body shape)
// 2. Execute operation with GCS
// 3. Return typed response { data?, error? }
// 4. Revalidate cache with revalidatePath()
// 5. Never expose sensitive errors
```

**Client-Side:**
- Try/catch blocks in async operations
- Console warnings (not errors) for non-critical failures
- Graceful fallbacks to local content

### 9. Testing Structure

**Unit Tests (vitest):**
```bash
tests/unit/                    # Component & utility tests
├── components/               # Component logic tests
├── lib/                      # Library function tests
└── hooks/                    # Custom hook tests
```

**E2E Tests (Playwright):**
```bash
tests/e2e/                     # Full user flow tests
└── *.spec.ts                 # Playwright test files
```

**Configuration:**
- Unit tests: jsdom environment
- E2E tests: Real browser (headless)
- Local E2E: Uses CONTENT_SOURCE=local (fallback data)

### 10. Deployment & Environment

**Environment Variables (.env.local):**
```env
# Admin
ADMIN_TOKEN=secure-token-here

# Google Cloud Storage
GCS_BUCKET_NAME=portfolio-gallery1
GCS_SERVICE_ACCOUNT_EMAIL=service@project.iam.gserviceaccount.com
GCS_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"

# Next.js Image Optimization
NEXT_PUBLIC_GALLERY_HOST=storage.googleapis.com
NEXT_PUBLIC_GALLERY_PATH=portfolio-gallery1
```

**Netlify Deployment:**
1. Set environment variables in Netlify dashboard
2. Push to GitHub triggers build
3. `npm run build` compiles Next.js
4. `.next` directory deployed as serverless functions
5. GCS provides CDN for assets

## Common Workflows

### Adding a New Page
1. Create file in `app/[section]/page.tsx`
2. Use Server Component by default
3. Import static content from `lib/content.ts` if needed
4. Add navigation link in `components/navbar.tsx`
5. Update metadata in `app/layout.tsx` if needed

### Publishing a Blog Post
1. Navigate to `/admin`
2. Enter admin token (stored in `.env.local`)
3. Write markdown with editor
4. Click "Publish" → saves to GCS
5. Appears immediately on `/blogs`

### Uploading Gallery Items
1. Go to `/admin` → Gallery tab
2. Upload image + add metadata (title, description, tags)
3. Image stored in GCS
4. Metadata in `gallery/metadata/index.json`
5. Appears immediately on `/gallery`

### Running CI Locally
```bash
npm run ci
# Runs: lint → typecheck → test → build → test:e2e
```

### Debugging GCS Operations
```bash
# Fetch blogs index
curl -s "https://storage.googleapis.com/portfolio-gallery1/blogs/index.json"

# Fetch specific blog
curl -s "https://storage.googleapis.com/portfolio-gallery1/blogs/posts/[slug].json"

# Fetch gallery metadata
curl -s "https://storage.googleapis.com/portfolio-gallery1/gallery/metadata/index.json"
```

## Key Configuration Files

### next.config.ts
- Image optimization for GCS CDN
- Experimental package optimization
- Device sizes and formats (WebP, AVIF)
- Minimum cache TTL: 60 seconds

### tsconfig.json
- Target: ES2017
- Module: esnext
- JSX: preserve (Next.js handles)
- Path alias: `@/*` → root

### eslint.config.mjs
- Extends: `next/core-web-vitals`, `next/typescript`
- Enforces modern React & accessibility patterns
- Ignores: node_modules, .next, build directories

### vitest.config.ts
- Environment: jsdom
- Globals enabled
- Coverage provider: v8
- Setup: test/setup.ts

### playwright.config.ts
- Test directory: tests/e2e
- Base URL: http://127.0.0.1:3000
- Dev server: npm run dev
- CI retries: 1, local retries: 0
- Env: CONTENT_SOURCE=local (uses fallback data)

## Important Implementation Details

### 1. Cache Revalidation
All admin operations call `revalidatePath()` to clear Next.js cache:
```typescript
// After creating/deleting content
revalidatePath("/blogs");      // Clear blog pages
revalidatePath("/gallery");    // Clear gallery pages
revalidatePath("/");           // Clear homepage if needed
```

### 2. Signed URL Generation
- Creates cryptographic signature using RSA-SHA256
- Encodes object name with RFC 3986 rules
- Expires in 15 minutes by default
- Used for PUT (upload) and DELETE operations

### 3. Unique View Tracking
- Tracks views in localStorage per 24-hour window
- Stores expiry timestamp with each view
- Auto-clears expired entries
- Version-controlled to handle schema changes
- Distinguishes unique vs total views

### 4. Fallback Content Strategy
- Tries GCS first (production)
- Falls back to local JSON if GCS unavailable (offline)
- Fallback to `data/blogs.json` for E2E tests
- Ensures robustness across environments

### 5. Hydration-Safe Date Formatting
All dates use consistent formatting:
```typescript
// date-utils.ts
// Prevents React hydration errors
// Client and server render identical dates
```

## Performance Optimizations

1. **Server Components**: Default pattern reduces JS bundle
2. **Image Optimization**: Automatic WebP/AVIF conversion
3. **CSS-in-JS**: Tailwind v4 for utility-first styling
4. **Turbopack**: 5-10x faster than Webpack in dev
5. **Signed URLs**: No server-side file proxying
6. **CDN Delivery**: GCS provides global edge caching
7. **Package Optimization**: Experimental Next.js feature for minimal imports

## Security Considerations

1. **Admin Token**: Environment-based, never exposed in client code
2. **Signed URLs**: Time-limited (15 min) with RSA signature
3. **GCS Permissions**: Service account with minimal required scopes
4. **No Admin Links**: Hidden URL prevents accidental exposure
5. **Input Validation**: TypeScript types enforce schema
6. **CORS**: Configured for GCS web access
7. **Error Handling**: No sensitive data in error messages

## Useful Commands for Development

```bash
# Fast iteration with Turbopack
npm run dev

# Type check without build
npm run typecheck

# Fix linting issues
npm run lint --fix

# Watch tests during development
npm run test:watch

# Full CI validation
npm run ci

# Debug specific test
npm run test -- tests/unit/components/hero.test.tsx

# E2E test in headed mode (see browser)
npm run test:e2e -- --headed
```

## Git Workflow Notes

- Main branch: `master`
- Changes tracked in `.git/`
- Recent commits focus on tracking/analytics improvements
- Static content changes: edit `lib/content.ts` + commit
- Dynamic content: use admin panel (no git needed)

## Related Resources

- **README.md**: Full project documentation with feature details
- **lib/content.ts**: All static content for profile, projects, skills
- **.env.local.example**: Template for required environment variables
- **netlify.toml**: Deployment configuration
- **GitHub workflows**: Automated CI/CD pipeline (if enabled)

---

**Last Updated**: November 3, 2025 | **Created for**: Claude Code integration
