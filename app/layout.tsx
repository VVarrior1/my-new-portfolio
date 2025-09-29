import type { Metadata } from "next";
import "./globals.css";
import { Background } from "@/components/background";
import { AudioProvider } from "@/contexts/audio-context";
import { FloatingMusicPlayer } from "@/components/floating-music-player";

export const metadata: Metadata = {
  metadataBase: new URL("https://abdelrahmanmohamed1.netlify.app"),
  title: {
    default: "Abdelrahman Mohamed | AI Engineer & Full-Stack Developer",
    template: "%s | Abdelrahman Mohamed",
  },
  description:
    "AI engineer and full-stack developer building Vertex AI agents, scalable web apps, and ML-powered products.",
  openGraph: {
    title: "Abdelrahman Mohamed | AI Engineer & Full-Stack Developer",
    description:
      "Co-founder at GenLabs accelerating AI automation and full-stack product delivery.",
    url: "https://abdelrahmanmohamed1.netlify.app",
    type: "website",
    locale: "en_CA",
  },
  twitter: {
    card: "summary_large_image",
    title: "Abdelrahman Mohamed",
    description:
      "AI engineer & full-stack developer focused on Vertex AI, ML systems, and product velocity.",
  },
  icons: {
    icon: "/favicon.ico",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-950 font-sans text-white antialiased">
        <AudioProvider trackUrl="/background-music.m4a">
          <Background />
          <div className="relative z-10 min-h-screen">
            {children}
          </div>
          <FloatingMusicPlayer />
        </AudioProvider>
      </body>
    </html>
  );
}
