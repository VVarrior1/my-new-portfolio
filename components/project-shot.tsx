"use client";

import Image from "next/image";
import { LockIcon, Maximize2Icon } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import type { Shot } from "@/lib/content";

/** A browser window around a screenshot: radius 10, a 1px edge and a mono address bar. */
function BrowserFrame({ shot, children }: { shot: Shot; children: React.ReactNode }) {
  return (
    <div className="overflow-hidden rounded-[10px] border border-rule-strong bg-surface-2">
      <div className="t-mono flex h-7 items-center gap-2 border-b border-rule px-3 text-[0.6875rem] text-graphite sm:h-8 sm:text-[0.75rem]">
        <span aria-hidden="true" className="hidden gap-1.5 pr-1.5 sm:flex">
          <span className="size-2 rounded-full bg-rule-strong" />
          <span className="size-2 rounded-full bg-rule-strong" />
          <span className="size-2 rounded-full bg-rule-strong" />
        </span>
        <LockIcon className="size-3 shrink-0" aria-hidden="true" />
        <span className="truncate">{shot.url}</span>
      </div>
      {children}
    </div>
  );
}

/**
 * The screenshot, plus its dark copy when there is one: each theme shows only its own, and the
 * hidden one is never downloaded (lazy images with display: none don't load). `crop` frames the
 * architecture canvas on phones, where the whole lesson would be an unreadable thumbnail.
 */
function ShotImage({ shot, sizes, crop = false }: { shot: Shot; sizes: string; crop?: boolean }) {
  const cropClass = crop ? "max-sm:aspect-[4/3] max-sm:object-cover max-sm:object-[62%_40%]" : "";
  const image = (src: string, theme: string) => (
    <Image
      key={src}
      src={src}
      width={shot.width}
      height={shot.height}
      alt={shot.alt}
      sizes={sizes}
      className={`h-auto w-full ${cropClass} ${theme}`}
    />
  );
  if (!shot.darkSrc) return image(shot.src, "block");
  return (
    <>
      {image(shot.src, "block dark:hidden")}
      {image(shot.darkSrc, "hidden dark:block")}
    </>
  );
}

function PhoneFrame({ shot, className = "" }: { shot: Shot; className?: string }) {
  return (
    <div className={`overflow-hidden rounded-[22px] border-[5px] border-[var(--bezel)] bg-[var(--bezel)] ${className}`}>
      <Image
        src={shot.src}
        width={shot.width}
        height={shot.height}
        alt={shot.alt}
        sizes="(min-width: 1024px) 240px, 30vw"
        className="block aspect-[9/16] h-auto w-full rounded-[17px] object-cover object-top"
      />
    </div>
  );
}

/** A product screenshot in a browser window (plus an optional phone beside it). Select it to see it full size. */
export function ProjectShot({ name, shot, phone }: { name: string; shot: Shot; phone?: Shot }) {
  const trigger = (
    <BrowserFrame shot={shot}>
      <DialogTrigger asChild>
        <button type="button" className="group relative block w-full cursor-zoom-in text-left" aria-label={`Enlarge screenshots of ${name}`}>
          <ShotImage shot={shot} crop={!phone} sizes={phone ? "(min-width: 1024px) 620px, 72vw" : "(min-width: 1024px) 1104px, 100vw"} />
          <span
            aria-hidden="true"
            className="t-mono pointer-events-none absolute right-3 top-3 inline-flex items-center gap-1.5 rounded-md bg-ink px-2 py-1 text-[0.75rem] text-paper opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100"
          >
            <Maximize2Icon className="size-3" />
            Enlarge
          </span>
        </button>
      </DialogTrigger>
    </BrowserFrame>
  );

  return (
    <Dialog>
      {phone ? (
        <div className="mx-auto grid max-w-[56rem] grid-cols-[minmax(0,1fr)_26%] items-end gap-4 sm:gap-8 lg:grid-cols-[minmax(0,1fr)_15rem] lg:gap-10">
          {trigger}
          <PhoneFrame shot={phone} />
        </div>
      ) : (
        trigger
      )}

      <DialogContent className="max-h-[92vh] w-[min(96vw,1280px)] max-w-none overflow-y-auto bg-paper p-4 sm:max-w-none sm:p-6">
        <DialogTitle className="pr-10 text-[1rem] font-medium">{name}</DialogTitle>
        <DialogDescription className="text-[0.875rem] text-graphite">{shot.alt}</DialogDescription>
        <div className={phone ? "grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_260px]" : ""}>
          <BrowserFrame shot={shot}>
            <ShotImage shot={shot} sizes="96vw" />
          </BrowserFrame>
          {phone && (
            <div className="mx-auto w-full max-w-[260px]">
              <PhoneFrame shot={phone} />
              <p className="mt-3 text-[0.875rem] leading-snug text-graphite">{phone.alt}</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
