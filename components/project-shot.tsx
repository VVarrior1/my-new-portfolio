"use client";

import Image from "next/image";
import { LockIcon, Maximize2Icon } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import type { Shot } from "@/lib/content";

/** A browser window around a screenshot. `children` replaces the image, e.g. with a button wrapping it. */
function BrowserFrame({ shot, children }: { shot: Shot; children: React.ReactNode }) {
  return (
    <div className="browser-frame">
      <div className="flex h-8 items-center gap-1.5 border-b border-rule bg-paper-raised px-3 font-mono text-[0.75rem] text-graphite">
        <LockIcon className="size-3" aria-hidden="true" />
        <span className="truncate">{shot.url}</span>
      </div>
      {children}
    </div>
  );
}

function ShotImage({ shot, sizes }: { shot: Shot; sizes: string }) {
  return (
    <Image src={shot.src} width={shot.width} height={shot.height} alt={shot.alt} sizes={sizes} className="shot block h-auto w-full" />
  );
}

function PhoneFrame({ shot, className = "" }: { shot: Shot; className?: string }) {
  return (
    <div
      className={`overflow-hidden rounded-[1.25rem] border-[5px] border-(--bezel) bg-(--bezel) shadow-(--shadow-1) ring-1 ring-(--frame-border,var(--rule)) ${className}`}
    >
      <Image
        src={shot.src}
        width={shot.width}
        height={shot.height}
        alt={shot.alt}
        sizes="(min-width: 1024px) 160px, 28vw"
        className="shot block aspect-[9/16] h-auto w-full rounded-[0.875rem] object-cover object-top"
      />
    </div>
  );
}

/** A product screenshot in a browser frame (plus an optional phone). Select it to see it full size. */
export function ProjectShot({ name, shot, phone }: { name: string; shot: Shot; phone?: Shot }) {
  return (
    <Dialog>
      <div className={`relative ${phone ? "pb-8 pl-6 sm:pl-10" : ""}`}>
        <BrowserFrame shot={shot}>
          <DialogTrigger asChild>
            <button type="button" className="group relative block w-full cursor-zoom-in text-left" aria-label={`Enlarge screenshots of ${name}`}>
              <ShotImage shot={shot} sizes="(min-width: 1024px) 720px, 100vw" />
              <span
                aria-hidden="true"
                className="pointer-events-none absolute right-3 top-3 inline-flex items-center gap-1.5 rounded-lg bg-ink/85 px-2 py-1 font-mono text-[0.75rem] text-paper opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100"
              >
                <Maximize2Icon className="size-3" />
                Enlarge
              </span>
            </button>
          </DialogTrigger>
        </BrowserFrame>
        {phone && <PhoneFrame shot={phone} className="absolute bottom-0 left-0 w-[24%] max-w-[160px]" />}
      </div>

      <DialogContent className="max-h-[92vh] w-[min(96vw,1280px)] max-w-none overflow-y-auto rounded-[1rem] bg-paper p-4 sm:max-w-none sm:p-6">
        <DialogTitle className="t-item pr-10">{name}</DialogTitle>
        <DialogDescription className="t-small text-graphite">{shot.alt}</DialogDescription>
        <div className={phone ? "grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_260px]" : ""}>
          <BrowserFrame shot={shot}>
            <ShotImage shot={shot} sizes="96vw" />
          </BrowserFrame>
          {phone && (
            <div className="mx-auto w-full max-w-[260px]">
              <PhoneFrame shot={phone} />
              <p className="t-small mt-3 text-graphite">{phone.alt}</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
