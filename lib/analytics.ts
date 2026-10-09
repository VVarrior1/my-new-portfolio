import { generateSignedUrl, ensureGcsConfig, gcsBucketName } from "@/lib/gcs";
import {
  emptyAnalytics,
  foldInbox,
  inboxKey,
  normalizeAnalytics,
  planCompaction,
  type AnalyticsData,
  type Hit,
} from "@/lib/analytics-core";

export type { AnalyticsData, PageAnalytics, BlogAnalytics, DailyPoint } from "@/lib/analytics-core";

// Layout in the bucket:
//   analytics/index.json        folded totals (what the site reads)
//   analytics/inbox/<key>.json  one object per hit, waiting to be folded in
// GCS rate-limits writes to a single object to roughly one per second, so hits
// never write the index directly; the compactor does, at most every few seconds.

// ANALYTICS_NAMESPACE lets a local or preview run write somewhere other than production's numbers.
const NAMESPACE = /^[a-z0-9\-_]+$/i.test(process.env.ANALYTICS_NAMESPACE ?? "") ? process.env.ANALYTICS_NAMESPACE : "analytics";
export const ANALYTICS_OBJECT = `${NAMESPACE}/index.json`;
const INBOX_PREFIX = `${NAMESPACE}/inbox/`;
const COMPACT_EVERY_MS = 15_000;

type Snapshot = { data: AnalyticsData; generation: string };

function publicUrl(objectName: string, bustCache: boolean) {
  const base = `https://storage.googleapis.com/${gcsBucketName}/${objectName}`;
  return bustCache ? `${base}?_t=${Date.now()}${Math.random().toString(36).slice(2, 8)}` : base;
}

/** Reads the index and the GCS generation it was read at ("0" = doesn't exist yet). */
export async function readSnapshot(objectName = ANALYTICS_OBJECT): Promise<Snapshot> {
  const response = await fetch(publicUrl(objectName, true), { cache: "no-store" });
  if (response.status === 404) return { data: emptyAnalytics(), generation: "0" };
  if (!response.ok) throw new Error(`Analytics read failed: ${response.status}`);

  const generation = response.headers.get("x-goog-generation");
  if (!generation) throw new Error("Analytics read returned no generation header");
  return { data: normalizeAnalytics(await response.json()), generation };
}

/**
 * PUTs the object only if its generation still matches (use "0" for create-only).
 * Returns false when another writer got there first (HTTP 412) or GCS asked us to slow down (429).
 */
export async function putIfGeneration(objectName: string, body: unknown, generation: string, cacheControl = "no-cache, max-age=0"): Promise<boolean> {
  ensureGcsConfig();
  const { signedUrl } = generateSignedUrl({
    objectName,
    method: "PUT",
    contentType: "application/json",
    extraHeaders: { "x-goog-if-generation-match": generation },
  });

  const response = await fetch(signedUrl, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      "x-goog-if-generation-match": generation,
      "x-goog-content-sha256": "UNSIGNED-PAYLOAD",
      "Cache-Control": cacheControl,
    },
    body: JSON.stringify(body),
  });

  if (response.status === 412 || response.status === 429) return false;
  if (!response.ok) {
    throw new Error(`GCS write failed: ${response.status} ${(await response.text()).slice(0, 200)}`);
  }
  return true;
}

async function deleteObject(objectName: string) {
  const { signedUrl } = generateSignedUrl({ objectName, method: "DELETE" });
  await fetch(signedUrl, { method: "DELETE", headers: { "Content-Type": "application/octet-stream" } });
}

async function listKeys(prefix: string): Promise<string[]> {
  const response = await fetch(
    `https://storage.googleapis.com/${gcsBucketName}?prefix=${encodeURIComponent(prefix)}&max-keys=1000`,
    { cache: "no-store" },
  );
  if (!response.ok) throw new Error(`Inbox listing failed: ${response.status}`);
  const xml = await response.text();
  return [...xml.matchAll(/<Key>([^<]+)<\/Key>/g)].map((match) => match[1]);
}

