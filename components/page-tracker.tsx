"use client";

import { useTrackPageView } from "@/hooks/use-track-view";

export function PageTracker({ path }: { path: string }) {
  useTrackPageView(path);
  return null;
}
