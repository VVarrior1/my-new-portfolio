import Link from "next/link";
import { contact, hero } from "@/lib/content";

export function ContactCard() {
  return (
    <div className="rounded-3xl border border-white/10 bg-gradient-to-br from-emerald-400/10 via-transparent to-white/5 p-6 text-white shadow-[0_25px_80px_-50px_rgba(16,185,129,0.8)] transition duration-200 hover:-translate-y-1 hover:border-emerald-300/60">
      <h3 className="text-2xl font-semibold">Let’s build something impactful</h3>
      <p className="mt-3 text-white/75">
        I’m focused on AI-driven products, data science insights, and full-stack platforms that ship tangible value.
        {" "}
        {hero.availability}.
      </p>
      <Link
        href={`mailto:${contact.email}`}
        className="mt-4 inline-flex items-center gap-2 rounded-full border border-emerald-300/60 bg-emerald-300/10 px-5 py-2 text-sm font-medium text-emerald-100 transition hover:bg-emerald-300 hover:text-black"
      >
        Start a project
        <span aria-hidden>↗</span>
      </Link>
      <dl className="mt-6 space-y-4 text-sm">
        <div className="flex flex-col">
          <dt className="uppercase tracking-[0.3em] text-white/50">Email</dt>
          <dd>
            <Link
              href={`mailto:${contact.email}`}
              className="text-base text-emerald-300 hover:text-emerald-200"
            >
              {contact.email}
            </Link>
          </dd>
        </div>
        <div className="flex flex-col">
          <dt className="uppercase tracking-[0.3em] text-white/50">Phone</dt>
          <dd className="text-base text-white/80">{contact.phone}</dd>
        </div>
        <div className="flex flex-col">
          <dt className="uppercase tracking-[0.3em] text-white/50">Location</dt>
          <dd className="text-base text-white/80">{contact.location}</dd>
        </div>
        <div className="flex flex-col gap-2">
          <dt className="uppercase tracking-[0.3em] text-white/50">Links</dt>
          <div className="flex flex-wrap gap-2">
            {contact.socials.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                target={item.href.startsWith("http") ? "_blank" : undefined}
                rel={item.href.startsWith("http") ? "noreferrer" : undefined}
                className="rounded-full border border-white/20 px-4 py-2 text-xs uppercase tracking-[0.2em] text-white/80 transition hover:border-emerald-300 hover:text-white"
              >
                {item.label}
              </Link>
            ))}
          </div>
        </div>
      </dl>
    </div>
  );
}
