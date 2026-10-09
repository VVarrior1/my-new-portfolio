// Pure analytics logic: no I/O, so it can be unit tested and reused by the API
// route and the stats page. Storage lives in lib/analytics.ts.

export type PageAnalytics = {
  path: string;
  views: number;
  /** Distinct visitors who have opened this page (cookie based). */
  uniqueViews: number;
  lastUpdated: string;
};

export type BlogAnalytics = {
  slug: string;
  views: number;
  uniqueViews: number;
  lastUpdated: string;
};

export type DailyPoint = { views: number; visitors: number };

export type AnalyticsData = {
  version: 2;
  pages: PageAnalytics[];
  blogs: BlogAnalytics[];
  totalViews: number;
  /** Distinct visitors across the whole site (cookie based). */
  totalUniqueViews: number;
  lastUpdated: string;
  /** UTC day (YYYY-MM-DD) -> counts. Starts when daily history was added. */
  daily: Record<string, DailyPoint>;
  /** Referring host (or "ref:<tag>" from ?ref=) -> first-visit count. */
  referrers: Record<string, number>;
  /** Tracked link clicks, e.g. "resume-download" or "out:github.com". */
  events: Record<string, number>;
  /** Highest inbox key already folded into this document. */
  cursor: string;
  /** When the inbox was last folded in (ISO), or "" if never. */
  compactedAt: string;
};

export type Hit =
  | {
      kind: "view";
      path: string;
      newVisitor: boolean;
      newForPath: boolean;
      newToday: boolean;
      referrer: string | null;
      now: string;
      day: string;
    }
  | { kind: "event"; name: string; now: string; day: string };

/** Upper bound on distinct pages, posts, referrers and events kept in the file. */
export const MAX_KEYS = 100;
const MAX_DAYS = 400;

export function emptyAnalytics(now = new Date().toISOString()): AnalyticsData {
  return {
    version: 2,
    pages: [],
    blogs: [],
    totalViews: 0,
    totalUniqueViews: 0,
    lastUpdated: now,
    daily: {},
    referrers: {},
    events: {},
    cursor: "",
    compactedAt: "",
  };
}

const num = (value: unknown) => (typeof value === "number" && Number.isFinite(value) && value >= 0 ? value : 0);
const str = (value: unknown, fallback: string) => (typeof value === "string" ? value : fallback);

function countRecord(value: unknown): Record<string, number> {
  if (!value || typeof value !== "object") return {};
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>).map(([key, count]) => [key, num(count)]),
  );
}

/** Accepts any stored document (including the pre-2026 format) and returns a complete one. */
export function normalizeAnalytics(raw: unknown): AnalyticsData {
  if (!raw || typeof raw !== "object") return emptyAnalytics();
  const data = raw as Record<string, unknown>;
  const lastUpdated = str(data.lastUpdated, new Date().toISOString());

  const pages = Array.isArray(data.pages) ? data.pages : [];
  const blogs = Array.isArray(data.blogs) ? data.blogs : [];

  const daily: Record<string, DailyPoint> = {};
  if (data.daily && typeof data.daily === "object") {
    for (const [day, point] of Object.entries(data.daily as Record<string, unknown>)) {
      const p = (point ?? {}) as Record<string, unknown>;
      daily[day] = { views: num(p.views), visitors: num(p.visitors) };
    }
  }

  return {
    version: 2,
    pages: pages
      .filter((p): p is Record<string, unknown> => !!p && typeof p === "object" && typeof (p as { path?: unknown }).path === "string")
      .map((p) => ({
        path: p.path as string,
        views: num(p.views),
        uniqueViews: num(p.uniqueViews),
        lastUpdated: str(p.lastUpdated, lastUpdated),
      })),
    blogs: blogs
      .filter((b): b is Record<string, unknown> => !!b && typeof b === "object" && typeof (b as { slug?: unknown }).slug === "string")
      .map((b) => ({
        slug: b.slug as string,
        views: num(b.views),
        uniqueViews: num(b.uniqueViews),
        lastUpdated: str(b.lastUpdated, lastUpdated),
      })),
    totalViews: num(data.totalViews),
    totalUniqueViews: num(data.totalUniqueViews),
    lastUpdated,
    daily,
    referrers: countRecord(data.referrers),
    events: countRecord(data.events),
    cursor: str(data.cursor, ""),
    compactedAt: str(data.compactedAt, ""),
  };
}

function bump(record: Record<string, number>, key: string) {
  if (key in record || Object.keys(record).filter((k) => k !== "other").length < MAX_KEYS) {
    record[key] = (record[key] ?? 0) + 1;
  } else {
    record.other = (record.other ?? 0) + 1;
  }
}

function bumpCounter<T extends { views: number; uniqueViews: number; lastUpdated: string }>(
  list: T[],
  match: (item: T) => boolean,
  create: () => T,
  isNew: boolean,
  now: string,
) {
  const item = list.find(match);
  if (item) {
    item.views += 1;
    if (isNew) item.uniqueViews += 1;
    item.lastUpdated = now;
  } else if (list.length < MAX_KEYS) {
    list.push({ ...create(), views: 1, uniqueViews: isNew ? 1 : 0, lastUpdated: now });
  }
}

