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
import { SpanStrip } from "@/components/span-strip";
import { CircuitOrigin, CircuitRun, CircuitTap } from "@/components/circuit";
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
  type Link as ContentLink,
} from "@/lib/content";
import { formatDate } from "@/lib/date-utils";
import { pickHomePosts } from "@/lib/posts";

export const revalidate = 300;

const formatMonth = (date: string) => new Date(date).toLocaleDateString("en-US", { month: "short", year: "numeric", timeZone: "UTC" });

/** The home page shows only the most technical posts; the rest are one click away. */
const HOME_POSTS = 3;

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

function ResumeLabel() {
  return (
    <>
      Résumé
      <span className="font-mono text-[0.8125rem] font-medium text-graphite">PDF</span>
    </>
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
        {/* Hero: the name and the facts on the left, the simulator (a small device) on the right. */}
        <section aria-labelledby="hero-name">
          <div className="relative mx-auto grid max-w-[76rem] gap-y-10 px-4 pb-16 pt-6 sm:px-8 sm:pb-20 sm:pt-16 lg:grid-cols-12 lg:grid-rows-[auto_1fr] lg:gap-x-6">
            {/* The signal trace leaves the simulator here and runs down the page to the contact console. */}
            <CircuitOrigin />
            <div className="min-w-0 lg:col-span-5 lg:col-start-1 lg:row-start-1">
              <h1 id="hero-name" className="t-display sm:mt-4">
                {profile.firstName}
                <br />
                {profile.lastName}
              </h1>
              <p className="measure mt-5 text-[1.0625rem] leading-[1.55] text-ink sm:text-[1.25rem] sm:leading-[1.45]">{profile.intro}</p>
              {/* What a recruiter checks first: when, then work authorization and where. */}
              <div className="mt-5 text-[0.9375rem] leading-[1.5]">
                <p className="flex items-center gap-2 font-[550] text-ink">
                  <span className="size-1.5 shrink-0 rounded-full bg-go" aria-hidden="true" />
                  {profile.status}
                </p>
                <div className="mt-0.5 pl-3.5">
                  <DotList items={profile.facts} label="Work authorization and location" breakAfter={1} className="text-ink-2" />
                </div>
              </div>

              {/* Ink, not orange: up here the only orange is on the device. */}
              <div className="mt-7 flex flex-wrap gap-2.5">
                <a href={`mailto:${profile.email}`} className="key key-ink" data-track="email">
                  Email me
                </a>
                <a href={RESUME_PATH} className="key" data-track="resume-download">
                  <ResumeLabel />
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
              <dl className="spec mt-2">
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
              const textCols = flip ? "lg:col-span-5 lg:col-start-8" : "lg:col-span-5 lg:col-start-1";
              const matCols = flip ? "lg:col-span-7 lg:col-start-1" : "lg:col-span-7 lg:col-start-6";
              return (
                <article
                  key={project.slug}
                  aria-labelledby={`${project.slug}-title`}
                  className="relative grid gap-y-8 lg:grid-cols-12 lg:grid-rows-[auto_1fr] lg:gap-x-6 lg:gap-y-0"
                >
                  {/* A mat on the content edge gets a tap, level with its browser bar (on the article, so it stays put while the mat sticks). */}
                  {!flip && <CircuitTap className="top-[44px] max-lg:hidden" />}
                  {/* On a phone the screenshot comes straight after the summary. */}
                  <div className={`min-w-0 lg:row-start-1 ${textCols}`}>
                    <h3 id={`${project.slug}-title`} className="t-title">
                      {project.name}
                    </h3>
                    <p className="t-mono mt-2 text-graphite">{project.role}</p>
                    <p className="mt-4 text-ink">{project.summary}</p>
                  </div>

                  {/* The mat: a raised surface the screenshot sits on. It stays in view while the text scrolls. */}
                  <div className={`min-w-0 lg:sticky lg:top-24 lg:row-span-2 lg:row-start-1 lg:self-start ${matCols}`}>
                    <div className="panel p-3 pb-4 sm:p-7">
                      <ProjectShot name={project.name} shot={project.shot} phone={project.phone} figure={index + 1} caption={project.caption} />
                    </div>
                  </div>

                  <div className={`min-w-0 lg:row-start-2 lg:pt-6 ${textCols}`}>
                    <dl className="stat-row">
                      {project.facts.map((fact) => (
                        <div key={fact.label}>
                          <dt>{fact.label}</dt>
                          <dd>{fact.value}</dd>
                        </div>
                      ))}
                    </dl>

                    <div className="mt-7 border-l-2 border-rule-strong pl-4">
                      <h4 className="font-semibold text-ink">{project.hardPart.title}</h4>
                      <p className="mt-1.5 text-ink-2">{project.hardPart.body}</p>
                    </div>

                    <DotList items={project.stack} label="Stack" className="t-mono mt-6 text-graphite" />
                    <div className="mt-5">
                      <ExternalLinks links={project.links} />
                    </div>
                  </div>
                </article>
              );
            })}
          </div>

          <div className={`${ROW} mt-20 border-t border-rule pt-10 sm:mt-28`}>
            <h3 className={ROW_LABEL}>More projects</h3>
            <ul className={`${ROW_BODY} mt-4 grid gap-x-6 gap-y-9 md:grid-cols-2 lg:mt-0`}>
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
                    {project.note && <span className="t-mono ml-2.5 font-normal text-graphite">{project.note}</span>}
                  </h4>
                  <p className="measure mt-1.5 text-[0.9375rem] leading-relaxed text-ink-2">{project.summary}</p>
                  <DotList items={project.stack.split(", ")} label="Stack" className="t-mono mt-2 text-graphite" />
                </li>
              ))}
            </ul>
          </div>
        </Section>

        <Section
          id="experience"
          index="02"
          title="Experience"
          meta={`${experience.length} roles · ${experience[experience.length - 1].start} – now`}
        >
          <div className="relative">
            <SpanStrip jobs={experience} until={profile.availableFrom} />
            {/* Level with the first lane, the current role. */}
            <CircuitTap className="top-[26px] max-lg:hidden" />
          </div>
          <ol className="mt-12 sm:mt-14">
            {experience.map((job) => {
              const current = job.end === "Now";
              return (
                <li key={`${job.company}-${job.start}`} className={`${ROW} border-b border-rule py-7 first:pt-0`}>
                  <div className={`${ROW_LABEL} flex flex-wrap gap-x-2 lg:block`}>
                    <p className="flex items-center gap-2">
                      {current && <span className="size-1.5 rounded-full bg-signal" aria-hidden="true" />}
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
                </li>
              );
            })}
          </ol>
        </Section>

        <Section id="background" index="03" title="Background" meta={`${skills.length} toolkits · ${toolCount} tools`}>
          <div className={ROW}>
            <h3 className={ROW_LABEL}>Education</h3>
            <div className={ROW_BODY}>
              <p className="t-item">{education.school}</p>
              <p className="mt-0.5 text-[0.9375rem] text-graphite">
                {education.degree}, graduating {education.graduation} · {education.honours}
              </p>
              <p className="measure mt-3 text-ink-2">Courses I&apos;d point to: {education.coursework.join(", ").toLowerCase()}.</p>
            </div>
          </div>
          {/* A keyboard of what I use: one row of keycaps per toolkit, on one panel. The panel's rows sit on
              the page grid, so the keys start on the same edge as the text above. */}
          <div className="panel relative mt-8 py-4">
            <CircuitTap className="top-[26px] max-lg:hidden" />
            <h3 className="t-mono px-4 pb-3 text-ink-2">Tools</h3>
            <dl className="space-y-3 sm:space-y-2.5">
              {skills.map((skill) => (
                <div key={skill.group} className="grid gap-y-2 px-4 lg:grid-cols-12 lg:items-start lg:gap-x-6 lg:px-0">
                  <dt className="t-mono text-graphite lg:col-span-3 lg:pl-4 lg:pt-[0.3rem]">{skill.group}</dt>
                  <dd className="min-w-0 lg:col-span-9 lg:pr-4">
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
            <ul>
              {shown.map((post) => (
                <li key={post.slug} className="border-b border-rule first:[&>a]:pt-0">
                  <Link href={`/blogs/${post.slug}`} className={`${ROW} group py-6`}>
                    <span className={`${ROW_LABEL} transition-colors duration-200 group-hover:text-ink`}>{formatDate(post.date)}</span>
                    <span className={ROW_BODY}>
                      <span className="t-item block">
                        <span className="underline decoration-transparent decoration-2 underline-offset-[0.25em] transition-[text-decoration-color] duration-200 group-hover:decoration-signal-text">
                          {post.title.trim()}
                        </span>
                        <span
                          className="ml-2 inline-block text-graphite transition-[color,transform] duration-200 group-hover:translate-x-0.5 group-hover:text-signal-text"
                          aria-hidden="true"
                        >
                          →
                        </span>
                      </span>
                      <span className="measure mt-1 line-clamp-2 text-ink-2 lg:line-clamp-1 lg:max-w-none">{post.teaser}</span>
                    </span>
                  </Link>
                </li>
              ))}
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

        {/* Contact: the console. The page closes on the simulator's charcoal, with the orange key, and the trace ends in it. */}
        <section id="contact" aria-labelledby="contact-title" className="circuit-host scroll-mt-16 border-t border-rule">
          {/* The trace ends here: it turns into the console and its pad stays lit. */}
          <CircuitRun end />
          <div className="mx-auto max-w-[76rem] px-4 py-16 sm:px-8 sm:py-24">
            <div className="console grid gap-x-12 gap-y-8 p-5 sm:p-12 lg:grid-cols-[minmax(0,1fr)_16.875rem]">
              <CircuitTap kind="end" />
              {/* Title and pitch at the top, the address and keys level with the last spec row. */}
              <div className="flex min-w-0 flex-col justify-between gap-y-8">
                <div>
                  <p className="t-mono mb-2 text-graphite" aria-hidden="true">
                    05
                  </p>
                  <h2 id="contact-title" className="t-section">
                    Hiring for 2027?
                  </h2>
                  <p className="measure mt-5 text-[1.0625rem] leading-relaxed text-ink-2 sm:text-[1.25rem]">
                    I&apos;m looking for a full-time software engineering role starting January 2027, in Calgary, remote, or
                    somewhere I can move to. {profile.workAuth}
                  </p>
                </div>
                <div>
                  <a
                    href={`mailto:${profile.email}`}
                    data-track="email"
                    className="block text-[clamp(1.0625rem,4.6vw,2.5rem)] font-semibold leading-[1.15] tracking-[-0.02em] text-ink underline decoration-ink decoration-2 underline-offset-[0.22em] transition-[text-decoration-color] duration-200 hover:decoration-signal-text"
                  >
                    {profile.email.split("@")[0]}
                    <wbr />@{profile.email.split("@")[1]}
                  </a>
                  <div className="mt-7 flex flex-wrap gap-2.5">
                    <a href={`mailto:${profile.email}`} className="key key-signal" data-track="email">
                      Email me
                    </a>
                    <CopyEmail email={profile.email} className="key" />
                    <a href={RESUME_PATH} className="key" data-track="resume-download">
                      <ResumeLabel />
                    </a>
                    <a href={profile.linkedin} className="key" target="_blank" rel="noreferrer" data-track="linkedin">
                      LinkedIn
                      <span className="sr-only"> (opens in a new tab)</span>
                    </a>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-[5.5rem_minmax(0,1fr)] items-start gap-x-4 sm:grid-cols-[10rem_minmax(0,1fr)] sm:gap-x-8 lg:block">
                <div className="relative aspect-[4/5] w-full overflow-hidden rounded-xl border border-rule-strong bg-paper lg:aspect-square">
                  {/* Head and shoulders, cropped from the square original. */}
                  <Image
                    src="/abdelrahman.jpg"
                    width={460}
                    height={460}
                    alt="Abdelrahman Mohamed in a suit, standing outdoors by a river on a sunny day"
                    sizes="(min-width: 1024px) 570px, (min-width: 640px) 340px, 190px"
                    className="absolute left-[-50%] top-[-14.5%] h-auto w-[209%] max-w-none"
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
