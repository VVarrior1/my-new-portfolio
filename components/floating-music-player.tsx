"use client";

import { useMemo } from "react";
import { useAudio } from "@/contexts/audio-context";

export function FloatingMusicPlayer() {
  const { isPlaying, volume, togglePlay, setVolume } = useAudio();
  const displayVolume = useMemo(() => Math.round(volume * 100), [volume]);

  const handleVolumeChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = parseFloat(event.target.value);
    setVolume(newVolume);
  };

  return (
    <div className="fixed bottom-6 right-6 z-40">
      <div className="flex items-center gap-2.5 rounded-full border border-emerald-500/15 bg-slate-950/80 px-4 py-2.5 shadow-lg backdrop-blur">
        <button
          type="button"
          onClick={togglePlay}
          aria-pressed={isPlaying}
          aria-label={isPlaying ? "Pause background music" : "Play background music"}
          className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-500/90 text-slate-950 shadow transition hover:bg-emerald-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300/70 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950/80"
        >
          {isPlaying ? (
            <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
              <path d="M8 6.75a.75.75 0 00-1.5 0v6.5a.75.75 0 001.5 0v-6.5zM13.5 6.75a.75.75 0 00-1.5 0v6.5a.75.75 0 001.5 0v-6.5z" />
            </svg>
          ) : (
            <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
              <path d="M7 5.41a.75.75 0 011.14-.63l5.5 3.59a.75.75 0 010 1.26l-5.5 3.59A.75.75 0 017 12.59v-7.18z" />
            </svg>
          )}
        </button>

        <div className="flex items-center gap-2">
          <span
            aria-hidden
            className={`h-2 w-2 rounded-full transition ${
              isPlaying ? "bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.55)]" : "bg-emerald-500/30"
            }`}
          />
          <label className="sr-only" htmlFor="player-volume">
            Background music volume
          </label>
          <input
            id="player-volume"
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={volume}
            onChange={handleVolumeChange}
            className="h-1.5 w-24 appearance-none rounded-full bg-emerald-500/15"
            style={{
              background: `linear-gradient(to right, rgba(52, 211, 153, 0.75) 0%, rgba(52, 211, 153, 0.75) ${displayVolume}%, rgba(15, 118, 110, 0.2) ${displayVolume}%, rgba(15, 118, 110, 0.2) 100%)`
            }}
          />
        </div>
      </div>

      <style jsx>{`
        input[type="range"]::-webkit-slider-thumb {
          appearance: none;
          width: 14px;
          height: 14px;
          background: rgba(52, 211, 153, 0.95);
          border-radius: 9999px;
          border: 2px solid rgba(16, 185, 129, 0.4);
          box-shadow: 0 2px 6px rgba(13, 148, 136, 0.35);
          cursor: pointer;
          transition: transform 120ms ease;
        }

        input[type="range"]::-webkit-slider-thumb:hover {
          transform: scale(1.05);
        }

        input[type="range"]::-moz-range-thumb {
          width: 14px;
          height: 14px;
          background: rgba(52, 211, 153, 0.95);
          border-radius: 9999px;
          border: 2px solid rgba(16, 185, 129, 0.4);
          box-shadow: 0 2px 6px rgba(13, 148, 136, 0.35);
          cursor: pointer;
        }
      `}</style>
    </div>
  );
}