/** Stores one hit in the inbox. Each hit is a new object, so there are no write conflicts. */
export async function enqueueHit(hit: Hit, inboxPrefix = INBOX_PREFIX): Promise<string> {
  const key = inboxKey(Date.now(), Math.random().toString(36).slice(2, 10));
  const created = await putIfGeneration(`${inboxPrefix}${key}.json`, hit, "0", "private, max-age=0");
  if (!created) throw new Error("Inbox write was rejected");
  return key;
}

/**
 * Folds settled inbox items into the index. Safe to run concurrently: the index
 * write is conditional, and the cursor stops anything being counted twice.
 * Returns the number of hits folded in (0 if there was nothing to do or another run won).
 */
export async function compactInbox(options: { objectName?: string; inboxPrefix?: string; force?: boolean } = {}): Promise<number> {
  const { objectName = ANALYTICS_OBJECT, inboxPrefix = INBOX_PREFIX, force = false } = options;
  const { data, generation } = await readSnapshot(objectName);

  if (!force && data.compactedAt && Date.now() - Date.parse(data.compactedAt) < COMPACT_EVERY_MS) {
    return 0;
  }

  const keys = (await listKeys(inboxPrefix)).map((name) => name.slice(inboxPrefix.length).replace(/\.json$/, ""));
  const { toCount, alreadyCounted } = planCompaction(keys, data.cursor, Date.now());

  if (toCount.length > 0) {
    const entries = await Promise.all(
      toCount.map(async (key) => {
        const response = await fetch(publicUrl(`${inboxPrefix}${key}.json`, true), { cache: "no-store" });
        if (!response.ok) throw new Error(`Inbox item ${key} unreadable: ${response.status}`);
        return { key, hit: (await response.json()) as unknown };
      }),
    );

    const next = foldInbox(data, entries, new Date().toISOString());
    if (!(await putIfGeneration(objectName, next, generation))) return 0;
  }

  await Promise.allSettled([...alreadyCounted, ...toCount].map((key) => deleteObject(`${inboxPrefix}${key}.json`)));
  return toCount.length;
}

/** Runs a compaction if one is due, swallowing errors: callers are never blocked by it. */
export async function compactIfDue(): Promise<void> {
  if (!gcsBucketName) return;
  try {
    await compactInbox();
  } catch (error) {
    console.warn("Analytics compaction skipped:", error);
  }
}

/** Uncached read straight from the bucket, for the stats page. Never throws. */
export async function getFreshAnalytics(): Promise<AnalyticsData> {
  if (!gcsBucketName) return emptyAnalytics();
  try {
    return (await readSnapshot()).data;
  } catch (error) {
    console.warn("Error fetching analytics", error);
    return emptyAnalytics();
  }
}

/** Cached read for pages and the public stats API. Never throws. */
export async function getAnalytics(): Promise<AnalyticsData> {
  if (!gcsBucketName) return emptyAnalytics();

  try {
    const response = await fetch(publicUrl(ANALYTICS_OBJECT, false), { next: { revalidate: 60 } });
    if (!response.ok) return emptyAnalytics();
    return normalizeAnalytics(await response.json());
  } catch (error) {
    console.warn("Error fetching analytics", error);
    return emptyAnalytics();
  }
}

/** Zeroes every counter (admin reset). Keeps the cursor so old inbox items aren't recounted. */
export async function resetAnalytics(): Promise<void> {
  for (let attempt = 0; attempt < 5; attempt++) {
    const { data, generation } = await readSnapshot();
    const fresh = { ...emptyAnalytics(), cursor: data.cursor, compactedAt: data.compactedAt };
    if (await putIfGeneration(ANALYTICS_OBJECT, fresh, generation)) return;
    await new Promise((resolve) => setTimeout(resolve, 1100));
  }
  throw new Error("Analytics reset kept conflicting with live writes");
}
