import Image from "next/image";
import { getGalleryItems } from "@/lib/gallery";

export async function GalleryGrid() {
  const items = await getGalleryItems();

  if (!items.length) {
    return (
      <p className="rounded-3xl border border-dashed border-white/10 bg-white/5 p-8 text-center text-sm text-white/60">
        Gallery is warming up. Upload images from the admin dashboard to populate this section.
      </p>
    );
  }

  return (
    <div className="columns-1 gap-4 sm:columns-2 lg:columns-3">
      {items.map((item) => (
        <figure
          key={item.id}
          className="mb-4 break-inside-avoid overflow-hidden rounded-3xl border border-white/10 bg-white/5 shadow-[0_20px_60px_-35px_rgba(16,185,129,0.8)] transition duration-200 hover:-translate-y-1 hover:border-emerald-300/60"
        >
          <div className="relative w-full">
            <Image
              src={item.imageUrl}
              alt={item.title}
              width={800}
              height={600}
              className="h-full w-full object-cover"
              unoptimized
            />
          </div>
          <figcaption className="space-y-3 p-4 text-white/80">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-lg font-semibold text-white">{item.title}</h3>
              <span className="text-xs uppercase tracking-[0.25em] text-emerald-200/80">
                {new Date(item.createdAt).toLocaleDateString("en-CA", {
                  year: "numeric",
                  month: "short",
                  day: "numeric",
                })}
              </span>
            </div>
            {item.description && <p className="text-sm">{item.description}</p>}
            {item.tags.length > 0 && (
              <ul className="flex flex-wrap gap-2 text-xs uppercase tracking-[0.3em] text-white/60">
                {item.tags.map((tag) => (
                  <li
                    key={`${item.id}-${tag}`}
                    className="rounded-full border border-white/10 bg-white/5 px-3 py-1"
                  >
                    {tag}
                  </li>
                ))}
              </ul>
            )}
          </figcaption>
        </figure>
      ))}
    </div>
  );
}
