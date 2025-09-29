"use client";

import { createContext, useContext, useState, useRef, useEffect, ReactNode } from "react";

type AudioContextType = {
  isPlaying: boolean;
  volume: number;
  togglePlay: () => void;
  setVolume: (volume: number) => void;
  currentTrack: string | null;
};

const AudioContext = createContext<AudioContextType | undefined>(undefined);

export function useAudio() {
  const context = useContext(AudioContext);
  if (context === undefined) {
    throw new Error('useAudio must be used within an AudioProvider');
  }
  return context;
}

type AudioProviderProps = {
  children: ReactNode;
  trackUrl: string;
};

export function AudioProvider({ children, trackUrl }: AudioProviderProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolumeState] = useState(0.3); // Start at 30% volume
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const latestVolume = useRef(volume);
  const [isClient, setIsClient] = useState(false);

  // Keep volume in sync with the audio element
  useEffect(() => {
    latestVolume.current = volume;
    if (audioRef.current) {
      audioRef.current.volume = volume;
    }
  }, [volume]);

  // Track when we're on the client to avoid hydration mismatches
  useEffect(() => {
    setIsClient(true);
  }, []);

  // Wire up media events once the audio element exists or the track changes
  useEffect(() => {
    if (!isClient) {
      return;
    }

    const audio = audioRef.current;
    if (!audio) {
      return;
    }

    const handleError = (event: Event) => {
      console.error('Audio loading error:', event);
      setIsPlaying(false);
    };
    const handleEnded = () => setIsPlaying(false);

    const codecSupport = audio.canPlayType('audio/mp4; codecs="mp4a.40.2"') || audio.canPlayType('audio/aac');
    if (!codecSupport) {
      console.warn('Background audio format not supported in this browser. Consider providing an MP3 fallback.');
    }

    audio.loop = true;
    audio.volume = latestVolume.current;
    audio.preload = 'metadata';

    audio.addEventListener('error', handleError);
    audio.addEventListener('ended', handleEnded);

    // Ensure metadata is loaded so the first user interaction can start playback everywhere
    audio.load();

    return () => {
      audio.removeEventListener('error', handleError);
      audio.removeEventListener('ended', handleEnded);
    };
  }, [trackUrl, isClient]);

  // Load user preferences
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedVolume = localStorage.getItem('music-volume');

      if (savedVolume) {
        const vol = parseFloat(savedVolume);
        setVolumeState(Number.isNaN(vol) ? 0.3 : vol);
        if (audioRef.current && !Number.isNaN(vol)) {
          audioRef.current.volume = vol;
        }
      }

      // Don't auto-restore playing state to respect autoplay policies
    }
  }, []);

  const togglePlay = async () => {
    if (!audioRef.current) return;

    try {
      if (isPlaying) {
        audioRef.current.pause();
        setIsPlaying(false);
        localStorage.setItem('music-playing', 'false');
      } else {
        // Attempt to play - this may fail due to autoplay policies
        await audioRef.current.play();
        setIsPlaying(true);
        localStorage.setItem('music-playing', 'true');
      }
    } catch (error) {
      console.warn('Audio play was prevented:', error);
      setIsPlaying(false);
    }
  };

  const setVolume = (newVolume: number) => {
    const clampedVolume = Math.max(0, Math.min(1, newVolume));
    setVolumeState(clampedVolume);

    if (audioRef.current) {
      audioRef.current.volume = clampedVolume;
    }

    localStorage.setItem('music-volume', clampedVolume.toString());
  };

  const value: AudioContextType = {
    isPlaying,
    volume,
    togglePlay,
    setVolume,
    currentTrack: trackUrl,
  };

  return (
    <AudioContext.Provider value={value}>
      {isClient ? (
        <audio ref={audioRef} className="hidden" preload="metadata" loop>
          <source src={trackUrl} type="audio/mp4" />
        </audio>
      ) : null}
      {children}
    </AudioContext.Provider>
  );
}
