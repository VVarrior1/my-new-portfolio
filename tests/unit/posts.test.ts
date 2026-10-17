import { describe, expect, it } from "vitest";
import { pickHomePosts } from "@/lib/posts";

const post = (slug: string, date: string, excerpt = "A short post with enough words to make a teaser.") => ({
  slug,
  title: slug,
  date,
  excerpt,
});

describe("pickHomePosts", () => {
  const posts = [
    post("money", "2024-10-30"),
    post("tail-events", "2025-01-10"),
    post("ml", "2024-08-03"),
    post("prompting", "2024-07-01", "W o"),
    post("leetcode", "2024-09-07"),
  ];

  it("puts the pinned posts first and sorts what it shows newest first", () => {
    expect(pickHomePosts(posts, ["ml", "leetcode"], 2).map((p) => p.slug)).toEqual(["leetcode", "ml"]);
  });

  it("tops up with the newest unpinned posts", () => {
    expect(pickHomePosts(posts, ["ml"], 3).map((p) => p.slug)).toEqual(["tail-events", "money", "ml"]);
  });

  it("skips posts with nothing to show, even when pinned", () => {
    expect(pickHomePosts(posts, ["prompting"], 1).map((p) => p.slug)).toEqual(["tail-events"]);
  });

  it("ignores pinned slugs that don't exist", () => {
    expect(pickHomePosts(posts, ["gone", "ml"], 1).map((p) => p.slug)).toEqual(["ml"]);
  });

  it("caps teasers on a word boundary", () => {
    const long = post("long", "2024-01-01", "word ".repeat(80));
    const [picked] = pickHomePosts([long], ["long"], 1, 40);
    expect(picked.teaser.length).toBeLessThanOrEqual(41);
    expect(picked.teaser.endsWith("…")).toBe(true);
  });
});
