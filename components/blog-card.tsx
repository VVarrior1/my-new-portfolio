import Link from "next/link";
import type { BlogPost } from "@/lib/blogs";
import { formatDate } from "@/lib/date-utils";

export function BlogCard({ blog }: { blog: BlogPost }) {
  const date = formatDate(blog.date);

  return (
    <article className="group relative overflow-hidden rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur transition duration-300 hover:-translate-y-1 hover:border-emerald-300/60">
      <div className="pointer-events-none absolute inset-0 opacity-0 transition duration-300 group-hover:opacity-100">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(16,185,129,0.25),transparent_65%)]" />
        <div className="pattern-grid opacity-10" />
      </div>
      <p className="text-xs uppercase tracking-[0.3em] text-emerald-200/80">{date}</p>
      <h3 className="mt-4 text-2xl font-semibold text-white">{blog.title}</h3>
      <p className="mt-3 line-clamp-4 text-sm text-white/75">{blog.excerpt}</p>
      <Link
        href={`/blogs/${blog.slug}`}
        className="mt-6 inline-flex items-center gap-2 text-sm font-medium text-emerald-300 transition group-hover:gap-3"
      >
        Read article
        <span aria-hidden>↗</span>
      </Link>
    </article>
  );
}
