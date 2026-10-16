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
      <main id="main" className="frame">
        <div className="mx-auto max-w-[76rem] px-4 pb-20 pt-10 sm:px-8 sm:pt-16 lg:pb-28">
          <header>
            <p className="t-meta text-graphite">
              {total > 0 ? `${total} ${total === 1 ? "picture" : "pictures"} · select one to see it full size` : "Notes, screenshots, photos"}
            </p>
            <h1 className="t-display mt-4 max-w-[59.75rem]">
              <span className="text-ink">Gallery.</span>{" "}
              <span className="text-graphite">Pictures worth keeping: notes I liked, screenshots, and the odd photo.</span>
            </h1>
          </header>
          <div className="mt-14 lg:mt-20">
            <GalleryWithPagination initialItems={items} initialHasMore={hasMore} initialTotal={total} />
          </div>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
