import Image from "next/image";
import Link from "next/link";
import type { CSSProperties, ReactNode } from "react";
import { GithubMark, LinkedinMark } from "@/components/brand-icons";
import { Choreo } from "@/components/choreo";
import { CopyEmail } from "@/components/copy-email";
import { Count } from "@/components/count";
import { DotList } from "@/components/dot-list";
import { Hud } from "@/components/hud";
import { LiquidField } from "@/components/liquid-field";
import { LiveSystem } from "@/components/live-system";
import { ProjectShot } from "@/components/project-shot";
import { Section } from "@/components/section";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { SpanStrip } from "@/components/span-strip";
import { SplitLine } from "@/components/split";
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

export const revalidate = 300;

const formatMonth = (date: string) => new Date(date).toLocaleDateString("en-US", { month: "short", year: "numeric", timeZone: "UTC" });

/** The home page shows only the most technical posts; the rest are one click away. */
const HOME_POSTS = 3;

const pad = (n: number) => String(n).padStart(2, "0");
const delay = (ms: number) => ({ "--d": `${ms}ms` }) as CSSProperties;

/** A project's name in two voices: the sans, then its last part in the serif italic. */
const NAME_SPLIT: Record<FeaturedProject["slug"], [string, string]> = {
  systemlab: ["System", "lab"],
  cyd: ["CYD Soccer Academy ", "platform"],
};

