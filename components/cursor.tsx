"use client";

import { useEffect, useRef, useState } from "react";
import { onFrame } from "@/lib/ticker";

/**
 * The pointer as a drop of the accent with a ring of ink around it. The drop sits exactly on the
 * pointer; the ring follows like something floating, stretching along the direction you move. Over
 * anything that says what it does (data-cursor="Enlarge", "Open", "Read") the ring swells into a
 * cobalt disc with the word in it; over other links and buttons it opens up; over text fields the
 * native caret comes back. It stirs the liquid like any pointer does (components/liquid-field.tsx).
 * Fine pointers with motion allowed only; everywhere else the native cursor stays.
 */
export function Cursor() {
  const [on, setOn] = useState(false);
  useEffect(() => {
    const q = window.matchMedia("(pointer: fine) and (hover: hover) and (prefers-reduced-motion: no-preference)");
    const update = () => setOn(q.matches);
    update();
    q.addEventListener("change", update);
    return () => q.removeEventListener("change", update);
  }, []);
  return on ? <CursorLayer /> : null;
}

function CursorLayer() {
  const ringRef = useRef<HTMLDivElement>(null);
  const dotRef = useRef<HTMLDivElement>(null);
  const labelRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const ring = ringRef.current;
    const dot = dotRef.current;
    const label = labelRef.current;
    if (!ring || !dot || !label) return;
    const root = document.documentElement;
    const p = { x: -100, y: -100, has: false };
    const r = { x: -100, y: -100 };
    let mode: "" | "link" | "label" | "text" | "rail" = "";
    let down = false;

    const onMove = (e: PointerEvent) => {
      if (e.pointerType === "touch") return;
      p.x = e.clientX;
      p.y = e.clientY;
      if (!p.has) {
        r.x = p.x;
        r.y = p.y;
        p.has = true;
        root.dataset.pointer = "custom";
      }
    };
    const onOver = (e: PointerEvent) => {
      const t = e.target as Element | null;
      if (!t || !t.closest) return;
      const labelled = t.closest<HTMLElement>("[data-cursor]");
      let next: typeof mode = "";
      if (t.closest("input, textarea, select, [contenteditable='true'], [cmdk-input]")) next = "text";
      else if (t.closest(".hud-rail")) next = "rail";
      else if (labelled) next = "label";
      else if (t.closest("a, button, [role='button'], [role='slider'], [role='switch'], [role='option'], label, .hud-q")) next = "link";
      if (next === "label" && labelled) label.textContent = labelled.dataset.cursor ?? "";
      if (next !== mode) {
        mode = next;
        ring.dataset.mode = mode;
        dot.dataset.mode = mode;
      }
    };
    const onLeave = () => {
      p.has = false;
      ring.style.opacity = "0";
      dot.style.opacity = "0";
    };
    const onDown = () => (down = true);
    const onUp = () => (down = false);
    window.addEventListener("pointermove", onMove, { passive: true });
    document.addEventListener("pointerover", onOver, { passive: true });
    document.documentElement.addEventListener("pointerleave", onLeave);
    window.addEventListener("pointerdown", onDown, { passive: true });
    window.addEventListener("pointerup", onUp, { passive: true });

    const bands = () => Array.from(document.querySelectorAll<HTMLElement>('[data-chapter="invert"]')).map((el) => el.getBoundingClientRect());
    let lastInvert = false;

    const off = onFrame((fr) => {
      if (!p.has) return;
      const k = 1 - Math.exp(-fr.dt * (mode === "label" ? 14 : 18));
      const dx = p.x - r.x;
      const dy = p.y - r.y;
      r.x += dx * k;
      r.y += dy * k;
      const speed = Math.hypot(dx, dy);
      const stretch = mode === "label" ? 1 : Math.min(1.7, 1 + speed / 90);
      const angle = Math.atan2(dy, dx);
      const scale = down ? 0.82 : 1;
      ring.style.opacity = mode === "text" ? "0" : "1";
      dot.style.opacity = mode === "text" ? "0" : "1";
      ring.style.transform = `translate3d(${r.x.toFixed(1)}px,${r.y.toFixed(1)}px,0) rotate(${angle.toFixed(3)}rad) scale(${(stretch * scale).toFixed(3)},${(scale / Math.sqrt(stretch)).toFixed(3)}) rotate(${(-angle).toFixed(3)}rad)`;
      dot.style.transform = `translate3d(${p.x.toFixed(1)}px,${p.y.toFixed(1)}px,0)`;
      const invert = bands().some((b) => p.y > b.top && p.y < b.bottom);
      if (invert !== lastInvert) {
        lastInvert = invert;
        ring.toggleAttribute("data-x", invert);
      }
    }, 40);

    return () => {
      off();
      window.removeEventListener("pointermove", onMove);
      document.removeEventListener("pointerover", onOver);
      document.documentElement.removeEventListener("pointerleave", onLeave);
      window.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointerup", onUp);
      delete root.dataset.pointer;
    };
  }, []);

  return (
    <div aria-hidden="true">
      <div ref={ringRef} className="cursor-ring">
        <span ref={labelRef} className="cursor-label" />
      </div>
      <div ref={dotRef} className="cursor-dot" />
    </div>
  );
}
