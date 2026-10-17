import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

/** The site mark's monogram, AM in Schibsted 600, the same as the header and favicon. */
export default async function AppleIcon() {
  const font = await readFile(join(process.cwd(), "assets/fonts/SchibstedGrotesk-600.ttf"));
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#0c1020",
          color: "#fafbfe",
          fontFamily: "Schibsted",
          fontWeight: 600,
          fontSize: 76,
          letterSpacing: "-0.02em",
        }}
      >
        AM
      </div>
    ),
    { ...size, fonts: [{ name: "Schibsted", data: font, weight: 600, style: "normal" }] },
  );
}
