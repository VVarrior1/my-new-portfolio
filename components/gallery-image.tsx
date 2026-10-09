"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";

type GalleryImageProps = {
  src: string;
  alt: string;
  width: number;
  height: number;
  className?: string;
  onError?: () => void;
  priority?: boolean;
  sizes?: string;
  onClick?: () => void;
  title?: string;
  description?: string;
};

export function GalleryImage({ src, alt, width, height, className, onError, priority = false, sizes, onClick, title, description }: GalleryImageProps) {
  const [hasError, setHasError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [retryCount, setRetryCount] = useState(0);
  const [currentSrc, setCurrentSrc] = useState(src);

  const handleError = () => {
    if (retryCount < 2) {
      // Retry with cache busting
      setRetryCount(prev => prev + 1);
      setCurrentSrc(`${src}${src.includes('?') ? '&' : '?'}_retry=${retryCount + 1}&_t=${Date.now()}`);
      return;
    }

    setHasError(true);
    setIsLoading(false);
    onError?.();
  };

  const handleLoad = () => {
    setIsLoading(false);
    setRetryCount(0); // Reset retry count on successful load
  };

  // Reset state when src changes
  useEffect(() => {
    setHasError(false);
    setIsLoading(true);
    setRetryCount(0);
    setCurrentSrc(src);
  }, [src]);

  if (hasError) {
    return (
      <div className="relative flex aspect-[4/3] w-full items-center justify-center rounded-md bg-paper-raised">
        <div className="text-center text-sm text-graphite">
          <div className="w-8 h-8 mx-auto mb-2 opacity-50">
            <svg fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" />
            </svg>
          </div>
          <div>Image unavailable</div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`relative w-full ${onClick ? "cursor-pointer" : ""}`}
      onClick={onClick}
      aria-label={description || title || alt}
    >
      {isLoading && (
        <div className="absolute inset-0 animate-pulse rounded-md bg-paper-raised" />
      )}
      <Image
        src={currentSrc}
        alt={alt}
        title={title}
        width={width}
        height={height}
        className={className}
        onError={handleError}
        onLoad={handleLoad}
        priority={priority}
        sizes={sizes || "(max-width: 640px) 50vw, (max-width: 1024px) 50vw, 33vw"}
        placeholder="blur"
        blurDataURL="data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCdABmX/9k="
        unoptimized // Allow external URLs
        loading={priority ? "eager" : "lazy"}
        style={{
          maxWidth: "100%",
          height: "auto",
          objectFit: "cover"
        }}
      />
      {description && (
        <span className="sr-only">{description}</span>
      )}
    </div>
  );
}
