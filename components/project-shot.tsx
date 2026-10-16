"use client";

import Image from "next/image";
import { LockIcon, Maximize2Icon } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import type { Shot } from "@/lib/content";

/** A browser window around a screenshot. `children` replaces the image, e.g. with a button wrapping it. */
function BrowserFrame({ shot, children }: { shot: Shot; children: React.ReactNode }) {
  return (
    <div className="overflow-hidden rounded-lg border border-rule bg-paper-raised shadow-[0_28px_60px_-34px_rgb(10_14_20/0.45)]">
      <div className="flex h-8 items-center gap-1.5 border-b border-rule px-3 text-[0.78rem] text-graphite">
        <LockIcon className="size-3" aria-hidden="true" />
        <span className="truncate">{shot.url}</span>
      </div>
      {children}
    </div>
  );
}

function ShotImage({ shot, sizes }: { shot: Shot; sizes: string }) {
  return <Image src={shot.src} width={shot.width} height={shot.height} alt={shot.alt} sizes={sizes} className="block h-auto w-full" />;
}

function PhoneFrame({ shot, className = "" }: { shot: Shot; className?: string }) {
  return (
    <div className={`overflow-hidden rounded-[1.35rem] border-[5px] border-[#16191d] bg-[#16191d] shadow-[0_24px_50px_-20px_rgb(10_14_20/0.55)] ${className}`}>
      <Image
        src={shot.src}
        width={shot.width}
        height={shot.height}
        alt={shot.alt}
        sizes="(min-width: 1024px) 160px, 28vw"
        className="block aspect-[9/16] h-auto w-full rounded-[0.95rem] object-cover object-top"
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
              <ShotImage shot={shot} sizes="(min-width: 1024px) 660px, 100vw" />
              <span
                aria-hidden="true"
                className="pointer-events-none absolute right-3 top-3 inline-flex items-center gap-1.5 rounded-md bg-ink/80 px-2 py-1 text-[0.78rem] font-medium text-paper opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100"
              >
                <Maximize2Icon className="size-3" />
                Enlarge
              </span>
            </button>
          </DialogTrigger>
        </BrowserFrame>
        {phone && <PhoneFrame shot={phone} className="absolute bottom-0 left-0 w-[24%] max-w-[160px]" />}
      </div>

      <DialogContent className="max-h-[92vh] w-[min(96vw,1280px)] max-w-none overflow-y-auto bg-paper p-4 sm:max-w-none sm:p-6">
        <DialogTitle className="pr-10 text-lg font-bold">{name}</DialogTitle>
        <DialogDescription className="text-[0.95rem] text-graphite">{shot.alt}</DialogDescription>
        <div className={phone ? "grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_260px]" : ""}>
          <BrowserFrame shot={shot}>
            <ShotImage shot={shot} sizes="96vw" />
          </BrowserFrame>
          {phone && (
            <div className="mx-auto w-full max-w-[260px]">
              <PhoneFrame shot={phone} />
              <p className="mt-3 text-[0.9rem] leading-snug text-graphite">{phone.alt}</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
