"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { profile } from "@/lib/content";
import { CommandMenu } from "./command-menu";
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
  const home = pathname === "/";
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  // On the home page the h1 already says the name, so the wordmark waits until it scrolls away.
  const [nameVisible, setNameVisible] = useState(!home);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (!home) {
      setNameVisible(true);
      return;
    }
    const heading = document.getElementById("hero-name");
    if (!heading) {
      setNameVisible(true);
      return;
    }
    const io = new IntersectionObserver(([entry]) => setNameVisible(!entry.isIntersecting), { rootMargin: "-64px 0px 0px 0px" });
    io.observe(heading);
    return () => io.disconnect();
  }, [home]);

  useEffect(() => setOpen(false), [pathname]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const isCurrent = (href: string) => !href.includes("#") && pathname.startsWith(href);
  const solid = scrolled || open;

  return (
    <header
      className={`sticky top-0 z-50 border-b transition-[background-color,border-color] duration-200 ${
        solid ? "border-rule bg-[var(--header-bg)] backdrop-blur-[16px]" : "border-transparent bg-transparent"
      }`}
    >
      <div className="wrap flex h-16 items-center justify-between gap-4">
        <Link href="/" aria-label={`${profile.name}, home`} className="-ml-1 flex items-center rounded-md p-1">
          <span
            aria-hidden="true"
            className="t-mono grid size-7 place-items-center rounded-[8px] border border-rule-strong bg-surface-2 text-[0.75rem] font-medium tracking-[0.02em] text-ink"
          >
            AM
          </span>
          <span
            aria-hidden="true"
            // While the h1 shows the name, the wordmark takes no space, so the link (and its focus ring) is just the chip.
            className={`text-[0.875rem] font-medium tracking-[-0.005em] transition-[opacity,transform] duration-300 ${
              nameVisible ? "ml-3 translate-y-0 opacity-100" : "invisible w-0 translate-y-1 overflow-hidden opacity-0"
            }`}
          >
            {profile.name}
          </span>
        </Link>

        <nav aria-label="Main" className="hidden items-center gap-0.5 md:flex">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              aria-current={isCurrent(link.href) ? "page" : undefined}
              className="rounded-md px-3 py-2 text-[0.875rem] font-medium text-graphite transition-colors hover:text-ink aria-[current=page]:text-ink"
            >
              {link.label}
            </Link>
          ))}
          <span className="mx-2 h-4 w-px bg-rule-strong" aria-hidden="true" />
          <CommandMenu />
          <SoundToggle />
          <ThemeToggle />
        </nav>

        <div className="flex items-center gap-0.5 md:hidden">
          <SoundToggle />
          <ThemeToggle />
          <button
            type="button"
            onClick={() => setOpen((value) => !value)}
            aria-expanded={open}
            aria-controls="mobile-nav"
            className="ml-1 inline-flex h-10 items-center rounded-md px-3 text-[0.875rem] font-medium"
          >
            {open ? "Close" : "Menu"}
          </button>
        </div>
      </div>

      {open && (
        <nav id="mobile-nav" aria-label="Main" className="wrap pb-6 md:hidden">
          <ul className="border-t border-rule">
            {links.map((link) => (
              <li key={link.href} className="border-b border-rule">
                <Link
                  href={link.href}
                  onClick={() => setOpen(false)}
                  aria-current={isCurrent(link.href) ? "page" : undefined}
                  className="flex items-center justify-between py-4 text-[1.25rem] font-medium tracking-[-0.01em]"
                >
                  {link.label}
                  <span aria-hidden="true" className="t-mono text-graphite">
                    →
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
