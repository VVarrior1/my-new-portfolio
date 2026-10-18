"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";

// The pointer-only layers (the HUD and the cursor) load as their own chunk, after hydration and
// only where they can show: phones, touch screens and reduced motion never download them.
const Hud = dynamic(() => import("./hud").then((m) => m.Hud), { ssr: false });
const Cursor = dynamic(() => import("./cursor").then((m) => m.Cursor), { ssr: false });

export function PageFx() {
  const [fine, setFine] = useState(false);
  useEffect(() => {
    const q = window.matchMedia("(pointer: fine) and (prefers-reduced-motion: no-preference)");
    const update = () => setFine(q.matches);
    update();
    q.addEventListener("change", update);
    return () => q.removeEventListener("change", update);
  }, []);
  if (!fine) return null;
  return (
    <>
      <Hud />
      <Cursor />
    </>
  );
}
