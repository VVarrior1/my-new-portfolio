import { getGalleryItems } from "@/lib/gallery";
import { GalleryGridClient } from "./gallery-grid-client";

export async function GalleryGrid() {
  const items = await getGalleryItems();
  return <GalleryGridClient items={items} />;
}
