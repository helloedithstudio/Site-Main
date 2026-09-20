// The WebGL asset list. Plain data (no three.js imports) so the home page can also read it on the server
// to emit preload hints, see components/GlPreload.tsx.

export type Compress = { responsive?: boolean; maxResolution?: [number, number]; flipY?: boolean; isNormalMap?: boolean };

export type ResourceEntry = {
  key: string;
  type: "texture" | "gltf" | "envmap" | "gainmap" | "fbo";
  path: string;
  compress?: Compress;
  colorSpace?: "SRGBColorSpace";
  flipY?: boolean;
  preventInit?: boolean;
};

export const manifest: ResourceEntry[] = [
  { key: "blue-noise", type: "texture", path: "/gl/images/misc/blue-noise.png" },
  { key: "noise", type: "texture", path: "/gl/images/misc/noise.jpg" },
  { key: "noise-perlin", type: "texture", path: "/gl/images/misc/noise2.png" },
  { key: "noise-4", type: "texture", path: "/gl/images/misc/noise4.jpg" },
  {
    key: "model-matcap",
    type: "texture",
    path: "/gl/images/misc/model-matcap.jpg",
    compress: { responsive: true, maxResolution: [256, 256] },
  },
  { key: "tech-grid", type: "texture", path: "/gl/images/tech-grid.webp", colorSpace: "SRGBColorSpace" },
  // One hard-surface object per carousel card. No baked maps: the finish comes from the geometry and the matcap.
  { key: "loop-1-model", type: "gltf", path: "/gl/models/loop-1-pitch.glb" },
  { key: "loop-2-model", type: "gltf", path: "/gl/models/loop-2-crew.glb" },
  { key: "loop-3-model", type: "gltf", path: "/gl/models/loop-3-build.glb" },
  { key: "loop-4-model", type: "gltf", path: "/gl/models/loop-4-unstuck.glb" },
  { key: "loop-5-model", type: "gltf", path: "/gl/models/loop-5-ship.glb" },
  { key: "loop-6-model", type: "gltf", path: "/gl/models/loop-6-launch.glb" },
  { key: "hero-marble-colorA", type: "texture", path: "/gl/images/hero/colorA.jpg", colorSpace: "SRGBColorSpace" },
  {
    key: "hero-marble",
    type: "texture",
    path: "/gl/images/hero/marble.jpg",
    colorSpace: "SRGBColorSpace",
    compress: { responsive: true, maxResolution: [3072, 1024], flipY: true },
  },
  {
    key: "hero-marble-mask",
    type: "texture",
    path: "/gl/images/hero/marble-01.jpg",
    compress: { responsive: true, maxResolution: [1024, 256], flipY: true },
  },
  {
    key: "hero-marble-selection",
    type: "texture",
    path: "/gl/images/hero/marble-02.jpg",
    compress: { responsive: true, maxResolution: [1024, 256], flipY: true },
  },
  {
    key: "hero-marble-time",
    type: "texture",
    path: "/gl/images/hero/marble-03.jpg",
    compress: { responsive: true, maxResolution: [1024, 256], flipY: true },
  },
  // The two portrait pieces (Membership, Decisions), also map-free.
  { key: "membership-model", type: "gltf", path: "/gl/models/membership-pr.glb" },
  { key: "decisions-model", type: "gltf", path: "/gl/models/decisions-rfc.glb" },
];
