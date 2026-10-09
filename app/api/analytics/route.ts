import { NextResponse } from "next/server";
import { compactIfDue, getAnalytics } from "@/lib/analytics";

export async function GET() {
  await compactIfDue();
  const analytics = await getAnalytics();

  const response = NextResponse.json(analytics);
  response.headers.set("Cache-Control", "public, max-age=60, stale-while-revalidate=30");
  return response;
}
