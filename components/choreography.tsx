"use client";

import { useEffect } from "react";
import { getReadout, subscribeReadout, type Readout } from "@/lib/sim-readout";
import { setSmoothScroller } from "@/lib/smooth-scroll";

/**
 * The home page's scroll choreography. Scroll is the timeline: every effect here is tied to the
 * scroll position and plays backwards when you scroll back up.
 *
 * - The title card sinks back and dims while the sheet carrying the simulator slides over it.
 * - A volt packet rides the spine at the middle of the screen; the wire behind it is inked and each
 *   station lights as the packet reaches it (a project frame then "loads").
 * - Section titles rise out of their masks, screenshots unfold from the corner the spine reaches,
 *   figures count up, the experience strip draws itself and lights the role you're reading, and the
 *   contact console assembles from its parts, its key lighting when the packet arrives.
 * - Lenis smooths wheel scrolling (touch stays native).
 *
 * Progressive enhancement: everything is readable before this runs. GSAP, ScrollTrigger and Lenis
 * (~50 KB gzipped) load only after the page's load event and the intro animation, so they never
 * compete with first paint, and nothing loads at all under prefers-reduced-motion. The spine's
 * geometry is placed in every mode, so the static drawing is right too.
 */
export function Choreography() {
  useEffect(() => {
    const sheet = document.querySelector<HTMLElement>("[data-sheet]");
    const trunk = document.querySelector<HTMLElement>("[data-spine]");
    if (!sheet || !trunk) return;

    // The trunk runs from the origin station (the simulator) to the end station (the console).
    const placeSpine = () => {
      const origin = sheet.querySelector<HTMLElement>('[data-station="origin"]');
      const end = sheet.querySelector<HTMLElement>('[data-station="end"]');
      if (!origin || !end) return;
      const box = sheet.getBoundingClientRect();
      trunk.style.setProperty("--spine-top", `${Math.round(origin.getBoundingClientRect().top - box.top)}px`);
      trunk.style.setProperty("--spine-bottom", `${Math.round(box.bottom - end.getBoundingClientRect().top)}px`);
      trunk.setAttribute("data-placed", "");
    };
    placeSpine();
    const resize = new ResizeObserver(placeSpine);
    resize.observe(sheet);

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
    let teardown: (() => void) | undefined;
    let cancelled = false;

    const start = async () => {
      if (cancelled || reduce.matches || teardown) return;
      // Let the CSS intro finish first, so nothing is measured while the sheet is still rising.
      await Promise.all(sheet.getAnimations().map((animation) => animation.finished.catch(() => undefined)));
      // And never take over mid-scroll: ScrollTrigger's first measurement would stop a smooth scroll
      // (an early click on a nav link, or a fling) where it is.
      await scrollIdle();
      const [{ gsap }, { ScrollTrigger }, { default: Lenis }] = await Promise.all([
        import("gsap"),
        import("gsap/ScrollTrigger"),
        import("lenis"),
      ]);
      if (cancelled || reduce.matches) return;
      teardown = choreograph({ gsap, ScrollTrigger, Lenis, sheet, trunk, placeSpine });
    };

    let idle = 0;
    const kick = () => {
      idle = typeof window.requestIdleCallback === "function" ? window.requestIdleCallback(() => void start(), { timeout: 1200 }) : window.setTimeout(() => void start(), 200);
    };
    if (document.readyState === "complete") kick();
    else window.addEventListener("load", kick, { once: true });

    const onReduceChange = () => {
      if (reduce.matches) {
        teardown?.();
        teardown = undefined;
      } else void start();
    };
    reduce.addEventListener("change", onReduceChange);

    return () => {
      cancelled = true;
      window.removeEventListener("load", kick);
      if (typeof window.cancelIdleCallback === "function") window.cancelIdleCallback(idle);
      reduce.removeEventListener("change", onReduceChange);
      resize.disconnect();
      teardown?.();
    };
  }, []);

  // The packet and its cable tag: route, then the simulator's p99 (or 503 while it's failing).
  return (
    <span className="spine-rider" aria-hidden="true" data-packet>
      {/* SVG text: the tag changes as you scroll, and SVG text never registers as a layout shift. It
          runs up the left side of the wire, so the wire never shows through the gaps between words. */}
      <svg className="rider-label" width="16" height="288" viewBox="0 0 16 288" aria-hidden="true">
        <text transform="translate(13 286) rotate(-90)" className="rider-text">
          <tspan data-method>GET</tspan> <tspan data-route>/</tspan> <tspan data-latency />
        </text>
      </svg>
      <span className="rider-capsule" data-capsule />
    </span>
  );
}

type Gsap = typeof import("gsap").gsap;
type ScrollTriggerType = typeof import("gsap/ScrollTrigger").ScrollTrigger;
type LenisType = typeof import("lenis").default;

