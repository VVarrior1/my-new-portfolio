"use client";

import Image from "next/image";
import { LockIcon, Maximize2Icon } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import type { Shot } from "@/lib/content";

/** A browser window around a screenshot, for the enlarged view. */
function BrowserFrame({ shot, children }: { shot: Shot; children: React.ReactNode }) {
  return (
    <div className="shot-frame">
      <div className="flex h-8 items-center gap-1.5 border-b border-rule px-3 font-mono text-[0.8125rem] text-graphite">
        <LockIcon className="size-3 shrink-0" aria-hidden="true" />
        <span className="truncate">{shot.url}</span>
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
function ShotImage({ shot, sizes, className = "" }: { shot: Shot; sizes: string; className?: string }) {
  const image = (src: string, theme: string) => (
    <Image key={src} src={src} width={shot.width} height={shot.height} alt={shot.alt} sizes={sizes} className={`h-auto w-full ${theme} ${className}`} />
  );
  if (!shot.darkSrc) return image(shot.src, "block");
  return (
    <>
      {image(shot.src, "block dark:hidden")}
      {image(shot.darkSrc, "hidden dark:block")}
    </>
  );
}

/**
 * A product screenshot floating on the liquid, with the phone view (if there is one) beside it and
 * a numbered caption. On laptops each image is drawn into the liquid itself (data-gl, see
 * components/liquid-field.tsx): it condenses out of the ink, bows with scroll speed and ripples
 * under the pointer; the <img> stays in place for layout, phones, and without WebGL. Select either
 * to see both full size.
 */
export function ProjectShot({ name, shot, phone, figure, caption }: { name: string; shot: Shot; phone?: Shot; figure: number; caption: string }) {
  const browser = (
    <div className="min-w-0">
      <p className="shot-url t-mono" aria-hidden="true">
        <LockIcon className="size-3 shrink-0" />
        <span className="truncate">{shot.url}</span>
      </p>
      <DialogTrigger asChild>
        <button type="button" className="shot-button group" aria-label={`Enlarge screenshots of ${name}`} data-cursor="Enlarge">
          <span className="block" data-gl="shot">
            <ShotImage shot={shot} className="shot-img" sizes={phone ? "(min-width: 1024px) 720px, 70vw" : "(min-width: 1024px) 900px, 100vw"} />
          </span>
          <span aria-hidden="true" className="kbd shot-kbd">
            <Maximize2Icon className="size-3" />
            enlarge
          </span>
        </button>
      </DialogTrigger>
    </div>
  );

  return (
    <Dialog>
      <figure>
        {phone ? (
          <div className="grid grid-cols-[minmax(0,1fr)_24%] items-end gap-3 sm:gap-6">
            {browser}
            <DialogTrigger asChild>
              <button type="button" className="shot-button" aria-label={`Enlarge the phone view of ${name}`} data-cursor="Enlarge">
                <span className="block" data-gl="shot">
                  <Image
                    src={phone.src}
                    width={phone.width}
                    height={phone.height}
                    alt={phone.alt}
                    sizes="(min-width: 1024px) 220px, 24vw"
                    className="shot-img shot-phone block aspect-[9/16] h-auto w-full object-cover object-top"
                  />
                </span>
              </button>
            </DialogTrigger>
          </div>
        ) : (
          browser
        )}
        <figcaption className="mt-4 flex gap-3 text-[0.9375rem] leading-snug text-ink-2 sm:mt-5" data-calm="0.9">
          <span className="t-mono shrink-0 pt-px text-graphite">Fig.&nbsp;{figure}</span>
          <span>{caption}</span>
        </figcaption>
      </figure>

      <DialogContent className="max-h-[92vh] w-[min(96vw,1280px)] max-w-none overflow-y-auto rounded-[1.5rem] bg-paper p-4 sm:max-w-none sm:p-6">
        <DialogTitle className="t-wide pr-10 text-[1.25rem] font-semibold">{name}</DialogTitle>
        <DialogDescription className="text-[0.9375rem] text-ink-2">{shot.alt}</DialogDescription>
        <div className={phone ? "grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_260px]" : ""}>
          <BrowserFrame shot={shot}>
            <ShotImage shot={shot} sizes="96vw" />
          </BrowserFrame>
          {phone && (
            <div className="mx-auto w-full max-w-[260px]">
              <div className="overflow-hidden rounded-[1.25rem] border-[5px] border-screen bg-screen">
                <Image src={phone.src} width={phone.width} height={phone.height} alt={phone.alt} sizes="260px" className="block h-auto w-full rounded-[0.875rem]" />
              </div>
              <p className="mt-3 text-[0.9375rem] leading-snug text-ink-2">{phone.alt}</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
