"use client";

import Link from "next/link";
import { education, hero } from "@/lib/content";
import { StatGrid } from "./stat-grid";
import { Typewriter } from "./typewriter";

export function Hero() {
  return (
    <section
      id="about"
      className="relative isolate overflow-hidden scroll-mt-32 rounded-[48px] border border-white/10 bg-gradient-to-br from-white/10 via-black/40 to-black/80 px-8 pb-12 pt-14 text-white shadow-[0_30px_120px_-50px_rgba(16,185,129,0.6)]"
    >
      <div className="absolute inset-0 -z-10 opacity-60">
        <div className="pattern-grid" />
      </div>
      <div className="absolute -left-32 top-10 h-64 w-64 rounded-full bg-emerald-400/20 blur-3xl" aria-hidden />
      <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
        <div className="max-w-2xl space-y-6">
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-400/30 bg-emerald-400/10 px-4 py-1 text-xs uppercase tracking-[0.3em] text-emerald-100/80 transition hover:border-emerald-300">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-300" aria-hidden />
            {hero.location}
          </div>
          <div className="flex flex-wrap items-center gap-3 text-sm text-emerald-100/80">
            <Link
              href={hero.spotlight.href ?? "#"}
              target={hero.spotlight.href?.startsWith("http") ? "_blank" : undefined}
              rel={hero.spotlight.href?.startsWith("http") ? "noreferrer" : undefined}
              className="group inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1 text-xs uppercase tracking-[0.3em] text-white/70 transition hover:border-emerald-300 hover:text-white"
            >
              <span className="text-emerald-300">●</span>
              {hero.spotlight.label}
              {hero.spotlight.href && (
                <span className="translate-x-0 text-emerald-200 transition group-hover:translate-x-0.5">
                  ↗
                </span>
              )}
            </Link>
          </div>
          <p className="text-sm uppercase tracking-[0.4em] text-emerald-200/80">
            {hero.availability}
          </p>
          <h1 className="text-4xl font-semibold sm:text-5xl lg:text-6xl">
            {hero.name}
          </h1>
          <h2 className="text-lg sm:text-xl text-emerald-200/90">{hero.title}</h2>
          <p className="text-base text-white/75 sm:text-lg">{hero.summary}</p>
          <div className="flex flex-wrap items-center gap-2 text-sm text-white/70">
            <span className="rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs uppercase tracking-[0.3em] text-white/60">
              Education
            </span>
            <span>
              {education.degree}, {education.school} · Graduating {education.graduation}
            </span>
          </div>
          <div className="rounded-2xl border border-emerald-400/40 bg-black/30 p-4 font-mono text-sm text-emerald-200/80 shadow-[0_15px_60px_-30px_rgba(16,185,129,0.7)]">
            <div className="mb-3 flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-emerald-300/70">
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-emerald-400" />
                terminal
              </span>
              <span>~/build</span>
            </div>
            <Typewriter lines={hero.typewriterLines} />
          </div>
          <div className="flex flex-wrap gap-3">
            {hero.actions.map((action) => {
              const isExternal = action.href.startsWith("http");

              return (
                <Link
                  key={action.href}
                  href={action.href}
                  target={isExternal ? "_blank" : undefined}
                  rel={isExternal ? "noreferrer" : undefined}
                  download={action.download}
                  className="rounded-full border border-emerald-300/60 px-5 py-2 text-sm font-medium text-emerald-200 transition hover:bg-emerald-300 hover:text-black focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300/70 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900"
                >
                  {action.label}
                </Link>
              );
            })}
          </div>
        </div>
      </div>
      <div className="mt-10">
        <StatGrid />
      </div>
    </section>
  );
}
