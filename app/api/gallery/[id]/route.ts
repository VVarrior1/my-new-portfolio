import { deleteGalleryItem, getGalleryItems } from "@/lib/gallery";
import { generateSignedUrl, extractObjectNameFromUrl } from "@/lib/gcs";
import { NextResponse, type NextRequest } from "next/server";

const ADMIN_TOKEN = process.env.ADMIN_TOKEN ?? process.env.BLOG_ADMIN_TOKEN;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function DELETE(request: NextRequest, context: any) {
  const { params } = context ?? {};
  const idParam = Array.isArray(params?.id) ? params.id[0] : params?.id;
  if (!idParam) {
    return NextResponse.json({ error: "Missing gallery id" }, { status: 400 });
  }
  if (!ADMIN_TOKEN) {
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

  const items = await getGalleryItems();
  const item = items.find((entry) => entry.id === idParam);

  if (!item) {
    return NextResponse.json({ error: "Gallery item not found" }, { status: 404 });
  }

  let objectPath = item.objectPath;
  if (!objectPath) {
    objectPath = extractObjectNameFromUrl(item.imageUrl) ?? undefined;
  }

  if (objectPath) {
    try {
      const { signedUrl } = generateSignedUrl({
        objectName: objectPath,
        method: "DELETE",
        contentType: "application/octet-stream",
      });

      const deleteResponse = await fetch(signedUrl, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/octet-stream",
          "x-goog-content-sha256": "UNSIGNED-PAYLOAD",
        },
      });

      if (!deleteResponse.ok && deleteResponse.status !== 404) {
        console.warn(
          "Failed to remove object from GCS",
          deleteResponse.status,
          await deleteResponse.text()
        );
      }
    } catch (error) {
      console.warn("Error generating signed URL for deletion", error);
    }
  }

  const removed = await deleteGalleryItem(idParam);
  if (!removed) {
    return NextResponse.json({ error: "Failed to delete gallery entry" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
