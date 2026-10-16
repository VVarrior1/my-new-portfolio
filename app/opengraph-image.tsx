import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import { profile } from "@/lib/content";

export const alt = `${profile.name}, software engineer`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// Fonts are bundled (Satori reads woff but not woff2, and the image is rendered at build time).
const font = (file: string) => readFile(join(process.cwd(), "assets/fonts", file));

// The dark theme's tokens (app/globals.css), so the preview matches the site.
const PAPER = "#0a0b0e";
const INK = "#f1f2f4";
const INK_2 = "#c6c9d0";
const GRAPHITE = "#8a8f99";
const GO = "#3fcf8e";
const PLATE = "rgba(136, 160, 226, 0.55)";

export default async function OpenGraphImage() {
  const [medium, regular, mono] = await Promise.all([
    font("IBMPlexSans-Medium.woff"),
    font("IBMPlexSans-Regular.woff"),
    font("IBMPlexMono-Regular.woff"),
  ]);

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          position: "relative",
          background: PAPER,
          color: INK,
          fontFamily: "Plex",
        }}
      >
        {/* The heat plate: slatted light rising from the bottom edge. */}
        <div
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            bottom: 0,
            height: 300,
            display: "flex",
            backgroundImage: `linear-gradient(to bottom, ${PAPER} 0%, rgba(10, 11, 14, 0.6) 45%, rgba(10, 11, 14, 0) 100%), repeating-linear-gradient(38deg, rgba(0,0,0,0) 0px, rgba(0,0,0,0) 30px, ${PLATE} 64px, ${PLATE} 112px, rgba(0,0,0,0) 150px, rgba(0,0,0,0) 220px)`,
          }}
        />
        <div style={{ display: "flex", flexDirection: "column", padding: "72px 80px", width: "100%" }}>
          <div style={{ display: "flex", fontFamily: "PlexMono", fontSize: 22, color: GRAPHITE }}>sim://live · a small system you can break</div>
          <div style={{ display: "flex", marginTop: 40, fontSize: 88, fontWeight: 500, letterSpacing: "-0.03em", lineHeight: 1 }}>{profile.name}</div>
          <div style={{ display: "flex", marginTop: 28, fontSize: 34, lineHeight: 1.4, color: INK_2, maxWidth: 940 }}>{profile.tagline}</div>
          <div style={{ display: "flex", alignItems: "center", marginTop: "auto", fontFamily: "PlexMono", fontSize: 24, color: INK }}>
            <div style={{ width: 10, height: 10, borderRadius: 10, background: GO, marginRight: 16 }} />
            {profile.facts.join("  ·  ")}
          </div>
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [
        { name: "Plex", data: medium, weight: 500, style: "normal" },
        { name: "Plex", data: regular, weight: 400, style: "normal" },
        { name: "PlexMono", data: mono, weight: 400, style: "normal" },
      ],
    },
  );
}
