"use client";

import { FormEvent, useMemo, useState } from "react";
import { Navbar } from "@/components/navbar";

const sections = [{ id: "admin", label: "Admin" }];

type Status = { ok: boolean; message: string } | null;

type PreviewBlock = {
  heading?: string;
  paragraph?: string[];
};

type PreviewPost = {
  title: string;
  date: string;
  excerpt: string;
  content: PreviewBlock[];
};

function formatPreview(body: string): PreviewPost["content"] {
  const lines = body.split(/\r?\n/);
  const blocks: PreviewPost["content"] = [];
  let current: PreviewBlock | null = null;

  const push = () => {
    if (current) {
      blocks.push(current);
      current = null;
    }
  };

  for (const raw of lines) {
    const line = raw.trim();
    if (!line) {
      push();
      continue;
    }

    const imageMatch = line.match(/^!\[[^\]]*\]\(([^)]+)\)$/);
    if (imageMatch) {
      push();
      blocks.push({ paragraph: [`[image] ${imageMatch[1]}`] });
      continue;
    }

    if (line.startsWith("## ")) {
      push();
      current = { heading: line.replace(/^##\s+/, ""), paragraph: [] };
      continue;
    }

    if (!current) {
      current = { paragraph: [] };
    }

    current.paragraph = [...(current.paragraph ?? []), line];
  }

  push();
  return blocks;
}

export default function AdminPage() {
  const [token, setToken] = useState("");
  const [title, setTitle] = useState("");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [excerpt, setExcerpt] = useState("");
  const [body, setBody] = useState("");
  const [status, setStatus] = useState<Status>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const previewContent = useMemo(() => formatPreview(body), [body]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setStatus(null);
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/blogs", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-admin-token": token,
        },
        body: JSON.stringify({ title, date, excerpt, body }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.error ?? "Failed to create blog post");
      }

      setStatus({ ok: true, message: "Blog post created successfully." });
      setTitle("");
      setExcerpt("");
      setBody("");
    } catch (error) {
      setStatus({ ok: false, message: (error as Error).message });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="relative text-white">
      <Navbar sections={sections} />
      <main
        id="admin"
        className="mx-auto flex min-h-screen max-w-5xl flex-col gap-12 px-6 pb-24 pt-16 sm:px-8"
      >
        <header className="space-y-4">
          <p className="text-sm uppercase tracking-[0.3em] text-emerald-200/80">
            Blog Admin
          </p>
          <h1 className="text-4xl font-semibold">
            Draft and publish new articles
          </h1>
          <p className="max-w-3xl text-white/75">
            Enter your admin token (stored locally in your browser only) to
            publish new posts. Content accepts simple markdown: use `## Heading`
            for section titles and blank lines to separate paragraphs. Use
            `![alt](url)` to embed images.
          </p>
        </header>

        <form
          onSubmit={handleSubmit}
          className="grid gap-6 rounded-3xl border border-white/10 bg-black/40 p-6 backdrop-blur"
        >
          <div className="grid gap-2">
            <label className="text-xs uppercase tracking-[0.3em] text-white/60">
              Admin token
            </label>
            <input
              type="password"
              value={token}
              onChange={(event) => setToken(event.target.value)}
              className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-white focus:border-emerald-300 focus:outline-none"
              placeholder="Enter ADMIN_TOKEN"
              required
            />
          </div>
          <div className="grid gap-2">
            <label className="text-xs uppercase tracking-[0.3em] text-white/60">
              Title
            </label>
            <input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-white focus:border-emerald-300 focus:outline-none"
              placeholder="Compounding tail events in AI"
              required
            />
          </div>
          <div className="grid gap-2 sm:grid-cols-2 sm:items-end">
            <div className="grid gap-2">
              <label className="text-xs uppercase tracking-[0.3em] text-white/60">
                Publish date
              </label>
              <input
                type="date"
                value={date}
                onChange={(event) => setDate(event.target.value)}
                className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-white focus:border-emerald-300 focus:outline-none"
                required
              />
            </div>
            <div className="grid gap-2">
              <label className="text-xs uppercase tracking-[0.3em] text-white/60">
                Excerpt (optional)
              </label>
              <input
                value={excerpt}
                onChange={(event) => setExcerpt(event.target.value)}
                className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-white focus:border-emerald-300 focus:outline-none"
                placeholder="One-liner summary for cards"
              />
            </div>
          </div>
          <div className="grid gap-2">
            <label className="text-xs uppercase tracking-[0.3em] text-white/60">
              Body (markdown)
            </label>
            <textarea
              value={body}
              onChange={(event) => setBody(event.target.value)}
              className="min-h-[240px] rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white focus:border-emerald-300 focus:outline-none"
              placeholder={"## Section\nParagraph text..."}
              required
            />
          </div>
          <button
            type="submit"
            disabled={isSubmitting}
            className="inline-flex items-center justify-center rounded-full border border-emerald-400/60 bg-emerald-400/10 px-5 py-2 text-sm font-semibold text-emerald-100 transition hover:bg-emerald-300 hover:text-black disabled:cursor-wait disabled:opacity-70"
          >
            {isSubmitting ? "Publishing..." : "Publish post"}
          </button>
          {status && (
            <p
              className={`text-sm ${status.ok ? "text-emerald-300" : "text-rose-300"}`}
            >
              {status.message}
            </p>
          )}
        </form>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold">Live preview</h2>
          <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
            <h3 className="text-xl font-semibold text-white">{title || "Untitled"}</h3>
            <p className="text-sm uppercase tracking-[0.3em] text-emerald-200/80">
              {new Date(date).toLocaleDateString("en-CA", {
                month: "short",
                day: "numeric",
                year: "numeric",
              })}
            </p>
            <p className="mt-4 text-white/70">
              {excerpt || "Excerpt will be auto-generated from the first paragraphs."}
            </p>
            <div className="mt-6 space-y-6 text-white/80">
              {previewContent.length === 0 && (
                <p className="text-sm text-white/60">
                  Start typing in the body to see the structured preview.
                </p>
              )}
              {previewContent.map((block, index) => (
                <div key={index} className="space-y-2">
                  {block.heading && (
                    <h4 className="text-lg font-semibold text-white">
                      {block.heading}
                    </h4>
                  )}
                  {block.paragraph?.map((paragraph, paragraphIndex) => (
                    <p key={paragraphIndex} className="text-sm leading-relaxed">
                      {paragraph}
                    </p>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
