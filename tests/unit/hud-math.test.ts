import { describe, expect, it } from "vitest";
import { easeInOutCubic, flipProgress, letterProgress, quad } from "@/lib/hud-math";

describe("flipProgress", () => {
  const vh = 900;
  it("is 0 while a section is still well below the top, 1 once it reaches 12% of the screen", () => {
    expect(flipProgress(800, vh, true)).toBe(0);
    expect(flipProgress(0.12 * vh, vh, true)).toBe(1);
    expect(flipProgress(0, vh, true)).toBe(1);
  });
  it("takes 200px of scroll for a section name", () => {
    expect(flipProgress(0.12 * vh + 100, vh, true)).toBeCloseTo(0.5);
  });
  it("starts a project name while its poster is still in full view", () => {
    expect(flipProgress(0.3 * vh + 100, vh, false)).toBeGreaterThan(0);
    expect(flipProgress(0.3 * vh + 100, vh, true)).toBe(0);
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
