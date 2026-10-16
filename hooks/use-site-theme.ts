"use client";

import { useEffect, useState } from "react";

export type SiteTheme = "light" | "dark" | "system";

function read(): SiteTheme {
  const value = document.documentElement.dataset.theme;
  return value === "light" || value === "dark" ? value : "system";
}

/** The theme chosen with the header toggle ("system" until the visitor picks one). */
export function useSiteTheme(): SiteTheme {
  const [theme, setTheme] = useState<SiteTheme>("system");

  useEffect(() => {
    setTheme(read());
    const observer = new MutationObserver(() => setTheme(read()));
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    return () => observer.disconnect();
  }, []);

  return theme;
}
