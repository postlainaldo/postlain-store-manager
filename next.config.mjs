/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false, // Prevent WebGL context loss from double-invoke in dev
  transpilePackages: ["three"],
};

export default nextConfig;
