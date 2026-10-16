import type { Metadata } from "next";
import Link from "next/link";
import { PageIntro } from "@/components/page-intro";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { getAllBlogs } from "@/lib/blogs";
import { formatDate } from "@/lib/date-utils";
import { excerpt } from "@/lib/text";

export const revalidate = 300;

export const metadata: Metadata = {
  title: "Writing",
  description: "Notes from building things: shells in C, hackathons, data analysis, prompt engineering and risk.",
  alternates: { canonical: "/blogs" },
};

export default async function BlogsPage() {
  const blogs = await getAllBlogs();

  return (
    <>
      <SiteHeader />
      <main id="main" className="wrap pb-24 pt-12 sm:pt-20">
        <PageIntro path="/blogs" title="Writing." muted="Notes from building.">
          Things I&apos;ve learned while building: some technical, some not.
        </PageIntro>

        {blogs.length === 0 ? (
          <p className="mt-16 text-graphite">No posts yet. The first one is on its way.</p>
        ) : (
          <ul className="dim-list -mx-4 mt-14 lg:mt-20">
            {blogs.map((blog) => {
              const summary = excerpt(blog.excerpt, blog.title, 220);
              return (
                <li
                  key={blog.slug}
                  className="dim-row relative rounded-[10px] before:absolute before:inset-x-4 before:top-0 before:h-px before:bg-rule last:after:absolute last:after:inset-x-4 last:after:bottom-0 last:after:h-px last:after:bg-rule"
                >
                  <Link href={`/blogs/${blog.slug}`} className="grid gap-y-1.5 rounded-[10px] px-4 py-6 lg:grid-cols-12 lg:gap-x-6">
                    <span className="t-mono tabular-nums text-graphite lg:col-span-3 lg:pt-1">{formatDate(blog.date)}</span>
                    <span className="min-w-0 lg:col-span-9">
                      <span className="block text-[1.25rem] font-medium leading-snug tracking-[-0.01em] text-ink">{blog.title.trim()}</span>
                      {summary && <span className="measure mt-1.5 line-clamp-2 block text-graphite">{summary}</span>}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </main>
      <SiteFooter />
    </>
  );
}
