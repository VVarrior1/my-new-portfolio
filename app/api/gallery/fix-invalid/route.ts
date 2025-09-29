import { NextResponse, type NextRequest } from "next/server";
import { revalidatePath } from "next/cache";

const ADMIN_TOKEN = process.env.ADMIN_TOKEN ?? process.env.BLOG_ADMIN_TOKEN;

// Direct access to GCS for cleanup
import { generateSignedUrl, gcsBucketName } from "@/lib/gcs";

export async function POST(request: NextRequest) {
  if (!ADMIN_TOKEN) {
    console.error("ADMIN_TOKEN not configured in environment");
    return NextResponse.json(
      { error: "ADMIN_TOKEN environment variable not set" },
      { status: 500 }
    );
  }

  const headerToken = request.headers.get("x-admin-token");
  const providedToken = headerToken;

  if (providedToken !== ADMIN_TOKEN) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Get current gallery index
    const indexUrl = `https://storage.googleapis.com/${gcsBucketName}/gallery/metadata/index.json`;
    const response = await fetch(indexUrl, { cache: "no-store" });

    if (response.status === 404) {
      return NextResponse.json({ message: "No gallery index found" });
    }

    if (!response.ok) {
      throw new Error(`Failed to fetch gallery index: ${response.status}`);
    }

    const items = await response.json();
    if (!Array.isArray(items)) {
      throw new Error("Invalid gallery index format");
    }

    // Filter out items with invalid dates or missing required fields
    const validItems = items.filter(item => {
      // Check if item has all required fields
      if (!item || !item.id || !item.title || !item.imageUrl) {
        console.log(`Removing item with missing fields:`, item);
        return false;
      }

      // Check if createdAt is valid
      if (!item.createdAt) {
        console.log(`Removing item ${item.id} with missing createdAt`);
        return false;
      }

      // Check if date is valid
      const date = new Date(item.createdAt);
      if (isNaN(date.getTime())) {
        console.log(`Removing item ${item.id} with invalid date: ${item.createdAt}`);
        return false;
      }

      return true;
    });

    const removedCount = items.length - validItems.length;

    if (removedCount === 0) {
      return NextResponse.json({
        message: "No invalid items found",
        totalItems: items.length
      });
    }

    // Save cleaned index back to GCS
    const { signedUrl } = generateSignedUrl({
      objectName: "gallery/metadata/index.json",
      method: "PUT",
      contentType: "application/json",
      expiresInSeconds: 5 * 60,
    });

    const uploadResponse = await fetch(signedUrl, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        "x-goog-content-sha256": "UNSIGNED-PAYLOAD",
        "Cache-Control": "no-cache, no-store, must-revalidate, max-age=0",
        "Pragma": "no-cache",
        "Expires": "0",
      },
      body: JSON.stringify(validItems, null, 2),
    });

    if (!uploadResponse.ok) {
      throw new Error(`Failed to save cleaned index: ${uploadResponse.status}`);
    }

    // Revalidate pages
    revalidatePath("/gallery");
    revalidatePath("/");
    revalidatePath("/admin");

    return NextResponse.json({
      success: true,
      message: `Successfully removed ${removedCount} invalid gallery items`,
      removed: removedCount,
      remaining: validItems.length,
      totalProcessed: items.length
    });

  } catch (error) {
    console.error("Failed to fix invalid gallery items:", error);
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}