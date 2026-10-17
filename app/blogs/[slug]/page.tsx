import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BlogDetail } from "@/components/blog-detail";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { getAnalytics } from "@/lib/analytics";
import { getAllBlogs, getBlogBySlug, type BlogPost } from "@/lib/blogs";
import { profile } from "@/lib/content";
import { formatDateLong } from "@/lib/date-utils";
import { plainText } from "@/lib/text";

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
      <main id="main" className="wrap pb-24 pt-8 sm:pt-16">
        <article className="mx-auto max-w-[42rem]">
          <p>
            <Link href="/blogs" className="t-mono text-graphite transition-colors hover:text-ink">
              <span aria-hidden="true">← </span>All writing
            </Link>
          </p>
          <header className="mt-8 border-b border-rule pb-8">
            <h1 className="t-wide text-[clamp(2rem,4.6vw,2.5rem)] font-[620] leading-[1.08] tracking-[-0.02em]">{blog.title.trim()}</h1>
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
              <Link href={`/blogs/${older.slug}`} className="group">
                <span className="t-mono text-graphite">← Older</span>
                <span className="mt-1.5 block font-semibold leading-snug underline decoration-transparent underline-offset-[0.25em] transition-[text-decoration-color] group-hover:decoration-signal-text">
                  {older.title.trim()}
                </span>
              </Link>
            ) : (
              <span />
            )}
            {newer && (
              <Link href={`/blogs/${newer.slug}`} className="group sm:text-right">
                <span className="t-mono text-graphite">Newer →</span>
                <span className="mt-1.5 block font-semibold leading-snug underline decoration-transparent underline-offset-[0.25em] transition-[text-decoration-color] group-hover:decoration-signal-text">
                  {newer.title.trim()}
                </span>
              </Link>
            )}
          </nav>
        )}
      </main>
      <SiteFooter />
    </>
  );
}
