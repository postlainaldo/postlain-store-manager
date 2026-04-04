import withPWAInit from "@ducanh2912/next-pwa";
import { createRequire } from "module";
const require = createRequire(import.meta.url);
const { version } = require("./package.json");

const withPWA = withPWAInit({
  dest: "public",
  cacheOnFrontEndNav: true,
  aggressiveFrontEndNavCaching: true,
  reloadOnOnline: true,
  swMinify: true,
  disable: false,
  workboxOptions: {
    swSrc: "src/sw/index.ts",
  },
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  env: {
    NEXT_PUBLIC_APP_VERSION: version,
    NEXT_PUBLIC_BUILD_DATE: new Date().toISOString(),
  },
  // Prevent better-sqlite3 from being bundled by webpack (it's a native module)
  serverExternalPackages: ["better-sqlite3"],
  eslint: { ignoreDuringBuilds: true },
  typescript: { ignoreBuildErrors: true },
};

export default withPWA(nextConfig);
