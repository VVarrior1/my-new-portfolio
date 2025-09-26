import { BlogPreview } from "@/components/blog-preview";
import { ContactCard } from "@/components/contact-card";
import { EducationCard } from "@/components/education-card";
import { ExperienceTimeline } from "@/components/experience-timeline";
import { Hero } from "@/components/hero";
import { Navbar } from "@/components/navbar";
import { ProjectGrid } from "@/components/project-grid";
import { SectionHeading } from "@/components/section-heading";
import { SkillMarquee } from "@/components/skill-marquee";
import { SkillsGrid } from "@/components/skills-grid";

const sections = [
  { id: "about", label: "About" },
  { id: "skills", label: "Skills" },
  { id: "experience", label: "Experience" },
  { id: "projects", label: "Projects" },
  { id: "blog", label: "Blog" },
  { id: "contact", label: "Contact" },
];

export default function Home() {
  const year = new Date().getFullYear();
  return (
    <div className="relative text-white">
      <Navbar sections={sections} />
      <main className="relative mx-auto flex min-h-screen max-w-5xl flex-col gap-24 px-6 pb-24 pt-12 sm:px-8">
        <Hero />
        <SkillMarquee />

        <section id="skills" className="space-y-8">
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

        <section id="experience" className="space-y-8">
          <SectionHeading
            eyebrow="Experience"
            title="Building across founders, Big Tech, and ML stacks"
            kicker={
              <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs uppercase tracking-[0.3em] text-white/70">
                2024 – Present
              </span>
            }
          />
          <ExperienceTimeline />
        </section>

        <section id="projects" className="space-y-8">
          <SectionHeading
            eyebrow="Selected Work"
            title="Projects with measurable impact"
            kicker={
              <span className="rounded-full border border-emerald-300/60 bg-emerald-300/10 px-3 py-1 text-xs uppercase tracking-[0.3em] text-emerald-100/80">
                AI + full-stack builds
              </span>
            }
          />
          <ProjectGrid />
        </section>

        <section id="blog" className="space-y-8">
          <SectionHeading
            eyebrow="Writing"
            title="Notes from the field"
            kicker={
              <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs uppercase tracking-[0.3em] text-white/70">
                Lessons learned shipping
              </span>
            }
          />
          <BlogPreview />
        </section>

        <section
          id="contact"
          className="grid gap-6 lg:grid-cols-[2fr_1fr] lg:items-start"
        >
          <div className="space-y-8">
            <SectionHeading
              eyebrow="Let’s talk"
              title="Ready for AI-first product teams"
              kicker={
                <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs uppercase tracking-[0.3em] text-white/70">
                  Calgary · Remote friendly
                </span>
              }
            />
            <p className="text-white/75">
              Whether it’s launching AI agents, scaling full-stack platforms, or
              improving model performance, I love partnering with teams that
              move fast and ship thoughtfully. Let’s explore how I can help.
            </p>
            <div className="grid gap-5 sm:grid-cols-2">
              <EducationCard />
              <a
                href="/Abdelrahman_Mohamed_Resume.pdf"
                download
                className="flex items-center justify-center rounded-3xl border border-white/10 bg-white/5 px-6 py-8 text-center text-sm uppercase tracking-[0.3em] text-white/70 transition duration-200 hover:-translate-y-1 hover:border-emerald-300 hover:text-white"
              >
                Download Résumé
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
