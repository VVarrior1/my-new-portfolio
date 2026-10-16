import { Fragment } from "react";
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
const formatMonth = (date: string) => new Date(date).toLocaleDateString("en-US", { month: "short", year: "numeric", timeZone: "UTC" });

function ExternalLinks({ links }: { links: ContentLink[] }) {
  if (links.length === 0) return null;
  return (
    <ul className="flex flex-wrap gap-x-6 gap-y-2">
      {links.map((link) => (
        <li key={link.href}>
          <a href={link.href} target="_blank" rel="noreferrer" data-track={link.track} className="link text-[0.9375rem] font-[550]">
            {link.label}
            <span className="link-arrow" aria-hidden="true">
              ↗
            </span>
            <span className="sr-only"> (opens in a new tab)</span>
          </a>
        </li>
      ))}
    </ul>
  );
}

/** Mono label on the left three columns, content on the right nine: Experience, Background and Writing share it. */
const ROW = "grid gap-x-6 gap-y-2 lg:grid-cols-12 lg:items-start";
const ROW_LABEL = "t-mono text-graphite lg:col-span-3 lg:pt-[0.3rem]";
const ROW_BODY = "min-w-0 lg:col-span-9";

export default async function Home() {
  const posts = await getAllBlogs();

  return (
    <>
      <SiteHeader />
      <main id="main">
        {/* Hero: the name and the facts on the left, the simulator (a small device) on the right. */}
        <section aria-labelledby="hero-name">
          <div className="mx-auto grid max-w-[76rem] gap-y-10 px-4 pb-16 pt-6 sm:px-8 sm:pb-20 sm:pt-16 lg:grid-cols-12 lg:grid-rows-[auto_1fr] lg:gap-x-12">
            <div className="min-w-0 lg:col-span-5 lg:col-start-1 lg:row-start-1">
              <h1 id="hero-name" className="t-display">
                {profile.firstName}
                <br />
                {profile.lastName}
              </h1>
              {/* Two deliberate lines: who and where, then when and status. */}
              <ul className="t-mono mt-4 text-ink" aria-label="At a glance">
                {profile.facts.map((fact, i) => (
                  <Fragment key={fact}>
                    <li className="inline whitespace-nowrap">
                      {i === 0 && <span className="mr-2 inline-block size-1.5 -translate-y-px rounded-full bg-go align-middle" aria-hidden="true" />}
                      {fact}
                      {i !== 1 && i < profile.facts.length - 1 && (
                        <span className="pl-2 text-graphite" aria-hidden="true">
                          /
                        </span>
                      )}
                      {i === 1 && <br />}
                    </li>
                    {i !== 1 && " "}
                  </Fragment>
                ))}
              </ul>
              <p className="measure mt-5 text-[1.125rem] leading-[1.5] text-ink sm:text-[1.25rem] sm:leading-[1.45]">{profile.intro}</p>

              <div className="mt-7 flex flex-wrap gap-2.5">
                <a href={`mailto:${profile.email}`} className="key key-signal" data-track="email">
                  Email me
                </a>
                <a href={RESUME_PATH} className="key" data-track="resume-download">
                  Résumé
                  <span className="font-mono text-[0.75rem] font-medium text-graphite">PDF</span>
                </a>
                <a
                  href={profile.github}
                  className="key key-icon"
                  target="_blank"
                  rel="noreferrer"
                  data-track="github"
                  aria-label="GitHub (opens in a new tab)"
                >
                  <GithubMark className="size-[18px]" />
                </a>
                <a
                  href={profile.linkedin}
                  className="key key-icon"
                  target="_blank"
                  rel="noreferrer"
                  data-track="linkedin"
                  aria-label="LinkedIn (opens in a new tab)"
                >
                  <LinkedinMark className="size-[17px]" />
                </a>
              </div>
            </div>

            <div id="play" className="min-w-0 scroll-mt-20 lg:col-span-7 lg:col-start-6 lg:row-span-2 lg:row-start-1">
              <LiveSystem />
            </div>

            {/* The personal line, as a small spec sheet. */}
            <div className="min-w-0 lg:col-span-5 lg:col-start-1 lg:row-start-2 lg:self-start">
              <h2 className="t-mono text-graphite">Off the clock</h2>
              <dl className="spec t-mono mt-2">
                {profile.offTheClock.map((row) => (
                  <div key={row.label}>
                    <dt>{row.label}</dt>
                    <dd>{row.value}</dd>
                  </div>
                ))}
              </dl>
            </div>
          </div>
        </section>

        <Section id="work" index="01" title="Work" meta={`${featured.length} featured · ${otherProjects.length} more`}>
          <div className="space-y-20 sm:space-y-28">
            {featured.map((project, index) => {
              const flip = index % 2 === 1;
              return (
                <article
                  key={project.slug}
                  aria-labelledby={`${project.slug}-title`}
                  className="grid gap-y-8 lg:grid-cols-12 lg:items-start lg:gap-x-12"
                >
                  <div className={`min-w-0 lg:col-span-5 lg:row-start-1 ${flip ? "lg:col-start-8" : "lg:col-start-1"}`}>
                    <h3 id={`${project.slug}-title`} className="t-title">
                      {project.name}
                    </h3>
                    <p className="t-mono mt-2 text-graphite">{project.role}</p>
                    <p className="mt-4 text-ink">{project.summary}</p>

                    {/* The numbers sit on a screen, like the simulator's readouts. */}
                    <dl className="screen mt-6 px-4 py-1">
                      {project.facts.map((fact, i) => (
                        <div key={fact.label} className={`flex items-baseline gap-4 py-2.5 ${i > 0 ? "border-t border-screen-line" : ""}`}>
                          <dt className="t-mono order-2 text-[0.75rem] text-screen-graphite">{fact.label}</dt>
                          <dd className="order-1 w-[4.5rem] shrink-0 font-mono text-[1.375rem] font-medium leading-none tracking-tight tabular-nums">
                            {fact.value}
                          </dd>
                        </div>
                      ))}
                    </dl>

                    <div className="mt-7 border-l-2 border-ink pl-4">
                      <h4 className="font-semibold text-ink">{project.hardPart.title}</h4>
                      <p className="mt-1.5 text-ink-2">{project.hardPart.body}</p>
                    </div>

                    <DotList items={project.stack} className="t-mono mt-6 text-graphite" />
                    <div className="mt-5">
                      <ExternalLinks links={project.links} />
                    </div>
                  </div>

                  <div className={`min-w-0 lg:col-span-7 lg:row-start-1 ${flip ? "lg:col-start-1" : "lg:col-start-6"}`}>
                    {/* The mat: a raised surface with a label tab, so the screenshot reads as an object. */}
                    <div className="panel p-3 sm:p-7">
                      <p className="t-mono mb-3 inline-block rounded-lg border border-rule bg-paper px-2 py-0.5 text-[0.75rem] text-ink-2 sm:mb-4">
                        {pad(index + 1)} · {project.tab}
                      </p>
                      <ProjectShot name={project.name} shot={project.shot} phone={project.phone} />
                    </div>
                  </div>
                </article>
              );
            })}
          </div>

          <div className="mt-20 border-t border-rule pt-10 sm:mt-28">
            <h3 className="t-item">More projects</h3>
            <ul className="mt-8 grid gap-x-12 gap-y-9 md:grid-cols-2">
              {otherProjects.map((project) => (
                <li key={project.name}>
                  <h4 className="font-semibold">
                    {project.href ? (
                      <a href={project.href} target="_blank" rel="noreferrer" className="link">
                        {project.name}
                        <span className="link-arrow" aria-hidden="true">
                          ↗
                        </span>
                        <span className="sr-only"> (opens in a new tab)</span>
                      </a>
                    ) : (
                      project.name
                    )}
                  </h4>
                  <p className="measure mt-1.5 text-[0.9375rem] leading-relaxed text-ink-2">{project.summary}</p>
                  <DotList items={project.stack.split(", ")} className="t-mono mt-2 text-graphite" />
                </li>
              ))}
            </ul>
          </div>
        </Section>

        <Section id="experience" index="02" title="Experience" meta={`${experience.length} roles · ${experience[experience.length - 1].start} – now`}>
          <ol className="border-t border-rule">
            {experience.map((job) => {
              const current = job.end === "Now";
              return (
                <li key={`${job.company}-${job.start}`} className={`${ROW} border-b border-rule py-7`}>
                  <p className={`${ROW_LABEL} flex items-center gap-2`}>
                    {current && <span className="size-1.5 rounded-full bg-go" aria-hidden="true" />}
                    <span className={current ? "text-ink" : undefined}>
                      {job.start} – {job.end}
                    </span>
                    <span className="lg:hidden" aria-hidden="true">
                      ·
                    </span>
                    <span className="lg:hidden">{job.place}</span>
                  </p>
                  <div className="min-w-0 lg:col-span-7">
                    <h3 className="t-item">
                      {job.link ? (
                        <a href={job.link} target="_blank" rel="noreferrer" className="link">
                          {job.company}
                          <span className="link-arrow text-[0.85em]" aria-hidden="true">
                            ↗
                          </span>
                          <span className="sr-only"> (opens in a new tab)</span>
                        </a>
                      ) : (
                        job.company
                      )}
                    </h3>
                    <p className="mt-0.5 text-[0.9375rem] text-graphite">{job.role}</p>
                    <p className="measure mt-3 text-ink-2">{job.summary}</p>
                  </div>
                  <p className="t-mono hidden text-right text-graphite lg:col-span-2 lg:block lg:pt-[0.3rem]">{job.place}</p>
                </li>
              );
            })}
          </ol>
        </Section>

        <Section id="background" index="03" title="Background" meta={`${education.degree.replace("BSc in ", "BSc ")} · ${education.graduation}`}>
          <div className="border-t border-rule">
            <div className={`${ROW} border-b border-rule py-7`}>
              <p className={ROW_LABEL}>Education</p>
              <div className={ROW_BODY}>
                <h3 className="t-item">{education.school}</h3>
                <p className="mt-0.5 text-[0.9375rem] text-graphite">
                  {education.degree}, graduating {education.graduation} · {education.honours}
                </p>
                <p className="measure mt-3 text-ink-2">
                  Courses I&apos;d point to: {education.coursework.join(", ").toLowerCase()}.
                </p>
              </div>
            </div>
            <div className={`${ROW} border-b border-rule py-7`}>
              <h3 className={ROW_LABEL}>Tools</h3>
              <dl className={`${ROW_BODY} grid grid-cols-2 gap-x-6 gap-y-7 md:grid-cols-4`}>
                {skills.map((skill) => (
                  <div key={skill.group}>
                    <dt className="t-mono text-graphite">{skill.group}</dt>
                    <dd className="mt-2">
                      <ul className="t-mono space-y-0.5 text-ink-2">
                        {skill.items.split(", ").map((item) => (
                          <li key={item}>{item}</li>
                        ))}
                      </ul>
                    </dd>
                  </div>
                ))}
              </dl>
            </div>
          </div>
        </Section>

        <Section id="writing" index="04" title="Writing" meta={posts.length > 0 ? `${posts.length} posts · since ${formatMonth(posts[posts.length - 1].date)}` : undefined}>
          {posts.length > 0 ? (
            <ul className="border-t border-rule">
              {posts.slice(0, 4).map((post) => {
                const summary = excerpt(post.excerpt, post.title, 92);
                return (
                  <li key={post.slug} className="border-b border-rule">
                    <Link href={`/blogs/${post.slug}`} className={`${ROW} group py-6`}>
                      <span className={ROW_LABEL}>{formatDate(post.date)}</span>
                      <span className={ROW_BODY}>
                        <span className="t-item block underline decoration-transparent decoration-1 underline-offset-[0.25em] transition-[text-decoration-color] duration-200 group-hover:decoration-signal-text">
                          {post.title.trim()}
                        </span>
                        {summary && <span className="measure mt-1 line-clamp-2 text-ink-2 lg:line-clamp-1 lg:max-w-none">{summary}</span>}
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="text-ink-2">No posts yet.</p>
          )}
          <p className={`${ROW} mt-6`}>
            <span className="lg:col-span-9 lg:col-start-4">
              <Link href="/blogs" className="link text-[0.9375rem] font-[550]">
                All {posts.length} posts
                <span className="link-arrow" aria-hidden="true">
                  →
                </span>
              </Link>
            </span>
          </p>
        </Section>

        {/* Contact: the nameplate. */}
        <section id="contact" aria-labelledby="contact-title" className="scroll-mt-16 border-t border-rule">
          <div className="mx-auto max-w-[76rem] px-4 py-16 sm:px-8 sm:py-24">
            <div className="panel plate grid gap-x-12 gap-y-10 p-6 sm:p-12 lg:grid-cols-12">
              <div className="min-w-0 lg:col-span-8">
                <div className="flex items-start gap-3">
                  <span className="t-mono mt-[0.2rem] text-graphite sm:mt-[0.3rem]" aria-hidden="true">
                    05
                  </span>
                  <h2 id="contact-title" className="t-section">
                    Hiring for 2027?
                  </h2>
                </div>
                <p className="measure mt-5 text-[1.125rem] leading-relaxed text-ink-2 sm:text-[1.25rem]">
                  I&apos;m looking for a full-time software engineering role starting January 2027, in Calgary, remote, or
                  somewhere I can move to. {profile.workAuth}
                </p>
                <a
                  href={`mailto:${profile.email}`}
                  data-track="email"
                  className="mt-9 block text-[clamp(1.0625rem,4.5vw,2.25rem)] font-semibold leading-[1.15] tracking-[-0.02em] text-ink underline decoration-ink decoration-2 underline-offset-[0.22em] transition-[text-decoration-color] duration-200 hover:decoration-signal-text"
                >
                  {profile.email.split("@")[0]}
                  <wbr />@{profile.email.split("@")[1]}
                </a>
                <div className="mt-8 flex flex-wrap gap-2.5">
                  <a href={`mailto:${profile.email}`} className="key key-signal" data-track="email">
                    Email me
                  </a>
                  <CopyEmail email={profile.email} className="key" />
                  <a href={RESUME_PATH} className="key" data-track="resume-download">
                    Résumé
                    <span className="font-mono text-[0.75rem] font-medium text-graphite">PDF</span>
                  </a>
                  <a href={profile.linkedin} className="key" target="_blank" rel="noreferrer" data-track="linkedin">
                    LinkedIn
                    <span className="sr-only"> (opens in a new tab)</span>
                  </a>
                </div>
              </div>

              <div className="grid gap-x-8 gap-y-6 sm:grid-cols-[10rem_minmax(0,1fr)] sm:items-end lg:col-span-4 lg:block">
                <div className="relative aspect-[4/5] w-36 overflow-hidden rounded-xl border border-rule-strong bg-paper sm:w-full lg:w-[12.5rem]">
                  {/* Head and shoulders, cropped from the square original. */}
                  <Image
                    src="/abdelrahman.jpg"
                    width={460}
                    height={460}
                    alt="Abdelrahman Mohamed in a suit, standing outdoors by a river on a sunny day"
                    sizes="(min-width: 1024px) 420px, 340px"
                    className="absolute left-[-50%] top-[-14.5%] h-auto w-[209%] max-w-none"
                  />
                </div>
                <dl className="spec t-mono lg:mt-6">
                  {profile.plate.map((row) => (
                    <div key={row.label}>
                      <dt>{row.label}</dt>
                      <dd>{row.value}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
