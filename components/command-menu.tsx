"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { trackEvent } from "./site-analytics";

const CommandPalette = dynamic(() => import("./command-palette"), { ssr: false });

/** Header button and ⌘K / Ctrl+K shortcut. The palette code loads the first time it opens. */
export function CommandMenu() {
  const [open, setOpen] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [mac, setMac] = useState(true);

  const show = (next: boolean) => {
    if (next) {
      setLoaded(true);
      trackEvent("command-menu");
    }
    setOpen(next);
  };

  useEffect(() => {
    setMac(/Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent));
    const onKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setLoaded(true);
        setOpen((value) => {
          if (!value) trackEvent("command-menu");
          return !value;
        });
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <>
      <button
        type="button"
        onClick={() => show(true)}
        onPointerEnter={() => setLoaded(true)}
        className="group hidden h-9 items-center gap-2 rounded-lg px-2.5 text-[0.9375rem] font-[550] text-ink-2 transition-colors hover:text-ink lg:inline-flex"
        aria-label="Open the command menu"
        aria-keyshortcuts="Meta+K Control+K"
      >
        Jump to
        <kbd className="kbd transition-transform group-active:translate-y-px">{mac ? "⌘K" : "Ctrl K"}</kbd>
      </button>
      {loaded && <CommandPalette open={open} onOpenChange={show} />}
    </>
  );
}
