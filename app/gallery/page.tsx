import type { Metadata } from "next";
import { GalleryWithPagination } from "@/components/gallery-with-pagination";
import { PageIntro } from "@/components/page-intro";
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
      <main id="main" className="wrap pb-24 pt-12 sm:pt-20">
        <PageIntro path="/gallery" title="Gallery." muted="Pictures worth keeping.">
          Notes I liked, screenshots, and the odd photo. Select one to see it full size.
        </PageIntro>
        <div className="mt-14 lg:mt-20">
          <GalleryWithPagination initialItems={items} initialHasMore={hasMore} initialTotal={total} />
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
