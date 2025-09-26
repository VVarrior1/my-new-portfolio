import Link from "next/link";
import { experiences } from "@/lib/content";

export function ExperienceTimeline() {
  return (
    <ol className="relative space-y-10 border-l border-white/10 pl-6">
      {experiences.map((experience) => (
        <li key={`${experience.company}-${experience.role}`} className="relative pl-6">
          <span className="absolute -left-[27px] top-1 h-3 w-3 rounded-full border-2 border-emerald-300 bg-slate-950 shadow-[0_0_25px_rgba(16,185,129,0.7)]" />
          <div className="rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur transition duration-200 hover:-translate-y-1 hover:border-emerald-300/60">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm uppercase tracking-[0.3em] text-emerald-300/90">
                  {experience.start} – {experience.end}
                </p>
                <h3 className="mt-2 text-2xl font-semibold text-white">
                  {experience.role}
                </h3>
                <p className="text-white/70">
                  {experience.link ? (
                    <Link
                      href={experience.link}
                      target="_blank"
                      rel="noreferrer"
                      className="underline decoration-emerald-300/50 decoration-2 underline-offset-4 hover:text-white"
                    >
                      {experience.company}
                    </Link>
                  ) : (
                    experience.company
                  )}
                  {" — "}
                  {experience.location}
                </p>
              </div>
            </div>
            <ul className="mt-4 space-y-3 text-white/80">
              {experience.bullets.map((bullet) => (
                <li key={bullet} className="flex gap-2">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-300" aria-hidden />
                  <span>{bullet}</span>
                </li>
              ))}
            </ul>
          </div>
        </li>
      ))}
    </ol>
  );
}
