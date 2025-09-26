import Link from "next/link";
import { getAllBlogs } from "@/lib/blogs";
import { BlogCard } from "./blog-card";

export async function BlogPreview() {
  const blogs = (await getAllBlogs()).slice(0, 3);

  return (
    <div className="space-y-6">
      <div className="grid gap-6 md:grid-cols-3">
        {blogs.map((blog) => (
          <BlogCard key={blog.slug} blog={blog} />
        ))}
      </div>
      <div className="text-right">
        <Link
          href="/blogs"
          className="inline-flex items-center gap-2 rounded-full border border-white/20 px-4 py-2 text-xs uppercase tracking-[0.3em] text-white/80 transition hover:border-emerald-300 hover:text-white"
        >
          View all posts
          <span aria-hidden>↗</span>
        </Link>
      </div>
    </div>
  );
}
