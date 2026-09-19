// The animated marble. A light-ray pass (radial smear around the mouse) renders
// into a half-res target every other frame and is Gaussian-blurred; the marble
// shader reveals the veins over time using RGB masks, adds colour boosts, and —
// for the hero — morphs from full-screen into the vault carousel box on scroll.

import {
  BufferAttribute,
  BufferGeometry,
  MathUtils,
  Mesh,
  MirroredRepeatWrapping,
  PlaneGeometry,
  ShaderMaterial,
  Vector2,
  Vector3,
  WebGLRenderTarget,
} from "three";
import { GaussianBlurPass } from "postprocessing";
import { gsap, ScrollTrigger } from "@/lib/runtime/gsap";
import { glState as d } from "../state";
import { resources } from "../resources";
import { Tracker } from "../tracker";
import { THEATRE, t, theatreObject } from "../theatre";
import { fullscreenVertex, marbleFragment, planeVertex, raysFragment } from "../shaders";

const triangle = new BufferGeometry();
triangle.setAttribute("uv", new BufferAttribute(new Float32Array([0, 0, 2, 0, 0, 2]), 2));
triangle.setAttribute("position", new BufferAttribute(new Float32Array([-1, -1, 0, 3, -1, 0, -1, 3, 0]), 3));

/** Full-screen triangle used for the ray pass. */
class FullscreenTriangle extends Mesh<BufferGeometry, ShaderMaterial> {
  constructor(material: ShaderMaterial) {
    super(triangle, material);
  }
}

const v2 = new Vector2();
const v3 = new Vector3();

const DIM_EXPANDED = 0.15;
const EXPAND_BLEED = 2;

export type MarbleOptions = {
  tracker: string | HTMLElement;
  isHero: boolean;
  trackerEnd?: string;
  trackerFull?: string;
  live?: boolean;
  landing?: { trigger: string; position: string } | null;
};

