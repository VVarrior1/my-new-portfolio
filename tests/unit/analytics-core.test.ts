import { describe, expect, it } from "vitest";
import {
  applyHit,
  classifyPath,
  emptyAnalytics,
  isBot,
  normalizeAnalytics,
  normalizeReferrer,
  sanitizeEventName,
  sanitizePath,
  MAX_KEYS,
  foldInbox,
  inboxKey,
  planCompaction,
  INBOX_SETTLE_MS,
} from "@/lib/analytics-core";

const now = "2026-10-08T12:00:00.000Z";
const day = "2026-10-08";

function view(path: string, flags: Partial<{ newVisitor: boolean; newForPath: boolean; newToday: boolean; referrer: string | null }> = {}) {
  return {
    kind: "view" as const,
    path,
    newVisitor: false,
    newForPath: false,
    newToday: false,
    referrer: null,
    now,
    day,
    ...flags,
  };
}

describe("sanitizePath", () => {
  it("keeps clean site paths", () => {
    expect(sanitizePath("/")).toBe("/");
    expect(sanitizePath("/blogs/writing-a-shell-in-c")).toBe("/blogs/writing-a-shell-in-c");
  });

  it("strips query strings, hashes and trailing slashes", () => {
    expect(sanitizePath("/gallery/?x=1#top")).toBe("/gallery");
  });

  it("rejects junk and private pages", () => {
    expect(sanitizePath("https://evil.com/")).toBeNull();
    expect(sanitizePath("/<script>")).toBeNull();
    expect(sanitizePath("/admin")).toBeNull();
    expect(sanitizePath("/api/analytics")).toBeNull();
    expect(sanitizePath("/" + "a".repeat(300))).toBeNull();
    expect(sanitizePath(42 as unknown as string)).toBeNull();
  });
});

describe("classifyPath", () => {
  it("separates blog posts from pages", () => {
    expect(classifyPath("/blogs/leetcode")).toEqual({ type: "blog", slug: "leetcode" });
    expect(classifyPath("/blogs")).toEqual({ type: "page", path: "/blogs" });
    expect(classifyPath("/")).toEqual({ type: "page", path: "/" });
  });
});

describe("isBot", () => {
  it("flags crawlers, previews and headless browsers", () => {
    expect(isBot("Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)")).toBe(true);
    expect(isBot("LinkedInBot/1.0 (compatible; Mozilla/5.0; Apache-HttpClient)")).toBe(true);
    expect(isBot("Mozilla/5.0 HeadlessChrome/120.0.0.0 Safari/537.36")).toBe(true);
    expect(isBot("curl/8.4.0")).toBe(true);
    expect(isBot("")).toBe(true);
    expect(isBot(null)).toBe(true);
  });

  it("lets real browsers through", () => {
    expect(
      isBot("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36"),
    ).toBe(false);
    expect(
      isBot("Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1"),
    ).toBe(false);
  });
});

describe("normalizeReferrer", () => {
  it("reduces referrers to a host and drops our own site", () => {
    expect(normalizeReferrer("https://www.linkedin.com/in/someone?trk=x", "abdelrahmanmohamed1.netlify.app")).toBe("linkedin.com");
    expect(normalizeReferrer("https://abdelrahmanmohamed1.netlify.app/blogs", "abdelrahmanmohamed1.netlify.app")).toBeNull();
    expect(normalizeReferrer("", "x.app")).toBeNull();
    expect(normalizeReferrer("not a url", "x.app")).toBeNull();
  });

  it("keeps ?ref= campaign tags", () => {
    expect(normalizeReferrer("ref:Resume", "x.app")).toBe("ref:resume");
    expect(normalizeReferrer("ref:<bad>", "x.app")).toBeNull();
  });
});

describe("sanitizeEventName", () => {
  it("accepts short slugs and rejects anything else", () => {
    expect(sanitizeEventName("resume-download")).toBe("resume-download");
    expect(sanitizeEventName("out:github.com")).toBe("out:github.com");
    expect(sanitizeEventName("DROP TABLE")).toBeNull();
    expect(sanitizeEventName("x".repeat(80))).toBeNull();
  });
});

describe("normalizeAnalytics", () => {
  it("upgrades the old file format without losing counts", () => {
    const legacy = {
      pages: [{ path: "/", views: 157, lastUpdated: "2026-09-21T20:07:00.481Z" }],
      blogs: [{ slug: "leetcode", views: 1, uniqueViews: 1, lastUpdated: "2026-05-23T02:20:30.160Z" }],
      totalViews: 158,
      lastUpdated: "2026-09-21T20:07:00.481Z",
    };
    const data = normalizeAnalytics(legacy);
    expect(data.pages[0]).toMatchObject({ path: "/", views: 157, uniqueViews: 0 });
    expect(data.totalViews).toBe(158);
    expect(data.totalUniqueViews).toBe(0);
    expect(data.daily).toEqual({});
    expect(data.referrers).toEqual({});
    expect(data.events).toEqual({});
  });

  it("returns an empty document for garbage", () => {
    expect(normalizeAnalytics(null).totalViews).toBe(0);
    expect(normalizeAnalytics("nope").pages).toEqual([]);
  });
});

