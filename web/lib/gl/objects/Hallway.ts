// The archway "hallway" behind the vault table: ten instanced archway cards that
// endlessly fly toward the camera (faster with scroll velocity), colour-graded by
// screen position, with an additive gradient glow and a floor fade, all clipped to
// the #hubs section by a stencil.

import {
  AdditiveBlending,
  Color,
  DynamicDrawUsage,
  Group,
  InstancedBufferAttribute,
  InstancedMesh,
  MathUtils,
  Mesh,
  Object3D,
  PlaneGeometry,
  RepeatWrapping,
  ShaderMaterial,
  SRGBColorSpace,
  Vector3,
  Vector4,
  type Material,
} from "three";
import { gsap } from "@/lib/runtime/gsap";
import { glState as d } from "../state";
import { resources } from "../resources";
import { Tracker } from "../tracker";
import { TrackedStencilMask } from "../stencil";
import { RENDER } from "../constants";
import { THEATRE, t, theatreObject } from "../theatre";
import {
  floorFragment,
  floorVertex,
  gradientFragment,
  gradientVertex,
  hallwayFragment,
  hallwayVertex,
} from "../shaders";

const v3 = new Vector3();
const v4 = new Vector4();
const color = new Color();
const dummy = new Object3D();

type Arch = { initialPos: Vector3; position: Vector3; progress: number };

export class Hallway extends Group {
  #arches: Arch[] = [];
  #gradient!: Mesh<PlaneGeometry, ShaderMaterial>;
  #floor!: Mesh<PlaneGeometry, ShaderMaterial>;
  #tracker!: Tracker;
  #mask!: TrackedStencilMask;
  #mesh!: InstancedMesh<PlaneGeometry, ShaderMaterial>;
  #anchor = new Object3D();
  #amount: number;
  #config = { scaleFactor: 1.5, loopSpeedFactor: 1, bounds: [] as number[] };
  #theatre!: { unsubscribe: () => void };

  constructor({ amount = 10 } = {}) {
    super();
    this.#amount = amount;
    this.#build();
    this.#bindTheatre();
  }

