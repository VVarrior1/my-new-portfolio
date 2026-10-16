"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { Kbd } from "@/components/ui/kbd";
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
        className="mr-1 hidden h-8 items-center gap-2.5 rounded-lg border border-rule-strong pl-3 pr-1.5 text-[0.8125rem] font-medium text-graphite transition-colors hover:border-[color-mix(in_srgb,var(--ink)_40%,transparent)] hover:text-ink lg:inline-flex"
        aria-label="Open the command menu"
        aria-keyshortcuts="Meta+K Control+K"
      >
        Jump to
        <Kbd>{mac ? "⌘" : "Ctrl"} K</Kbd>
      </button>
      {loaded && <CommandPalette open={open} onOpenChange={show} />}
    </>
  );
}
