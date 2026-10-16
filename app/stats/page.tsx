import type { Metadata } from "next";
import { Suspense } from "react";
import { DailyChart, type DayPoint } from "@/components/daily-chart";
import { PageIntro } from "@/components/page-intro";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { TrackingNotice } from "@/components/tracking-notice";
import { compactIfDue, getFreshAnalytics } from "@/lib/analytics";
import { getAllBlogs } from "@/lib/blogs";
import { formatDateLong } from "@/lib/date-utils";

// Rendered per request: it folds in pending hits first, so the numbers are current.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Site stats",
  description: "Visits to this site, counted by the site itself with no third-party trackers.",
  alternates: { canonical: "/stats" },
};

const PAGE_NAMES: Record<string, string> = {
  "/": "Home",
  "/blogs": "Writing",
  "/gallery": "Gallery",
  "/stats": "Site stats",
};

const EVENT_NAMES: Record<string, string> = {
  "resume-download": "Résumé opened",
  email: "Email link",
  "email-copy": "Email address copied",
  github: "GitHub profile",
  linkedin: "LinkedIn profile",
  "project:cyd-case-study": "CYD case study",
  "project:cyd-live": "cydsoccer.com",
  "project:systemlab-live": "Systemlab demo",
  "project:systemlab-code": "Systemlab code",
  "sim:interact": "Played with the hero simulator",
  "command-menu": "Opened the command menu",
};

function lastDays(daily: Record<string, { views: number; visitors: number }>, count: number): DayPoint[] {
  const today = Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), new Date().getUTCDate());
  return Array.from({ length: count }, (_, i) => {
    const day = new Date(today - (count - 1 - i) * 86_400_000).toISOString().slice(0, 10);
    return { day, views: daily[day]?.views ?? 0, visitors: daily[day]?.visitors ?? 0 };
  });
}

const fmt = (n: number) => n.toLocaleString("en-US");

function Table({ caption, columns, rows }: { caption: string; columns: string[]; rows: Array<[string, ...number[]]> }) {
  return (
    <div>
      <h2 className="text-[1.25rem] font-medium tracking-[-0.01em]">{caption}</h2>
      {rows.length === 0 ? (
        <p className="mt-3 text-graphite">Nothing recorded yet.</p>
      ) : (
        <table className="mt-4 w-full table-fixed text-left text-[0.875rem]">
          <thead>
            <tr className="t-mono border-b border-rule-strong text-graphite">
              {columns.map((column, i) => (
                <th key={column} scope="col" className={`py-2 font-normal ${i > 0 ? "w-[5.5rem] text-right" : ""}`}>
                  {column}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map(([name, ...values]) => (
              <tr key={name} className="border-b border-rule">
                <th scope="row" className="truncate py-2.5 pr-4 font-normal text-ink-2" title={name}>
                  {name}
                </th>
                {values.map((value, i) => (
                  <td key={i} className="t-mono py-2.5 pl-4 text-right tabular-nums text-ink">
                    {fmt(value)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

export default async function StatsPage() {
  await compactIfDue();
  const [analytics, posts] = await Promise.all([getFreshAnalytics(), getAllBlogs()]);
  const titles = new Map(posts.map((post) => [post.slug, post.title]));

  const days = lastDays(analytics.daily, 30);
  const monthViews = days.reduce((sum, d) => sum + d.views, 0);
  const historyStart = Object.keys(analytics.daily).sort()[0];
  const resumeOpens = analytics.events["resume-download"] ?? 0;

  const top = <T,>(list: T[], key: (item: T) => number, n = 8) => [...list].sort((a, b) => key(b) - key(a)).slice(0, n);
  const entries = (record: Record<string, number>) =>
    Object.entries(record)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);

  const figures = [
    { value: analytics.totalViews, label: "page views, all time" },
    { value: analytics.totalUniqueViews, label: "distinct visitors" },
    { value: monthViews, label: "views in the last 30 days" },
    { value: resumeOpens, label: "times the résumé was opened" },
  ];

  return (
    <>
      <SiteHeader />
      <main id="main" className="wrap pb-24 pt-12 sm:pt-20">
        <PageIntro path="/stats" title="Site stats." muted="No trackers.">
          Counted by this site itself. Crawlers and link previews are left out, and a visitor is a browser,
          identified by a first-party cookie. Numbers update about once a minute.
        </PageIntro>
        <Suspense fallback={null}>
          <TrackingNotice />
        </Suspense>

        <dl className="mt-14 grid grid-cols-2 gap-2 lg:mt-20 lg:grid-cols-4">
          {figures.map((figure) => (
            <div key={figure.label} className="rounded-[10px] border border-rule-strong bg-paper-raised px-4 py-4 sm:px-5">
              <dt className="sr-only">{figure.label}</dt>
              <dd>
                <span className="readout block text-ink">{fmt(figure.value)}</span>
                <span className="t-mono mt-2 block text-[0.75rem] text-graphite">{figure.label}</span>
              </dd>
            </div>
          ))}
        </dl>

        <section aria-labelledby="daily-title" className="mt-14">
          <h2 id="daily-title" className="text-[1.25rem] font-medium tracking-[-0.01em]">
            Page views per day, last 30 days
          </h2>
          <p className="mt-1 text-[0.875rem] text-graphite">
            {historyStart
              ? `Days are in UTC. Daily history starts ${formatDateLong(historyStart)}; totals above go back further.`
              : "Daily history starts with the next visit; totals above go back further."}
          </p>
          <div className="mt-6">
            <DailyChart points={days} />
          </div>
          <details className="mt-4">
            <summary className="t-mono cursor-pointer text-graphite hover:text-ink">Show these numbers as a table</summary>
            <div className="mt-4 max-w-md">
              <Table
                caption="Daily views"
                columns={["Day", "Views", "Visitors"]}
                rows={days.filter((d) => d.views > 0).reverse().map((d) => [d.day, d.views, d.visitors])}
              />
            </div>
          </details>
        </section>

        <div className="mt-16 grid gap-14 lg:grid-cols-2">
          <Table
            caption="Pages"
            columns={["Page", "Views", "Visitors"]}
            rows={top(analytics.pages, (p) => p.views).map((p) => [PAGE_NAMES[p.path] ?? p.path, p.views, p.uniqueViews])}
          />
          <Table
            caption="Posts"
            columns={["Post", "Reads", "Readers"]}
            rows={top(analytics.blogs, (b) => b.views).map((b) => [titles.get(b.slug) ?? b.slug, b.views, b.uniqueViews])}
          />
          <Table
            caption="Where visitors come from"
            columns={["Source", "Visits"]}
            rows={entries(analytics.referrers).map(([source, count]) => [source.startsWith("ref:") ? `Link tagged “${source.slice(4)}”` : source, count])}
          />
          <Table
            caption="Links people click"
            columns={["Link", "Clicks"]}
            rows={entries(analytics.events).map(([name, count]) => [EVENT_NAMES[name] ?? name.replace(/^out:/, ""), count])}
          />
        </div>

        <p className="measure mt-16 text-[0.875rem] leading-relaxed text-graphite">
          Don&apos;t want to be counted? Open{" "}
          <a href="/api/analytics/optout" className="link">
            this link
          </a>{" "}
          once and this browser is skipped from then on.{" "}
          <a href="/api/analytics/optout?undo=1" className="link">
            Undo
          </a>
          .
        </p>
      </main>
      <SiteFooter />
    </>
  );
}
