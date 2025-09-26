import type { BlogPost } from "@/lib/blogs";

export function BlogDetail({ blog }: { blog: BlogPost }) {
  return (
    <article className="mx-auto max-w-3xl space-y-10">
      <header className="space-y-4">
        <p className="text-sm uppercase tracking-[0.3em] text-emerald-200/80">
          {new Date(blog.date).toLocaleDateString("en-CA", {
            month: "long",
            day: "numeric",
            year: "numeric",
          })}
        </p>
        <h1 className="text-4xl font-semibold text-white">{blog.title}</h1>
      </header>
      <div className="space-y-10 text-white/80">
        {blog.content.map((block, index) => {
          if (block.image) {
            return (
              <figure
                key={`${block.image}-${index}`}
                className="overflow-hidden rounded-3xl border border-white/10"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={block.image}
                  alt="Blog related visual"
                  className="h-full w-full object-cover"
                />
              </figure>
            );
          }

          return (
            <section key={`${block.heading ?? "paragraph"}-${index}`} className="space-y-4">
              {block.heading && (
                <h2 className="text-2xl font-semibold text-white">
                  {block.heading}
                </h2>
              )}
              {block.paragraph?.map((paragraph, paragraphIndex) => (
                <p key={paragraphIndex} className="leading-relaxed">
                  {paragraph}
                </p>
              ))}
            </section>
          );
        })}
      </div>
    </article>
  );
}
