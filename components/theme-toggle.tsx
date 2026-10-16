"use client";

import { useEffect, useState } from "react";
import { currentTheme, toggleTheme, type Theme } from "@/lib/theme";

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme | null>(null);

  useEffect(() => {
    setTheme(currentTheme());
    const observer = new MutationObserver(() => setTheme(currentTheme()));
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    return () => observer.disconnect();
  }, []);

  const label = theme === "dark" ? "Switch to light theme" : "Switch to dark theme";

  return (
    <button
      type="button"
      onClick={(event) => {
        const rect = event.currentTarget.getBoundingClientRect();
        setTheme(toggleTheme({ x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 }));
      }}
      aria-label={label}
      title={label}
      className="inline-flex h-10 w-10 items-center justify-center rounded-md text-graphite transition-colors hover:text-ink"
    >
      <svg viewBox="0 0 20 20" width="18" height="18" aria-hidden="true">
        <circle cx="10" cy="10" r="7.25" fill="none" stroke="currentColor" strokeWidth="1.5" />
        <path d="M10 2.75a7.25 7.25 0 0 1 0 14.5Z" fill="currentColor" />
      </svg>
    </button>
  );
}
