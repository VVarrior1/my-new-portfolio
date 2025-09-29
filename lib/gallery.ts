import { generateSignedUrl, extractObjectNameFromUrl, gcsBucketName, ensureGcsConfig } from "@/lib/gcs";

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

// Cache busting utility for immediate propagation
function getCacheBustingUrl(baseUrl: string): string {
  const separator = baseUrl.includes('?') ? '&' : '?';
  return `${baseUrl}${separator}_t=${Date.now()}&_r=${Math.random().toString(36).substring(7)}`;
}

async function fetchGalleryIndex(): Promise<GalleryItem[]> {
  if (!gcsBucketName) {
    return [];
  }

  const url = getCacheBustingUrl(`https://storage.googleapis.com/${gcsBucketName}/${INDEX_OBJECT}`);

  try {
    const response = await fetch(url, { cache: "no-store" });
    if (response.status === 404) {
      return [];
    }

    if (!response.ok) {
      console.error("Failed to fetch gallery index", response.status);
      return [];
    }

    const data = (await response.json()) as GalleryItem[];
    return Array.isArray(data) ? data : [];
  } catch (error) {
    console.error("Error fetching gallery index", error);
    return [];
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
  const items = await fetchGalleryIndex();
  return items.sort((a, b) => (a.createdAt > b.createdAt ? -1 : 1));
}

export async function getFeaturedGalleryItems(limit: number = 6): Promise<GalleryItem[]> {
  const items = await fetchGalleryIndex();
  return items
    .filter(item => item.featured)
    .sort((a, b) => (a.createdAt > b.createdAt ? -1 : 1))
    .slice(0, limit);
}

export async function getGalleryItemsPaginated(page: number = 1, limit: number = 12): Promise<{items: GalleryItem[], hasMore: boolean, total: number}> {
  const allItems = await fetchGalleryIndex();
  const sorted = allItems.sort((a, b) => (a.createdAt > b.createdAt ? -1 : 1));
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
  const current = await fetchGalleryIndex();
  const next = [item, ...current];
  await saveGalleryIndex(next);
}

export async function appendGalleryItems(items: GalleryItem[]) {
  const current = await fetchGalleryIndex();
  const next = [...items, ...current];
  await saveGalleryIndex(next);
}

export async function deleteGalleryItem(id: string) {
  const current = await fetchGalleryIndex();
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
