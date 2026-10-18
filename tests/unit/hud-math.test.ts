import { describe, expect, it } from "vitest";
import { bezier, flipProgress, letterProgress, pctDigits } from "@/lib/hud-math";

describe("flipProgress", () => {
  it("is 0 below the zone, 1 once the section reaches 12% of the screen", () => {
    expect(flipProgress(900, 1000)).toBe(0);
    expect(flipProgress(320, 1000)).toBe(0);
    expect(flipProgress(220, 1000)).toBeCloseTo(0.5);
    expect(flipProgress(120, 1000)).toBe(1);
    expect(flipProgress(-4000, 1000)).toBe(1);
  });
});

describe("letterProgress", () => {
  it("starts letters in order and lands them all together at the end", () => {
    expect(letterProgress(0, 0, 5, 0.16)).toBe(0);
    expect(letterProgress(0.2, 0, 5, 0.16)).toBeGreaterThan(letterProgress(0.2, 4, 5, 0.16));
    for (let k = 0; k < 5; k++) expect(letterProgress(1, k, 5, 0.16)).toBe(1);
  });
  it("is monotonic in progress", () => {
    let prev = 0;
    for (let p = 0; p <= 1; p += 0.05) {
      const t = letterProgress(p, 2, 6, 0.16);
      expect(t).toBeGreaterThanOrEqual(prev);
      prev = t;
    }
  });
});

describe("bezier", () => {
  it("starts and ends on its endpoints and bows toward the control point", () => {
    const a = { x: 0, y: 0 };
    const b = { x: 0, y: 100 };
    const c = { x: -40, y: 50 };
    expect(bezier(a, c, b, 0)).toEqual(a);
    expect(bezier(a, c, b, 1)).toEqual(b);
    expect(bezier(a, c, b, 0.5).x).toBeLessThan(0);
  });
});

describe("pctDigits", () => {
  it("rolls 000 to 100", () => {
    expect(pctDigits(0)).toEqual([0, 0, 0]);
    expect(pctDigits(0.07)).toEqual([0, 0, 7]);
    expect(pctDigits(0.42)).toEqual([0, 4, 2]);
    expect(pctDigits(1)).toEqual([1, 0, 0]);
    expect(pctDigits(1.4)).toEqual([1, 0, 0]);
  });
});
