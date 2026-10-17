import Image from "next/image";
import Link from "next/link";
import { GithubMark, LinkedinMark } from "@/components/brand-icons";
import { Choreography } from "@/components/choreography";
import { CopyEmail } from "@/components/copy-email";
import { Count } from "@/components/count";
import { DotList } from "@/components/dot-list";
import { LiveSystem } from "@/components/live-system";
import { ProjectShot } from "@/components/project-shot";
import { Section } from "@/components/section";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { SpanStrip } from "@/components/span-strip";
import { SplitHeading, SplitLine } from "@/components/split";
import { SpineTrunk, Station } from "@/components/spine";
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

/** "City of Calgary" → "city-of-calgary", for the spine's route labels. */
const slug = (text: string) => text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

/** Two-digit index labels: 01, 02… */
const pad = (n: number) => String(n).padStart(2, "0");

function ExternalLinks({ links }: { links: ContentLink[] }) {
  if (links.length === 0) return null;
  return (
    <ul className="flex flex-wrap gap-x-6 gap-y-2">
      {links.map((link) => (
        <li key={link.href}>
          <a href={link.href} target="_blank" rel="noreferrer" data-track={link.track} className="link text-[0.9375rem] font-[600]">
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

/** The intro with a volt marker under its last three words (where things break). */
function Intro() {
  const words = profile.intro.split(" ");
  const tail = words.slice(-3).join(" ");
  const head = words.slice(0, -3).join(" ");
  return (
    <>
      {head} <span className="marker intro-marker">{tail}</span>
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
        {/* The title card: the name as a poster, the intro beside its second line. The sheet below
            slides over it as you scroll (components/choreography.tsx). */}
        <section aria-labelledby="hero-name" className="-mt-16 bg-stage pt-16">
          <div className="wrap pb-12 pt-5 sm:pb-16 sm:pt-8 lg:pb-14" data-title-card>
            <h1 id="hero-name" className="t-poster hero-name intro-name">
              <span className="sr-only">{profile.name}</span>
              <SplitLine text={profile.firstName} />
              <SplitLine text={profile.lastName} start={profile.firstName.length} className="hero-last" />
            </h1>

            {/* The credits under the poster: the intro, then when and where, then the keys. */}
            <div className="mt-7 grid gap-y-5 sm:mt-9 lg:grid-cols-12 lg:items-start lg:gap-x-6">
              <p
                className="intro-fade measure text-[1.125rem] leading-[1.5] text-ink sm:text-[1.25rem] sm:leading-[1.45] lg:col-span-5"
                style={{ "--d": "620ms" } as React.CSSProperties}
              >
                <Intro />
              </p>
              {/* What a recruiter checks first: when, then work authorization and where. */}
              <div className="intro-fade text-[0.9375rem] leading-[1.5] lg:col-span-3 lg:pt-1" style={{ "--d": "740ms" } as React.CSSProperties}>
                <p className="flex items-center gap-2 font-[600] text-ink">
                  <span className="size-1.5 shrink-0 rounded-full bg-go" aria-hidden="true" />
                  {profile.status}
                </p>
                <div className="mt-0.5 pl-3.5">
                  <DotList items={profile.facts} label="Work authorization and location" breakAfter={1} className="text-ink-2" />
                </div>
              </div>
              <div className="intro-fade flex flex-wrap gap-2 sm:gap-2.5 lg:col-span-4 lg:justify-end" style={{ "--d": "860ms" } as React.CSSProperties}>
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
          </div>
        </section>

        {/* The sheet: everything from here on, with the spine running down its left lane. */}
        <div className="sheet spine-host intro-sheet" data-sheet>
          <SpineTrunk />

          <div className="wrap grid gap-y-8 pb-6 pt-8 sm:pt-10 lg:grid-cols-12 lg:gap-x-6">
            <div id="play" className="min-w-0 scroll-mt-20 lg:col-span-8">
              <LiveSystem />
            </div>
            {/* The personal line, as a small spec sheet. */}
            <aside className="min-w-0 lg:col-span-4 lg:pt-1" aria-labelledby="off-title">
              <h2 id="off-title" className="t-mono text-graphite">
                Off the clock
              </h2>
              <dl className="spec mt-2">
                {profile.offTheClock.map((row) => (
                  <div key={row.label}>
                    <dt>{row.label}</dt>
                    <dd>{row.value}</dd>
                  </div>
                ))}
              </dl>
            </aside>
          </div>

          <Section id="work" index="01" title="Work" meta={`${featured.length} featured · ${otherProjects.length} more`}>
            <div className="space-y-24 sm:space-y-36">
              {featured.map((project, index) => (
                <article key={project.slug} aria-labelledby={`${project.slug}-title`}>
                  <p className="t-mono text-graphite">
                    <span className="text-ink">Fig. {index + 1}</span>
                    <span className="px-2" aria-hidden="true">
                      ·
                    </span>
                    {project.role}
                  </p>
                  <h3 id={`${project.slug}-title`} className="t-title reveal-title mt-3 max-w-[14ch]">
                    <SplitHeading text={project.name} />
                  </h3>

                  <div className="mt-8 grid gap-y-10 sm:mt-12 lg:grid-cols-12 lg:gap-x-6">
                    <div className="relative min-w-0 lg:col-span-8">
                      <Station className="top-4" route={`/work/${project.slug}`} />
                      <div className="shot-stage">
                        <ProjectShot name={project.name} shot={project.shot} phone={project.phone} figure={index + 1} caption={project.caption} />
                      </div>
                    </div>

                    <div className="min-w-0 lg:col-span-4">
                      <p className="text-ink">{project.summary}</p>
                      <dl className="stat-row mt-7">
                        {project.facts.map((fact) => (
                          <div key={fact.label}>
                            <dt>{fact.label}</dt>
                            <dd className="t-number">
                              <Count value={fact.value} />
                            </dd>
                          </div>
                        ))}
                      </dl>
                      <div className="mt-8">
                        <h4 className="font-semibold text-ink">{project.hardPart.title}</h4>
                        <p className="mt-1.5 text-[0.9375rem] leading-relaxed text-ink-2">{project.hardPart.body}</p>
                      </div>
                      <DotList items={project.stack} label="Stack" className="t-mono mt-6 text-graphite" />
                      <div className="mt-5">
                        <ExternalLinks links={project.links} />
                      </div>
                    </div>
                  </div>
                </article>
              ))}
            </div>

            <div className="relative mt-24 sm:mt-36">
              <Station className="top-[0.6875rem]" route="/work/more" />
              <h3 className="t-mono text-graphite">More projects</h3>
              <ul className="mt-6 grid gap-x-6 border-t border-rule md:grid-cols-2">
                {otherProjects.map((project, i) => (
                  <li key={project.name} className="border-b border-rule py-7">
                    <p className="t-number text-[2.5rem] text-graphite sm:text-[3rem]" aria-hidden="true">
                      {pad(featured.length + i + 1)}
                    </p>
                    <h4 className="t-item mt-3">
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
                    <p className="measure mt-2 text-[0.9375rem] leading-relaxed text-ink-2">{project.summary}</p>
                    <DotList items={project.stack.split(", ")} label="Stack" className="t-mono mt-3 text-graphite" />
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
            <div data-experience>
              {/* On a laptop the strip stays pinned while the roles scroll under it, and lights the role you're reading. */}
              <div className="strip-dock relative bg-paper pb-2 lg:sticky lg:top-16 lg:z-10 lg:pb-6 lg:pt-4">
                <SpanStrip jobs={experience} until={profile.availableFrom} />
              </div>
              <ol className="mt-10 border-t border-rule sm:mt-12">
                {experience.map((job, i) => {
                  const current = job.end === "Now";
                  return (
                    <li key={`${job.company}-${job.start}`} data-role={i} className={`${ROW} relative border-b border-rule py-8`}>
                      <Station className="top-[2.6rem]" route={`/experience/${slug(job.company)}`} />
                      <div className={`${ROW_LABEL} flex flex-wrap gap-x-2 lg:block`}>
                        <p className="flex items-center gap-2">
                          {current && <span className="size-1.5 rounded-full bg-go" aria-hidden="true" />}
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
            </div>
          </Section>

          <Section id="background" index="03" title="Background" meta={`${skills.length} toolkits · ${toolCount} tools`}>
            <div className={`${ROW} relative`}>
              <h3 className={ROW_LABEL}>Education</h3>
              <div className={ROW_BODY}>
                <p className="t-item">{education.school}</p>
                <p className="mt-0.5 text-[0.9375rem] text-graphite">
                  {education.degree}, graduating {education.graduation} · {education.honours}
                </p>
                <p className="measure mt-3 text-ink-2">Courses I&apos;d point to: {education.coursework.join(", ").toLowerCase()}.</p>
              </div>
            </div>
            <div className="panel relative mt-10 py-4" data-tools>
              <Station className="top-[1.6rem]" route="/background/tools" />
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

          <Section
            id="writing"
            index="04"
            title="Writing"
            meta={posts.length > 0 ? `${posts.length} posts · since ${formatMonth(posts[posts.length - 1].date)}` : undefined}
          >
            {shown.length > 0 ? (
              <ul className="border-t border-rule">
                {shown.map((post) => (
                  <li key={post.slug} className="border-b border-rule">
                    <Link href={`/blogs/${post.slug}`} className={`${ROW} group py-7`}>
                      <span className={`${ROW_LABEL} transition-colors duration-200 group-hover:text-ink`}>{formatDate(post.date)}</span>
                      <span className={ROW_BODY}>
                        <span className="t-item block">
                          <span className="bg-[linear-gradient(var(--signal),var(--signal))] bg-[length:0%_0.3em] bg-[position:0_100%] bg-no-repeat transition-[background-size] duration-[420ms] ease-[var(--ease-out)] [box-decoration-break:clone] group-hover:bg-[length:100%_0.3em]">
                            {post.title.trim()}
                          </span>
                          <span
                            className="ml-2 inline-block text-graphite transition-[color,transform] duration-300 ease-[var(--ease-out)] group-hover:translate-x-1 group-hover:text-ink"
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
                <Link href="/blogs" className="link text-[0.9375rem] font-[600]">
                  All {posts.length} posts
                  <span className="link-arrow" aria-hidden="true">
                    →
                  </span>
                </Link>
              </span>
            </p>
          </Section>

          {/* Contact: the console, where the spine ends. It assembles from its parts as it scrolls in,
              and its volt key lights when the packet arrives. */}
          <section id="contact" aria-labelledby="contact-title" className="scroll-mt-16">
            <div className="wrap pb-16 pt-6 sm:pb-24">
              <div className="relative" data-contact>
                <Station role="end" route="/contact" className="top-[2.25rem] sm:top-[3.5rem]" />
                <div className="console grid gap-x-12 gap-y-8 p-5 sm:p-12 lg:grid-cols-[minmax(0,1fr)_17rem]" data-console>
                  <div className="flex min-w-0 flex-col justify-between gap-y-10">
                    <div>
                      <p className="t-mono mb-3 text-graphite" data-part>
                        <span className="text-ink">05</span>
                        <span className="px-2" aria-hidden="true">
                          ·
                        </span>
                        end of the line
                      </p>
                      <h2 id="contact-title" className="t-section reveal-title">
                        <SplitHeading text="Hiring for 2027?" />
                      </h2>
                      <p className="measure mt-6 text-[1.0625rem] leading-relaxed text-ink-2 sm:text-[1.25rem]" data-part>
                        I&apos;m looking for a full-time software engineering role starting January 2027, in Calgary, remote, or
                        somewhere I can move to. {profile.workAuth}
                      </p>
                    </div>
                    <div data-part>
                      <a
                        href={`mailto:${profile.email}`}
                        data-track="email"
                        className="block text-[clamp(1.0625rem,4.6vw,2.5rem)] font-semibold leading-[1.15] tracking-[-0.02em] text-ink underline decoration-[color-mix(in_srgb,var(--ink)_35%,transparent)] decoration-2 underline-offset-[0.22em] transition-[text-decoration-color] duration-200 hover:decoration-signal"
                      >
                        {profile.email.split("@")[0]}
                        <wbr />@{profile.email.split("@")[1]}
                      </a>
                      <div className="mt-7 flex flex-wrap gap-2.5">
                        <a href={`mailto:${profile.email}`} className="key key-signal" data-track="email" data-terminal>
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
                    <div className="relative aspect-[4/5] w-full overflow-hidden rounded-xl bg-paper lg:aspect-square" data-portrait>
                      {/* Head and shoulders at 4:5; the square desktop frame trims the shoulders. */}
                      <Image
                        src="/portrait-snow.jpg"
                        width={1200}
                        height={1500}
                        alt="Abdelrahman Mohamed smiling outdoors in the snow"
                        sizes="(min-width: 1024px) 272px, (min-width: 640px) 160px, 88px"
                        className="absolute inset-0 size-full object-cover object-top"
                      />
                    </div>
                    <dl className="spec lg:mt-6" data-part>
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
            </div>
          </section>
        </div>
      </main>
      <SiteFooter />
      <Choreography />
    </>
  );
}
