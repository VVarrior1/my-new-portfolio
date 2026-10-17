import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { DotList } from "@/components/dot-list";
import { Magnetic } from "@/components/magnetic";
import { ProjectShot } from "@/components/project-shot";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { SpringNumber } from "@/components/spring-number";
import { TransitionLink } from "@/components/transition-link";
import { featured } from "@/lib/content";

export function generateStaticParams() {
  return featured.map((project) => ({ slug: project.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const project = featured.find((item) => item.slug === slug);
  if (!project) return {};
  return { title: project.name, description: project.summary, alternates: { canonical: `/work/${project.slug}` } };
}

const at = (ms: number) => ({ ["--d" as string]: `${ms}ms` });

/**
 * A featured project's case page. The home card's title and screenshot morph into this page's
 * (they share view-transition names), and the rest settles in after them.
 */
export default async function CasePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const index = featured.findIndex((item) => item.slug === slug);
  if (index < 0) notFound();
  const project = featured[index];
  const next = featured[(index + 1) % featured.length];

  return (
    <>
      <SiteHeader />
      <main id="main" className="mx-auto w-full max-w-[76rem] px-4 pb-24 pt-6 sm:px-8 sm:pt-12">
        <p className="a-fade" style={at(100)}>
          <TransitionLink href="/#work" className="t-mono text-graphite transition-colors hover:text-ink">
            <span aria-hidden="true">← </span>All work
          </TransitionLink>
        </p>

        <header className="mt-8 grid gap-y-6 lg:grid-cols-12 lg:gap-x-8">
          <div className="lg:col-span-8">
            <p className="t-mono a-fade text-graphite" style={at(160)}>
              <span className="text-ink">{String(index + 1).padStart(2, "0")}</span>
              <span className="px-2" aria-hidden="true">
                ·
              </span>
              {project.role}
            </p>
            <h1 className="t-display mt-4 text-[clamp(3rem,7vw,6rem)]">
              <span className="inline-block" style={{ viewTransitionName: `title-${project.slug}` }}>
                {project.name}
              </span>
            </h1>
          </div>
          <p className="a-rise text-[1.125rem] leading-relaxed text-ink-2 sm:text-[1.25rem] lg:col-span-4 lg:self-end" style={at(240)}>
            {project.summary}
          </p>
        </header>

        <div className="mt-12 sm:mt-16">
          <ProjectShot name={project.name} slug={project.slug} shot={project.shot} phone={project.phone} figure={1} caption={project.caption} />
        </div>

        <dl className="stat-row a-rise mt-16" style={at(360)}>
          {project.facts.map((fact) => (
            <div key={fact.label}>
              <dt>{fact.label}</dt>
              <dd className="text-[clamp(2.75rem,6vw,4.5rem)]!">
                <SpringNumber value={fact.value} />
              </dd>
            </div>
          ))}
        </dl>

        <section aria-labelledby="hard-part" className="mt-20 grid gap-y-6 border-t border-ink pt-6 lg:grid-cols-12 lg:gap-x-8">
          <p className="t-mono text-graphite lg:col-span-3">The hard part</p>
          <div className="lg:col-span-9">
            <h2 id="hard-part" className="t-title s-rise text-[clamp(2rem,4vw,3rem)]">
              {project.hardPart.title}
            </h2>
            <p className="measure mt-5 text-[1.125rem] leading-relaxed text-ink-2">{project.hardPart.body}</p>
          </div>
        </section>

        <section aria-labelledby="built-with" className="mt-16 grid gap-y-5 border-t border-rule pt-6 lg:grid-cols-12 lg:gap-x-8">
          <h2 id="built-with" className="t-mono text-graphite lg:col-span-3">
            Built with
          </h2>
          <div className="lg:col-span-9">
            <ul className="flex flex-wrap gap-1.5">
              {project.stack.map((item) => (
                <li key={item} className="keycap">
                  {item}
                </li>
              ))}
            </ul>
            <div className="mt-8 flex flex-wrap gap-2.5">
              {project.links.map((link, i) => (
                <Magnetic key={link.href}>
                  <a href={link.href} target="_blank" rel="noreferrer" data-track={link.track} className={i === 0 ? "key key-ink" : "key"}>
                    {link.label}
                    <span aria-hidden="true">↗</span>
                    <span className="sr-only"> (opens in a new tab)</span>
                  </a>
                </Magnetic>
              ))}
            </div>
          </div>
        </section>

        {next.slug !== project.slug && (
          <nav aria-label="Next case" className="mt-24">
            <TransitionLink href={`/work/${next.slug}`} className="panel spot group block p-6 sm:p-10">
              <span className="t-mono text-graphite">Next case</span>
              <span className="t-display mt-3 block text-[clamp(2.25rem,6vw,4.5rem)]">
                {next.name}
                <span className="case-cta-arrow ml-4 inline-block text-graphite transition-colors group-hover:text-ink" aria-hidden="true">
                  →
                </span>
              </span>
              <DotList items={next.stack} label="Stack" className="t-mono mt-4 text-graphite" />
            </TransitionLink>
          </nav>
        )}
      </main>
      <SiteFooter />
    </>
  );
}
