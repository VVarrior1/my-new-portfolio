"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import type { heroIndex } from "@/lib/content";

type Item = (typeof heroIndex)[number];

/** How far the preview may rise above the column, and how far below the page top it must stay (the
 * header is 64px tall), in px. */
const RISE = 64;
const HEADER_CLEAR = 80;

/**
 * The hero's right column: an index of the three strongest projects, one quiet row each (name, a
 * line with its number, an arrow), linking to its entry in Work. The active row is where the hero's
 * river leaves from (components/liquid-field.tsx reads `[data-hero-index] [data-active]`): the
 * first row at rest, the row you point at or focus otherwise. On laptops with a fine pointer the
 * pointed row's screenshot shows as a preview above the list; it repeats the Work section's image,
 * so it is decoration (aria-hidden) and nothing is only reachable through it. Touch screens and
 * phones get the plain list.
 */
export function HeroIndex({ items }: { items: Item[] }) {
  const ref = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);
  const [shown, setShown] = useState(-1);

  // The preview may rise above the column into the hero's top padding, but never under the header:
  // how far depends on where the hero's content lands, so it is measured (from layout, since the
  // column is still rising into place on load).
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const fit = () => {
      let top = 0;
      for (let e: HTMLElement | null = el; e; e = e.offsetParent as HTMLElement | null) top += e.offsetTop;
      el.style.setProperty("--rise", `${Math.round(Math.max(0, Math.min(RISE, top - HEADER_CLEAR)))}px`);
    };
    fit();
    window.addEventListener("resize", fit);
    return () => window.removeEventListener("resize", fit);
  }, []);

  const point = (i: number) => {
    setActive(i);
    setShown(i);
  };
  const leave = () => {
    setActive(0);
    setShown(-1);
  };

  return (
    <div ref={ref} className="hero-index" data-hero-index="">
      <div className="hero-preview" aria-hidden="true">
        {items.map((item, i) =>
          item.shot ? (
            <div key={item.id} className="hero-preview-shot" data-on={shown === i ? "" : undefined}>
              <Image
                src={item.shot.src}
                width={item.shot.width}
                height={item.shot.height}
                alt=""
                sizes="420px"
                className={item.shot.darkSrc ? "dark:hidden" : ""}
              />
              {item.shot.darkSrc && <Image src={item.shot.darkSrc} width={item.shot.width} height={item.shot.height} alt="" sizes="420px" className="hidden dark:block" />}
            </div>
          ) : null,
        )}
      </div>

      <nav aria-labelledby="hero-index-title" data-calm="0.96" onPointerLeave={leave} onBlur={(e) => !e.currentTarget.contains(e.relatedTarget as Node | null) && leave()}>
        <h2 id="hero-index-title" className="t-mono text-graphite">
          Selected work
        </h2>
        <ol className="hero-index-list">
          {items.map((item, i) => (
            <li key={item.id}>
              <a
                href={item.href}
                className="hero-index-row"
                data-active={active === i ? "" : undefined}
                data-track={`hero:${item.id}`}
                onPointerEnter={(e) => e.pointerType === "mouse" && point(i)}
                onFocus={() => point(i)}
              >
                <span className="hero-index-num t-mono" aria-hidden="true">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span className="min-w-0">
                  <span className="hero-index-name">{item.name}</span>
                  <span className="hero-index-line">{item.line}</span>
                </span>
                <span className="hero-index-arrow" aria-hidden="true">
                  →
                </span>
              </a>
            </li>
          ))}
        </ol>
      </nav>
    </div>
  );
}
