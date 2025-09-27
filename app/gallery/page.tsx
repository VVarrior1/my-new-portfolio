import { getGalleryItems } from "@/lib/gallery";
import { formatDate } from "@/lib/date-utils";
import { Navbar } from "@/components/navbar";
import Image from "next/image";

const sections = [
  { id: "home", label: "Home", href: "/" },
  { id: "blog", label: "Blog", href: "/blogs" },
];

export default async function GalleryPage() {
  const items = await getGalleryItems();

  return (
    <div className="relative text-white">
      <Navbar sections={sections} />
      <main className="mx-auto flex min-h-screen max-w-7xl flex-col gap-12 px-6 pb-24 pt-16 sm:px-8">
        <header className="space-y-4">
          <div className="space-y-2">
            <p className="text-sm uppercase tracking-[0.3em] text-emerald-200/80">
              Gallery
            </p>
            <h1 className="text-4xl font-semibold">Build logs & ship moments</h1>
          </div>
          <p className="max-w-3xl text-white/75">
            Snapshots from the work — from prototype sketches to production launches,
            these images capture the journey of building AI-first products.
          </p>
        </header>

        {!items.length ? (
          <div className="flex min-h-[400px] items-center justify-center">
            <p className="rounded-3xl border border-dashed border-white/10 bg-white/5 p-8 text-center text-sm text-white/60">
              Gallery is warming up. Check back soon for project snapshots and build logs.
            </p>
          </div>
        ) : (
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((item) => (
              <figure
                key={item.id}
                className="group overflow-hidden rounded-3xl border border-white/10 bg-white/5 shadow-[0_20px_60px_-35px_rgba(16,185,129,0.8)] transition duration-300 hover:-translate-y-2 hover:border-emerald-300/60"
              >
                <div className="relative aspect-[4/3] w-full overflow-hidden">
                  <Image
                    src={item.imageUrl}
                    alt={item.title}
                    fill
                    className="object-cover transition duration-300 group-hover:scale-105"
                    sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
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
        )}
      </main>
    </div>
  );
}