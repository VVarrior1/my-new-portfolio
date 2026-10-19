import { describe, expect, it } from "vitest";
import { arrivalProgress, easeInOutCubic, letterProgress, packetScreenY, quad } from "@/lib/hud-math";

describe("arrivalProgress", () => {
  const vh = 900;
  it("is 0 while a section is still well below the top, 1 once it reaches 12% of the screen", () => {
    expect(arrivalProgress(800, vh)).toBe(0);
    expect(arrivalProgress(0.12 * vh, vh)).toBe(1);
    expect(arrivalProgress(0, vh)).toBe(1);
  });
  it("takes 200px of scroll", () => {
    expect(arrivalProgress(0.12 * vh + 100, vh)).toBeCloseTo(0.5);
  });
});

describe("letterProgress", () => {
  it("sends the last letter first", () => {
    const n = 4;
    const early = 0.2;
    expect(letterProgress(early, n - 1, n)).toBeGreaterThan(letterProgress(early, 0, n));
    expect(letterProgress(early, 0, n)).toBe(0);
  });
  it("lands every letter by the end, and none before the start", () => {
    for (let k = 0; k < 6; k++) {
      expect(letterProgress(1, k, 6)).toBe(1);
      expect(letterProgress(0, k, 6)).toBe(0);
    }
  });
});

describe("curves", () => {
  it("eases from 0 to 1 through the middle", () => {
    expect(easeInOutCubic(0)).toBe(0);
    expect(easeInOutCubic(0.5)).toBeCloseTo(0.5);
    expect(easeInOutCubic(1)).toBe(1);
  });
  it("starts and ends a flight on its endpoints", () => {
    const a = { x: 0, y: 100 };
    const c = { x: -90, y: 50 };
    const b = { x: 300, y: 0 };
    expect(quad(a, c, b, 0)).toEqual(a);
    expect(quad(a, c, b, 1)).toEqual(b);
    expect(quad(a, c, b, 0.5).x).toBeLessThan((a.x + b.x) / 2);
  });
});

describe("packetScreenY", () => {
  const vh = 900;
  const limit = 9000;
  it("rides the middle of the screen until the last screen of scroll", () => {
    expect(packetScreenY(0, limit, vh, 9700)).toBe(450);
    expect(packetScreenY(limit - vh, limit, vh, 9700)).toBe(450);
  });
  it("meets an end station that sits low on the last screen exactly at the bottom of the page", () => {
    // The station is 700px down the last screen: at the bottom of the page the packet is on it.
    expect(packetScreenY(limit, limit, vh, limit + 700)).toBe(700);
    expect(packetScreenY(limit - vh / 2, limit, vh, limit + 700)).toBe(575);
  });
  it("stays in the middle when the station is reached before the page ends", () => {
    expect(packetScreenY(limit, limit, vh, limit + 300)).toBe(450);
  });
});
