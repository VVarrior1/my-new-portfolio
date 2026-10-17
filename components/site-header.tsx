"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { CommandMenu } from "./command-menu";
import { ThemeToggle } from "./theme-toggle";

const links = [
  { href: "/#work", label: "Work" },
  { href: "/#experience", label: "Experience" },
  { href: "/blogs", label: "Writing" },
  { href: "/gallery", label: "Gallery" },
  { href: "/#contact", label: "Contact" },
];

/** A drafting crosshair, the site's mark. */
function Mark() {
  return (
    <svg viewBox="0 0 20 20" width="20" height="20" aria-hidden="true" className="shrink-0">
      <circle cx="10" cy="10" r="5.25" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <path d="M10 1v5.5M10 13.5V19M1 10h5.5M13.5 10H19" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <circle cx="10" cy="10" r="1.5" fill="currentColor" />
    </svg>
  );
}

export function SiteHeader() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  // On the home page the name is already the headline, so the wordmark waits until the h1 scrolls away.
  const [headlineVisible, setHeadlineVisible] = useState(pathname === "/");

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const headline = pathname === "/" ? document.getElementById("hero-title") : null;
    if (!headline) {
      setHeadlineVisible(false);
      return;
    }
    const io = new IntersectionObserver(([entry]) => setHeadlineVisible(entry.isIntersecting), { rootMargin: "-64px 0px 0px 0px" });
    io.observe(headline);
    return () => io.disconnect();
  }, [pathname]);

  useEffect(() => setOpen(false), [pathname]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const isCurrent = (href: string) => !href.includes("#") && pathname.startsWith(href);
  const showName = !headlineVisible || open;

  return (
    <header
      className={`sticky top-0 z-50 border-b bg-paper transition-[border-color] duration-200 ${
        scrolled || open ? "border-rule" : "border-transparent"
      }`}
    >
      <div className="mx-auto flex h-16 max-w-[76rem] items-center justify-between gap-4 px-4 sm:px-8">
        {/* The mark: the crosshair and the AM monogram, which becomes the full name once the h1 has scrolled away. */}
        <Link href="/" aria-label="Abdelrahman Mohamed, home" className="-ml-0.5 flex items-center gap-2.5 text-[0.9375rem] font-semibold tracking-[-0.01em]">
          <Mark />
          <span aria-hidden="true" className={showName ? "hidden" : "inline"}>
            AM
          </span>
          <span aria-hidden="true" className={showName ? "inline animate-in fade-in duration-300" : "hidden"}>
            <span className="sm:hidden">A. Mohamed</span>
            <span className="hidden sm:inline">Abdelrahman Mohamed</span>
          </span>
        </Link>

        <nav aria-label="Main" className="hidden items-center gap-0.5 md:flex">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              aria-current={isCurrent(link.href) ? "page" : undefined}
              className="rounded-lg px-3 py-2 text-[0.9375rem] text-graphite transition-colors hover:text-ink aria-[current=page]:text-ink aria-[current=page]:underline aria-[current=page]:decoration-ink aria-[current=page]:decoration-1 aria-[current=page]:underline-offset-[0.4em]"
            >
              {link.label}
            </Link>
          ))}
          <span className="mx-2 h-5 w-px bg-rule" aria-hidden="true" />
          <CommandMenu />
          <ThemeToggle />
        </nav>

        <div className="flex items-center md:hidden">
          <ThemeToggle />
          <button
            type="button"
            onClick={() => setOpen((value) => !value)}
            aria-expanded={open}
            aria-controls="mobile-nav"
            className="ml-1 inline-flex h-10 items-center rounded-lg px-3 text-[0.9375rem] font-semibold"
          >
            {open ? "Close" : "Menu"}
          </button>
        </div>
      </div>

      {open && (
        <nav id="mobile-nav" aria-label="Main" className="border-t border-rule px-4 pb-6 pt-2 md:hidden">
          <ul>
            {links.map((link) => (
              <li key={link.href} className="border-b border-rule">
                <Link href={link.href} onClick={() => setOpen(false)} className="t-title block py-4">
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      )}
    </header>
  );
}
