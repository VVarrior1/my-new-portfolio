"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { PLAYLIST_NAME, nextIndex, previousTarget, type Track } from "@/lib/playlist";

type AudioContextType = {
  tracks: Track[];
  index: number;
  track: Track | null;
  isPlaying: boolean;
  volume: number;
  /** Seconds into the current track. */
  position: number;
  duration: number;
  togglePlay: () => Promise<void>;
  next: () => void;
  previous: () => void;
  playTrack: (index: number) => void;
  seek: (seconds: number) => void;
  setVolume: (volume: number) => void;
};

const AudioContext = createContext<AudioContextType | undefined>(undefined);

export function useAudio() {
  const context = useContext(AudioContext);
  if (context === undefined) throw new Error("useAudio must be used within an AudioProvider");
  return context;
}

const VOLUME_KEY = "music-volume";
const TRACK_KEY = "music-track";

function readNumber(key: string): number | null {
  try {
    const value = Number(localStorage.getItem(key));
    return localStorage.getItem(key) === null || Number.isNaN(value) ? null : value;
  } catch {
    return null;
  }
}

function save(key: string, value: number) {
  try {
    localStorage.setItem(key, String(value));
  } catch {
    // Private mode: preferences just won't persist.
  }
}

/**
 * One <audio> element plays the playlist in order and loops back to the start.
 * Nothing downloads until the visitor presses play (preload="none"), and playback never
 * starts on its own. Media Session wiring gives lock-screen and media-key controls.
 */
export function AudioProvider({ children, tracks }: { children: ReactNode; tracks: Track[] }) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const wantsPlay = useRef(false);
  const [index, setIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolumeState] = useState(0.35);
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(tracks[0]?.duration ?? 0);

  const track = tracks[index] ?? null;

  // Restore the visitor's volume and last track (never their playing state: autoplay rules).
  useEffect(() => {
    const savedVolume = readNumber(VOLUME_KEY);
    if (savedVolume !== null) setVolumeState(Math.max(0, Math.min(1, savedVolume)));
    const savedTrack = readNumber(TRACK_KEY);
    if (savedTrack !== null && savedTrack >= 0 && savedTrack < tracks.length) setIndex(savedTrack);
  }, [tracks.length]);

  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = volume;
  }, [volume]);

  const start = useCallback(async () => {
    const audio = audioRef.current;
    if (!audio) return;
    wantsPlay.current = true;
    try {
      await audio.play();
      setIsPlaying(true);
    } catch (error) {
      console.warn("Playback was prevented:", error);
      wantsPlay.current = false;
      setIsPlaying(false);
    }
  }, []);

  // A new track loads its source; keep playing if we were.
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !track) return;
    if (!audio.src.endsWith(track.src)) {
      audio.src = track.src;
      setPosition(0);
      setDuration(track.duration);
      if (wantsPlay.current) void start();
    }
    save(TRACK_KEY, index);
  }, [index, track, start]);

  const goTo = useCallback(
    (target: number) => {
      if (tracks.length === 0) return;
      setIndex(((target % tracks.length) + tracks.length) % tracks.length);
    },
    [tracks.length],
  );

  const next = useCallback(() => goTo(nextIndex(index, tracks.length)), [goTo, index, tracks.length]);

  const previous = useCallback(() => {
    const audio = audioRef.current;
    const target = previousTarget(index, tracks.length, audio?.currentTime ?? 0);
    if (target.restart && audio) {
      audio.currentTime = 0;
      setPosition(0);
    } else {
      goTo(target.index);
    }
  }, [goTo, index, tracks.length]);

  const togglePlay = useCallback(async () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (isPlaying) {
      wantsPlay.current = false;
      audio.pause();
      setIsPlaying(false);
    } else {
      await start();
    }
  }, [isPlaying, start]);

  const playTrack = useCallback(
    (target: number) => {
      wantsPlay.current = true;
      if (target === index) void start();
      else goTo(target);
    },
    [goTo, index, start],
  );

  const seek = useCallback((seconds: number) => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.currentTime = seconds;
    setPosition(seconds);
  }, []);

  const setVolume = useCallback((value: number) => {
    const clamped = Math.max(0, Math.min(1, value));
    setVolumeState(clamped);
    save(VOLUME_KEY, clamped);
  }, []);

  // Element events keep state honest when playback changes from outside (media keys, OS).
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const onTime = () => setPosition(Math.floor(audio.currentTime));
    const onMeta = () => Number.isFinite(audio.duration) && setDuration(audio.duration);
    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);
    const onEnded = () => {
      wantsPlay.current = true;
      next();
    };
    audio.addEventListener("timeupdate", onTime);
    audio.addEventListener("loadedmetadata", onMeta);
    audio.addEventListener("play", onPlay);
    audio.addEventListener("pause", onPause);
    audio.addEventListener("ended", onEnded);
    return () => {
      audio.removeEventListener("timeupdate", onTime);
      audio.removeEventListener("loadedmetadata", onMeta);
      audio.removeEventListener("play", onPlay);
      audio.removeEventListener("pause", onPause);
      audio.removeEventListener("ended", onEnded);
    };
  }, [next]);

  // Lock screen, headphones and keyboard media keys.
  useEffect(() => {
    if (typeof navigator === "undefined" || !("mediaSession" in navigator) || !track) return;
    try {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: track.title,
        artist: track.artist,
        album: PLAYLIST_NAME,
        artwork: [{ src: "/apple-icon", sizes: "180x180", type: "image/png" }],
      });
      navigator.mediaSession.setActionHandler("play", () => void start());
      navigator.mediaSession.setActionHandler("pause", () => void togglePlay());
      navigator.mediaSession.setActionHandler("nexttrack", next);
      navigator.mediaSession.setActionHandler("previoustrack", previous);
    } catch {
      // Older browsers: no media session, no problem.
    }
  }, [track, start, togglePlay, next, previous]);

  const value: AudioContextType = {
    tracks,
    index,
    track,
    isPlaying,
    volume,
    position,
    duration,
    togglePlay,
    next,
    previous,
    playTrack,
    seek,
    setVolume,
  };

  return (
    <AudioContext.Provider value={value}>
      <audio ref={audioRef} preload="none" className="hidden" />
      {children}
    </AudioContext.Provider>
  );
}
