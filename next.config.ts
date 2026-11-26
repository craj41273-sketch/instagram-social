import type { NextConfig } from "next";

/**
 * Webpack is used explicitly because this environment runs on Android/arm64,
 * where Turbopack native bindings are unavailable. On a supported machine the
 * `--webpack` flags in package.json can be removed to use Turbopack.
 */
const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  // Multi-image posts arrive through a single authenticated request. Ten
  // 10 MB images plus multipart overhead stay under this limit; per-file MIME,
  // magic-byte, and size checks are still enforced on the server.
  experimental: {
    serverActions: {
      bodySizeLimit: "120mb",
    },
  },
  images: {
    // Landing photography is referenced by stable Unsplash CDN IDs. Swap the
    // URLs in `lib/media.ts` when owned assets are available.
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "**.supabase.co",
        pathname: "/**",
      },
    ],
  },
};

export default nextConfig;
