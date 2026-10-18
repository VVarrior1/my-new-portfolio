import Image from "next/image";
import Link from "next/link";
import { GithubMark, LinkedinMark } from "@/components/brand-icons";
import { Choreo } from "@/components/choreo";
import { CopyEmail } from "@/components/copy-email";
import { DotList } from "@/components/dot-list";
import { Intro } from "@/components/intro";
import { LiquidField } from "@/components/liquid-field";
import { LiveSystem } from "@/components/live-system";
import { PageFx } from "@/components/page-fx";
import { ProjectShot } from "@/components/project-shot";
import { Count, Letters, Section } from "@/components/section";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { SpanStrip } from "@/components/span-strip";
import { Spine, Station } from "@/components/spine";
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

/** The short name each project flies into the HUD as, and lifts off its poster. */
const POSTER: Record<string, string> = { systemlab: "Systemlab", cyd: "CYD" };

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

/** Mono label on the left three columns, content on the right nine. */
const ROW = "grid gap-x-6 gap-y-2 lg:grid-cols-12 lg:items-start";
const ROW_LABEL = "t-mono text-graphite lg:col-span-3 lg:pt-[0.3rem]";
const ROW_BODY = "min-w-0 lg:col-span-9";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
/** "May 2025" → "0525", the four digits of the experience odometer (month, then year). */
const odoDigits = (label: string) => {
  const [month, year] = label.split(" ");
  return String(MONTHS.indexOf(month) + 1).padStart(2, "0") + (year ?? "").slice(2);
};

