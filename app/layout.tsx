import type { Metadata, Viewport } from "next";
import { Archivo, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { AudioProvider } from "@/contexts/audio-context";
import { SiteAnalytics } from "@/components/site-analytics";
import { Toaster } from "@/components/ui/sonner";
import { SITE_URL, profile } from "@/lib/content";
import { cn } from "@/lib/utils";

// Archivo is variable on weight and width; the width axis (wdth 62-125) carries the display voice.
const sans = Archivo({
  subsets: ["latin"],
  axes: ["wdth"],
  variable: "--font-archivo",
  display: "swap",
});

const mono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains",
  display: "swap",
  weight: ["400", "500"],
});

const description =
  "Full-stack and AI engineer in Calgary. Builds production payments and messaging, a system design simulator, and computer vision models. Graduating December 2026.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: `${profile.name}, full-stack and AI engineer`,
    template: `%s | ${profile.name}`,
  },
  description,
  alternates: { canonical: "/" },
  openGraph: {
    title: `${profile.name}, full-stack and AI engineer`,
    description,
    url: SITE_URL,
    siteName: profile.name,
    type: "website",
    locale: "en_CA",
  },
  twitter: {
    card: "summary_large_image",
    title: profile.name,
    description,
  },
  icons: {
    icon: [
      { url: "/icon", sizes: "32x32", type: "image/png" },
      { url: "/icon.svg", sizes: "any", type: "image/svg+xml" },
    ],
    apple: "/apple-icon",
  },
};

export const viewport: Viewport = {
  themeColor: [
    // Equal to --paper in each scheme (app/globals.css).
    { media: "(prefers-color-scheme: light)", color: "#f3f2ef" },
    { media: "(prefers-color-scheme: dark)", color: "#151412" },
  ],
};

// Runs first in <head>, before React hydrates:
// 1. Netlify injects a promotional HTML comment (plus a newline) after <meta charset> on the
//    production domain. React then can't match <head> and re-renders the whole page on the
//    client (error #418). Remove comments and whitespace-only text nodes that precede this script.
// 2. Applies a saved theme before first paint so there's no flash.
const headScript = `(function(){var n=document.head&&document.head.firstChild;while(n){var x=n.nextSibling;if(n.nodeType===8||(n.nodeType===3&&!/\\S/.test(n.nodeValue)))n.parentNode.removeChild(n);n=x}})();try{var t=localStorage.getItem("theme");if(t==="light"||t==="dark")document.documentElement.dataset.theme=t}catch(e){}`;

const personJsonLd = {
  "@context": "https://schema.org",
  "@type": "Person",
  name: profile.name,
  url: SITE_URL,
  email: `mailto:${profile.email}`,
  jobTitle: "Software engineer",
  address: { "@type": "PostalAddress", addressLocality: "Calgary", addressRegion: "AB", addressCountry: "CA" },
  alumniOf: { "@type": "CollegeOrUniversity", name: "University of Calgary" },
  sameAs: [profile.github, profile.linkedin],
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={cn(sans.variable, mono.variable)} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: headScript }} />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(personJsonLd) }}
        />
      </head>
      <body className="flex min-h-screen flex-col bg-paper text-ink antialiased">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-lg focus:bg-ink focus:px-4 focus:py-2 focus:text-paper"
        >
          Skip to content
        </a>
        <AudioProvider trackUrl="/background-music.m4a">
          {children}
          <SiteAnalytics />
          <Toaster position="bottom-center" />
        </AudioProvider>
      </body>
    </html>
  );
}
