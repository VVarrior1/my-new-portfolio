import Link from "next/link";
import { RESUME_PATH, profile } from "@/lib/content";
import { SimStatus } from "./sim-status";

export function SiteFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-rule">
      <div className="wrap flex flex-col gap-5 py-10 text-[0.875rem] text-graphite md:flex-row md:items-center md:justify-between">
        <p>
          © {year} {profile.name}
        </p>
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:gap-8">
          <SimStatus />
          <ul className="flex flex-wrap gap-x-5 gap-y-2">
            <li>
              <a href={profile.github} target="_blank" rel="noreferrer" data-track="github" className="transition-colors hover:text-ink">
                GitHub ↗<span className="sr-only"> (opens in a new tab)</span>
              </a>
            </li>
            <li>
              <a href={profile.linkedin} target="_blank" rel="noreferrer" data-track="linkedin" className="transition-colors hover:text-ink">
                LinkedIn ↗<span className="sr-only"> (opens in a new tab)</span>
              </a>
            </li>
            <li>
              <a href={RESUME_PATH} className="transition-colors hover:text-ink">
                Résumé
              </a>
            </li>
            <li>
              <Link href="/stats" className="transition-colors hover:text-ink">
                Site stats
              </Link>
            </li>
          </ul>
        </div>
      </div>
    </footer>
  );
}
