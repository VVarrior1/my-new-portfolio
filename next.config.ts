import type { NextConfig } from "next";
import path from "path";

const galleryHost = process.env.NEXT_PUBLIC_GALLERY_HOST ?? "storage.googleapis.com";
const galleryPath = process.env.NEXT_PUBLIC_GALLERY_PATH ?? "";

const normalizedPath = galleryPath
  ? `/${galleryPath.replace(/^\/+/, "").replace(/\/+$/, "")}/**`
  : "/**";

const nextConfig: NextConfig = {
  outputFileTracingRoot: path.join(__dirname),
  experimental: {
    optimizePackageImports: ['@/components', '@/lib'],
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: galleryHost,
        pathname: normalizedPath,
      },
    ],
    formats: ['image/webp', 'image/avif'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    minimumCacheTTL: 60,
  },
};

export default nextConfig;
