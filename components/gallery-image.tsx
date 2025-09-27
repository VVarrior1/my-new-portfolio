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
};

export function GalleryImage({ src, alt, width, height, className, onError }: GalleryImageProps) {
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
        unoptimized // Allow external URLs
      />
    </div>
  );
}