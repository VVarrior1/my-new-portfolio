"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { SoundToggle } from "./sound-toggle";
import { ThemeToggle } from "./theme-toggle";

const links = [
  { href: "/#work", label: "Work" },
  { href: "/#experience", label: "Experience" },
  { href: "/blogs", label: "Writing" },
  { href: "/gallery", label: "Gallery" },
  { href: "/#contact", label: "Contact" },
];

export function SiteHeader() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => setOpen(false), [pathname]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const isCurrent = (href: string) => !href.includes("#") && pathname.startsWith(href);

  return (
    <header
      className={`sticky top-0 z-50 bg-paper/90 backdrop-blur-md transition-[border-color] ${
        scrolled || open ? "border-b border-rule" : "border-b border-transparent"
      }`}
    >
      <div className="mx-auto flex h-16 max-w-[76rem] items-center justify-between gap-4 px-4 sm:px-8">
        <Link href="/" className="font-bold tracking-tight">
          <span className="sm:hidden">A. Mohamed</span>
          <span className="hidden sm:inline">Abdelrahman Mohamed</span>
        </Link>

        <nav aria-label="Main" className="hidden items-center gap-1 md:flex">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              aria-current={isCurrent(link.href) ? "page" : undefined}
              className="rounded-md px-3 py-2 text-[0.95rem] text-graphite transition-colors hover:text-ink aria-[current=page]:text-ink aria-[current=page]:underline aria-[current=page]:decoration-trace aria-[current=page]:decoration-2 aria-[current=page]:underline-offset-[0.4em]"
            >
              {link.label}
            </Link>
          ))}
          <span className="mx-2 h-5 w-px bg-rule" aria-hidden="true" />
          <SoundToggle />
          <ThemeToggle />
        </nav>

        <div className="flex items-center md:hidden">
          <SoundToggle />
          <ThemeToggle />
          <button
            type="button"
            onClick={() => setOpen((value) => !value)}
            aria-expanded={open}
            aria-controls="mobile-nav"
            className="ml-1 inline-flex h-10 items-center rounded-md px-3 font-medium"
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
                <Link href={link.href} onClick={() => setOpen(false)} className="block py-4 text-2xl font-bold tracking-tight">
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
