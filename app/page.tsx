import Image from "next/image";
import Link from "next/link";
import { Fragment, type CSSProperties } from "react";
import { GithubMark, LinkedinMark } from "@/components/brand-icons";
import { CopyEmail } from "@/components/copy-email";
import { LiveSystem } from "@/components/live-system";
import { ProjectShot } from "@/components/project-shot";
import { RoleTimeline, roleSlug } from "@/components/role-timeline";
import { Section } from "@/components/section";
import { SimReadout } from "@/components/sim-readout";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { getAllBlogs } from "@/lib/blogs";
import {
  RESUME_PATH,
  bandFacts,
  education,
  experience,
  featured,
  heroFacts,
  otherProjects,
  pinnedPosts,
  profile,
  skills,
  type Link as ContentLink,
} from "@/lib/content";
import { formatDate } from "@/lib/date-utils";
import { pickHomePosts } from "@/lib/posts";

export const revalidate = 300;

const HOME_POSTS = 3;

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

/** "TypeScript · Next.js · React Flow", never breaking inside a name. */
function Stack({ items }: { items: string[] }) {
  return (
    <p className="t-meta dot-list text-graphite">
      {items.map((item) => (
        <span key={item}>{item}</span>
      ))}
    </p>
  );
}

export default async function Home() {
  const posts = await getAllBlogs();
  const shown = pickHomePosts(posts, pinnedPosts, HOME_POSTS);

  return (
    <>
      <SiteHeader />
      <main id="main" className="frame">
        {/* Hero: the live readout, a two-tone headline, the recruiter facts and the simulator. */}
        <section aria-labelledby="hero-title" className="relative">
          <div className="mx-auto max-w-[76rem] px-4 pb-16 pt-6 sm:px-8 sm:pt-9 lg:pb-20">
            <SimReadout />
            <h1 id="hero-title" className="t-display mt-5 max-w-[59.75rem]">
              <span className="text-ink">{profile.name}</span> <span className="t-display-soft">{profile.headline}</span>
            </h1>

            <div className="mt-8 grid gap-y-10 lg:mt-10 lg:grid-cols-12 lg:grid-rows-[auto_1fr] lg:gap-x-6 lg:gap-y-0">
              <div className="lg:col-span-5 lg:row-start-1 xl:col-span-4">
                <dl className="grid">
                  {heroFacts.map((fact) => (
                    <div
                      key={fact.label}
                      className="grid grid-cols-[5.5rem_minmax(0,1fr)] items-baseline gap-x-3 border-b border-rule py-2.5 first:pt-0"
                    >
                      <dt className="t-meta text-graphite">{fact.label}</dt>
                      <dd className="t-small text-ink">
                        {fact.live && <span className="status-dot mr-2.5 align-[0.1em]" aria-hidden="true" />}
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

              <div
                id="play"
                className="scroll-mt-20 lg:col-span-7 lg:col-start-6 lg:row-span-2 lg:row-start-1 xl:col-span-8 xl:col-start-5"
              >
                <LiveSystem />
              </div>

              <div className="max-w-[24rem] lg:col-span-5 lg:row-start-2 lg:self-start lg:pt-10 xl:col-span-4">
                <p className="t-caption text-graphite">Off the clock</p>
                <p className="t-body mt-1.5 text-ink-2">{profile.personal}</p>
              </div>
            </div>
          </div>
        </section>

        {/* Work: Systemlab first (the simulator comes from it), then CYD, then smaller builds. */}
        <Section id="work" title="Work" aside={`${featured.length} featured · ${otherProjects.length} more`}>
          <div className="space-y-20 lg:space-y-24">
            {featured.map((project, index) => {
              const flip = index % 2 === 1;
              return (
                <article
                  key={project.slug}
                  aria-labelledby={`${project.slug}-title`}
                  className="grid items-start gap-y-8 lg:grid-cols-12 lg:gap-x-6"
                >
                  {/* On wide screens the stage travels with the text, so neither column leaves a hole. */}
                  <figure
                    className={`min-w-0 lg:sticky lg:top-24 lg:col-span-7 lg:row-start-1 lg:self-start ${
                      flip ? "lg:col-start-1" : "lg:col-start-6"
                    }`}
                  >
                    <figcaption className="mb-3 flex items-baseline gap-3">
                      <span className="t-meta shrink-0 text-ink">Fig. {index + 2}</span>
                      <span className="t-caption text-graphite">{project.caption}</span>
                    </figcaption>
                    <div className="stage" data-stage={project.slug}>
                      <ProjectShot name={project.name} shot={project.shot} phone={project.phone} />
                    </div>
                  </figure>

                  <div className={`lg:col-span-5 lg:row-start-1 lg:pt-8 ${flip ? "lg:col-start-8 lg:pl-6" : "lg:col-start-1 lg:pr-6"}`}>
                    <h3 id={`${project.slug}-title`} className="t-title">
                      {project.name}
                    </h3>
                    <p className="t-caption mt-2 text-graphite">{project.role}</p>
                    <p className="t-body mt-4 text-ink">{project.summary}</p>

                    <dl className="mt-7 grid grid-cols-3 border-y border-rule">
                      {project.facts.map((fact, i) => (
                        <div key={fact.label} className={`py-4 ${i > 0 ? "border-l border-rule pl-4" : "pr-4"}`}>
                          <dt className="sr-only">{fact.label}</dt>
                          <dd>
                            <span className="t-figure block text-ink">{fact.value}</span>
                            <span className="t-caption mt-1.5 block text-graphite">{fact.label}</span>
                          </dd>
                        </div>
                      ))}
                    </dl>

                    <div className="mt-7 border-l-2 border-signal pl-4">
                      <p className="t-body font-semibold text-ink">{project.hardPart.title}</p>
                      <p className="t-body mt-1.5 text-ink-2">{project.hardPart.body}</p>
                    </div>

                    <div className="mt-6">
                      <Stack items={project.stack} />
                    </div>
                    <div className="mt-5">
                      <ExternalLinks links={project.links} />
                    </div>
                  </div>
                </article>
              );
            })}
          </div>

          <div className="mt-20 lg:mt-24">
            <h3 className="t-item">More projects</h3>
            <ul className="mt-5 grid gap-x-6 sm:grid-cols-2">
              {otherProjects.map((project) => (
                <li key={project.name} className="border-t border-rule pb-6 pt-4">
                  <div className={project.href ? "row py-1 sm:mr-10" : "py-1 sm:mr-10"}>
                    <p className="t-body font-semibold text-ink">
                      {project.href ? (
                        <a href={project.href} target="_blank" rel="noreferrer" className="row-link after:absolute after:inset-0">
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
                    <div className="mt-2.5">
                      <Stack items={project.stack.split(", ")} />
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </Section>

        {/* Experience: a year ruler of every role (Fig. 4), then the rows; dates and place on the left. */}
        <Section id="experience" title="Experience">
          <RoleTimeline experience={experience} figure={4} />
          <ol className="relative before:absolute before:bottom-3 before:left-[3px] before:top-3 before:w-px before:bg-rule xl:before:hidden">
            {experience.map((job) => {
              const current = job.end === "Now";
              const slug = roleSlug(job.company);
              return (
                <li
                  key={`${job.company}-${job.start}`}
                  data-row={slug}
                  className="lit-row relative mb-10 grid gap-y-1 pl-6 last:mb-0 sm:grid-cols-12 sm:gap-x-6 xl:pl-0"
                >
                  <span
                    aria-hidden="true"
                    className={`absolute left-0 top-[0.4rem] size-[7px] rounded-full sm:top-[0.6rem] xl:-left-[27px] ${
                      current ? "bg-go shadow-[0_0_0_3px_color-mix(in_srgb,var(--go)_18%,transparent)]" : "border-[1.5px] border-graphite bg-paper"
                    }`}
                  />
                  <div className="sm:col-span-3 sm:pt-[0.2rem]">
                    <p className={`t-meta ${current ? "text-ink" : "text-graphite"}`}>{`${job.start} – ${job.end}`}</p>
                    <p className="t-caption mt-0.5 hidden text-graphite sm:block">{job.place}</p>
                  </div>
                  <div className="sm:col-span-9 lg:col-span-7">
                    <div className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5">
                      <h3 className="t-item text-ink transition-colors">
                        {job.link ? (
                          <a href={job.link} target="_blank" rel="noreferrer" className="transition-colors hover:text-signal">
                            {job.company}
                            <span className="sr-only"> (opens in a new tab)</span>
                          </a>
                        ) : (
                          job.company
                        )}
                      </h3>
                      <p className="t-small text-graphite">
                        {job.role}
                        <span className="sm:hidden">, {job.place}</span>
                      </p>
                    </div>
                    <p className="t-body measure mt-2 text-ink-2">{job.summary}</p>
                  </div>
                </li>
              );
            })}
          </ol>
        </Section>

        {/* Background: education and tools as a spec sheet on the same grid. */}
        <Section id="background" title="Background" aside="Education and tools" compact>
          <div className="grid gap-y-2 border-t border-rule pt-5 sm:grid-cols-12 sm:gap-x-6">
            <h3 className="t-caption text-graphite sm:col-span-3 sm:pt-[0.15rem]">Education</h3>
            <div className="sm:col-span-9">
              <p className="t-body font-semibold text-ink">
                {education.degree}, {education.school}
              </p>
              <p className="t-caption mt-1 text-graphite">
                Graduating {education.graduation} · {education.honours}
              </p>
              <p className="t-small measure mt-3 text-ink-2">
                Courses I&apos;d point to: {education.coursework.join(", ").toLowerCase()}.
              </p>
            </div>
          </div>

          <div className="mt-8 grid gap-y-4 border-t border-rule pt-5 sm:grid-cols-12 sm:gap-x-6">
            <h3 className="t-caption text-graphite sm:col-span-3 sm:pt-[0.15rem]">Tools I use</h3>
            <dl className="grid gap-x-6 gap-y-5 sm:col-span-9 sm:grid-cols-2 xl:grid-cols-4">
              {skills.map((skill) => (
                <div key={skill.group}>
                  <dt className="t-small font-semibold text-ink">{skill.group}</dt>
                  <dd className="t-small mt-1 text-ink-2">{skill.items}</dd>
                </div>
              ))}
            </dl>
          </div>
        </Section>

        {/* Writing: hairline rows on the same grid as Experience, technical posts first. */}
        <Section id="writing" title="Writing" aside={posts.length > shown.length ? `${shown.length} of ${posts.length} posts` : undefined}>
          {shown.length > 0 ? (
            <ul>
              {shown.map((post) => (
                <li key={post.slug} className="border-b border-rule first:border-t">
                  <Link
                    href={`/blogs/${post.slug}`}
                    className="row grid grid-cols-1 gap-y-1 py-5 sm:grid-cols-12 sm:gap-x-6"
                    style={{ "--row-y": "1px" } as CSSProperties}
                  >
                    <span className="t-meta text-graphite sm:col-span-3 sm:pt-[0.2rem]">{formatDate(post.date)}</span>
                    <span className="sm:col-span-9 lg:col-span-7">
                      <span className="t-item row-link block">{post.title.trim()}</span>
                      <span className="t-small mt-1 line-clamp-2 text-ink-2">{post.teaser}</span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-graphite">No posts yet.</p>
          )}
          <div className="mt-7 sm:grid sm:grid-cols-12 sm:gap-x-6">
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

        {/* Contact: the band, a lower-chroma cousin of the Systemlab stage, so it echoes Work. */}
        <section id="contact" aria-labelledby="contact-title" className="band scroll-mt-16">
          <span aria-hidden="true" className="band-frame" />
          <div className="mx-auto grid max-w-[76rem] gap-y-12 px-4 py-16 sm:px-8 lg:grid-cols-12 lg:gap-x-6 lg:py-20">
            <div className="min-w-0 lg:col-span-8">
              <div className="flex items-center gap-4 sm:gap-5">
                <span className="relative block size-16 shrink-0 overflow-hidden rounded-full border border-white/25 sm:size-24">
                  <Image
                    src="/abdelrahman.jpg"
                    width={460}
                    height={460}
                    alt="Abdelrahman Mohamed"
                    sizes="221px"
                    className="absolute left-[-36px] top-[-12px] h-auto w-[148px] max-w-none sm:left-[-55px] sm:top-[-19px] sm:w-[221px]"
                  />
                </span>
                <h2 id="contact-title" className="t-section">
                  Hiring for 2027?
                </h2>
              </div>
              <p className="mt-6 max-w-[40rem] text-[1.0625rem] leading-relaxed text-band-muted sm:text-[1.25rem]">
                I&apos;m looking for a full-time software engineering role starting January 2027, in Calgary, remote, or
                somewhere I can move to.
              </p>
              <a
                href={`mailto:${profile.email}`}
                data-track="email"
                className="mt-9 inline-block text-[clamp(1.5rem,4vw,2.5rem)] font-semibold leading-[1.15] tracking-[-0.025em] underline decoration-white/45 decoration-2 underline-offset-[0.18em] transition-[text-decoration-color] duration-200 [text-decoration-skip-ink:none] hover:decoration-white"
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
            </div>

            <dl className="grid content-start border-t border-white/20 lg:col-span-4 lg:border-l lg:border-t-0 lg:pl-8">
              {bandFacts.map((fact) => (
                <div key={fact.label} className="border-b border-white/15 py-3.5 last:border-b-0 lg:first:pt-1">
                  <dt className="t-meta text-band-muted">{fact.label}</dt>
                  <dd className="t-small mt-0.5 text-band-ink">{fact.value}</dd>
                </div>
              ))}
            </dl>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
