import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import { profile } from "@/lib/content";

export const alt = `${profile.name}, full-stack and AI engineer`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// Fonts are bundled (Satori can't read woff2, and the image is rendered at build time).
const loadFont = (weight: 400 | 600) => readFile(join(process.cwd(), `assets/fonts/SchibstedGrotesk-${weight}.ttf`));

// The contact band's recipe (app/globals.css), so the card reads as the site in a feed, not as an empty grey box.
const BAND = "linear-gradient(160deg, #2239a1, #152569)";
const WHITE = "#ffffff";
const MUTED = "rgba(255, 255, 255, 0.72)";
const LINE = "rgba(255, 255, 255, 0.16)";
const GO = "#4cc38a";

export default async function OpenGraphImage() {
  const [semibold, regular] = await Promise.all([loadFont(600), loadFont(400)]);
  const nodes = [
    { name: "Balancer", util: 0 },
    { name: "App servers", util: 0.46 },
    { name: "Cache", util: 0 },
    { name: "Database", util: 0.3 },
  ];
  const name = profile.name.split(" ");
  const rest = profile.headline.split(" ");

  return new ImageResponse(
    (
      <div
        style={{
          position: "relative",
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          backgroundImage: BAND,
          color: WHITE,
          padding: "60px 88px 56px",
          fontFamily: "Schibsted",
        }}
      >
        {/* The drafted frame, in white: two verticals and a rule. */}
        <div style={{ position: "absolute", left: 60, top: 0, bottom: 0, width: 1, background: "rgba(255,255,255,0.14)" }} />
        <div style={{ position: "absolute", right: 60, top: 0, bottom: 0, width: 1, background: "rgba(255,255,255,0.14)" }} />
        <div style={{ position: "absolute", left: 0, right: 0, bottom: 150, height: 1, background: "rgba(255,255,255,0.14)" }} />

        <div style={{ display: "flex", alignItems: "center", gap: 14, fontSize: 24, color: MUTED }}>
          <div style={{ width: 10, height: 10, borderRadius: 10, background: GO }} />
          <span>Software engineer · Calgary · Full-time from Jan 2027</span>
        </div>

        <div style={{ display: "flex", flexWrap: "wrap", fontSize: 64, lineHeight: 1.06, letterSpacing: "-0.03em", maxWidth: 1000 }}>
          {[
            ...name.map((word) => ({ word, color: WHITE, weight: 600 })),
            ...rest.map((word) => ({ word, color: MUTED, weight: 400 })),
          ].map(({ word, color, weight }, i) => (
            <span key={i} style={{ color, fontWeight: weight, marginRight: 16 }}>
              {word}
            </span>
          ))}
        </div>

        <div style={{ display: "flex", alignItems: "center" }}>
          {nodes.map((node, i) => (
            <div key={node.name} style={{ display: "flex", alignItems: "center" }}>
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 10,
                  padding: "13px 18px 14px",
                  borderRadius: 10,
                  border: `1.5px solid ${LINE}`,
                  background: "rgba(255, 255, 255, 0.08)",
                  fontSize: 22,
                  fontWeight: 600,
                }}
              >
                {node.name}
                <div style={{ display: "flex", width: 132, height: 4, borderRadius: 4, background: "rgba(255,255,255,0.14)" }}>
                  <div style={{ width: 132 * node.util, height: 4, borderRadius: 4, background: WHITE }} />
                </div>
              </div>
              {i < nodes.length - 1 && (
                <div style={{ display: "flex", alignItems: "center", width: 60, justifyContent: "center", gap: 10 }}>
                  <div style={{ width: 8, height: 8, borderRadius: 8, background: WHITE }} />
                  <div style={{ width: 8, height: 8, borderRadius: 8, background: WHITE, opacity: 0.5 }} />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [
        { name: "Schibsted", data: semibold, weight: 600, style: "normal" },
        { name: "Schibsted", data: regular, weight: 400, style: "normal" },
      ],
    },
  );
}
