import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { getAnalytics } from "@/lib/analytics";
import { getAllBlogs } from "@/lib/blogs";
import { formatDate } from "@/lib/date-utils";
import { excerpt } from "@/lib/text";

export const revalidate = 300;

/** Read counts are shown only once they say something; small numbers undercut the post. */
const SHOW_READS_FROM = 50;

export const metadata: Metadata = {
  title: "Writing",
  description: "Notes from building things: shells in C, hackathons, data analysis, prompt engineering and risk.",
  alternates: { canonical: "/blogs" },
};

export default async function BlogsPage() {
  const [blogs, analytics] = await Promise.all([getAllBlogs(), getAnalytics()]);
  const views = new Map(analytics.blogs.map((blog) => [blog.slug, blog.views]));

  return (
    <>
      <SiteHeader />
      <main id="main" className="mx-auto w-full max-w-[88rem] px-4 pb-24 pt-10 sm:px-8 sm:pt-20">
        <PageHeader
          title="Writing"
          lead={<>Notes on things I&apos;ve learned while building: some technical, some not.</>}
          meta={blogs.length > 0 ? `${blogs.length} posts` : undefined}
        />

        {blogs.length === 0 ? (
          <p className="mt-16 text-ink-2">No posts yet. The first one is on its way.</p>
        ) : (
          <ul className="mt-14 border-t border-rule">
            {blogs.map((blog) => {
              const count = views.get(blog.slug) ?? 0;
              const summary = excerpt(blog.excerpt, blog.title, 120);
              return (
                <li key={blog.slug} className="border-b border-rule">
                  <Link href={`/blogs/${blog.slug}`} className="group grid gap-x-6 gap-y-2 py-8 lg:grid-cols-12 lg:items-start">
                    <span className="t-mono text-graphite lg:col-span-3 lg:pt-[0.4rem]">
                      {formatDate(blog.date)}
                      {count >= SHOW_READS_FROM && <span className="block">{count.toLocaleString("en-US")} reads</span>}
                    </span>
                    <span className="min-w-0 lg:col-span-9">
                      <span className="t-title block underline decoration-transparent decoration-1 underline-offset-[0.2em] transition-[text-decoration-color] duration-200 group-hover:decoration-signal-text">
                        {blog.title.trim()}
                      </span>
                      {summary && <span className="measure mt-2 line-clamp-2 text-ink-2">{summary}</span>}
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
