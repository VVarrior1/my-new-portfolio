import { appendGalleryItem, getGalleryItemsPaginated, inferObjectPath } from "@/lib/gallery";
import { NextResponse, type NextRequest } from "next/server";
import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";

const ADMIN_TOKEN = process.env.ADMIN_TOKEN ?? process.env.BLOG_ADMIN_TOKEN;

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get('page') || '1', 10);
  const limit = parseInt(searchParams.get('limit') || '12', 10);
  const adminView = searchParams.get('admin') === 'true';

  const result = await getGalleryItemsPaginated(page, limit);

  // For admin requests, return just the items array for easier handling
  const responseData = adminView ? result.items : result;

  const response = NextResponse.json(responseData);
  response.headers.set("Cache-Control", "no-cache, no-store, must-revalidate, max-age=0");
  response.headers.set("Pragma", "no-cache");
  response.headers.set("Expires", "0");
  return response;
}

export async function POST(request: NextRequest) {
  if (!ADMIN_TOKEN) {
    console.error("ADMIN_TOKEN not configured in environment");
    return NextResponse.json(
      { error: "ADMIN_TOKEN environment variable not set" },
      { status: 500 }
    );
  }

  let payload: {
    title: string;
    description?: string;
    tags?: string | string[];
    imageUrl?: string;
    objectPath?: string;
    featured?: boolean;
    token?: string;
  };

  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
  }

  const headerToken = request.headers.get("x-admin-token");
  const providedToken = headerToken ?? payload.token;

  if (providedToken !== ADMIN_TOKEN) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!payload.title || !payload.imageUrl) {
    return NextResponse.json(
      { error: "Title and imageUrl are required" },
      { status: 400 }
    );
  }

  // Validate that the image URL is accessible before saving metadata
  try {
    const imageResponse = await fetch(payload.imageUrl, { method: 'HEAD' });
    if (!imageResponse.ok) {
      return NextResponse.json(
        { error: "Image URL is not accessible. Please ensure the image was uploaded successfully." },
        { status: 400 }
      );
    }
    const contentType = imageResponse.headers.get('content-type');
    if (!contentType || !contentType.startsWith('image/')) {
      return NextResponse.json(
        { error: "URL does not point to a valid image" },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error("Failed to validate image URL:", error);
    return NextResponse.json(
      { error: "Failed to validate image URL. Please try uploading again." },
      { status: 400 }
    );
  }

  const tags = Array.isArray(payload.tags)
    ? payload.tags
    : typeof payload.tags === "string"
    ? payload.tags
        .split(",")
        .map((tag) => tag.trim())
        .filter(Boolean)
    : [];

  const objectPath = payload.objectPath || inferObjectPath(payload.imageUrl ?? "");

  const item = {
    id: randomUUID(),
    title: payload.title,
    description: payload.description?.trim() || undefined,
    tags,
    imageUrl: payload.imageUrl,
    objectPath,
    featured: payload.featured ?? false,
    createdAt: new Date().toISOString(),
  };

  try {
    await appendGalleryItem(item);

    // Revalidate gallery pages to show new content immediately
    revalidatePath("/gallery");
    revalidatePath("/");

  } catch (error) {
    console.error("Failed to persist gallery metadata", error);
    return NextResponse.json(
      { error: (error as Error).message ?? "Failed to persist gallery item" },
      { status: 500 }
    );
  }

  return NextResponse.json(item, { status: 201 });
}
