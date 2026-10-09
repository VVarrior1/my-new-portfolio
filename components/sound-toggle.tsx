"use client";

import { useAudio } from "@/contexts/audio-context";

export function SoundToggle() {
  const { isPlaying, togglePlay } = useAudio();
  const label = isPlaying ? "Pause background music" : "Play background music";

  return (
    <button
      type="button"
      onClick={togglePlay}
      aria-pressed={isPlaying}
      aria-label={label}
      title={label}
      className={`inline-flex h-10 w-10 items-center justify-center rounded-md transition-colors hover:text-ink ${
        isPlaying ? "text-trace" : "text-graphite"
      }`}
    >
      <svg viewBox="0 0 20 20" width="18" height="18" aria-hidden="true" fill="currentColor">
        {isPlaying ? (
          <>
            <rect x="3" y="8" width="2" height="4" rx="1">
              <animate attributeName="height" values="4;10;4" dur="0.9s" repeatCount="indefinite" />
              <animate attributeName="y" values="8;5;8" dur="0.9s" repeatCount="indefinite" />
            </rect>
            <rect x="7.5" y="5" width="2" height="10" rx="1">
              <animate attributeName="height" values="10;4;10" dur="1.1s" repeatCount="indefinite" />
              <animate attributeName="y" values="5;8;5" dur="1.1s" repeatCount="indefinite" />
            </rect>
            <rect x="12" y="7" width="2" height="6" rx="1">
              <animate attributeName="height" values="6;11;6" dur="0.8s" repeatCount="indefinite" />
              <animate attributeName="y" values="7;4.5;7" dur="0.8s" repeatCount="indefinite" />
            </rect>
            <rect x="16" y="8" width="2" height="4" rx="1" />
          </>
        ) : (
          <path d="M14.5 3.2v8.55a2.75 2.75 0 1 1-1.5-2.45V6.1L8 7.3v6.45a2.75 2.75 0 1 1-1.5-2.45V5.5a.75.75 0 0 1 .57-.73l6.5-1.6a.75.75 0 0 1 .93.73Z" />
        )}
      </svg>
    </button>
  );
}
