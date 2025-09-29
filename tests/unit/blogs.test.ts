import { describe, expect, it, beforeEach, afterEach, vi } from "vitest";

const resetEnv = () => {
  delete process.env.CONTENT_SOURCE;
  delete process.env.GCS_BUCKET_NAME;
};

describe("blog data access", () => {
  beforeEach(() => {
    vi.resetModules();
    resetEnv();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    resetEnv();
  });

  it("returns local metadata when CONTENT_SOURCE=local", async () => {
    process.env.CONTENT_SOURCE = "local";
    const { getAllBlogs } = await import("@/lib/blogs");
    const blogs = await getAllBlogs();

    expect(blogs.length).toBeGreaterThan(0);
    const dates = blogs.map((b) => b.date);
    const sorted = [...dates].sort((a, b) => (a > b ? -1 : 1));
    expect(dates).toEqual(sorted);
  });

  it("fetches remote metadata with cache settings", async () => {
    process.env.GCS_BUCKET_NAME = "test-bucket";
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => [
        {
          slug: "example",
          title: "Example",
          date: "2024-01-01",
          excerpt: " remote excerpt ",
        },
      ],
    });
    vi.stubGlobal("fetch", mockFetch as unknown as typeof fetch);

    const { getAllBlogs } = await import("@/lib/blogs");
    const blogs = await getAllBlogs();

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("https://storage.googleapis.com/test-bucket/blogs/index.json"),
      expect.objectContaining({ cache: "force-cache", next: { revalidate: 300 } })
    );
    expect(blogs[0].excerpt).toBe("remote excerpt");
  });

  it("falls back to local post content when remote fetch fails", async () => {
    process.env.GCS_BUCKET_NAME = "test-bucket";
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network")) as unknown as typeof fetch);

    const { getBlogBySlug } = await import("@/lib/blogs");
    const post = await getBlogBySlug("the-power-of-tail-events-why-you-can-lose-most-of-the-time-and-still-win-big");

    expect(post).not.toBeNull();
    expect(post?.slug).toBe("the-power-of-tail-events-why-you-can-lose-most-of-the-time-and-still-win-big");
  });
});
