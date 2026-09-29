// The Monolith, in the live scene. Until the Blender model (showcase-monolith.glb) arrives this builds a stand-in with
// the true proportions from the asset brief: a 1.20 x 2.60 x 0.32 m slab of the home hero's own black marble, a 16:10
// display window 1.00 x 0.625 m set 0.30 m below the top, black glass over it, and a brushed gold seam framing the window
// and running down the face to the floor, with a thin line of light in its groove.
//
// The veins are light inside the stone: where the marble's own veins are, the stone emits the home hero's colour field
// (colorA), breathing slowly, and brighter where the visitor's cursor is (uScCursor, in the monolith's own space).
//
// Coordinates: metres, Y up, the base on the floor at the origin, the front face toward +Z (as glTF has it).

import {
  BoxGeometry,
  BufferAttribute,
  CanvasTexture,
  Color,
  Group,
  Mesh,
  MeshBasicMaterial,
  MeshPhysicalMaterial,
  MeshStandardMaterial,
  PlaneGeometry,
  RepeatWrapping,
  SRGBColorSpace,
  Vector3,
  type BufferGeometry,
  type Material,
  type Texture,
} from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";

export const M = {
  w: 1.2,
  h: 2.6,
  d: 0.32,
  win: { w: 1.0, h: 0.625, top: 0.3 },
  seam: 0.012,
};
export const WINDOW_Y = M.h - M.win.top - M.win.h / 2;
export const FRONT = M.d / 2;

export type Geometries = { body: BufferGeometry; glass: BufferGeometry; display: BufferGeometry; seam: BufferGeometry; line: BufferGeometry };

/** Planar UVs from the dominant axis of each normal, one texel density everywhere (the marble covers 4.8 x 3.2 m). */
function boxUVs(g: BufferGeometry) {
  const pos = g.getAttribute("position");
  const nor = g.getAttribute("normal");
  const uv = new Float32Array(pos.count * 2);
  const V = 3.2;
  const U = V * 1.5;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const z = pos.getZ(i);
    const ax = Math.abs(nor.getX(i));
    const ay = Math.abs(nor.getY(i));
    const az = Math.abs(nor.getZ(i));
    let u: number;
    let v: number;
    if (az >= ax && az >= ay) [u, v] = [x, y];
    else if (ax >= ay) [u, v] = [z + 2, y];
    else [u, v] = [x, z + 2];
    uv[i * 2] = u / U + 0.3;
    uv[i * 2 + 1] = v / V + 0.1;
  }
  g.setAttribute("uv", new BufferAttribute(uv, 2));
}

/** The seam: a frame around the window and a line down the face to the floor, as boxes of `t` thickness. */
function seamGeometry(t: number, depth: number, z: number): BufferGeometry {
  const { w, h } = M.win;
  const parts: BufferGeometry[] = [];
  const bar = (bw: number, bh: number, x: number, y: number) => parts.push(new BoxGeometry(bw, bh, depth).translate(x, y, z));
  const pad = 0.02;
  bar(w + pad * 2 + t, t, 0, WINDOW_Y + h / 2 + pad); // top
  bar(w + pad * 2 + t, t, 0, WINDOW_Y - h / 2 - pad); // bottom
  bar(t, h + pad * 2, -(w / 2 + pad), WINDOW_Y); // left
  bar(t, h + pad * 2, w / 2 + pad, WINDOW_Y); // right
  const bottom = WINDOW_Y - h / 2 - pad;
  bar(t, bottom, 0, bottom / 2); // down the face to the floor
  const g = mergeGeometries(parts.map((p) => p.toNonIndexed()));
  parts.forEach((p) => p.dispose());
  return g!;
}

export function monolithGeometries(): Geometries {
  const body = new RoundedBoxGeometry(M.w, M.h, M.d, 4, 0.008).translate(0, M.h / 2, 0);
  boxUVs(body);
  const glass = new PlaneGeometry(M.win.w, M.win.h).translate(0, WINDOW_Y, FRONT + 0.0016);
  const display = new PlaneGeometry(M.win.w, M.win.h).translate(0, WINDOW_Y, FRONT + 0.0008);
  const seam = seamGeometry(M.seam, 0.006, FRONT + 0.002);
  const line = seamGeometry(M.seam * 0.28, 0.004, FRONT + 0.0052);
  return { body, glass, display, seam, line };
}

// ------------------------------------------------------------------ materials

export type BodyUniforms = {
  uScColor: { value: Texture | null };
  uScVein: { value: number };
  uScTime: { value: number };
  uScSeed: { value: number };
  uScCursor: { value: Vector3 };
  uScCursorAmt: { value: number };
};

