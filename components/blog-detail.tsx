import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { BlogPost } from "@/lib/blogs";

export function BlogDetail({ blog }: { blog: BlogPost }) {
  return (
    <div className="prose-post">
      {blog.content.map((block, index) => {
        if (block.code !== undefined) {
          // Shown as written: monospace, whitespace kept, and a long line scrolls inside the block
          // (never the page). It can take focus so the scroll works from the keyboard too.
          return (
            <figure key={`code-${index}`} className="post-code">
              {block.language && <figcaption className="post-code-lang">{block.language}</figcaption>}
              <pre tabIndex={0}>
                <code>{block.code}</code>
              </pre>
            </figure>
          );
        }

        if (block.image) {
          return (
            <figure key={`${block.image}-${index}`}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={block.image} alt="" loading="lazy" className="h-auto w-full" />
            </figure>
          );
        }

        return (
          <section key={`${block.heading ?? "text"}-${index}`} className="prose-post">
            {block.heading && <h2>{block.heading}</h2>}
            {block.paragraph && block.paragraph.length > 0 && (
              // One pass per block, so consecutive list items form a single list.
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                  // The page title is the only h1; in-post titles become section headings.
                  h1: ({ children }) => <h2>{children}</h2>,
                  a: ({ children, href }) => (
                    <a href={href} target={href?.startsWith("http") ? "_blank" : undefined} rel="noreferrer">
                      {children}
                    </a>
                  ),
                }}
              >
                {block.paragraph.join("\n\n")}
              </ReactMarkdown>
            )}
          </section>
        );
      })}
    </div>
  );
}
