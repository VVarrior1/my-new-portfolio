import Link from "next/link";
import { SiteHeader } from "@/components/site-header";

export default function NotFound() {
  return (
    <>
      <SiteHeader />
      <main id="main" className="wrap pb-24 pt-16 sm:pt-24">
        <p className="t-mono mb-5 text-graphite">404</p>
        <h1 className="t-display">Nothing here</h1>
        <p className="measure mt-6 text-[1.25rem] leading-relaxed text-ink-2">
          This page doesn&apos;t exist, or it moved. The home page has everything.
        </p>
        <p className="mt-8">
          <Link href="/" className="key key-signal">
            Go to the home page
          </Link>
        </p>
      </main>
    </>
  );
}
