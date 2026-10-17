import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import { profile } from "@/lib/content";

export const alt = `${profile.name}, full-stack and AI engineer`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// Fonts are bundled as static WOFF instances (Satori reads neither woff2 nor variable fonts).
const font = (file: string) => readFile(join(process.cwd(), "assets/fonts", file));

// The "Signal" palette (app/globals.css, light theme).
const PAPER = "#edede8";
const RAISED = "#fafaf7";
const RULE = "#dfdfd8";
const RULE_STRONG = "#c6c7bf";
const INK = "#0c0d0a";
const INK_2 = "#30312c";
const GRAPHITE = "#5c5d57";
const GO = "#19763f";
const SIGNAL = "#c8f135";
const SIGNAL_EDGE = "#0c0d0a";
const SCREEN = "#0d0e0c";
const SCREEN_INK = "#eef0e8";
const SCREEN_GRAPHITE = "#91938b";
const SCREEN_OUTLINE = "#4a4946";
const SCREEN_WIRE = "#55534f";
const SCREEN_TRACK = "#2e2d2b";

// The hero's diagram on a fixed screen: balancer → two app servers → cache → database.
const SCREEN_W = 600;
const SCREEN_H = 292;
const NODE = { w: 112, h: 60 };
const LEFT = 40;
const RIGHT = 16;
const GAP = (SCREEN_W - LEFT - RIGHT - 4 * NODE.w) / 3;
const col = (i: number) => LEFT + NODE.w / 2 + i * (NODE.w + GAP);
const MID = SCREEN_H / 2;
const APPS = [MID - 64, MID + 64];

type NodeSpec = { x: number; y: number; title: string; detail: string; util?: number; dashed?: boolean };
const NODES: NodeSpec[] = [
  { x: col(0), y: MID, title: "balancer", detail: "round robin" },
  { x: col(1), y: APPS[0], title: "app 1", detail: "41% busy", util: 0.41 },
  { x: col(1), y: APPS[1], title: "app 2", detail: "44% busy", util: 0.44 },
  { x: col(2), y: MID, title: "cache", detail: "off", dashed: true },
  { x: col(3), y: MID, title: "database", detail: "26% busy", util: 0.26 },
];

const HALF = NODE.w / 2;
const WIRES = [
  [16, MID, col(0) - HALF, MID],
  ...APPS.flatMap((y) => [
    [col(0) + HALF, MID, col(1) - HALF, y],
    [col(1) + HALF, y, col(2) - HALF, MID],
  ]),
  [col(2) + HALF, MID, col(3) - HALF, MID],
];
const DOTS = [
  [24, MID - 3],
  [col(0) + HALF + 18, MID - 18],
  [col(1) + HALF + 20, APPS[1] - 22],
  [col(2) + HALF + 18, MID],
];

