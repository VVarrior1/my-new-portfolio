import Link from "next/link";
import { projects } from "@/lib/content";

export function ProjectGrid() {
  return (
    <div className="grid gap-6 sm:grid-cols-2">
      {projects.map((project) => (
        <article
          key={project.name}
          className="group relative flex h-full flex-col justify-between overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-white/10 via-white/5 to-transparent p-6 backdrop-blur transition duration-300 hover:-translate-y-1 hover:border-emerald-300/60"
        >
          <div className="pointer-events-none absolute inset-0 opacity-0 transition duration-300 group-hover:opacity-100">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(16,185,129,0.35),transparent_65%)]" />
            <div className="pattern-grid opacity-20" />
          </div>
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-2xl font-semibold text-white">{project.name}</h3>
              {project.link && (
                <Link
                  href={project.link}
                  target="_blank"
                  rel="noreferrer"
                  className="text-sm text-emerald-300 transition hover:text-emerald-200"
                >
                  {project.link.includes("github.com") ? "GitHub ↗" : "Visit ↗"}
                </Link>
              )}
            </div>
            <p className="text-sm uppercase tracking-[0.2em] text-white/60">
              Tech stack
            </p>
            <div className="flex flex-wrap gap-2">
              {project.tech.map((tech) => (
                <span
                  key={tech}
                  className="rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs uppercase tracking-[0.2em] text-white/70"
                >
                  {tech}
                </span>
              ))}
            </div>
            <p className="text-white/80">{project.description}</p>
          </div>
          <ul className="mt-6 space-y-3 text-white/70">
            {project.highlights.map((highlight) => (
              <li key={highlight} className="flex gap-2">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-300" aria-hidden />
                <span>{highlight}</span>
              </li>
            ))}
          </ul>
        </article>
      ))}
    </div>
  );
}
