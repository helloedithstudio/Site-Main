// The live X-ray in "Under the hood": one monolith taken apart into its layers (the pose the Exploded film ends on),
// shown in five passes: the finished render, its wireframe, its surface normals, its light alone (a clay render), and
// the finished render again. A gold scan line sweeps down the object as the visitor scrolls; above the line is the next
// pass, below it the current one. Each pass is the same geometry with different materials, split by two clipping
// planes that follow the line.

import {
  AdditiveBlending,
  BoxGeometry,
  BufferGeometry,
  Color,
  EdgesGeometry,
  Float32BufferAttribute,
  Group,
  LineBasicMaterial,
  LineSegments,
  Mesh,
  MeshBasicMaterial,
  MeshNormalMaterial,
  MeshStandardMaterial,
  Plane,
  Vector3,
  type Material,
} from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { createMonolith, FRONT, M, WINDOW_Y, type Geometries, type Monolith } from "./monolith";

export const PASS_COUNT = 5;

/** Line segments of an even grid over a w x h rectangle (in the XY plane, centred). */
function gridPlane(w: number, h: number, nx: number, ny: number): BufferGeometry {
  const v: number[] = [];
  for (let i = 0; i <= nx; i++) {
    const x = -w / 2 + (w * i) / nx;
    v.push(x, -h / 2, 0, x, h / 2, 0);
  }
  for (let j = 0; j <= ny; j++) {
    const y = -h / 2 + (h * j) / ny;
    v.push(-w / 2, y, 0, w / 2, y, 0);
  }
  const g = new BufferGeometry();
  g.setAttribute("position", new Float32BufferAttribute(v, 3));
  return g;
}

/** The same grid on all six faces of a w x h x d box (centred). */
function gridBox(w: number, h: number, d: number, nx: number, ny: number, nz: number): BufferGeometry {
  const faces = [
    gridPlane(w, h, nx, ny).translate(0, 0, d / 2),
    gridPlane(w, h, nx, ny).translate(0, 0, -d / 2),
    gridPlane(d, h, nz, ny).rotateY(Math.PI / 2).translate(w / 2, 0, 0),
    gridPlane(d, h, nz, ny).rotateY(Math.PI / 2).translate(-w / 2, 0, 0),
    gridPlane(w, d, nx, nz).rotateX(Math.PI / 2).translate(0, h / 2, 0),
    gridPlane(w, d, nx, nz).rotateX(Math.PI / 2).translate(0, -h / 2, 0),
  ];
  const g = mergeGeometries(faces)!;
  faces.forEach((f) => f.dispose());
  return g;
}

/** Offsets of each layer at full explosion, metres toward the front (+Z). Replaced by exploded.json from Blender. */
export const EXPLODE = { body: 0, seam: 0.2, display: 0.42, glass: 0.64 };

type PartName = keyof Monolith["parts"];

export class XRay extends Group {
  readonly monolith: Monolith;
  #passes: Group[] = [];
  #below = new Plane(new Vector3(0, -1, 0), 0);
  #above = new Plane(new Vector3(0, 1, 0), 0);
  #scan: Mesh;
  #materials: Material[] = [];
  #wireGeo: BufferGeometry[] = [];

