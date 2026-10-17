"use client";

import Image from "next/image";
import { LockIcon, Maximize2Icon } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import type { Shot } from "@/lib/content";

/** A browser window around a screenshot. `children` replaces the image, e.g. with a button wrapping it. */
function BrowserFrame({ shot, children }: { shot: Shot; children: React.ReactNode }) {
  return (
    <div className="shot-frame">
      <div className="relative flex h-8 items-center gap-1.5 border-b border-rule px-3 font-mono text-[0.8125rem] text-graphite">
        <LockIcon className="size-3 shrink-0" aria-hidden="true" />
        <span className="truncate">{shot.url}</span>
        {/* Runs when the spine's packet reaches the frame (components/choreography.tsx). */}
        <span className="shot-load" aria-hidden="true" />
      </div>
      {children}
    </div>
  );
}

/**
 * The screenshot, plus its dark copy when there is one. Both are the same size, so switching
 * themes never moves anything, and the hidden copy is never downloaded (a lazy image with
 * display: none doesn't load).
 */
function ShotImage({ shot, sizes }: { shot: Shot; sizes: string }) {
  const image = (src: string, theme: string) => (
    <Image key={src} src={src} width={shot.width} height={shot.height} alt={shot.alt} sizes={sizes} className={`h-auto w-full ${theme}`} />
  );
  if (!shot.darkSrc) return image(shot.src, "block");
  return (
    <>
      {image(shot.src, "block dark:hidden")}
      {image(shot.darkSrc, "hidden dark:block")}
    </>
  );
}

function PhoneFrame({ shot, sizes }: { shot: Shot; sizes: string }) {
  return (
    <div className="overflow-hidden rounded-xl border-[3px] border-screen bg-screen shadow-[var(--elevation)] sm:rounded-[1.25rem] sm:border-[5px]">
      <Image
        src={shot.src}
        width={shot.width}
        height={shot.height}
        alt={shot.alt}
        sizes={sizes}
        className="block aspect-[9/16] h-auto w-full rounded-lg object-cover object-top sm:rounded-[0.875rem]"
      />
    </div>
  );
}

/**
 * A product screenshot in a browser frame, with the phone view (if there is one) standing beside
 * it, and a numbered caption that says what they show. Select either to see both full size.
 */
export function ProjectShot({ name, shot, phone, figure, caption }: { name: string; shot: Shot; phone?: Shot; figure: number; caption: string }) {
  const browser = (
    <BrowserFrame shot={shot}>
      <DialogTrigger asChild>
        <button type="button" className="group relative block w-full cursor-zoom-in text-left" aria-label={`Enlarge screenshots of ${name}`}>
          <ShotImage shot={shot} sizes={phone ? "(min-width: 1024px) 440px, 66vw" : "(min-width: 1024px) 620px, 100vw"} />
          <span
            aria-hidden="true"
            className="kbd pointer-events-none absolute right-2 top-2 h-7 gap-1.5 px-2 opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100 sm:right-3 sm:top-3"
          >
            <Maximize2Icon className="size-3" />
            enlarge
          </span>
        </button>
      </DialogTrigger>
    </BrowserFrame>
  );

  return (
    <Dialog>
      <figure>
        {phone ? (
          <div className="grid grid-cols-[minmax(0,1fr)_26%] items-end gap-3 sm:grid-cols-[minmax(0,1fr)_9.5rem] sm:gap-5">
            {browser}
            <DialogTrigger asChild>
              <button type="button" className="block w-full cursor-zoom-in" aria-label={`Enlarge the phone view of ${name}`}>
                <PhoneFrame shot={phone} sizes="(min-width: 640px) 152px, 26vw" />
              </button>
            </DialogTrigger>
          </div>
        ) : (
          browser
        )}
        <figcaption className="mt-4 flex gap-3 text-[0.9375rem] leading-snug text-ink-2 sm:mt-5">
          <span className="t-mono shrink-0 pt-px text-graphite">Fig.&nbsp;{figure}</span>
          <span>{caption}</span>
        </figcaption>
      </figure>

      <DialogContent className="max-h-[92vh] w-[min(96vw,1280px)] max-w-none overflow-y-auto rounded-[1.25rem] bg-paper p-4 sm:max-w-none sm:p-6">
        <DialogTitle className="t-wide pr-10 text-[1.25rem] font-semibold">{name}</DialogTitle>
        <DialogDescription className="text-[0.9375rem] text-ink-2">{shot.alt}</DialogDescription>
        <div className={phone ? "grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_260px]" : ""}>
          <BrowserFrame shot={shot}>
            <ShotImage shot={shot} sizes="96vw" />
          </BrowserFrame>
          {phone && (
            <div className="mx-auto w-full max-w-[260px]">
              <PhoneFrame shot={phone} sizes="260px" />
              <p className="mt-3 text-[0.9375rem] leading-snug text-ink-2">{phone.alt}</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
