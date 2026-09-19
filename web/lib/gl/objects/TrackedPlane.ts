import { Mesh, MeshBasicMaterial, PlaneGeometry, Vector2 } from "three";
import { Tracker, type TrackerOptions } from "../tracker";

const plane = new PlaneGeometry();

export type BoxUniforms = {
  uSize?: { value: Vector2 };
  uRadius?: { value: number };
  uBow?: { value: number };
};

/** A unit plane with a basic material that follows (and sizes to) a DOM element. */
export class TrackedPlane extends Tracker {
  material: MeshBasicMaterial;
  mesh: Mesh<PlaneGeometry, MeshBasicMaterial>;
  slide = 0;
  uSize?: BoxUniforms["uSize"];
  uRadius?: BoxUniforms["uRadius"];
  uBow?: BoxUniforms["uBow"];

  constructor(options: TrackerOptions) {
    super(options);
    this.material = new MeshBasicMaterial();
    this.mesh = new Mesh(plane, this.material);
    this.add(this.mesh);
  }
}
