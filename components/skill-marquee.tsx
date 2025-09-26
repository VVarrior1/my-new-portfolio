import { skillCategories } from "@/lib/content";

const marqueeItems = skillCategories.flatMap((category) => category.items);

export function SkillMarquee() {
  const duplicated = [...marqueeItems, ...marqueeItems];

  return (
    <div className="relative overflow-hidden rounded-full border border-white/10 bg-white/5 py-3">
      <div className="pointer-events-none absolute inset-y-0 left-0 w-24 bg-gradient-to-r from-slate-950 via-slate-950 to-transparent" />
      <div className="pointer-events-none absolute inset-y-0 right-0 w-24 bg-gradient-to-l from-slate-950 via-slate-950 to-transparent" />
      <div className="marquee flex gap-4">
        {duplicated.map((item, index) => (
          <span
            key={`${item}-${index}`}
            className="rounded-full border border-emerald-400/30 bg-emerald-400/10 px-4 py-1 text-xs uppercase tracking-[0.2em] text-emerald-100/80"
          >
            {item}
          </span>
        ))}
      </div>
    </div>
  );
}
