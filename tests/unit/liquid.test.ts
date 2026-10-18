import { describe, expect, it } from "vitest";
import { strainFrom } from "@/lib/flow-bus";
import { blotPath } from "@/lib/theme";

describe("strainFrom", () => {
  it("is zero for a healthy system", () => {
    expect(strainFrom(60, 0, false)).toBe(0);
  });
  it("rises with latency, and errors push it to 1", () => {
    expect(strainFrom(400, 0, false)).toBeGreaterThan(0);
    expect(strainFrom(400, 0, false)).toBeLessThan(0.5);
    expect(strainFrom(300, 0.4, false)).toBe(1);
  });
  it("a dead server always strains the field a little", () => {
    expect(strainFrom(60, 0, true)).toBeCloseTo(0.35);
  });
});

describe("blotPath", () => {
  // The theme flood and the screenshot reveals interpolate between frames, which browsers only do
  // when every frame has the same commands.
  it("has the same commands at every moment", () => {
    const commands = (t: number) => blotPath(100, 100, 50 + t * 400, t).replace(/[-\d.]+/g, "#");
    const first = commands(0);
    for (const t of [0.1, 0.5, 0.9, 1]) expect(commands(t)).toBe(first);
  });
  it("is a closed path around the origin", () => {
    const d = blotPath(10, 20, 5, 0);
    expect(d.startsWith('path("M ')).toBe(true);
    expect(d.endsWith(' Z")')).toBe(true);
  });
});
