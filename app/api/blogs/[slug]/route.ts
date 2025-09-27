import { NextResponse, type NextRequest } from "next/server";
import { revalidatePath } from "next/cache";
import { getAllBlogs, type BlogPost } from "@/lib/blogs";
import { generateSignedUrl, ensureGcsConfig } from "@/lib/gcs";

const ADMIN_TOKEN = process.env.ADMIN_TOKEN ?? process.env.BLOG_ADMIN_TOKEN;
const BLOGS_INDEX_OBJECT = "blogs/index.json";

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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function DELETE(request: NextRequest, context: any) {
  const { params } = context ?? {};
  const slugParam = Array.isArray(params?.slug) ? params.slug[0] : params?.slug;
  if (!slugParam) {
    return NextResponse.json({ error: "Missing blog slug" }, { status: 400 });
  }

  if (!ADMIN_TOKEN) {
    console.error("ADMIN_TOKEN not configured in environment");
    return NextResponse.json(
      { error: "ADMIN_TOKEN environment variable not set" },
      { status: 500 }
    );
  }

  const headerToken = request.headers.get("x-admin-token");
  const providedToken = headerToken ?? request.nextUrl.searchParams.get("token");

  if (providedToken !== ADMIN_TOKEN) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const blogs = await getAllBlogs();
    const blogIndex = blogs.findIndex((blog) => blog.slug === slugParam);

    if (blogIndex === -1) {
      return NextResponse.json({ error: "Blog not found" }, { status: 404 });
    }

    // Remove the blog from the array
    const updatedBlogs = blogs.filter((blog) => blog.slug !== slugParam);

    // Save updated blogs index
    await saveBlogsIndex(updatedBlogs);

    // Revalidate pages to reflect deletion immediately
    revalidatePath("/blogs");
    revalidatePath(`/blogs/${slugParam}`);
    revalidatePath("/");

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete blog", error);
    return NextResponse.json(
      { error: (error as Error).message ?? "Failed to delete blog" },
      { status: 500 }
    );
  }
}