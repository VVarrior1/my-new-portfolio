"use client";

import { useAudio } from "@/contexts/audio-context";

/** Background music, as a quiet text button in the footer (it is also in the ⌘K menu). */
export function SoundToggle({ className = "" }: { className?: string }) {
  const { isPlaying, togglePlay } = useAudio();

  return (
    <button type="button" onClick={togglePlay} aria-pressed={isPlaying} className={`transition-colors hover:text-ink ${className}`}>
      {isPlaying ? "Pause music" : "Play music"}
    </button>
  );
}