export class Marble extends Mesh<PlaneGeometry, ShaderMaterial> {
  #options: MarbleOptions;
  #state = {
    needsRender: false,
    scrollProgress: 0,
    position: v3.clone(),
    scale: v3.clone(),
    timeFactorReveal: 1,
    timeFactorBoost: 1,
    counterScaleUv: 1,
    counterScaleUvFull: 1,
    expand: 0,
    speedUpIntroReveal: 2,
    gsap: [] as gsap.core.Animation[],
    buffers: { loop: undefined as unknown as WebGLRenderTarget, blur: undefined as unknown as WebGLRenderTarget },
    loopMesh: undefined as unknown as FullscreenTriangle,
    blurPass: undefined as unknown as GaussianBlurPass,
  };
  #tracker!: Tracker;
  #endTracker?: Tracker;
  #fullTracker?: Tracker;
  #scrollTrigger?: ScrollTrigger;
  #basic!: { unsubscribe: () => void };
  #rays!: { unsubscribe: () => void };

  constructor(options: MarbleOptions) {
    super();
    this.#options = options;
    this.#createRays();
    this.#createPlane();
    this.#bindTheatre();
    this.#introSpeed();
  }

  #createPlane() {
    this.#tracker = new Tracker({ tracker: this.#options.tracker });
    if (this.#options.trackerFull) {
      this.#fullTracker = new Tracker({ tracker: this.#options.trackerFull, live: this.#options.live });
    }
    if (this.#options.isHero) {
      this.#endTracker = new Tracker({ tracker: this.#options.trackerEnd!, live: this.#options.live });
      const landing = this.#options.landing;
      this.#scrollTrigger = ScrollTrigger.create({
        trigger: this.#tracker.el,
        start: "top top",
        endTrigger: landing ? document.querySelector(landing.trigger) : this.#endTracker.el,
        end: landing?.position ?? "bottom bottom-=20%",
        scrub: true,
        onUpdate: (st) => {
          this.#state.scrollProgress = st.progress;
        },
      });
    }

    const marble = resources.get("hero-marble");
    const gradient = resources.get("hero-marble-colorA");
    gradient.wrapS = gradient.wrapT = MirroredRepeatWrapping;
    gradient.needsUpdate = true;
    const mask = resources.get("hero-marble-mask");
    const selection = resources.get("hero-marble-selection");
    const time = resources.get("hero-marble-time");
    const noise = resources.get("noise");
    noise.wrapS = noise.wrapT = MirroredRepeatWrapping;
    noise.needsUpdate = true;
    const perlin = resources.get("noise-perlin");
    perlin.wrapS = perlin.wrapT = MirroredRepeatWrapping;
    perlin.needsUpdate = true;

    this.geometry = new PlaneGeometry();
    this.material = new ShaderMaterial({
      vertexShader: planeVertex,
      fragmentShader: marbleFragment,
      uniforms: {
        uScrollProgress: { value: 0 },
        uAlpha: { value: 1 },
        uExpand: { value: 0 },
        uDim: { value: 1 },
        vUvScale: { value: 1 },
        uTxt: { value: marble },
        uTxtMask: { value: mask },
        uTxtLoop: { value: this.#state.buffers.blur.texture },
        uMaskSelection: { value: selection },
        uMaskTime: { value: time },
        uNoiseTxt: { value: noise },
        uPerlinTxt: { value: perlin },
        uGradientTxt: { value: gradient },
        uBoostReveal: { value: 30 },
        uBoostFactor: { value: 80 },
        uPlane: { value: v2.clone() },
        uTime: { value: v3.clone() },
        uMouse: d.helpers.uniforms.mouse.smooth,
        uMouseProps: { value: v3.clone() },
        uResolution: d.helpers.uniforms.resolution,
        uSaturation: { value: 1.4 },
      },
      transparent: true,
      depthWrite: false,
    });
  }

  #createRays() {
    const marble = resources.get("hero-marble");
    const w = marble.image.width * 0.5;
    const h = marble.image.height * 0.5;
    const opts = { depthBuffer: false, stencilBuffer: false };
    this.#state.buffers.loop = new WebGLRenderTarget(w, h, opts);
    this.#state.buffers.blur = new WebGLRenderTarget(w, h, opts);
    const noise = resources.get("noise");
    const material = new ShaderMaterial({
      vertexShader: fullscreenVertex,
      fragmentShader: raysFragment,
      uniforms: {
        uTxt: { value: marble },
        uMouse: d.helpers.uniforms.mouse.smooth,
        uNoise: { value: noise },
        uTime: d.helpers.uniforms.time,
        uIntensity: { value: 2 },
        uOffsetScale: { value: 0.25 },
        uDecayRate: { value: 0.85 },
        uMixFactor: { value: 0.9 },
        uClampMax: { value: 1 },
      },
    });
    this.#state.loopMesh = new FullscreenTriangle(material);
    this.#state.blurPass = new GaussianBlurPass({ kernelSize: 6, resolutionScale: 1, iterations: 2 });
    this.#state.blurPass.setSize(w, h);
  }

  #renderRays() {
    const previous = d.gl.getRenderTarget();
    d.gl.setRenderTarget(this.#state.buffers.loop);
    d.gl.render(this.#state.loopMesh, d.camera);
    this.#state.blurPass.render(d.gl, this.#state.buffers.loop, this.#state.buffers.blur);
    d.gl.setRenderTarget(previous);
  }

  #introSpeed() {
    const tween = gsap.to(this.#state, { duration: 8, speedUpIntroReveal: 1, ease: "power1.inOut" });
    this.#state.gsap.push(tween);
  }

  #bindTheatre() {
    const { uniforms } = this.material;
    const basic = {
      colorBoost: t.number(80, { range: [0, 200], label: "Particle boost", nudgeMultiplier: 1 }),
      colorBoostReveal: t.number(30, { range: [0, 200], label: "Reveal boost", nudgeMultiplier: 1 }),
      timeFactorReveal: t.number(1, { range: [0, 1], label: "Reveal speed" }),
      timeFactorBoost: t.number(1, { range: [0, 1], label: "Boost speed" }),
      mask: t.image(undefined, { label: "Mask RED" }),
      maskSelection: t.image(undefined, { label: "Mask GREEN" }),
      maskTime: t.image(undefined, { label: "Mask BLUE" }),
      gradientTxt: t.image(undefined, { label: "Gradient Texture" }),
      mouse: t.compound({
        radius: t.number(0.2, { range: [0, 1] }),
        strength: t.number(1, { range: [0, 1] }),
        boost: t.number(30, { range: [0, 200], nudgeMultiplier: 1 }),
      }),
    };
    this.#basic = theatreObject(THEATRE.projects.home, THEATRE.sheets.home.webgl, "Marble / Basic", basic, (v: any) => {
      uniforms.uBoostFactor.value = v.colorBoost;
      uniforms.uBoostReveal.value = v.colorBoostReveal;
      this.#state.timeFactorReveal = v.timeFactorReveal;
      this.#state.timeFactorBoost = v.timeFactorBoost;
      uniforms.uMouseProps.value.x = v.mouse.radius;
      uniforms.uMouseProps.value.y = v.mouse.strength;
      uniforms.uMouseProps.value.z = v.mouse.boost;
    });

    const rays = {
      intensity: t.number(2, { range: [0, 10] }),
      offsetScale: t.number(0.25, { range: [0, 1] }),
      decayRate: t.number(0.85, { range: [0, 1] }),
      mixFactor: t.number(0.9, { range: [0, 1] }),
      clampMax: t.number(1, { range: [0, 1] }),
      saturation: t.number(1.4, { range: [0, 10] }),
    };
    this.#rays = theatreObject(THEATRE.projects.home, THEATRE.sheets.home.webgl, "Marble / Rays", rays, (v: any) => {
      const u = this.#state.loopMesh.material.uniforms;
      u.uIntensity.value = v.intensity;
      u.uOffsetScale.value = v.offsetScale;
      u.uDecayRate.value = v.decayRate;
      u.uMixFactor.value = v.mixFactor;
      u.uClampMax.value = v.clampMax;
      uniforms.uSaturation.value = v.saturation;
    });
  }

  get scrollProgress() {
    return this.#options.isHero ? this.#state.scrollProgress : 1;
  }

  set expand(value: number) {
    this.#state.expand = value;
  }

  update() {
    const hero = this.#options.isHero;
    const s = this.#state;
    const u = this.material.uniforms;
    this.#tracker.update();
    s.needsRender = !!(this.#tracker?.isActive || this.#endTracker?.isActive || (s.expand > 0 && this.#fullTracker?.isActive));
    if (s.needsRender) {
      if (d.time.frames % 2 === 0) this.#renderRays();
      u.uTime.value.x += d.time.delta * s.timeFactorReveal * s.speedUpIntroReveal;
      u.uTime.value.y += d.time.delta * s.timeFactorBoost;
      u.uTime.value.z += d.time.delta;
    }
    if (hero) {
      this.#endTracker!.update();
      const p = s.scrollProgress;
      const expand = this.#fullTracker ? s.expand : 0;
      const target = expand > 0 ? this.#fullTracker! : this.#endTracker!;
      const counter = expand > 0 ? s.counterScaleUvFull : s.counterScaleUv;
      if (expand > 0) this.#fullTracker!.update();
      u.uScrollProgress.value = p;
      u.uExpand.value = expand;
      u.uAlpha.value = p < 1 ? 1 : expand;
      u.uDim.value = MathUtils.lerp(1, DIM_EXPANDED, expand * p);
      u.vUvScale.value = MathUtils.lerp(1, counter, p);
      s.position.x = MathUtils.lerp(this.#tracker.trackPosition.x, target.trackPosition.x, p);
      s.position.y = MathUtils.lerp(this.#tracker.trackPosition.y, target.trackPosition.y, p);
      const bleed = EXPAND_BLEED * expand * 2;
      s.scale.x = Math.ceil(MathUtils.lerp(this.#tracker.trackSize.w, target.trackSize.w, p)) + bleed;
      s.scale.y = Math.ceil(MathUtils.lerp(this.#tracker.trackSize.h, target.trackSize.h, p)) + bleed;
    } else {
      s.position.x = this.#tracker.trackPosition.x;
      s.position.y = this.#tracker.trackPosition.y;
      s.scale.x = this.#tracker.trackSize.w;
      s.scale.y = this.#tracker.trackSize.h;
    }
    this.position.copy(s.position);
    this.scale.copy(s.scale);
    u.uPlane.value.set(this.scale.x, this.scale.y);
  }

  resize() {
    this.#tracker.resize();
    if (this.#fullTracker) {
      this.#fullTracker.resize();
      this.#state.counterScaleUvFull = MathUtils.clamp((this.#fullTracker.trackSize.w / this.#tracker.trackSize.w) * 1.5, 0, 1);
    }
    if (this.#options.isHero) {
      this.#endTracker!.resize();
      this.#state.counterScaleUv = MathUtils.clamp((this.#endTracker!.trackSize.w / this.#tracker.trackSize.w) * 1.5, 0, 1);
    }
  }

  destroy() {
    this.#fullTracker?.destroy();
    if (this.#options.isHero) {
      this.#scrollTrigger?.kill();
      this.#endTracker!.destroy();
    }
    this.#tracker.destroy();
    this.#basic.unsubscribe();
    this.#rays.unsubscribe();
    this.#state.gsap.forEach((g) => g?.kill());
  }
}
