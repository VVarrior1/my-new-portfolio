import type { Metadata } from "next";
import { GalleryWithPagination } from "@/components/gallery-with-pagination";
import { PageHeader } from "@/components/page-header";
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
      <main id="main" className="mx-auto w-full max-w-[88rem] px-4 pb-24 pt-10 sm:px-8 sm:pt-20">
        <PageHeader
          title="Gallery"
          lead="Pictures worth keeping: notes I liked, screenshots, and the odd photo. Select one to see it full size."
        />
        <div className="mt-14">
          <GalleryWithPagination initialItems={items} initialHasMore={hasMore} initialTotal={total} />
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
