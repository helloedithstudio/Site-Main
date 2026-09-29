// The light the Showcase monoliths live in: a pitch-black product studio. Its reflections come from a small environment
// scene rendered once into a pre-filtered map (two long strip softboxes behind left and right, a big soft top light, a
// and a faint back strip), and matching rectangle lights give the polished stone its highlights.
// Until the Blender environment (showcase-env.hdr) arrives this is the whole studio; afterwards it stays as the match
// for the rect lights.

import {
  BackSide,
  BoxGeometry,
  Color,
  DoubleSide,
  Group,
  Mesh,
  MeshBasicMaterial,
  PlaneGeometry,
  PMREMGenerator,
  RectAreaLight,
  Scene,
  type Texture,
  Vector3,
  type WebGLRenderer,
} from "three";
import { RectAreaLightUniformsLib } from "three/examples/jsm/lights/RectAreaLightUniformsLib.js";

type Softbox = { w: number; h: number; at: [number, number, number]; power: number; color: string };

// Positions are metres around a monolith standing at the origin (front toward +Z). No warm kicker: on polished black
// stone any small warm light reads as a smudge; the gold's warmth is its own colour.
const SOFTBOXES: Softbox[] = [
  // the strips start 1.4 m up, so they never pool light on the floor
  { w: 1.1, h: 4.4, at: [-6, 3.6, 1.4], power: 7.5, color: "#fff6ec" }, // left strip, slightly in front of the face
  { w: 1.1, h: 4.4, at: [6, 3.6, 1.4], power: 7.5, color: "#fff6ec" }, // right strip
  { w: 6, h: 2.2, at: [0, 7.5, 1.2], power: 3.2, color: "#ffffff" }, // top
  { w: 6, h: 0.5, at: [0, 3.2, -6], power: 1.2, color: "#fff1e6" }, // faint back strip, for rim light on the edges
];

function facing(mesh: Mesh, at: Vector3, target = new Vector3(0, 1.3, 0)) {
  mesh.position.copy(at);
  mesh.lookAt(target);
}

/** The pre-filtered reflection map of the studio. */
export function studioEnvironment(renderer: WebGLRenderer): Texture {
  const scene = new Scene();
  scene.add(new Mesh(new BoxGeometry(40, 20, 40), new MeshBasicMaterial({ color: 0x000000, side: BackSide })));
  for (const s of SOFTBOXES) {
    const m = new Mesh(new PlaneGeometry(s.w, s.h), new MeshBasicMaterial({ color: new Color(s.color).multiplyScalar(s.power), side: DoubleSide }));
    facing(m, new Vector3(...s.at));
    scene.add(m);
  }
  const pmrem = new PMREMGenerator(renderer);
  const texture = pmrem.fromScene(scene, 0.035).texture;
  pmrem.dispose();
  scene.traverse((o) => {
    if (o instanceof Mesh) {
      o.geometry.dispose();
      (o.material as MeshBasicMaterial).dispose();
    }
  });
  return texture;
}

let rectInit = false;

/** Rectangle lights matching the softboxes, placed around a monolith at `origin`. */
export function studioLights(origin = new Vector3()): Group {
  if (!rectInit) {
    RectAreaLightUniformsLib.init();
    rectInit = true;
  }
  const g = new Group();
  // the two strips and the top light
  for (const s of SOFTBOXES.slice(0, 3)) {
    const l = new RectAreaLight(new Color(s.color), s.power * (s.at[1] > 5 ? 0.45 : 0.8), s.w, s.h);
    l.position.set(origin.x + s.at[0], origin.y + s.at[1], origin.z + s.at[2]);
    l.lookAt(origin.x, 1.3, origin.z);
    g.add(l);
  }
  return g;
}
