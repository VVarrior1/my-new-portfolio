"use client";

import { useEffect, useState } from "react";

// A tuner for the liquid, opened with ?tune on the home page. It changes the live constants
// (components/liquid-field.tsx) and the marbling tokens (app/globals.css) in this tab only, so a
// feel can be found by hand and then copied into the code. Not linked from anywhere.

type Knob = { key: string; label: string; min: number; max: number; step: number; kind: "tune" | "css" };

const KNOBS: Knob[] = [
  { key: "parallax", label: "pool parallax", min: 0, max: 1.2, step: 0.02, kind: "tune" },
  { key: "scrollStir", label: "scroll stir", min: 0, max: 3, step: 0.05, kind: "tune" },
  { key: "drip", label: "drips and weather", min: 0, max: 3, step: 0.05, kind: "tune" },
  { key: "refract", label: "image refraction", min: 0, max: 4, step: 0.1, kind: "tune" },
  { key: "--fluid-fill", label: "ink fill", min: 0, max: 1.5, step: 0.02, kind: "css" },
  { key: "--fluid-lines", label: "contour lines", min: 0, max: 1.5, step: 0.02, kind: "css" },
  { key: "--fluid-steps", label: "lines per dye", min: 1, max: 16, step: 0.5, kind: "css" },
];

export function TunePanel() {
  const [values, setValues] = useState<Record<string, number>>({});

  useEffect(() => {
    const read = () => {
      const tune = (window.__liquidTune ?? {}) as Record<string, number>;
      const css = getComputedStyle(document.documentElement);
      const next: Record<string, number> = {};
      for (const k of KNOBS) next[k.key] = k.kind === "tune" ? (tune[k.key] ?? 0) : parseFloat(css.getPropertyValue(k.key)) || 0;
      setValues(next);
    };
    const t = window.setTimeout(read, 1500);
    return () => window.clearTimeout(t);
  }, []);

  const set = (knob: Knob, value: number) => {
    setValues((v) => ({ ...v, [knob.key]: value }));
    if (knob.kind === "tune") {
      const tune = window.__liquidTune as Record<string, number> | undefined;
      if (tune) tune[knob.key] = value;
    } else {
      document.documentElement.style.setProperty(knob.key, String(value));
      window.__liquidRecolor?.();
    }
  };

  const copy = () => {
    const text = KNOBS.map((k) => `${k.key}: ${values[k.key]}`).join("\n");
    void navigator.clipboard?.writeText(text);
  };

  return (
    <aside className="fixed bottom-4 left-4 z-[300] w-64 rounded-2xl border border-rule bg-paper/90 p-4 text-ink shadow-[var(--elevation)] backdrop-blur-xl" aria-label="Liquid tuner">
      <p className="t-mono mb-3 text-graphite">tune the liquid</p>
      {KNOBS.map((knob) => (
        <label key={knob.key} className="mb-2 block">
          <span className="t-mono flex justify-between text-[0.75rem] text-ink-2">
            {knob.label}
            <span>{values[knob.key]?.toFixed(2)}</span>
          </span>
          <input
            type="range"
            min={knob.min}
            max={knob.max}
            step={knob.step}
            value={values[knob.key] ?? 0}
            onChange={(e) => set(knob, Number(e.target.value))}
            className="w-full accent-[var(--signal)]"
          />
        </label>
      ))}
      <button type="button" onClick={copy} className="key key-sm mt-2">
        copy values
      </button>
    </aside>
  );
}