export default async function Home() {
  const posts = await getAllBlogs();
  const shown = pickHomePosts(posts, pinnedPosts, HOME_POSTS);
  const toolCount = skills.reduce((sum, skill) => sum + skill.items.split(", ").length, 0);
  const firstOdo = odoDigits(experience[0].start);

  return (
    <>
      <Intro />
      <SiteHeader overlay />
      <LiquidField />
      <PageFx />
      <Choreo />
      <main id="main" className="relative">
        <Spine />

        {/* Hero. The name and the facts on the left, held calm; the simulator floating on the right,
            with the current flowing into it. */}
        <section id="top" aria-labelledby="hero-name" className="relative">
          <div className="wrap grid min-h-[calc(100svh-4rem)] content-center gap-y-12 pb-20 pt-8 sm:pb-24 sm:pt-12 lg:grid-cols-12 lg:gap-x-8 lg:pb-24 lg:pt-4">
            <div data-calm="0.92" className="@container min-w-0 lg:col-span-6 lg:self-center">
              <p className="t-mono fade-up text-graphite" style={{ ["--d" as string]: "80ms" }}>
                {profile.role} · {profile.location}
              </p>
              <h1 id="hero-name" className="t-display t-name mt-5 sm:mt-6">
                <span className="rise-line">
                  <span>{profile.firstName}</span>
                </span>
                <span className="rise-line">
                  <span className="t-serif pr-[0.06em]" style={{ ["--d" as string]: "90ms" }}>
                    {profile.lastName}
                  </span>
                </span>
              </h1>
              <p
                className="measure fade-up mt-7 text-[1.1875rem] leading-[1.5] text-ink sm:mt-8 sm:text-[1.375rem] sm:leading-[1.42]"
                style={{ ["--d" as string]: "220ms" }}
              >
                {profile.intro}
              </p>
              <div className="fade-up mt-6 text-[0.9375rem] leading-[1.5]" style={{ ["--d" as string]: "300ms" }}>
                <p className="flex items-center gap-2 font-[550] text-ink">
                  <span className="size-1.5 shrink-0 rounded-full bg-go" aria-hidden="true" />
                  {profile.status}
                </p>
                <div className="mt-0.5 pl-3.5">
                  <DotList items={profile.facts} label="Work authorization and location" breakAfter={1} className="text-ink-2" />
                </div>
              </div>

              <div className="fade-up relative mt-8 flex flex-wrap gap-2 sm:gap-2.5" style={{ ["--d" as string]: "380ms" }}>
                <a href={`mailto:${profile.email}`} className="key key-ink" data-track="email">
                  Email me
                </a>
                <a href={RESUME_PATH} className="key" data-track="resume-download">
                  <ResumeLabel />
                </a>
                <a href={profile.github} className="key key-icon" target="_blank" rel="noreferrer" data-track="github" aria-label="GitHub (opens in a new tab)">
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

            <div id="play" className="fade-up min-w-0 scroll-mt-20 lg:col-span-6 lg:self-center" style={{ ["--d" as string]: "260ms" }} data-calm="0.8">
              <LiveSystem />
            </div>
          </div>
          <p className="scroll-cue t-mono" aria-hidden="true" data-calm="0.9">
            <span className="scroll-cue-line" />
            Scroll
          </p>
          <Station route="/" role="origin" className="spine-origin" />
        </section>

        {/* Off the clock: the personal line as two rivers of type running in opposite directions, at
            the speed you scroll. Screen readers (and reduced motion) get the plain list. */}
        <section aria-labelledby="off-the-clock" className="offclock relative" data-calm="0.7">
          <h2 id="off-the-clock" className="wrap t-mono text-graphite">
            Off the clock
          </h2>
          <dl className="offclock-list wrap">
            {profile.offTheClock.map((row) => (
              <div key={row.label} className="min-w-0">
                <dt className="t-mono text-graphite">{row.label}</dt>
                <dd className="mt-0.5 text-[1.0625rem] font-[550] text-ink">{row.value}</dd>
              </div>
            ))}
          </dl>
          <div className="marquee" aria-hidden="true">
            {[0, 1].map((row) => (
              <div key={row} className={`marquee-row ${row ? "marquee-row-b" : ""}`} data-marquee={row ? -1 : 1}>
                {[0, 1].map((copy) => (
                  <span key={copy} className="marquee-run">
                    {profile.offTheClock.map((item) => (
                      <span key={item.label} className="marquee-item">
                        <span className="t-serif marquee-label">{item.label.toLowerCase()}</span>
                        <span className="marquee-value">{item.value}</span>
                        <span className="marquee-dot" />
                      </span>
                    ))}
                  </span>
                ))}
              </div>
            ))}
          </div>
        </section>

        <Section id="work" index="01" hud="Work" title="Work" meta={`${featured.length} featured · ${otherProjects.length} more`}>
          <Station route="/work" />
          <div className="space-y-28 sm:space-y-40">
            {featured.map((project, index) => {
              const flip = index % 2 === 1;
              const word = POSTER[project.slug] ?? project.name;
              const rest = project.name.startsWith(word) ? project.name.slice(word.length).trim() : "";
              return (
                <article key={project.slug} aria-labelledby={`${project.slug}-title`} className="project relative">
                  <Station route={`/work/${project.slug}`} />
                  <header className={`project-head ${flip ? "project-head-flip" : ""}`}>
                    <p className="t-mono text-graphite" data-calm="0.9">
                      <span className="text-signal-text">{String(index + 1).padStart(2, "0")}</span>
                      <span className="px-2" aria-hidden="true">
                        /
                      </span>
                      {project.role}
                    </p>
                    <h3 id={`${project.slug}-title`} className="poster" data-hud={word} data-hud-source="" data-calm="0.85">
                      <Letters text={word} className="poster-word" />
                      {rest && (
                        <>
                          {" "}
                          <span className="poster-rest ml-auto w-fit" data-reveal="wipe">
                            {rest}
                          </span>
                        </>
                      )}
                    </h3>
                  </header>

                  <div className="mt-10 grid gap-y-10 lg:mt-14 lg:grid-cols-12 lg:gap-x-8">
                    <div className={`min-w-0 ${flip ? "lg:col-span-8 lg:col-start-5 lg:row-start-1" : "lg:col-span-8"}`}>
                      <ProjectShot name={project.name} shot={project.shot} phone={project.phone} figure={index + 1} caption={project.caption} />
                    </div>
                    <div className={`min-w-0 ${flip ? "lg:col-span-4 lg:col-start-1 lg:row-start-1" : "lg:col-span-4"}`} data-calm="0.94">
                      <p className="text-[1.125rem] leading-[1.55] text-ink" data-reveal="rise">
                        {project.summary}
                      </p>
                      <dl className="stat-stack mt-8" data-reveal="rise">
                        {project.facts.map((fact) => (
                          <div key={fact.label}>
                            <dt>{fact.label}</dt>
                            <dd>
                              <Count value={fact.value} />
                            </dd>
                          </div>
                        ))}
                      </dl>
                      <div className="mt-8 border-l-2 border-signal pl-4" data-reveal="rise">
                        <h4 className="font-semibold text-ink">{project.hardPart.title}</h4>
                        <p className="mt-1.5 text-ink-2">{project.hardPart.body}</p>
                      </div>
                      <DotList items={project.stack} label="Stack" className="t-mono mt-6 text-graphite" />
                      <div className="mt-5">
                        <ExternalLinks links={project.links} />
                      </div>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>

          <div className="mt-28 sm:mt-40">
            <h3 className="t-mono text-graphite" data-calm="0.9">
              More projects
            </h3>
            <ul className="mt-5 border-t border-rule" data-calm="0.9">
              {otherProjects.map((project, i) => (
                <li key={project.name} className="tide-row" data-reveal="rise" style={{ ["--d" as string]: `${i * 60}ms` }}>
                  <div className="tide-fill" aria-hidden="true" />
                  <div className={`${ROW} relative py-6 sm:py-7`}>
                    <p className={`${ROW_LABEL} tide-num`} aria-hidden="true">
                      {String(i + 3).padStart(2, "0")}
                    </p>
                    <div className={`${ROW_BODY} grid gap-x-6 gap-y-2 lg:grid-cols-9`}>
                      <h4 className="t-row lg:col-span-4">
                        {project.href ? (
                          <a href={project.href} target="_blank" rel="noreferrer" className="tide-link" data-cursor="Open">
                            {project.name}
                            <span className="link-arrow" aria-hidden="true">
                              ↗
                            </span>
                            <span className="sr-only"> (opens in a new tab)</span>
                          </a>
                        ) : (
                          project.name
                        )}
                        {project.note && <span className="t-mono ml-2.5 align-middle font-normal text-graphite">{project.note}</span>}
                      </h4>
                      <div className="min-w-0 lg:col-span-5">
                        <p className="text-[0.9375rem] leading-relaxed text-ink-2">{project.summary}</p>
                        <DotList items={project.stack.split(", ")} label="Stack" className="t-mono mt-2 text-graphite" />
                      </div>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </Section>

        {/* The résumé chapter, set in the opposite theme: the liquid turns over at its waterline. */}
        <div data-chapter="invert" className="chapter-invert">
          {/* The chapter's ground, under the liquid's canvas: what shows before the liquid runs and
              without WebGL, and what contrast checks see. The canvas draws the same colour over it. */}
          <span aria-hidden="true" className="chapter-ground" />
          <Section
            id="experience"
            index="02"
            hud="Experience"
            title="Experience"
            meta={`${experience.length} roles · ${experience[experience.length - 1].start} – now`}
          >
            <Station route="/experience" />
            <div className="exp grid gap-y-12 lg:grid-cols-12 lg:gap-x-8" data-experience>
              <div className="exp-pin min-w-0 lg:col-span-5">
                <div className="lg:sticky lg:top-40" data-calm="0.95">
                  <p className="t-mono text-graphite" aria-hidden="true">
                    Started <span data-exp-month>{experience[0].start}</span> · <span data-exp-company>{experience[0].company}</span>
                  </p>
                  <p className="odometer" aria-hidden="true">
                    {Array.from(firstOdo).map((digit, i) => (
                      <span key={i} className="contents">
                        {i === 2 && <span className="odo-sep">/</span>}
                        <span className="odo-col">
                          <span className="odo-reel" data-reel={i} style={{ ["--n" as string]: digit }}>
                            {Array.from({ length: 10 }, (_, n) => (
                              <span key={n}>{n}</span>
                            ))}
                          </span>
                        </span>
                      </span>
                    ))}
                  </p>
                  <div className="mt-8">
                    <SpanStrip jobs={experience} until={profile.availableFrom} />
                  </div>
                </div>
              </div>
              <ol className="min-w-0 lg:col-span-7">
                {experience.map((job, i) => {
                  const current = job.end === "Now";
                  return (
                    <li
                      key={`${job.company}-${job.start}`}
                      className="exp-role border-b border-rule py-9 first:pt-0"
                      data-role={i}
                      data-odo={odoDigits(job.start)}
                      data-month={job.start}
                      data-company={job.company}
                      data-reveal="rise"
                      data-calm="0.95"
                    >
                      <p className="t-mono flex flex-wrap items-center gap-x-2 text-graphite">
                        {current && <span className="size-1.5 rounded-full bg-signal" aria-hidden="true" />}
                        <span className={current ? "text-ink" : undefined}>
                          {job.start} – {current ? "now" : job.end}
                        </span>
                        <span aria-hidden="true">·</span>
                        <span>{job.place}</span>
                      </p>
                      <h3 className="t-role mt-2">
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
                    </li>
                  );
                })}
              </ol>
            </div>
          </Section>

          <Section id="background" index="03" hud="Background" title="Background" meta={`${skills.length} toolkits · ${toolCount} tools`}>
            <Station route="/background" />
            <div className="grid gap-y-14 lg:grid-cols-12 lg:gap-x-8">
              <div className="min-w-0 lg:col-span-5" data-calm="0.95">
                <p className="tools-count w-fit" aria-hidden="true" data-reveal="wipe">
                  <Count value={String(toolCount)} />
                </p>
                <p className="t-mono -mt-2 text-graphite" aria-hidden="true">
                  tools in {skills.length} toolkits, used in production or coursework
                </p>
                <div className="mt-12 border-t border-rule pt-8">
                  <h3 className="t-mono text-graphite">Education</h3>
                  <p className="t-role mt-3">{education.school}</p>
                  <p className="mt-1 text-[0.9375rem] text-graphite">
                    {education.degree}, graduating {education.graduation} · {education.honours}
                  </p>
                  <p className="measure mt-3 text-ink-2">Courses I&apos;d point to: {education.coursework.join(", ").toLowerCase()}.</p>
                </div>
              </div>
              <div className="min-w-0 lg:col-span-7" data-calm="0.95">
                <h3 className="t-mono text-graphite">Tools</h3>
                <dl className="mt-4 border-t border-rule" data-tools>
                  {skills.map((skill) => (
                    <div key={skill.group} className="grid gap-y-3 border-b border-rule py-5 sm:grid-cols-[10rem_minmax(0,1fr)] sm:gap-x-6">
                      <dt className="t-mono pt-[0.3rem] text-graphite">{skill.group}</dt>
                      <dd className="min-w-0">
                        <ul className="flex flex-wrap gap-1.5">
                          {skill.items.split(", ").map((item) => (
                            <li key={item} className="keycap tag">
                              {item}
                            </li>
                          ))}
                        </ul>
                      </dd>
                    </div>
                  ))}
                </dl>
              </div>
            </div>
          </Section>
        </div>

        <Section
          id="writing"
          index="04"
          hud="Writing"
          title="Writing"
          meta={posts.length > 0 ? `${posts.length} posts · since ${formatMonth(posts[posts.length - 1].date)}` : undefined}
        >
          <Station route="/writing" />
          {shown.length > 0 ? (
            <ul className="border-t border-rule" data-calm="0.92">
              {shown.map((post) => (
                <li key={post.slug} className="tide-row" data-reveal="rise">
                  <div className="tide-fill" aria-hidden="true" />
                  <Link href={`/blogs/${post.slug}`} className={`${ROW} relative py-7`} data-cursor="Read">
                    <span className={ROW_LABEL}>{formatDate(post.date)}</span>
                    <span className={ROW_BODY}>
                      <span className="t-row block">
                        {post.title.trim()}
                        <span className="tide-arrow" aria-hidden="true">
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
          <p className={`${ROW} mt-6`} data-calm="0.9">
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

        {/* Contact: the page ends where it began, on open water. The card assembles as it arrives. */}
        <section id="contact" aria-labelledby="contact-title" className="relative scroll-mt-16" data-hud="Contact" data-hud-index="05">
          <Station route="/contact" role="end" />
          <div className="wrap pb-24 pt-20 sm:pb-36 sm:pt-32">
            <div className="grid gap-x-12 gap-y-12 lg:grid-cols-12" data-contact>
              <div className="min-w-0 lg:col-span-8" data-calm="0.94">
                <p className="t-mono mb-4 text-graphite" aria-hidden="true">
                  <span className="text-signal-text">05</span> / Contact
                </p>
                <h2 id="contact-title" className="t-poster w-fit" data-reveal="wipe">
                  Hiring for <span className="t-serif">2027?</span>
                </h2>
                <p className="measure mt-7 text-[1.1875rem] leading-relaxed text-ink-2 sm:text-[1.375rem]" data-part>
                  I&apos;m looking for a full-time software engineering role starting January 2027, in Calgary, remote, or
                  somewhere I can move to. {profile.workAuth}
                </p>
                <a
                  href={`mailto:${profile.email}`}
                  data-track="email"
                  data-part
                  data-cursor="Write"
                  className="email-link mt-10 block text-[clamp(1.25rem,5.2vw,3.5rem)] font-semibold leading-[1.1] tracking-[-0.035em] text-ink"
                >
                  {profile.email.split("@")[0]}
                  <wbr />@{profile.email.split("@")[1]}
                </a>
                <div className="mt-9 flex flex-wrap gap-2.5" data-part>
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

              <div className="grid grid-cols-[6.5rem_minmax(0,1fr)] items-start gap-x-5 sm:grid-cols-[11rem_minmax(0,1fr)] sm:gap-x-8 lg:col-span-4 lg:block lg:pt-10" data-part>
                <div className="portrait relative w-full" data-gl="portrait">
                  <Image
                    src="/portrait-snow.jpg"
                    width={1200}
                    height={1500}
                    alt="Abdelrahman Mohamed smiling outdoors in the snow"
                    sizes="(min-width: 1024px) 360px, (min-width: 640px) 176px, 104px"
                    className="portrait-img block aspect-[4/5] h-auto w-full object-cover object-top"
                  />
                </div>
                <dl className="spec lg:mt-6" data-calm="0.95">
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
