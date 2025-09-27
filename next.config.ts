import type { NextConfig } from "next";
import path from "path";

const galleryHost = process.env.NEXT_PUBLIC_GALLERY_HOST ?? "storage.googleapis.com";
const galleryPath = process.env.NEXT_PUBLIC_GALLERY_PATH ?? "";

const nextConfig: NextConfig = {
  outputFileTracingRoot: path.join(__dirname),
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: galleryHost,
        pathname: galleryPath ? `${galleryPath}/**` : "**",
      },
    ],
  },
};

export default nextConfig;
