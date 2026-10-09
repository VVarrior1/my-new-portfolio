import type { Metadata } from "next";
import { GalleryWithPagination } from "@/components/gallery-with-pagination";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { getGalleryItemsPaginated } from "@/lib/gallery";

export const revalidate = 300;

export const metadata: Metadata = {
  title: "Gallery",
  description: "Pictures worth keeping: notes, screenshots and the odd photo.",
  alternates: { canonical: "/gallery" },
};

export default async function GalleryPage() {
  const { items, hasMore, total } = await getGalleryItemsPaginated(1, 12);

  return (
    <>
      <SiteHeader />
      <main id="main" className="mx-auto max-w-[76rem] px-4 pb-24 pt-12 sm:px-8 sm:pt-20">
        <header className="max-w-3xl">
          <h1 className="text-[clamp(2.8rem,7vw,5.5rem)] font-extrabold leading-[0.95] tracking-[-0.05em]">Gallery</h1>
          <p className="measure mt-6 text-[1.2rem] leading-relaxed text-graphite">
            Pictures worth keeping: notes I liked, screenshots, and the odd photo. Select one to see it full size.
          </p>
        </header>
        <div className="mt-14">
          <GalleryWithPagination initialItems={items} initialHasMore={hasMore} initialTotal={total} />
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
