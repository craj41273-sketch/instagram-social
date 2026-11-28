import type { NextConfig } from "next";

/**
 * GitHub Pages is the permanent host for Luma. The project site is served from
 * /instagram-social/, so the base path and trailing slashes are build-time
 * settings. `pageExtensions` keeps the Node-only API routes and proxy out of
 * the static build without deleting their source.
 */
const nextConfig: NextConfig = {
  output: "export",
  basePath: "/instagram-social",
  trailingSlash: true,
  pageExtensions: ["tsx", "page.ts"],
  images: {
    // GitHub Pages has no image optimizer. Remote avatars are served directly.
    unoptimized: true,
    remotePatterns: [
      { protocol: "https", hostname: "images.unsplash.com", pathname: "/**" },
      { protocol: "https", hostname: "**.supabase.co", pathname: "/**" },
    ],
  },
};

export default nextConfig;
