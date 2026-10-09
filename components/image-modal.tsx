"use client";

import { useEffect, useRef, useState } from "react";

type ImageModalProps = {
  isOpen: boolean;
  src: string;
  alt: string;
  title?: string;
  description?: string;
  onClose: () => void;
};

export function ImageModal({ isOpen, src, alt, title, description, onClose }: ImageModalProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    setIsLoaded(false);
    const previousFocus = document.activeElement as HTMLElement | null;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
      if (event.key === "Tab") {
        // Only one focusable control: keep focus on it.
        event.preventDefault();
        closeRef.current?.focus();
      }
    };
    document.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = "";
      document.removeEventListener("keydown", onKeyDown);
      previousFocus?.focus();
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title || alt}
      className="fixed inset-0 z-[60] flex flex-col bg-[#0b0d10]/95 text-[#eceee8]"
      onClick={onClose}
    >
      <div className="flex items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <p className="truncate font-semibold">{title}</p>
        <button
          ref={closeRef}
          type="button"
          onClick={onClose}
          className="rounded-md border border-white/25 px-3 py-1.5 text-sm font-medium hover:border-white"
        >
          Close
        </button>
      </div>

      <div className="relative flex min-h-0 flex-1 items-center justify-center px-4 pb-4 sm:px-6">
        {!isLoaded && <p className="absolute text-sm text-white/60">Loading photo</p>}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt={alt}
          onLoad={() => setIsLoaded(true)}
          onClick={(event) => event.stopPropagation()}
          className={`max-h-full max-w-full rounded-md object-contain transition-opacity duration-300 ${isLoaded ? "opacity-100" : "opacity-0"}`}
        />
      </div>

      {description && (
        <p className="mx-auto max-w-2xl px-4 pb-6 text-center text-sm leading-relaxed text-white/75" onClick={(event) => event.stopPropagation()}>
          {description}
        </p>
      )}
    </div>
  );
}
