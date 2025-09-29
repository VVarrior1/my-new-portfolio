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

type MultiUploadItem = {
  id: string;
  file: File;
  title: string;
  description: string;
  tags: string;
  featured: boolean;
  previewUrl: string;
  uploading?: boolean;
  uploaded?: boolean;
  error?: string;
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

// Login Component
function AdminLogin({ onLogin }: { onLogin: (token: string) => void }) {
  const [token, setToken] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setIsVerifying(true);

    try {
      const response = await fetch("/api/auth/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Invalid token");
      }

      onLogin(token);
    } catch (error) {
      setError((error as Error).message);
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div className="relative text-white">
      <Navbar sections={sections} />
      <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6 py-24">
        <div className="space-y-8">
          <div className="text-center space-y-4">
            <h1 className="text-4xl font-semibold">Admin Access</h1>
            <p className="text-white/75">
              Enter your admin token to access the dashboard
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <label className="text-sm font-medium text-white/80">
                Admin Token
              </label>
              <input
                type="password"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white placeholder-white/40 focus:border-emerald-300 focus:outline-none"
                placeholder="Enter your admin token"
                required
              />
            </div>

            <button
              type="submit"
              disabled={isVerifying}
              className="w-full rounded-full border border-emerald-400/60 bg-emerald-400/10 px-6 py-3 font-semibold text-emerald-100 transition hover:bg-emerald-300 hover:text-black disabled:cursor-wait disabled:opacity-70"
            >
              {isVerifying ? "Verifying..." : "Access Dashboard"}
            </button>

            {error && (
              <p className="text-sm text-rose-300 text-center">{error}</p>
            )}
          </form>
        </div>
      </main>
    </div>
  );
}

