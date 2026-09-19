import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The WebGL engine, Lenis and the GSAP timelines are imperative singletons that
  // mount once per page (exactly like the original Nuxt app). React Strict Mode's
  // development-only mount → unmount → mount cycle would dispose the WebGL context
  // on the same <canvas> and break the renderer, so it is turned off.
  reactStrictMode: false,
};

export default nextConfig;
