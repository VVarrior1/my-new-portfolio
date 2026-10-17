"use client";

import { useAudio } from "@/contexts/audio-context";

/** Background music, off by default. It lives in the footer (and ⌘K), out of the way of the work. */
export function SoundToggle({ className = "" }: { className?: string }) {
  const { isPlaying, togglePlay } = useAudio();

  return (
    <button
      type="button"
      onClick={togglePlay}
      aria-pressed={isPlaying}
      className={`inline-flex items-center gap-1.5 transition-colors hover:text-ink ${isPlaying ? "text-ink" : ""} ${className}`}
    >
      <svg viewBox="0 0 20 20" width="13" height="13" aria-hidden="true" fill="currentColor">
        <path d="M14.5 3.2v8.55a2.75 2.75 0 1 1-1.5-2.45V6.1L8 7.3v6.45a2.75 2.75 0 1 1-1.5-2.45V5.5a.75.75 0 0 1 .57-.73l6.5-1.6a.75.75 0 0 1 .93.73Z" />
      </svg>
      {isPlaying ? "Pause music" : "Play music"}
    </button>
  );
}
