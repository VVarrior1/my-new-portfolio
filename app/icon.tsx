import { ImageResponse } from "next/og";
import { ICON_SVG } from "@/components/brand-mark-data";

// The PNG favicon, for browsers that don't take app/icon.svg: the "Am." mark on an ink tile.
export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    <img alt="" width={32} height={32} src={`data:image/svg+xml,${encodeURIComponent(ICON_SVG)}`} />,
    { ...size },
  );
}
