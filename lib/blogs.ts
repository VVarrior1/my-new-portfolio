import { generateSignedUrl, ensureGcsConfig, gcsBucketName } from "@/lib/gcs";

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

const BLOGS_INDEX_OBJECT = "blogs/index.json";

async function fetchBlogsIndex(): Promise<BlogPost[]> {
  if (!gcsBucketName) {
    return [];
  }

  const url = `https://storage.googleapis.com/${gcsBucketName}/${BLOGS_INDEX_OBJECT}`;

  try {
    const response = await fetch(url, { cache: "no-store" });
    if (response.status === 404) {
      return [];
    }

    if (!response.ok) {
      console.error("Failed to fetch blogs index", response.status);
      return [];
    }

    const data = (await response.json()) as BlogPost[];
    return Array.isArray(data) ? data.map((blog) => ({
      ...blog,
      excerpt: blog.excerpt.trim(),
    })) : [];
  } catch (error) {
    console.error("Error fetching blogs index", error);
    return [];
  }
}

async function saveBlogsIndex(blogs: BlogPost[]) {
  ensureGcsConfig();
  const { signedUrl } = generateSignedUrl({
    objectName: BLOGS_INDEX_OBJECT,
    method: "PUT",
    contentType: "application/json",
  });

  const response = await fetch(signedUrl, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      "x-goog-content-sha256": "UNSIGNED-PAYLOAD",
    },
    body: JSON.stringify(blogs, null, 2),
  });

  if (!response.ok) {
    throw new Error(`Failed to persist blogs index: ${response.status}`);
  }
}

export async function getAllBlogs(): Promise<BlogPost[]> {
  const blogs = await fetchBlogsIndex();
  return blogs.sort((a, b) => (a.date > b.date ? -1 : 1));
}

export async function getBlogBySlug(slug: string): Promise<BlogPost | undefined> {
  const blogs = await fetchBlogsIndex();
  return blogs.find((blog) => blog.slug === slug);
}

export async function appendBlog(blog: BlogPost) {
  const current = await fetchBlogsIndex();
  const next = [blog, ...current];
  await saveBlogsIndex(next);
}
