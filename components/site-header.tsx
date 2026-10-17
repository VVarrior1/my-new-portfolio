"use client";

import { usePathname } from "next/navigation";
import { AnimatePresence, m } from "motion/react";
import { SearchIcon } from "lucide-react";
import { useCallback, useEffect, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from "react";
import { profile } from "@/lib/content";
import { MusicButton, MusicPanel } from "./music-player";
import { trackEvent } from "./site-analytics";
import { SPRING } from "./springs";
import { ThemeToggle } from "./theme-toggle";
import { TransitionLink } from "./transition-link";

type CommandPanelType = typeof import("./command-palette").default;
// The command menu (cmdk) is its own chunk, fetched on idle or on first use. Holding the loaded
// component in state (instead of next/dynamic) means the island never morphs into an empty box.
let panelPromise: Promise<CommandPanelType> | null = null;
const loadPanel = () => (panelPromise ??= import("./command-palette").then((module) => module.default));

const links = [
  { href: "/#work", label: "Work" },
  { href: "/#experience", label: "Experience" },
  { href: "/blogs", label: "Writing" },
  { href: "/gallery", label: "Gallery" },
  { href: "/#contact", label: "Contact" },
];

type Mode = "bar" | "menu" | "music" | "command";

const LABELS: Record<Exclude<Mode, "bar">, string> = {
  menu: "Site menu",
  music: "Music player",
  command: "Command menu",
};

const FOCUSABLE = 'a[href], button:not([disabled]), input, [tabindex]:not([tabindex="-1"]), [role="slider"]';

/** Content swaps inside the island: the old view blurs out while the new one blurs in. */
const swap = {
  initial: { opacity: 0, scale: 0.94, filter: "blur(6px)" },
  animate: { opacity: 1, scale: 1, filter: "blur(0px)" },
  exit: { opacity: 0, scale: 0.94, filter: "blur(6px)" },
};

/**
 * The island: one floating pill that holds the navigation and morphs (a shared layout, not a
 * popover) into the music player, the ⌘K command menu, and on phones the menu. While open it is
 * a modal dialog: focus moves in, Tab stays inside, Escape or a click outside closes it, and focus
 * returns to the button that opened it.
 */
export function SiteHeader() {
  const pathname = usePathname();
  const [mode, setMode] = useState<Mode>("bar");
  const [CommandPanel, setCommandPanel] = useState<CommandPanelType | null>(null);
  // ⌘K before the menu's code has arrived keeps the bar until it has, then morphs.
  const view: Mode = mode === "command" && !CommandPanel ? "bar" : mode;
  const requestPanel = useCallback(() => {
    loadPanel().then((panel) => setCommandPanel(() => panel));
  }, []);
  const [mac, setMac] = useState(true);
  const [hovered, setHovered] = useState<string | null>(null);
  // On the home page the name is the h1, so the island adds it only once the h1 has scrolled away.
  const [nameInView, setNameInView] = useState(pathname === "/");
  const island = useRef<HTMLDivElement>(null);
  const returnTo = useRef<string | null>(null);

  const open = useCallback((next: Exclude<Mode, "bar">) => {
    returnTo.current = next === "menu" ? "menu" : next === "music" ? "music" : "command";
    if (next === "command") {
      requestPanel();
      trackEvent("command-menu");
    }
    setMode(next);
  }, [requestPanel]);

  const close = useCallback(() => setMode("bar"), []);

  useEffect(() => {
    const name = pathname === "/" ? document.getElementById("hero-name") : null;
    if (!name) {
      setNameInView(false);
      return;
    }
    const io = new IntersectionObserver(([entry]) => setNameInView(entry.isIntersecting), { rootMargin: "-72px 0px 0px 0px" });
    io.observe(name);
    return () => io.disconnect();
  }, [pathname]);

  useEffect(() => setMode("bar"), [pathname]);

  // Fetch the command menu's code once the page is idle, so ⌘K opens straight into it.
  useEffect(() => {
    const load = () => requestPanel();
    if (typeof window.requestIdleCallback === "function") {
      const id = window.requestIdleCallback(load, { timeout: 4000 });
      return () => window.cancelIdleCallback(id);
    }
    const id = window.setTimeout(load, 2500);
    return () => window.clearTimeout(id);
  }, [requestPanel]);

  // ⌘K / Ctrl+K toggles the command menu from anywhere.
  useEffect(() => {
    setMac(/Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent));
    const onKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        requestPanel();
        setMode((current) => {
          if (current === "command") return "bar";
          trackEvent("command-menu");
          returnTo.current = "command";
          return "command";
        });
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [requestPanel]);

  // Focus in when it opens, back to the trigger when it closes.
  const wasOpen = useRef(false);
  useEffect(() => {
    if (view !== "bar") {
      wasOpen.current = true;
      const frame = requestAnimationFrame(() => {
        // The bar is still fading out inside the island, so look only inside the view that's opening.
        const root = island.current?.querySelector<HTMLElement>(`[data-view="${view}"]`);
        if (!root || root.contains(document.activeElement)) return;
        const target = root.querySelector<HTMLElement>("[data-autofocus], input") ?? root.querySelector<HTMLElement>(FOCUSABLE);
        target?.focus({ preventScroll: true });
      });
      const onKey = (event: KeyboardEvent) => event.key === "Escape" && setMode("bar");
      window.addEventListener("keydown", onKey);
      return () => {
        cancelAnimationFrame(frame);
        window.removeEventListener("keydown", onKey);
      };
    }
    if (wasOpen.current) {
      wasOpen.current = false;
      const frame = requestAnimationFrame(() => {
        const key = returnTo.current;
        const bar = island.current?.querySelector<HTMLElement>('[data-view="bar"]');
        const trigger = key ? bar?.querySelector<HTMLElement>(`[data-island-trigger="${key}"]`) : null;
        const visible = trigger && trigger.offsetParent !== null ? trigger : bar?.querySelector<HTMLElement>("a, button");
        visible?.focus({ preventScroll: true });
      });
      return () => cancelAnimationFrame(frame);
    }
  }, [view]);

  // A dialog keeps Tab inside itself.
  const trap = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (view === "bar" || event.key !== "Tab" || !island.current) return;
    const items = Array.from(island.current.querySelectorAll<HTMLElement>(FOCUSABLE)).filter((el) => el.offsetParent !== null);
    if (items.length === 0) return;
    const first = items[0];
    const last = items[items.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  };

  const isCurrent = (href: string) => !href.includes("#") && pathname.startsWith(href);
  const showName = !nameInView;
  const expanded = view !== "bar";

  return (
    <>
      {/* The island floats; this keeps the page from sliding under it. */}
      <div aria-hidden="true" className="h-[4.5rem] sm:h-[5.5rem]" />

      <AnimatePresence>
        {expanded && (
          <m.div
            key="scrim"
            aria-hidden="true"
            className="fixed inset-0 z-40 bg-[var(--scrim)]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            onClick={close}
          />
        )}
      </AnimatePresence>

      <header className="vt-island pointer-events-none fixed inset-x-0 top-3 z-50 flex justify-center px-3 sm:top-4">
        <div className="a-island" style={{ ["--d" as string]: "80ms" }}>
          <m.div
            ref={island}
            layout
            transition={SPRING.morph}
            role={expanded ? "dialog" : undefined}
            aria-modal={expanded ? true : undefined}
            aria-label={view !== "bar" ? LABELS[view] : undefined}
            onKeyDown={trap}
            style={{ borderRadius: 28 }}
            className={`island pointer-events-auto relative overflow-hidden border border-rule shadow-[var(--float)] backdrop-blur-2xl backdrop-saturate-150 transition-[background-color] duration-300 ${
              expanded ? "bg-paper-raised/[0.97]" : "bg-paper-raised/85"
            }`}
          >
            <AnimatePresence mode="popLayout" initial={false}>
              {view === "bar" && (
                <m.div key="bar" data-view="bar" layout="position" {...swap} transition={SPRING.morph} className="flex h-[3.25rem] items-center gap-1 pl-1.5 pr-1.5">
                  <TransitionLink href="/" aria-label="Abdelrahman Mohamed, home" className="group flex h-10 items-center gap-2 rounded-full pr-1">
                    <span
                      aria-hidden="true"
                      className="inline-flex size-10 items-center justify-center rounded-full bg-ink font-mono text-[0.75rem] font-medium tracking-[-0.02em] text-paper transition-transform duration-500 [transition-timing-function:var(--spring-bouncy)] group-hover:rotate-[-8deg] group-active:scale-90"
                    >
                      AM
                    </span>
                    <AnimatePresence initial={false}>
                      {showName && (
                        <m.span
                          key="name"
                          aria-hidden="true"
                          layout="position"
                          initial={{ opacity: 0, x: -8, filter: "blur(4px)" }}
                          animate={{ opacity: 1, x: 0, filter: "blur(0px)" }}
                          exit={{ opacity: 0, x: -8, filter: "blur(4px)" }}
                          transition={SPRING.morph}
                          className="t-wide hidden whitespace-nowrap pr-2 text-[1rem] font-[680] tracking-[-0.02em] sm:inline"
                        >
                          {profile.name}
                        </m.span>
                      )}
                    </AnimatePresence>
                  </TransitionLink>

                  <m.nav layout="position" aria-label="Main" className="hidden items-center md:flex" onPointerLeave={() => setHovered(null)}>
                    <span className="mx-1.5 h-5 w-px bg-rule" aria-hidden="true" />
                    {links.map((link) => (
                      <TransitionLink
                        key={link.href}
                        href={link.href}
                        aria-current={isCurrent(link.href) ? "page" : undefined}
                        onPointerEnter={() => setHovered(link.href)}
                        onFocus={() => setHovered(link.href)}
                        onBlur={() => setHovered(null)}
                        className="relative rounded-full px-3.5 py-2 text-[0.9375rem] font-[550] text-ink-2 transition-colors hover:text-ink aria-[current=page]:text-ink"
                      >
                        {hovered === link.href && (
                          <m.span layoutId="island-hover" transition={SPRING.morph} className="absolute inset-0 -z-10 rounded-full bg-well" aria-hidden="true" />
                        )}
                        {link.label}
                        {isCurrent(link.href) && <span aria-hidden="true" className="absolute bottom-1 left-1/2 size-1 -translate-x-1/2 rounded-full bg-ink" />}
                      </TransitionLink>
                    ))}
                    <span className="mx-1.5 h-5 w-px bg-rule" aria-hidden="true" />
                  </m.nav>

                  <m.div layout="position" className="flex items-center gap-0.5">
                    <button
                      type="button"
                      data-island-trigger="command"
                      onClick={() => open("command")}
                      onPointerEnter={() => requestPanel()}
                      aria-label="Open the command menu"
                      aria-haspopup="dialog"
                      aria-keyshortcuts="Meta+K Control+K"
                      className="island-btn w-auto gap-2 px-2.5 text-ink-2 hover:text-ink"
                    >
                      <SearchIcon className="size-4" aria-hidden="true" />
                      <kbd className="kbd hidden lg:inline-flex">{mac ? "⌘K" : "Ctrl K"}</kbd>
                    </button>
                    <MusicButton onOpen={() => open("music")} />
                    <ThemeToggle />
                    <button
                      type="button"
                      data-island-trigger="menu"
                      onClick={() => open("menu")}
                      aria-haspopup="dialog"
                      className="key ml-1 min-h-10 px-4 text-[0.9375rem] md:hidden"
                    >
                      Menu
                    </button>
                  </m.div>
                </m.div>
              )}

              {view === "menu" && (
                <m.div key="menu" data-view="menu" layout="position" {...swap} transition={SPRING.morph} className="w-[calc(100vw-1.5rem)] max-w-md p-2">
                  <div className="flex items-center justify-between py-1 pl-3 pr-1">
                    <span className="t-mono text-graphite">Menu</span>
                    <button type="button" onClick={close} className="key key-sm min-h-10 px-4 font-sans text-[0.9375rem]">
                      Close
                    </button>
                  </div>
                  <nav aria-label="Main">
                    <ul className="mt-1">
                      {links.map((link, i) => (
                        <m.li
                          key={link.href}
                          initial={{ opacity: 0, y: 14 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ ...SPRING.bouncy, delay: 0.04 * i }}
                        >
                          <TransitionLink
                            href={link.href}
                            onClick={close}
                            aria-current={isCurrent(link.href) ? "page" : undefined}
                            className="flex items-center justify-between rounded-2xl px-3 py-3 transition-[background-color,transform] duration-300 [transition-timing-function:var(--spring-bouncy)] active:scale-[0.98] active:bg-well"
                          >
                            <span className="t-wide text-[2rem] font-[680] leading-none tracking-[-0.03em]">{link.label}</span>
                            <span className="t-mono text-graphite" aria-hidden="true">
                              {link.href.startsWith("/#") ? "↓" : "→"}
                            </span>
                          </TransitionLink>
                        </m.li>
                      ))}
                    </ul>
                  </nav>
                </m.div>
              )}

              {view === "music" && (
                <m.div key="music" data-view="music" layout="position" {...swap} transition={SPRING.morph}>
                  <MusicPanel />
                </m.div>
              )}

              {view === "command" && CommandPanel && (
                <m.div key="command" data-view="command" layout="position" {...swap} transition={SPRING.morph}>
                  <CommandPanel onClose={close} />
                </m.div>
              )}
            </AnimatePresence>
          </m.div>
        </div>
      </header>
    </>
  );
}
