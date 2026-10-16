import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import { profile } from "@/lib/content";

export const alt = `${profile.name}, full-stack and AI engineer`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// Fonts are bundled (Satori can't read woff2, and the image is rendered at build time).
const loadFont = (weight: 400 | 600) => readFile(join(process.cwd(), `assets/fonts/SchibstedGrotesk-${weight}.ttf`));

// The site's tokens (app/globals.css, light theme).
const PAPER = "#fafbfe";
const RAISED = "#f1f3fa";
const INK = "#0c1020";
const GRAPHITE = "#555d74";
const RULE = "#e1e5f0";
const SIGNAL = "#2c3fd8";
const GO = "#11703f";

export default async function OpenGraphImage() {
  const [semibold, regular] = await Promise.all([loadFont(600), loadFont(400)]);
  const nodes = ["Balancer", "App servers", "Cache", "Database"];
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
          background: PAPER,
          color: INK,
          padding: "60px 88px 56px",
          fontFamily: "Schibsted",
        }}
      >
        {/* The drafted frame: two verticals and a rule with registration marks. */}
        <div style={{ position: "absolute", left: 60, top: 0, bottom: 0, width: 1, background: RULE }} />
        <div style={{ position: "absolute", right: 60, top: 0, bottom: 0, width: 1, background: RULE }} />
        <div style={{ position: "absolute", left: 0, right: 0, bottom: 150, height: 1, background: RULE }} />

        <div style={{ display: "flex", alignItems: "center", gap: 14, fontSize: 24, color: GRAPHITE }}>
          <div style={{ width: 10, height: 10, borderRadius: 10, background: GO }} />
          <span>Software engineer · Calgary · Full-time from Jan 2027</span>
        </div>

        <div style={{ display: "flex", flexWrap: "wrap", fontSize: 66, fontWeight: 600, lineHeight: 1.06, letterSpacing: "-0.03em", maxWidth: 1000 }}>
          {[...name.map((word) => ({ word, color: INK })), ...rest.map((word) => ({ word, color: GRAPHITE }))].map(({ word, color }, i) => (
            <span key={i} style={{ color, marginRight: 17 }}>
              {word}
            </span>
          ))}
        </div>

        <div style={{ display: "flex", alignItems: "center" }}>
          {nodes.map((node, i) => (
            <div key={node} style={{ display: "flex", alignItems: "center" }}>
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 8,
                  padding: "12px 18px 12px",
                  borderRadius: 10,
                  border: `1.5px solid ${RULE}`,
                  background: RAISED,
                  fontSize: 22,
                  fontWeight: 600,
                }}
              >
                {node}
                <div style={{ display: "flex", width: 120, height: 4, borderRadius: 4, background: RULE }}>
                  <div style={{ width: [0, 48, 0, 34][i], height: 4, borderRadius: 4, background: SIGNAL }} />
                </div>
              </div>
              {i < nodes.length - 1 && (
                <div style={{ display: "flex", alignItems: "center", width: 64, justifyContent: "center", gap: 10 }}>
                  <div style={{ width: 8, height: 8, borderRadius: 8, background: SIGNAL }} />
                  <div style={{ width: 8, height: 8, borderRadius: 8, background: SIGNAL, opacity: 0.5 }} />
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
