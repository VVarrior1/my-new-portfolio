// A small seeded discrete-event simulation of a web service, run live in the
// browser for the home-page hero. Same idea as Systemlab, at toy scale:
//
//   users -> load balancer -> app servers (N) -> cache (optional) -> database
//
// Every request is an event sequence (arrival, app done, cache done, db done),
// processed in time order from a binary heap. Capacities are chosen so a visitor
// can find each bottleneck in turn: two app servers saturate near 400 req/s, the
// database near 600 req/s unless the cache is on.

export const APP_WORKERS = 4;
export const APP_SERVICE_MS = 20; // mean, lognormal
export const APP_QUEUE = 40;
export const DB_CONNECTIONS = 6;
export const DB_SERVICE_MS = 10;
export const DB_QUEUE = 80;
export const CACHE_SERVICE_MS = 1.2;
export const READ_SHARE = 0.9;
export const CACHE_HIT_RATE = 0.85;
/** How long the load balancer keeps routing to a dead server before its health check notices. */
export const HEALTH_CHECK_MS = 1000;
export const MAX_SERVERS = 4;
const WINDOW_MS = 3000;
const SIGMA = 0.55;

export type SimConfig = { rate: number; servers: number; cache: boolean };

export type Stage = "lb" | "app" | "cache" | "db";

/** A finished request, reported so the UI can animate a sample of them. */
export type Finished = {
  ok: boolean;
  latency: number;
  server: number;
  /** Stages the request reached, in order. Failed requests end where they failed. */
  path: Stage[];
};

export type Metrics = {
  p50: number;
  p99: number;
  throughput: number;
  errorRate: number;
  appUtilization: number[];
  serverUp: boolean[];
  dbUtilization: number;
  cacheHitRate: number;
  /** Recent failures by cause: sent to a dead server, shed by a full app server, or by a full database. */
  failuresAt: { down: number; app: number; db: number };
};

type Req = { id: number; start: number; server: number; read: boolean; path: Stage[]; lostToDown?: boolean };

type Server = {
  busy: number;
  /** Requests being served right now, so they can be failed if the server dies. */
  active: Set<Req>;
  queue: Req[];
  up: boolean;
  downSince: number;
  epoch: number;
  util: number;
};

type Event =
  | { t: number; kind: "arrival" }
  | { t: number; kind: "app"; req: Req; server: Server; epoch: number }
  | { t: number; kind: "cache"; req: Req }
  | { t: number; kind: "db"; req: Req };

/** Deterministic PRNG (mulberry32) so a seed always replays the same run. */
export function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

class EventHeap {
  private items: Event[] = [];
  get size() {
    return this.items.length;
  }
  peek() {
    return this.items[0];
  }
  push(event: Event) {
    const items = this.items;
    items.push(event);
    let i = items.length - 1;
    while (i > 0) {
      const parent = (i - 1) >> 1;
      if (items[parent].t <= items[i].t) break;
      [items[parent], items[i]] = [items[i], items[parent]];
      i = parent;
    }
  }
  pop(): Event | undefined {
    const items = this.items;
    const top = items[0];
    const last = items.pop();
    if (items.length > 0 && last) {
      items[0] = last;
      let i = 0;
      for (;;) {
        const l = 2 * i + 1;
        const r = l + 1;
        let m = i;
        if (l < items.length && items[l].t < items[m].t) m = l;
        if (r < items.length && items[r].t < items[m].t) m = r;
        if (m === i) break;
        [items[m], items[i]] = [items[i], items[m]];
        i = m;
      }
    }
    return top;
  }
}

function percentile(sorted: number[], p: number) {
  if (sorted.length === 0) return 0;
  const index = Math.min(sorted.length - 1, Math.max(0, Math.ceil(p * sorted.length) - 1));
  return sorted[index];
}

export class LiveSim {
  now = 0;
  config: SimConfig;
  private rng: () => number;
  private heap = new EventHeap();
  private servers: Server[] = [];
  private db = { busy: 0, queue: [] as Req[], util: 0 };
  private nextId = 0;
  private roundRobin = 0;
  private done: Array<{ t: number; latency: number; ok: boolean; cause?: "down" | "app" | "db" }> = [];
  private cacheLookups: Array<{ t: number; hit: boolean }> = [];
  private finished: Finished[] = [];

  constructor(config: SimConfig, seed = 7) {
    this.config = { ...config };
    this.rng = mulberry32(seed);
    for (let i = 0; i < config.servers; i++) this.servers.push(this.newServer());
    if (config.rate > 0) this.heap.push({ t: this.exp(1000 / config.rate), kind: "arrival" });
  }

  private newServer(): Server {
    return { busy: 0, active: new Set(), queue: [], up: true, downSince: 0, epoch: 0, util: 0 };
  }

  private exp(mean: number) {
    return -Math.log(1 - this.rng()) * mean;
  }

