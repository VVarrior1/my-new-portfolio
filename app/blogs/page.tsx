import type { Metadata } from "next";
import Link from "next/link";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { getAnalytics } from "@/lib/analytics";
import { getAllBlogs } from "@/lib/blogs";
import { formatDate } from "@/lib/date-utils";
import { plainText } from "@/lib/text";

export const revalidate = 300;

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
      <main id="main" className="mx-auto max-w-[76rem] px-4 pb-24 pt-12 sm:px-8 sm:pt-20">
        <header className="max-w-3xl">
          <h1 className="text-[clamp(2.8rem,7vw,5.5rem)] font-extrabold leading-[0.95] tracking-[-0.05em]">Writing</h1>
          <p className="measure mt-6 text-[1.2rem] leading-relaxed text-graphite">
            Notes on things I&apos;ve learned while building: some technical, some not.
          </p>
        </header>

        {blogs.length === 0 ? (
          <p className="mt-16 text-graphite">No posts yet. The first one is on its way.</p>
        ) : (
          <ul className="mt-14">
            {blogs.map((blog) => {
              const count = views.get(blog.slug) ?? 0;
              return (
                <li key={blog.slug} className="border-b border-rule first:border-t">
                  <Link
                    href={`/blogs/${blog.slug}`}
                    className="group grid gap-x-10 gap-y-2 py-8 md:grid-cols-[10rem_minmax(0,1fr)]"
                  >
                    <span className="text-[0.95rem] tabular-nums text-graphite">
                      {formatDate(blog.date)}
                      {count > 0 && (
                        <span className="block text-[0.85rem]">
                          {count.toLocaleString("en-US")} {count === 1 ? "read" : "reads"}
                        </span>
                      )}
                    </span>
                    <span>
                      <span className="block text-[1.5rem] font-bold leading-tight tracking-[-0.025em] group-hover:underline group-hover:decoration-2 group-hover:underline-offset-4">
                        {blog.title}
                      </span>
                      <span className="measure mt-2 line-clamp-3 leading-relaxed text-graphite">{plainText(blog.excerpt)}</span>
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
