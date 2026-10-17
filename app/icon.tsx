import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

/** The site mark's monogram, AM in Schibsted 600, the same as the header. */
export default async function Icon() {
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
          borderRadius: 8,
          fontFamily: "Schibsted",
          fontWeight: 600,
          fontSize: 15,
          letterSpacing: "-0.01em",
        }}
      >
        AM
      </div>
    ),
    { ...size, fonts: [{ name: "Schibsted", data: font, weight: 600, style: "normal" }] },
  );
}
