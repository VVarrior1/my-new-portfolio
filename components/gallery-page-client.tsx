"use client";

import { useState } from "react";
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

type GalleryPageClientProps = {
  items: GalleryItem[];
};

export function GalleryPageClient({ items }: GalleryPageClientProps) {
  const [hiddenItems, setHiddenItems] = useState<Set<string>>(new Set());

  const handleImageError = (itemId: string) => {
    setHiddenItems(prev => new Set([...prev, itemId]));
  };

  const visibleItems = items.filter(item => !hiddenItems.has(item.id));

  if (!visibleItems.length) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <p className="rounded-3xl border border-dashed border-white/10 bg-white/5 p-8 text-center text-sm text-white/60">
          Gallery is warming up. Check back soon for project snapshots and build logs.
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
      {visibleItems.map((item) => (
        <figure
          key={item.id}
          className="group overflow-hidden rounded-3xl border border-white/10 bg-white/5 shadow-[0_20px_60px_-35px_rgba(16,185,129,0.8)] transition duration-300 hover:-translate-y-2 hover:border-emerald-300/60"
        >
          <div className="relative aspect-[4/3] w-full overflow-hidden">
            <GalleryImage
              src={item.imageUrl}
              alt={item.title}
              width={800}
              height={600}
              className="object-cover transition duration-300 group-hover:scale-105"
              onError={() => handleImageError(item.id)}
            />
          </div>
          <figcaption className="space-y-4 p-6 text-white/80">
            <div className="space-y-2">
              <div className="flex items-start justify-between gap-3">
                <h3 className="text-xl font-semibold text-white">{item.title}</h3>
                {item.featured && (
                  <span className="rounded-full border border-emerald-300/60 bg-emerald-300/10 px-2 py-1 text-xs uppercase tracking-[0.3em] text-emerald-100/80">
                    Featured
                  </span>
                )}
              </div>
              {item.description && (
                <p className="text-sm leading-relaxed text-white/70">
                  {item.description}
                </p>
              )}
            </div>

            <div className="flex items-center justify-between">
              <span className="text-xs uppercase tracking-[0.25em] text-emerald-200/80">
                {formatDate(item.createdAt)}
              </span>
              {item.tags.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {item.tags.slice(0, 3).map((tag) => (
                    <span
                      key={`${item.id}-${tag}`}
                      className="rounded-full border border-white/10 bg-white/5 px-2 py-1 text-xs uppercase tracking-[0.3em] text-white/60"
                    >
                      {tag}
                    </span>
                  ))}
                  {item.tags.length > 3 && (
                    <span className="text-xs text-white/40">
                      +{item.tags.length - 3}
                    </span>
                  )}
                </div>
              )}
            </div>
          </figcaption>
        </figure>
      ))}
    </div>
  );
}