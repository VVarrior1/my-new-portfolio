"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";

// The pointer-only layers (the HUD and the cursor) load as their own chunk, after hydration and
// only where they can show: phones, touch screens and reduced motion never download them. Phones
// and tablets get the small HUD instead (titles flying into a bar under the header), with motion.
const Hud = dynamic(() => import("./hud").then((m) => m.Hud), { ssr: false });
const Cursor = dynamic(() => import("./cursor").then((m) => m.Cursor), { ssr: false });
const TunePanel = dynamic(() => import("./tune-panel").then((m) => m.TunePanel), { ssr: false });
const MobileHud = dynamic(() => import("./mobile-hud").then((m) => m.MobileHud), { ssr: false });

export function PageFx() {
  const [fine, setFine] = useState(false);
  const [small, setSmall] = useState(false);
  const [tune, setTune] = useState(false);
  useEffect(() => {
    setTune(new URLSearchParams(window.location.search).has("tune"));
    const q = window.matchMedia("(pointer: fine) and (prefers-reduced-motion: no-preference)");
    const s = window.matchMedia("(prefers-reduced-motion: no-preference) and (max-width: 1023px), (prefers-reduced-motion: no-preference) and (pointer: coarse)");
    const update = () => {
      setFine(q.matches);
      setSmall(s.matches);
    };
    update();
    q.addEventListener("change", update);
    s.addEventListener("change", update);
    return () => {
      q.removeEventListener("change", update);
      s.removeEventListener("change", update);
    };
  }, []);
  return (
    <>
      {fine && <Hud />}
      {fine && <Cursor />}
      {small && <MobileHud />}
      {tune && <TunePanel />}
    </>
  );
}
