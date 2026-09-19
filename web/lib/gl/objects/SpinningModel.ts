// A GLB (SFI coin / governance emblem) that spins continuously, tilts toward the
// mouse, speeds up with scroll velocity, is clipped by a stencil mask and emits embers.

import {
  Group,
  MeshMatcapMaterial,
  SRGBColorSpace,
  type Mesh,
  type Object3D,
  type Texture,
} from "three";
import { events, EVENTS } from "@/lib/runtime/events";
import { glState as d } from "../state";
import { resources } from "../resources";
import { Tracker, type TrackerOptions } from "../tracker";
import { TrackedStencilMask } from "../stencil";
import { RENDER } from "../constants";
import { THEATRE, t, theatreObject } from "../theatre";
import { FitModel } from "./FitModel";
import { Embers } from "./Embers";

type Options = TrackerOptions & {
  key: string;
  scaleFactor?: number;
  mask?: { tracker: string; stencilRef: number };
  diffuseKey?: string;
  bumpKey?: string;
  normalKey?: string;
  hasEmbers?: boolean;
};

export class SpinningModel extends Tracker {
  #options: Options;
  #fit!: FitModel;
  #pivot = new Group();
  #material!: MeshMatcapMaterial;
  #mouse = { mouseFactor: { x: 0, y: 0 } };
  #theatreKey: string;
  #theatre!: { unsubscribe: () => void };
  #mask?: TrackedStencilMask;
  #embers?: Embers;
  #uniforms: { uBlueNoiseTxt: { value: Texture | null }; uNoiseFactor: { value: number } } = {
    uBlueNoiseTxt: { value: null },
    uNoiseFactor: { value: 0.8 },
  };

  constructor(options: Options) {
    const merged = { scaleFactor: 1, ...options };
    super(merged);
    this.#options = merged;
    this.#theatreKey = `Spinning-${merged.key}`;
    this.#build();
    events.on(EVENTS.THEATRE_SWAP_MATCAP, this.#swapMatcap);
    this.#bindTheatre();
  }

  #build() {
    const model: Object3D = resources.get(this.#options.key).scene;
    const matcap = resources.get("model-matcap");
    matcap.colorSpace = SRGBColorSpace;
    const fit = new FitModel({ model, scaleFactor: this.#options.scaleFactor, tracker: this });
    fit.rotation.order = "ZXY";
    fit.rotation.z = 0.3;
    fit.rotation.y = -0.1;
    this.#fit = fit;

    this.#uniforms.uBlueNoiseTxt.value = resources.get("blue-noise");
    const material = new MeshMatcapMaterial({ matcap, transparent: true });
    material.color.multiplyScalar(2);
    material.onBeforeCompile = (shader) => {
      shader.uniforms = { ...shader.uniforms, ...this.#uniforms };
      shader.fragmentShader = shader.fragmentShader.replace(
        "#include <common>",
        `
                  uniform float uNoiseFactor;
                  uniform sampler2D uBlueNoiseTxt;
                  #include <common>
                `,
      );
      shader.fragmentShader = shader.fragmentShader.replace(
        "#include <opaque_fragment>",
        `
                  float bn = texture(uBlueNoiseTxt, gl_FragCoord.xy * 0.005).r;
                  outgoingLight.rgb *= 1.0 - bn * uNoiseFactor;
                  outgoingLight.rgb = clamp(outgoingLight.rgb, 0.0, 3.0);
                  #include <opaque_fragment>
              `,
      );
    };
    this.#material = material;

    if (this.#options.diffuseKey) {
      const diffuse = resources.get(this.#options.diffuseKey);
      diffuse.anisotropy = d.gl.capabilities.getMaxAnisotropy();
      material.map = diffuse;
    }
    if (this.#options.bumpKey) material.bumpMap = resources.get(this.#options.bumpKey);
    if (this.#options.normalKey) {
      const normal = resources.get(this.#options.normalKey);
      normal.anisotropy = d.gl.capabilities.getMaxAnisotropy();
      material.normalMap = normal;
      material.normalScale.set(0.4, 0.4);
    }

    model.traverse((o) => {
      if ((o as Mesh).isMesh) {
        (o as Mesh).material = material;
        o.renderOrder = RENDER.renderOrder.default;
      }
    });
    this.#pivot.add(this.#fit);
    this.#pivot.rotation.order = "XYZ";
    this.add(this.#pivot);

    if (this.#options.mask) {
      this.#mask = new TrackedStencilMask({ tracker: this.#options.mask.tracker, stencilRef: this.#options.mask.stencilRef });
      this.#mask.applyStencilToMaterial(material);
      d.scene.add(this.#mask);
    }
    if (this.#options.hasEmbers) {
      this.#embers = new Embers({
        theatreKey: this.#theatreKey,
        renderOrder: RENDER.renderOrder.default,
        bounds: this.#fit.bounds.clone(),
      });
      this.#mask!.applyStencilToMaterial(this.#embers.material);
      this.#fit.add(this.#embers);
    }
  }

  #swapMatcap = (texture: Texture) => {
    texture.colorSpace = SRGBColorSpace;
    texture.needsUpdate = true;
    this.#material.matcap = texture;
  };

  #bindTheatre() {
    const hasNormal = this.#options.normalKey;
    const props: Record<string, ReturnType<typeof t.number>> = {
      mouse: t.compound({ x: t.number(0.3, { range: [0, 2] }), y: t.number(0.3, { range: [0, 2] }) }),
      noiseFactor: t.number(0.8, { range: [0, 2] }),
    };
    if (hasNormal) props.normalFactor = t.number(0.4, { range: [0, 2] });
    this.#theatre = theatreObject(
      THEATRE.projects.home,
      THEATRE.sheets.home.webgl,
      `${this.#theatreKey} / Model`,
      props,
      (v: any) => {
        if (hasNormal) this.#material.normalScale.set(v.normalFactor, v.normalFactor);
        this.#mouse.mouseFactor.x = v.mouse.x;
        this.#mouse.mouseFactor.y = v.mouse.y;
        this.#uniforms.uNoiseFactor.value = v.noiseFactor;
      },
    );
  }

  resize() {
    super.resize();
    this.#mask?.resize();
    this.#fit.fit();
  }

  update() {
    const velocity = d.runtime.scroll.lenis.velocity;
    super.update();
    this.position.y *= 0.5;
    this.#pivot.rotation.x = d.mouse.smooth.y * this.#mouse.mouseFactor.x;
    this.#pivot.rotation.y = d.mouse.smooth.x * this.#mouse.mouseFactor.y;
    this.#fit.rotation.y += 0.2 * d.time.delta + velocity * 0.002;
    this.#mask?.update();
    this.#embers?.update();
  }

  destroy() {
    super.destroy();
    this.#theatre.unsubscribe();
    events.off(EVENTS.THEATRE_SWAP_MATCAP, this.#swapMatcap);
    this.#mask?.destroy();
    this.#embers?.destroy();
  }
}
