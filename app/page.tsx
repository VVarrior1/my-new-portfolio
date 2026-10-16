import Image from "next/image";
import Link from "next/link";
import { CopyEmail } from "@/components/copy-email";
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
import { plainText } from "@/lib/text";

export const revalidate = 300;

function ExternalLinks({ links }: { links: ContentLink[] }) {
  if (links.length === 0) return null;
  return (
    <ul className="flex flex-wrap gap-x-5 gap-y-2">
      {links.map((link) => (
        <li key={link.href}>
          <a href={link.href} target="_blank" rel="noreferrer" data-track={link.track} className="link font-medium">
            {link.label}
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
      <main id="main">
        {/* Hero: Calgary at night behind the name. The header floats over it (see SiteHeader). */}
        <section className="relative isolate -mt-16 overflow-hidden bg-[#050b1c] pt-16 text-white">
          <Image
            src="/photos/calgary-night.jpg"
            alt=""
            fill
            priority
            // The hero is taller than 16:9, so object-cover draws the photo wider than the viewport.
            sizes="(max-width: 640px) 300vw, 160vw"
            className="-z-20 object-cover object-[50%_40%]"
          />
          <div aria-hidden="true" className="hero-photo-shade absolute inset-0 -z-10" />

          <div className="mx-auto max-w-[76rem] px-4 pb-16 pt-12 sm:px-8 sm:pb-24 sm:pt-20">
            <h1 className="display-name drop-shadow-[0_2px_24px_rgb(0_0_0/0.35)]">
              {profile.firstName}
              <br />
              {profile.lastName}
            </h1>

            <div className="mt-10 grid gap-12 lg:mt-16 lg:grid-cols-12 lg:gap-14">
              <div className="[text-shadow:0_1px_14px_rgb(0_0_0/0.55)] lg:col-span-5">
                <p className="measure text-[1.35rem] font-medium leading-[1.4] tracking-[-0.012em] sm:text-[1.5rem]">
                  {profile.intro}
                </p>
                <p className="measure mt-5 text-[1.08rem] leading-relaxed text-white/90">{profile.personal}</p>
                <p className="measure mt-4 text-white/70">
                  {profile.role} in {profile.location}. {profile.graduation}
                </p>

                <div className="mt-8 flex flex-wrap items-center gap-3">
                  <a href={`mailto:${profile.email}`} className="btn btn-band-solid !text-[#16191d]" data-track="email">
                    Email me
                  </a>
                  <a href={RESUME_PATH} className="btn btn-on-band" data-track="resume-download">
                    Résumé (PDF)
                  </a>
                  <span className="flex gap-4 sm:pl-2">
                    <a href={profile.github} className="font-medium underline decoration-white/50 underline-offset-[0.2em] hover:decoration-white" target="_blank" rel="noreferrer" data-track="github">
                      GitHub
                    </a>
                    <a href={profile.linkedin} className="font-medium underline decoration-white/50 underline-offset-[0.2em] hover:decoration-white" target="_blank" rel="noreferrer" data-track="linkedin">
                      LinkedIn
                    </a>
                  </span>
                </div>

                <p className="mt-8 inline-flex items-center gap-2.5 rounded-full border border-white/25 bg-white/10 py-1.5 pl-3 pr-4 text-[0.95rem] backdrop-blur-sm">
                  <span className="size-2 rounded-full bg-[#4cc38a] shadow-[0_0_0_4px_rgb(76_195_138/0.25)]" aria-hidden="true" />
                  {profile.availability}
                </p>
              </div>

              <div id="play" className="scroll-mt-24 lg:col-span-7">
                <LiveSystem glass />
              </div>
            </div>
          </div>
        </section>

        {/* Work */}
        <Section id="work" title="Work" wide>
          <div className="space-y-24">
            {featured.map((project, index) => (
              <article
                key={project.slug}
                aria-labelledby={`${project.slug}-title`}
                className="grid items-center gap-x-14 gap-y-8 lg:grid-cols-12"
              >
                <div className={`lg:col-span-7 ${index % 2 === 1 ? "lg:order-2" : ""}`}>
                  <div className="stage" data-stage={project.slug}>
                    <ProjectShot name={project.name} shot={project.shot} phone={project.phone} />
                  </div>
                </div>

                <div className={`lg:col-span-5 ${index % 2 === 1 ? "lg:order-1" : ""}`}>
                  <h3 id={`${project.slug}-title`} className="text-[1.8rem] font-bold leading-tight tracking-[-0.03em] sm:text-[2.1rem]">
                    {project.name}
                  </h3>
                  <p className="mt-1 text-graphite">{project.role}</p>
                  <p className="mt-4 text-[1.08rem] leading-relaxed">{project.summary}</p>

                  <dl className="mt-6 grid grid-cols-3 gap-4 border-y border-rule py-5">
                    {project.facts.map((fact) => (
                      <div key={fact.label}>
                        <dt className="sr-only">{fact.label}</dt>
                        <dd>
                          <span className="block text-[1.5rem] font-bold leading-none tracking-[-0.035em] tabular-nums">{fact.value}</span>
                          <span className="mt-1.5 block text-[0.88rem] leading-snug text-graphite">{fact.label}</span>
                        </dd>
                      </div>
                    ))}
                  </dl>

                  <div className="mt-6">
                    <p className="font-semibold">{project.hardPart.title}</p>
                    <p className="mt-1 leading-relaxed text-graphite">{project.hardPart.body}</p>
                  </div>

                  <p className="mt-5 text-[0.95rem] text-graphite">{project.stack.join(", ")}</p>
                  <div className="mt-4">
                    <ExternalLinks links={project.links} />
                  </div>
                </div>
              </article>
            ))}
          </div>

          <div className="mt-24 border-t border-rule pt-10">
            <h3 className="text-lg font-bold">More projects</h3>
            <ul className="mt-6 grid gap-x-12 gap-y-7 md:grid-cols-2">
              {otherProjects.map((project) => (
                <li key={project.name}>
                  {project.href ? (
                    <a href={project.href} target="_blank" rel="noreferrer" className="link font-semibold">
                      {project.name}
                    </a>
                  ) : (
                    <span className="font-semibold">{project.name}</span>
                  )}
                  <p className="mt-1 leading-relaxed text-graphite">{project.summary}</p>
                  <p className="mt-1 text-[0.88rem] text-graphite">{project.stack}</p>
                </li>
              ))}
            </ul>
          </div>
        </Section>

        {/* Experience */}
        <Section id="experience" title="Experience">
          <ol className="relative before:absolute before:bottom-2 before:left-[5px] before:top-2 before:w-px before:bg-rule">
            {experience.map((job) => {
              const current = job.end === "Now";
              return (
              <li
                key={`${job.company}-${job.start}`}
                className="group relative grid gap-x-8 gap-y-1 py-6 pl-8 first:pt-0 md:grid-cols-[9.5rem_minmax(0,1fr)]"
              >
                <span
                  aria-hidden="true"
                  className={`absolute left-0 top-[1.87rem] size-[11px] rounded-full border-2 group-first:top-[0.37rem] ${
                    current ? "border-go bg-go shadow-[0_0_0_4px_color-mix(in_srgb,var(--go)_20%,transparent)]" : "border-graphite bg-paper"
                  }`}
                />
                <p className={`text-[0.95rem] tabular-nums ${current ? "font-semibold text-go" : "text-graphite"}`}>
                  {job.start} – {job.end}
                </p>
                <div>
                  <h3 className="text-[1.2rem] font-bold leading-snug tracking-[-0.015em]">
                    {job.link ? (
                      <a href={job.link} target="_blank" rel="noreferrer" className="hover:underline">
                        {job.company}
                      </a>
                    ) : (
                      job.company
                    )}
                  </h3>
                  <p className="text-graphite">
                    {job.role}, {job.place}
                  </p>
                  <p className="measure mt-3 leading-relaxed">{job.summary}</p>
                </div>
              </li>
              );
            })}
          </ol>

          <div className="mt-14 grid gap-12 xl:grid-cols-2">
            <div>
              <h3 className="text-lg font-bold">Education</h3>
              <p className="mt-3 font-semibold">{education.school}</p>
              <p className="text-graphite">
                {education.degree}, graduating {education.graduation}
              </p>
              <p className="mt-3 text-graphite">{education.honours}</p>
              <p className="mt-3 leading-relaxed text-graphite">
                Courses I&apos;d point to: {education.coursework.join(", ").toLowerCase()}.
              </p>
            </div>
            <div>
              <h3 className="text-lg font-bold">Tools I use</h3>
              <dl className="mt-3 space-y-3">
                {skills.map((skill) => (
                  <div key={skill.group}>
                    <dt className="font-semibold">{skill.group}</dt>
                    <dd className="text-graphite">{skill.items}</dd>
                  </div>
                ))}
              </dl>
            </div>
          </div>
        </Section>

        {/* Writing */}
        <Section id="writing" title="Writing">
          {posts.length > 0 ? (
            <ul>
              {posts.slice(0, 4).map((post) => (
                <li key={post.slug} className="border-b border-rule first:border-t">
                  <Link href={`/blogs/${post.slug}`} className="group grid gap-x-8 gap-y-1 py-6 md:grid-cols-[9.5rem_minmax(0,1fr)]">
                    <span className="text-[0.95rem] tabular-nums text-graphite">{formatDate(post.date)}</span>
                    <span>
                      <span className="block text-[1.2rem] font-bold leading-snug tracking-[-0.015em] group-hover:underline group-hover:decoration-2 group-hover:underline-offset-4">
                        {post.title}
                      </span>
                      <span className="measure mt-1 line-clamp-2 leading-relaxed text-graphite">{plainText(post.excerpt)}</span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-graphite">No posts yet.</p>
          )}
          <p className="mt-6">
            <Link href="/blogs" className="link font-medium">
              All {posts.length} posts
            </Link>
          </p>
        </Section>

        {/* Contact */}
        {/* Contact: Calgary at sunset, the page's closing bookend to the night skyline at the top. */}
        <section id="contact" aria-labelledby="contact-title" className="relative isolate scroll-mt-20 overflow-hidden bg-[#0c1638] text-band-ink">
          <Image
            src="/photos/calgary-sunset.jpg"
            alt=""
            fill
            sizes="100vw"
            className="-z-20 object-cover object-[60%_45%]"
          />
          <div
            aria-hidden="true"
            className="absolute inset-0 -z-10 bg-[linear-gradient(90deg,rgb(9_17_48/0.94)_0%,rgb(9_17_48/0.82)_45%,rgb(9_17_48/0.35)_100%)] max-lg:bg-[linear-gradient(180deg,rgb(9_17_48/0.9)_0%,rgb(9_17_48/0.8)_100%)]"
          />
          <div className="mx-auto grid max-w-[76rem] gap-12 px-4 py-20 sm:px-8 sm:py-28 lg:grid-cols-[minmax(0,1fr)_13.75rem] lg:items-end">
            <div className="min-w-0">
              <h2 id="contact-title" className="section-title">
                Hiring for 2027?
              </h2>
              <p className="measure mt-5 text-[1.2rem] leading-relaxed text-band-muted">
                I&apos;m looking for a full-time software engineering role starting January 2027, in Calgary, remote, or
                somewhere I can move to. {profile.workAuth}
              </p>
              <a
                href={`mailto:${profile.email}`}
                data-track="email"
                className="mt-10 block text-[clamp(1.3rem,4.4vw,2.85rem)] font-bold leading-[1.05] tracking-[-0.035em] underline decoration-trace decoration-[3px] underline-offset-[0.18em] transition-opacity hover:opacity-85"
              >
                {profile.email.split("@")[0]}
                <wbr />@{profile.email.split("@")[1]}
              </a>
              <div className="mt-8 flex flex-wrap gap-3">
                <CopyEmail email={profile.email} className="btn btn-band-solid" />
                <a href={RESUME_PATH} className="btn btn-on-band" data-track="resume-download">
                  Résumé (PDF)
                </a>
                <a href={profile.linkedin} className="btn btn-on-band" target="_blank" rel="noreferrer" data-track="linkedin">
                  LinkedIn
                </a>
              </div>
            </div>
            <figure className="w-44 lg:w-full">
              <Image
                src="/abdelrahman.jpg"
                width={460}
                height={460}
                alt="Abdelrahman Mohamed in a suit, standing outdoors by a river on a sunny day"
                sizes="220px"
                className="aspect-square w-full rounded-xl object-cover ring-4 ring-white/15"
              />
            </figure>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
