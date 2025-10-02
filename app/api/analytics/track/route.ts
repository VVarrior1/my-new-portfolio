import { incrementPageView, incrementBlogView } from "@/lib/analytics";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { type, path, slug, isUnique = false } = body;

    if (!type || (type !== "page" && type !== "blog")) {
      return NextResponse.json(
        { error: "Invalid type. Must be 'page' or 'blog'" },
        { status: 400 }
      );
    }

    if (type === "page") {
      if (!path) {
        return NextResponse.json(
          { error: "Path is required for page tracking" },
          { status: 400 }
        );
      }
      await incrementPageView(path, isUnique);
    } else if (type === "blog") {
      if (!slug) {
        return NextResponse.json(
          { error: "Slug is required for blog tracking" },
          { status: 400 }
        );
      }
      await incrementBlogView(slug, isUnique);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to track analytics:", error);
    return NextResponse.json(
      { error: "Failed to track analytics" },
      { status: 500 }
    );
  }
}
