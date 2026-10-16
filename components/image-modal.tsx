"use client";

import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";

type ImageModalProps = {
  isOpen: boolean;
  src: string;
  alt: string;
  title?: string;
  description?: string;
  onClose: () => void;
};

export function ImageModal({ isOpen, src, alt, title, description, onClose }: ImageModalProps) {
  const [loaded, setLoaded] = useState(false);

  useEffect(() => setLoaded(false), [src]);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[94vh] w-auto max-w-[min(94vw,1200px)] gap-3 bg-paper p-3 sm:max-w-[min(94vw,1200px)] sm:p-4">
        <DialogTitle className="pr-10 text-[1rem] font-medium">{title || alt}</DialogTitle>
        <DialogDescription className={description ? "text-[0.875rem] text-graphite" : "sr-only"}>
          {description || `Full-size view of ${title || alt}`}
        </DialogDescription>
        <div className="relative flex min-h-40 items-center justify-center">
          {!loaded && <p className="t-mono absolute text-graphite">Loading</p>}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={src}
            alt={alt}
            onLoad={() => setLoaded(true)}
            className={`max-h-[78vh] w-auto max-w-full rounded-[10px] object-contain transition-opacity duration-300 ${loaded ? "opacity-100" : "opacity-0"}`}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
