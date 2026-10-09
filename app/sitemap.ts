import type { MetadataRoute } from "next";
import { getAllBlogs } from "@/lib/blogs";
import { SITE_URL } from "@/lib/content";

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const posts = await getAllBlogs();
  return [
    { url: SITE_URL, changeFrequency: "monthly", priority: 1 },
    { url: `${SITE_URL}/blogs`, changeFrequency: "weekly", priority: 0.7 },
    { url: `${SITE_URL}/gallery`, changeFrequency: "monthly", priority: 0.4 },
    { url: `${SITE_URL}/stats`, changeFrequency: "daily", priority: 0.2 },
    ...posts.map((post) => ({ url: `${SITE_URL}/blogs/${post.slug}`, lastModified: post.date, priority: 0.6 })),
  ];
}
