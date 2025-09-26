import { promises as fs } from "fs";
import path from "path";

export type BlogContentBlock = {
  heading?: string;
  paragraph?: string[];
  image?: string;
};

export type BlogPost = {
  slug: string;
  title: string;
  date: string;
  excerpt: string;
  content: BlogContentBlock[];
};

const DATA_PATH = path.join(process.cwd(), "data", "blogs.json");

async function readBlogs(): Promise<BlogPost[]> {
  const file = await fs.readFile(DATA_PATH, "utf8");
  const data = JSON.parse(file) as BlogPost[];
  return data.map((blog) => ({
    ...blog,
    excerpt: blog.excerpt.trim(),
  }));
}

export async function getAllBlogs(): Promise<BlogPost[]> {
  const blogs = await readBlogs();
  return blogs.sort((a, b) => (a.date > b.date ? -1 : 1));
}

export async function getBlogBySlug(slug: string): Promise<BlogPost | undefined> {
  const blogs = await readBlogs();
  return blogs.find((blog) => blog.slug === slug);
}