describe("applyHit", () => {
  it("counts a first visit everywhere it should", () => {
    const data = applyHit(
      emptyAnalytics(now),
      view("/", { newVisitor: true, newForPath: true, newToday: true, referrer: "linkedin.com" }),
    );
    expect(data.totalViews).toBe(1);
    expect(data.totalUniqueViews).toBe(1);
    expect(data.pages).toEqual([{ path: "/", views: 1, uniqueViews: 1, lastUpdated: now }]);
    expect(data.daily[day]).toEqual({ views: 1, visitors: 1 });
    expect(data.referrers).toEqual({ "linkedin.com": 1 });
  });

  it("counts a returning visitor as a view only", () => {
    let data = applyHit(emptyAnalytics(now), view("/", { newVisitor: true, newForPath: true, newToday: true }));
    data = applyHit(data, view("/"));
    expect(data.totalViews).toBe(2);
    expect(data.totalUniqueViews).toBe(1);
    expect(data.pages[0]).toMatchObject({ views: 2, uniqueViews: 1 });
    expect(data.daily[day]).toEqual({ views: 2, visitors: 1 });
  });

  it("files blog posts under blogs, not pages", () => {
    const data = applyHit(emptyAnalytics(now), view("/blogs/leetcode", { newForPath: true }));
    expect(data.pages).toEqual([]);
    expect(data.blogs).toEqual([{ slug: "leetcode", views: 1, uniqueViews: 1, lastUpdated: now }]);
    expect(data.totalViews).toBe(1);
  });

  it("counts link clicks without touching view totals", () => {
    let data = applyHit(emptyAnalytics(now), { kind: "event", name: "resume-download", now, day });
    data = applyHit(data, { kind: "event", name: "resume-download", now, day });
    expect(data.events).toEqual({ "resume-download": 2 });
    expect(data.totalViews).toBe(0);
  });

  it("does not mutate its input", () => {
    const before = emptyAnalytics(now);
    const snapshot = JSON.stringify(before);
    applyHit(before, view("/", { newVisitor: true }));
    expect(JSON.stringify(before)).toBe(snapshot);
  });

  it("caps distinct referrers and events so the file cannot be flooded", () => {
    let data = emptyAnalytics(now);
    for (let i = 0; i < MAX_KEYS + 20; i++) {
      data = applyHit(data, view("/", { referrer: `site${i}.com` }));
      data = applyHit(data, { kind: "event", name: `out:site${i}.com`, now, day });
    }
    expect(Object.keys(data.referrers).length).toBeLessThanOrEqual(MAX_KEYS + 1);
    expect(data.referrers.other).toBe(20);
    expect(Object.keys(data.events).length).toBeLessThanOrEqual(MAX_KEYS + 1);
    expect(data.events.other).toBe(20);
  });

  it("caps distinct pages so random URLs cannot grow the file forever", () => {
    let data = emptyAnalytics(now);
    for (let i = 0; i < MAX_KEYS + 5; i++) {
      data = applyHit(data, view(`/blogs/post-${i}`));
    }
    expect(data.blogs.length).toBe(MAX_KEYS);
    expect(data.totalViews).toBe(MAX_KEYS + 5);
  });

  it("keeps roughly a year of daily history", () => {
    let data = emptyAnalytics(now);
    for (let i = 0; i < 420; i++) {
      const d = new Date(Date.UTC(2025, 0, 1) + i * 86_400_000).toISOString();
      data = applyHit(data, { ...view("/"), now: d, day: d.slice(0, 10) });
    }
    const days = Object.keys(data.daily).sort();
    expect(days.length).toBe(400);
    expect(days[days.length - 1]).toBe(new Date(Date.UTC(2025, 0, 1) + 419 * 86_400_000).toISOString().slice(0, 10));
  });
});

describe("inbox compaction", () => {
  const t = Date.UTC(2026, 9, 8, 12);

  it("produces keys that sort by time", () => {
    expect(inboxKey(t, "b") > inboxKey(t - 1, "z")).toBe(true);
    expect(inboxKey(t, "abc")).toBe(`${t}-abc`);
  });

  it("only counts settled keys past the cursor and cleans up counted ones", () => {
    const old1 = inboxKey(t - 60_000, "a");
    const old2 = inboxKey(t - 30_000, "b");
    const fresh = inboxKey(t - INBOX_SETTLE_MS + 1, "c");
    const plan = planCompaction([fresh, old2, old1], old1, t);
    expect(plan.toCount).toEqual([old2]);
    expect(plan.alreadyCounted).toEqual([old1]);
  });

  it("folds hits in key order, advances the cursor and never double counts", () => {
    const k1 = inboxKey(t - 50_000, "a");
    const k2 = inboxKey(t - 40_000, "b");
    const entries = [
      { key: k2, hit: view("/", { newVisitor: true }) },
      { key: k1, hit: view("/gallery") },
    ];
    const once = foldInbox(emptyAnalytics(now), entries, now);
    expect(once.totalViews).toBe(2);
    expect(once.cursor).toBe(k2);
    expect(once.compactedAt).toBe(now);

    const twice = foldInbox(once, entries, now);
    expect(twice.totalViews).toBe(2);
  });

  it("skips malformed inbox items but still moves past them", () => {
    const k1 = inboxKey(t - 50_000, "a");
    const data = foldInbox(emptyAnalytics(now), [{ key: k1, hit: { nope: true } }], now);
    expect(data.totalViews).toBe(0);
    expect(data.cursor).toBe(k1);
  });
});
