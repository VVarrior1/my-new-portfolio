import { appendGalleryItem, getGalleryItems, inferObjectPath } from "@/lib/gallery";
import { NextResponse, type NextRequest } from "next/server";
import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";

const ADMIN_TOKEN = process.env.ADMIN_TOKEN ?? process.env.BLOG_ADMIN_TOKEN;

export async function GET() {
  const items = await getGalleryItems();
  return NextResponse.json(items);
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
