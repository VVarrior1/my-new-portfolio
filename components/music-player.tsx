"use client";

import { PauseIcon, PlayIcon, SkipBackIcon, SkipForwardIcon, Volume1Icon, Volume2Icon, VolumeXIcon } from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { useAudio } from "@/contexts/audio-context";
import { PLAYLIST_CREDIT, PLAYLIST_NAME, PLAYLIST_SOURCE, formatTime } from "@/lib/playlist";
import { trackEvent } from "./site-analytics";

/** Three bars that move while music plays and sit still (and short) when paused. */
export function Bars({ playing, className = "" }: { playing: boolean; className?: string }) {
  return (
    <span aria-hidden="true" className={`inline-flex h-3.5 items-end gap-[2px] ${className}`}>
      {[0, 1, 2].map((bar) => (
        <span
          key={bar}
          className={`eq-bar w-[3px] rounded-full bg-current ${playing ? "eq-bar-on" : ""}`}
          style={{ animationDelay: `${bar * -0.35}s` }}
        />
      ))}
    </span>
  );
}

/** The island's music button: the bars, which move while something plays. */
export function MusicButton({ onOpen }: { onOpen: () => void }) {
  const { isPlaying, track } = useAudio();
  const label = isPlaying ? `Music: playing ${track?.title}` : "Music";
  return (
    <button
      type="button"
      data-island-trigger="music"
      aria-label={label}
      aria-haspopup="dialog"
      title={label}
      onClick={() => {
        trackEvent("music:open");
        onOpen();
      }}
      className={`island-btn ${isPlaying ? "text-ink" : "text-graphite"}`}
    >
      <Bars playing={isPlaying} />
    </button>
  );
}

/** What the island morphs into: the player. */
export function MusicPanel() {
  const { tracks, index, track, isPlaying, volume, position, duration, togglePlay, next, previous, playTrack, seek, setVolume } =
    useAudio();
  const VolumeIcon = volume === 0 ? VolumeXIcon : volume < 0.5 ? Volume1Icon : Volume2Icon;

  const play = async () => {
    if (!isPlaying) trackEvent("music:play");
    await togglePlay();
  };

  return (
    <div className="w-[min(23rem,calc(100vw-1.5rem))]">
      <div className="p-5 pb-4">
        <p className="t-mono text-graphite">
          {PLAYLIST_NAME} · {index + 1} of {tracks.length}
        </p>
        <div className="mt-2 flex items-center gap-4">
          <div className="min-w-0 flex-1">
            <p className="t-wide truncate text-[1.375rem] font-[650] leading-tight tracking-[-0.02em] text-ink" aria-live="polite">
              {track?.title}
            </p>
            <p className="text-[0.9375rem] text-graphite">{track?.artist}</p>
          </div>
          <Bars playing={isPlaying} className="h-6 shrink-0 text-ink [&>span]:w-1" />
        </div>

        <Slider
          className="mt-5"
          min={0}
          max={Math.max(1, Math.round(duration))}
          step={1}
          value={[Math.min(position, Math.round(duration))]}
          onValueChange={([value]) => seek(value)}
          thumbLabel="Position in track"
        />
        <div className="t-mono mt-1.5 flex justify-between text-[0.75rem] text-graphite">
          <span>{formatTime(position)}</span>
          <span>{formatTime(duration)}</span>
        </div>

        <div className="mt-3 flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <button type="button" onClick={previous} aria-label="Previous track" className="island-btn text-ink">
              <SkipBackIcon className="size-4" />
            </button>
            <button
              type="button"
              onClick={play}
              aria-label={isPlaying ? "Pause" : "Play"}
              data-autofocus
              className="key key-signal key-icon size-12 min-h-12 p-0"
            >
              {isPlaying ? <PauseIcon className="size-[18px] fill-current" /> : <PlayIcon className="ml-0.5 size-[18px] fill-current" />}
            </button>
            <button type="button" onClick={next} aria-label="Next track" className="island-btn text-ink">
              <SkipForwardIcon className="size-4" />
            </button>
          </div>
          <div className="flex w-32 items-center gap-2 text-graphite">
            <button
              type="button"
              onClick={() => setVolume(volume === 0 ? 0.35 : 0)}
              aria-label={volume === 0 ? "Unmute" : "Mute"}
              className="island-btn size-8 shrink-0"
            >
              <VolumeIcon className="size-4" />
            </button>
            <Slider min={0} max={100} step={1} value={[Math.round(volume * 100)]} onValueChange={([value]) => setVolume(value / 100)} thumbLabel="Volume" />
          </div>
        </div>
      </div>

      <ol className="max-h-[min(15rem,40vh)] overflow-y-auto border-t border-rule px-2 py-2" aria-label={`${PLAYLIST_NAME} tracks`}>
        {tracks.map((item, i) => {
          const current = i === index;
          return (
            <li key={item.src}>
              <button
                type="button"
                onClick={() => {
                  trackEvent("music:pick");
                  playTrack(i);
                }}
                aria-current={current ? "true" : undefined}
                className={`flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-[0.9375rem] transition-colors hover:bg-well ${current ? "bg-well text-ink" : "text-ink-2"}`}
              >
                <span className="t-mono w-5 shrink-0 text-[0.75rem] text-graphite">
                  {current && isPlaying ? <Bars playing className="h-3" /> : String(i + 1).padStart(2, "0")}
                </span>
                <span className={`flex-1 truncate ${current ? "font-semibold" : ""}`}>{item.title}</span>
                <span className="t-mono text-[0.75rem] text-graphite">{formatTime(item.duration)}</span>
              </button>
            </li>
          );
        })}
      </ol>

      <p className="border-t border-rule px-5 py-3 text-[0.8125rem] text-graphite">
        <a href={PLAYLIST_SOURCE} target="_blank" rel="noreferrer" className="underline decoration-graphite/40 underline-offset-2 hover:text-ink">
          {PLAYLIST_CREDIT}
          <span className="sr-only"> (opens in a new tab)</span>
        </a>
      </p>
    </div>
  );
}
