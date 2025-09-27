import { NextResponse, type NextRequest } from "next/server";
import crypto from "crypto";
import { generateSignedUrl, ensureGcsConfig } from "@/lib/gcs";

const ADMIN_TOKEN = process.env.ADMIN_TOKEN ?? process.env.BLOG_ADMIN_TOKEN;

export async function POST(request: NextRequest) {
  if (!ADMIN_TOKEN) {
    console.error("ADMIN_TOKEN not configured in environment");
    return NextResponse.json(
      { error: "ADMIN_TOKEN environment variable not set" },
      { status: 500 }
    );
  }

  let payload: { filename?: string; contentType?: string; token?: string };

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

  if (!payload.filename || !payload.contentType) {
    return NextResponse.json(
      { error: "filename and contentType are required" },
      { status: 400 }
    );
  }

  ensureGcsConfig();

  const ext = payload.filename.includes(".")
    ? payload.filename.substring(payload.filename.lastIndexOf("."))
    : "";
  const safeExt = ext.slice(0, 10).replace(/[^\w.]/g, "");
  const objectName = `gallery/${crypto.randomUUID()}${safeExt}`;

  try {
    const { signedUrl, publicUrl } = generateSignedUrl({
      objectName,
      method: "PUT",
      contentType: payload.contentType,
      expiresInSeconds: 10 * 60,
    });

    return NextResponse.json({ uploadUrl: signedUrl, publicUrl, objectName });
  } catch (error) {
    console.error("Failed to generate signed URL", error);
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}
