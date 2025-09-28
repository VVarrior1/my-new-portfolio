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

type GalleryGridClientProps = {
  items: GalleryItem[];
};

export function GalleryGridClient({ items }: GalleryGridClientProps) {
  const [hiddenItems, setHiddenItems] = useState<Set<string>>(new Set());

  const handleImageError = (itemId: string) => {
    setHiddenItems(prev => new Set([...prev, itemId]));
  };

  const visibleItems = items.filter(item => !hiddenItems.has(item.id));

  if (!visibleItems.length) {
    return (
      <p className="rounded-3xl border border-dashed border-white/10 bg-white/5 p-8 text-center text-sm text-white/60">
        Gallery is warming up. Upload images from the admin dashboard to populate this section.
      </p>
    );
  }

  return (
    <div className="columns-1 gap-6 sm:columns-2 lg:columns-3">
      {visibleItems.map((item) => (
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
          />
          <figcaption className="pointer-events-none absolute inset-0 flex flex-col justify-end bg-gradient-to-t from-black/80 via-black/10 to-transparent p-5 opacity-0 translate-y-6 transform-gpu transition duration-300 ease-out group-focus-visible:opacity-100 group-focus-visible:translate-y-0 group-hover:opacity-100 group-hover:translate-y-0">
            <div className="space-y-3 text-white">
              <div className="space-y-2">
                <h3 className="text-lg font-semibold tracking-tight">
                  {item.title}
                </h3>
                {item.description && (
                  <p className="text-sm text-white/85">
                    {item.description}
                  </p>
                )}
              </div>
              <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-white/80">
                <span className="uppercase tracking-[0.3em] text-emerald-200/90">
                  {formatDate(item.createdAt)}
                </span>
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
            </div>
          </figcaption>
        </figure>
      ))}
    </div>
  );
}