/** Polished black marble whose veins glow with the hero's colour field. One material per monolith (its own uniforms). */
export function bodyMaterial(marble: Texture | null, color: Texture | null, seed: number): { material: MeshPhysicalMaterial; uniforms: BodyUniforms } {
  const map = marble ? marble.clone() : null;
  if (map) {
    // each monolith shows a different stretch of the same stone
    map.wrapS = map.wrapT = RepeatWrapping;
    map.offset.set((seed * 0.37) % 1, (seed * 0.61) % 1);
  }
  const material = new MeshPhysicalMaterial({
    color: new Color(0.34, 0.34, 0.34),
    map,
    roughness: 0.14,
    metalness: 0,
    clearcoat: 0.35,
    clearcoatRoughness: 0.06,
    specularIntensity: 0.9,
    envMapIntensity: 1,
  });
  const uniforms: BodyUniforms = {
    uScColor: { value: color },
    uScVein: { value: 4.2 },
    uScTime: { value: 0 },
    uScSeed: { value: seed },
    uScCursor: { value: new Vector3(0, -10, 0) },
    uScCursorAmt: { value: 0 },
  };
  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms);
    shader.vertexShader = shader.vertexShader
      .replace("#include <common>", "#include <common>\nvarying vec3 vScObj;")
      .replace("#include <begin_vertex>", "#include <begin_vertex>\nvScObj = position;");
    shader.fragmentShader = shader.fragmentShader
      .replace(
        "#include <common>",
        `#include <common>
uniform sampler2D uScColor;
uniform float uScVein;
uniform float uScTime;
uniform float uScSeed;
uniform vec3 uScCursor;
uniform float uScCursorAmt;
varying vec3 vScObj;`,
      )
      .replace(
        "#include <emissivemap_fragment>",
        `#include <emissivemap_fragment>
#ifdef USE_MAP
{
  float lum = dot( texture2D( map, vMapUv ).rgb, vec3( 0.299, 0.587, 0.114 ) );
  float vein = smoothstep( 0.07, 0.34, lum );
  vec2 cuv = vec2( vScObj.x / ${M.w.toFixed(2)} + 0.5, clamp( vScObj.y / ${M.h.toFixed(2)}, 0.0, 1.0 ) );
  cuv = cuv * 0.8 + 0.1 + vec2( sin( uScTime * 0.05 + uScSeed ) * 0.08, cos( uScTime * 0.04 + uScSeed ) * 0.05 );
  vec3 ramp = texture2D( uScColor, cuv ).rgb;
  float breathe = 0.84 + 0.16 * sin( uScTime * 0.8 + uScSeed * 3.1 );
  float near = uScCursorAmt * smoothstep( 0.6, 0.0, distance( vScObj, uScCursor ) );
  totalEmissiveRadiance += ramp * vein * ( uScVein * breathe + near * 3.2 );
}
#endif`,
      );
  };
  material.customProgramCacheKey = () => "sc-monolith-body";
  return { material, uniforms };
}

export const goldMaterial = () =>
  new MeshStandardMaterial({ color: new Color("#f5c35b"), metalness: 1, roughness: 0.28, envMapIntensity: 1.2 });

/** The line of light in the seam's groove. `setSeam` sets its strength (0 off, 1 fully lit). */
export const lineMaterial = () => new MeshBasicMaterial({ color: new Color("#ffbc09"), toneMapped: false });

export function setSeam(m: MeshBasicMaterial, strength: number) {
  m.color.set("#ffbc09").multiplyScalar(0.06 + strength * 1.25);
}

export const glassMaterial = (sealed: boolean) =>
  new MeshPhysicalMaterial({
    color: new Color(sealed ? 0.02 : 0),
    roughness: sealed ? 0.38 : 0.03,
    metalness: 0,
    clearcoat: 1,
    clearcoatRoughness: sealed ? 0.3 : 0.02,
    transparent: true,
    opacity: sealed ? 0.94 : 0.3,
    depthWrite: false,
    envMapIntensity: sealed ? 0.6 : 1.3,
  });

let glowTex: Texture | null = null;
/** A dim, even glow for a lit window with nothing to play yet (never a fake screen). */
function windowGlow(): Texture {
  if (glowTex) return glowTex;
  const c = document.createElement("canvas");
  c.width = 256;
  c.height = 160;
  const ctx = c.getContext("2d")!;
  const g = ctx.createRadialGradient(128, 80, 10, 128, 80, 150);
  g.addColorStop(0, "rgba(236,231,224,0.16)");
  g.addColorStop(1, "rgba(236,231,224,0.03)");
  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, 256, 160);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 256, 160);
  glowTex = new CanvasTexture(c);
  glowTex.colorSpace = SRGBColorSpace;
  return glowTex;
}

export const displayMaterial = (lit: boolean) => new MeshBasicMaterial({ map: lit ? windowGlow() : null, color: lit ? 0xffffff : 0x000000, toneMapped: false });

// ------------------------------------------------------------------ one monolith

export type Monolith = {
  group: Group;
  body: Mesh;
  display: Mesh;
  uniforms: BodyUniforms;
  line: MeshBasicMaterial;
  parts: { body: Mesh; seam: Mesh; line: Mesh; glass: Mesh; display: Mesh };
  materials: Material[];
};

export function createMonolith(geo: Geometries, opts: { marble: Texture | null; color: Texture | null; seed: number; sealed: boolean; gold: Material }): Monolith {
  const { material: bodyMat, uniforms } = bodyMaterial(opts.marble, opts.color, opts.seed);
  const line = lineMaterial();
  setSeam(line, opts.sealed ? 0.1 : 0.45);
  const glass = glassMaterial(opts.sealed);
  const display = displayMaterial(!opts.sealed);
  const group = new Group();
  const parts = {
    body: new Mesh(geo.body, bodyMat),
    seam: new Mesh(geo.seam, opts.gold),
    line: new Mesh(geo.line, line),
    display: new Mesh(geo.display, display),
    glass: new Mesh(geo.glass, glass),
  };
  parts.glass.renderOrder = 2;
  Object.values(parts).forEach((m) => group.add(m));
  return { group, body: parts.body, display: parts.display, uniforms, line, parts, materials: [bodyMat, line, glass, display] };
}