  private lognormal(mean: number) {
    const mu = Math.log(mean) - (SIGMA * SIGMA) / 2;
    const z = Math.sqrt(-2 * Math.log(1 - this.rng())) * Math.cos(2 * Math.PI * this.rng());
    return Math.exp(mu + SIGMA * z);
  }

  /** Applies new controls. Traffic changes take effect from the next arrival. */
  setConfig(next: Partial<SimConfig>) {
    const wasIdle = this.config.rate <= 0;
    this.config = { ...this.config, ...next };
    const target = Math.max(1, Math.min(MAX_SERVERS, this.config.servers));
    while (this.servers.length < target) this.servers.push(this.newServer());
    while (this.servers.length > target) {
      // Removing a server fails whatever it was holding, like a scale-in without draining.
      this.dropAll(this.servers.pop()!);
    }
    if (wasIdle && this.config.rate > 0) {
      this.heap.push({ t: this.now + this.exp(1000 / this.config.rate), kind: "arrival" });
    }
  }

  /** Takes one server down. In-flight work on it is lost; the balancer notices after a health check. */
  killServer(index = 0) {
    const server = this.servers[index];
    if (!server || !server.up) return;
    server.up = false;
    server.downSince = this.now;
    this.dropAll(server);
  }

  /** Fails everything a server holds and invalidates its scheduled completions. */
  private dropAll(server: Server) {
    server.epoch++;
    const lost = [...server.active, ...server.queue.splice(0)];
    server.active.clear();
    server.busy = 0;
    for (const req of lost) {
      req.lostToDown = true;
      this.fail(req);
    }
  }

  restartServer(index = 0) {
    const server = this.servers[index];
    if (!server || server.up) return;
    server.up = true;
    server.epoch++;
  }

  private complete(req: Req) {
    const latency = this.now - req.start;
    this.done.push({ t: this.now, latency, ok: true });
    this.finished.push({ ok: true, latency, server: req.server, path: req.path });
  }

  private fail(req: Req) {
    const latency = this.now - req.start;
    const cause = req.lostToDown ? "down" : req.path[req.path.length - 1] === "db" ? "db" : "app";
    this.done.push({ t: this.now, latency, ok: false, cause });
    this.finished.push({ ok: false, latency, server: req.server, path: req.path });
  }

  private routable(server: Server) {
    // A dead server keeps receiving traffic until the health check catches it.
    return server.up || this.now - server.downSince < HEALTH_CHECK_MS;
  }

  private startApp(server: Server, req: Req) {
    server.busy++;
    server.active.add(req);
    this.heap.push({ t: this.now + this.lognormal(APP_SERVICE_MS), kind: "app", req, server, epoch: server.epoch });
  }

  private toDb(req: Req) {
    req.path.push("db");
    if (this.db.busy < DB_CONNECTIONS) {
      this.db.busy++;
      this.heap.push({ t: this.now + this.lognormal(DB_SERVICE_MS), kind: "db", req });
    } else if (this.db.queue.length < DB_QUEUE) {
      this.db.queue.push(req);
    } else {
      this.fail(req);
    }
  }

  private handle(event: Event) {
    switch (event.kind) {
      case "arrival": {
        if (this.config.rate > 0) this.heap.push({ t: this.now + this.exp(1000 / this.config.rate), kind: "arrival" });
        const req: Req = { id: this.nextId++, start: this.now, server: -1, read: this.rng() < READ_SHARE, path: ["lb"] };
        const candidates = this.servers.map((s, i) => [s, i] as const).filter(([s]) => this.routable(s));
        if (candidates.length === 0) {
          this.fail(req);
          return;
        }
        const [server, index] = candidates[this.roundRobin++ % candidates.length];
        req.path.push("app");
        req.server = index;
        if (!server.up) {
          req.lostToDown = true;
          this.fail(req);
        }
        else if (server.busy < APP_WORKERS) this.startApp(server, req);
        else if (server.queue.length < APP_QUEUE) server.queue.push(req);
        else this.fail(req);
        return;
      }
      case "app": {
        const server = event.server;
        if (server.epoch !== event.epoch) return; // the server died or was removed; the request already failed
        server.busy--;
        server.active.delete(event.req);
        const next = server.queue.shift();
        if (next) this.startApp(server, next);
        const req = event.req;
        if (this.config.cache && req.read) {
          req.path.push("cache");
          this.heap.push({ t: this.now + this.exp(CACHE_SERVICE_MS), kind: "cache", req });
        } else {
          this.toDb(req);
        }
        return;
      }
      case "cache": {
        const hit = this.rng() < CACHE_HIT_RATE;
        this.cacheLookups.push({ t: this.now, hit });
        if (hit) this.complete(event.req);
        else this.toDb(event.req);
        return;
      }
      case "db": {
        this.db.busy--;
        const next = this.db.queue.shift();
        if (next) {
          this.db.busy++;
          this.heap.push({ t: this.now + this.lognormal(DB_SERVICE_MS), kind: "db", req: next });
        }
        this.complete(event.req);
        return;
      }
    }
  }

