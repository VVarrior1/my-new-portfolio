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

export function SiteHeader() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  // On the home page the name is already the h1, so the wordmark's text waits until the h1 scrolls
  // away. The AM keycap is always there, so the header never looks half-loaded.
  const [nameInView, setNameInView] = useState(pathname === "/");

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const name = pathname === "/" ? document.getElementById("hero-name") : null;
    if (!name) {
      setNameInView(false);
      return;
    }
    const io = new IntersectionObserver(([entry]) => setNameInView(entry.isIntersecting), { rootMargin: "-64px 0px 0px 0px" });
    io.observe(name);
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
  const hideMark = nameInView && !open;

  return (
    <header
      className={`sticky top-0 z-50 border-b transition-[background-color,border-color] duration-200 ${
        scrolled || open ? "border-rule bg-paper/85 backdrop-blur-md" : "border-transparent bg-paper"
      }`}
    >
      <div className="mx-auto flex h-16 max-w-[76rem] items-center justify-between gap-4 px-4 sm:px-8">
        <Link href="/" className="group flex items-center gap-2.5" aria-label="A. Mohamed, home">
          <span
            aria-hidden="true"
            className="inline-flex size-7 items-center justify-center rounded-lg border border-rule-strong bg-key-face font-mono text-[0.75rem] font-medium tracking-[-0.02em] text-ink shadow-[var(--key-shadow)] transition-transform group-active:translate-y-px"
          >
            AM
          </span>
          <span
            aria-hidden="true"
            className={`t-wide text-[0.9375rem] font-[650] tracking-[-0.01em] transition-[opacity,transform] duration-200 motion-reduce:transition-none ${
              hideMark ? "-translate-x-1 opacity-0" : "translate-x-0 opacity-100"
            }`}
          >
            A. Mohamed
          </span>
        </Link>

        <nav aria-label="Main" className="hidden items-center gap-1 md:flex">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              aria-current={isCurrent(link.href) ? "page" : undefined}
              className="rounded-lg px-3 py-2 text-[0.9375rem] font-[550] text-ink-2 transition-colors hover:text-ink aria-[current=page]:text-ink aria-[current=page]:underline aria-[current=page]:decoration-ink aria-[current=page]:decoration-2 aria-[current=page]:underline-offset-[0.4em]"
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
            className="key key-sm ml-1.5 h-9 font-sans text-[0.9375rem] font-[550]"
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
                <Link href={link.href} onClick={() => setOpen(false)} className="flex items-baseline justify-between py-4">
                  <span className="t-wide text-2xl font-semibold tracking-[-0.015em]">{link.label}</span>
                  <span className="t-mono text-graphite" aria-hidden="true">
                    {link.href.startsWith("/#") ? "↓" : "→"}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      )}
    </header>
  );
}
