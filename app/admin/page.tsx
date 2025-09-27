"use client";

import Image from "next/image";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { Navbar } from "@/components/navbar";
import { formatDate } from "@/lib/date-utils";

const sections = [
  { id: "home", label: "← Back to Site", href: "/" }
];

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

type GalleryItem = {
  id: string;
  title: string;
  description?: string;
  tags: string[];
  imageUrl: string;
  objectPath?: string;
  createdAt: string;
  featured?: boolean;
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
  const [mode, setMode] = useState<"blog" | "gallery">("blog");
  const [status, setStatus] = useState<Status>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Blog state
  const [title, setTitle] = useState("");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [excerpt, setExcerpt] = useState("");
  const [body, setBody] = useState("");
  const previewContent = useMemo(() => formatPreview(body), [body]);

  // Gallery state
  const [galleryTitle, setGalleryTitle] = useState("");
  const [galleryDescription, setGalleryDescription] = useState("");
  const [galleryTags, setGalleryTags] = useState("");
  const [galleryFeatured, setGalleryFeatured] = useState(false);
  const [galleryFile, setGalleryFile] = useState<File | null>(null);
  const [galleryPreviewUrl, setGalleryPreviewUrl] = useState<string | null>(null);
  const [galleryItems, setGalleryItems] = useState<GalleryItem[]>([]);
  const [galleryDeletingId, setGalleryDeletingId] = useState<string | null>(null);
  const [galleryStatus, setGalleryStatus] = useState<Status>(null);
  const [isGallerySubmitting, setIsGallerySubmitting] = useState(false);
  const [isCleaningUp, setIsCleaningUp] = useState(false);

  useEffect(() => {
    const loadGallery = async () => {
      const response = await fetch("/api/gallery");
      if (!response.ok) {
        return;
      }
      const data = (await response.json()) as GalleryItem[];
      setGalleryItems(data);
    };

    loadGallery();
  }, []);

  useEffect(() => {
    if (!galleryFile) {
      setGalleryPreviewUrl(null);
      return;
    }

    const url = URL.createObjectURL(galleryFile);
    setGalleryPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [galleryFile]);

  const handleBlogSubmit = async (event: FormEvent<HTMLFormElement>) => {
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

  const handleGallerySubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setGalleryStatus(null);

    if (!galleryFile) {
      setGalleryStatus({ ok: false, message: "Select an image before uploading." });
      return;
    }

    setIsGallerySubmitting(true);

    try {
      const uploadRes = await fetch("/api/gallery/upload-url", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-admin-token": token,
        },
        body: JSON.stringify({
          filename: galleryFile.name,
          contentType: galleryFile.type,
        }),
      });

      if (!uploadRes.ok) {
        const payload = await uploadRes.json().catch(() => ({}));
        throw new Error(payload.error ?? "Failed to create upload URL");
      }

      const { uploadUrl, publicUrl, objectName } = (await uploadRes.json()) as {
        uploadUrl: string;
        publicUrl: string;
        objectName: string;
      };

      const uploadResponse = await fetch(uploadUrl, {
        method: "PUT",
        headers: {
          "Content-Type": galleryFile.type || "application/octet-stream",
          "x-goog-content-sha256": "UNSIGNED-PAYLOAD",
        },
        body: galleryFile,
      });

      if (!uploadResponse.ok) {
        throw new Error("Failed to upload image to Google Cloud Storage");
      }

      const metadataRes = await fetch("/api/gallery", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-admin-token": token,
        },
        body: JSON.stringify({
          title: galleryTitle,
          description: galleryDescription,
          tags: galleryTags,
          imageUrl: publicUrl,
          objectPath: objectName,
          featured: galleryFeatured,
        }),
      });

      if (!metadataRes.ok) {
        const payload = await metadataRes.json().catch(() => ({}));
        throw new Error(payload.error ?? "Failed to save gallery item");
      }

      const saved = (await metadataRes.json()) as GalleryItem;
      setGalleryItems((current) => [saved, ...current]);

      setGalleryTitle("");
      setGalleryDescription("");
      setGalleryTags("");
      setGalleryFeatured(false);
      setGalleryFile(null);
      setGalleryStatus({ ok: true, message: "Image uploaded successfully." });
    } catch (error) {
      setGalleryStatus({ ok: false, message: (error as Error).message });
    } finally {
      setIsGallerySubmitting(false);
    }
  };

  const renderModeToggle = (
    <div className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 p-1 text-xs uppercase tracking-[0.3em] text-white/60">
      <button
        type="button"
        onClick={() => setMode("blog")}
        className={`rounded-full px-4 py-1 transition ${
          mode === "blog" ? "bg-emerald-400/20 text-white" : "hover:text-white"
        }`}
      >
        Blog
      </button>
      <button
        type="button"
        onClick={() => setMode("gallery")}
        className={`rounded-full px-4 py-1 transition ${
          mode === "gallery" ? "bg-emerald-400/20 text-white" : "hover:text-white"
        }`}
      >
        Gallery
      </button>
    </div>
  );

  const handleGalleryDelete = async (id: string) => {
    if (!token) {
      setGalleryStatus({ ok: false, message: "Enter admin token first." });
      return;
    }

    if (!window.confirm("Remove this gallery item?")) {
      return;
    }

    setGalleryDeletingId(id);
    try {
      const response = await fetch(`/api/gallery/${id}`, {
        method: "DELETE",
        headers: {
          "x-admin-token": token,
        },
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.error ?? "Failed to delete gallery item");
      }

      setGalleryItems((items) => items.filter((item) => item.id !== id));
      setGalleryStatus({ ok: true, message: "Gallery item deleted." });
    } catch (error) {
      setGalleryStatus({ ok: false, message: (error as Error).message });
    } finally {
      setGalleryDeletingId(null);
    }
  };

  const handleCleanupGallery = async () => {
    if (!confirm("This will remove all gallery entries with broken or inaccessible images. Continue?")) {
      return;
    }

    setIsCleaningUp(true);
    try {
      const response = await fetch("/api/gallery/cleanup", {
        method: "POST",
        headers: {
          "x-admin-token": token,
        },
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.error ?? "Failed to clean up gallery");
      }

      const result = await response.json();
      setGalleryStatus({
        ok: true,
        message: result.message
      });

      // Refresh the gallery list
      const galleryResponse = await fetch("/api/gallery");
      if (galleryResponse.ok) {
        const updatedItems = await galleryResponse.json();
        setGalleryItems(updatedItems);
      }
    } catch (error) {
      setGalleryStatus({
        ok: false,
        message: (error as Error).message
      });
    } finally {
      setIsCleaningUp(false);
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
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="space-y-2">
              <p className="text-sm uppercase tracking-[0.3em] text-emerald-200/80">
                Admin Console
              </p>
              <h1 className="text-4xl font-semibold">Publish content</h1>
            </div>
            {renderModeToggle}
          </div>
          <p className="max-w-3xl text-white/75">
            Enter your admin token (stored locally in your browser only) to
            publish updates. Blog posts support Markdown (`## Heading`, blank
            lines for paragraph breaks, `![alt](url)` for images). The gallery
            uploader pushes assets to your Google Cloud Storage bucket and keeps
            metadata in the repo.
          </p>
        </header>

        <div className="grid gap-4 rounded-3xl border border-white/10 bg-black/40 p-6 backdrop-blur">
          <label className="text-xs uppercase tracking-[0.3em] text-white/60">
            Admin token
          </label>
          <input
            type="password"
            value={token}
            onChange={(event) => setToken(event.target.value)}
            className="max-w-md rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-white focus:border-emerald-300 focus:outline-none"
            placeholder="Enter ADMIN_TOKEN"
            required
          />
        </div>

        {mode === "blog" ? (
          <>
            <form
              onSubmit={handleBlogSubmit}
              className="grid gap-6 rounded-3xl border border-white/10 bg-black/40 p-6 backdrop-blur"
            >
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
                  {formatDate(date)}
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

            <section className="space-y-4">
              <h2 className="text-2xl font-semibold">Manage existing blogs</h2>
              <ExistingBlogs token={token} />
            </section>
          </>
        ) : (
          <section className="grid gap-8">
            <form
              onSubmit={handleGallerySubmit}
              className="grid gap-6 rounded-3xl border border-white/10 bg-black/40 p-6 backdrop-blur"
            >
              <div className="grid gap-2">
                <label className="text-xs uppercase tracking-[0.3em] text-white/60">
                  Title
                </label>
                <input
                  value={galleryTitle}
                  onChange={(event) => setGalleryTitle(event.target.value)}
                  className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-white focus:border-emerald-300 focus:outline-none"
                  placeholder="Vertex AI agent dashboard"
                  required
                />
              </div>
              <div className="grid gap-2">
                <label className="text-xs uppercase tracking-[0.3em] text-white/60">
                  Description (optional)
                </label>
                <textarea
                  value={galleryDescription}
                  onChange={(event) => setGalleryDescription(event.target.value)}
                  className="min-h-[120px] rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white focus:border-emerald-300 focus:outline-none"
                  placeholder="Context for the image or project snippet"
                />
              </div>
              <div className="grid gap-2 sm:grid-cols-2 sm:items-center">
                <div className="grid gap-2">
                  <label className="text-xs uppercase tracking-[0.3em] text-white/60">
                    Tags (comma separated)
                  </label>
                  <input
                    value={galleryTags}
                    onChange={(event) => setGalleryTags(event.target.value)}
                    className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-white focus:border-emerald-300 focus:outline-none"
                    placeholder="AI, dashboard, launch"
                  />
                </div>
                <label className="mt-4 inline-flex items-center gap-2 text-xs uppercase tracking-[0.3em] text-white/60 sm:mt-8">
                  <input
                    type="checkbox"
                    checked={galleryFeatured}
                    onChange={(event) => setGalleryFeatured(event.target.checked)}
                    className="h-4 w-4 rounded border-white/30 bg-white/10 text-emerald-300 focus:ring-emerald-400"
                  />
                  Featured
                </label>
              </div>
              <div className="grid gap-2">
                <label className="text-xs uppercase tracking-[0.3em] text-white/60">
                  Image file
                </label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(event) => setGalleryFile(event.target.files?.[0] ?? null)}
                  className="rounded-2xl border border-dashed border-white/20 bg-white/5 px-4 py-3 text-sm text-white/70 focus:border-emerald-300 focus:outline-none"
                  required
                />
                {galleryPreviewUrl && (
                  <div className="mt-3 overflow-hidden rounded-3xl border border-white/10 bg-white/5">
                    <Image
                      src={galleryPreviewUrl}
                      alt="Preview"
                      width={800}
                      height={600}
                      className="h-full w-full object-cover"
                      unoptimized
                    />
                  </div>
                )}
              </div>
              <button
                type="submit"
                disabled={isGallerySubmitting}
                className="inline-flex items-center justify-center rounded-full border border-emerald-400/60 bg-emerald-400/10 px-5 py-2 text-sm font-semibold text-emerald-100 transition hover:bg-emerald-300 hover:text-black disabled:cursor-wait disabled:opacity-70"
              >
                {isGallerySubmitting ? "Uploading..." : "Upload image"}
              </button>
              {galleryStatus && (
                <p
                  className={`text-sm ${
                    galleryStatus.ok ? "text-emerald-300" : "text-rose-300"
                  }`}
                >
                  {galleryStatus.message}
                </p>
              )}
            </form>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-semibold">Recent uploads</h2>
                <button
                  type="button"
                  onClick={handleCleanupGallery}
                  disabled={isCleaningUp}
                  className="rounded-full border border-amber-400/60 bg-amber-400/10 px-4 py-2 text-sm font-medium text-amber-100 transition hover:bg-amber-400/20 disabled:opacity-50"
                >
                  {isCleaningUp ? "Cleaning..." : "Clean Up Broken Images"}
                </button>
              </div>
              {galleryItems.length === 0 ? (
                <p className="rounded-3xl border border-dashed border-white/10 bg-white/5 p-6 text-sm text-white/60">
                  No images yet. Upload your first gallery item to see it here.
                </p>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2">
                  {galleryItems.slice(0, 6).map((item) => (
                    <figure
                      key={item.id}
                      className="overflow-hidden rounded-3xl border border-white/10 bg-white/5"
                    >
                      <Image
                        src={item.imageUrl}
                        alt={item.title}
                        width={600}
                        height={400}
                        className="h-40 w-full object-cover"
                      />
                      <figcaption className="space-y-3 p-4 text-white/80">
                        <div className="flex items-start justify-between gap-3">
                          <div className="space-y-1">
                            <h3 className="text-lg font-semibold text-white">{item.title}</h3>
                            {item.description && (
                              <p className="line-clamp-2 text-sm text-white/60">
                                {item.description}
                              </p>
                            )}
                          </div>
                          <button
                            type="button"
                            onClick={() => handleGalleryDelete(item.id)}
                            className="rounded-full border border-white/10 bg-white/10 px-3 py-1 text-xs uppercase tracking-[0.3em] text-rose-200 transition hover:border-rose-300 hover:bg-rose-300 hover:text-black"
                            disabled={galleryDeletingId === item.id}
                          >
                            {galleryDeletingId === item.id ? "Deleting..." : "Remove"}
                          </button>
                        </div>
                        {item.tags.length > 0 && (
                          <ul className="flex flex-wrap gap-2 text-[0.65rem] uppercase tracking-[0.35em] text-white/50">
                            {item.tags.map((tag) => (
                              <li
                                key={`${item.id}-${tag}`}
                                className="rounded-full border border-white/10 bg-white/5 px-2 py-1"
                              >
                                {tag}
                              </li>
                            ))}
                          </ul>
                        )}
                      </figcaption>
                    </figure>
                  ))}
                </div>
              )}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}

type BlogPost = {
  slug: string;
  title: string;
  date: string;
  excerpt: string;
};

function ExistingBlogs({ token }: { token: string }) {
  const [blogs, setBlogs] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);

  useEffect(() => {
    async function fetchBlogs() {
      try {
        const response = await fetch('/api/blogs');
        if (response.ok) {
          const blogsData = await response.json();
          setBlogs(blogsData);
        }
      } catch (error) {
        console.error('Failed to fetch blogs:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchBlogs();
  }, []);

  const handleDelete = async (slug: string) => {
    if (!confirm('Are you sure you want to delete this blog? This action cannot be undone.')) {
      return;
    }

    setDeleting(slug);
    try {
      const response = await fetch(`/api/blogs/${slug}`, {
        method: 'DELETE',
        headers: {
          'x-admin-token': token,
        },
      });

      if (response.ok) {
        setBlogs(prev => prev.filter(blog => blog.slug !== slug));
      } else {
        const error = await response.json();
        alert(`Failed to delete blog: ${error.error}`);
      }
    } catch (error) {
      console.error('Delete failed:', error);
      alert('Failed to delete blog. Please try again.');
    } finally {
      setDeleting(null);
    }
  };

  if (loading) {
    return (
      <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
        <p className="text-white/60">Loading blogs...</p>
      </div>
    );
  }

  if (blogs.length === 0) {
    return (
      <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
        <p className="text-white/60">No blogs found.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {blogs.map((blog) => (
        <div
          key={blog.slug}
          className="flex items-center justify-between rounded-3xl border border-white/10 bg-white/5 p-4"
        >
          <div className="space-y-1">
            <h3 className="font-medium text-white">{blog.title}</h3>
            <p className="text-xs text-white/60">{formatDate(blog.date)} • /blogs/{blog.slug}</p>
            <p className="text-sm text-white/70">{blog.excerpt.slice(0, 100)}...</p>
          </div>
          <button
            onClick={() => handleDelete(blog.slug)}
            disabled={deleting === blog.slug}
            className="rounded-full bg-rose-500/20 px-4 py-2 text-sm text-rose-300 transition hover:bg-rose-500/30 disabled:opacity-50"
          >
            {deleting === blog.slug ? 'Deleting...' : 'Delete'}
          </button>
        </div>
      ))}
    </div>
  );
}
