import React from "react";
import { render, fireEvent, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { AudioProvider, useAudio } from "@/contexts/audio-context";

function TestHarness() {
  const { isPlaying, togglePlay, volume, setVolume } = useAudio();

  return (
    <div>
      <button onClick={togglePlay} aria-label="toggle-playback">
        {isPlaying ? "pause" : "play"}
      </button>
      <button onClick={() => setVolume(0.5)} aria-label="set-volume">
        set-volume
      </button>
      <output data-testid="volume-value">{volume.toFixed(2)}</output>
    </div>
  );
}

describe("AudioProvider", () => {
  it("toggles playback state and updates volume", async () => {
    render(
      <AudioProvider trackUrl="/background-music.m4a">
        <TestHarness />
      </AudioProvider>
    );

    const toggle = screen.getByRole("button", { name: "toggle-playback" });
    const volumeButton = screen.getByRole("button", { name: "set-volume" });
    const volumeValue = screen.getByTestId("volume-value");

    expect(toggle).toHaveTextContent("play");

    fireEvent.click(toggle);
    await screen.findByText(/pause/);
    expect(toggle).toHaveTextContent("pause");

    fireEvent.click(volumeButton);
    expect(volumeValue).toHaveTextContent("0.50");
  });
});
