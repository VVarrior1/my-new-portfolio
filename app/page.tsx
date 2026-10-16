import Image from "next/image";
import Link from "next/link";
import { Fragment } from "react";
import { GithubMark, LinkedinMark } from "@/components/brand-icons";
import { CopyEmail } from "@/components/copy-email";
import { LiveSystem } from "@/components/live-system";
import { ProjectShot } from "@/components/project-shot";
import { Section } from "@/components/section";
import { SimReadout } from "@/components/sim-readout";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { getAllBlogs } from "@/lib/blogs";
import {
  RESUME_PATH,
  education,
  experience,
  featured,
  heroFacts,
  otherProjects,
  profile,
  skills,
  type Link as ContentLink,
} from "@/lib/content";
import { formatDate } from "@/lib/date-utils";
import { excerpt } from "@/lib/text";

export const revalidate = 300;

function ExternalLinks({ links }: { links: ContentLink[] }) {
  if (links.length === 0) return null;
  return (
    <ul className="flex flex-wrap gap-x-6 gap-y-2">
      {links.map((link) => (
        <li key={link.href}>
          <a href={link.href} target="_blank" rel="noreferrer" data-track={link.track} className="link t-small">
            {link.label}
            <span className="arrow" aria-hidden="true">
              ↗
            </span>
            <span className="sr-only"> (opens in a new tab)</span>
          </a>
        </li>
      ))}
    </ul>
  );
}

