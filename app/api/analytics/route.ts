import { getAnalytics } from "@/lib/analytics";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const analytics = await getAnalytics();

    const response = NextResponse.json(analytics);
    response.headers.set("Cache-Control", "public, max-age=60, stale-while-revalidate=30");
    return response;
  } catch (error) {
    console.error("Failed to fetch analytics:", error);
    return NextResponse.json(
      { error: "Failed to fetch analytics" },
      { status: 500 }
    );
  }
}
