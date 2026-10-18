import type { Metadata } from "next";
import { Suspense } from "react";
import { DailyChart, type DayPoint } from "@/components/daily-chart";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { PageHeader } from "@/components/page-header";
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
      <h2 className="t-item">{caption}</h2>
      {rows.length === 0 ? (
        <p className="mt-3 text-ink-2">Nothing recorded yet.</p>
      ) : (
        <table className="mt-3 w-full table-fixed text-left text-[0.9375rem]">
          <thead>
            <tr className="t-mono border-b border-rule text-graphite">
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
                <th scope="row" className="truncate py-2.5 pr-4 font-normal" title={name}>
                  {name}
                </th>
                {values.map((value, i) => (
                  <td key={i} className="py-2.5 pl-4 text-right font-mono text-[0.875rem] tabular-nums">
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

  // A fresh deploy (or a local run without the bucket) has nothing yet: say so calmly instead of
  // showing four zeros over an empty chart.
  const empty =
    analytics.totalViews === 0 &&
    analytics.totalUniqueViews === 0 &&
    monthViews === 0 &&
    resumeOpens === 0 &&
    Object.keys(analytics.events).length === 0;

  const figures = [
    { value: analytics.totalViews, label: "page views, all time" },
    { value: analytics.totalUniqueViews, label: "distinct visitors" },
    { value: monthViews, label: "views in the last 30 days" },
    { value: resumeOpens, label: "times the résumé was opened" },
  ];

  return (
    <>
      <SiteHeader />
      <main id="main" className="mx-auto w-full max-w-[88rem] px-4 pb-24 pt-12 sm:px-8 sm:pt-20">
        <PageHeader
          title="Site stats"
          lead="Counted by this site itself, with no third-party trackers. Crawlers and link previews are left out, and a visitor is a browser, identified by a first-party cookie. Numbers update about once a minute."
        >
          <Suspense fallback={null}>
            <TrackingNotice />
          </Suspense>
        </PageHeader>

        {empty ? (
          <section aria-labelledby="empty-title" className="panel mt-14 px-5 py-8 sm:px-8 sm:py-10">
            <p className="t-mono flex items-center gap-2 text-graphite">
              <span className="size-1.5 rounded-full bg-rule-strong" aria-hidden="true" />
              waiting for the first visit
            </p>
            <h2 id="empty-title" className="t-item mt-3">
              Nothing counted yet
            </h2>
            <p className="measure mt-2 text-ink-2">
              Visits show up here about a minute after they happen: page views, distinct visitors, the posts people read and the
              links they click. Until then there is nothing worth charting.
            </p>
          </section>
        ) : (
          <>
            {/* The headline numbers, between two hairlines on the paper. Only the chart below is a screen. */}
            <dl className="mt-14 grid grid-cols-2 gap-x-6 border-y border-rule lg:grid-cols-4">
              {figures.map((figure, i) => (
                <div key={figure.label} className={`flex flex-col-reverse justify-end py-4 sm:py-5 ${i >= 2 ? "border-t border-rule lg:border-t-0" : ""}`}>
                  <dt className="t-mono mt-1.5 text-graphite">{figure.label}</dt>
                  <dd className="text-[2.5rem] font-[620] leading-none tracking-[-0.02em] tabular-nums [font-stretch:108%]">{fmt(figure.value)}</dd>
                </div>
              ))}
            </dl>

            <section aria-labelledby="daily-title" className="mt-14">
              <h2 id="daily-title" className="t-item">
                Page views per day, last 30 days
              </h2>
              <p className="t-mono mt-1 text-graphite">
                {historyStart
                  ? `Days are in UTC. Daily history starts ${formatDateLong(historyStart)}; totals above go back further.`
                  : "Daily history starts with the next visit; totals above go back further."}
              </p>
              <div className="screen mt-6 px-3 pb-3 pt-4 sm:px-5 sm:pt-5">
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
          </>
        )}

        <p className="measure mt-16 text-[0.9375rem] leading-relaxed text-ink-2">
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
