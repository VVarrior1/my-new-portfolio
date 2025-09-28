import { getFeaturedGalleryItems } from "@/lib/gallery";

export async function GalleryGrid() {
  const items = await getFeaturedGalleryItems(6); // Get only 6 featured items for home page

  if (!items.length) {
    return (
      <p className="rounded-3xl border border-dashed border-white/10 bg-white/5 p-8 text-center text-sm text-white/60">
        Gallery is warming up. Upload images from the admin dashboard to populate this section.
      </p>
    );
  }

  return (
    <div className="columns-1 gap-6 sm:columns-2 lg:columns-3">
      {items.map((item, index) => (
        <figure
          key={item.id}
          tabIndex={0}
          className="group relative mb-6 break-inside-avoid rounded-3xl border border-white/10 bg-white/5 shadow-[0_25px_80px_-45px_rgba(16,185,129,0.8)] transition duration-500 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300/70 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900 hover:-translate-y-1 hover:rotate-1 hover:border-emerald-300/60 hover:shadow-[0_45px_120px_-60px_rgba(52,211,153,0.9)]"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={item.imageUrl}
            alt={item.title}
            loading={index < 3 ? "eager" : "lazy"} // Load first 3 immediately
            fetchPriority={index < 3 ? "high" : "low"}
            decoding="async"
            className="block w-full object-contain transition duration-700 ease-out group-hover:scale-[1.03] group-hover:saturate-125"
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
                  {new Date(item.createdAt).toLocaleDateString("en-CA", {
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                  })}
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
