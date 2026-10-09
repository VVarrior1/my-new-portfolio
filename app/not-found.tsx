import Link from "next/link";
import { SiteHeader } from "@/components/site-header";

export default function NotFound() {
  return (
    <>
      <SiteHeader />
      <main id="main" className="mx-auto max-w-[76rem] px-4 pb-24 pt-16 sm:px-8 sm:pt-24">
        <h1 className="text-[clamp(2.8rem,7vw,5.5rem)] font-extrabold leading-[0.95] tracking-[-0.05em]">Nothing here</h1>
        <p className="measure mt-6 text-[1.2rem] leading-relaxed text-graphite">
          This page doesn&apos;t exist, or it moved. The home page has everything.
        </p>
        <p className="mt-8">
          <Link href="/" className="btn btn-solid">
            Go to the home page
          </Link>
        </p>
      </main>
    </>
  );
}
