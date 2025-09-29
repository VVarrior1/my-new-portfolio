import { describe, expect, it, beforeEach, afterEach, vi } from "vitest";

const resetEnv = () => {
  delete process.env.CONTENT_SOURCE;
  delete process.env.GCS_BUCKET_NAME;
};

describe("gallery data access", () => {
  beforeEach(() => {
    vi.resetModules();
    resetEnv();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    resetEnv();
  });

  it("returns local items when CONTENT_SOURCE=local", async () => {
    process.env.CONTENT_SOURCE = "local";
    const { getGalleryItems } = await import("@/lib/gallery");
    const items = await getGalleryItems();

    expect(Array.isArray(items)).toBe(true);
  });

  it("fetches remote items with cache settings", async () => {
    process.env.GCS_BUCKET_NAME = "test-bucket";
    const mockItems = [
      {
        id: "1",
        title: "Test",
        description: "desc",
        tags: ["tag"],
        imageUrl: "https://example.com/image.jpg",
        createdAt: "2024-01-01",
      },
    ];

    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => mockItems,
    });
    vi.stubGlobal("fetch", mockFetch as unknown as typeof fetch);

    const { getGalleryItems } = await import("@/lib/gallery");
    const items = await getGalleryItems();

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("https://storage.googleapis.com/test-bucket/gallery/metadata/index.json"),
      expect.objectContaining({ cache: "force-cache", next: { revalidate: 300 } })
    );
    expect(items[0].id).toBe("1");
  });

  it("falls back to local items when remote fetch fails", async () => {
    process.env.GCS_BUCKET_NAME = "test-bucket";
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network")) as unknown as typeof fetch);

    const { getGalleryItems } = await import("@/lib/gallery");
    const items = await getGalleryItems();

    expect(Array.isArray(items)).toBe(true);
  });
});
