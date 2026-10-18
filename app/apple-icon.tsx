import { ImageResponse } from "next/og";
import { APPLE_ICON_SVG } from "@/components/brand-mark-data";

// The home-screen icon: the "Am." mark, full bleed on ink (iOS rounds the corners itself).
export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    <img alt="" width={180} height={180} src={`data:image/svg+xml,${encodeURIComponent(APPLE_ICON_SVG)}`} />,
    { ...size },
  );
}
