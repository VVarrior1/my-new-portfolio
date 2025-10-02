import { NextRequest, NextResponse } from "next/server";
import { generateSignedUrl, ensureGcsConfig } from "@/lib/gcs";

const ADMIN_TOKEN = process.env.ADMIN_TOKEN ?? process.env.BLOG_ADMIN_TOKEN;
const ANALYTICS_OBJECT = "analytics/index.json";

export async function POST(request: NextRequest) {
  // Verify admin token
  const headerToken = request.headers.get("x-admin-token");

  if (!ADMIN_TOKEN || headerToken !== ADMIN_TOKEN) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    ensureGcsConfig();

    const initialData = {
      pages: [],
      blogs: [],
      totalViews: 0,
      lastUpdated: new Date().toISOString(),
    };

    const { signedUrl } = generateSignedUrl({
      objectName: ANALYTICS_OBJECT,
      method: "PUT",
      contentType: "application/json",
    });

    const response = await fetch(signedUrl, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        "x-goog-content-sha256": "UNSIGNED-PAYLOAD",
        "Cache-Control": "public, max-age=60",
      },
      body: JSON.stringify(initialData, null, 2),
    });

    if (!response.ok) {
      throw new Error(`Failed to reset analytics: ${response.status}`);
    }

    return NextResponse.json({
      success: true,
      message: "Analytics reset successfully"
    });
  } catch (error) {
    console.error("Failed to reset analytics:", error);
    return NextResponse.json(
      { error: "Failed to reset analytics" },
      { status: 500 }
    );
  }
}
