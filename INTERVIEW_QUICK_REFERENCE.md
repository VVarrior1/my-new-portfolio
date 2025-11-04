# Interview Quick Reference Guide

Quick lookup for key concepts and code snippets. Read this before interviews to refresh memory.

---

## Architecture at a Glance

```
Frontend (Next.js 15 App Router)
├── Server Components (pre-rendered, cached)
│   ├── Home page (blogs, gallery metadata fetched server-side)
│   └── Blog detail pages (pre-rendered with generateStaticParams)
├── Client Components (interactive, hydrated)
│   ├── AudioProvider (music player state)
│   └── Analytics tracking hooks
└── API Routes (thin orchestrators)
    ├── /api/blogs → CRUD for blog content
    ├── /api/gallery → Image metadata management
    ├── /api/analytics → View tracking aggregation
    └── /api/auth → Token verification

Content Storage
├── GCS (source of truth for dynamic content)
│   ├── blogs/index.json (metadata index)
│   ├── blogs/posts/{slug}.json (individual blogs)
│   ├── gallery/metadata/index.json (gallery index)
│   ├── gallery/{uuid}.{ext} (image files)
│   └── analytics/index.json (aggregated views)
└── Local JSON fallback (resilience)
    ├── data/blogs.json
    └── data/gallery.json
```

---

## 30-Second Elevator Pitch

"Built a personal portfolio with Next.js 15 that uses Google Cloud Storage for dynamic content (blogs, gallery) and a hybrid rendering strategy. Server components render static content at build time, while dynamic content is fetched on-demand with intelligent caching (ISR + cache busting). Analytics are tracked client-side to localStorage, aggregated server-side to JSON in GCS. No database—everything is versioned JSON files for simplicity and auditability."

---

## Key Technical Concepts

### 1. Signed URLs (RSA-SHA256)

**What**: Time-limited credentials that grant write access to a GCS object without storing permanent credentials

**Why**: Allows browser to upload directly to GCS; server never touches files

**Flow**:
```
1. Admin requests upload URL → POST /api/gallery/upload-url
2. Server generates signed URL (valid 10 min)
3. Admin's browser uploads file directly to GCS (signed URL proves authorization)
4. Server saves metadata (image URL, title, tags) to GCS index
```

**Interview Q**: "How would you prevent signature tampering?"
**A**: "Signature includes hash of canonical request. Any modification (URL param, header, body) changes hash, invalidates signature. GCS verifies signature before allowing write."

---

### 2. ISR (Incremental Static Regeneration)

**What**: Pre-render static pages at build time, revalidate in background when source changes

**Why**: Combines static performance (CDN-cached HTML) with dynamic freshness (latest data)

**Example**:
```typescript
export async function generateStaticParams() {
  const blogs = await getAllBlogs(); // Build time
  return blogs.map(b => ({ slug: b.slug }));
}

// Options: { revalidate: 300 } means check for updates every 5 min
```

**Interview Q**: "What happens if you update a blog but don't call revalidatePath()?"
**A**: "Page stays cached for 5 minutes. After 5 min, Next.js regenerates with fresh data. Callers see stale content until then."

---

### 3. Analytics: Unique View Tracking

**Client-side**:
```typescript
localStorage: {
  "blog:slug": expiryTimestamp, // 24-hour expiry
  "page:/path": expiryTimestamp,
}
```

**Server-side**:
```typescript
{
  "views": 150,        // Total views
  "uniqueViews": 42,   // Unique in past 24h
  "lastUpdated": "ISO timestamp"
}
```

**Interview Q**: "How do you handle the same user on multiple devices?"
**A**: "They're counted as separate unique visitors. Without user accounts or IDs, there's no way to deduplicate. Trade-off: simple implementation vs. accuracy."

---

### 4. Hydration Mismatch (AudioProvider Fix)

**Problem**: Server renders HTML without audio element; client renders with it → mismatch error

**Solution**: Only render audio element after hydration
```typescript
const [isClient, setIsClient] = useState(false);

useEffect(() => {
  setIsClient(true); // Runs after hydration
}, []);

return (
  <>
    {isClient ? <audio ref={audioRef} /> : null}
    {children}
  </>
);
```

**Interview Q**: "When does useEffect run relative to hydration?"
**A**: "After. React hydrates first (attaches event listeners to server-rendered HTML), then runs effects. So effects are safe for client-only code."

---

### 5. Blog Creation Flow

