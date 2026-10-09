"use client";

import { useState } from "react";
import type { TraceStep } from "@/lib/content";

export function SystemTrace({ steps }: { steps: TraceStep[] }) {
  const [run, setRun] = useState(0);

  return (
    <figure className="rounded-xl border border-rule bg-paper-raised/60 p-5 sm:p-6">
      <figcaption className="mb-4 flex items-start justify-between gap-4">
        <span className="text-[0.95rem] leading-[1.3rem] text-graphite">
          One family signing up on cydsoccer.com. I built and run every step.
        </span>
        <button
          type="button"
          onClick={() => setRun((value) => value + 1)}
          className="shrink-0 rounded-md border border-rule px-2.5 py-1 text-sm font-medium transition-colors hover:border-ink"
        >
          Replay
        </button>
      </figcaption>

      <ol key={run} className="trace">
        {steps.map((step, index) => (
          <li key={index} className="trace-step" style={{ "--i": index } as React.CSSProperties}>
            <span className="trace-dot" aria-hidden="true" />
            <span className="trace-service font-mono text-[0.8rem] font-medium leading-[1.3rem]">{step.service}</span>
            <span className="text-[0.95rem] leading-[1.3rem] text-graphite">{step.detail}</span>
          </li>
        ))}
      </ol>
    </figure>
  );
}
