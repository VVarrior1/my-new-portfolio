import type { Experience } from "@/lib/content";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** "May 2025" → months since year 0. "Now" → today, as a fractional month. */
function toMonths(label: string, now: Date): number {
  if (label === "Now") {
    const days = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0)).getUTCDate();
    return now.getUTCFullYear() * 12 + now.getUTCMonth() + (now.getUTCDate() - 1) / days;
  }
  const [month, year] = label.split(" ");
  return Number(year) * 12 + MONTHS.indexOf(month);
}

/**
 * The experience section's object: one lane per role on a raised track, from the first role to
 * the month full-time work can start, so the overlaps (school, a capstone, contracts and CYD at
 * once) read at a glance. Server-rendered, no JavaScript. It repeats the list below it, so it is
 * hidden from assistive technology.
 */
export function SpanStrip({ jobs, until }: { jobs: Experience[]; until: string }) {
  const now = new Date();
  const starts = jobs.map((job) => toMonths(job.start, now));
  const axisStart = Math.min(...starts);
  const axisEnd = toMonths(until, now);
  const span = axisEnd - axisStart;
  const at = (months: number) => `${(((months - axisStart) / span) * 100).toFixed(3)}%`;
  const nowAt = toMonths("Now", now);
  const firstYear = Math.ceil(axisStart / 12);
  const lastYear = Math.floor(axisEnd / 12);
  const years = Array.from({ length: lastYear - firstYear + 1 }, (_, i) => firstYear + i);

  return (
    <div aria-hidden="true" className="lg:grid lg:grid-cols-12 lg:gap-x-6">
      {/* Lane labels, aligned to the lanes inside the track. Below lg they sit on the lanes instead,
          above each bar, so a two-line name can never drift away from its bar. */}
      <ul className="hidden py-2.5 lg:col-span-3 lg:block">
        {jobs.map((job) => (
          <li
            key={`${job.company}-${job.start}`}
            className={`t-mono flex h-8 items-center leading-[1.15] ${job.end === "Now" ? "text-ink" : "text-ink-2"}`}
          >
            {job.company}
          </li>
        ))}
      </ul>

      <div className="min-w-0 lg:col-span-9">
        <div className="relative rounded-xl border border-rule bg-paper-raised py-2.5 shadow-[var(--panel-highlight)]">
          {/* Year lines, then the "now" cursor: cobalt, because it is the present. */}
          {years.map((year) =>
            year * 12 > axisStart && year * 12 < axisEnd ? (
              <span key={year} className="absolute inset-y-0 w-px bg-rule" style={{ left: at(year * 12) }} />
            ) : null,
          )}
          <span className="absolute inset-y-0 w-px bg-signal-text" style={{ left: at(nowAt) }} />
          <ul className="relative">
            {jobs.map((job) => {
              const start = toMonths(job.start, now);
              const current = job.end === "Now";
              // A role runs to the end of its last month; the current one runs to today.
              const end = current ? nowAt : toMonths(job.end, now) + 1;
              // A label that starts late on the axis hangs from the bar's end instead, so it stays on the track.
              const late = (start - axisStart) / span > 0.6;
              const first = start === axisStart;
              return (
                <li key={`${job.company}-${job.start}`} className="relative h-11 lg:h-8">
                  <span
                    className={`t-mono absolute top-1 whitespace-nowrap leading-4 lg:hidden ${current ? "text-ink" : "text-ink-2"} ${late ? "-translate-x-full" : ""} ${first ? "pl-2" : ""}`}
                    style={{ left: late ? at(end) : at(start) }}
                  >
                    {job.company}
                  </span>
                  <span
                    className={`absolute h-1.5 rounded-full max-lg:bottom-2.5 lg:top-1/2 lg:-translate-y-1/2 ${current ? "bg-signal" : "bg-ink"}`}
                    style={{ left: at(start), width: `calc(${at(end)} - ${at(start)})` }}
                  />
                  {current && (
                    <span
                      className="absolute size-2.5 -translate-x-1/2 rounded-full border-2 border-paper-raised bg-signal max-lg:bottom-2 lg:top-1/2 lg:-translate-y-1/2"
                      style={{ left: at(end) }}
                    />
                  )}
                </li>
              );
            })}
          </ul>
        </div>

        {/* The axis: the first month, the years, today, and the year full-time work starts. */}
        <div className="t-mono relative mt-2 h-5 text-graphite">
          <span className="absolute left-0 max-lg:hidden">
            {MONTHS[axisStart % 12]} {Math.floor(axisStart / 12)}
          </span>
          {years.map((year) =>
            year * 12 > axisStart && year * 12 < axisEnd ? (
              <span key={year} className="absolute -translate-x-1/2" style={{ left: at(year * 12) }}>
                {year}
              </span>
            ) : null,
          )}
          <span className="absolute -translate-x-1/2 text-signal-text" style={{ left: at(nowAt) }}>
            now
          </span>
          <span className="absolute right-0 max-lg:hidden">{Math.floor(axisEnd / 12)}</span>
        </div>
      </div>
    </div>
  );
}
