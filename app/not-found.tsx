import Link from "next/link";
import { PageIntro } from "@/components/page-intro";
import { SiteHeader } from "@/components/site-header";

export default function NotFound() {
  return (
    <>
      <SiteHeader />
      <main id="main" className="wrap pb-24 pt-12 sm:pt-20">
        <PageIntro path="404" title="Nothing here.">
          This page doesn&apos;t exist, or it moved. The home page has everything.
        </PageIntro>
        <p className="mt-10">
          <Link href="/" className="btn btn-key">
            Go to the home page
          </Link>
        </p>
      </main>
    </>
  );
}
