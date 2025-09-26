import { education } from "@/lib/content";

export function EducationCard() {
  return (
    <section className="rounded-3xl border border-white/10 bg-white/5 p-6 text-white transition duration-200 hover:-translate-y-1 hover:border-emerald-300/60">
      <p className="text-xs uppercase tracking-[0.3em] text-emerald-300/80">Education</p>
      <h3 className="mt-3 text-2xl font-semibold">{education.degree}</h3>
      <p className="text-white/70">
        {education.school} · {education.location}
      </p>
      <p className="mt-2 text-sm uppercase tracking-[0.2em] text-white/60">
        Graduating {education.graduation}
      </p>
      <ul className="mt-4 space-y-2 text-white/75">
        {education.highlights.map((highlight) => (
          <li key={highlight} className="flex gap-2 text-sm">
            <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-300" aria-hidden />
            <span>{highlight}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
