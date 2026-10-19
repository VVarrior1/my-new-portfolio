import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import { profile } from "@/lib/content";

export const alt = `${profile.name}, full-stack and AI engineer`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// Fonts are bundled as static WOFF instances (Satori reads neither woff2 nor variable fonts).
const font = (file: string) => readFile(join(process.cwd(), "assets/fonts", file));

// The workbench palette (app/globals.css, light theme).
const PAPER = "#f8f7f4";
const RULE = "#dbd9d5";
const INK = "#171614";
const INK_2 = "#353431";
const GRAPHITE = "#5c5a57";
const GO = "#18723f";

// The hero's portrait, at the card's 4:5 frame.
const PHOTO = { w: 414, h: 518 };

export default async function OpenGraphImage() {
  const [display, body, mono, photo] = await Promise.all([
    font("Archivo-SemiExpanded-600.woff"),
    font("Archivo-400.woff"),
    font("JetBrainsMono-500.woff"),
    readFile(join(process.cwd(), "public/portrait-snow.jpg")),
  ]);
  const photoSrc = `data:image/jpeg;base64,${photo.toString("base64")}`;

  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", background: PAPER, color: INK, padding: 56, fontFamily: "Archivo" }}>
        <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", flex: 1, paddingRight: 56 }}>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ display: "flex", fontFamily: "Mono", fontSize: 18, color: GRAPHITE }}>Full-stack and AI engineer</div>
            <div style={{ display: "flex", flexDirection: "column", marginTop: 18, fontFamily: "ArchivoWide", fontSize: 76, lineHeight: 0.98, letterSpacing: "-0.025em" }}>
              <span>{profile.firstName}</span>
              <span>{profile.lastName}</span>
            </div>
            <div style={{ display: "flex", marginTop: 28, fontSize: 27, lineHeight: 1.38, color: INK_2 }}>{profile.intro}</div>
          </div>
          {/* The fact strip on fixed lines, so no separator ends a line. */}
          <div style={{ display: "flex", flexDirection: "column", paddingTop: 20, borderTop: `1px solid ${RULE}`, fontFamily: "Mono", fontSize: 18, color: INK, lineHeight: 1.55 }}>
            <div style={{ display: "flex", alignItems: "center" }}>
              <div style={{ display: "flex", width: 8, height: 8, borderRadius: 8, background: GO, marginRight: 10 }} />
              {profile.cardFacts[0]}
            </div>
            <span>{profile.cardFacts[1]}</span>
            <span>{profile.cardFacts[2]}</span>
          </div>
        </div>

        {/* The portrait, as in the hero. */}
        <img src={photoSrc} width={PHOTO.w} height={PHOTO.h} alt="" style={{ borderRadius: 22, objectFit: "cover", objectPosition: "top" }} />
      </div>
    ),
    {
      ...size,
      fonts: [
        { name: "ArchivoWide", data: display, weight: 600, style: "normal" },
        { name: "Archivo", data: body, weight: 400, style: "normal" },
        { name: "Mono", data: mono, weight: 500, style: "normal" },
      ],
    },
  );
}
