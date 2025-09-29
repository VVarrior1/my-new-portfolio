import { NextResponse, type NextRequest } from "next/server";

const ADMIN_TOKEN = process.env.ADMIN_TOKEN ?? process.env.BLOG_ADMIN_TOKEN;

export async function POST(request: NextRequest) {
  if (!ADMIN_TOKEN) {
    console.error("ADMIN_TOKEN not configured in environment");
    return NextResponse.json(
      { error: "ADMIN_TOKEN environment variable not set" },
      { status: 500 }
    );
  }

  let payload: { token: string };

  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
  }

  const providedToken = payload.token;

  if (!providedToken) {
    return NextResponse.json({ error: "Token is required" }, { status: 400 });
  }

  if (providedToken !== ADMIN_TOKEN) {
    return NextResponse.json({ error: "Invalid token" }, { status: 401 });
  }

  return NextResponse.json({ success: true, message: "Token verified successfully" });
}