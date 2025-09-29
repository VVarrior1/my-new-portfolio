import { NextResponse, type NextRequest } from "next/server";
import { generateSignedUrl, ensureGcsConfig } from "@/lib/gcs";
import { appendGalleryItems } from "@/lib/gallery";
import { revalidatePath } from "next/cache";
import { randomUUID } from "crypto";

const ADMIN_TOKEN = process.env.ADMIN_TOKEN ?? process.env.BLOG_ADMIN_TOKEN;

type ImageUpload = {
  filename: string;
  contentType: string;
  title: string;
  description?: string;
  tags?: string;
  featured?: boolean;
};

export async function POST(request: NextRequest) {
  if (!ADMIN_TOKEN) {
    console.error("ADMIN_TOKEN not configured in environment");
    return NextResponse.json(
      { error: "ADMIN_TOKEN environment variable not set" },
      { status: 500 }
    );
  }

  let payload: { images: ImageUpload[]; token?: string };

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

  if (!payload.images || !Array.isArray(payload.images) || payload.images.length === 0) {
    return NextResponse.json(
      { error: "images array is required and must not be empty" },
      { status: 400 }
    );
  }

  ensureGcsConfig();

  try {
    const uploadData = payload.images.map((image) => {
      if (!image.filename || !image.contentType || !image.title) {
        throw new Error("Each image must have filename, contentType, and title");
      }

      const ext = image.filename.includes(".")
        ? image.filename.substring(image.filename.lastIndexOf("."))
        : "";
      const safeExt = ext.slice(0, 10).replace(/[^\w.]/g, "");
      const objectName = `gallery/${randomUUID()}${safeExt}`;

      const { signedUrl, publicUrl } = generateSignedUrl({
        objectName,
        method: "PUT",
        contentType: image.contentType,
        expiresInSeconds: 15 * 60, // 15 minutes for multiple uploads
      });

      return {
        id: randomUUID(),
        uploadUrl: signedUrl,
        publicUrl,
        objectName,
        metadata: {
          title: image.title,
          description: image.description || "",
          tags: image.tags || "",
          featured: image.featured || false,
        },
      };
    });

    return NextResponse.json({ uploads: uploadData });
  } catch (error) {
    console.error("Failed to generate signed URLs", error);
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}

// Endpoint to confirm uploads and save metadata
export async function PUT(request: NextRequest) {
  if (!ADMIN_TOKEN) {
    console.error("ADMIN_TOKEN not configured in environment");
    return NextResponse.json(
      { error: "ADMIN_TOKEN environment variable not set" },
      { status: 500 }
    );
  }

  let payload: {
    completedUploads: Array<{
      id: string;
      publicUrl: string;
      objectName: string;
      metadata: {
        title: string;
        description?: string;
        tags?: string;
        featured?: boolean;
      };
    }>;
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

  if (!payload.completedUploads || !Array.isArray(payload.completedUploads)) {
    return NextResponse.json(
      { error: "completedUploads array is required" },
      { status: 400 }
    );
  }

  try {
    const savedItems = payload.completedUploads.map((upload) => {
      const { metadata } = upload;

      const tagsArray = metadata.tags
        ? metadata.tags.split(",").map((tag) => tag.trim()).filter(Boolean)
        : [];

      return {
        id: randomUUID(),
        title: metadata.title,
        description: metadata.description?.trim() || undefined,
        tags: tagsArray,
        imageUrl: upload.publicUrl,
        objectPath: upload.objectName,
        featured: metadata.featured || false,
        createdAt: new Date().toISOString(),
      };
    });

    // Batch append all items at once to avoid race conditions
    await appendGalleryItems(savedItems);

    revalidatePath("/gallery");
    revalidatePath("/");

    return NextResponse.json({
      success: true,
      message: `Successfully saved ${savedItems.length} gallery items`,
      items: savedItems,
    });
  } catch (error) {
    console.error("Failed to save gallery items", error);
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}