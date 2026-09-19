// Stencil masks: an invisible quad writes a stencil ref so that 3D objects only
// draw inside a DOM element's rectangle (the coin and emblem).

import {
  AlwaysStencilFunc,
  EqualStencilFunc,
  Mesh,
  MeshBasicMaterial,
  PlaneGeometry,
  ReplaceStencilOp,
  type Material,
} from "three";
import { Tracker } from "./tracker";

const plane = new PlaneGeometry();

export class StencilMask extends Mesh<PlaneGeometry, MeshBasicMaterial> {
  #options: { stencilRef?: number };

  constructor(options: { stencilRef?: number } = {}) {
    super(
      plane,
      new MeshBasicMaterial({
        color: 16777215 * Math.random(),
        colorWrite: false,
        depthTest: false,
        depthWrite: false,
        stencilWrite: true,
        stencilRef: options.stencilRef || 1,
        stencilFunc: AlwaysStencilFunc,
        stencilZPass: ReplaceStencilOp,
      }),
    );
    this.#options = options;
    this.renderOrder = -100;
    this.matrixAutoUpdate = false;
  }

  applyStencilToMaterial(material: Material) {
    material.stencilWrite = true;
    material.stencilRef = this.#options.stencilRef!;
    material.stencilFunc = EqualStencilFunc;
    material.stencilZPass = ReplaceStencilOp;
  }
}

export class TrackedStencilMask extends StencilMask {
  #tracker: Tracker;

  constructor(options: { tracker: string; stencilRef: number }) {
    super(options);
    this.#tracker = new Tracker({ tracker: options.tracker });
  }

  update() {
    this.#tracker.update();
    this.position.copy(this.#tracker.position);
    this.updateMatrix();
  }

  resize() {
    this.#tracker.resize();
    this.scale.set(this.#tracker.trackSize.w, this.#tracker.trackSize.h, 1);
    this.updateMatrix();
  }

  destroy() {
    this.#tracker.destroy();
  }
}
