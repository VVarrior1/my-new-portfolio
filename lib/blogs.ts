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

export type BlogMetadata = {
  slug: string;
  title: string;
  date: string;
  excerpt: string;
};

const BLOGS_INDEX_OBJECT = "blogs/index.json";
const BLOGS_POSTS_PREFIX = "blogs/posts";

// Cache busting utility for immediate propagation
function getCacheBustingUrl(baseUrl: string): string {
  const separator = baseUrl.includes('?') ? '&' : '?';
  return `${baseUrl}${separator}_t=${Date.now()}&_r=${Math.random().toString(36).substring(7)}`;
}

async function fetchBlogsIndex(): Promise<BlogMetadata[]> {
  if (!gcsBucketName) {
    return [];
  }

  const url = getCacheBustingUrl(`https://storage.googleapis.com/${gcsBucketName}/${BLOGS_INDEX_OBJECT}`);

  try {
    const response = await fetch(url, { cache: "no-store" });
    if (response.status === 404) {
      return [];
    }

    if (!response.ok) {
      console.error("Failed to fetch blogs index", response.status);
      return [];
    }

    const data = (await response.json()) as BlogMetadata[];
    return Array.isArray(data) ? data.map((blog) => ({
      ...blog,
      excerpt: blog.excerpt.trim(),
    })) : [];
  } catch (error) {
    console.error("Error fetching blogs index", error);
    return [];
  }
}

async function fetchBlogPost(slug: string): Promise<BlogPost | null> {
  if (!gcsBucketName) {
    return null;
  }

  const objectName = `${BLOGS_POSTS_PREFIX}/${slug}.json`;
  const url = getCacheBustingUrl(`https://storage.googleapis.com/${gcsBucketName}/${objectName}`);

  try {
    const response = await fetch(url, { cache: "no-store" });
    if (response.status === 404) {
      return null;
    }

    if (!response.ok) {
      console.error(`Failed to fetch blog post ${slug}`, response.status);
      return null;
    }

    const data = (await response.json()) as BlogPost;
    return {
      ...data,
      excerpt: data.excerpt.trim(),
    };
  } catch (error) {
    console.error(`Error fetching blog post ${slug}`, error);
    return null;
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
    contentType: "application/json",
  });

  const response = await fetch(signedUrl, {
    method: "DELETE",
    headers: {
      "x-goog-content-sha256": "UNSIGNED-PAYLOAD",
      "Cache-Control": "no-cache, no-store, must-revalidate, max-age=0",
      "Pragma": "no-cache",
    },
  });

  if (!response.ok && response.status !== 404) {
    throw new Error(`Failed to delete blog post ${slug}: ${response.status}`);
  }
}

export async function getAllBlogs(): Promise<BlogMetadata[]> {
  const metadata = await fetchBlogsIndex();
  return metadata.sort((a, b) => (a.date > b.date ? -1 : 1));
}

export async function getBlogBySlug(slug: string): Promise<BlogPost | null> {
  return await fetchBlogPost(slug);
}

export async function appendBlog(blog: BlogPost) {
  // Save the full blog post
  await saveBlogPost(blog);

  // Update the metadata index
  const currentMetadata = await fetchBlogsIndex();
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
  const currentMetadata = await fetchBlogsIndex();
  const nextMetadata = currentMetadata.filter((blog) => blog.slug !== slug);
  await saveBlogsIndex(nextMetadata);
}

export async function rebuildBlogsIndex(): Promise<void> {
  // This function can rebuild the index from individual post files
  // Useful for recovery if the index gets corrupted
  if (!gcsBucketName) {
    throw new Error("GCS bucket not configured");
  }

  // In a real implementation, you'd list all files in blogs/posts/
  // and rebuild the index. For now, this is a placeholder for future enhancement.
  console.log("Index rebuild functionality - to be implemented when needed");
}