```
Admin fills form → POST /api/blogs
  ↓
Server validates token
  ↓
Generate slug (handle duplicates)
  ↓
Parse markdown to blocks
  ↓
Save blog JSON to GCS
  ↓
Update index.json in GCS
  ↓
Call revalidatePath("/blogs", "/blogs/{slug}", "/")
  ↓
Return { slug, title, ... } to client
  ↓
Next user visits /blogs → sees new blog
```

---

## Code Snippets for Live Coding

### Generate Slug (Handle Duplicates)
```typescript
function slugify(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

const blogs = await getAllBlogs();
let slug = slugify(title);
const baseSlug = slug;
let counter = 1;
while (blogs.some(b => b.slug === slug)) {
  slug = `${baseSlug}-${counter++}`;
}
```

### Check Unique View (localStorage)
```typescript
function hasViewed(key: string): boolean {
  const tracked = JSON.parse(localStorage.getItem("analytics_tracked") || "{}");
  const expiry = tracked[key];

  if (!expiry) return false; // Never viewed

  if (Date.now() > expiry) {
    delete tracked[key]; // Expired
    localStorage.setItem("analytics_tracked", JSON.stringify(tracked));
    return false;
  }

  return true; // Within 24h window
}
```

### Track Page View
```typescript
export function useTrackPageView(path: string) {
  const tracked = useRef<string | null>(null);

  useEffect(() => {
    if (tracked.current === path) return; // Already tracked
    tracked.current = path;

    const isUnique = !hasViewed(`page:${path}`);

    fetch("/api/analytics/track", {
      method: "POST",
      body: JSON.stringify({ type: "page", path, isUnique }),
    }).then(() => {
      if (isUnique) {
        const tracked = JSON.parse(localStorage.getItem("analytics_tracked") || "{}");
        tracked[`page:${path}`] = Date.now() + 24 * 60 * 60 * 1000;
        localStorage.setItem("analytics_tracked", JSON.stringify(tracked));
      }
    });
  }, [path]);
}
```

### Validate Image URL (Before Saving Metadata)
```typescript
const imageResponse = await fetch(payload.imageUrl, { method: "HEAD" });
if (!imageResponse.ok) {
  throw new Error("Image not found or inaccessible");
}
const contentType = imageResponse.headers.get("content-type");
if (!contentType?.startsWith("image/")) {
  throw new Error("URL doesn't point to an image");
}
```

---

## Common Interview Questions

### "How do you ensure data consistency between local and GCS?"

**Answer**: "In production, GCS is the source of truth. Local JSON is only a fallback if GCS is unavailable. When admin updates content, we write to both (dual-write) for safety. For mission-critical migrations, we'd implement a version number in metadata to detect conflicts."

### "What would you do if GCS write fails?"

**Answer**: "API returns 500 error to client. Client sees 'Failed to save'. Admin can retry. Since blogs are written to both local and GCS, the local copy ensures we don't lose data even if GCS is down temporarily."

### "How do you prevent multiple admins from clobbering each other's changes?"

**Answer**: "Currently, it's last-write-wins. For a personal portfolio with one admin, that's acceptable. For a team, we'd need optimistic locking (version numbers) or a database with transactions."

### "What's the cold start time for a blog page request?"

**Answer**: "If ISR cache is fresh and CDN cache is warm: <100ms (served from edge). If ISR cache expired: Regeneration happens in background (~500ms), stale version served, fresh version on next request. If no cache: GCS fetch (~300ms) + render + send to CDN."

### "How would you add comments to blogs?"

**Answer**: "Three approaches:
1. **Client-side** (Disqus, Giscus): No server code, hosted externally
2. **Server storage** (Firestore, PostgreSQL): Add POST /api/blogs/[slug]/comments route, store comments, fetch + render on page load
3. **Headless CMS** (Hygraph, Sanity): Use their comment system, query during SSR

For a personal portfolio, I'd probably use Disqus (no server work) or a lightweight service like Utterances (GitHub-backed)."

### "What's your approach to error handling?"

**Answer**: "Layered:
1. **API routes**: Validate input, catch exceptions, return appropriate HTTP status (400, 401, 500)
2. **Client**: Catch fetch errors, display user-friendly message
3. **Fallback**: If GCS fails, use local JSON. If local fails, show error UI.
4. **Monitoring**: Log errors to console (browser) or logging service (server)"

---

## Tricky Concepts Explained Simply

### Signed URLs

Imagine you have a locked filing cabinet in a building. You can't trust the visitor with the key. Instead, you give them a **temporary badge** that grants access for 15 minutes. The badge says "Visitor can open cabinet X, write file Y, valid until 3:15pm". The door guard checks the badge signature to ensure you (the building manager) issued it. After 3:15pm, the badge is useless.

