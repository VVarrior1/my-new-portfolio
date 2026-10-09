import { NextRequest, NextResponse } from "next/server";
import { resetAnalytics } from "@/lib/analytics";

const ADMIN_TOKEN = process.env.ADMIN_TOKEN ?? process.env.BLOG_ADMIN_TOKEN;

export async function POST(request: NextRequest) {
  const headerToken = request.headers.get("x-admin-token");
  if (!ADMIN_TOKEN || headerToken !== ADMIN_TOKEN) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await resetAnalytics();
    return NextResponse.json({ success: true, message: "Analytics reset successfully" });
  } catch (error) {
    console.error("Failed to reset analytics:", error);
    return NextResponse.json({ error: "Failed to reset analytics" }, { status: 500 });
  }
}
