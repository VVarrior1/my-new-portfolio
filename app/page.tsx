import { ContactCard } from "@/components/contact-card";
import { EducationCard } from "@/components/education-card";
import { ExperienceTimeline } from "@/components/experience-timeline";
import { Hero } from "@/components/hero";
import { Navbar } from "@/components/navbar";
import { ProjectGrid } from "@/components/project-grid";
import { SectionHeading } from "@/components/section-heading";
import { SkillMarquee } from "@/components/skill-marquee";
import { SkillsGrid } from "@/components/skills-grid";
import { PageTracker } from "@/components/page-tracker";
import { AnalyticsDisplay } from "@/components/analytics-display";
import Link from "next/link";

const sections = [
  { id: "about", label: "About" },
  { id: "skills", label: "Skills" },
  { id: "experience", label: "Experience" },
  { id: "projects", label: "Projects" },
  { id: "gallery", label: "Gallery", href: "/gallery" },
  { id: "blog", label: "Blog", href: "/blogs" },
  { id: "contact", label: "Contact" },
];

export default async function Home() {
  const year = new Date().getFullYear();

  return (
    <div className="relative text-white">
      <PageTracker path="/" />
      <Navbar sections={sections} />
      <main className="relative mx-auto flex min-h-screen max-w-5xl flex-col gap-24 px-6 pb-24 pt-12 sm:px-8">
        <Hero />
        <SkillMarquee />

        <section id="skills" className="space-y-8 scroll-mt-32">
          <SectionHeading
            eyebrow="Capabilities"
            title="Technical toolkit"
            kicker={
              <span className="rounded-full border border-emerald-300/60 bg-emerald-300/10 px-3 py-1 text-xs uppercase tracking-[0.3em] text-emerald-100/80">
                End-to-end delivery
              </span>
            }
          />
          <SkillsGrid />
        </section>

        <section id="experience" className="space-y-8 scroll-mt-32">
          <SectionHeading
            eyebrow="Experience"
            title="Turning ideas into shipped product and code"
            kicker={
              <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs uppercase tracking-[0.3em] text-white/70">
                2024 – Present
              </span>
            }
          />
          <ExperienceTimeline />
        </section>

        <section id="projects" className="space-y-8 scroll-mt-32">
          <SectionHeading
            eyebrow="Selected Work"
            title="Projects with measurable impact"
            kicker={
              <span className="rounded-full border border-emerald-300/60 bg-emerald-300/10 px-3 py-1 text-xs uppercase tracking-[0.3em] text-emerald-100/80">
                AI · data science · software builds
              </span>
            }
          />
          <ProjectGrid />
        </section>

        <section className="space-y-8 scroll-mt-32">
          <SectionHeading
            eyebrow="More"
            title="Explore beyond the portfolio"
            kicker={
              <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs uppercase tracking-[0.3em] text-white/70">
                Gallery & Writing
              </span>
            }
          />
          <div className="grid gap-6 sm:grid-cols-2">
            <Link
              href="/gallery"
              className="group relative overflow-hidden rounded-3xl border border-white/10 bg-white/5 p-8 backdrop-blur transition duration-300 hover:-translate-y-1 hover:border-emerald-300/60"
            >
              <div className="pointer-events-none absolute inset-0 opacity-0 transition duration-300 group-hover:opacity-100">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(16,185,129,0.25),transparent_65%)]" />
              </div>
              <div className="relative space-y-3">
                <h3 className="text-2xl font-semibold text-white">Gallery</h3>
                <p className="text-sm text-white/70">
                  Lifestyle snapshots with the occasional launch highlight
                </p>
                <div className="inline-flex items-center gap-2 text-sm font-medium text-emerald-300 transition group-hover:gap-3">
                  View Gallery
                  <span aria-hidden>↗</span>
                </div>
              </div>
            </Link>

            <Link
              href="/blogs"
              className="group relative overflow-hidden rounded-3xl border border-white/10 bg-white/5 p-8 backdrop-blur transition duration-300 hover:-translate-y-1 hover:border-emerald-300/60"
            >
              <div className="pointer-events-none absolute inset-0 opacity-0 transition duration-300 group-hover:opacity-100">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(16,185,129,0.25),transparent_65%)]" />
              </div>
              <div className="relative space-y-3">
                <h3 className="text-2xl font-semibold text-white">Writing</h3>
                <p className="text-sm text-white/70">
                  Essays on AI, data science, product velocity, and building in public
                </p>
                <div className="inline-flex items-center gap-2 text-sm font-medium text-emerald-300 transition group-hover:gap-3">
                  Read Posts
                  <span aria-hidden>↗</span>
                </div>
              </div>
            </Link>
          </div>
        </section>

        <section className="space-y-8 scroll-mt-32">
          <SectionHeading
            eyebrow="Portfolio Analytics"
            title="Live visitor stats"
            kicker={
              <span className="flex items-center gap-2 rounded-full border border-emerald-300/60 bg-emerald-300/10 px-3 py-1 text-xs uppercase tracking-[0.3em] text-emerald-100/80">
                <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" />
                Live
              </span>
            }
          />
          <AnalyticsDisplay />
        </section>

        <section
          id="contact"
          className="grid gap-6 scroll-mt-32 lg:grid-cols-[2fr_1fr] lg:items-start"
        >
          <div className="space-y-8">
            <SectionHeading
              eyebrow="Let’s talk"
              title="Ready for AI, data science, and software teams"
              kicker={
                <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs uppercase tracking-[0.3em] text-white/70">
                  Calgary · Remote friendly
                </span>
              }
            />
            <p className="text-white/75">
              Whether it’s launching AI agents, building production analytics, or
              scaling full-stack platforms, I love partnering with teams that
              move fast and ship thoughtfully. Let’s explore how I can help.
            </p>
            <div className="grid gap-5 sm:grid-cols-2">
              <EducationCard />
              <a
                href="/Abdelrahman_Mohamed_Resume.pdf"
                download
                className="group flex h-full flex-col gap-3 rounded-3xl border border-white/10 bg-white/5 p-6 text-white/70 transition duration-200 hover:-translate-y-1 hover:border-emerald-300/60 hover:bg-white/10"
              >
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-semibold text-white">Résumé</h3>
                  <span className="rounded-full border border-white/15 bg-white/5 px-2 py-0.5 text-[0.65rem] uppercase tracking-[0.3em] text-white/60">
                    PDF
                  </span>
                </div>
                <p className="text-sm text-white/60">Download the latest copy.</p>
                <span className="inline-flex items-center gap-2 text-sm font-medium text-emerald-200 transition group-hover:gap-3">
                  Download
                  <span aria-hidden>↗</span>
                </span>
              </a>
            </div>
          </div>
          <ContactCard />
        </section>
      </main>
      <footer className="border-t border-white/10 bg-black/40 py-6 text-center text-xs text-white/60">
        © {year} Abdelrahman Mohamed. Crafted with Next.js,
        TypeScript, and a love for thoughtful products.
      </footer>
    </div>
  );
}