export default async function Home() {
  const posts = await getAllBlogs();

  return (
    <>
      <SiteHeader />
      <main id="main" className="frame">
        {/* Hero: the live readout, a two-tone headline, the recruiter facts and the simulator. */}
        <section aria-labelledby="hero-title" className="relative">
          <div className="mx-auto max-w-[76rem] px-4 pb-16 pt-6 sm:px-8 sm:pt-8 lg:pb-24">
            <SimReadout />
            <h1 id="hero-title" className="t-display mt-4 max-w-[59.75rem] sm:mt-5">
              <span className="text-ink">{profile.name}</span>{" "}
              <span className="text-graphite">{profile.headline}</span>
            </h1>

            <div className="mt-10 grid gap-y-10 lg:grid-cols-12 lg:grid-rows-[auto_1fr] lg:gap-x-6 lg:gap-y-0">
              <div className="lg:col-span-5 lg:row-start-1 xl:col-span-4">
                <dl className="t-meta grid">
                  {heroFacts.map((fact, index) => (
                    <div
                      key={fact.label}
                      className={`grid grid-cols-[5.25rem_minmax(0,1fr)] gap-x-3 border-b border-rule py-3 ${index === 0 ? "pt-0" : ""}`}
                    >
                      <dt className="text-graphite">{fact.label}</dt>
                      <dd className="text-ink">
                        {fact.live && <span className="status-dot mr-2 align-middle" aria-hidden="true" />}
                        {/* Break only between comma-separated parts, never inside "full-stack". */}
                        {fact.value.split(", ").map((part, i, parts) => (
                          <Fragment key={part}>
                            <span className="whitespace-nowrap">
                              {part}
                              {i < parts.length - 1 ? "," : ""}
                            </span>
                            {i < parts.length - 1 ? " " : ""}
                          </Fragment>
                        ))}
                      </dd>
                    </div>
                  ))}
                </dl>

                <div className="mt-6 flex flex-wrap items-center gap-2.5">
                  <a href={`mailto:${profile.email}`} className="btn btn-solid" data-track="email">
                    Email me
                  </a>
                  <a href={RESUME_PATH} className="btn btn-quiet" data-track="resume-download">
                    Résumé<span className="sr-only"> (PDF)</span>
                  </a>
                  <a
                    href={profile.github}
                    className="btn btn-quiet btn-icon"
                    target="_blank"
                    rel="noreferrer"
                    data-track="github"
                    aria-label="GitHub (opens in a new tab)"
                  >
                    <GithubMark />
                  </a>
                  <a
                    href={profile.linkedin}
                    className="btn btn-quiet btn-icon"
                    target="_blank"
                    rel="noreferrer"
                    data-track="linkedin"
                    aria-label="LinkedIn (opens in a new tab)"
                  >
                    <LinkedinMark />
                  </a>
                </div>
              </div>

              <div id="play" className="scroll-mt-20 lg:col-span-7 lg:col-start-6 lg:row-span-2 lg:row-start-1 xl:col-span-8 xl:col-start-5">
                <LiveSystem />
              </div>

              <div className="max-w-[24rem] lg:col-span-5 lg:row-start-2 lg:self-end xl:col-span-4">
                <p className="t-meta text-graphite">Off the clock</p>
                <p className="mt-2 text-[1rem] leading-[1.6] text-ink-2">{profile.personal}</p>
              </div>
            </div>
          </div>
        </section>

        {/* Work: Systemlab first (the simulator comes from it), then CYD, then smaller builds. */}
        <Section id="work" title="Work" aside={`${featured.length} featured · ${otherProjects.length} more`}>
          <div className="space-y-20 lg:space-y-32">
            {featured.map((project, index) => {
              const flip = index % 2 === 1;
              return (
                <article
                  key={project.slug}
                  aria-labelledby={`${project.slug}-title`}
                  className="grid items-start gap-y-8 lg:grid-cols-12 lg:gap-x-6"
                >
                  <figure className={`min-w-0 lg:col-span-7 lg:row-start-1 ${flip ? "lg:col-start-1" : "lg:col-start-6"}`}>
                    <figcaption className="t-meta mb-3 flex gap-3 text-graphite">
                      <span className="shrink-0 text-ink">Fig. {index + 2}</span>
                      <span>{project.caption}</span>
                    </figcaption>
                    <div className="stage" data-stage={project.slug}>
                      <ProjectShot name={project.name} shot={project.shot} phone={project.phone} />
                    </div>
                  </figure>

                  <div className={`lg:col-span-5 lg:row-start-1 lg:pt-8 ${flip ? "lg:col-start-8 lg:pl-6" : "lg:col-start-1 lg:pr-6"}`}>
                    <h3 id={`${project.slug}-title`} className="t-title">
                      {project.name}
                    </h3>
                    <p className="t-meta mt-2 text-graphite">{project.role}</p>
                    <p className="t-body mt-4 text-ink">{project.summary}</p>

                    <dl className="mt-7 grid grid-cols-3 border-y border-rule">
                      {project.facts.map((fact, i) => (
                        <div key={fact.label} className={`py-4 ${i > 0 ? "border-l border-rule pl-4" : "pr-4"}`}>
                          <dt className="sr-only">{fact.label}</dt>
                          <dd>
                            <span className="t-figure block text-ink">{fact.value}</span>
                            <span className="t-meta mt-1.5 block text-graphite">{fact.label}</span>
                          </dd>
                        </div>
                      ))}
                    </dl>

                    <div className="mt-7 border-l-2 border-signal pl-4">
                      <p className="t-body font-semibold text-ink">{project.hardPart.title}</p>
                      <p className="t-body mt-1.5 text-ink-2">{project.hardPart.body}</p>
                    </div>

                    <p className="t-meta mt-6 text-graphite">{project.stack.map((item) => item.replace(/ /g, "\u00a0")).join("\u00a0· ")}</p>
                    <div className="mt-5">
                      <ExternalLinks links={project.links} />
                    </div>
                  </div>
                </article>
              );
            })}
          </div>

          <div className="mt-20 lg:mt-32">
            <h3 className="t-item">More projects</h3>
            <ul className="mt-6 grid gap-x-6 sm:grid-cols-2">
              {otherProjects.map((project) => (
                <li key={project.name} className="border-t border-rule pb-8 pt-5 sm:pr-10">
                  <p className="t-body font-semibold text-ink">
                    {project.href ? (
                      <a href={project.href} target="_blank" rel="noreferrer" className="link">
                        {project.name}
                        <span className="arrow" aria-hidden="true">
                          ↗
                        </span>
                        <span className="sr-only"> (opens in a new tab)</span>
                      </a>
                    ) : (
                      project.name
                    )}
                  </p>
                  <p className="t-small mt-1.5 text-ink-2">{project.summary}</p>
                  <p className="t-meta mt-2.5 text-graphite">{project.stack.split(", ").map((item) => item.replace(/ /g, "\u00a0")).join("\u00a0· ")}</p>
                </li>
              ))}
            </ul>
          </div>
        </Section>

        {/* Experience: dates on the left, the timeline drawn on the page frame on wide screens. */}
        <Section id="experience" title="Experience" aside={`${experience.length} roles · ${experience[experience.length - 1].start} to now`}>
          <ol className="relative before:absolute before:bottom-3 before:left-[3px] before:top-3 before:w-px before:bg-rule xl:before:hidden">
            {experience.map((job) => {
              const current = job.end === "Now";
              return (
                <li
                  key={`${job.company}-${job.start}`}
                  className="relative grid gap-y-1 pb-10 pl-6 last:pb-0 sm:grid-cols-12 sm:gap-x-6 xl:pl-0"
                >
                  <span
                    aria-hidden="true"
                    className={`absolute left-0 top-[0.4rem] size-[7px] rounded-full sm:top-[0.6rem] xl:-left-[27px] ${
                      current ? "bg-go shadow-[0_0_0_3px_color-mix(in_srgb,var(--go)_18%,transparent)]" : "border-[1.5px] border-graphite bg-paper"
                    }`}
                  />
                  <p className={`t-meta sm:col-span-3 sm:pt-[0.2rem] ${current ? "text-ink" : "text-graphite"}`}>
                    {job.start} – {job.end}
                  </p>
                  <div className="sm:col-span-9 lg:col-span-7">
                    <h3 className="t-item text-ink">
                      {job.link ? (
                        <a href={job.link} target="_blank" rel="noreferrer" className="transition-colors hover:text-signal">
                          {job.company}
                          <span className="sr-only"> (opens in a new tab)</span>
                        </a>
                      ) : (
                        job.company
                      )}
                    </h3>
                    <p className="t-small mt-0.5 text-graphite">
                      {job.role}
                      <span className="lg:hidden">, {job.place}</span>
                    </p>
                    <p className="t-body measure mt-3 text-ink-2">{job.summary}</p>
                  </div>
                  <p className="t-meta hidden pt-[0.2rem] text-right text-graphite lg:col-span-2 lg:block">{job.place}</p>
                </li>
              );
            })}
          </ol>
        </Section>

        {/* Background: education and tools as a spec sheet on the same grid. */}
        <Section id="background" title="Background" aside="Education and tools">
          <div className="grid gap-y-3 border-t border-rule pt-6 sm:grid-cols-12 sm:gap-x-6">
            <h3 className="t-meta text-graphite sm:col-span-3">Education</h3>
            <div className="sm:col-span-9">
              <p className="t-body text-ink">
                <span className="font-semibold">
                  {education.degree}, {education.school}
                </span>
              </p>
              <p className="t-meta mt-1.5 text-graphite">
                Graduating {education.graduation} · {education.honours}
              </p>
              <p className="t-small measure mt-3 text-ink-2">
                Courses I&apos;d point to: {education.coursework.join(", ").toLowerCase()}.
              </p>
            </div>
          </div>

          <div className="mt-10 grid gap-y-5 border-t border-rule pt-6 sm:grid-cols-12 sm:gap-x-6">
            <h3 className="t-meta text-graphite sm:col-span-3">Tools I use</h3>
            <dl className="grid gap-x-6 gap-y-6 sm:col-span-9 sm:grid-cols-2 xl:grid-cols-4">
              {skills.map((skill) => (
                <div key={skill.group}>
                  <dt className="t-small font-semibold text-ink">{skill.group}</dt>
                  <dd className="t-small mt-1 text-ink-2">{skill.items}</dd>
                </div>
              ))}
            </dl>
          </div>
        </Section>

        {/* Writing: hairline rows on the same grid as Experience. */}
        <Section id="writing" title="Writing" aside={posts.length > 4 ? `Latest 4 of ${posts.length}` : undefined}>
          {posts.length > 0 ? (
            <ul>
              {posts.slice(0, 4).map((post) => {
                const teaser = excerpt(post.excerpt, post.title, 150);
                return (
                  <li key={post.slug} className="border-b border-rule first:border-t">
                    <Link href={`/blogs/${post.slug}`} className="group grid grid-cols-1 gap-y-1 py-6 sm:grid-cols-12 sm:gap-x-6">
                      <span className="t-meta text-graphite sm:col-span-3 sm:pt-[0.2rem]">{formatDate(post.date)}</span>
                      <span className="sm:col-span-9 lg:col-span-8">
                        <span className="t-item block text-ink transition-colors duration-200 group-hover:text-signal">
                          {post.title.trim()}
                        </span>
                        {teaser && <span className="t-small mt-1 block truncate text-ink-2">{teaser}</span>}
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="text-graphite">No posts yet.</p>
          )}
          <div className="mt-8 sm:grid sm:grid-cols-12 sm:gap-x-6">
            <p className="sm:col-span-9 sm:col-start-4">
              <Link href="/blogs" className="link t-small">
                All {posts.length} posts
                <span className="arrow" aria-hidden="true">
                  →
                </span>
              </Link>
            </p>
          </div>
        </Section>

        {/* Contact: flat ultramarine, the same recipe as the Systemlab stage, so it echoes Work. */}
        <section id="contact" aria-labelledby="contact-title" className="band scroll-mt-16">
          <span aria-hidden="true" className="band-frame" />
          <div className="mx-auto max-w-[76rem] px-4 py-16 sm:px-8 lg:py-24">
            <div className="flex items-center gap-4 sm:gap-5">
              <span className="relative block size-14 shrink-0 overflow-hidden rounded-full border border-white/25 sm:size-[72px]">
                <Image
                  src="/abdelrahman.jpg"
                  width={460}
                  height={460}
                  alt="Abdelrahman Mohamed"
                  sizes="166px"
                  className="absolute left-[-32px] top-[-11px] h-auto w-[129px] max-w-none sm:left-[-41px] sm:top-[-14px] sm:w-[166px]"
                />
              </span>
              <h2 id="contact-title" className="t-section">
                Hiring for 2027?
              </h2>
            </div>
            <p className="mt-6 max-w-[42rem] text-[1.0625rem] leading-relaxed text-band-muted sm:text-[1.25rem]">
              I&apos;m looking for a full-time software engineering role starting January 2027, in Calgary, remote, or
              somewhere I can move to.
            </p>
            <a
              href={`mailto:${profile.email}`}
              data-track="email"
              className="mt-10 inline-block text-[clamp(1.5rem,4.2vw,2.75rem)] font-semibold leading-[1.15] tracking-[-0.025em] underline decoration-white/45 decoration-2 underline-offset-[0.18em] transition-[text-decoration-color] duration-200 [text-decoration-skip-ink:none] hover:decoration-white"
            >
              {profile.email.split("@")[0]}
              <wbr />@{profile.email.split("@")[1]}
            </a>
            <div className="mt-8 flex flex-wrap gap-2.5">
              <CopyEmail email={profile.email} className="btn btn-band-solid" />
              <a href={RESUME_PATH} className="btn btn-on-band" data-track="resume-download">
                Résumé<span className="sr-only"> (PDF)</span>
              </a>
              <a href={profile.linkedin} className="btn btn-on-band" target="_blank" rel="noreferrer" data-track="linkedin">
                LinkedIn
                <span aria-hidden="true">↗</span>
                <span className="sr-only"> (opens in a new tab)</span>
              </a>
            </div>
            <p className="t-meta mt-12 border-t border-white/20 pt-5 text-band-muted">
              Canadian citizen · TN-eligible, no H-1B needed · Open to relocation
            </p>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
