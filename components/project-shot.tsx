"use client";

import Image from "next/image";
import { LockIcon, Maximize2Icon } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import type { Shot } from "@/lib/content";

/** A browser window around a screenshot. `children` replaces the image, e.g. with a button wrapping it. */
function BrowserFrame({ shot, children }: { shot: Shot; children: React.ReactNode }) {
  return (
    <div className="shot-frame">
      <div className="flex h-8 items-center gap-1.5 border-b border-rule px-3 font-mono text-[0.8125rem] text-graphite">
        <LockIcon className="size-3" aria-hidden="true" />
        <span className="truncate">{shot.url}</span>
      </div>
      {children}
    </div>
  );
}

function ShotImage({ shot, sizes }: { shot: Shot; sizes: string }) {
  return (
    <Image
      src={shot.src}
      width={shot.width}
      height={shot.height}
      alt={shot.alt}
      sizes={sizes}
      data-tone={shot.tone}
      className="shot-img block h-auto w-full"
    />
  );
}

function PhoneFrame({ shot, className = "" }: { shot: Shot; className?: string }) {
  return (
    <div className={`overflow-hidden rounded-[1.25rem] border-[5px] border-screen bg-screen shadow-[var(--elevation)] ${className}`}>
      <Image
        src={shot.src}
        width={shot.width}
        height={shot.height}
        alt={shot.alt}
        sizes="(min-width: 1024px) 160px, 28vw"
        className="block aspect-[9/16] h-auto w-full rounded-[0.875rem] object-cover object-top"
      />
    </div>
  );
}

/**
 * A product screenshot in a browser frame. Select it to see it full size, with the phone view
 * (if there is one) beside it. `maxHeight` crops a tall capture from the top on wide screens.
 */
export function ProjectShot({ name, shot, phone, maxHeight }: { name: string; shot: Shot; phone?: Shot; maxHeight?: number }) {
  return (
    <Dialog>
      <BrowserFrame shot={shot}>
        <DialogTrigger asChild>
          <button
            type="button"
            className="group relative block w-full cursor-zoom-in overflow-hidden text-left"
            style={maxHeight ? { maxHeight } : undefined}
            aria-label={`Enlarge screenshots of ${name}`}
          >
            <ShotImage shot={shot} sizes="(min-width: 1024px) 620px, 100vw" />
            <span
              aria-hidden="true"
              className="kbd pointer-events-none absolute right-3 top-3 h-7 gap-1.5 px-2 opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100"
            >
              <Maximize2Icon className="size-3" />
              {phone ? "enlarge · phone view" : "enlarge"}
            </span>
          </button>
        </DialogTrigger>
      </BrowserFrame>

      <DialogContent className="max-h-[92vh] w-[min(96vw,1280px)] max-w-none overflow-y-auto rounded-[1.25rem] bg-paper p-4 sm:max-w-none sm:p-6">
        <DialogTitle className="t-wide pr-10 text-[1.25rem] font-semibold">{name}</DialogTitle>
        <DialogDescription className="text-[0.9375rem] text-ink-2">{shot.alt}</DialogDescription>
        <div className={phone ? "grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_260px]" : ""}>
          <BrowserFrame shot={shot}>
            <ShotImage shot={shot} sizes="96vw" />
          </BrowserFrame>
          {phone && (
            <div className="mx-auto w-full max-w-[260px]">
              <PhoneFrame shot={phone} />
              <p className="mt-3 text-[0.9375rem] leading-snug text-ink-2">{phone.alt}</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
