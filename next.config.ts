import type { NextConfig } from "next";

/**
 * Webpack is used explicitly because this environment runs on Android/arm64,
 * where Turbopack native bindings are unavailable. On a supported machine the
 * `--webpack` flags in package.json can be removed to use Turbopack.
 */
const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  images: {
    // Landing photography is referenced by stable Unsplash CDN IDs. Swap the
    // URLs in `lib/media.ts` when owned assets are available.
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
        pathname: "/**",
      },
    ],
  },
};

export default nextConfig;