  /** Advances simulated time by `dt` ms and returns the requests that finished meanwhile. */
  step(dt: number): Finished[] {
    const end = this.now + dt;
    while (this.heap.size > 0 && this.heap.peek()!.t <= end) {
      const event = this.heap.pop()!;
      this.now = event.t;
      this.handle(event);
    }
    this.now = end;

    // Smoothed utilization, sampled once per step.
    const alpha = Math.min(1, dt / 400);
    for (const server of this.servers) {
      const load = server.up ? (server.busy + server.queue.length * 0.5) / APP_WORKERS : 0;
      server.util += (Math.min(1, load) - server.util) * alpha;
    }
    const dbLoad = (this.db.busy + this.db.queue.length * 0.5) / DB_CONNECTIONS;
    this.db.util += (Math.min(1, dbLoad) - this.db.util) * alpha;

    const cutoff = this.now - WINDOW_MS;
    while (this.done.length > 0 && this.done[0].t < cutoff) this.done.shift();
    while (this.cacheLookups.length > 0 && this.cacheLookups[0].t < cutoff) this.cacheLookups.shift();

    const out = this.finished;
    this.finished = [];
    return out;
  }

  metrics(): Metrics {
    const span = Math.min(WINDOW_MS, this.now) / 1000 || 1;
    const ok = this.done.filter((d) => d.ok);
    const latencies = ok.map((d) => d.latency).sort((a, b) => a - b);
    const hits = this.cacheLookups.filter((c) => c.hit).length;
    return {
      p50: percentile(latencies, 0.5),
      p99: percentile(latencies, 0.99),
      throughput: ok.length / span,
      errorRate: this.done.length ? (this.done.length - ok.length) / this.done.length : 0,
      appUtilization: this.servers.map((s) => s.util),
      serverUp: this.servers.map((s) => s.up),
      dbUtilization: this.db.util,
      cacheHitRate: this.cacheLookups.length ? hits / this.cacheLookups.length : 0,
      failuresAt: {
        down: this.done.filter((d) => d.cause === "down").length,
        app: this.done.filter((d) => d.cause === "app").length,
        db: this.done.filter((d) => d.cause === "db").length,
      },
    };
  }
}

/** One plain-language line about the current state, for the hint under the controls. */
export function diagnose(m: Metrics, config: SimConfig): string {
  const anyDown = m.serverUp.some((up) => !up);
  const upCount = m.serverUp.filter(Boolean).length;
  if (m.errorRate > 0.01) {
    const { down, app, db } = m.failuresAt;
    if (down >= app && down >= db) {
      return "A server is down. Requests routed to it fail until the health check takes it out of rotation.";
    }
    if (db > app) {
      return config.cache
        ? "The database is saturated even with the cache. Ease off the traffic."
        : "The database is the bottleneck now. Turn on the cache.";
    }
    if (anyDown) {
      const survivors = upCount === 1 ? "The one remaining server can't" : `The ${upCount} remaining servers can't`;
      return `${survivors} keep up. Restart the dead one or add another.`;
    }
    return m.serverUp.length < 4
      ? "The app servers are saturated and shedding requests. Add a server."
      : "Every app server is saturated. Ease off the traffic.";
  }
  if (m.p99 > 150) return "No errors yet, but queues are building and the p99 is climbing.";
  if (anyDown) return "One server is down, and the others are absorbing its traffic.";
  if (config.rate < 300) return "Healthy. Push the traffic up and find the first bottleneck.";
  return "Healthy at this load. Keep pushing, or kill a server and watch what happens.";
}

export type Health = "healthy" | "strained" | "failing";

/** Utilization above this marks a component as strained (the UI turns it amber). */
export const STRAIN_UTIL = 0.7;
/** Once strained, utilization has to fall below this to read healthy again, so the state doesn't flicker. */
const RECOVER_UTIL = 0.62;

/**
 * The system's health, for the heat plate under the simulator and the status readout.
 * Failing: a server is down or more than 1% of requests fail. Strained: a component is above
 * 70% busy or the p99 is past 150 ms. `previous` adds hysteresis so the state holds steady
 * near a threshold instead of flickering.
 */
export function assessHealth(m: Metrics, previous: Health = "healthy"): Health {
  if (m.serverUp.some((up) => !up) || m.errorRate > 0.01) return "failing";
  // Errors drain out of the 3-second window gradually; only leave "failing" once they're clearly gone.
  if (previous === "failing" && m.errorRate > 0.004) return "failing";
  const busiest = Math.max(m.dbUtilization, ...m.appUtilization);
  const limit = previous === "healthy" ? STRAIN_UTIL : RECOVER_UTIL;
  if (busiest > limit || m.p99 > 150) return "strained";
  return "healthy";
}
