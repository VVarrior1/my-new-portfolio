import { describe, expect, it } from "vitest";
import { HEALTH_HOLD_MS, HealthMonitor, LiveSim, assessHealth, diagnose, type Health, type Metrics, type SimConfig } from "@/lib/live-sim";

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

  it("needs the p99 to fall well below the threshold before it reads healthy again", () => {
    expect(assessHealth({ ...calm, p99: 135 }, "healthy")).toBe("healthy");
    expect(assessHealth({ ...calm, p99: 135 }, "strained")).toBe("strained");
    expect(assessHealth({ ...calm, p99: 110 }, "strained")).toBe("healthy");
  });
});

describe("HealthMonitor", () => {
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
  const busy = { ...calm, appUtilization: [0.8, 0.78] };

  it("gets worse at once but holds before it gets better", () => {
    const monitor = new HealthMonitor();
    expect(monitor.update(busy, 0)).toBe("strained");
    expect(monitor.update(calm, 200)).toBe("strained");
    expect(monitor.update(calm, 200 + HEALTH_HOLD_MS - 1)).toBe("strained");
    expect(monitor.update(calm, 200 + HEALTH_HOLD_MS)).toBe("healthy");
  });

  it("restarts the hold if the better reading doesn't last", () => {
    const monitor = new HealthMonitor();
    monitor.update(busy, 0);
    monitor.update(calm, 100);
    monitor.update(busy, 1000);
    expect(monitor.update(calm, 1700)).toBe("strained");
    expect(monitor.update(calm, 1700 + HEALTH_HOLD_MS)).toBe("healthy");
  });

  it("does not flicker while the traffic is stepped through the strain threshold", () => {
    // Step the slider from 200 to 300 req/s and back, 10 req/s every second, as a visitor would.
    const sim = new LiveSim({ rate: 200, servers: 2, cache: false });
    const monitor = new HealthMonitor();
    const states: Health[] = [];
    let now = 0;
    const rates = [200, 210, 220, 230, 240, 250, 260, 270, 280, 290, 300, 290, 280, 270, 260, 250, 240, 230, 220, 210, 200];
    for (let t = 0; t < 4000; t += 16, now += 16) sim.step(16);
    for (const rate of rates) {
      sim.setConfig({ rate });
      for (let t = 0; t < 1000; t += 16, now += 16) {
        sim.step(16);
        if (t % 192 === 0) states.push(monitor.update(sim.metrics(), now));
      }
    }
    const changes = states.filter((state, i) => i > 0 && state !== states[i - 1]).length;
    expect(states).toContain("strained");
    expect(changes).toBeLessThanOrEqual(2);
  });
});

describe("the status sentence and the health always agree", () => {
  it.each([1, 2, 3, 4])("with %i servers, across every traffic level, cache on and off", (servers) => {
    for (const cache of [false, true]) {
      for (let rate = 0; rate <= 900; rate += 60) {
        const config = { rate, servers, cache };
        const sim = new LiveSim(config);
        const monitor = new HealthMonitor();
        let now = 0;
        for (let t = 0; t < 6000; t += 16, now += 16) {
          sim.step(16);
          if (t % 192 !== 0) continue;
          const m = sim.metrics();
          const health = monitor.update(m, now);
          const sentence = diagnose(m, config, health);
          expect(sentence.startsWith("Healthy"), `${rate} req/s, ${health}: ${sentence}`).toBe(health === "healthy");
          if (health === "strained") expect(sentence).toMatch(/near capacity|queues are building|load is easing/);
        }
      }
    }
  });
});