function choreograph({
  gsap,
  ScrollTrigger,
  Lenis,
  sheet,
  trunk,
  placeSpine,
}: {
  gsap: Gsap;
  ScrollTrigger: ScrollTriggerType;
  Lenis: LenisType;
  sheet: HTMLElement;
  trunk: HTMLElement;
  placeSpine: () => void;
}) {
  gsap.registerPlugin(ScrollTrigger);
  ScrollTrigger.config({ ignoreMobileResize: true });
  const root = document.documentElement;
  root.dataset.motion = "";

  // Smooth wheel scrolling. Touch scrolling stays native (Lenis leaves it alone by default).
  const lenis = new Lenis({ lerp: 0.085, smoothWheel: true, autoRaf: false });
  lenis.on("scroll", ScrollTrigger.update);
  const raf = (time: number) => lenis.raf(time * 1000);
  gsap.ticker.add(raf);
  gsap.ticker.lagSmoothing(0);
  // force: the command menu calls this while its dialog still holds the scroll lock.
  setSmoothScroller((target, offset) => lenis.scrollTo(target, { offset, duration: 1.15, easing: easeOutExpo, force: true }));

  // Modal dialogs lock the page; Lenis must stop with them or it keeps scrolling the page behind.
  const lockObserver = new MutationObserver(() => {
    if (document.body.hasAttribute("data-scroll-locked")) lenis.stop();
    else lenis.start();
  });
  lockObserver.observe(document.body, { attributes: true, attributeFilter: ["data-scroll-locked"] });

  // In-page links glide instead of jumping. Runs before Next's Link handler, which then stands down.
  const onClick = (event: MouseEvent) => {
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    const anchor = (event.target as Element | null)?.closest?.("a[href]") as HTMLAnchorElement | null;
    if (!anchor || anchor.target === "_blank") return;
    const url = new URL(anchor.href, window.location.href);
    if (url.origin !== window.location.origin || url.pathname !== window.location.pathname || !url.hash) return;
    const target = document.getElementById(decodeURIComponent(url.hash.slice(1)));
    if (!target) return;
    event.preventDefault();
    lenis.scrollTo(target, { offset: -64, duration: 1.15, easing: easeOutExpo });
    if (window.location.hash !== url.hash) window.history.pushState(window.history.state, "", url.hash);
  };
  document.addEventListener("click", onClick, true);

  const packet = document.querySelector<HTMLElement>("[data-packet]");
  const placePacket = () => {
    if (packet) packet.style.left = `${trunk.getBoundingClientRect().left + 1}px`;
  };
  const onRefreshInit = () => {
    placeSpine();
    placePacket();
  };
  ScrollTrigger.addEventListener("refreshInit", onRefreshInit);
  placePacket();

  const routeUpdates: Array<() => void> = [];

  // The simulator's health, carried by every request on the page. While the simulator is off screen it
  // pauses; the packet keeps the last state it reported, so a system you broke stays broken.
  const methodEl = packet?.querySelector<HTMLElement>("[data-method]");
  const latencyEl = packet?.querySelector<HTMLElement>("[data-latency]");
  const showHealth = (readout: Readout) => {
    if (!packet || readout.state === "paused" || readout.state === "idle") return;
    packet.dataset.state = readout.state;
    if (methodEl) methodEl.textContent = readout.state === "failing" ? "503" : "GET";
    if (latencyEl) latencyEl.textContent = readout.p99 === null ? "" : `· ${formatLatency(readout.p99)}`;
  };
  showHealth(getReadout());
  const unsubscribe = subscribeReadout(() => showHealth(getReadout()));

  const ctx = gsap.context(() => {
    const all = <T extends Element>(selector: string, scope: ParentNode = document) => Array.from(scope.querySelectorAll<T>(selector));

    // 1. The title card sinks back as the sheet slides over it.
    const card = document.querySelector<HTMLElement>("[data-title-card]");
    if (card) {
      gsap.to(card, {
        y: () => sheet.offsetTop * 0.5,
        scale: 0.94,
        opacity: 0.2,
        transformOrigin: "50% 0%",
        ease: "none",
        scrollTrigger: { start: 0, end: () => sheet.offsetTop, scrub: true, invalidateOnRefresh: true },
      });
    }

    // 2. The spine: the inked wire grows behind the packet, which rides at the middle of the screen.
    const lit = trunk.querySelector<HTMLElement>(".spine-lit");
    if (lit) {
      gsap.fromTo(
        lit,
        { scaleY: 0 },
        {
          scaleY: 1,
          ease: "none",
          scrollTrigger: {
            trigger: trunk,
            start: "top center",
            end: "bottom center",
            scrub: true,
            onToggle: (self) => packet?.toggleAttribute("data-on", self.isActive),
          },
        },
      );
    }
    // The packet stretches with speed and settles when the page stops; big titles lean into the scroll.
    const capsule = packet?.querySelector<HTMLElement>("[data-capsule]");
    const stretch = capsule ? gsap.quickTo(capsule, "scaleY", { duration: 0.35, ease: "power3.out" }) : null;
    const lean = all<HTMLElement>(".t-section, .t-title").map((title) => gsap.quickTo(title, "skewY", { duration: 0.5, ease: "power3.out" }));
    lenis.on("scroll", ({ velocity }: { velocity: number }) => {
      const v = Math.max(-40, Math.min(40, velocity));
      stretch?.(1 + Math.abs(v) / 40);
      for (const set of lean) set(v * -0.04);
    });

    // The tag names the route of the last station passed, and reports the simulator's health.
    const stations = all<HTMLElement>(".station[data-route]");
    const routeEl = packet?.querySelector<HTMLElement>("[data-route]");
    const updateRoute = () => {
      const passed = stations.filter((station) => station.hasAttribute("data-lit"));
      if (routeEl) routeEl.textContent = passed.length ? (passed[passed.length - 1].dataset.route ?? "/") : "/";
    };
    routeUpdates.push(updateRoute);

    // 3. Stations light when the packet reaches them.
    for (const station of all<HTMLElement>('.station:not([data-station="origin"])')) {
      ScrollTrigger.create({
        trigger: station,
        start: "top center",
        end: "max",
        onEnter: () => {
          station.setAttribute("data-lit", "");
          for (const update of routeUpdates) update();
        },
        onLeaveBack: () => {
          station.removeAttribute("data-lit");
          for (const update of routeUpdates) update();
        },
      });
    }

    // 4. Titles: letters rise out of their word masks, and drop back when you scroll up past them.
    for (const title of all<HTMLElement>(".reveal-title")) {
      gsap.from(title.querySelectorAll(".split-ch"), {
        yPercent: 112,
        duration: 1,
        ease: "expo.out",
        stagger: 0.022,
        scrollTrigger: { trigger: title, start: "top 88%", toggleActions: "play none none reverse" },
      });
    }

    // 5. Screenshots unfold from the corner the spine reaches, and the image settles inside the frame.
    for (const stage of all<HTMLElement>(".shot-stage")) {
      const timeline = gsap.timeline({
        scrollTrigger: { trigger: stage, start: "top 95%", end: "top 32%", scrub: true },
      });
      timeline
        .fromTo(stage, { clipPath: "inset(0% 26% 30% 0% round 20px)" }, { clipPath: "inset(0% 0% 0% 0% round 12px)", ease: "none" }, 0)
        .fromTo(stage, { y: 80, scale: 0.84 }, { y: 0, scale: 1, transformOrigin: "0% 0%", ease: "none" }, 0)
        .fromTo(all("img", stage), { scale: 1.16 }, { scale: 1, ease: "none" }, 0);

      // The address bar loads once the packet has reached the frame.
      const load = stage.querySelectorAll<HTMLElement>(".shot-load");
      if (load.length) {
        const run = gsap.timeline({ paused: true });
        run
          .fromTo(load, { scaleX: 0, opacity: 1 }, { scaleX: 1, duration: 0.9, ease: "power2.inOut" })
          .to(load, { opacity: 0, duration: 0.4 }, "+=0.15");
        ScrollTrigger.create({
          trigger: stage,
          start: "top center",
          end: "max",
          onEnter: () => run.restart(),
          onLeaveBack: () => run.pause(0),
        });
      }
    }

    // 6. Figures count up when they scroll in.
    for (const count of all<HTMLElement>("[data-count]")) {
      const target = Number(count.dataset.count);
      const decimals = (count.dataset.count?.split(".")[1] ?? "").length;
      const runner = count.querySelector<HTMLElement>("[data-run]");
      if (!runner || !Number.isFinite(target)) continue;
      const state = { value: 0 };
      const tween = gsap.to(state, {
        value: target,
        duration: 1.5,
        ease: "power3.out",
        paused: true,
        onStart: () => count.setAttribute("data-counting", ""),
        onUpdate: () => {
          runner.textContent = `${count.dataset.prefix ?? ""}${state.value.toFixed(decimals)}${count.dataset.suffix ?? ""}`;
        },
        onComplete: () => count.removeAttribute("data-counting"),
      });
      ScrollTrigger.create({
        trigger: count,
        start: "top 88%",
        end: "max",
        onEnter: () => tween.restart(),
        onLeaveBack: () => {
          tween.pause(0);
          count.removeAttribute("data-counting");
        },
      });
    }

    // 7. Experience: the strip draws itself, then lights the role you're reading (laptops, where it's pinned).
    const experience = document.querySelector<HTMLElement>("[data-experience]");
    const strip = experience?.querySelector<HTMLElement>(".span-strip");
    if (experience && strip) {
      const timeline = gsap.timeline({ scrollTrigger: { trigger: strip, start: "top 88%", end: "top 45%", scrub: true } });
      timeline
        .fromTo(all(".span-bar", strip), { scaleX: 0 }, { scaleX: 1, transformOrigin: "left center", ease: "none", stagger: 0.08 }, 0)
        .fromTo(all(".span-now", strip), { scaleY: 0 }, { scaleY: 1, transformOrigin: "50% 0%", ease: "none" }, 0.3);

      const mm = gsap.matchMedia();
      mm.add("(min-width: 1024px)", () => {
        const rows = all<HTMLElement>("[data-role]", experience);
        const show = (index: number | null) => {
          if (index === null) delete strip.dataset.active;
          else strip.dataset.active = String(index);
          for (const lane of all<HTMLElement>("[data-lane]", strip)) lane.toggleAttribute("data-on", lane.dataset.lane === String(index));
        };
        for (const row of rows) {
          ScrollTrigger.create({
            trigger: row,
            start: "top 62%",
            end: "bottom 62%",
            onToggle: (self) => {
              if (self.isActive) show(Number(row.dataset.role));
              else if (strip.dataset.active === row.dataset.role) show(null);
            },
          });
        }
        return () => show(null);
      });
    }

    // 8. The tools board: the tags set down row by row.
    const tools = document.querySelector<HTMLElement>("[data-tools]");
    if (tools) {
      gsap.from(all(".keycap", tools), {
        y: 18,
        opacity: 0,
        duration: 0.7,
        ease: "power3.out",
        stagger: 0.012,
        scrollTrigger: { trigger: tools, start: "top 82%", toggleActions: "play none none reverse" },
      });
    }

    // 9. The contact console assembles from its parts, and its key lights when the packet arrives.
    const contact = document.querySelector<HTMLElement>("[data-contact]");
    const consoleEl = contact?.querySelector<HTMLElement>("[data-console]");
    if (contact && consoleEl) {
      const timeline = gsap.timeline({ scrollTrigger: { trigger: contact, start: "top 96%", end: "top 52%", scrub: true } });
      timeline
        .fromTo(consoleEl, { scale: 0.9, y: 90, borderRadius: 48 }, { scale: 1, y: 0, borderRadius: 20, ease: "none" }, 0)
        .fromTo(all("[data-part]", consoleEl), { y: (i: number) => 70 + i * 26, opacity: 0 }, { y: 0, opacity: 1, ease: "none", stagger: 0.05 }, 0.1)
        .fromTo(
          consoleEl.querySelector("[data-portrait]"),
          { clipPath: "inset(100% 0% 0% 0% round 12px)", x: 40 },
          { clipPath: "inset(0% 0% 0% 0% round 12px)", x: 0, ease: "none" },
          0.15,
        );

      const key = consoleEl.querySelector<HTMLElement>("[data-terminal]");
      const end = contact.querySelector<HTMLElement>('[data-station="end"]');
      if (key && end) {
        key.setAttribute("data-await", "");
        ScrollTrigger.create({
          trigger: end,
          start: "top center",
          end: "max",
          onEnter: () => {
            key.removeAttribute("data-await");
            gsap.fromTo(key, { scale: 0.92 }, { scale: 1, duration: 0.8, ease: "elastic.out(1, 0.45)", clearProps: "scale" });
          },
          onLeaveBack: () => key.setAttribute("data-await", ""),
        });
      }
    }
  });

  // Fonts change line heights; re-measure once they're in.
  void document.fonts?.ready.then(() => ScrollTrigger.refresh());

  return () => {
    unsubscribe();
    ctx.revert();
    ScrollTrigger.removeEventListener("refreshInit", onRefreshInit);
    document.removeEventListener("click", onClick, true);
    lockObserver.disconnect();
    gsap.ticker.remove(raf);
    setSmoothScroller(null);
    lenis.destroy();
    packet?.removeAttribute("data-on");
    for (const element of document.querySelectorAll("[data-await]")) element.removeAttribute("data-await");
    delete root.dataset.motion;
  };
}

/** Resolves once the page hasn't scrolled for 200 ms. */
function scrollIdle() {
  return new Promise<void>((resolve) => {
    let timer = window.setTimeout(done, 200);
    function onScroll() {
      window.clearTimeout(timer);
      timer = window.setTimeout(done, 200);
    }
    function done() {
      window.removeEventListener("scroll", onScroll);
      resolve();
    }
    window.addEventListener("scroll", onScroll, { passive: true });
  });
}

const formatLatency = (ms: number) => (ms >= 1000 ? `${(ms / 1000).toFixed(1)} s` : `${Math.round(ms)} ms`);

const easeOutExpo = (t: number) => (t === 1 ? 1 : 1 - Math.pow(2, -10 * t));
