"use client";

import { useState, useEffect, useCallback } from "react";
import { formatDate } from "@/lib/date-utils";
import { GalleryImage } from "./gallery-image";

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
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <p className="rounded-3xl border border-dashed border-white/10 bg-white/5 p-8 text-center text-sm text-white/60">
          Gallery is warming up. Check back soon for project snapshots and build logs.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="columns-1 gap-6 sm:columns-2 lg:columns-3">
        {visibleItems.map((item, index) => (
          <figure
            key={item.id}
            tabIndex={0}
            className="group relative mb-6 break-inside-avoid rounded-3xl border border-white/10 bg-white/5 shadow-[0_25px_80px_-45px_rgba(16,185,129,0.8)] transition duration-500 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300/70 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900 hover:-translate-y-1 hover:rotate-1 hover:border-emerald-300/60 hover:shadow-[0_45px_120px_-60px_rgba(52,211,153,0.9)]"
          >
            <GalleryImage
              src={item.imageUrl}
              alt={item.title}
              width={800}
              height={600}
              className="block h-auto w-full object-contain transition duration-700 ease-out group-hover:scale-[1.03] group-hover:saturate-125"
              onError={() => handleImageError(item.id)}
              priority={index < 6} // Prioritize first 6 images
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            />
            <figcaption className="pointer-events-none absolute inset-0 flex flex-col justify-end bg-gradient-to-t from-black/80 via-black/10 to-transparent p-6 opacity-0 translate-y-6 transform-gpu transition duration-300 ease-out group-focus-visible:opacity-100 group-focus-visible:translate-y-0 group-hover:opacity-100 group-hover:translate-y-0">
              <div className="space-y-3 text-white">
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-2">
                    <h3 className="text-xl font-semibold tracking-tight">
                      {item.title}
                    </h3>
                    {item.description && (
                      <p className="text-sm text-white/80">
                        {item.description}
                      </p>
                    )}
                  </div>
                  <span className="text-xs uppercase tracking-[0.3em] text-emerald-200/90">
                    {formatDate(item.createdAt)}
                  </span>
                </div>
                {item.tags.length > 0 && (
                  <ul className="flex flex-wrap gap-2 text-[0.65rem] uppercase tracking-[0.35em] text-white/70">
                    {item.tags.slice(0, 4).map((tag) => (
                      <li
                        key={`${item.id}-${tag}`}
                        className="rounded-full border border-white/20 bg-white/10 px-3 py-1"
                      >
                        {tag}
                      </li>
                    ))}
                    {item.tags.length > 4 && (
                      <li className="rounded-full border border-white/20 bg-white/10 px-3 py-1">
                        +{item.tags.length - 4}
                      </li>
                    )}
                  </ul>
                )}
              </div>
            </figcaption>
          </figure>
        ))}
      </div>

      {/* Infinite scroll trigger */}
      {hasMore && (
        <div id="load-more-trigger" className="flex justify-center py-8">
          {loading ? (
            <div className="flex items-center gap-3 text-white/60">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-emerald-300/30 border-t-emerald-300" />
              <span>Loading more...</span>
            </div>
          ) : (
            <button
              onClick={loadMore}
              className="rounded-full border border-white/20 bg-white/10 px-6 py-3 text-sm font-medium text-white transition hover:bg-white/20"
            >
              Load More
            </button>
          )}
        </div>
      )}

      {/* Stats */}
      <div className="text-center text-sm text-white/60">
        Showing {visibleItems.length} of {initialTotal} items
      </div>
    </div>
  );
}