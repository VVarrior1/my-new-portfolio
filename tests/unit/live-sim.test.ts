import { describe, expect, it } from "vitest";
import { LiveSim, assessHealth, diagnose, type Metrics, type SimConfig } from "@/lib/live-sim";

/** Runs a simulation in 16 ms frames, like the browser does, and returns its metrics. */
function run(config: SimConfig, seconds = 8, seed = 7) {
  const sim = new LiveSim(config, seed);
  let finished = 0;
  for (let t = 0; t < seconds * 1000; t += 16) finished += sim.step(16).length;
  return { sim, metrics: sim.metrics(), finished };
}

describe("LiveSim", () => {
  it("replays exactly from a seed", () => {
    const a = run({ rate: 300, servers: 2, cache: true }).metrics;
    const b = run({ rate: 300, servers: 2, cache: true }).metrics;
    expect(a).toEqual(b);
    const c = run({ rate: 300, servers: 2, cache: true }, 8, 99).metrics;
    expect(c.p99).not.toBe(a.p99);
  });

  it("is healthy and fast at low load", () => {
    const { metrics } = run({ rate: 100, servers: 2, cache: false });
    expect(metrics.errorRate).toBe(0);
    expect(metrics.throughput).toBeGreaterThan(85);
    expect(metrics.throughput).toBeLessThan(115);
    expect(metrics.p50).toBeGreaterThan(20);
    expect(metrics.p50).toBeLessThan(45);
  });

  it("saturates two app servers past ~400 req/s", () => {
    const { metrics, sim } = run({ rate: 600, servers: 2, cache: false });
    expect(metrics.errorRate).toBeGreaterThan(0.2);
    expect(metrics.throughput).toBeLessThan(450);
    expect(diagnose(metrics, sim.config)).toMatch(/app servers are saturated/i);
  });

  it("moves the bottleneck to the database once there are enough servers", () => {
    const { metrics, sim } = run({ rate: 720, servers: 4, cache: false });
    expect(metrics.errorRate).toBeGreaterThan(0.05);
    expect(metrics.dbUtilization).toBeGreaterThan(0.85);
    expect(diagnose(metrics, sim.config)).toMatch(/database is the bottleneck/i);
  });

  it("relieves the database with the cache", () => {
    const { metrics } = run({ rate: 720, servers: 4, cache: true });
    expect(metrics.errorRate).toBeLessThan(0.01);
    expect(metrics.dbUtilization).toBeLessThan(0.6);
    expect(metrics.cacheHitRate).toBeGreaterThan(0.8);
  });

  it("fails requests on a killed server until the health check removes it, then recovers", () => {
    // 120 req/s fits on one server, so once the dead one is out of rotation nothing fails.
    const sim = new LiveSim({ rate: 120, servers: 2, cache: false });
    for (let t = 0; t < 4000; t += 16) sim.step(16);
    expect(sim.metrics().errorRate).toBe(0);

    sim.killServer(0);
    let failed = 0;
    for (let t = 0; t < 1000; t += 16) failed += sim.step(16).filter((f) => !f.ok).length;
    expect(failed).toBeGreaterThan(40); // about half of 120 req/s for one second

    let lateFailures = 0;
    for (let t = 0; t < 3000; t += 16) lateFailures += sim.step(16).filter((f) => !f.ok).length;
    expect(lateFailures).toBe(0); // the balancer stopped routing to it
    expect(sim.metrics().serverUp).toEqual([false, true]);

    sim.restartServer(0);
    for (let t = 0; t < 3000; t += 16) sim.step(16);
    expect(sim.metrics().serverUp).toEqual([true, true]);
    expect(sim.metrics().errorRate).toBe(0);
  });

  it("accounts for every request: none vanish when servers die or are removed", () => {
    const sim = new LiveSim({ rate: 500, servers: 3, cache: true });
    let finished = 0;
    for (let t = 0; t < 2000; t += 16) finished += sim.step(16).length;
    sim.killServer(1);
    sim.setConfig({ servers: 2 });
    sim.setConfig({ servers: 4, rate: 0 });
    for (let t = 0; t < 5000; t += 16) finished += sim.step(16).length;
    // With traffic stopped and the queues drained, every arrival has finished one way or another.
    const arrivals = (sim as unknown as { nextId: number }).nextId;
    expect(finished).toBe(arrivals);
  });

  it("restarts traffic after being idle", () => {
    const sim = new LiveSim({ rate: 0, servers: 2, cache: false });
    for (let t = 0; t < 1000; t += 16) sim.step(16);
    expect(sim.metrics().throughput).toBe(0);
    sim.setConfig({ rate: 150 });
    for (let t = 0; t < 4000; t += 16) sim.step(16);
    expect(sim.metrics().throughput).toBeGreaterThan(100);
  });
});

describe("diagnose", () => {
  it("blames the stage where requests actually fail", () => {
    const shed = run({ rate: 900, servers: 4, cache: true });
    expect(diagnose(shed.metrics, shed.sim.config)).toMatch(/every app server is saturated/i);
    const healthy = run({ rate: 100, servers: 2, cache: false });
    expect(diagnose(healthy.metrics, healthy.sim.config)).toMatch(/^Healthy/);
  });
});

describe("diagnose after a server dies", () => {
  it("blames the dead server at first, then the overloaded survivors", () => {
    const sim = new LiveSim({ rate: 360, servers: 2, cache: true });
    for (let t = 0; t < 4000; t += 16) sim.step(16);
    sim.killServer(0);
    for (let t = 0; t < 600; t += 16) sim.step(16);
    expect(diagnose(sim.metrics(), sim.config)).toMatch(/server is down/i);
    // One server (200 req/s) can't carry 360 req/s once the dead one is out of rotation.
    for (let t = 0; t < 5000; t += 16) sim.step(16);
    expect(diagnose(sim.metrics(), sim.config)).toMatch(/one remaining server can't keep up/i);
  });
});

describe("assessHealth", () => {
  const calm: Metrics = {
    p50: 30,
    p99: 80,
    throughput: 160,
    errorRate: 0,
    appUtilization: [0.4, 0.4],
    serverUp: [true, true],
    dbUtilization: 0.3,
    cacheHitRate: 0,
    failuresAt: { down: 0, app: 0, db: 0 },
  };

  it("reads healthy at the starting load", () => {
    expect(assessHealth(run({ rate: 160, servers: 2, cache: false }).metrics)).toBe("healthy");
  });

  it("reads strained once a component passes 70% busy, before anything fails", () => {
    expect(assessHealth({ ...calm, appUtilization: [0.75, 0.5] })).toBe("strained");
    expect(assessHealth({ ...calm, dbUtilization: 0.8 })).toBe("strained");
    expect(assessHealth({ ...calm, p99: 200 })).toBe("strained");
  });

  it("reads failing when requests fail or a server is down", () => {
    expect(assessHealth(run({ rate: 600, servers: 2, cache: false }).metrics)).toBe("failing");
    expect(assessHealth({ ...calm, serverUp: [false, true] })).toBe("failing");
  });

  it("holds its state near a threshold instead of flickering", () => {
    const nearLimit = { ...calm, appUtilization: [0.66, 0.6] };
    expect(assessHealth(nearLimit, "healthy")).toBe("healthy");
    expect(assessHealth(nearLimit, "strained")).toBe("strained");
    expect(assessHealth({ ...calm, errorRate: 0.006 }, "failing")).toBe("failing");
    expect(assessHealth({ ...calm, errorRate: 0.006 }, "healthy")).toBe("healthy");
    expect(assessHealth(calm, "failing")).toBe("healthy");
  });
});
