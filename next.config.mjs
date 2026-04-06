import withPWAInit from "@ducanh2912/next-pwa";
import { createRequire } from "module";
const require = createRequire(import.meta.url);
const { version } = require("./package.json");

const withPWA = withPWAInit({
  dest: "public",
  cacheOnFrontEndNav: false,
  aggressiveFrontEndNavCaching: false,
  reloadOnOnline: true,
  swMinify: true,
  disable: false,
  workboxOptions: {
    swSrc: "src/sw/index.ts",
    exclude: [/\.map$/, /\/_next\/server\//],
  },
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  env: {
    NEXT_PUBLIC_APP_VERSION: version,
    NEXT_PUBLIC_BUILD_DATE: new Date().toISOString(),
  },
  serverExternalPackages: ["better-sqlite3", "exceljs"],
  eslint: { ignoreDuringBuilds: true },
  typescript: { ignoreBuildErrors: true },

  // ── Performance optimizations ──────────────────────────────────────────────
  compress: true,
  poweredByHeader: false,

  // Image optimization
  images: {
    minimumCacheTTL: 60 * 60 * 24 * 7, // 7 days
    formats: ["image/avif", "image/webp"],
  },

  // Compiler optimizations
  compiler: {
    removeConsole: process.env.NODE_ENV === "production"
      ? { exclude: ["error", "warn"] }
      : false,
  },

  // HTTP caching headers
  async headers() {
    return [
      {
        source: "/_next/static/:path*",
        headers: [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }],
      },
      {
        source: "/icons/:path*",
        headers: [{ key: "Cache-Control", value: "public, max-age=86400" }],
      },
      {
        source: "/api/:path*",
        headers: [{ key: "Cache-Control", value: "no-store" }],
      },
    ];
  },
};

export default withPWA(nextConfig);
