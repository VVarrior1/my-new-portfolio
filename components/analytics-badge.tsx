"use client";

import { useEffect, useState } from "react";

type AnalyticsBadgeProps = {
  type: "page" | "blog";
  identifier: string; // path for page, slug for blog
  label?: string;
};

export function AnalyticsBadge({ type, identifier, label = "views" }: AnalyticsBadgeProps) {
  const [views, setViews] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchViews() {
      try {
        const response = await fetch("/api/analytics");
        if (response.ok) {
          const data = await response.json();

          if (type === "page") {
            const page = data.pages.find((p: { path: string }) => p.path === identifier);
            setViews(page?.views ?? 0);
          } else {
            const blog = data.blogs.find((b: { slug: string }) => b.slug === identifier);
            setViews(blog?.views ?? 0);
          }
        }
      } catch (error) {
        console.error("Failed to fetch analytics:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchViews();
    // Refresh every 30 seconds
    const interval = setInterval(fetchViews, 30000);
    return () => clearInterval(interval);
  }, [type, identifier]);

  if (loading) {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs text-white/40">
        <svg className="h-3 w-3 animate-pulse" viewBox="0 0 20 20" fill="currentColor">
          <path d="M10 12.5a2.5 2.5 0 100-5 2.5 2.5 0 000 5z" />
          <path fillRule="evenodd" d="M.664 10.59a1.651 1.651 0 010-1.186A10.004 10.004 0 0110 3c4.257 0 7.893 2.66 9.336 6.41.147.381.146.804 0 1.186A10.004 10.004 0 0110 17c-4.257 0-7.893-2.66-9.336-6.41zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
        </svg>
        <span>...</span>
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-white/50">
      <svg className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
        <path d="M10 12.5a2.5 2.5 0 100-5 2.5 2.5 0 000 5z" />
        <path fillRule="evenodd" d="M.664 10.59a1.651 1.651 0 010-1.186A10.004 10.004 0 0110 3c4.257 0 7.893 2.66 9.336 6.41.147.381.146.804 0 1.186A10.004 10.004 0 0110 17c-4.257 0-7.893-2.66-9.336-6.41zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
      </svg>
      <span>{views?.toLocaleString()} {label}</span>
    </span>
  );
}
