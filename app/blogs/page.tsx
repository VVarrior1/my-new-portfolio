import type { Metadata } from "next";
import Link from "next/link";
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
      <main id="main" className="frame">
        <div className="mx-auto max-w-[76rem] px-4 pb-20 pt-10 sm:px-8 sm:pt-16 lg:pb-28">
          <header>
            <p className="t-meta text-graphite">
              {blogs.length} {blogs.length === 1 ? "post" : "posts"} · newest first
            </p>
            <h1 className="t-display mt-4 max-w-[59.75rem]">
              <span className="text-ink">Writing.</span>{" "}
              <span className="text-graphite">Notes on things I&apos;ve learned while building: some technical, some not.</span>
            </h1>
          </header>

          {blogs.length === 0 ? (
            <p className="mt-16 text-graphite">No posts yet. The first one is on its way.</p>
          ) : (
            <ul className="mt-14 lg:mt-20">
              {blogs.map((blog) => {
                const teaser = excerpt(blog.excerpt, blog.title, 240);
                return (
                  <li key={blog.slug} className="border-b border-rule first:border-t">
                    <Link href={`/blogs/${blog.slug}`} className="group grid grid-cols-1 gap-y-1.5 py-7 sm:grid-cols-12 sm:gap-x-6">
                      <span className="t-meta text-graphite sm:col-span-3 sm:pt-[0.3rem]">{formatDate(blog.date)}</span>
                      <span className="sm:col-span-9 lg:col-span-8">
                        <span className="t-title block text-ink transition-colors duration-200 group-hover:text-signal">
                          {blog.title.trim()}
                        </span>
                        {teaser && <span className="t-body mt-2 line-clamp-2 text-ink-2">{teaser}</span>}
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
