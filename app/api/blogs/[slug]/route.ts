import { NextResponse, type NextRequest } from "next/server";
import { revalidatePath } from "next/cache";
import { getBlogBySlug, deleteBlog } from "@/lib/blogs";

const ADMIN_TOKEN = process.env.ADMIN_TOKEN ?? process.env.BLOG_ADMIN_TOKEN;

type DeleteContext = {
  params: Promise<{ slug: string }>;
};

export async function DELETE(request: NextRequest, context: DeleteContext) {
  const { slug: slugParam } = await context.params;
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
    // Check if blog exists
    const blog = await getBlogBySlug(slugParam);
    if (!blog) {
      return NextResponse.json({ error: "Blog not found" }, { status: 404 });
    }

    // Delete the blog (removes both the post file and updates index)
    await deleteBlog(slugParam);

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