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
  const [isInitialized, setIsInitialized] = useState(false);

  // Initialize audio element
  useEffect(() => {
    if (!audioRef.current && typeof window !== 'undefined') {
      const audio = new Audio(trackUrl);
      audio.loop = true;
      audio.volume = volume;
      audio.preload = 'metadata';

      // Handle audio events
      const handleCanPlay = () => setIsInitialized(true);
      const handleError = (e: Event) => {
        console.error('Audio loading error:', e);
        setIsPlaying(false);
      };
      const handleEnded = () => setIsPlaying(false);

      audio.addEventListener('canplay', handleCanPlay);
      audio.addEventListener('error', handleError);
      audio.addEventListener('ended', handleEnded);

      audioRef.current = audio;

      return () => {
        audio.removeEventListener('canplay', handleCanPlay);
        audio.removeEventListener('error', handleError);
        audio.removeEventListener('ended', handleEnded);
        audio.pause();
        audio.src = '';
      };
    }
  }, [trackUrl, volume]);

  // Load user preferences
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedVolume = localStorage.getItem('music-volume');
      const savedMuted = localStorage.getItem('music-muted');

      if (savedVolume) {
        const vol = parseFloat(savedVolume);
        setVolumeState(vol);
        if (audioRef.current) {
          audioRef.current.volume = vol;
        }
      }

      // Don't auto-restore playing state to respect autoplay policies
    }
  }, []);

  const togglePlay = async () => {
    if (!audioRef.current || !isInitialized) return;

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
      {children}
    </AudioContext.Provider>
  );
}