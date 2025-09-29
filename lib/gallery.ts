import { generateSignedUrl, extractObjectNameFromUrl, gcsBucketName, ensureGcsConfig } from "@/lib/gcs";
import localGalleryData from "@/data/gallery.json";

export type GalleryItem = {
  id: string;
  title: string;
  description?: string;
  tags: string[];
  imageUrl: string;
  objectPath?: string;
  createdAt: string;
  featured?: boolean;
};

const INDEX_OBJECT = "gallery/metadata/index.json";

type FetchMode = "static" | "dynamic";

const LOCAL_GALLERY_ITEMS: GalleryItem[] = (localGalleryData as GalleryItem[]).map((item) => ({ ...item }));

function shouldUseLocalContent(): boolean {
  return process.env.CONTENT_SOURCE === "local";
}

function getCacheBustingUrl(baseUrl: string): string {
  const separator = baseUrl.includes("?") ? "&" : "?";
  return `${baseUrl}${separator}_t=${Date.now()}&_r=${Math.random().toString(36).substring(7)}`;
}

function buildFetchOptions(mode: FetchMode): RequestInit & { next?: { revalidate: number } } {
  if (mode === "dynamic") {
    return { cache: "no-store" };
  }

  return {
    cache: "force-cache",
    next: { revalidate: 300 },
  };
}

async function fetchGalleryIndex(mode: FetchMode = "static"): Promise<GalleryItem[]> {
  if (shouldUseLocalContent()) {
    return LOCAL_GALLERY_ITEMS;
  }

  if (!gcsBucketName) {
    return LOCAL_GALLERY_ITEMS;
  }

  const baseUrl = `https://storage.googleapis.com/${gcsBucketName}/${INDEX_OBJECT}`;
  const url = mode === "dynamic" ? getCacheBustingUrl(baseUrl) : baseUrl;
  const fetchOptions = buildFetchOptions(mode);

  try {
    const response = await fetch(url, fetchOptions);
    if (response.status === 404) {
      return LOCAL_GALLERY_ITEMS;
    }

    if (!response.ok) {
      console.warn("Failed to fetch gallery index", response.status);
      return LOCAL_GALLERY_ITEMS;
    }

    const data = (await response.json()) as GalleryItem[];
    return Array.isArray(data) ? data : [];
  } catch (error) {
    console.warn("Error fetching gallery index", error);
    return LOCAL_GALLERY_ITEMS;
  }
}

async function saveGalleryIndex(items: GalleryItem[]) {
  ensureGcsConfig();
  const { signedUrl } = generateSignedUrl({
    objectName: INDEX_OBJECT,
    method: "PUT",
    contentType: "application/json",
  });

  const response = await fetch(signedUrl, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      "x-goog-content-sha256": "UNSIGNED-PAYLOAD",
      "Cache-Control": "no-cache, no-store, must-revalidate, max-age=0",
      "Pragma": "no-cache",
      "Expires": "0",
    },
    body: JSON.stringify(items, null, 2),
  });

  if (!response.ok) {
    throw new Error(`Failed to persist gallery index: ${response.status}`);
  }
}

export async function getGalleryItems(): Promise<GalleryItem[]> {
  const items = await fetchGalleryIndex("static");
  return [...items].sort((a, b) => (a.createdAt > b.createdAt ? -1 : 1));
}

export async function getFeaturedGalleryItems(limit: number = 6): Promise<GalleryItem[]> {
  const items = await fetchGalleryIndex("static");
  return [...items]
    .filter(item => item.featured)
    .sort((a, b) => (a.createdAt > b.createdAt ? -1 : 1))
    .slice(0, limit);
}

export async function getGalleryItemsPaginated(page: number = 1, limit: number = 12): Promise<{items: GalleryItem[], hasMore: boolean, total: number}> {
  const allItems = await fetchGalleryIndex("static");
  const sorted = [...allItems].sort((a, b) => (a.createdAt > b.createdAt ? -1 : 1));
  const startIndex = (page - 1) * limit;
  const endIndex = startIndex + limit;
  const items = sorted.slice(startIndex, endIndex);
  const hasMore = endIndex < sorted.length;

  return {
    items,
    hasMore,
    total: sorted.length
  };
}

export async function appendGalleryItem(item: GalleryItem) {
  const current = await fetchGalleryIndex("dynamic");
  const next = [item, ...current];
  await saveGalleryIndex(next);
}

export async function appendGalleryItems(items: GalleryItem[]) {
  const current = await fetchGalleryIndex("dynamic");
  const next = [...items, ...current];
  await saveGalleryIndex(next);
}

export async function deleteGalleryItem(id: string) {
  const current = await fetchGalleryIndex("dynamic");
  const next = current.filter((item) => item.id !== id);
  if (next.length === current.length) {
    return false;
  }
  await saveGalleryIndex(next);
  return true;
}

export function inferObjectPath(imageUrl: string): string | undefined {
  return extractObjectNameFromUrl(imageUrl) ?? undefined;
}
