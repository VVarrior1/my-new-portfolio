"use client";

import { useEffect, useState } from "react";
import type { AnalyticsData } from "@/lib/analytics";

export function AnalyticsDisplay() {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchAnalytics() {
      try {
        const response = await fetch("/api/analytics");
        if (response.ok) {
          const data = await response.json();
          setAnalytics(data);
        }
      } catch (error) {
        console.error("Failed to fetch analytics:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchAnalytics();
    // Refresh every 30 seconds
    const interval = setInterval(fetchAnalytics, 30000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
        <div className="flex items-center gap-2 text-white/60">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-emerald-300/30 border-t-emerald-300" />
          <p className="text-sm">Loading analytics...</p>
        </div>
      </div>
    );
  }

  if (!analytics) {
    return null;
  }

  // Safe fallbacks for new fields
  const totalUniqueViews = analytics.totalUniqueViews ?? 0;
  const safePages = analytics.pages.map(p => ({
    ...p,
    uniqueViews: p.uniqueViews ?? 0
  }));
  const safeBlogs = analytics.blogs.map(b => ({
    ...b,
    uniqueViews: b.uniqueViews ?? 0
  }));

  const topPages = [...safePages]
    .sort((a, b) => b.views - a.views)
    .slice(0, 5);

  const topBlogs = [...safeBlogs]
    .sort((a, b) => b.views - a.views)
    .slice(0, 5);

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-semibold">Live Analytics</h3>
            <span className="flex items-center gap-2 text-xs text-white/50">
              <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" />
              Live
            </span>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <p className="text-xs uppercase tracking-[0.3em] text-white/50">Total Views</p>
              <p className="mt-2 text-3xl font-semibold text-white">
                {analytics.totalViews.toLocaleString()}
              </p>
            </div>

            <div className="rounded-2xl border border-emerald-400/20 bg-emerald-400/5 p-4">
              <p className="text-xs uppercase tracking-[0.3em] text-emerald-200/70">Unique Viewers</p>
              <p className="mt-2 text-3xl font-semibold text-emerald-100">
                {totalUniqueViews.toLocaleString()}
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <p className="text-xs uppercase tracking-[0.3em] text-white/50">Page Visits</p>
              <p className="mt-2 text-3xl font-semibold text-white">
                {analytics.pages.reduce((sum, p) => sum + p.views, 0).toLocaleString()}
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <p className="text-xs uppercase tracking-[0.3em] text-white/50">Blog Views</p>
              <p className="mt-2 text-3xl font-semibold text-white">
                {analytics.blogs.reduce((sum, b) => sum + b.views, 0).toLocaleString()}
              </p>
            </div>
          </div>
        </div>
      </div>

      {topPages.length > 0 && (
        <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
          <h4 className="mb-4 text-lg font-semibold">Top Pages</h4>
          <div className="space-y-2">
            {topPages.map((page) => (
              <div
                key={page.path}
                className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-3"
              >
                <span className="text-sm text-white/80">{page.path}</span>
                <div className="flex items-center gap-3 text-sm">
                  <span className="text-emerald-300">
                    {page.uniqueViews.toLocaleString()} <span className="text-white/50">unique</span>
                  </span>
                  <span className="text-white/50">|</span>
                  <span className="text-white/70">
                    {page.views.toLocaleString()} <span className="text-white/50">total</span>
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {topBlogs.length > 0 && (
        <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
          <h4 className="mb-4 text-lg font-semibold">Top Blog Posts</h4>
          <div className="space-y-2">
            {topBlogs.map((blog) => (
              <div
                key={blog.slug}
                className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-3"
              >
                <span className="text-sm text-white/80">{blog.slug}</span>
                <div className="flex items-center gap-3 text-sm">
                  <span className="text-emerald-300">
                    {blog.uniqueViews.toLocaleString()} <span className="text-white/50">unique</span>
                  </span>
                  <span className="text-white/50">|</span>
                  <span className="text-white/70">
                    {blog.views.toLocaleString()} <span className="text-white/50">total</span>
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
