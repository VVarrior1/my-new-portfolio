import Link from "next/link";
import { CopyEmail } from "@/components/copy-email";
import { Section } from "@/components/section";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { SystemTrace } from "@/components/system-trace";
import { getAllBlogs } from "@/lib/blogs";
import {
  RESUME_PATH,
  education,
  experience,
  flagship,
  profile,
  projects,
  signupTrace,
  skills,
  smallerProjects,
  type Link as ContentLink,
} from "@/lib/content";
import { formatDate } from "@/lib/date-utils";
import { plainText } from "@/lib/text";
import { getGalleryItems } from "@/lib/gallery";

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

function Stack({ items }: { items: string[] }) {
  return <p className="text-[0.95rem] text-graphite">{items.join(", ")}</p>;
}

export default async function Home() {
  const [posts, gallery] = await Promise.all([getAllBlogs(), getGalleryItems().catch(() => [])]);
  const photos = gallery.slice(0, 4);

  return (
    <>
      <SiteHeader />
      <main id="main">
        {/* Hero */}
        <section className="mx-auto max-w-[76rem] px-4 pb-16 pt-10 sm:px-8 sm:pb-24 sm:pt-16">
          <h1 className="display-name">
            {profile.firstName}
            <br />
            {profile.lastName}
          </h1>

          <div className="mt-10 grid gap-12 lg:mt-14 lg:grid-cols-12 lg:gap-16">
            <div className="lg:col-span-6">
              <p className="measure text-[1.4rem] font-medium leading-[1.4] tracking-[-0.012em] sm:text-[1.6rem]">
                {profile.intro}
              </p>
              <p className="measure mt-5 text-graphite">
                {profile.role} in {profile.location}. {profile.availability}
              </p>

              <div className="mt-8 flex flex-wrap gap-3">
                <a href={`mailto:${profile.email}`} className="btn btn-solid" data-track="email">
                  Email me
                </a>
                <a href={RESUME_PATH} className="btn btn-quiet" data-track="resume-download">
                  Résumé (PDF)
                </a>
                <a href={profile.github} className="btn btn-quiet" target="_blank" rel="noreferrer" data-track="github">
                  GitHub
                </a>
                <a href={profile.linkedin} className="btn btn-quiet" target="_blank" rel="noreferrer" data-track="linkedin">
                  LinkedIn
                </a>
              </div>
            </div>

            <div className="lg:col-span-6">
              <SystemTrace steps={signupTrace} />
            </div>
          </div>
        </section>

        {/* Work */}
        <Section id="work" title="Work" aside="Things I've built that people use, starting with the one I run.">
          <article aria-labelledby="flagship-title">
            <h3 id="flagship-title" className="text-[1.9rem] font-bold leading-tight tracking-[-0.03em] sm:text-[2.4rem]">
              {flagship.name}
            </h3>
            <p className="mt-2 text-graphite">
              {flagship.role}. {flagship.period}.
            </p>
            <p className="measure mt-5 text-[1.15rem] leading-relaxed">{flagship.summary}</p>

            <dl className="mt-10 grid grid-cols-2 gap-x-6 gap-y-8 border-y border-rule py-8 lg:grid-cols-4">
              {flagship.facts.map((fact) => (
                <div key={fact.label}>
                  <dt className="sr-only">{fact.label}</dt>
                  <dd>
                    <span className="block text-[2rem] font-bold leading-none tracking-[-0.04em] tabular-nums sm:text-[2.4rem]">
                      {fact.value}
                    </span>
                    <span className="mt-2 block text-[0.95rem] leading-snug text-graphite">{fact.label}</span>
                  </dd>
                </div>
              ))}
            </dl>

            <div className="mt-10 grid gap-10 xl:grid-cols-2 xl:gap-14">
              <div>
                <h4 className="text-lg font-bold">What it does</h4>
                <ul className="mt-4 space-y-3">
                  {flagship.built.map((item) => (
                    <li key={item} className="relative pl-5 leading-relaxed before:absolute before:left-0 before:top-[0.7em] before:h-[2px] before:w-2.5 before:bg-trace">
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <h4 className="text-lg font-bold">Problems worth telling you about</h4>
                <div className="mt-4 space-y-6">
                  {flagship.decisions.map((decision) => (
                    <div key={decision.title}>
                      <p className="font-semibold">{decision.title}</p>
                      <p className="mt-1 leading-relaxed text-graphite">{decision.body}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-8 space-y-4">
              <Stack items={flagship.stack} />
              <ExternalLinks links={flagship.links} />
            </div>
          </article>

          <div className="mt-20 space-y-14">
            {projects.map((project) => (
              <article key={project.name} className="grid gap-x-10 gap-y-4 border-t border-rule pt-10 md:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
                <div>
                  <h3 className="text-[1.6rem] font-bold leading-tight tracking-[-0.025em]">{project.name}</h3>
                  <p className="mt-2 text-[1.1rem] leading-snug">{project.summary}</p>
                  <div className="mt-4">
                    <ExternalLinks links={project.links} />
                  </div>
                </div>
                <div className="space-y-4">
                  <p className="leading-relaxed text-graphite">{project.detail}</p>
                  <Stack items={project.stack} />
                </div>
              </article>
            ))}
          </div>

          <div className="mt-20 border-t border-rule pt-10">
            <h3 className="text-lg font-bold">Smaller things on GitHub</h3>
            <ul className="mt-5 grid gap-x-10 gap-y-5 md:grid-cols-2">
              {smallerProjects.map((project) => (
                <li key={project.name}>
                  <a href={project.href} target="_blank" rel="noreferrer" className="link font-semibold">
                    {project.name}
                  </a>
                  <p className="mt-1 text-[0.95rem] leading-snug text-graphite">{project.summary}</p>
                </li>
              ))}
            </ul>
          </div>
        </Section>

        {/* Experience */}
        <Section id="experience" title="Experience">
          <ol className="space-y-0">
            {experience.map((job) => (
              <li
                key={`${job.company}-${job.start}`}
                className="grid gap-x-8 gap-y-1 border-b border-rule py-7 first:pt-0 md:grid-cols-[9.5rem_minmax(0,1fr)]"
              >
                <p className="text-[0.95rem] tabular-nums text-graphite">
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
            ))}
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

        {/* Writing and photos */}
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

          {photos.length > 0 && (
            <div className="mt-16">
              <h3 className="text-lg font-bold">From the gallery</h3>
              <Link href="/gallery" className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4" aria-label="Open the photo gallery">
                {photos.map((photo) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    key={photo.id}
                    src={photo.imageUrl}
                    alt={photo.title}
                    loading="lazy"
                    className="aspect-[4/5] w-full rounded-md object-cover transition-opacity hover:opacity-85"
                  />
                ))}
              </Link>
              <p className="mt-4">
                <Link href="/gallery" className="link font-medium">
                  See the gallery
                </Link>
              </p>
            </div>
          )}
        </Section>

        {/* Contact */}
        <section id="contact" aria-labelledby="contact-title" className="scroll-mt-20 border-t border-rule bg-paper-raised">
          <div className="mx-auto max-w-[76rem] px-4 py-20 sm:px-8 sm:py-28">
            <h2 id="contact-title" className="section-title">
              Hiring for 2027?
            </h2>
            <p className="measure mt-5 text-[1.2rem] leading-relaxed">
              I&apos;m looking for a full-time software engineering role starting January 2027, in Calgary, remote, or
              somewhere I can move to. {profile.workAuth}
            </p>
            <a
              href={`mailto:${profile.email}`}
              data-track="email"
              className="mt-10 block text-[clamp(1.3rem,4.8vw,3.6rem)] font-bold leading-[1.05] tracking-[-0.035em] underline decoration-trace decoration-[3px] underline-offset-[0.18em] transition-colors hover:text-signal sm:break-normal"
            >
              {profile.email.split("@")[0]}
              <wbr />@{profile.email.split("@")[1]}
            </a>
            <div className="mt-8 flex flex-wrap gap-3">
              <CopyEmail email={profile.email} />
              <a href={RESUME_PATH} className="btn btn-quiet" data-track="resume-download">
                Résumé (PDF)
              </a>
              <a href={profile.linkedin} className="btn btn-quiet" target="_blank" rel="noreferrer" data-track="linkedin">
                LinkedIn
              </a>
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
