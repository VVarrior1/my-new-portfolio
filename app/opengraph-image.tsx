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
const PAPER = "#f3f2ef";
const RAISED = "#e7e5e1";
const RULE = "#d7d5d1";
const INK = "#171614";
const GRAPHITE = "#5f5d5a";
const SIGNAL = "#ff4f00";
const SCREEN = "#141311";
const SCREEN_INK = "#ecebe8";
const SCREEN_LINE = "#3a3936";
const SCREEN_GRAPHITE = "#91908c";

export default async function OpenGraphImage() {
  const [display, body, mono] = await Promise.all([
    font("Archivo-SemiExpanded-600.woff"),
    font("Archivo-400.woff"),
    font("JetBrainsMono-500.woff"),
  ]);
  const nodes = ["balancer", "app 1", "cache", "database"];

  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", background: PAPER, color: INK, padding: 64, fontFamily: "Archivo" }}>
        <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", width: 520 }}>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ display: "flex", flexDirection: "column", fontFamily: "ArchivoWide", fontSize: 70, lineHeight: 0.95, letterSpacing: "-0.025em" }}>
              <span>{profile.firstName}</span>
              <span>{profile.lastName}</span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", marginTop: 26, fontFamily: "Mono", fontSize: 20, color: INK, lineHeight: 1.5 }}>
              <span>{profile.facts.slice(0, 2).join(" / ")}</span>
              <span>{profile.facts.slice(2).join(" / ")}</span>
            </div>
          </div>
          <div style={{ display: "flex", fontSize: 27, lineHeight: 1.35, color: INK }}>{profile.intro}</div>
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            marginLeft: 48,
            flex: 1,
            background: RAISED,
            border: `1px solid ${RULE}`,
            borderRadius: 20,
            padding: 10,
          }}
        >
          <div style={{ display: "flex", fontFamily: "Mono", fontSize: 18, color: GRAPHITE, padding: "4px 8px 12px" }}>sys 01 · a small system you can break</div>
          <div style={{ display: "flex", flexDirection: "column", flex: 1, background: SCREEN, borderRadius: 12, padding: "16px 20px", justifyContent: "center", gap: 12 }}>
            {nodes.map((node, i) => (
              <div key={node} style={{ display: "flex", alignItems: "center" }}>
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    width: 190,
                    padding: "7px 12px",
                    borderRadius: 8,
                    border: `1px solid ${SCREEN_LINE}`,
                    fontFamily: "Mono",
                    fontSize: 17,
                    color: SCREEN_INK,
                  }}
                >
                  <span>{node}</span>
                  <span style={{ fontSize: 14, color: SCREEN_GRAPHITE }}>{["round robin", "62% busy", "85% hits", "24% busy"][i]}</span>
                </div>
                <div style={{ display: "flex", flex: 1, height: 1, background: SCREEN_LINE, marginLeft: 14 }} />
                <div style={{ display: "flex", width: 8, height: 8, borderRadius: 8, background: SCREEN_INK, marginLeft: 14 }} />
              </div>
            ))}
          </div>
          <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", padding: "10px 6px 2px" }}>
            <div
              style={{
                display: "flex",
                width: 72,
                height: 72,
                borderRadius: 72,
                background: SIGNAL,
                border: "1px solid #c23b00",
                alignItems: "center",
                justifyContent: "center",
                textAlign: "center",
                fontSize: 15,
                fontFamily: "Archivo",
                color: INK,
                lineHeight: 1.1,
              }}
            >
              Kill a server
            </div>
          </div>
        </div>
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
