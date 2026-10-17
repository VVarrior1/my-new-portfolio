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
      className="island-btn text-ink-2 hover:text-ink"
    >
      {/* Half a disc that turns over with a spring when the theme flips. */}
      <svg
        viewBox="0 0 20 20"
        width="18"
        height="18"
        aria-hidden="true"
        className="transition-transform duration-[900ms] [transition-timing-function:var(--spring-bouncy)]"
        style={{ transform: `rotate(${theme === "dark" ? 180 : 0}deg)` }}
      >
        <circle cx="10" cy="10" r="7.25" fill="none" stroke="currentColor" strokeWidth="1.5" />
        <path d="M10 2.75a7.25 7.25 0 0 1 0 14.5Z" fill="currentColor" />
      </svg>
    </button>
  );
}
