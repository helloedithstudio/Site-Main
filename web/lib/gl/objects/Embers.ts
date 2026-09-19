// Rising ember particles around the Membership and Decisions sculptures. They speed up
// and brighten with scroll velocity.

import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  Color,
  MathUtils,
  Points,
  ShaderMaterial,
  Vector3,
} from "three";
import { glState as d } from "../state";
import { resources } from "../resources";
import { THEATRE, t, theatreObject } from "../theatre";
import { embersFragment, embersVertex } from "../shaders";

const v3 = new Vector3();
const color = new Color();

export class Embers extends Points<BufferGeometry, ShaderMaterial> {
  #options: { theatreKey: string; renderOrder: number; bounds?: Vector3 };
  #config = { timeFactor: 1, scrollFactor: 1, orderShift: -1 };
  #theatreKey: string;
  #theatre!: { unsubscribe: () => void };
  #amount = 130;

  constructor(options: { theatreKey: string; renderOrder: number; bounds?: Vector3 }) {
    super();
    this.#options = options;
    this.#theatreKey = options.theatreKey;
    this.#createMaterial();
    this.#bindTheatre();
  }

  #createMaterial() {
    this.geometry = new BufferGeometry();
    this.#createGeometry();
    const blueNoise = resources.get("blue-noise");
    this.material = new ShaderMaterial({
      vertexShader: embersVertex,
      fragmentShader: embersFragment,
      uniforms: {
        uColorA: { value: color.clone().set(16759817) },
        uColorB: { value: color.clone().set(13260525) },
        uColorC: { value: color.clone().set(16400134) },
        uSize: { value: 8 },
        uScrollTime: { value: 0 },
        uSpeed: { value: 0 },
        uTime: { value: 0 },
        uResolution: d.helpers.uniforms.resolution,
        uSpreadFactor: { value: 1 },
        uBlueNoiseTxt: { value: blueNoise },
        uThreshold: { value: 0.65 },
      },
      transparent: true,
      depthTest: false,
      blending: AdditiveBlending,
    });
    this.renderOrder = this.#options.renderOrder + this.#config.orderShift;
  }

  #createGeometry() {
    const amount = this.#amount;
    const positions: number[] = [];
    const randoms: number[] = [];
    const directions: number[] = [];
    const unit = 1;
    const b = this.#options.bounds || v3.clone().set(unit, unit, 0);
    for (let i = 0; i < amount; i++) {
      const x = MathUtils.randFloat(-b.x, b.x) * (0.2 / b.x);
      const y = MathUtils.randFloat(-b.y, b.y) * (0.2 / b.y);
      const z = MathUtils.randFloat(-b.z, b.z) * (0.2 / b.z);
      positions.push(x, y, z);
      randoms.push(Math.random(), Math.random());
      v3.randomDirection();
      directions.push(v3.x, v3.y, v3.z);
    }
    this.geometry.setAttribute("position", new BufferAttribute(new Float32Array(positions), 3));
    this.geometry.setAttribute("aRandom", new BufferAttribute(new Float32Array(randoms), 2));
    this.geometry.setAttribute("aDirection", new BufferAttribute(new Float32Array(directions), 3));
    this.scale.set(10, 10, 10);
  }

  #bindTheatre() {
    const { uniforms } = this.material;
    const props = {
      colorA: t.rgba({ r: 255, g: 0, b: 0, a: 1 }),
      colorB: t.rgba({ r: 255, g: 0, b: 0, a: 1 }),
      colorC: t.rgba({ r: 255, g: 0, b: 0, a: 1 }),
      timeFactor: t.number(this.#config.timeFactor, { range: [0, 2] }),
      scrollFactor: t.number(this.#config.scrollFactor, { range: [0, 2] }),
      size: t.number(8, { range: [0, 50] }),
      renderOrder: t.number(this.#options.renderOrder, { range: [-1, 1], nudgeMultiplier: 2 }),
      spreadFactor: t.number(1, { range: [0, 3] }),
      amount: t.number(this.#amount, { range: [0, 500], nudgeMultiplier: 1 }),
      threshold: t.number(0.65, { range: [0, 1] }),
    };
    this.#theatre = theatreObject(
      THEATRE.projects.home,
      THEATRE.sheets.home.webgl,
      `${this.#theatreKey} / Embers`,
      props,
      (v: any) => {
        uniforms.uColorA.value.set(v.colorA.toString());
        uniforms.uColorB.value.set(v.colorB.toString());
        uniforms.uColorC.value.set(v.colorC.toString());
        uniforms.uSize.value = v.size;
        uniforms.uSpreadFactor.value = v.spreadFactor;
        uniforms.uThreshold.value = 1 - v.threshold;
        this.#config.timeFactor = v.timeFactor;
        this.#config.scrollFactor = v.scrollFactor;
        this.renderOrder = v.renderOrder;
        if (this.#amount !== v.amount) {
          this.#amount = v.amount;
          this.#createGeometry();
        }
      },
    );
  }

  update() {
    const velocity = d.runtime.scroll.lenis.velocity;
    this.material.uniforms.uSpeed.value = Math.abs(velocity * 0.1);
    this.material.uniforms.uTime.value += d.time.delta * this.#config.timeFactor;
    this.material.uniforms.uScrollTime.value += Math.abs(velocity * 3e-4) * this.#config.scrollFactor;
  }

  destroy() {
    this.#theatre.unsubscribe();
  }
}
