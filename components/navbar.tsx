
"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ScrollProgress } from "./scroll-progress";

type SectionLink = {
  id: string;
  label: string;
  href?: string; // Optional external link
};

export function Navbar({ sections }: { sections: SectionLink[] }) {
  const [activeId, setActiveId] = useState<string>(sections[0]?.id ?? "");
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      const checkpoint = window.scrollY + window.innerHeight * 0.35;

      let currentId = sections[0]?.id ?? "";
      sections.forEach(({ id }) => {
        const element = document.getElementById(id);
        if (!element) return;
        if (checkpoint >= element.offsetTop) {
          currentId = id;
        }
      });

      setActiveId(currentId);
    };

    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });

    return () => window.removeEventListener("scroll", handleScroll);
  }, [sections]);

  useEffect(() => {
    setIsMenuOpen(false);
  }, [activeId]);

  const menuItems = useMemo(
    () =>
      sections.map(({ id, label, href }) => {
        const isActive = activeId === id;
        const linkHref = href || `#${id}`;
        return (
          <Link
            key={id}
            href={linkHref}
            onClick={() => {
              setActiveId(id);
              setIsMenuOpen(false);
            }}
            className={`rounded-full px-4 py-2 transition duration-200 ${
              isActive
                ? "bg-gradient-to-r from-emerald-400 via-sky-500 to-violet-500 text-black shadow-[0_10px_25px_-15px_rgba(14,165,233,0.8)]"
                : "hover:bg-white/10 hover:text-white"
            }`}
          >
            {label}
          </Link>
        );
      }),
    [activeId, sections]
  );

  return (
    <header className="sticky top-0 z-50 px-4 pt-4 sm:px-6">
      <div className="relative mx-auto flex max-w-5xl items-center justify-between rounded-full border border-white/10 bg-black/40 px-6 py-3 backdrop-blur-xl">
        <span className="text-sm uppercase tracking-[0.4em] text-white/70">
          Abdelrahman
        </span>
        <div className="hidden items-center gap-2 text-sm text-white/70 sm:flex">
          {menuItems}
        </div>
        <button
          type="button"
          onClick={() => setIsMenuOpen((open) => !open)}
          className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/15 bg-white/5 text-white transition hover:border-emerald-300 hover:text-emerald-200 sm:hidden"
          aria-expanded={isMenuOpen}
          aria-label="Toggle navigation"
        >
          <span
            className={`flex flex-col items-center justify-center ${
              isMenuOpen ? "gap-0" : "gap-1.5"
            }`}
          >
            <span
              className={`block h-0.5 w-5 transform rounded-full bg-current transition-transform duration-200 ${
                isMenuOpen ? "translate-y-0.5 rotate-45" : ""
              }`}
            />
            <span
              className={`block h-0.5 w-5 transform rounded-full bg-current transition-transform duration-200 ${
                isMenuOpen ? "-translate-y-0.5 -rotate-45" : ""
              }`}
            />
          </span>
        </button>
        {isMenuOpen && (
          <div className="absolute left-3 right-3 top-full mt-3 flex flex-col gap-2 rounded-3xl border border-white/10 bg-black/90 p-4 text-sm text-white/70 sm:hidden">
            {menuItems}
          </div>
        )}
      </div>
      <ScrollProgress />
    </header>
  );
}
