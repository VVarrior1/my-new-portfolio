import { getGalleryItems, deleteGalleryItem } from "@/lib/gallery";
import { NextResponse, type NextRequest } from "next/server";
import { revalidatePath } from "next/cache";

const ADMIN_TOKEN = process.env.ADMIN_TOKEN ?? process.env.BLOG_ADMIN_TOKEN;

export async function POST(request: NextRequest) {
  if (!ADMIN_TOKEN) {
    console.error("ADMIN_TOKEN not configured in environment");
    return NextResponse.json(
      { error: "ADMIN_TOKEN environment variable not set" },
      { status: 500 }
    );
  }

  const headerToken = request.headers.get("x-admin-token");

  if (headerToken !== ADMIN_TOKEN) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const items = await getGalleryItems();
    const brokenItems: string[] = [];
    const validItems: string[] = [];

    // Check each gallery item to see if the image is accessible
    for (const item of items) {
      try {
        const imageResponse = await fetch(item.imageUrl, {
          method: 'HEAD',
          signal: AbortSignal.timeout(5000) // 5 second timeout
        });

        if (!imageResponse.ok) {
          brokenItems.push(item.id);
          console.log(`Found broken image for item ${item.id}: ${item.title} (${imageResponse.status})`);
        } else {
          validItems.push(item.id);
        }
      } catch (error) {
        brokenItems.push(item.id);
        console.log(`Found inaccessible image for item ${item.id}: ${item.title}`, error);
      }
    }

    // Remove broken items
    const deletionResults = [];
    for (const itemId of brokenItems) {
      try {
        const removed = await deleteGalleryItem(itemId);
        if (removed) {
          deletionResults.push({ id: itemId, success: true });
        } else {
          deletionResults.push({ id: itemId, success: false, error: "Failed to delete" });
        }
      } catch (error) {
        deletionResults.push({ id: itemId, success: false, error: (error as Error).message });
      }
    }

    // Revalidate pages to show cleaned up gallery
    if (brokenItems.length > 0) {
      revalidatePath("/gallery");
      revalidatePath("/");
    }

    return NextResponse.json({
      success: true,
      totalItems: items.length,
      validItems: validItems.length,
      brokenItems: brokenItems.length,
      deletionResults,
      message: `Cleanup complete. Removed ${brokenItems.length} broken entries, kept ${validItems.length} valid entries.`
    });

  } catch (error) {
    console.error("Gallery cleanup failed:", error);
    return NextResponse.json(
      { error: (error as Error).message ?? "Failed to clean up gallery" },
      { status: 500 }
    );
  }
}