import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach, beforeAll } from "vitest";

const togglePlay = vi.fn();
const setVolume = vi.fn();

vi.mock("@/contexts/audio-context", () => ({
  useAudio: () => ({
    isPlaying: false,
    volume: 0.3,
    togglePlay,
    setVolume,
  }),
}));

describe("FloatingMusicPlayer", () => {
  let FloatingMusicPlayer: typeof import("@/components/floating-music-player")["FloatingMusicPlayer"];

  beforeAll(async () => {
    ({ FloatingMusicPlayer } = await import("@/components/floating-music-player"));
  });

  beforeEach(() => {
    togglePlay.mockClear();
    setVolume.mockClear();
  });

  it("renders controls and invokes handlers", () => {
    render(<FloatingMusicPlayer />);

    const playButton = screen.getByRole("button", { name: "Play background music" });
    fireEvent.click(playButton);
    expect(togglePlay).toHaveBeenCalled();

    const slider = screen.getByRole("slider");
    fireEvent.change(slider, { target: { value: "0.7" } });
    expect(setVolume).toHaveBeenCalledWith(0.7);
  });
});

