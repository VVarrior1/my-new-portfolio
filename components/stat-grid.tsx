import { stats } from "@/lib/content";

export function StatGrid() {
  return (
    <dl className="grid gap-4 sm:grid-cols-3">
      {stats.map((item) => (
        <div
          key={item.label}
          className="rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur transition hover:-translate-y-1 hover:border-emerald-400/50"
        >
          <dt className="text-sm uppercase tracking-[0.2em] text-white/60">
            {item.label}
          </dt>
          <dd className="mt-3 text-4xl font-semibold text-white">{item.value}</dd>
        </div>
      ))}
    </dl>
  );
}
