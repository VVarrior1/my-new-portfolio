import { existsSync } from "node:fs";
import path from "node:path";
import { render, fireEvent, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { AudioProvider, useAudio } from "@/contexts/audio-context";
import { formatTime, nextIndex, playlist, previousTarget, type Track } from "@/lib/playlist";

const tracks: Track[] = [
  { title: "One", artist: "A", src: "/music/one.mp3", duration: 100 },
  { title: "Two", artist: "A", src: "/music/two.mp3", duration: 200 },
  { title: "Three", artist: "A", src: "/music/three.mp3", duration: 300 },
];

function Harness() {
  const { isPlaying, togglePlay, volume, setVolume, track, next, previous, playTrack } = useAudio();
  return (
    <div>
      <button onClick={togglePlay} aria-label="toggle">{isPlaying ? "pause" : "play"}</button>
      <button onClick={() => setVolume(0.5)} aria-label="volume">volume</button>
      <button onClick={next} aria-label="next">next</button>
      <button onClick={previous} aria-label="previous">previous</button>
      <button onClick={() => playTrack(2)} aria-label="third">third</button>
      <output data-testid="volume">{volume.toFixed(2)}</output>
      <output data-testid="title">{track?.title}</output>
    </div>
  );
}

function setup() {
  render(
    <AudioProvider tracks={tracks}>
      <Harness />
    </AudioProvider>,
  );
  return {
    click: (name: string) => fireEvent.click(screen.getByRole("button", { name })),
    title: () => screen.getByTestId("title").textContent,
  };
}

describe("AudioProvider", () => {
  it("toggles playback and updates volume", async () => {
    const { click } = setup();
    expect(screen.getByRole("button", { name: "toggle" })).toHaveTextContent("play");
    click("toggle");
    await screen.findByText("pause");
    click("volume");
    expect(screen.getByTestId("volume")).toHaveTextContent("0.50");
  });

  it("moves through the playlist and wraps at both ends", () => {
    const { click, title } = setup();
    expect(title()).toBe("One");
    click("next");
    expect(title()).toBe("Two");
    click("next");
    click("next");
    expect(title()).toBe("One");
    click("previous");
    expect(title()).toBe("Three");
  });

  it("jumps straight to a picked track", () => {
    const { click, title } = setup();
    click("third");
    expect(title()).toBe("Three");
  });
});

describe("playlist helpers", () => {
  it("formats times like a music app", () => {
    expect(formatTime(0)).toBe("0:00");
    expect(formatTime(176.9)).toBe("2:56");
    expect(formatTime(Number.NaN)).toBe("0:00");
  });

  it("restarts the current track when previous is pressed more than 3 s in", () => {
    expect(previousTarget(1, 3, 10)).toEqual({ index: 1, restart: true });
    expect(previousTarget(1, 3, 1)).toEqual({ index: 0, restart: false });
    expect(previousTarget(0, 3, 0)).toEqual({ index: 2, restart: false });
    expect(nextIndex(2, 3)).toBe(0);
  });

  it("points at audio files that exist in public/", () => {
    expect(playlist.length).toBeGreaterThanOrEqual(8);
    for (const track of playlist) {
      expect(existsSync(path.join(process.cwd(), "public", track.src))).toBe(true);
      expect(track.duration).toBeGreaterThan(60);
    }
  });
});
