import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BlogDetail } from "@/components/blog-detail";
import { Navbar } from "@/components/navbar";
import { BlogTracker } from "@/components/blog-tracker";
import { AnalyticsBadge } from "@/components/analytics-badge";
import { getAllBlogs, getBlogBySlug } from "@/lib/blogs";
import { formatDateLong } from "@/lib/date-utils";

type BlogPageProps = {
  params: Promise<{ slug: string }>;
};

const sections = [
  { id: "home", label: "Home", href: "/" },
  { id: "blogs", label: "← All Blogs", href: "/blogs" },
  { id: "gallery", label: "Gallery", href: "/gallery" },
  { id: "contact", label: "Contact", href: "/#contact" },
];

export async function generateStaticParams() {
  const blogs = await getAllBlogs();
  return blogs.map((blog) => ({ slug: blog.slug }));
}

export async function generateMetadata({ params }: BlogPageProps): Promise<Metadata> {
  const { slug } = await params;
  const blog = await getBlogBySlug(slug);
  if (!blog) {
    return {
      title: "Blog not found",
    };
  }

  return {
    title: blog.title,
    description: `Read "${blog.title}" - A blog post by Abdelrahman Mohamed covering AI, data science, and software engineering topics.`,
  };
}

export default async function BlogPage({ params }: BlogPageProps) {
  const { slug } = await params;
  const blog = await getBlogBySlug(slug);

  if (!blog) {
    notFound();
  }

  return (
    <div className="relative bg-slate-950 text-white">
      <BlogTracker slug={slug} />
      <Navbar sections={sections} />
      <main className="mx-auto flex min-h-screen max-w-4xl flex-col gap-16 px-6 pb-24 pt-16 sm:px-8">
        <header className="space-y-4" id="top">
          <h1 className="text-4xl font-semibold">{blog.title}</h1>
          <div className="flex items-center justify-between">
            <p className="text-sm uppercase tracking-[0.3em] text-emerald-200/80">
              {formatDateLong(blog.date)}
            </p>
            <AnalyticsBadge type="blog" identifier={slug} />
          </div>
        </header>
        <div id="article">
          <BlogDetail blog={blog} />
        </div>
      </main>
    </div>
  );
}
