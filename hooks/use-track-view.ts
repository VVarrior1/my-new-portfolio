"use client";

import { useEffect, useRef } from "react";

const STORAGE_KEY = "portfolio_analytics_tracked";
const VERSION_KEY = "portfolio_analytics_version";
const CURRENT_VERSION = "2"; // Increment when analytics schema changes
const EXPIRY_HOURS = 24; // Track unique views per 24 hours

function checkAndClearOldVersion() {
  if (typeof window === "undefined") return;

  try {
    const storedVersion = localStorage.getItem(VERSION_KEY);
    if (storedVersion !== CURRENT_VERSION) {
      // Clear old tracking data when version changes
      localStorage.removeItem(STORAGE_KEY);
      localStorage.setItem(VERSION_KEY, CURRENT_VERSION);
    }
  } catch {
    // Ignore errors
  }
}

function getTrackedViews(): Record<string, number> {
  if (typeof window === "undefined") return {};

  checkAndClearOldVersion();

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return {};

    const data = JSON.parse(stored);
    return data || {};
  } catch {
    return {};
  }
}

function setTrackedView(key: string) {
  if (typeof window === "undefined") return;

  try {
    const tracked = getTrackedViews();
    const expiryTime = Date.now() + (EXPIRY_HOURS * 60 * 60 * 1000);
    tracked[key] = expiryTime;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tracked));
  } catch (err) {
    console.error("Failed to set tracked view:", err);
  }
}

function hasViewed(key: string): boolean {
  const tracked = getTrackedViews();
  const expiryTime = tracked[key];

  if (!expiryTime) return false;

  // Check if the tracking has expired
  if (Date.now() > expiryTime) {
    // Clean up expired entry
    delete tracked[key];
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(tracked));
      } catch {
        // Ignore errors
      }
    }
    return false;
  }

  return true;
}

export function useTrackPageView(path: string) {
  const tracked = useRef(false);

  useEffect(() => {
    if (tracked.current) return;

    const viewKey = `page:${path}`;
    const isUniqueView = !hasViewed(viewKey);

    // Always track the view, but mark as unique only if first time
    tracked.current = true;

    // Track page view
    fetch("/api/analytics/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "page", path, isUnique: isUniqueView }),
    })
      .then(() => {
        if (isUniqueView) {
          setTrackedView(viewKey);
        }
      })
      .catch((err) => console.error("Failed to track page view:", err));
  }, [path]);
}

export function useTrackBlogView(slug: string) {
  const tracked = useRef(false);

  useEffect(() => {
    if (tracked.current) return;

    const viewKey = `blog:${slug}`;
    const isUniqueView = !hasViewed(viewKey);

    // Always track the view, but mark as unique only if first time
    tracked.current = true;

    // Track blog view
    fetch("/api/analytics/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "blog", slug, isUnique: isUniqueView }),
    })
      .then(() => {
        if (isUniqueView) {
          setTrackedView(viewKey);
        }
      })
      .catch((err) => console.error("Failed to track blog view:", err));
  }, [slug]);
}
