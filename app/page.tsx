import Image from "next/image";
import Link from "next/link";
import { GithubMark, LinkedinMark } from "@/components/brand-icons";
import { CopyEmail } from "@/components/copy-email";
import { DotList } from "@/components/dot-list";
import { LiveSystem } from "@/components/live-system";
import { ProjectShot } from "@/components/project-shot";
import { Section } from "@/components/section";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { getAllBlogs } from "@/lib/blogs";
import {
  RESUME_PATH,
  education,
  experience,
  featured,
  otherProjects,
  profile,
  skills,
  type Link as ContentLink,
} from "@/lib/content";
import { formatDate } from "@/lib/date-utils";
import { excerpt } from "@/lib/text";

export const revalidate = 300;

const pad = (n: number) => String(n).padStart(2, "0");

/** Ink links with a quiet underline; external ones get ↗. */
function ExternalLinks({ links }: { links: ContentLink[] }) {
  if (links.length === 0) return null;
  return (
    <ul className="flex flex-wrap gap-x-6 gap-y-2 text-[0.875rem] font-medium">
      {links.map((link) => (
        <li key={link.href}>
          <a href={link.href} target="_blank" rel="noreferrer" data-track={link.track} className="link">
            {link.label} ↗<span className="sr-only"> (opens in a new tab)</span>
          </a>
        </li>
      ))}
    </ul>
  );
}

/** A vertical hairline in the 24px gutter left of a grid cell, so dividers snap to the columns. */
const mdRule = "md:relative md:before:absolute md:before:-left-3 md:before:inset-y-0 md:before:w-px md:before:bg-rule";
const lgRule = "lg:relative lg:before:absolute lg:before:-left-3 lg:before:inset-y-0 lg:before:w-px lg:before:bg-rule";