  constructor(geo: Geometries, opts: { marble: Parameters<typeof createMonolith>[1]["marble"]; color: Parameters<typeof createMonolith>[1]["color"]; gold: Material }) {
    super();
    this.monolith = createMonolith(geo, { ...opts, seed: 7.3, sealed: false });
    const final = (m: Monolith) => (Object.keys(m.parts) as PartName[]).map((k) => [k, m.parts[k].material as Material] as const);
    const wire = new LineBasicMaterial({ color: new Color(0.93, 0.9, 0.86), transparent: true, opacity: 0.6 });
    const normals = new MeshNormalMaterial();
    const clay = new MeshStandardMaterial({ color: new Color(0.74, 0.72, 0.69), roughness: 0.62, metalness: 0 });

    const looks: ((k: PartName) => Material)[] = [
      (k) => Object.fromEntries(final(this.monolith))[k],
      () => wire,
      () => normals,
      () => clay,
      (k) => Object.fromEntries(final(this.monolith))[k],
    ];
    // The wireframe pass draws an even grid of lines over the same shapes (no triangle diagonals), so it reads as real
    // topology. The seam keeps its own outline. (The Blender model brings its own topology when it arrives.)
    const wireGeo: Record<PartName, BufferGeometry> = {
      body: gridBox(M.w, M.h, M.d, 6, 13, 2).translate(0, M.h / 2, 0),
      glass: gridPlane(M.win.w, M.win.h, 8, 5).translate(0, WINDOW_Y, FRONT + 0.0016),
      display: gridPlane(M.win.w, M.win.h, 8, 5).translate(0, WINDOW_Y, FRONT + 0.0008),
      seam: new EdgesGeometry(geo.seam, 20),
      line: new BufferGeometry(),
    };
    this.#wireGeo = Object.values(wireGeo);

    looks.forEach((look, i) => {
      const g = new Group();
      for (const k of Object.keys(this.monolith.parts) as PartName[]) {
        const src = this.monolith.parts[k];
        // each pass owns its materials, so each can carry its own clipping plane
        const mat = look(k).clone();
        if (k === "body" && (i === 0 || i === 4)) {
          const orig = this.monolith.parts.body.material as Material & { onBeforeCompile: Material["onBeforeCompile"]; customProgramCacheKey: () => string };
          mat.onBeforeCompile = orig.onBeforeCompile;
          mat.customProgramCacheKey = () => `${orig.customProgramCacheKey()}-clip`;
        }
        mat.clippingPlanes = [this.#below];
        this.#materials.push(mat);
        const mesh = i === 1 ? new LineSegments(wireGeo[k], mat) : new Mesh(src.geometry, mat);
        mesh.position.z = EXPLODE[k === "line" ? "seam" : k];
        mesh.renderOrder = src.renderOrder;
        g.add(mesh);
      }
      g.visible = i === 0;
      this.#passes.push(g);
      this.add(g);
    });

    // The scan: a thin frame of light around the cut, and a barely-there sheet inside it.
    const sw = M.w + 0.36;
    const sd = M.d + EXPLODE.glass + 0.36;
    const t = 0.006;
    const ring = mergeGeometries([
      new BoxGeometry(sw, t, t).translate(0, 0, sd / 2),
      new BoxGeometry(sw, t, t).translate(0, 0, -sd / 2),
      new BoxGeometry(t, t, sd).translate(sw / 2, 0, 0),
      new BoxGeometry(t, t, sd).translate(-sw / 2, 0, 0),
    ])!;
    this.#scan = new Mesh(ring, new MeshBasicMaterial({ color: new Color("#ffbc09").multiplyScalar(1.6), toneMapped: false }));
    const sheet = new Mesh(
      new BoxGeometry(sw, 0.001, sd),
      new MeshBasicMaterial({ color: new Color("#ffbc09"), transparent: true, opacity: 0.05, blending: AdditiveBlending, depthWrite: false, toneMapped: false }),
    );
    this.#scan.add(sheet);
    this.#scan.position.z = EXPLODE.glass / 2;
    this.add(this.#scan);
    this.set(0);
  }

  /** Progress through the passes, 0 (finished render) to 1 (back to the finished render). */
  set(progress: number) {
    const s = Math.min(PASS_COUNT - 1 - 1e-4, Math.max(0, progress) * (PASS_COUNT - 1));
    const k = Math.floor(s);
    const t = s - k;
    // the line sweeps from just above the top to the floor
    const y = (M.h + 0.05) * (1 - t);
    this.#below.constant = y;
    this.#above.constant = -y;
    this.#passes.forEach((g, i) => {
      g.visible = i === k || i === k + 1;
      const plane = i === k ? this.#below : this.#above;
      g.traverse((o) => {
        if (o instanceof Mesh || o instanceof LineSegments) (o.material as Material).clippingPlanes = [plane];
      });
    });
    this.#scan.position.y = y;
    this.#scan.visible = t > 0.002 && t < 0.998;
  }

  /** Every pass visible for one frame, so their shaders compile before anyone scrolls here. */
  showAll(on: boolean) {
    this.#passes.forEach((g) => (g.visible = on));
  }

  dispose() {
    this.#materials.forEach((m) => m.dispose());
    this.#wireGeo.forEach((g) => g.dispose());
    this.#scan.traverse((o) => {
      if (o instanceof Mesh) {
        o.geometry.dispose();
        (o.material as Material).dispose();
      }
    });
  }
}
