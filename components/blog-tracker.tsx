"use client";

import { useTrackBlogView } from "@/hooks/use-track-view";

export function BlogTracker({ slug }: { slug: string }) {
  useTrackBlogView(slug);
  return null;
}