/** Returns a new document with one hit applied. Never mutates `data`. */
export function applyHit(data: AnalyticsData, hit: Hit): AnalyticsData {
  const next: AnalyticsData = structuredClone(data);
  next.lastUpdated = hit.now;

  if (hit.kind === "event") {
    bump(next.events, hit.name);
    return next;
  }

  const target = classifyPath(hit.path);
  if (target.type === "blog") {
    bumpCounter(next.blogs, (b) => b.slug === target.slug, () => ({ slug: target.slug, views: 0, uniqueViews: 0, lastUpdated: hit.now }), hit.newForPath, hit.now);
  } else {
    bumpCounter(next.pages, (p) => p.path === target.path, () => ({ path: target.path, views: 0, uniqueViews: 0, lastUpdated: hit.now }), hit.newForPath, hit.now);
  }

  next.totalViews += 1;
  if (hit.newVisitor) next.totalUniqueViews += 1;

  const point = next.daily[hit.day] ?? { views: 0, visitors: 0 };
  point.views += 1;
  if (hit.newToday) point.visitors += 1;
  next.daily[hit.day] = point;

  const days = Object.keys(next.daily).sort();
  for (const old of days.slice(0, Math.max(0, days.length - MAX_DAYS))) {
    delete next.daily[old];
  }

  if (hit.referrer) bump(next.referrers, hit.referrer);
  return next;
}

const PRIVATE_PREFIXES = ["/admin", "/api", "/_next"];

/** Normalizes a client-reported path; returns null for anything that isn't a public page. */
export function sanitizePath(input: unknown): string | null {
  if (typeof input !== "string") return null;
  let path = input.split(/[?#]/)[0];
  if (path.length > 1) path = path.replace(/\/+$/, "");
  if (!path.startsWith("/") || path.length > 120) return null;
  if (!/^\/[a-z0-9\-_/]*$/i.test(path)) return null;
  if (PRIVATE_PREFIXES.some((prefix) => path === prefix || path.startsWith(`${prefix}/`))) return null;
  return path.toLowerCase();
}

export function classifyPath(path: string): { type: "blog"; slug: string } | { type: "page"; path: string } {
  const match = /^\/blogs\/([a-z0-9\-_]+)$/i.exec(path);
  return match ? { type: "blog", slug: match[1] } : { type: "page", path };
}

export function sanitizeEventName(input: unknown): string | null {
  if (typeof input !== "string") return null;
  return /^[a-z0-9][a-z0-9:._\-]{0,63}$/i.test(input) ? input.toLowerCase() : null;
}

const BOT_PATTERN =
  /bot|crawl|spider|slurp|scrap|headless|lighthouse|pagespeed|preview|facebookexternalhit|embedly|quora link|whatsapp|telegram|discord|skype|curl|wget|python|httpclient|okhttp|axios|node-fetch|go-http|java\/|postman|insomnia|monitor|uptime|pingdom|phantom|puppeteer|playwright|selenium/i;

export function isBot(userAgent: string | null | undefined): boolean {
  if (!userAgent || userAgent.length < 20) return true;
  return BOT_PATTERN.test(userAgent);
}

/**
 * Turns document.referrer (or a "ref:<tag>" campaign tag from ?ref=) into a short key.
 * Returns null for empty values and for our own site.
 */
export function normalizeReferrer(input: unknown, ownHost: string): string | null {
  if (typeof input !== "string" || !input) return null;

  if (input.startsWith("ref:")) {
    const tag = input.slice(4).toLowerCase();
    return /^[a-z0-9\-_.]{1,40}$/.test(tag) ? `ref:${tag}` : null;
  }

  try {
    const host = new URL(input).hostname.toLowerCase().replace(/^www\./, "");
    if (!host || host === ownHost.toLowerCase().replace(/^www\./, "")) return null;
    if (host === "localhost" || host === "127.0.0.1") return null;
    return host.slice(0, 80);
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Inbox: every hit is written as its own small object, because GCS allows only
// about one write per second to any single object. A compactor folds the inbox
// into the index document. Keys sort by time, and the index remembers the last
// key it folded (the cursor), so re-running a compaction never double counts.

/** Inbox items younger than this are left for the next run, so late writes can't slip under the cursor. */
export const INBOX_SETTLE_MS = 10_000;

export function inboxKey(timestampMs: number, random: string): string {
  return `${String(timestampMs).padStart(13, "0")}-${random}`;
}

export function inboxKeyTime(key: string): number {
  const time = Number(key.slice(0, 13));
  return Number.isFinite(time) ? time : Number.POSITIVE_INFINITY;
}

/** Splits listed inbox keys into ones to count now and already-counted leftovers to delete. */
export function planCompaction(keys: string[], cursor: string, nowMs: number, limit = 300) {
  const settled = [...keys].sort().filter((key) => inboxKeyTime(key) < nowMs - INBOX_SETTLE_MS);
  return {
    toCount: settled.filter((key) => key > cursor).slice(0, limit),
    alreadyCounted: settled.filter((key) => key <= cursor),
  };
}

export function isHit(value: unknown): value is Hit {
  if (!value || typeof value !== "object") return false;
  const hit = value as Record<string, unknown>;
  if (typeof hit.now !== "string" || typeof hit.day !== "string") return false;
  if (hit.kind === "event") return typeof hit.name === "string";
  return hit.kind === "view" && typeof hit.path === "string";
}

/** Folds inbox entries (sorted by key) into the document and advances the cursor. */
export function foldInbox(data: AnalyticsData, entries: Array<{ key: string; hit: unknown }>, nowIso: string): AnalyticsData {
  let next = structuredClone(data);
  for (const { key, hit } of [...entries].sort((a, b) => (a.key < b.key ? -1 : 1))) {
    if (key <= next.cursor) continue;
    if (isHit(hit)) next = applyHit(next, hit);
    next.cursor = key;
  }
  next.compactedAt = nowIso;
  return next;
}
