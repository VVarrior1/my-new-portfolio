import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import { profile } from "@/lib/content";

export const alt = `${profile.name}, full-stack and AI engineer`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// Fonts are bundled (Satori can't read woff2, and the image is rendered at build time).
const loadFont = (weight: 400 | 800) => readFile(join(process.cwd(), `assets/fonts/SchibstedGrotesk-${weight}.ttf`));

export default async function OpenGraphImage() {
  const [bold, regular] = await Promise.all([loadFont(800), loadFont(400)]);
  const nodes = ["Balancer", "App servers", "Cache", "Database"];

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "#f2f3ef",
          color: "#16191d",
          padding: "64px 72px",
          fontFamily: "Schibsted",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", fontSize: 128, fontWeight: 800, lineHeight: 0.88, letterSpacing: "-0.055em" }}>
          <span>{profile.firstName}</span>
          <span>{profile.lastName}</span>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 30 }}>
          <div style={{ display: "flex", alignItems: "center" }}>
            {nodes.map((node, i) => (
              <div key={node} style={{ display: "flex", alignItems: "center" }}>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    padding: "10px 16px",
                    borderRadius: 10,
                    border: "2px solid #d2d5ce",
                    background: "#e8eae4",
                    fontSize: 24,
                  }}
                >
                  <div style={{ width: 12, height: 12, borderRadius: 12, background: i === 1 ? "#d48f00" : "#1f48d4" }} />
                  {node}
                </div>
                {i < nodes.length - 1 && <div style={{ width: 44, height: 2, background: "#b9bdb5" }} />}
              </div>
            ))}
          </div>
          <div style={{ fontSize: 34, fontWeight: 400, lineHeight: 1.3, maxWidth: 1000 }}>
            {`${profile.role} in Calgary. Production payments and messaging, a system design simulator, and computer vision. Graduating December 2026.`}
          </div>
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [
        { name: "Schibsted", data: bold, weight: 800, style: "normal" },
        { name: "Schibsted", data: regular, weight: 400, style: "normal" },
      ],
    },
  );
}
