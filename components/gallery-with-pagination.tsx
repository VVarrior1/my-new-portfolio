"use client";

import { useState, useEffect, useCallback } from "react";
import { formatDate } from "@/lib/date-utils";
import { GalleryImage } from "./gallery-image";
import { ImageModal } from "./image-modal";

type GalleryItem = {
  id: string;
  title: string;
  description?: string;
  tags: string[];
  imageUrl: string;
  objectPath?: string;
  featured?: boolean;
  createdAt: string;
};

type GalleryWithPaginationProps = {
  initialItems: GalleryItem[];
  initialHasMore: boolean;
  initialTotal: number;
};

export function GalleryWithPagination({
  initialItems,
  initialHasMore,
  initialTotal
}: GalleryWithPaginationProps) {
  const [items, setItems] = useState(initialItems);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [hiddenItems, setHiddenItems] = useState<Set<string>>(new Set());
  const [selectedImage, setSelectedImage] = useState<GalleryItem | null>(null);

  const handleImageError = (itemId: string) => {
    setHiddenItems(prev => new Set([...prev, itemId]));
  };

  const loadMore = useCallback(async () => {
    if (loading || !hasMore) return;

    setLoading(true);
    try {
      const nextPage = page + 1;
      const response = await fetch(`/api/gallery?page=${nextPage}&limit=12`);
      const data = await response.json();

      setItems(prev => [...prev, ...data.items]);
      setHasMore(data.hasMore);
      setPage(nextPage);
    } catch (error) {
      console.error('Failed to load more gallery items:', error);
    } finally {
      setLoading(false);
    }
  }, [loading, hasMore, page]);

  // Intersection Observer for infinite scroll
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const target = entries[0];
        if (target.isIntersecting && hasMore && !loading) {
          loadMore();
        }
      },
      { threshold: 0.1 }
    );

    const loadMoreTrigger = document.getElementById('load-more-trigger');
    if (loadMoreTrigger) {
      observer.observe(loadMoreTrigger);
    }

    return () => observer.disconnect();
  }, [loadMore, hasMore, loading]);

  const visibleItems = items.filter(item => !hiddenItems.has(item.id));

  if (!visibleItems.length && !loading) {
    return <p className="text-graphite">Nothing here yet.</p>;
  }

  return (
    <div className="space-y-10">
      <ul className="columns-2 gap-3 sm:gap-4 lg:columns-3">
        {visibleItems.map((item, index) => (
          <li key={item.id} className="mb-3 break-inside-avoid sm:mb-4">
            <button
              type="button"
              onClick={() => setSelectedImage(item)}
              className="group block w-full overflow-hidden rounded-md text-left"
              aria-label={`View ${item.title} full size`}
            >
              <GalleryImage
                src={item.imageUrl}
                alt={item.title}
                width={800}
                height={600}
                className="block h-auto w-full transition-transform duration-500 ease-out group-hover:scale-[1.02]"
                onError={() => handleImageError(item.id)}
                priority={index < 4}
                sizes="(max-width: 1024px) 50vw, 33vw"
              />
            </button>
            {(item.title || item.createdAt) && (
              <p className="mt-2 flex items-baseline justify-between gap-3 text-[0.9rem]">
                <span className="font-medium">{item.title}</span>
                <span className="shrink-0 tabular-nums text-graphite">{formatDate(item.createdAt)}</span>
              </p>
            )}
          </li>
        ))}
      </ul>

      {hasMore && (
        <div id="load-more-trigger" className="flex justify-center">
          <button type="button" onClick={loadMore} disabled={loading} className="btn btn-quiet disabled:opacity-60">
            {loading ? "Loading" : "Show more"}
          </button>
        </div>
      )}

      <p className="text-center text-[0.9rem] text-graphite">
        Showing {visibleItems.length} of {initialTotal}
      </p>

      <ImageModal
        isOpen={!!selectedImage}
        src={selectedImage?.imageUrl || ""}
        alt={selectedImage?.title || ""}
        title={selectedImage?.title}
        description={selectedImage?.description}
        onClose={() => setSelectedImage(null)}
      />
    </div>
  );
}