function ExternalLinks({ links }: { links: ContentLink[] }) {
  if (links.length === 0) return null;
  return (
    <ul className="flex flex-wrap gap-x-6 gap-y-2">
      {links.map((link) => (
        <li key={link.href}>
          <a href={link.href} target="_blank" rel="noreferrer" data-track={link.track} className="hud-link">
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

function Tags({ items, label }: { items: string[]; label: string }) {
  return (
    <ul aria-label={label} className="flex flex-wrap gap-1.5">
      {items.map((item) => (
        <li key={item} className="tag-mono">
          {item}
        </li>
      ))}
    </ul>
  );
}

function Chip({ children }: { children: ReactNode }) {
  return <span className="chip">{children}</span>;
}

/** Mono label on the left four columns, content on the right eight. */
const ROW = "grid gap-x-8 gap-y-2 lg:grid-cols-12 lg:items-start";
const ROW_LABEL = "t-mono text-graphite lg:col-span-4 lg:pt-[0.3rem]";
const ROW_BODY = "min-w-0 lg:col-span-8";

export default async function Home() {
  const posts = await getAllBlogs();
  const shown = pickHomePosts(posts, pinnedPosts, HOME_POSTS);
  const toolCount = skills.reduce((sum, skill) => sum + skill.items.split(", ").length, 0);
  const marqueeItems = profile.offTheClock;

  return (
    <>
      <SiteHeader overlay />
      <LiquidField />
      <Hud />
      <main id="main" className="home" data-liquid-window>
        <Choreo />

        {/* Hero. The name and the facts on the left (the liquid is held back behind them), the
            simulator floating on the right; the current flows into it from the left edge, and the
            spine leaves from its base. */}
        <section id="top" aria-labelledby="hero-name" className="relative">
          <div className="wrap grid min-h-[calc(100svh-4rem-7rem)] content-center gap-y-12 pb-12 pt-8 sm:pb-16 sm:pt-12 lg:grid-cols-12 lg:gap-x-8 lg:pb-14 lg:pt-6">
            <div data-liquid-protect="0.7" className="@container min-w-0 lg:col-span-6 lg:self-center">
              <p className="t-hud fade-up text-graphite" style={delay(80)}>
                {profile.role} · {profile.location}
              </p>
              <h1 id="hero-name" className="t-display t-name mt-5 sm:mt-6">
                <span className="sr-only">{profile.name}</span>
                <span className="rise-line" aria-hidden="true">
                  <SplitLine text={profile.firstName} />
                </span>
                <span className="rise-line" aria-hidden="true">
                  <span className="t-serif pr-[0.06em]">
                    <SplitLine text={profile.lastName} start={profile.firstName.length} />
                  </span>
                </span>
              </h1>
              <p className="measure fade-up mt-7 text-[1.1875rem] leading-[1.5] text-ink sm:mt-8 sm:text-[1.375rem] sm:leading-[1.42]" style={delay(420)}>
                {profile.intro}
              </p>
              {/* What a recruiter checks first: when, then work authorization and where. */}
              <div className="fade-up mt-6 text-[0.9375rem] leading-[1.5]" style={delay(500)}>
                <p className="flex items-center gap-2 font-[550] text-ink">
                  <span className="size-1.5 shrink-0 rounded-full bg-go" aria-hidden="true" />
                  {profile.status}
                </p>
                <div className="mt-0.5 pl-3.5">
                  <DotList items={profile.facts} label="Work authorization and location" breakAfter={1} className="text-ink-2" />
                </div>
              </div>

              <div className="fade-up mt-8 flex flex-wrap gap-2 sm:gap-2.5" style={delay(580)}>
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

            <div id="play" className="fade-up min-w-0 scroll-mt-20 lg:col-span-6 lg:self-center" style={delay(260)}>
              <div data-spine-origin>
                <LiveSystem />
              </div>
            </div>
          </div>
        </section>

        {/* Off the clock: the personal line as two marquee rows running opposite ways, faster while
            you scroll. The list itself is for screen readers (and is what shows under reduced motion). */}
        <section aria-labelledby="off-the-clock" className="offclock">
          <div className="wrap">
            <h2 id="off-the-clock" className="t-hud text-graphite">
              Off the clock
            </h2>
          </div>
          <dl className="wrap offclock-list">
            {marqueeItems.map((row) => (
              <div key={row.label}>
                <dt className="t-mono text-graphite">{row.label}</dt>
                <dd className="text-[1.0625rem] font-[550] text-ink">{row.value}</dd>
              </div>
            ))}
          </dl>
          <div className="marquee" aria-hidden="true" data-marquee data-liquid-protect="0.82">
            {[0, 1].map((row) => (
              <div key={row} className={row === 0 ? "marquee-row marquee-sans" : "marquee-row marquee-serif"} data-row>
                {[0, 1].map((copy) => (
                  <span key={copy} className="marquee-copy">
                    {row === 0
                      ? marqueeItems.map((item) => (
                          <span key={item.label} className="marquee-item">
                            <span className="marquee-label">{item.label}</span>
                            {item.value}
                            <span className="marquee-star">✳</span>
                          </span>
                        ))
                      : (
                          <span className="marquee-item">
                            {profile.personal}
                            <span className="marquee-dash">—</span>
                          </span>
                        )}
                  </span>
                ))}
              </div>
            ))}
          </div>
        </section>

        <div className="frame" data-spine-frame>
          <Section id="work" index="01" title="Work" meta={`${featured.length} featured · ${otherProjects.length} more`}>
            {featured.map((project, index) => {
              const [head, tail] = NAME_SPLIT[project.slug];
              const flip = index % 2 === 1;
              return (
                <article key={project.slug} aria-labelledby={`${project.slug}-title`} className="project" data-flip={flip ? "" : undefined}>
                  <div className="project-bar">
                    <p className="flex items-center gap-3">
                      <Chip>{pad(index + 1)}</Chip>
                      <span className="t-hud text-ink-2">{project.role}</span>
                    </p>
                    <p className="t-hud hidden text-graphite sm:block">Fig.&nbsp;{index + 1}</p>
                  </div>
                  <div className="project-grid">
                    <div className="project-shot">
                      <div className="shot-window" data-scrub="window" data-liquid-edge>
                        <ProjectShot name={project.name} shot={project.shot} phone={project.phone} figure={index + 1} caption={project.caption} />
                      </div>
                    </div>
                    <div className="project-text" data-liquid-protect="0.92">
                      <h3 id={`${project.slug}-title`} className="t-project" data-reveal="rise">
                        {head}
                        <span className="t-serif">{tail}</span>
                      </h3>
                      <p className="mt-5 text-[1.125rem] leading-[1.55] text-ink" data-reveal="rise">
                        {project.summary}
                      </p>
                      <dl className="stat-grid" data-reveal="rise">
                        {project.facts.map((fact) => (
                          <div key={fact.label}>
                            <dt>{fact.label}</dt>
                            <dd>
                              <Count value={fact.value} />
                            </dd>
                          </div>
                        ))}
                      </dl>
                      <div className="hard-part" data-reveal="rise">
                        <h4 className="font-semibold text-ink">{project.hardPart.title}</h4>
                        <p className="mt-1.5 text-ink-2">{project.hardPart.body}</p>
                      </div>
                      <div className="mt-6" data-reveal="rise">
                        <Tags items={project.stack} label="Stack" />
                      </div>
                      <div className="mt-6" data-reveal="rise">
                        <ExternalLinks links={project.links} />
                      </div>
                    </div>
                  </div>
                </article>
              );
            })}

            {/* The lineup: the smaller projects on one hairline grid. */}
            <div className="lineup">
              <div className="project-bar">
                <h3 className="t-hud text-ink-2">More projects</h3>
                <p className="t-hud text-graphite">{otherProjects.length} more</p>
              </div>
              <ul className="lineup-grid">
                {otherProjects.map((project, i) => (
                  <li key={project.name} className="lineup-card" data-dir-hover data-reveal="rise" style={delay((i % 4) * 80)}>
                    <div data-liquid-protect="0.9" className="flex h-full flex-col">
                      <p className="flex items-center justify-between gap-3">
                        <Chip>{pad(featured.length + i + 1)}</Chip>
                        {project.note && <span className="t-hud text-graphite">{project.note}</span>}
                      </p>
                      <h4 className="lineup-name">{project.name}</h4>
                      <p className="mt-2 text-[0.9375rem] leading-relaxed text-ink-2">{project.summary}</p>
                      <div className="mt-auto pt-5">
                        <Tags items={project.stack.split(", ")} label="Stack" />
                        {project.href && (
                          <a href={project.href} target="_blank" rel="noreferrer" className="hud-link mt-5 inline-flex">
                            Code
                            <span className="link-arrow" aria-hidden="true">
                              ↗
                            </span>
                            <span className="sr-only"> for {project.name} (opens in a new tab)</span>
                          </a>
                        )}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </Section>

          <Section id="experience" index="02" title="Experience" meta={`${experience.length} roles · ${experience[experience.length - 1].start} – now`}>
            <div className="exp-grid">
              <div className="exp-pin" data-liquid-protect="0.9">
                <p className="poster-figure" aria-hidden="true">
                  <Count value={pad(experience.length)} />
                </p>
                <p className="t-hud mt-2 text-graphite">roles since {experience[experience.length - 1].start}</p>
                <div className="mt-8">
                  <SpanStrip jobs={experience} until={profile.availableFrom} compact />
                </div>
              </div>
              <ol className="exp-list">
                {experience.map((job, index) => {
                  const current = job.end === "Now";
                  return (
                    <li key={`${job.company}-${job.start}`} className="exp-role" data-role={index} data-reveal="rise">
                      <div data-liquid-protect="0.92">
                        <p className="t-hud flex flex-wrap items-center gap-x-3 gap-y-1 text-graphite">
                          {current && <span className="size-1.5 rounded-full bg-signal" aria-hidden="true" />}
                          <span className={current ? "text-ink" : undefined}>
                            {job.start} – {current ? "now" : job.end}
                          </span>
                          <span aria-hidden="true">·</span>
                          <span>{job.place}</span>
                        </p>
                        <h3 className="t-item mt-3 tracking-[-0.025em] sm:text-[1.75rem]">
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
            </div>
          </Section>

          <Section id="background" index="03" title="Background" meta={`${skills.length} toolkits · ${toolCount} tools`}>
            <div className={ROW} data-liquid-protect="0.92">
              <h3 className={ROW_LABEL}>Education</h3>
              <div className={ROW_BODY}>
                <p className="t-item sm:text-[1.75rem] sm:tracking-[-0.025em]">{education.school}</p>
                <p className="mt-0.5 text-[0.9375rem] text-graphite">
                  {education.degree}, graduating {education.graduation} · {education.honours}
                </p>
                <p className="measure mt-3 text-ink-2">Courses I&apos;d point to: {education.coursework.join(", ").toLowerCase()}.</p>
              </div>
            </div>
            <div className="tools" data-reveal="rise">
              <h3 className="sr-only">Tools</h3>
              <dl className="tools-grid">
                {skills.map((skill, i) => (
                  <div key={skill.group} className="tools-cell" data-liquid-protect="0.9">
                    <dt className="flex items-center gap-3">
                      <Chip>{pad(i + 1)}</Chip>
                      <span className="t-hud text-ink-2">{skill.group}</span>
                    </dt>
                    <dd className="mt-5">
                      <ul className="flex flex-wrap gap-1.5">
                        {skill.items.split(", ").map((item) => (
                          <li key={item} className="tag-mono">
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
                  <li key={post.slug} className="border-b border-rule" data-reveal="rise">
                    <Link href={`/blogs/${post.slug}`} className={`${ROW} dir-row group py-7`} data-dir-hover>
                      <span className={`${ROW_LABEL} relative transition-colors duration-200 group-hover:text-ink`} data-liquid-protect="0.9">
                        {formatDate(post.date)}
                      </span>
                      <span className={`${ROW_BODY} relative`} data-liquid-protect="0.9">
                        <span className="t-item block sm:text-[1.5rem]">
                          {post.title.trim()}
                          <span className="ml-2 inline-block text-graphite transition-[color,transform] duration-300 group-hover:translate-x-1 group-hover:text-signal-text" aria-hidden="true">
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
              <span className="lg:col-span-8 lg:col-start-5">
                <Link href="/blogs" className="hud-link">
                  All {posts.length} posts
                  <span className="link-arrow" aria-hidden="true">
                    →
                  </span>
                </Link>
              </span>
            </p>
          </Section>

          {/* Contact: where the packet is delivered. */}
          <Section id="contact" index="05" title="Contact" className="chapter-contact">
            <p className="t-poster" data-reveal="wipe" data-liquid-protect="0.94">
              <span>
                Hiring for <span className="t-serif">2027?</span>
              </span>
            </p>
            <div className="mt-12 grid gap-x-12 gap-y-12 sm:mt-16 lg:grid-cols-12 lg:items-end">
              <div className="min-w-0 lg:col-span-7" data-liquid-protect="0.94">
                <p className="measure text-[1.1875rem] leading-relaxed text-ink-2 sm:text-[1.375rem]" data-reveal="rise">
                  I&apos;m looking for a full-time software engineering role starting January 2027, in Calgary, remote, or somewhere I can move to.{" "}
                  {profile.workAuth}
                </p>
                <a
                  href={`mailto:${profile.email}`}
                  data-track="email"
                  className="email-link mt-10 block text-[clamp(1.25rem,4.2vw,3rem)] font-semibold leading-[1.1] tracking-[-0.035em] text-ink"
                >
                  {profile.email.split("@")[0]}
                  <wbr />@{profile.email.split("@")[1]}
                </a>
                <div className="relative mt-9 flex flex-wrap gap-2.5">
                  {/* The end of the wire: the packet is delivered beside the key that sends the email. */}
                  <span aria-hidden="true" className="station station-inset" data-station="end" data-route="/contact" />
                  <span aria-hidden="true" className="delivery-branch" />
                  <a href={`mailto:${profile.email}`} className="key key-signal terminal" data-track="email" data-terminal>
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

              <div className="contact-card lg:col-span-5" data-reveal="rise">
                <div className="portrait relative aspect-[4/5] w-full overflow-hidden rounded-[1rem] bg-paper-raised" data-reveal="blot" data-origin="center">
                  {/* Head and shoulders at 4:5. */}
                  <Image
                    src="/portrait-snow.jpg"
                    width={1200}
                    height={1500}
                    alt="Abdelrahman Mohamed smiling outdoors in the snow"
                    sizes="(min-width: 1024px) 220px, (min-width: 640px) 176px, 104px"
                    className="absolute inset-0 size-full object-cover object-top"
                  />
                </div>
                <dl className="spec" data-liquid-protect="0.9">
                  {profile.plate.map((row) => (
                    <div key={row.label}>
                      <dt>{row.label}</dt>
                      <dd>{row.value}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            </div>
          </Section>
        </div>
      </main>
      <SiteFooter framed />
    </>
  );
}