  #build() {
    this.#tracker = new Tracker({ tracker: '[data-js="gl-hallway"]' });
    this.#layout();
    this.#createMeshes();
    this.#createMask();
  }

  #layout() {
    const depth = (this.#tracker.trackSize.w * this.#config.scaleFactor) / (d.camera.fov / 15);
    const shift = depth * 0.2;
    for (let i = 0; i < this.#amount; i++) {
      const initialPos = v3.clone().set(0, 0, 0);
      initialPos.z = -depth * (this.#amount - 1) + depth * i + shift;
      this.#arches[i] = { initialPos, position: initialPos.clone(), progress: 0 };
    }
    this.#config.bounds = [-depth * this.#amount, shift];
  }

  #createMeshes() {
    const archway = resources.get("archway");
    archway.colorSpace = SRGBColorSpace;
    const archwayBlur = resources.get("archway-blur");
    archwayBlur.colorSpace = SRGBColorSpace;
    const blueNoise = resources.get("blue-noise");
    blueNoise.wrapS = blueNoise.wrapT = RepeatWrapping;
    blueNoise.needsUpdate = true;

    const progress = new InstancedBufferAttribute(new Float32Array(this.#arches.map(() => 0.4)), 1);
    const geometry = new PlaneGeometry(1.2, 1.2, 1, 1);
    geometry.setAttribute("aProgress", progress);
    const material = new ShaderMaterial({
      vertexShader: hallwayVertex,
      fragmentShader: hallwayFragment,
      uniforms: {
        uWorldProps: { value: v4.clone() },
        uTxt: { value: archway },
        uTxtBlur: { value: archwayBlur },
        uBlueNoiseTxt: { value: blueNoise },
        uColorA: { value: color.clone().set(4980809) },
        uColorB: { value: color.clone().set(11354918) },
        uColorC: { value: color.clone().set(16562691) },
        uTime: d.helpers.uniforms.time,
        uMouse: d.helpers.uniforms.mouse.smoother,
      },
      transparent: true,
      depthTest: false,
    });
    const mesh = new InstancedMesh(geometry, material, this.#amount);
    mesh.instanceMatrix.setUsage(DynamicDrawUsage);
    this.#mesh = mesh;
    this.add(mesh);
    this.add(this.#anchor);

    const gradient = resources.get("archway-gradient");
    gradient.colorSpace = SRGBColorSpace;
    this.#gradient = new Mesh(
      new PlaneGeometry(),
      new ShaderMaterial({
        vertexShader: gradientVertex,
        fragmentShader: gradientFragment,
        uniforms: {
          uTxt: { value: gradient },
          uBlueNoiseTxt: { value: blueNoise },
          uColor: { value: color.clone() },
          uAlpha: { value: 1 },
        },
        transparent: true,
        depthTest: false,
        blending: AdditiveBlending,
      }),
    );
    this.add(this.#gradient);
    this.traverse((o) => {
      if ((o as Mesh).isMesh) o.renderOrder = RENDER.renderOrder.hallway;
    });
    this.#createFloor();
  }

  #createFloor() {
    const floor = new Mesh(
      new PlaneGeometry(),
      new ShaderMaterial({ vertexShader: floorVertex, fragmentShader: floorFragment, transparent: true, depthTest: false }),
    );
    floor.renderOrder = RENDER.renderOrder.hallway + 1;
    floor.rotation.x = -Math.PI * 0.5;
    floor.matrixAutoUpdate = false;
    this.#floor = floor;
    this.add(this.#floor);
  }

  #bindTheatre() {
    const { uniforms } = this.#mesh.material;
    const props = {
      colorA: t.rgba({ r: 255, g: 0, b: 0, a: 1 }),
      colorB: t.rgba({ r: 255, g: 0, b: 0, a: 1 }),
      colorC: t.rgba({ r: 255, g: 0, b: 0, a: 1 }),
      gradientColor: t.rgba({ r: 255, g: 0, b: 0, a: 1 }),
      gradientOpacity: t.number(0.6, { range: [0, 1] }),
      scaleFactor: t.number(this.#config.scaleFactor, { range: [1, 3] }),
      speed: t.number(this.#config.loopSpeedFactor, { range: [0, 4] }),
    };
    this.#theatre = theatreObject(THEATRE.projects.home, THEATRE.sheets.home.webgl, "Hallway", props, (v: any) => {
      uniforms.uColorA.value.set(v.colorA.toString());
      uniforms.uColorB.value.set(v.colorB.toString());
      uniforms.uColorC.value.set(v.colorC.toString());
      this.#gradient.material.uniforms.uColor.value.set(v.gradientColor.toString());
      this.#gradient.material.uniforms.uAlpha.value = v.gradientOpacity;
      this.#config.scaleFactor = v.scaleFactor;
      this.#config.loopSpeedFactor = v.speed;
    });
  }

  #createMask() {
    this.#mask = new TrackedStencilMask({ tracker: '[data-js="gl-hallway-mask"]', stencilRef: RENDER.stencils.hallway });
    d.scene.add(this.#mask);
    this.traverse((o) => {
      if ((o as Mesh).isMesh) this.#mask.applyStencilToMaterial((o as Mesh).material as Material);
    });
  }

  resize() {
    this.#tracker.resize();
    const scale = this.#config.scaleFactor;
    this.#anchor.position.x = this.#tracker.trackSize.w * this.#config.scaleFactor;
    this.#layout();
    this.#gradient.position.z = MathUtils.lerp(this.#config.bounds[0], this.#config.bounds[1], 0.75);
    this.#gradient.scale.set(this.#tracker.trackSize.w * scale * 0.8, this.#tracker.trackSize.w * scale * 0.8, 1);
    const length = this.#config.bounds[1] - this.#config.bounds[0];
    this.#floor.position.z = -length * 0.4;
    this.#floor.position.y = this.#tracker.trackSize.w * scale * 0.8 * 0.5;
    this.#floor.scale.set(this.#tracker.trackSize.w, length, 1);
    this.#floor.updateMatrix();
    this.#mask.resize();
  }

  update() {
    const velocity = d.runtime.scroll.lenis.velocity;
    this.#tracker.update();
    const lift = this.#tracker.trackSize.h * 0.2;
    const y = this.#tracker.trackPosition.y - lift;
    this.position.set(this.#tracker.trackPosition.x, y, 0);
    this.#anchor.getWorldPosition(v3);
    this.#mesh.material.uniforms.uWorldProps.value.set(this.position.x, this.position.y, v3.x, v3.y + lift);
    const [min, max] = this.#config.bounds;
    this.#arches.forEach((arch, i) => {
      arch.position.z += this.#config.loopSpeedFactor * d.time.delta * 600 + velocity * 3;
      arch.position.z = gsap.utils.wrap(min, max, arch.position.z);
      arch.progress = gsap.utils.normalize(min, max, arch.position.z);
      (this.#mesh.geometry.attributes.aProgress.array as Float32Array)[i] = arch.progress;
    });
    this.#arches.forEach((arch, i) => {
      dummy.position.copy(arch.position);
      dummy.scale.set(
        this.#tracker.trackSize.w * this.#config.scaleFactor,
        this.#tracker.trackSize.h * this.#config.scaleFactor,
        1,
      );
      dummy.updateMatrix();
      this.#mesh.setMatrixAt(i, dummy.matrix);
    });
    this.#arches.sort((a, b) => a.position.z - b.position.z);
    this.#mesh.geometry.attributes.aProgress.needsUpdate = true;
    this.#mesh.instanceMatrix.needsUpdate = true;
    this.#mask.update();
  }

  destroy() {
    this.#tracker.destroy();
    this.#mask.destroy();
    this.#theatre.unsubscribe();
  }
}
