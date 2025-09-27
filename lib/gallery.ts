import { promises as fs } from "fs";
import path from "path";

export type GalleryItem = {
  id: string;
  title: string;
  description?: string;
  tags: string[];
  imageUrl: string;
  objectPath?: string;
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


export async function deleteGalleryItem(id: string) {
  const items = await readGallery();
  const filtered = items.filter((item) => item.id !== id);
  if (filtered.length === items.length) {
    return false;
  }
  await fs.writeFile(GALLERY_PATH, JSON.stringify(filtered, null, 2));
  return true;
}
