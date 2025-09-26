import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BlogDetail } from "@/components/blog-detail";
import { Navbar } from "@/components/navbar";
import { getAllBlogs, getBlogBySlug } from "@/lib/blogs";

type BlogPageProps = {
  params: Promise<{ slug: string }>;
};

const sections = [
  { id: "top", label: "Top" },
  { id: "article", label: "Article" },
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
    description: blog.excerpt,
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
      <Navbar sections={sections} />
      <main className="mx-auto flex min-h-screen max-w-4xl flex-col gap-16 px-6 pb-24 pt-16 sm:px-8">
        <header className="space-y-4" id="top">
          <p className="text-sm uppercase tracking-[0.3em] text-emerald-200/80">
            Essay
          </p>
          <h1 className="text-4xl font-semibold">{blog.title}</h1>
          <p className="max-w-2xl text-white/70">{blog.excerpt}</p>
        </header>
        <div id="article">
          <BlogDetail blog={blog} />
        </div>
      </main>
    </div>
  );
}
