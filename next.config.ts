import type { NextConfig } from "next";

/**
 * Webpack is used explicitly because this environment runs on Android/arm64,
 * where Turbopack native bindings are unavailable. On a supported machine the
 * `--webpack` flags in package.json can be removed to use Turbopack.
 */
const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
};

export default nextConfig;
