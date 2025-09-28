import { NextResponse, type NextRequest } from "next/server";
import { revalidatePath } from "next/cache";
import { getAllBlogs, appendBlog, type BlogPost, type BlogMetadata } from "@/lib/blogs";

const ADMIN_TOKEN = process.env.ADMIN_TOKEN ?? process.env.BLOG_ADMIN_TOKEN;

type BlogPayload = {
  title: string;
  date?: string;
  excerpt?: string;
  body: string;
  token?: string;
};

// BlogPost type is now imported from lib/blogs

function slugify(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function parseBodyToBlocks(body: string) {
  const lines = body.split(/\r?\n/);
  const blocks: BlogPost["content"] = [];
  let currentBlock: { heading?: string; paragraph: string[] } | null = null;

  const pushCurrent = () => {
    if (currentBlock) {
      blocks.push({ ...currentBlock });
      currentBlock = null;
    }
  };

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) {
      if (currentBlock && currentBlock.paragraph.length) {
        currentBlock.paragraph.push("");
      }
      continue;
    }

    const imageMatch = line.match(/^!\[[^\]]*\]\(([^)]+)\)$/);
    if (imageMatch) {
      pushCurrent();
      blocks.push({ image: imageMatch[1] });
      continue;
    }

    if (line.startsWith("## ")) {
      pushCurrent();
      currentBlock = { heading: line.replace(/^##\s+/, ""), paragraph: [] };
      continue;
    }

    if (!currentBlock) {
      currentBlock = { paragraph: [] };
    }
    currentBlock.paragraph.push(line);
  }

  pushCurrent();

  return blocks
    .map((block) => {
      if (block.paragraph) {
        const filtered = block.paragraph.filter((paragraph) => paragraph.trim().length);
        return { ...block, paragraph: filtered };
      }
      return block;
    })
    .filter((block) =>
      block.heading || block.paragraph?.length || block.image
    );
}

export async function GET() {
  const blogs = await getAllBlogs();
  return NextResponse.json(blogs);
}

export async function POST(request: NextRequest) {
  if (!ADMIN_TOKEN) {
    return NextResponse.json(
      { error: "ADMIN_TOKEN environment variable not set" },
      { status: 500 }
    );
  }

  let payload: BlogPayload;
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

  if (!payload.title || !payload.body) {
    return NextResponse.json(
      { error: "Title and body are required" },
      { status: 400 }
    );
  }

  const date = payload.date ?? new Date().toISOString().slice(0, 10);
  const content = parseBodyToBlocks(payload.body);
  if (content.length === 0) {
    return NextResponse.json(
      { error: "Body must include at least one paragraph or heading" },
      { status: 400 }
    );
  }

  const blogs = await getAllBlogs();
  let slug = slugify(payload.title);
  const baseSlug = slug;
  let counter = 1;
  while (blogs.some((blog) => blog.slug === slug)) {
    slug = `${baseSlug}-${counter++}`;
  }

  const paragraphs = content
    .flatMap((block) => block.paragraph ?? [])
    .filter(Boolean);

  const excerpt = (payload.excerpt && payload.excerpt.trim()) || paragraphs.slice(0, 2).join(" ");

  const newBlog: BlogPost = {
    slug,
    title: payload.title,
    date,
    excerpt,
    content,
  };

  try {
    await appendBlog(newBlog);
  } catch (error) {
    console.error("Failed to persist blog", error);
    return NextResponse.json(
      { error: (error as Error).message ?? "Failed to persist blog" },
      { status: 500 }
    );
  }

  revalidatePath("/blogs");
  revalidatePath(`/blogs/${slug}`);
  revalidatePath("/");

  return NextResponse.json(newBlog, { status: 201 });
}
