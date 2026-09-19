import { Box3, Group, Vector3, type Object3D } from "three";
import type { Tracker } from "../tracker";

const v3 = new Vector3();

/** Wraps a model and scales it to fit (contain) a tracked DOM box. */
export class FitModel extends Group {
  #tracker?: Tracker;
  #model: Object3D;
  scaleFactor: number;
  bounds: Vector3;
  scaleMultiplier = 1;

  constructor({ model, scaleFactor = 1, tracker }: { model: Object3D; scaleFactor?: number; tracker?: Tracker }) {
    super();
    this.#tracker = tracker;
    this.#model = model;
    this.scaleFactor = scaleFactor;
    this.bounds = v3.clone();
    this.add(this.#model);
    new Box3().setFromObject(this.#model).getSize(this.bounds);
  }

  fit(w?: number, h?: number) {
    this.resize(w, h);
  }

  resize(w?: number, h?: number) {
    let width: number | undefined;
    let height: number | undefined;
    if (w && h) {
      width = w;
      height = h;
    } else if (this.#tracker) {
      width = this.#tracker.trackSize.w;
      height = this.#tracker.trackSize.h;
    }
    const sx = width! / this.bounds.x;
    const sy = height! / this.bounds.y;
    const s = Math.min(sx, sy) * this.scaleFactor;
    this.scaleMultiplier = s;
    this.scale.setScalar(this.scaleMultiplier);
  }
}