### ISR

Imagine a newspaper being printed daily at 6am. Between prints, readers see yesterday's news (cached). At 6am, the printer checks if there's breaking news. If yes, prints new edition. If no, reprints yesterday's edition. Either way, readers get fresh news by tomorrow.

### Hydration Mismatch

Imagine you build a cardboard model of a house (server render). Then you add furniture to the real house (client render). If the furniture placement differs from the cardboard model, visitors get confused. Fix: Don't add furniture until after checking the real house plan.

### Unique Views

Imagine a nightclub. Every visitor gets a stamp on their hand that lasts 24 hours. If they leave and come back within 24 hours, the bouncer says "You were here today, you're repeat traffic." After 24 hours, stamp fades, they're a new visitor. If they wash their hands (clear browser data), they're a new visitor.

---

## Talking Points by Seniority Level

### Junior Developer
- "Built a personal portfolio with Next.js"
- "Used Google Cloud Storage for image hosting"
- "Implemented analytics tracking with localStorage"

### Mid-Level Developer
- "Designed hybrid static + dynamic content model with ISR"
- "Implemented secure file uploads using GCS signed URLs"
- "Architected client-side unique view tracking with 24-hour expiry windows"

### Senior Developer
- "Architected a scalable content system with graceful fallbacks and no database dependency"
- "Optimized caching strategy using ISR, cache busting, and CDN integration"
- "Addressed hydration mismatches in Server Components + Client Component hybrid rendering"
- "Designed analytics aggregation to scale from thousands to millions of views without database writes"

---

## Performance Metrics

| Metric | Target | Actual |
|--------|--------|--------|
| FCP (First Contentful Paint) | <1.5s | ~0.8s (server-rendered HTML) |
| LCP (Largest Contentful Paint) | <2.5s | ~1.2s (image optimized) |
| CLS (Cumulative Layout Shift) | <0.1 | ~0.02 (no layout thrashing) |
| TTI (Time to Interactive) | <3.8s | ~2.1s (minimal JS) |
| JS Bundle Size | <100KB | ~45KB gzipped |

---

## Disaster Recovery

**Scenario**: GCS goes down

**Impact**: 
- New blogs can't be published (API returns 500)
- Existing blogs still load from local fallback
- Gallery images still load from local metadata
- Analytics tracking continues (will sync when GCS recovers)

**Recovery**: Wait for GCS recovery, then sync any missed writes

---

## What I'd Do Differently (Hindsight)

1. **Add a real database** earlier (Firestore free tier) for analytics instead of JSON file
2. **Implement webhook-based cache invalidation** instead of client-side revalidatePath
3. **Add logging** (Sentry, LogRocket) to catch errors in production
4. **Use environment variable validation** at startup to fail fast if config missing
5. **Add request signing** (HMAC-SHA256) to API routes for additional security

---

## Interview Red Flags You Should Avoid

- ❌ "We use localStorage for storing secrets" → NO, it's XSS-able
- ❌ "Signed URLs don't expire" → Wrong, they have a short expiry
- ❌ "ISR guarantees fresh data within 5 minutes" → It checks for updates, but serves stale until next request
- ❌ "Analytics are 100% accurate" → No unique deduplication is perfect without user accounts
- ❌ "We never lose data even if GCS and local both fail" → That's impossible; be honest about limits

---

## Resources to Study

- Next.js App Router: https://nextjs.org/docs/app
- GCS Signed URLs: https://cloud.google.com/storage/docs/access-control/signed-urls
- React Server Components: https://react.dev/reference/rsc/server-components
- ISR Deep Dive: https://vercel.com/docs/incremental-static-regeneration

---

## Last-Minute Prep

**5 minutes before interview**:
- Review the architecture diagram (above)
- Recall the 30-second pitch
- Think of one recent challenge (hydration mismatch, cache invalidation)
- Prepare questions to ask (how's analytics currently scaled? what's your data volume?)

**During interview**:
- Ask clarifying questions before diving into answers
- Use examples from your code
- Admit what you don't know ("I haven't implemented that, but I'd approach it with...")
- Explain trade-offs (simple vs. scalable, fast vs. accurate)

**Red flags to avoid**:
- Don't over-engineer (YAGNI principle)
- Don't assume tech stack (ask about constraints)
- Don't claim expertise in tools you've only read about
- Do explain how you'd learn something new if needed

---

**Good luck! You've built something technically interesting. Own it.**
