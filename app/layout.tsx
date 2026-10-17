import type { Metadata, Viewport } from "next";
import { Bricolage_Grotesque, Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AudioProvider } from "@/contexts/audio-context";
import { playlist } from "@/lib/playlist";
import { MotionProvider } from "@/components/motion-provider";
import { SiteAnalytics } from "@/components/site-analytics";
import { Spotlight } from "@/components/spotlight";
import { RouteTransitions } from "@/components/transition-link";
import { Toaster } from "@/components/ui/sonner";
import { SITE_URL, profile } from "@/lib/content";
import { cn } from "@/lib/utils";

// Bricolage Grotesque is variable on weight, width and optical size; narrowed and heavy it sets the
// name and every display line. Geist sets the text and Geist Mono the data.
const display = Bricolage_Grotesque({
  subsets: ["latin"],
  axes: ["wdth", "opsz"],
  variable: "--font-bricolage",
  display: "swap",
});

const sans = Geist({
  subsets: ["latin"],
  variable: "--font-geist",
  display: "swap",
});

const mono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-geist-mono",
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
    { media: "(prefers-color-scheme: light)", color: "#f2f3ef" },
    { media: "(prefers-color-scheme: dark)", color: "#0b0c0a" },
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
    <html lang="en" className={cn(display.variable, sans.variable, mono.variable)} suppressHydrationWarning>
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
        <MotionProvider>
          <AudioProvider tracks={playlist}>
            {children}
            <SiteAnalytics />
            <RouteTransitions />
            <Spotlight />
            <Toaster position="bottom-center" />
          </AudioProvider>
        </MotionProvider>
      </body>
    </html>
  );
}
