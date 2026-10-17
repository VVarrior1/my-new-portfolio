import Link from "next/link";
import { RESUME_PATH, profile } from "@/lib/content";
import { SoundToggle } from "./sound-toggle";

export function SiteFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="ruled">
      <div className="t-caption mx-auto flex max-w-[76rem] flex-col gap-4 px-4 py-10 text-graphite sm:flex-row sm:items-center sm:justify-between sm:px-8">
        <p className="dot-list">
          <span>
            © {year} {profile.name}
          </span>
          <span>Next.js</span>
          <span>Netlify</span>
        </p>
        <ul className="dot-list dot-list-stack gap-y-2">
          <li>
            <a href={profile.github} target="_blank" rel="noreferrer" className="transition-colors hover:text-ink">
              GitHub <span aria-hidden="true">↗</span>
              <span className="sr-only"> (opens in a new tab)</span>
            </a>
          </li>
          <li>
            <a href={profile.linkedin} target="_blank" rel="noreferrer" className="transition-colors hover:text-ink">
              LinkedIn <span aria-hidden="true">↗</span>
              <span className="sr-only"> (opens in a new tab)</span>
            </a>
          </li>
          <li>
            <a href={RESUME_PATH} className="transition-colors hover:text-ink" data-track="resume-download">
              Résumé
            </a>
          </li>
          <li>
            <Link href="/stats" className="transition-colors hover:text-ink">
              Site stats
            </Link>
          </li>
          <li>
            <SoundToggle />
          </li>
        </ul>
      </div>
    </footer>
  );
}