export default async function OpenGraphImage() {
  const [display, body, mono] = await Promise.all([
    font("Archivo-SemiExpanded-600.woff"),
    font("Archivo-400.woff"),
    font("JetBrainsMono-500.woff"),
  ]);

  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", background: PAPER, color: INK, padding: 56, fontFamily: "Archivo" }}>
        <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", width: 420 }}>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ display: "flex", flexDirection: "column", fontFamily: "ArchivoWide", fontSize: 64, lineHeight: 0.98, letterSpacing: "-0.025em" }}>
              <span>{profile.firstName.toUpperCase()}</span>
              <span>{profile.lastName.toUpperCase()}</span>
            </div>
            {/* The fact strip on fixed lines, so no separator ends a line. */}
            <div style={{ display: "flex", flexDirection: "column", marginTop: 26, fontFamily: "Mono", fontSize: 18, color: INK, lineHeight: 1.55 }}>
              <div style={{ display: "flex", alignItems: "center" }}>
                <div style={{ display: "flex", width: 8, height: 8, borderRadius: 8, background: GO, marginRight: 10 }} />
                {profile.cardFacts[0]}
              </div>
              <span>{profile.cardFacts[1]}</span>
              <span>{profile.cardFacts[2]}</span>
            </div>
          </div>
          <div style={{ display: "flex", fontSize: 25, lineHeight: 1.38, color: INK_2 }}>{profile.intro}</div>
        </div>

        {/* The device: a raised panel, a dark screen, and the volt key. */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            marginLeft: 48,
            flex: 1,
            background: RAISED,
            border: `1px solid ${RULE}`,
            borderRadius: 22,
            padding: 10,
          }}
        >
          <div style={{ display: "flex", fontFamily: "Mono", fontSize: 16, color: INK_2, padding: "4px 10px 12px" }}>a small system you can break</div>
          <div style={{ display: "flex", position: "relative", width: SCREEN_W, height: SCREEN_H, background: SCREEN, borderRadius: 13 }}>
            {/* Satori lays an <svg> out as a flex child, so it sits in an absolutely placed box. */}
            <div style={{ display: "flex", position: "absolute", left: 0, top: 0, width: SCREEN_W, height: SCREEN_H }}>
              <svg width={SCREEN_W} height={SCREEN_H} viewBox={`0 0 ${SCREEN_W} ${SCREEN_H}`}>
                {WIRES.map(([x1, y1, x2, y2], i) => (
                  <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke={SCREEN_WIRE} strokeWidth={2} strokeDasharray={i === 0 ? "4 5" : undefined} />
                ))}
                {DOTS.map(([x, y], i) => (
                  <circle key={i} cx={x} cy={y} r={3.2} fill={SCREEN_INK} />
                ))}
              </svg>
            </div>
            <div style={{ display: "flex", position: "absolute", left: 16, top: MID - NODE.h / 2 - 28, fontFamily: "Mono", fontSize: 14, color: SCREEN_GRAPHITE }}>
              in · 160/s
            </div>
            {NODES.map((node) => (
              <div
                key={node.title}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  position: "absolute",
                  left: node.x - NODE.w / 2,
                  top: node.y - NODE.h / 2,
                  width: NODE.w,
                  height: NODE.h,
                  padding: "8px 11px",
                  borderRadius: 9,
                  border: `1.5px ${node.dashed ? "dashed" : "solid"} ${SCREEN_OUTLINE}`,
                  background: SCREEN,
                  fontFamily: "Mono",
                }}
              >
                <span style={{ fontSize: 16, color: node.dashed ? SCREEN_GRAPHITE : SCREEN_INK, lineHeight: 1.1 }}>{node.title}</span>
                <span style={{ fontSize: 13, color: SCREEN_GRAPHITE, marginTop: 3 }}>{node.detail}</span>
                {node.util !== undefined && (
                  <div style={{ display: "flex", marginTop: 6, height: 4, borderRadius: 2, background: SCREEN_TRACK }}>
                    <div style={{ display: "flex", width: `${node.util * 100}%`, height: 4, borderRadius: 2, background: SCREEN_INK }} />
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* The control deck: the traffic fader, and the kill key with room around it. */}
          <div style={{ display: "flex", flex: 1, alignItems: "center", padding: "0 14px" }}>
            <div style={{ display: "flex", flexDirection: "column", flex: 1, fontFamily: "Mono", fontSize: 15 }}>
              <div style={{ display: "flex", justifyContent: "space-between", color: GRAPHITE }}>
                <span>traffic</span>
                <span style={{ color: INK }}>160 requests/s</span>
              </div>
              <div style={{ display: "flex", position: "relative", marginTop: 16, height: 18, alignItems: "center" }}>
                <div style={{ display: "flex", width: "100%", height: 5, borderRadius: 3, background: RULE_STRONG }}>
                  <div style={{ display: "flex", width: "18%", height: 5, borderRadius: 3, background: INK }} />
                </div>
                <div
                  style={{ display: "flex", position: "absolute", left: "15%", width: 34, height: 18, borderRadius: 9, background: SIGNAL, border: `1px solid ${SIGNAL_EDGE}` }}
                />
              </div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginLeft: 36, paddingLeft: 30, borderLeft: `1px solid ${RULE}` }}>
              <div
                style={{
                  display: "flex",
                  width: 76,
                  height: 76,
                  borderRadius: 76,
                  background: SIGNAL,
                  border: `1px solid ${SIGNAL_EDGE}`,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke={INK} strokeWidth="2.25" strokeLinecap="round">
                  <path d="M12 3v8" />
                  <path d="M6.4 6.6a8 8 0 1 0 11.2 0" />
                </svg>
              </div>
              <span style={{ display: "flex", marginTop: 10, fontFamily: "Mono", fontSize: 15, color: INK }}>kill a server</span>
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
