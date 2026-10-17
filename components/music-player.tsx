"use client";

import { PauseIcon, PlayIcon, SkipBackIcon, SkipForwardIcon, Volume1Icon, Volume2Icon, VolumeXIcon } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Slider } from "@/components/ui/slider";
import { useAudio } from "@/contexts/audio-context";
import { PLAYLIST_CREDIT, PLAYLIST_NAME, PLAYLIST_SOURCE, formatTime } from "@/lib/playlist";
import { trackEvent } from "./site-analytics";

/** Three bars that move while music plays and sit still (and short) when paused. */
function Bars({ playing, className = "" }: { playing: boolean; className?: string }) {
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

export function MusicPlayer() {
  const { tracks, index, track, isPlaying, volume, position, duration, togglePlay, next, previous, playTrack, seek, setVolume } =
    useAudio();
  const VolumeIcon = volume === 0 ? VolumeXIcon : volume < 0.5 ? Volume1Icon : Volume2Icon;
  const label = isPlaying ? `Music: playing ${track?.title}` : "Music";

  const play = async () => {
    if (!isPlaying) trackEvent("music:play");
    await togglePlay();
  };

  return (
    <Popover onOpenChange={(open) => open && trackEvent("music:open")}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={label}
          title={label}
          className={`inline-flex size-9 items-center justify-center rounded-md transition-colors hover:bg-ink/5 hover:text-ink ${
            isPlaying ? "text-ink" : "text-graphite"
          }`}
        >
          <Bars playing={isPlaying} />
        </button>
      </PopoverTrigger>

      <PopoverContent align="end" sideOffset={8} aria-label={`Music player: ${PLAYLIST_NAME}`} className="w-[min(22rem,calc(100vw-2rem))] gap-0 rounded-xl border border-rule bg-paper-raised p-0 shadow-[0_24px_60px_-28px_rgb(0_0_0/0.45)] ring-0">
        <div className="p-4">
          <p className="font-mono text-[0.72rem] uppercase tracking-[0.08em] text-graphite">
            {PLAYLIST_NAME} · {index + 1} of {tracks.length}
          </p>
          <p className="mt-1.5 truncate text-[1.05rem] font-semibold text-ink" aria-live="polite">
            {track?.title}
          </p>
          <p className="text-[0.85rem] text-graphite">{track?.artist}</p>

          <Slider
            className="mt-4"
            min={0}
            max={Math.max(1, Math.round(duration))}
            step={1}
            value={[Math.min(position, Math.round(duration))]}
            onValueChange={([value]) => seek(value)}
            thumbLabel="Position in track"
          />
          <div className="mt-1.5 flex justify-between font-mono text-[0.72rem] tabular-nums text-graphite">
            <span>{formatTime(position)}</span>
            <span>{formatTime(duration)}</span>
          </div>

          <div className="mt-3 flex items-center justify-between">
            <div className="flex items-center gap-1">
              <button type="button" onClick={previous} aria-label="Previous track" className="inline-flex size-9 items-center justify-center rounded-md text-ink hover:bg-ink/5">
                <SkipBackIcon className="size-4" />
              </button>
              <button
                type="button"
                onClick={play}
                aria-label={isPlaying ? "Pause" : "Play"}
                className="inline-flex size-11 items-center justify-center rounded-full bg-ink text-paper transition-transform active:scale-95"
              >
                {isPlaying ? <PauseIcon className="size-[18px] fill-current" /> : <PlayIcon className="ml-0.5 size-[18px] fill-current" />}
              </button>
              <button type="button" onClick={next} aria-label="Next track" className="inline-flex size-9 items-center justify-center rounded-md text-ink hover:bg-ink/5">
                <SkipForwardIcon className="size-4" />
              </button>
            </div>
            <div className="flex w-32 items-center gap-2 text-graphite">
              <button
                type="button"
                onClick={() => setVolume(volume === 0 ? 0.35 : 0)}
                aria-label={volume === 0 ? "Unmute" : "Mute"}
                className="inline-flex size-7 shrink-0 items-center justify-center rounded-md hover:bg-ink/5 hover:text-ink"
              >
                <VolumeIcon className="size-4" />
              </button>
              <Slider min={0} max={100} step={1} value={[Math.round(volume * 100)]} onValueChange={([value]) => setVolume(value / 100)} thumbLabel="Volume" />
            </div>
          </div>
        </div>

        <ol className="max-h-64 overflow-y-auto border-t border-rule py-1.5" aria-label={`${PLAYLIST_NAME} tracks`}>
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
                  className={`flex w-full items-center gap-3 px-4 py-2 text-left text-[0.92rem] transition-colors hover:bg-ink/5 ${current ? "text-ink" : "text-ink-2"}`}
                >
                  <span className="w-5 shrink-0 font-mono text-[0.72rem] tabular-nums text-graphite">
                    {current && isPlaying ? <Bars playing className="h-3" /> : String(i + 1).padStart(2, "0")}
                  </span>
                  <span className={`flex-1 truncate ${current ? "font-semibold" : ""}`}>{item.title}</span>
                  <span className="font-mono text-[0.72rem] tabular-nums text-graphite">{formatTime(item.duration)}</span>
                </button>
              </li>
            );
          })}
        </ol>

        <p className="border-t border-rule px-4 py-2.5 text-[0.75rem] text-graphite">
          <a href={PLAYLIST_SOURCE} target="_blank" rel="noreferrer" className="underline decoration-graphite/40 underline-offset-2 hover:text-ink">
            {PLAYLIST_CREDIT}
          </a>
        </p>
      </PopoverContent>
    </Popover>
  );
}
