import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import { flagship, profile } from "@/lib/content";

export const alt = `${profile.name}, full-stack and AI engineer`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// Fonts are bundled (Satori can't read woff2, and the image is rendered at build time).
const loadFont = (weight: 400 | 800) => readFile(join(process.cwd(), `assets/fonts/SchibstedGrotesk-${weight}.ttf`));

export default async function OpenGraphImage() {
  const [bold, regular] = await Promise.all([loadFont(800), loadFont(400)]);
  const steps = ["Next.js", "Stripe", "Sheets", "Twilio", "Resend", "TeamSnap"];

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
        <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
          <div style={{ display: "flex", alignItems: "center" }}>
            {steps.map((step, i) => (
              <div key={step} style={{ display: "flex", alignItems: "center" }}>
                <div style={{ width: 16, height: 16, borderRadius: 16, background: "#d48f00" }} />
                <span style={{ marginLeft: 10, fontSize: 24, color: "#565d66" }}>{step}</span>
                {i < steps.length - 1 && <div style={{ width: 34, height: 2, background: "#d2d5ce", margin: "0 14px" }} />}
              </div>
            ))}
          </div>
          <div style={{ fontSize: 34, fontWeight: 400, lineHeight: 1.3, maxWidth: 980 }}>
            {`${profile.role}. Sole engineer on the ${flagship.name.replace(" platform", "")} booking and payments platform. Graduating December 2026.`}
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
