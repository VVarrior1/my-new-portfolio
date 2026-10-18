import Link from "next/link";
import { RESUME_PATH, profile } from "@/lib/content";
import { SoundToggle } from "./sound-toggle";

/** `framed`: lines up with the home page's frame instead of the wider content column. */
export function SiteFooter({ framed = false }: { framed?: boolean }) {
  const year = new Date().getFullYear();

  return (
    <footer className="mt-auto border-t border-rule">
      <div
        className={`t-mono flex flex-col gap-5 py-10 text-graphite sm:flex-row sm:items-center sm:justify-between ${framed ? "wrap" : "mx-auto max-w-[88rem] px-4 sm:px-8"}`}
        data-liquid-protect="0.9"
      >
        <p>
          <span className="text-ink-2">
            © {year} {profile.name}
          </span>
          <span className="px-2" aria-hidden="true">
            ·
          </span>
          Built with Next.js, hosted on Netlify
        </p>
        <ul className="flex flex-wrap gap-x-5 gap-y-2">
          <li>
            <a href={profile.github} target="_blank" rel="noreferrer" className="transition-colors hover:text-ink">
              GitHub ↗<span className="sr-only"> (opens in a new tab)</span>
            </a>
          </li>
          <li>
            <a href={profile.linkedin} target="_blank" rel="noreferrer" className="transition-colors hover:text-ink">
              LinkedIn ↗<span className="sr-only"> (opens in a new tab)</span>
            </a>
          </li>
          <li>
            <a href={RESUME_PATH} className="transition-colors hover:text-ink">
              Résumé PDF
            </a>
          </li>
          <li>
            <Link href="/stats" className="transition-colors hover:text-ink">
              Site stats →
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
