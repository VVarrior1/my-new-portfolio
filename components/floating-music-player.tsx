"use client";

import { useState, useRef, useEffect } from "react";
import { useAudio } from "@/contexts/audio-context";

export function FloatingMusicPlayer() {
  const { isPlaying, volume, togglePlay, setVolume } = useAudio();
  const [isExpanded, setIsExpanded] = useState(false);
  const [showVolumeTooltip, setShowVolumeTooltip] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleMouseEnter = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    setIsExpanded(true);
  };

  const handleMouseLeave = () => {
    timeoutRef.current = setTimeout(() => {
      setIsExpanded(false);
      setShowVolumeTooltip(false);
    }, 1000);
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = parseFloat(e.target.value);
    setVolume(newVolume);
  };

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return (
    <div
      className="fixed bottom-6 right-6 z-40 flex items-center"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Volume Control - Slides in from left */}
      <div
        className={`flex items-center transition-all duration-300 ease-out ${
          isExpanded
            ? "opacity-100 translate-x-0 mr-3"
            : "opacity-0 translate-x-4 pointer-events-none mr-0"
        }`}
      >
        <div className="relative">
          <div
            className="rounded-full bg-black/40 backdrop-blur-md border border-white/20 px-4 py-2 shadow-lg"
            onMouseEnter={() => setShowVolumeTooltip(true)}
            onMouseLeave={() => setShowVolumeTooltip(false)}
          >
            <div className="flex items-center gap-3">
              <svg className="h-4 w-4 text-white/80" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.617.823L4.216 13H2a1 1 0 01-1-1V8a1 1 0 011-1h2.216l4.167-3.823a1 1 0 011.617.076zM12 8a1 1 0 012 0v4a1 1 0 11-2 0V8z"
                  clipRule="evenodd"
                />
                <path d="M16.93 6.757a1 1 0 011.414 1.414A6.972 6.972 0 0119 12a6.972 6.972 0 01-.657 3.071 1 1 0 11-1.838-.786A4.972 4.972 0 0017 12a4.972 4.972 0 00-.495-2.171 1 1 0 01.425-1.272z" />
              </svg>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={volume}
                onChange={handleVolumeChange}
                className="w-16 h-2 bg-white/20 rounded-lg appearance-none cursor-pointer slider"
                style={{
                  background: `linear-gradient(to right, #10b981 0%, #10b981 ${volume * 100}%, rgba(255,255,255,0.2) ${volume * 100}%, rgba(255,255,255,0.2) 100%)`
                }}
              />
              <span className="text-xs text-white/60 font-mono w-8 text-right">
                {Math.round(volume * 100)}
              </span>
            </div>
          </div>

          {/* Volume Tooltip */}
          {showVolumeTooltip && (
            <div className="absolute bottom-full mb-2 left-1/2 transform -translate-x-1/2 bg-black/80 text-white text-xs px-2 py-1 rounded whitespace-nowrap">
              Volume Control
              <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-black/80"></div>
            </div>
          )}
        </div>
      </div>

      {/* Main Play/Pause Button */}
      <button
        onClick={togglePlay}
        className="group relative w-14 h-14 rounded-full bg-gradient-to-br from-emerald-400/90 to-emerald-600/90 backdrop-blur-md border border-emerald-300/30 shadow-lg hover:shadow-emerald-500/25 transition-all duration-300 hover:scale-105 focus:outline-none focus:ring-2 focus:ring-emerald-300/50 focus:ring-offset-2 focus:ring-offset-transparent"
      >
        {/* Vinyl Record Background Animation */}
        <div
          className={`absolute inset-1 rounded-full bg-gradient-to-br from-emerald-500/20 to-emerald-700/20 transition-transform duration-1000 ease-linear ${
            isPlaying ? "animate-spin" : ""
          }`}
        >
          {/* Vinyl Record Lines */}
          <div className="absolute inset-2 rounded-full border border-emerald-300/30"></div>
          <div className="absolute inset-4 rounded-full border border-emerald-300/20"></div>
          <div className="absolute top-1/2 left-1/2 w-2 h-2 bg-emerald-300/40 rounded-full transform -translate-x-1/2 -translate-y-1/2"></div>
        </div>

        {/* Play/Pause Icon */}
        <div className="relative z-10 flex items-center justify-center h-full">
          {isPlaying ? (
            <svg className="h-5 w-5 text-white" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM7 8a1 1 0 012 0v4a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1z"
                clipRule="evenodd"
              />
            </svg>
          ) : (
            <svg className="h-5 w-5 text-white ml-0.5" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z"
                clipRule="evenodd"
              />
            </svg>
          )}
        </div>

        {/* Pulse Animation when Playing */}
        {isPlaying && (
          <div className="absolute inset-0 rounded-full bg-emerald-400/30 animate-ping"></div>
        )}

        {/* Sound Waves */}
        {isPlaying && (
          <>
            <div className="absolute -right-2 top-1/2 transform -translate-y-1/2">
              <div className="flex space-x-0.5">
                <div className="w-0.5 bg-emerald-400/60 rounded-full animate-pulse" style={{height: '8px', animationDelay: '0ms'}}></div>
                <div className="w-0.5 bg-emerald-400/60 rounded-full animate-pulse" style={{height: '12px', animationDelay: '150ms'}}></div>
                <div className="w-0.5 bg-emerald-400/60 rounded-full animate-pulse" style={{height: '6px', animationDelay: '300ms'}}></div>
              </div>
            </div>
            <div className="absolute -left-2 top-1/2 transform -translate-y-1/2">
              <div className="flex space-x-0.5">
                <div className="w-0.5 bg-emerald-400/60 rounded-full animate-pulse" style={{height: '6px', animationDelay: '450ms'}}></div>
                <div className="w-0.5 bg-emerald-400/60 rounded-full animate-pulse" style={{height: '10px', animationDelay: '600ms'}}></div>
                <div className="w-0.5 bg-emerald-400/60 rounded-full animate-pulse" style={{height: '8px', animationDelay: '750ms'}}></div>
              </div>
            </div>
          </>
        )}
      </button>

      {/* Music Note Tooltip */}
      {!isExpanded && (
        <div className="absolute bottom-full mb-2 left-1/2 transform -translate-x-1/2 bg-black/80 text-white text-xs px-3 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap pointer-events-none">
          {isPlaying ? "Pause Music" : "Play Background Music"}
          <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-black/80"></div>
        </div>
      )}

      <style jsx>{`
        .slider::-webkit-slider-thumb {
          appearance: none;
          width: 16px;
          height: 16px;
          background: #10b981;
          cursor: pointer;
          border-radius: 50%;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
        }

        .slider::-moz-range-thumb {
          width: 16px;
          height: 16px;
          background: #10b981;
          cursor: pointer;
          border-radius: 50%;
          border: none;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
        }
      `}</style>
    </div>
  );
}