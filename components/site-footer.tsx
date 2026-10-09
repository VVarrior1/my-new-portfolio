import Link from "next/link";
import { getAnalytics } from "@/lib/analytics";
import { RESUME_PATH, profile } from "@/lib/content";

export async function SiteFooter() {
  const analytics = await getAnalytics();
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-rule">
      <div className="mx-auto flex max-w-[76rem] flex-col gap-6 px-4 py-10 text-[0.95rem] text-graphite sm:flex-row sm:items-center sm:justify-between sm:px-8">
        <p>
          © {year} {profile.name}. Built with Next.js, hosted on Netlify.
        </p>
        <ul className="flex flex-wrap gap-x-5 gap-y-2">
          <li>
            <a href={profile.github} className="hover:text-ink">GitHub</a>
          </li>
          <li>
            <a href={profile.linkedin} className="hover:text-ink">LinkedIn</a>
          </li>
          <li>
            <a href={RESUME_PATH} className="hover:text-ink">Résumé</a>
          </li>
          <li>
            <Link href="/stats" className="hover:text-ink">
              {analytics.totalViews > 0 ? `${analytics.totalViews.toLocaleString("en-US")} visits` : "Site stats"}
            </Link>
          </li>
        </ul>
      </div>
    </footer>
  );
}
