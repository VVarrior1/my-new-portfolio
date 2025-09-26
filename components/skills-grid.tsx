import { skillCategories } from "@/lib/content";

export function SkillsGrid() {
  return (
    <div className="grid gap-4 sm:grid-cols-3">
      {skillCategories.map((category) => (
        <section
          key={category.name}
          className="rounded-3xl border border-white/10 bg-white/5 p-6 text-white/80 transition duration-200 hover:-translate-y-1 hover:border-emerald-300/50 hover:bg-emerald-400/10"
        >
          <h3 className="text-lg font-semibold text-white">{category.name}</h3>
          <ul className="mt-4 space-y-2 text-sm">
            {category.items.map((item) => (
              <li key={item} className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-300" aria-hidden />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
