"use client";

import { useEffect, useState } from "react";
import Image from "next/image";

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

  useEffect(() => {
    if (isOpen) {
      setIsLoaded(false);
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }

    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener("keydown", handleKeyDown);
    }

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm"
      onClick={onClose}
    >
      <div className="relative max-h-[90vh] max-w-[90vw] w-full">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute -top-12 right-0 z-10 rounded-full bg-white/10 p-2 text-white hover:bg-white/20 transition-colors"
          aria-label="Close modal"
        >
          <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Image container */}
        <div
          className="relative bg-white/5 rounded-lg overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {!isLoaded && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-emerald-300/30 border-t-emerald-300" />
            </div>
          )}

          <Image
            src={src}
            alt={alt}
            width={1200}
            height={800}
            className="max-h-[80vh] w-auto object-contain"
            onLoad={() => setIsLoaded(true)}
            unoptimized
            priority
          />

          {/* Image info overlay */}
          {(title || description) && (
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-6">
              <div className="text-white">
                {title && (
                  <h3 className="text-xl font-semibold mb-2">{title}</h3>
                )}
                {description && (
                  <p className="text-white/90 text-sm leading-relaxed">{description}</p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Instructions */}
        <div className="absolute -bottom-12 left-1/2 transform -translate-x-1/2 text-center text-white/60 text-sm">
          Press ESC or click outside to close
        </div>
      </div>
    </div>
  );
}