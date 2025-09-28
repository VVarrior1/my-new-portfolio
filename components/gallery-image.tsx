"use client";

import { useState } from "react";
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
};

export function GalleryImage({ src, alt, width, height, className, onError, priority = false, sizes }: GalleryImageProps) {
  const [hasError, setHasError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const handleError = () => {
    setHasError(true);
    setIsLoading(false);
    onError?.();
  };

  const handleLoad = () => {
    setIsLoading(false);
  };

  if (hasError) {
    return null; // Hide the entire image component if there's an error
  }

  return (
    <div className="relative w-full">
      {isLoading && (
        <div className="absolute inset-0 animate-pulse bg-white/10 rounded" />
      )}
      <Image
        src={src}
        alt={alt}
        width={width}
        height={height}
        className={className}
        onError={handleError}
        onLoad={handleLoad}
        priority={priority}
        sizes={sizes || "(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"}
        placeholder="blur"
        blurDataURL="data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCdABmX/9k="
        unoptimized // Allow external URLs
      />
    </div>
  );
}