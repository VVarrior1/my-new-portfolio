import { getGalleryItems } from "@/lib/gallery";
import { Navbar } from "@/components/navbar";
import { GalleryPageClient } from "@/components/gallery-page-client";

const sections = [
  { id: "home", label: "Home", href: "/" },
  { id: "blogs", label: "Blog", href: "/blogs" },
  { id: "about", label: "About", href: "/#about" },
  { id: "projects", label: "Projects", href: "/#projects" },
  { id: "contact", label: "Contact", href: "/#contact" },
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
            <h1 className="text-4xl font-semibold">Life lately & work highlights</h1>
          </div>
          <p className="max-w-3xl text-white/75">
            Mostly everyday life—travel, family, late-night cityscapes—with the occasional
            launch when something ships. A peek into what I’m living and making right now.
          </p>
        </header>

        <GalleryPageClient items={items} />
      </main>
    </div>
  );
}
