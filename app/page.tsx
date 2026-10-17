import Image from "next/image";
import { GithubMark, LinkedinMark } from "@/components/brand-icons";
import { CopyEmail } from "@/components/copy-email";
import { DotList } from "@/components/dot-list";
import { HeroName } from "@/components/hero-name";
import { LiveSystem } from "@/components/live-system";
import { Magnetic } from "@/components/magnetic";
import { ProjectIndex } from "@/components/project-index";
import { ShotStill } from "@/components/project-shot";
import { Section } from "@/components/section";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { SpanStrip } from "@/components/span-strip";
import { SpringNumber } from "@/components/spring-number";
import { Tilt } from "@/components/tilt";
import { TransitionLink } from "@/components/transition-link";
import { getAllBlogs } from "@/lib/blogs";
import {
  RESUME_PATH,
  education,
  experience,
  featured,
  otherProjects,
  pinnedPosts,
  profile,
  skills,
  type FeaturedProject,
  type Link as ContentLink,
} from "@/lib/content";
import { formatDate } from "@/lib/date-utils";
import { pickHomePosts } from "@/lib/posts";
import { postVt } from "@/lib/text";

export const revalidate = 300;

const formatMonth = (date: string) => new Date(date).toLocaleDateString("en-US", { month: "short", year: "numeric", timeZone: "UTC" });

/** The home page shows only the most technical posts; the rest are one click away. */
const HOME_POSTS = 3;

/** The phrase in the intro that gets the highlighter, because the simulator beside it is where things break. */
const MARKED = "exactly where they break";

/** CSS load-sequence delay for an element. */
const at = (ms: number) => ({ ["--d" as string]: `${ms}ms` });

