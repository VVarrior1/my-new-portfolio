import type { Experience } from "@/lib/content";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** "May 2025" -> a month count; "Now" -> the current month. */
function monthIndex(label: string, now: Date): number {
  if (label === "Now") return now.getFullYear() * 12 + now.getMonth();
  const [month, year] = label.split(" ");
  return Number(year) * 12 + MONTHS.indexOf(month);
}

export const roleSlug = (company: string) => company.toLowerCase().replace(/[^a-z0-9]+/g, "-");

type Bar = { slug: string; company: string; start: number; end: number; row: number; current: boolean };

/** Rows of non-overlapping roles, first fit in start order, so overlaps stack instead of colliding. */
function stack(experience: Experience[], now: Date): Bar[] {
  const bars = experience
    .map((job) => ({
      slug: roleSlug(job.company),
      company: job.company,
      start: monthIndex(job.start, now),
      end: monthIndex(job.end, now),
      current: job.end === "Now",
      row: 0,
    }))
    .sort((a, b) => a.start - b.start);
  const rowEnds: number[] = [];
  for (const bar of bars) {
    let row = rowEnds.findIndex((end) => bar.start > end);
    if (row === -1) row = rowEnds.push(bar.end) - 1;
    else rowEnds[row] = bar.end;
    bar.row = row;
  }
  return bars;
}

const ROW = 30;
const AXIS = 30;

/**
 * Fig. 4: every role on one year ruler. Static; hovering a bar lights up its row in the list
 * below, and hovering a row lights up its bar (pure CSS, see the rules this writes).
 */
export function RoleTimeline({ experience, figure }: { experience: Experience[]; figure: number }) {
  const now = new Date();
  const bars = stack(experience, now);
  const first = Math.min(...bars.map((bar) => bar.start));
  const last = Math.max(...bars.map((bar) => bar.end)) + 2;
  const total = last - first + 1;
  const at = (month: number) => `${((month - first) / total) * 100}%`;
  const rows = Math.max(...bars.map((bar) => bar.row)) + 1;
  const ticks: number[] = [];
  const nowMonth = monthIndex("Now", now) + 1;
  // Every January and July, except where the "now" label would sit on top of one.
  for (let month = first; month <= last; month++) if (month % 6 === 0 && Math.abs(month - nowMonth) > 1) ticks.push(month);
  const oldest = experience[experience.length - 1];

  const css =
    "[data-bar]:hover{--bar-opacity:1}" +
    bars
    .map(
      ({ slug }) =>
        `#experience:has([data-bar="${slug}"]:hover) [data-row="${slug}"]::before{opacity:1}` +
        `#experience:has([data-bar="${slug}"]:hover) [data-row="${slug}"] h3{color:var(--signal)}` +
        `#experience:has([data-row="${slug}"]:hover) [data-bar="${slug}"]{--bar-opacity:1}` +
        `#experience:has([data-row="${slug}"]:hover) [data-bar="${slug}"] span{color:var(--ink)}`,
    )
    .join("");

  return (
    <figure className="mb-12 hidden md:block">
      <style dangerouslySetInnerHTML={{ __html: css }} />
      <figcaption className="mb-4 flex items-baseline gap-3">
        <span className="t-meta text-ink">Fig. {figure}</span>
        <span className="t-caption text-graphite">
          {experience.length} roles, {oldest.start} to now
        </span>
      </figcaption>
      <div className="relative" style={{ height: rows * ROW + AXIS }} aria-hidden="true">
        {bars.map((bar) => (
          <div
            key={bar.slug}
            data-bar={bar.slug}
            className="group absolute"
            style={{ left: at(bar.start), width: at(first + (bar.end + 1 - bar.start)), top: bar.row * ROW, height: ROW }}
          >
            <span
              className={`t-caption block whitespace-nowrap leading-[18px] transition-colors group-hover:text-ink ${
                bar.current ? "text-ink" : "text-graphite"
              }`}
            >
              {bar.company}
            </span>
            <div
              className={`mt-[3px] h-1.5 rounded-full transition-opacity ${bar.current ? "bg-signal" : "bg-ink-2"}`}
              style={{ opacity: bar.current ? 1 : "var(--bar-opacity, 0.5)" }}
            />
          </div>
        ))}

        {/* The ruler: a baseline, a tick and label at every January and July, and "now". */}
        <div className="absolute inset-x-0 h-px bg-rule" style={{ top: rows * ROW + 4 }} />
        {ticks.map((month) => (
          <div key={month} className="absolute" style={{ left: at(month), top: rows * ROW + 4 }}>
            <div className="h-[5px] w-px bg-graphite/60" />
            <span className="t-meta absolute left-0 top-[7px] -translate-x-1/2 whitespace-nowrap text-graphite">
              {`${MONTHS[month % 12]} ${Math.floor(month / 12)}`}
            </span>
          </div>
        ))}
        <div className="absolute" style={{ left: at(nowMonth), top: 0, height: rows * ROW + 9 }}>
          <div className="h-full w-px bg-[repeating-linear-gradient(to_bottom,var(--signal)_0_3px,transparent_3px_6px)]" />
          <span className="t-meta absolute left-0 top-full mt-[2px] -translate-x-1/2 text-signal">now</span>
        </div>
      </div>
    </figure>
  );
}
