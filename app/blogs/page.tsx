import type { Metadata } from "next";
import { BlogCard } from "@/components/blog-card";
import { getAllBlogs } from "@/lib/blogs";
import { Navbar } from "@/components/navbar";

export const metadata: Metadata = {
  title: "Writing & Notes",
  description:
    "Thinking in public about AI, product velocity, and the business of software.",
};

const sections = [
  { id: "home", label: "Home", href: "/" },
  { id: "gallery", label: "Gallery", href: "/gallery" },
  { id: "about", label: "About", href: "/#about" },
  { id: "projects", label: "Projects", href: "/#projects" },
  { id: "contact", label: "Contact", href: "/#contact" },
];

export default async function BlogsPage() {
  const blogs = await getAllBlogs();

  return (
    <div className="relative text-white">
      <Navbar sections={sections} />
      <main className="mx-auto flex min-h-screen max-w-5xl flex-col gap-16 px-6 pb-24 pt-16 sm:px-8">
        <header id="top" className="space-y-4">
          <p className="text-sm uppercase tracking-[0.3em] text-emerald-200/80">
            Thoughts
          </p>
          <h1 className="text-4xl font-semibold">
            Random thoughts and discoveries
          </h1>
          <p className="max-w-2xl text-white/80">
            Quick notes on cool stuff I'm learning while building things.
          </p>
        </header>
        <section className="grid gap-6 md:grid-cols-2">
          {blogs.map((blog) => (
            <BlogCard key={blog.slug} blog={blog} />
          ))}
        </section>
      </main>
    </div>
  );
}