// Multi-Upload Component
function MultiImageUpload({ token, onUploadComplete }: { token: string; onUploadComplete?: () => void }) {
  const [items, setItems] = useState<MultiUploadItem[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [status, setStatus] = useState<Status>(null);

  const handleFilesSelected = (files: FileList | null) => {
    if (!files) return;

    const newItems: MultiUploadItem[] = Array.from(files).map((file) => ({
      id: crypto.randomUUID(),
      file,
      title: file.name.replace(/\.[^/.]+$/, ""), // Remove extension
      description: "",
      tags: "",
      featured: false,
      previewUrl: URL.createObjectURL(file),
    }));

    setItems(prev => [...prev, ...newItems]);
  };

  const updateItem = (id: string, updates: Partial<MultiUploadItem>) => {
    setItems(prev => prev.map(item =>
      item.id === id ? { ...item, ...updates } : item
    ));
  };

  const removeItem = (id: string) => {
    setItems(prev => {
      const item = prev.find(i => i.id === id);
      if (item) {
        URL.revokeObjectURL(item.previewUrl);
      }
      return prev.filter(i => i.id !== id);
    });
  };

  const handleUpload = async () => {
    if (items.length === 0) return;

    setIsUploading(true);
    setStatus(null);

    try {
      // Step 1: Get upload URLs
      const uploadRequest = items.map(item => ({
        filename: item.file.name,
        contentType: item.file.type,
        title: item.title,
        description: item.description,
        tags: item.tags,
        featured: item.featured,
      }));

      const urlResponse = await fetch("/api/gallery/multi-upload", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-admin-token": token,
        },
        body: JSON.stringify({ images: uploadRequest }),
      });

      if (!urlResponse.ok) {
        const error = await urlResponse.json();
        throw new Error(error.error || "Failed to get upload URLs");
      }

      const { uploads } = await urlResponse.json();

      // Step 2: Upload files
      const uploadPromises = uploads.map(async (upload: { uploadUrl: string; publicUrl: string; objectName: string; id: string; metadata: any }, index: number) => {
        const item = items[index];

        setItems(prev => prev.map(i =>
          i.id === item.id ? { ...i, uploading: true } : i
        ));

        try {
          const uploadResponse = await fetch(upload.uploadUrl, {
            method: "PUT",
            headers: {
              "Content-Type": item.file.type,
              "x-goog-content-sha256": "UNSIGNED-PAYLOAD",
            },
            body: item.file,
          });

          if (!uploadResponse.ok) {
            throw new Error(`Failed to upload ${item.title}`);
          }

          setItems(prev => prev.map(i =>
            i.id === item.id ? { ...i, uploading: false, uploaded: true } : i
          ));

          return upload;
        } catch (error) {
          setItems(prev => prev.map(i =>
            i.id === item.id ? {
              ...i,
              uploading: false,
              error: (error as Error).message
            } : i
          ));
          throw error;
        }
      });

      const completedUploads = await Promise.all(uploadPromises);

      // Step 3: Save metadata
      const saveResponse = await fetch("/api/gallery/multi-upload", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "x-admin-token": token,
        },
        body: JSON.stringify({ completedUploads }),
      });

      if (!saveResponse.ok) {
        const error = await saveResponse.json();
        throw new Error(error.error || "Failed to save metadata");
      }

      setStatus({
        ok: true,
        message: `Successfully uploaded ${completedUploads.length} images`
      });

      // Clear items after successful upload
      items.forEach(item => URL.revokeObjectURL(item.previewUrl));
      setItems([]);

      // Refresh gallery to show new items
      if (onUploadComplete) {
        onUploadComplete();
      }

    } catch (error) {
      setStatus({ ok: false, message: (error as Error).message });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-white/10 bg-black/40 p-6 backdrop-blur">
        <div className="space-y-4">
          <h3 className="text-xl font-semibold">Multi-Image Upload</h3>

          <div className="space-y-2">
            <label className="text-xs uppercase tracking-[0.3em] text-white/60">
              Select Images
            </label>
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={(e) => handleFilesSelected(e.target.files)}
              className="w-full rounded-2xl border border-dashed border-white/20 bg-white/5 px-4 py-3 text-sm text-white/70 focus:border-emerald-300 focus:outline-none"
            />
          </div>

          {items.length > 0 && (
            <div className="space-y-4">
              <div className="grid gap-4">
                {items.map((item) => (
                  <div
                    key={item.id}
                    className={`rounded-2xl border p-4 ${
                      item.uploaded
                        ? "border-emerald-400/40 bg-emerald-400/10"
                        : item.error
                        ? "border-rose-400/40 bg-rose-400/10"
                        : "border-white/10 bg-white/5"
                    }`}
                  >
                    <div className="grid gap-4 sm:grid-cols-[auto_1fr_auto]">
                      <div className="w-20 h-20 rounded-xl overflow-hidden border border-white/10">
                        <Image
                          src={item.previewUrl}
                          alt="Preview"
                          width={80}
                          height={80}
                          className="w-full h-full object-cover"
                          unoptimized
                        />
                      </div>

                      <div className="grid gap-3 sm:grid-cols-2">
                        <input
                          type="text"
                          value={item.title}
                          onChange={(e) => updateItem(item.id, { title: e.target.value })}
                          placeholder="Image title"
                          className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white focus:border-emerald-300 focus:outline-none"
                          disabled={item.uploading || item.uploaded}
                        />

                        <input
                          type="text"
                          value={item.tags}
                          onChange={(e) => updateItem(item.id, { tags: e.target.value })}
                          placeholder="Tags (comma separated)"
                          className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white focus:border-emerald-300 focus:outline-none"
                          disabled={item.uploading || item.uploaded}
                        />

                        <textarea
                          value={item.description}
                          onChange={(e) => updateItem(item.id, { description: e.target.value })}
                          placeholder="Description (optional)"
                          className="sm:col-span-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white focus:border-emerald-300 focus:outline-none resize-none"
                          rows={2}
                          disabled={item.uploading || item.uploaded}
                        />

                        <label className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.3em] text-white/60">
                          <input
                            type="checkbox"
                            checked={item.featured}
                            onChange={(e) => updateItem(item.id, { featured: e.target.checked })}
                            className="h-4 w-4 rounded border-white/30 bg-white/10 text-emerald-300"
                            disabled={item.uploading || item.uploaded}
                          />
                          Featured
                        </label>
                      </div>

                      <div className="flex flex-col items-center gap-2">
                        {item.uploading && (
                          <div className="h-5 w-5 animate-spin rounded-full border-2 border-emerald-300/30 border-t-emerald-300" />
                        )}
                        {item.uploaded && (
                          <div className="h-5 w-5 rounded-full bg-emerald-400 flex items-center justify-center">
                            <svg className="h-3 w-3 text-black" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                          </div>
                        )}
                        {item.error && (
                          <div className="text-xs text-rose-300 text-center">
                            {item.error}
                          </div>
                        )}
                        <button
                          type="button"
                          onClick={() => removeItem(item.id)}
                          className="text-xs text-white/40 hover:text-rose-300 transition"
                          disabled={item.uploading}
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <button
                type="button"
                onClick={handleUpload}
                disabled={isUploading || items.some(i => !i.title)}
                className="w-full rounded-full border border-emerald-400/60 bg-emerald-400/10 px-6 py-3 font-semibold text-emerald-100 transition hover:bg-emerald-300 hover:text-black disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isUploading
                  ? `Uploading ${items.filter(i => i.uploading).length}/${items.length}...`
                  : `Upload ${items.length} Image${items.length !== 1 ? 's' : ''}`
                }
              </button>
            </div>
          )}

          {status && (
            <p className={`text-sm ${status.ok ? "text-emerald-300" : "text-rose-300"}`}>
              {status.message}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

// Main Admin Dashboard
function AdminDashboard({ token }: { token: string }) {
  const [mode, setMode] = useState<"blog" | "gallery" | "multi-upload">("blog");
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
  const [isFixingInvalid, setIsFixingInvalid] = useState(false);

  const loadGallery = async () => {
    try {
      const response = await fetch("/api/gallery?admin=true");
      if (!response.ok) {
        console.error("Failed to fetch gallery items:", response.status);
        return;
      }
      const items = await response.json();
      const validItems = Array.isArray(items)
        ? items.filter(item => item && item.id && typeof item.id === 'string')
        : [];
      setGalleryItems(validItems);
    } catch (error) {
      console.error("Error loading gallery:", error);
      setGalleryItems([]);
    }
  };

  useEffect(() => {
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
      <button
        type="button"
        onClick={() => setMode("multi-upload")}
        className={`rounded-full px-4 py-1 transition ${
          mode === "multi-upload" ? "bg-emerald-400/20 text-white" : "hover:text-white"
        }`}
      >
        Multi Upload
      </button>
    </div>
  );

  const handleGalleryDelete = async (id: string) => {
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
      await loadGallery();
    } catch (error) {
      setGalleryStatus({
        ok: false,
        message: (error as Error).message
      });
    } finally {
      setIsCleaningUp(false);
    }
  };

  const handleFixInvalidItems = async () => {
    if (!confirm("This will remove gallery items with invalid dates or missing required fields. Continue?")) {
      return;
    }

    setIsFixingInvalid(true);
    try {
      const response = await fetch("/api/gallery/fix-invalid", {
        method: "POST",
        headers: {
          "x-admin-token": token,
        },
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.error ?? "Failed to fix invalid items");
      }

      const result = await response.json();
      setGalleryStatus({
        ok: true,
        message: result.message || `Fixed ${result.removed} invalid items`
      });

      // Refresh the gallery list
      await loadGallery();
    } catch (error) {
      setGalleryStatus({
        ok: false,
        message: (error as Error).message
      });
    } finally {
      setIsFixingInvalid(false);
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
              <h1 className="text-4xl font-semibold">Content Management</h1>
            </div>
            {renderModeToggle}
          </div>
          <p className="max-w-3xl text-white/75">
            Manage your content with enhanced security and bulk upload capabilities.
            {mode === "multi-upload" && " Upload multiple images with individual metadata."}
          </p>
        </header>

        {mode === "multi-upload" ? (
          <MultiImageUpload token={token} onUploadComplete={loadGallery} />
        ) : mode === "blog" ? (
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
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-2xl font-semibold">Recent uploads</h2>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={handleFixInvalidItems}
                    disabled={isFixingInvalid}
                    className="rounded-full border border-rose-400/60 bg-rose-400/10 px-4 py-2 text-sm font-medium text-rose-100 transition hover:bg-rose-400/20 disabled:opacity-50"
                  >
                    {isFixingInvalid ? "Fixing..." : "Fix Invalid Items"}
                  </button>
                  <button
                    type="button"
                    onClick={handleCleanupGallery}
                    disabled={isCleaningUp}
                    className="rounded-full border border-amber-400/60 bg-amber-400/10 px-4 py-2 text-sm font-medium text-amber-100 transition hover:bg-amber-400/20 disabled:opacity-50"
                  >
                    {isCleaningUp ? "Cleaning..." : "Clean Up Broken Images"}
                  </button>
                </div>
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

export default function AdminPage() {
  const [token, setToken] = useState<string | null>(null);

  if (!token) {
    return <AdminLogin onLogin={setToken} />;
  }

  return <AdminDashboard token={token} />;
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