import { generateSignedUrl, ensureGcsConfig, gcsBucketName } from "@/lib/gcs";
import localBlogsData from "@/data/blogs.json";

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

export type BlogMetadata = {
  slug: string;
  title: string;
  date: string;
  excerpt: string;
};

const BLOGS_INDEX_OBJECT = "blogs/index.json";
const BLOGS_POSTS_PREFIX = "blogs/posts";

type FetchMode = "static" | "dynamic";

const LOCAL_BLOG_POSTS: BlogPost[] = (localBlogsData as BlogPost[]).map((post) => ({
  ...post,
  excerpt: post.excerpt.trim(),
}));

function getLocalBlogMetadata(): BlogMetadata[] {
  return LOCAL_BLOG_POSTS.map(({ slug, title, date, excerpt }) => ({ slug, title, date, excerpt }));
}

function getLocalBlogBySlug(slug: string): BlogPost | null {
  return LOCAL_BLOG_POSTS.find((post) => post.slug === slug) ?? null;
}

function shouldUseLocalContent(): boolean {
  return process.env.CONTENT_SOURCE === "local";
}

function getCacheBustingUrl(baseUrl: string): string {
  const separator = baseUrl.includes("?") ? "&" : "?";
  return `${baseUrl}${separator}_t=${Date.now()}&_r=${Math.random().toString(36).substring(7)}`;
}

function buildFetchOptions(mode: FetchMode): RequestInit & { next?: { revalidate: number } } {
  if (mode === "dynamic") {
    return { cache: "no-store" };
  }

  return {
    cache: "force-cache",
    next: { revalidate: 300 },
  };
}

async function fetchBlogsIndex(mode: FetchMode = "static"): Promise<BlogMetadata[]> {
  if (shouldUseLocalContent()) {
    return getLocalBlogMetadata();
  }

  if (!gcsBucketName) {
    return getLocalBlogMetadata();
  }

  const baseUrl = `https://storage.googleapis.com/${gcsBucketName}/${BLOGS_INDEX_OBJECT}`;
  const url = mode === "dynamic" ? getCacheBustingUrl(baseUrl) : baseUrl;
  const fetchOptions = buildFetchOptions(mode);

  try {
    const response = await fetch(url, fetchOptions);
    if (response.status === 404) {
      return getLocalBlogMetadata();
    }

    if (!response.ok) {
      console.warn("Failed to fetch blogs index", response.status);
      return getLocalBlogMetadata();
    }

    const data = (await response.json()) as BlogMetadata[];
    if (!Array.isArray(data)) {
      return [];
    }

    return data.map((blog) => ({
      ...blog,
      excerpt: blog.excerpt.trim(),
    }));
  } catch (error) {
    console.warn("Error fetching blogs index", error);
    return getLocalBlogMetadata();
  }
}

async function fetchBlogPost(slug: string, mode: FetchMode = "static"): Promise<BlogPost | null> {
  if (shouldUseLocalContent()) {
    return getLocalBlogBySlug(slug);
  }

  if (!gcsBucketName) {
    return getLocalBlogBySlug(slug);
  }

  const objectName = `${BLOGS_POSTS_PREFIX}/${slug}.json`;
  const baseUrl = `https://storage.googleapis.com/${gcsBucketName}/${objectName}`;
  const url = mode === "dynamic" ? getCacheBustingUrl(baseUrl) : baseUrl;
  const fetchOptions = buildFetchOptions(mode);

  try {
    const response = await fetch(url, fetchOptions);
    if (response.status === 404) {
      return getLocalBlogBySlug(slug);
    }

    if (!response.ok) {
      console.warn(`Failed to fetch blog post ${slug}`, response.status);
      return getLocalBlogBySlug(slug);
    }

    const data = (await response.json()) as BlogPost;
    return {
      ...data,
      excerpt: data.excerpt.trim(),
    };
  } catch (error) {
    console.warn(`Error fetching blog post ${slug}`, error);
    return getLocalBlogBySlug(slug);
  }
}

async function saveBlogsIndex(metadata: BlogMetadata[]) {
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
      "Cache-Control": "no-cache, no-store, must-revalidate, max-age=0",
      "Pragma": "no-cache",
      "Expires": "0",
    },
    body: JSON.stringify(metadata, null, 2),
  });

  if (!response.ok) {
    throw new Error(`Failed to persist blogs index: ${response.status}`);
  }
}

async function saveBlogPost(blog: BlogPost) {
  ensureGcsConfig();
  const objectName = `${BLOGS_POSTS_PREFIX}/${blog.slug}.json`;
  const { signedUrl } = generateSignedUrl({
    objectName,
    method: "PUT",
    contentType: "application/json",
  });

  const response = await fetch(signedUrl, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      "x-goog-content-sha256": "UNSIGNED-PAYLOAD",
      "Cache-Control": "no-cache, no-store, must-revalidate, max-age=0",
      "Pragma": "no-cache",
      "Expires": "0",
    },
    body: JSON.stringify(blog, null, 2),
  });

  if (!response.ok) {
    throw new Error(`Failed to persist blog post ${blog.slug}: ${response.status}`);
  }
}

async function deleteBlogPost(slug: string) {
  ensureGcsConfig();
  const objectName = `${BLOGS_POSTS_PREFIX}/${slug}.json`;
  const { signedUrl } = generateSignedUrl({
    objectName,
    method: "DELETE",
    contentType: "application/octet-stream",
  });

  const response = await fetch(signedUrl, {
    method: "DELETE",
    headers: {
      "Content-Type": "application/octet-stream",
      "x-goog-content-sha256": "UNSIGNED-PAYLOAD",
    },
  });

  if (!response.ok && response.status !== 404) {
    const errorText = await response.text();
    console.error(`Delete failed for ${slug}:`, response.status, errorText);
    throw new Error(`Failed to delete blog post ${slug}: ${response.status} - ${errorText}`);
  }
}

export async function getAllBlogs(): Promise<BlogMetadata[]> {
  const metadata = await fetchBlogsIndex("static");
  return [...metadata].sort((a, b) => (a.date > b.date ? -1 : 1));
}

export async function getBlogBySlug(slug: string): Promise<BlogPost | null> {
  return await fetchBlogPost(slug, "static");
}

export async function appendBlog(blog: BlogPost) {
  // Save the full blog post
  await saveBlogPost(blog);

  // Update the metadata index
  const currentMetadata = await fetchBlogsIndex("dynamic");
  const blogMetadata: BlogMetadata = {
    slug: blog.slug,
    title: blog.title,
    date: blog.date,
    excerpt: blog.excerpt,
  };
  const nextMetadata = [blogMetadata, ...currentMetadata];
  await saveBlogsIndex(nextMetadata);
}

export async function deleteBlog(slug: string) {
  // Delete the blog post file
  await deleteBlogPost(slug);

  // Update the metadata index
  const currentMetadata = await fetchBlogsIndex("dynamic");
  const nextMetadata = currentMetadata.filter((blog) => blog.slug !== slug);
  await saveBlogsIndex(nextMetadata);
}

export async function rebuildBlogsIndex(): Promise<void> {
  // Placeholder for future recovery logic if the index ever needs to be rebuilt
  if (!gcsBucketName) {
    throw new Error("GCS bucket not configured");
  }

  console.log("Index rebuild functionality - to be implemented when needed");
}
