import { promises as fs } from "fs";
import path from "path";

export type GalleryItem = {
  id: string;
  title: string;
  description?: string;
  tags: string[];
  imageUrl: string;
  createdAt: string;
  featured?: boolean;
};

const GALLERY_PATH = path.join(process.cwd(), "data", "gallery.json");

async function readGallery(): Promise<GalleryItem[]> {
  const file = await fs.readFile(GALLERY_PATH, "utf8");
  const data = JSON.parse(file) as GalleryItem[];
  return data.sort((a, b) => (a.createdAt > b.createdAt ? -1 : 1));
}

export async function getGalleryItems(): Promise<GalleryItem[]> {
  return readGallery();
}

export async function appendGalleryItem(item: GalleryItem) {
  const items = await readGallery();
  items.unshift(item);
  await fs.writeFile(GALLERY_PATH, JSON.stringify(items, null, 2));
}
