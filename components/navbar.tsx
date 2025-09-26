"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ScrollProgress } from "./scroll-progress";

type SectionLink = {
  id: string;
  label: string;
};

export function Navbar({ sections }: { sections: SectionLink[] }) {
  const [activeId, setActiveId] = useState<string>(sections[0]?.id ?? "");

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio);
        if (visible[0]?.target.id) {
          setActiveId(visible[0].target.id);
        }
      },
      { rootMargin: "-40% 0px -40% 0px", threshold: [0.25, 0.4, 0.6] }
    );

    sections.forEach(({ id }) => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, [sections]);

  return (
    <header className="sticky top-0 z-50 px-4 pt-4 sm:px-6">
      <div className="mx-auto flex max-w-5xl items-center justify-between rounded-full border border-white/10 bg-black/40 px-6 py-3 backdrop-blur-xl">
        <span className="text-sm uppercase tracking-[0.4em] text-white/70">
          Abdelrahman
        </span>
        <div className="flex items-center gap-2 text-sm text-white/70">
          {sections.map(({ id, label }) => {
            const isActive = activeId === id;
            return (
              <Link
                key={id}
                href={`#${id}`}
                className={`rounded-full px-4 py-2 transition duration-200 ${
                  isActive
                    ? "bg-gradient-to-r from-emerald-400 via-sky-500 to-violet-500 text-black shadow-[0_10px_25px_-15px_rgba(14,165,233,0.8)]"
                    : "hover:bg-white/10 hover:text-white"
                }`}
              >
                {label}
              </Link>
            );
          })}
        </div>
      </div>
      <ScrollProgress />
    </header>
  );
}