export default async function Home() {
  const posts = await getAllBlogs();

  return (
    <>
      <SiteHeader />
      <main id="main">
        {/* Hero. The simulator is the loudest thing on the first screen, on its heat plate. */}
        <section aria-labelledby="hero-name" className="overflow-x-clip">
          <div className="wrap pb-12 pt-8 sm:pt-12 lg:pb-16 lg:pt-12">
            <h1 id="hero-name" className="t-name">
              {profile.name}
            </h1>

            {/* Left: what I do, the recruiter facts, then the actions. Right: the personal line, alone. */}
            <div className="mt-4 grid lg:grid-cols-12 lg:gap-x-6">
              <div className="lg:col-span-6">
                <p className="max-w-[36rem] text-[1.125rem] leading-[1.5] text-ink-2 sm:text-[1.25rem]">{profile.tagline}</p>
                <p className="t-mono mt-4 flex items-baseline gap-2.5 text-ink">
                  <span aria-hidden="true" className="size-1.5 shrink-0 -translate-y-px rounded-full bg-go" />
                  <DotList items={profile.facts} />
                </p>
                <div className="mt-6 flex flex-wrap items-center gap-2">
                  <a href={`mailto:${profile.email}`} className="btn btn-key" data-track="email">
                    Email me
                  </a>
                  <a href={RESUME_PATH} className="btn btn-ghost bg-paper" data-track="resume-download">
                    Résumé
                  </a>
                  <a
                    href={profile.github}
                    className="btn btn-ghost btn-icon bg-paper"
                  target="_blank"
                  rel="noreferrer"
                    data-track="github"
                    aria-label="GitHub (opens in a new tab)"
                    title="GitHub"
                  >
                    <GithubMark className="size-[18px]" />
                  </a>
                  <a
                    href={profile.linkedin}
                    className="btn btn-ghost btn-icon bg-paper"
                    target="_blank"
                    rel="noreferrer"
                    data-track="linkedin"
                    aria-label="LinkedIn (opens in a new tab)"
                    title="LinkedIn"
                  >
                    <LinkedinMark className="size-[17px]" />
                  </a>
                </div>
              </div>
              <p className="hidden max-w-[28rem] pt-1 text-[1rem] leading-[1.6] text-graphite lg:col-span-5 lg:col-start-8 lg:block">
                {profile.personal}
              </p>
            </div>

            <div id="play" className="mt-10 scroll-mt-24 lg:mt-12">
              <LiveSystem className="-mx-2 sm:mx-0 xl:-mx-6" />
            </div>

            <p className="mt-20 max-w-[34rem] text-[1rem] leading-[1.6] text-graphite lg:hidden">{profile.personal}</p>
          </div>
        </section>

        {/* Work */}
        <Section id="work" title="Work." muted="Shipped, used, and measured." rule={false} tight>
          <div className="space-y-24 lg:space-y-40">
            {featured.map((project, index) => (
              <article key={project.slug} aria-labelledby={`${project.slug}-title`}>
                <div className="grid gap-y-5 lg:grid-cols-12 lg:items-end lg:gap-x-6">
                  <div className="lg:col-span-7">
                    <p className="t-mono text-graphite">
                      {pad(index + 1)} <span aria-hidden="true">—</span> {project.role}
                    </p>
                    <h3 id={`${project.slug}-title`} className="t-title mt-3">
                      {project.name}
                    </h3>
                    <p className="measure mt-3 text-ink-2">{project.summary}</p>
                  </div>
                  <div className="lg:col-span-5 lg:flex lg:justify-end lg:pb-1">
                    <ExternalLinks links={project.links} />
                  </div>
                </div>

                {/* The frame sits on a faint copy of the hero's light. CYD's own UI is dark, so its frame is a dark stage in both themes. */}
                <div className="project-stage mt-8">
                  <div aria-hidden="true" className="frame-plate beams" />
                  <div className={`frame p-2.5 sm:p-6 ${project.phone ? "stage-dark" : ""}`}>
                    <ProjectShot name={project.name} shot={project.shot} phone={project.phone} />
                  </div>
                </div>

                <div className="mt-14 grid gap-y-8 md:grid-cols-12 md:gap-x-6 lg:mt-20">
                  <div className="md:col-span-4">
                    <p className="t-mono text-graphite">In numbers</p>
                    <dl className="mt-4 grid grid-cols-3 gap-4 md:grid-cols-1">
                      {project.facts.map((fact) => (
                        <div key={fact.label}>
                          <dt className="sr-only">{fact.label}</dt>
                          <dd>
                            <span className="readout block text-ink">{fact.value}</span>
                            <span className="t-mono mt-1 block text-[0.75rem] text-graphite">{fact.label}</span>
                          </dd>
                        </div>
                      ))}
                    </dl>
                  </div>
                  <div className={`md:col-span-4 ${mdRule}`}>
                    <p className="t-mono text-graphite">The hard part</p>
                    <h4 className="mt-4 text-[1rem] font-medium leading-snug text-ink">{project.hardPart.title}</h4>
                    <p className="mt-2 text-ink-2">{project.hardPart.body}</p>
                  </div>
                  <div className={`md:col-span-4 ${mdRule}`}>
                    <p className="t-mono text-graphite">Built with</p>
                    <ul className="t-mono mt-4 flex flex-wrap gap-x-4 gap-y-1.5 text-ink-2 md:block md:space-y-1.5">
                      {project.stack.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </article>
            ))}
          </div>

          <div className="mt-24">
            <h3 className="t-title">More projects</h3>
            <ul className="mt-8 grid border-t border-rule md:grid-cols-12 md:gap-x-6">
              {otherProjects.map((project, index) => (
                <li
                  key={project.name}
                  className={`border-b border-rule py-6 md:col-span-6 lg:col-span-3 lg:border-b-0 ${index % 2 === 1 ? mdRule : ""} ${
                    index > 0 ? lgRule : ""
                  }`}
                >
                  <p className="t-mono text-graphite">{pad(index + featured.length + 1)}</p>
                  <h4 className="mt-3 text-[1rem] font-medium leading-snug">
                    {project.href ? (
                      <a href={project.href} target="_blank" rel="noreferrer" className="hover:underline hover:decoration-1 hover:underline-offset-[0.25em]">
                        {project.name} <span aria-hidden="true" className="text-graphite">↗</span>
                        <span className="sr-only"> (opens in a new tab)</span>
                      </a>
                    ) : (
                      <>
                        {project.name}{" "}
                        <span className="t-mono ml-1 align-[0.05em] text-[0.75rem] font-normal text-graphite">team project</span>
                      </>
                    )}
                  </h4>
                  <p className="mt-2 text-[0.875rem] leading-[1.6] text-ink-2">{project.summary}</p>
                  <p className="t-mono mt-3 text-graphite">
                    <DotList items={project.stack.split(", ")} />
                  </p>
                </li>
              ))}
            </ul>
          </div>
        </Section>

        {/* Experience, with education and tools as a compact background row. */}
        <Section id="experience" title="Experience." muted="Where I did it for real.">
          <ol className="dim-list -mx-4">
            {experience.map((job) => {
              const current = job.end === "Now";
              return (
                <li key={`${job.company}-${job.start}`} className="dim-row grid gap-y-2 px-4 py-5 lg:grid-cols-12 lg:gap-x-6">
                  <p className={`t-mono flex items-center gap-2 self-start tabular-nums lg:col-span-3 lg:pt-0.5 ${current ? "text-ink" : "text-graphite"}`}>
                    {current && <span aria-hidden="true" className="size-1.5 rounded-full bg-go" />}
                    <span className="dim-item">
                      {job.start} – {job.end}
                    </span>
                  </p>
                  <div className="dim-item lg:col-span-9">
                    <h3 className="text-[1rem] leading-snug">
                      <span className="font-medium text-ink">
                        {job.link ? (
                          <a href={job.link} target="_blank" rel="noreferrer" className="hover:underline hover:underline-offset-[0.25em]">
                            {job.company} <span aria-hidden="true" className="text-graphite">↗</span>
                            <span className="sr-only"> (opens in a new tab)</span>
                          </a>
                        ) : (
                          job.company
                        )}
                      </span>
                      <span className="text-[0.875rem] text-graphite">
                        {" "}
                        · {job.role}, {job.place}
                      </span>
                    </h3>
                    <p className="measure mt-2 text-ink-2">{job.summary}</p>
                  </div>
                </li>
              );
            })}
          </ol>

          <div className="mt-14 grid gap-y-4 border-t border-rule pt-10 lg:mt-20 lg:grid-cols-12 lg:gap-x-6 lg:gap-y-12">
            <h3 className="t-mono text-graphite lg:col-span-3 lg:pt-0.5">Education</h3>
            <div className="lg:col-span-9">
              <p className="leading-snug">
                <span className="font-medium text-ink">{education.school}</span>
                <span className="text-[0.875rem] text-graphite">
                  {" "}
                  · {education.degree}, graduating {education.graduation}
                </span>
              </p>
              <p className="mt-2 text-[0.875rem] text-ink-2">{education.honours}</p>
              <p className="t-mono measure mt-3 text-graphite">
                <DotList items={education.coursework} />
              </p>
            </div>

            <h3 className="t-mono mt-8 text-graphite lg:col-span-3 lg:mt-0 lg:pt-0.5">Tools</h3>
            <dl className="grid grid-cols-2 gap-x-6 gap-y-8 lg:col-span-9 xl:grid-cols-4">
              {skills.map((skill) => (
                <div key={skill.group}>
                  <dt className="text-[0.875rem] font-medium text-ink">{skill.group}</dt>
                  <dd className="t-mono mt-2 text-ink-2">
                    <ul className="space-y-1">
                      {skill.items.split(", ").map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        </Section>

        {/* Writing */}
        <Section id="writing" title="Writing." muted="Notes from building.">
          {posts.length > 0 ? (
            <ul className="dim-list -mx-4">
              {posts.slice(0, 4).map((post) => {
                const summary = excerpt(post.excerpt, post.title, 140);
                return (
                  <li
                    key={post.slug}
                    className="dim-row relative before:absolute before:inset-x-4 before:top-0 before:h-px before:bg-rule last:after:absolute last:after:inset-x-4 last:after:bottom-0 last:after:h-px last:after:bg-rule"
                  >
                    <Link href={`/blogs/${post.slug}`} className="dim-item grid gap-y-1 rounded-[10px] px-4 py-5 lg:grid-cols-12 lg:gap-x-6">
                      <span className="t-mono tabular-nums text-graphite lg:col-span-3 lg:pt-0.5">{formatDate(post.date)}</span>
                      <span className="min-w-0 lg:col-span-9">
                        <span className="block font-medium leading-snug text-ink">{post.title.trim()}</span>
                        {summary && <span className="mt-1 block truncate text-[0.875rem] text-graphite">{summary}</span>}
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="text-graphite">No posts yet.</p>
          )}
          <p className="mt-8 lg:grid lg:grid-cols-12 lg:gap-x-6">
            <Link href="/blogs" className="link text-[0.875rem] font-medium lg:col-span-9 lg:col-start-4 lg:justify-self-start">
              All {posts.length} posts →
            </Link>
          </p>
        </Section>

        {/* Contact. No band: a rule, generous space, and a faint copy of the plate so the page ends lit. */}
        <section id="contact" aria-labelledby="contact-title" className="relative isolate scroll-mt-16 overflow-hidden border-t border-rule">
          <div aria-hidden="true" className="end-plate beams" />
          <div className="wrap py-20 lg:py-32">
            <div className="max-w-[52rem]">
              <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:gap-6">
                <Image
                  src="/abdelrahman.jpg"
                  width={460}
                  height={460}
                  alt="Abdelrahman Mohamed"
                  sizes="64px"
                  className="size-16 shrink-0 rounded-full border border-rule-strong object-cover sm:mt-1"
                />
                <h2 id="contact-title" className="t-section">
                  Hiring for 2027?{" "}
                  <span className="muted">I start full‑time in January. Calgary, remote, or relocating.</span>
                </h2>
              </div>
              <p className="t-mono mt-6 text-ink-2 sm:ml-[5.5rem]">
                <DotList items={profile.workFacts} />
              </p>

              <div className="sm:ml-[5.5rem]">
                <a
                  href={`mailto:${profile.email}`}
                  data-track="email"
                  className="mt-10 inline-block text-[1.5rem] font-medium leading-[1.2] tracking-[-0.02em] sm:text-[clamp(1.5rem,0.4rem+2.6vw,2.5rem)] sm:leading-[1.1] underline decoration-[color-mix(in_srgb,var(--ink)_30%,transparent)] decoration-1 underline-offset-[0.2em] transition-[text-decoration-color] duration-[240ms] hover:decoration-[var(--ink)]"
                >
                  {profile.email.split("@")[0]}
                  <wbr />@{profile.email.split("@")[1]}
                </a>
                <div className="mt-8 flex flex-wrap gap-2">
                  <CopyEmail email={profile.email} className="btn btn-key" />
                  <a href={RESUME_PATH} className="btn btn-ghost" data-track="resume-download">
                    Résumé
                  </a>
                  <a href={profile.linkedin} className="btn btn-ghost" target="_blank" rel="noreferrer" data-track="linkedin">
                    LinkedIn ↗<span className="sr-only"> (opens in a new tab)</span>
                  </a>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
