import { describe, expect, it } from "vitest";
import { DEMO_BASE_RATE, DEMO_CUES, DEMO_HANDOFF, DEMO_MS, DEMO_PEAK_RATE, DEMO_VICTIM, demoCueAt, demoRate } from "@/lib/sim-demo";
import { LiveSim } from "@/lib/live-sim";

describe("the simulator's demo", () => {
  it("is short, starts and ends at the starting traffic, and peaks in between", () => {
    expect(DEMO_MS).toBeGreaterThanOrEqual(8000);
    expect(DEMO_MS).toBeLessThanOrEqual(14500);
    expect(demoRate(0)).toBe(DEMO_BASE_RATE);
    expect(demoRate(DEMO_MS)).toBe(DEMO_BASE_RATE);
    expect(Math.max(...Array.from({ length: 120 }, (_, i) => demoRate((i / 120) * DEMO_MS)))).toBe(DEMO_PEAK_RATE);
    for (let t = 0; t <= DEMO_MS; t += 100) expect(demoRate(t) % 10).toBe(0);
  });

  it("kills one server and restarts it before it ends, in order", () => {
    const at = DEMO_CUES.map((c) => c.at);
    expect([...at].sort((a, b) => a - b)).toEqual(at);
    const kill = DEMO_CUES.findIndex((c) => c.action === "kill");
    const restart = DEMO_CUES.findIndex((c) => c.action === "restart");
    expect(kill).toBeGreaterThan(-1);
    expect(restart).toBeGreaterThan(kill);
    expect(DEMO_CUES[DEMO_CUES.length - 1].at).toBeLessThan(DEMO_MS);
    expect(demoCueAt(-1)).toBe(-1);
    expect(demoCueAt(DEMO_MS)).toBe(DEMO_CUES.length - 1);
  });

  it("gives every line time to be read", () => {
    const ends = [...DEMO_CUES.slice(1).map((c) => c.at), DEMO_MS];
    DEMO_CUES.forEach((cue, i) => {
      const words = cue.say.split(/\s+/).length;
      // At least 2.5 s, and no faster than about four words a second.
      expect(ends[i] - cue.at).toBeGreaterThanOrEqual(Math.max(2000, words * 250));
      expect(ends[i] - cue.at).toBeGreaterThanOrEqual(i === DEMO_CUES.length - 1 ? 2000 : 2500);
    });
  });

  it("keeps every line short enough for two lines on a phone", () => {
    for (const line of [...DEMO_CUES.map((c) => c.say), DEMO_HANDOFF]) expect(line.length).toBeLessThanOrEqual(80);
  });

  it("really breaks the simulation, and is really healthy when it says so", () => {
    const sim = new LiveSim({ rate: DEMO_BASE_RATE, servers: 2, cache: false }, 7);
    const recovered = DEMO_CUES[DEMO_CUES.length - 1];
    expect(recovered.say).toMatch(/^Recovered/);
    let cue = -1;
    let peakErrors = 0;
    let peakP99 = 0;
    for (let t = 0; t < recovered.at; t += 16) {
      sim.setConfig({ rate: demoRate(t) });
      while (cue < demoCueAt(t)) {
        cue++;
        if (DEMO_CUES[cue].action === "kill") sim.killServer(DEMO_VICTIM);
        if (DEMO_CUES[cue].action === "restart") sim.restartServer(DEMO_VICTIM);
      }
      sim.step(16);
      peakErrors = Math.max(peakErrors, sim.metrics().errorRate);
      peakP99 = Math.max(peakP99, sim.metrics().p99);
    }
    expect(peakErrors).toBeGreaterThan(0.1);
    expect(peakP99).toBeGreaterThan(200);
    // By the time it says "Recovered", the readouts agree.
    const m = sim.metrics();
    expect(m.serverUp).toEqual([true, true]);
    expect(m.errorRate).toBe(0);
    expect(m.p99).toBeLessThan(150);
  });
});
