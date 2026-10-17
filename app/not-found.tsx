import Link from "next/link";
import { SiteHeader } from "@/components/site-header";

export default function NotFound() {
  return (
    <>
      <SiteHeader />
      <main id="main" className="frame">
        <div className="mx-auto max-w-[76rem] px-4 pb-24 pt-10 sm:px-8 sm:pt-16">
          <p className="t-meta text-graphite">404 · not found</p>
          <h1 className="t-display mt-4 max-w-[59.75rem]">
            <span className="text-ink">Nothing here.</span>{" "}
            <span className="t-display-soft">This page doesn&apos;t exist, or it moved. The home page has everything.</span>
          </h1>
          <p className="mt-10">
            <Link href="/" className="btn btn-solid">
              Go to the home page
            </Link>
          </p>
        </div>
      </main>
    </>
  );
}
