"use client";

import { useEffect, useMemo, useState } from "react";

type TypewriterProps = {
  lines: string[];
  typingSpeed?: number;
  pause?: number;
};

export function Typewriter({
  lines,
  typingSpeed = 70,
  pause = 1600,
}: TypewriterProps) {
  const sanitizedLines = useMemo(() => lines.filter(Boolean), [lines]);
  const [currentLineIndex, setCurrentLineIndex] = useState(0);
  const [displayed, setDisplayed] = useState("" );
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (sanitizedLines.length === 0) return;

    const currentLine = sanitizedLines[currentLineIndex % sanitizedLines.length];
    const targetLength = isDeleting ? displayed.length - 1 : displayed.length + 1;
    const nextText = currentLine.slice(0, Math.max(0, targetLength));
    const atLineEnd = !isDeleting && nextText === currentLine;
    const atLineStart = isDeleting && nextText === "";

    const timeout = setTimeout(() => {
      setDisplayed(nextText);

      if (atLineEnd) {
        setTimeout(() => setIsDeleting(true), pause);
      } else if (atLineStart) {
        setIsDeleting(false);
        setCurrentLineIndex((index) => (index + 1) % sanitizedLines.length);
      }
    }, isDeleting ? typingSpeed / 2 : typingSpeed);

    return () => clearTimeout(timeout);
  }, [
    sanitizedLines,
    currentLineIndex,
    displayed,
    isDeleting,
    typingSpeed,
    pause,
  ]);

  // Find the longest line to reserve space and prevent layout shifts
  const longestLine = useMemo(
    () => sanitizedLines.reduce((a, b) => (a.length > b.length ? a : b), ""),
    [sanitizedLines]
  );

  if (sanitizedLines.length === 0) {
    return null;
  }

  return (
    <span className="relative inline-block font-mono text-emerald-200/90">
      {/* Hidden placeholder to reserve space for the longest line */}
      <span className="invisible" aria-hidden>
        {longestLine}
        <span className="ml-1 inline-block h-5 w-[2px]" />
      </span>
      {/* Actual typewriter text overlaid on top */}
      <span className="absolute inset-0 inline-flex items-center">
        {displayed}
        <span className="ml-1 h-5 w-[2px] animate-pulse bg-emerald-400" aria-hidden />
      </span>
    </span>
  );
}
