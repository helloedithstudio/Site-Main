import type { NextConfig } from "next";

// Files in /public are not fingerprinted, so they get a short freshness window plus stale-while-revalidate:
// a returning visitor is served from cache at once and picks up a replaced file in the background.
const staticAssets = [{ key: "Cache-Control", value: "public, max-age=86400, stale-while-revalidate=604800" }];

const nextConfig: NextConfig = {
  // The WebGL engine, Lenis and the GSAP timelines are imperative singletons that
  // mount once per page (exactly like the original Nuxt app). React Strict Mode's
  // development-only mount → unmount → mount cycle would dispose the WebGL context
  // on the same <canvas> and break the renderer, so it is turned off.
  reactStrictMode: false,
  async headers() {
    return [
      { source: "/gl/:path*", headers: staticAssets },
      { source: "/images/:path*", headers: staticAssets },
      { source: "/fonts/:path*", headers: [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }] },
    ];
  },
};

export default nextConfig;