function ExternalLinks({ links }: { links: ContentLink[] }) {
  if (links.length === 0) return null;
  return (
    <ul className="relative z-[2] flex flex-wrap gap-x-6 gap-y-2">
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

function ResumeLabel() {
  return (
    <>
      Résumé
      <span className="font-mono text-[0.8125rem] font-medium text-graphite">PDF</span>
    </>
  );
}

function Intro() {
  const [before, after] = profile.intro.includes(MARKED) ? profile.intro.split(MARKED) : [profile.intro, null];
  return (
    <p className="a-rise measure text-[1.25rem] leading-[1.45] text-ink sm:text-[1.5rem] sm:leading-[1.35] sm:tracking-[-0.01em]" style={at(620)}>
      {before}
      {after !== null && (
        <>
          <span className="marker a-marker" style={at(1150)}>
            {MARKED}
          </span>
          {after}
        </>
      )}
    </p>
  );
}

/** A featured project as a card. The title is the link (stretched over the card) to its case page. */
function CaseCard({ project, index }: { project: FeaturedProject; index: number }) {
  const href = `/work/${project.slug}`;
  return (
    <article aria-labelledby={`${project.slug}-title`} className="panel spot case-card s-rise p-4 sm:p-6 lg:p-8">
      <div className="grid gap-y-8 lg:grid-cols-12 lg:gap-x-8">
        <div className="flex min-w-0 flex-col lg:col-span-5">
          <p className="t-mono flex items-center gap-3 text-graphite">
            <span className="text-ink">{String(index + 1).padStart(2, "0")}</span>
            <span>{project.role}</span>
          </p>
          <h3 id={`${project.slug}-title`} className="t-display mt-4 text-[clamp(2.5rem,5vw,4.25rem)]">
            <TransitionLink href={href} className="case-link inline-block" style={{ viewTransitionName: `title-${project.slug}` }}>
              {project.name}
            </TransitionLink>
          </h3>
          <p className="mt-5 text-ink-2">{project.summary}</p>

          <dl className="stat-row mt-8">
            {project.facts.map((fact) => (
              <div key={fact.label}>
                <dt>{fact.label}</dt>
                <dd>
                  <SpringNumber value={fact.value} />
                </dd>
              </div>
            ))}
          </dl>

          <div className="mt-auto flex flex-wrap items-center gap-x-6 gap-y-3 pt-8">
            <span className="case-cta t-mono inline-flex items-center gap-2 text-ink" aria-hidden="true">
              <span className="case-cta-dot" />
              Read the case
              <span className="case-cta-arrow">→</span>
            </span>
            <ExternalLinks links={project.links} />
          </div>
        </div>

        <Tilt className="min-w-0 lg:col-span-7 lg:self-center">
          <ShotStill shot={project.shot} phone={project.phone} slug={project.slug} sizes={project.phone ? "(min-width: 1024px) 520px, 70vw" : "(min-width: 1024px) 660px, 100vw"} />
        </Tilt>
      </div>
    </article>
  );
}

/** Mono label on the left three columns, content on the right nine: Experience, Background and Writing share it. */
const ROW = "grid gap-x-6 gap-y-2 lg:grid-cols-12 lg:items-start";
const ROW_LABEL = "t-mono text-graphite lg:col-span-3 lg:pt-[0.3rem]";
const ROW_BODY = "min-w-0 lg:col-span-9";

export default async function Home() {
  const posts = await getAllBlogs();
  const shown = pickHomePosts(posts, pinnedPosts, HOME_POSTS);
  const toolCount = skills.reduce((sum, skill) => sum + skill.items.split(", ").length, 0);

  return (
    <>
      <SiteHeader />
      <main id="main">
        {/* Hero: the name as big as one line allows, then the facts on the left and the simulator on the right. */}
        <section aria-labelledby="hero-name" className="overflow-x-clip">
          <div className="mx-auto max-w-[76rem] px-4 pb-6 pt-4 sm:px-8 sm:pb-10 sm:pt-6">
            <div className="hero-fit">
              <h1 id="hero-name" className="t-name hero-name select-none">
                <span className="sr-only">{profile.name}</span>
                <HeroName first={profile.firstName} last={profile.lastName} />
              </h1>
            </div>

            <div className="mt-8 grid gap-y-12 sm:mt-12 lg:grid-cols-12 lg:grid-rows-[auto_1fr] lg:gap-x-8">
              <div className="min-w-0 lg:col-span-5 lg:row-start-1">
                <Intro />

                {/* What a recruiter checks first: when, then work authorization and where. */}
                <div className="a-rise mt-7 text-[0.9375rem] leading-[1.5]" style={at(780)}>
                  <p className="flex items-center gap-2.5 font-[550] text-ink">
                    <span className="relative flex size-2.5 shrink-0" aria-hidden="true">
                      <span className="lamp-ping absolute inset-0 rounded-full bg-go" />
                      <span className="relative size-2.5 rounded-full border border-signal-edge bg-go" />
                    </span>
                    {profile.status}
                  </p>
                  <div className="mt-1 pl-5">
                    <DotList items={profile.facts} label="Work authorization and location" breakAfter={1} className="text-ink-2" />
                  </div>
                </div>

                <div className="a-rise mt-8 flex flex-wrap gap-2 sm:gap-2.5" style={at(900)}>
                  <Magnetic>
                    <a href={`mailto:${profile.email}`} className="key key-ink" data-track="email">
                      Email me
                    </a>
                  </Magnetic>
                  <Magnetic>
                    <a href={RESUME_PATH} className="key" data-track="resume-download">
                      <ResumeLabel />
                    </a>
                  </Magnetic>
                  <Magnetic strength={0.4}>
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
                  </Magnetic>
                  <Magnetic strength={0.4}>
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
                  </Magnetic>
                </div>

              </div>

              <div id="play" className="min-w-0 scroll-mt-24 lg:col-span-7 lg:col-start-6 lg:row-span-2 lg:row-start-1">
                <LiveSystem />
              </div>

              {/* The personal line, as a small spec sheet. */}
              <div className="a-rise min-w-0 lg:col-span-5 lg:row-start-2 lg:mt-12" style={at(1020)}>
                <h2 className="t-mono text-graphite">Off the clock</h2>
                <dl className="mt-3 grid grid-cols-2 gap-2">
                  {profile.offTheClock.map((row) => (
                    <div key={row.label} className="clock-tile flex min-h-[5.5rem] flex-col justify-between rounded-2xl border border-rule bg-paper-raised p-3.5 shadow-[var(--key-shadow)]">
                      <dt className="t-mono text-graphite">{row.label}</dt>
                      <dd className="t-wide mt-3 text-[1.1875rem] font-[650] leading-[1.1] tracking-[-0.015em] text-ink">{row.value}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            </div>
          </div>
        </section>

        <Section id="work" index="01" title="Work" meta={`${featured.length} cases · ${otherProjects.length} more`}>
          <div className="space-y-6 sm:space-y-8">
            {featured.map((project, index) => (
              <CaseCard key={project.slug} project={project} index={index} />
            ))}
          </div>

          <div className="mt-20 sm:mt-28">
            <h3 className="t-mono mb-4 text-graphite">More projects</h3>
            <ProjectIndex items={otherProjects} />
          </div>
        </Section>

        <Section
          id="experience"
          index="02"
          title="Experience"
          meta={`${experience.length} roles · ${experience[experience.length - 1].start} – now`}
        >
          <SpanStrip jobs={experience} until={profile.availableFrom} />
          <ol className="mt-12 sm:mt-16">
            {experience.map((job) => {
              const current = job.end === "Now";
              return (
                <li key={`${job.company}-${job.start}`} className={`${ROW} s-rise-sm border-b border-rule py-8 first:pt-0`}>
                  <div className={`${ROW_LABEL} flex flex-wrap gap-x-2 lg:block`}>
                    <p className="flex items-center gap-2">
                      {current && <span className="size-2 rounded-full border border-signal-edge bg-signal" aria-hidden="true" />}
                      <span className={current ? "text-ink" : undefined}>
                        {job.start} – {current ? "now" : job.end}
                      </span>
                    </p>
                    <p>
                      <span className="lg:hidden" aria-hidden="true">
                        ·{" "}
                      </span>
                      {job.place}
                    </p>
                  </div>
                  <div className={ROW_BODY}>
                    <h3 className="t-title text-[clamp(1.5rem,2.4vw,1.875rem)]">
                      {job.link ? (
                        <a href={job.link} target="_blank" rel="noreferrer" className="link">
                          {job.company}
                          <span className="link-arrow text-[0.7em]" aria-hidden="true">
                            ↗
                          </span>
                          <span className="sr-only"> (opens in a new tab)</span>
                        </a>
                      ) : (
                        job.company
                      )}
                    </h3>
                    <p className="mt-1 text-[0.9375rem] text-graphite">{job.role}</p>
                    <p className="measure mt-3 text-ink-2">{job.summary}</p>
                  </div>
                </li>
              );
            })}
          </ol>
        </Section>

        <Section id="background" index="03" title="Background" meta={`${skills.length} toolkits · ${toolCount} tools`}>
          <div className={ROW}>
            <h3 className={ROW_LABEL}>Education</h3>
            <div className={ROW_BODY}>
              <p className="t-title text-[clamp(1.5rem,2.4vw,1.875rem)]">{education.school}</p>
              <p className="mt-1 text-[0.9375rem] text-graphite">
                {education.degree}, graduating {education.graduation} · {education.honours}
              </p>
              <p className="measure mt-3 text-ink-2">Courses I&apos;d point to: {education.coursework.join(", ").toLowerCase()}.</p>
            </div>
          </div>
          <div className="panel s-rise mt-10 bg-well py-5 shadow-none sm:py-6">
            <h3 className="t-mono px-5 pb-4 text-ink-2 lg:px-6">Tools</h3>
            <dl className="space-y-4 sm:space-y-3">
              {skills.map((skill) => (
                <div key={skill.group} className="grid gap-y-2 px-5 lg:grid-cols-12 lg:items-start lg:gap-x-6 lg:px-0">
                  <dt className="t-mono text-graphite lg:col-span-3 lg:pl-6 lg:pt-[0.4rem]">{skill.group}</dt>
                  <dd className="min-w-0 lg:col-span-9 lg:pr-6">
                    <ul className="flex flex-wrap gap-1.5">
                      {skill.items.split(", ").map((item) => (
                        <li key={item} className="keycap">
                          {item}
                        </li>
                      ))}
                    </ul>
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        </Section>

        <Section id="writing" index="04" title="Writing" meta={posts.length > 0 ? `${posts.length} posts · since ${formatMonth(posts[posts.length - 1].date)}` : undefined}>
          {shown.length > 0 ? (
            <ul className="border-t border-rule">
              {shown.map((post) => (
                <li key={post.slug} className="s-rise-sm border-b border-rule">
                  <TransitionLink href={`/blogs/${post.slug}`} className={`${ROW} post-row group py-7`}>
                    <span className={`${ROW_LABEL} transition-colors duration-200 group-hover:text-ink`}>{formatDate(post.date)}</span>
                    <span className={ROW_BODY}>
                      <span className="t-title block text-[clamp(1.5rem,2.6vw,2rem)]" style={{ viewTransitionName: postVt(post.slug) }}>
                        <span className="post-title">{post.title.trim()}</span>
                        <span className="post-arrow ml-3 inline-block text-graphite" aria-hidden="true">
                          →
                        </span>
                      </span>
                      <span className="measure mt-2 line-clamp-2 text-ink-2 lg:line-clamp-1 lg:max-w-none">{post.teaser}</span>
                    </span>
                  </TransitionLink>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-ink-2">No posts yet.</p>
          )}
          <p className={`${ROW} mt-8`}>
            <span className="lg:col-span-9 lg:col-start-4">
              <TransitionLink href="/blogs" className="link text-[0.9375rem] font-[550]">
                All {posts.length} posts
                <span className="link-arrow" aria-hidden="true">
                  →
                </span>
              </TransitionLink>
            </span>
          </p>
        </Section>

        {/* Contact: the page closes on the simulator's black, with the volt key. */}
        <section id="contact" aria-labelledby="contact-title" className="scroll-mt-24">
          <div className="mx-auto max-w-[76rem] px-4 pb-20 sm:px-8 sm:pb-28">
            <div className="console spot s-rise grid gap-x-12 gap-y-10 p-6 sm:p-12 lg:grid-cols-[minmax(0,1fr)_17rem] lg:p-14">
              <div className="flex min-w-0 flex-col justify-between gap-y-10">
                <div>
                  <p className="t-mono text-graphite" aria-hidden="true">
                    05 · Contact
                  </p>
                  <h2 id="contact-title" className="t-section mt-5 text-[clamp(3rem,8vw,6.5rem)]">
                    Hiring for <span className="marker">2027?</span>
                  </h2>
                  <p className="measure mt-6 text-[1.125rem] leading-relaxed text-ink-2 sm:text-[1.25rem]">
                    I&apos;m looking for a full-time software engineering role starting January 2027, in Calgary, remote, or
                    somewhere I can move to. {profile.workAuth}
                  </p>
                </div>
                <div>
                  <a
                    href={`mailto:${profile.email}`}
                    data-track="email"
                    className="link block w-fit text-[clamp(1.125rem,4.4vw,2.5rem)] font-semibold leading-[1.15] tracking-[-0.02em]"
                  >
                    {profile.email.split("@")[0]}
                    <wbr />@{profile.email.split("@")[1]}
                  </a>
                  <div className="mt-8 flex flex-wrap gap-2.5">
                    <Magnetic>
                      <a href={`mailto:${profile.email}`} className="key key-signal" data-track="email">
                        Email me
                      </a>
                    </Magnetic>
                    <Magnetic>
                      <CopyEmail email={profile.email} className="key" />
                    </Magnetic>
                    <Magnetic>
                      <a href={RESUME_PATH} className="key" data-track="resume-download">
                        <ResumeLabel />
                      </a>
                    </Magnetic>
                    <Magnetic>
                      <a href={profile.linkedin} className="key" target="_blank" rel="noreferrer" data-track="linkedin">
                        LinkedIn
                        <span className="sr-only"> (opens in a new tab)</span>
                      </a>
                    </Magnetic>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-[5.5rem_minmax(0,1fr)] items-start gap-x-4 sm:grid-cols-[10rem_minmax(0,1fr)] sm:gap-x-8 lg:block">
                <div className="relative aspect-[4/5] w-full overflow-hidden rounded-2xl border border-rule-strong bg-well lg:aspect-square">
                  {/* Head and shoulders at 4:5; the square desktop frame trims the shoulders. */}
                  <Image
                    src="/portrait-snow.jpg"
                    width={1200}
                    height={1500}
                    alt="Abdelrahman Mohamed smiling outdoors in the snow"
                    sizes="(min-width: 1024px) 300px, (min-width: 640px) 160px, 88px"
                    className="absolute inset-0 size-full object-cover object-top"
                  />
                </div>
                <dl className="spec lg:mt-6">
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
