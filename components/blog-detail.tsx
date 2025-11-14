"use client";

import type { BlogPost } from "@/lib/blogs";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

export function BlogDetail({ blog }: { blog: BlogPost }) {
  return (
    <article className="mx-auto max-w-3xl space-y-10">
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
                <div key={paragraphIndex} className="prose prose-invert max-w-none leading-relaxed">
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    components={{
                      // Customize heading styles
                      h3: ({ children }) => (
                        <h3 className="text-xl font-semibold text-white mt-6 mb-3">
                          {children}
                        </h3>
                      ),
                      h4: ({ children }) => (
                        <h4 className="text-lg font-semibold text-white mt-4 mb-2">
                          {children}
                        </h4>
                      ),
                      // Customize list styles
                      ul: ({ children }) => (
                        <ul className="list-disc list-inside space-y-2 my-4 text-white/80">
                          {children}
                        </ul>
                      ),
                      ol: ({ children }) => (
                        <ol className="list-decimal list-inside space-y-2 my-4 text-white/80">
                          {children}
                        </ol>
                      ),
                      // Customize paragraph styles
                      p: ({ children }) => (
                        <p className="text-white/80 leading-relaxed">
                          {children}
                        </p>
                      ),
                      // Customize strong (bold) styles
                      strong: ({ children }) => (
                        <strong className="font-bold text-white">
                          {children}
                        </strong>
                      ),
                      // Customize em (italic) styles
                      em: ({ children }) => (
                        <em className="italic text-white/90">
                          {children}
                        </em>
                      ),
                      // Customize links
                      a: ({ children, href }) => (
                        <a
                          href={href}
                          className="text-blue-400 hover:text-blue-300 underline"
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          {children}
                        </a>
                      ),
                    }}
                  >
                    {paragraph}
                  </ReactMarkdown>
                </div>
              ))}
            </section>
          );
        })}
      </div>
    </article>
  );
}
