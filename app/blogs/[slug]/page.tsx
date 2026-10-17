import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BlogDetail } from "@/components/blog-detail";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { TransitionLink } from "@/components/transition-link";
import { getAnalytics } from "@/lib/analytics";
import { getAllBlogs, getBlogBySlug, type BlogPost } from "@/lib/blogs";
import { profile } from "@/lib/content";
import { formatDateLong } from "@/lib/date-utils";
import { plainText, postVt } from "@/lib/text";

export const revalidate = 300;

/** Read counts are shown only once they say something. */
const SHOW_READS_FROM = 50;

type BlogPageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateStaticParams() {
  const blogs = await getAllBlogs();
  return blogs.map((blog) => ({ slug: blog.slug }));
}

export async function generateMetadata({ params }: BlogPageProps): Promise<Metadata> {
  const { slug } = await params;
  const blog = await getBlogBySlug(slug);
  if (!blog) return { title: "Post not found" };

  return {
    title: blog.title,
    description: plainText(blog.excerpt) || `${blog.title}, by ${profile.name}.`,
    alternates: { canonical: `/blogs/${slug}` },
    openGraph: { type: "article", title: blog.title, description: plainText(blog.excerpt), publishedTime: blog.date },
  };
}

function readingMinutes(blog: BlogPost) {
  const words = blog.content
    .flatMap((block) => [block.heading ?? "", ...(block.paragraph ?? [])])
    .join(" ")
    .split(/\s+/)
    .filter(Boolean).length;
  return Math.max(1, Math.round(words / 230));
}

export default async function BlogPage({ params }: BlogPageProps) {
  const { slug } = await params;
  const [blog, all, analytics] = await Promise.all([getBlogBySlug(slug), getAllBlogs(), getAnalytics()]);
  if (!blog) notFound();

  const index = all.findIndex((post) => post.slug === slug);
  const newer = index > 0 ? all[index - 1] : null;
  const older = index >= 0 && index < all.length - 1 ? all[index + 1] : null;
  const reads = analytics.blogs.find((entry) => entry.slug === slug)?.views ?? 0;

  return (
    <>
      <SiteHeader />
      <main id="main" className="mx-auto w-full max-w-[76rem] px-4 pb-24 pt-8 sm:px-8 sm:pt-16">
        <article className="mx-auto max-w-[42rem]">
          <p>
            <TransitionLink href="/blogs" className="t-mono text-graphite transition-colors hover:text-ink">
              <span aria-hidden="true">← </span>All writing
            </TransitionLink>
          </p>
          <header className="mt-8 border-b border-rule pb-8">
            <h1 className="t-title text-[clamp(2.25rem,6vw,3.5rem)]" style={{ viewTransitionName: postVt(blog.slug) }}>
              {blog.title.trim()}
            </h1>
            <p className="t-mono mt-5 text-graphite">
              <time dateTime={blog.date}>{formatDateLong(blog.date)}</time>
              <span className="px-2" aria-hidden="true">·</span>
              {readingMinutes(blog)} min read
              {reads >= SHOW_READS_FROM && (
                <>
                  <span className="px-2" aria-hidden="true">·</span>
                  {reads.toLocaleString("en-US")} reads
                </>
              )}
            </p>
          </header>

          <div className="mt-10">
            <BlogDetail blog={blog} />
          </div>
        </article>

        {(newer || older) && (
          <nav aria-label="More posts" className="mx-auto mt-20 grid max-w-[42rem] gap-6 border-t border-rule pt-8 sm:grid-cols-2">
            {older ? (
              <TransitionLink href={`/blogs/${older.slug}`} className="post-row group">
                <span className="t-mono text-graphite">← Older</span>
                <span className="mt-1.5 block font-semibold leading-snug">
                  <span className="post-title">{older.title.trim()}</span>
                </span>
              </TransitionLink>
            ) : (
              <span />
            )}
            {newer && (
              <TransitionLink href={`/blogs/${newer.slug}`} className="post-row group sm:text-right">
                <span className="t-mono text-graphite">Newer →</span>
                <span className="mt-1.5 block font-semibold leading-snug">
                  <span className="post-title">{newer.title.trim()}</span>
                </span>
              </TransitionLink>
            )}
          </nav>
        )}
      </main>
      <SiteFooter />
    </>
  );
}
