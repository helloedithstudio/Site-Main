// Hero + "How an idea becomes a launch" WebGL layer:
//  • the tech-grid backdrop (sticky over the hero to loop block)
//  • the hero marble, which scroll-morphs into the first carousel card
//  • one rounded black box per card (bends with drag velocity)
//  • one sculpture per card, which pops in when its card is active

import {
  DoubleSide,
  Group,
  MathUtils,
  MeshMatcapMaterial,
  PlaneGeometry,
  RepeatWrapping,
  SRGBColorSpace,
  Vector2,
  Vector3,
  type Mesh,
  type Object3D,
  type Texture,
} from "three";
import { gsap } from "@/lib/runtime/gsap";
import { events, EVENTS } from "@/lib/runtime/events";
import { store, watchFlag } from "@/lib/runtime/store";
import { glState as d } from "../state";
import { resources } from "../resources";
import { Tracker } from "../tracker";
import { RENDER } from "../constants";
import { ComponentList } from "./ComponentList";
import { FitModel } from "./FitModel";
import { Marble } from "./Marble";
import { TrackedPlane } from "./TrackedPlane";

function coverTexture(texture: Texture, [w, h] = [1, 1]) {
  const target = w / h;
  const image = texture.image as { width: number; height: number };
  const source = image.width / image.height;
  let rx = 1;
  let ry = 1;
  let ox = 0;
  let oy = 0;
  if (source > target) {
    rx = target / source;
    ox = (1 - rx) / 2;
  } else {
    ry = source / target;
    oy = (1 - ry) / 2;
  }
  texture.repeat.set(rx, ry);
  texture.offset.set(ox, oy);
  texture.wrapS = texture.wrapT = RepeatWrapping;
  texture.needsUpdate = true;
}

const v3 = new Vector3();
const POP_MIN = 0.65;
const OVERSHOOT = 3.7;
const POP_IN = { duration: 0.55, delay: 0.45 };
const POP_OUT = { duration: 0.3, delay: 0 };
const backOut = (t: number) => 1 + (OVERSHOOT + 1) * Math.pow(t - 1, 3) + OVERSHOOT * Math.pow(t - 1, 2);
const EXPAND_FROM = 1.4;
const EXPAND_TO = 2;
const REVEAL_DURATION = 0.75;
const REVEAL_EASE = "power1.out";
const BOX_RADIUS_REM = 0.5;
const DECK_TINT = 0.0025;
const DECK_MAX = 4;
const DECK_FADE = 0.5;
const BOX_GEOMETRY = new PlaneGeometry(1, 1, 1, 24);
const BOW_MAX = 0.045;
const BOW_GAIN = -0.014;
const BOW_LERP = 0.14;
const INACTIVE_SCALE = 0.92;
const PAINT_DRIFT = 0.00003;
const liveTracking = () => !!d.size?.isMobile || !d.size?.isTouch;

/** The sculpture on one carousel card. `model` is the spinning pivot; `tilt` holds it steady. */
type CardModel = {
  model: Group;
  material: MeshMatcapMaterial & { uniforms?: Record<string, { value: any }> };
  rotation: Vector3;
  tracker: Tracker;
  fit: FitModel;
  slide: number;
  pop: { t: number };
  on: boolean | null;
};

/** One sculpture per card, in card order. */
const CARD_MODELS = ["loop-1-model", "loop-2-model", "loop-3-model", "loop-4-model", "loop-5-model", "loop-6-model"];

export class HomeHero extends Group {
  #components: ComponentList;
  #cards: CardModel[] = [];
  #shared: { uBlueNoiseTxt: { value: Texture | null }; uNoiseFactor: { value: number }; uTime: { value: number } };
  #unwatch: (() => void)[] = [];
  #isMobile: boolean;
  #paint!: TrackedPlane;
  #marble!: Marble;
  #reveal = { progress: 0 };
  #boxes: TrackedPlane[] = [];
  #settled = false;
  #rem: number;
  #bow = { prev: 0, bow: 0 };

  constructor({ isMobile }: { isMobile: boolean }) {
    super();
    this.#isMobile = isMobile;
    this.#rem = parseFloat(getComputedStyle(document.documentElement).fontSize);
    this.#shared = { uBlueNoiseTxt: { value: null }, uNoiseFactor: { value: 0.8 }, uTime: d.helpers.uniforms.time };
    this.#components = new ComponentList();
    this.#build();
    this.#listen();
  }

  #paintBaseY = 0;

  #fitPaint() {
    const texture = resources.get("tech-grid");
    coverTexture(texture, [this.#paint.scale.x, this.#paint.scale.y]);
    this.#paintBaseY = texture.offset.y;
  }

  #build() {
    if (this.#isMobile) this.#buildMobileMarble();
    else this.#buildHeroMarble();

    const paint = new TrackedPlane({
      tracker: '[data-js="gl-hero-bg"]',
      preventUpdateScale: false,
      sticky: {
        container: '[data-js="gl-hero-bg-desktop"]',
        start: () => "top top",
        end: () => "bottom bottom",
      },
    });
    this.#paint = paint;
    this.#fitPaint();
    const texture = resources.get("tech-grid");
    paint.material.map = texture;
    paint.material.map!.colorSpace = SRGBColorSpace;
    paint.material.map!.needsUpdate = true;
    paint.material.transparent = true;
    paint.material.depthWrite = false;
    paint.mesh.renderOrder = RENDER.renderOrder.hero;
    this.add(paint);
    this.#components.add(paint);

    this.#buildBoxes();
    this.#cards = CARD_MODELS.map((key, i) => this.#buildCardModel(key, `[data-js="gl-loop-${i + 1}"]`, i)).filter(
      (m): m is CardModel => !!m,
    );
  }

  #buildMobileMarble() {
    this.#marble = new Marble({ tracker: '[data-js="gl-hero"]', isHero: false });
    this.#marble.renderOrder = RENDER.renderOrder.hero + 1;
    this.add(this.#marble);
    this.#components.add(this.#marble);
  }

  #buildHeroMarble() {
    const live = !d.size?.isMobile;
    this.#marble = new Marble({
      tracker: '[data-js="gl-hero-full"]',
      trackerEnd: '[data-js="gl-hero-end"]',
      trackerFull: '[data-js="gl-uniswap-bg"]',
      isHero: true,
      live,
      landing: live ? { trigger: '[data-js="gl-uniswap-landing"]', position: "top top" } : null,
    });
    this.#marble.renderOrder = RENDER.renderOrder.hero + 1;
    this.add(this.#marble);
    this.#components.add(this.#marble);
  }

  #buildBoxes() {
    const elements = [...document.querySelectorAll<HTMLElement>(".js-slide-box")];
    this.#boxes = elements.map((el, i) => {
      const box = new TrackedPlane({ tracker: el, preventUpdateScale: false, live: liveTracking() });
      box.material.color.set(0);
      box.material.transparent = true;
      box.material.depthWrite = false;
      box.mesh.geometry = BOX_GEOMETRY;
      box.material.onBeforeCompile = (shader) => {
        shader.uniforms.uSize = box.uSize = { value: new Vector2(1, 1) };
        shader.uniforms.uRadius = box.uRadius = { value: 0 };
        shader.uniforms.uBow = box.uBow = { value: 0 };
        shader.vertexShader = shader.vertexShader
          .replace(
            "#include <common>",
            `#include <common>
uniform float uBow;
varying vec2 vBoxUv;`,
          )
          .replace(
            "#include <begin_vertex>",
            `
                        #include <begin_vertex>
                        vBoxUv = uv;

                        // the sail: the vertical middle lags the scrub, the clamped
                        // edges hold — a parabola over uv.y, in card-width units
                        transformed.x += uBow * (1.0 - pow(2.0 * uv.y - 1.0, 2.0));
                    `,
          );
        shader.fragmentShader = shader.fragmentShader
          .replace(
            "#include <common>",
            `
                        #include <common>
                        uniform vec2 uSize;
                        uniform float uRadius;
                        varying vec2 vBoxUv;
                    `,
          )
          .replace(
            "#include <color_fragment>",
            `
                        #include <color_fragment>

                        vec2 boxP = (vBoxUv - 0.5) * uSize;
                        vec2 boxB = 0.5 * uSize - uRadius;
                        float boxD = length(max(abs(boxP) - boxB, 0.0)) - uRadius;
                        diffuseColor.a *= 1.0 - smoothstep(-1.0, 0.0, boxD);
                    `,
          );
      };
      box.material.depthTest = false;
      box.mesh.renderOrder = RENDER.renderOrder.hero + 2 + i * 2;
      box.slide = i;
      this.add(box);
      this.#components.add(box);
      return box;
    });
  }

  #swapMatcap = (texture: Texture) => {
    texture.colorSpace = SRGBColorSpace;
    texture.needsUpdate = true;
    this.#cards.forEach((card) => (card.material.matcap = texture));
  };

  #buildCardModel(key: string, selector: string, slide: number): CardModel | null {
    if (!resources.get(key) || !document.querySelector(selector)) return null;
    const matcap = resources.get("model-matcap");
    matcap.colorSpace = SRGBColorSpace;
    const noise = resources.get("noise-4");
    noise.wrapS = noise.wrapT = RepeatWrapping;
    noise.needsUpdate = true;
    const model: Object3D = resources.get(key).scene;
    const tracker = new Tracker({ tracker: selector, live: liveTracking() });
    const material = new MeshMatcapMaterial({
      matcap,
      transparent: true,
      side: DoubleSide,
    }) as CardModel["material"];
    material.onBeforeCompile = (shader) => {
      shader.uniforms = { ...shader.uniforms, ...this.#shared, uNoiseTxt: { value: noise }, uProgress: { value: 0 } };
      material.uniforms = shader.uniforms;
      shader.vertexShader = shader.vertexShader.replace(
        "#include <common>",
        `
                varying vec3 vPosition;

                #include <common>
            `,
      );
      shader.vertexShader = shader.vertexShader.replace(
        "#include <begin_vertex>",
        `
                #include <begin_vertex>
                vPosition = position;
            `,
      );
      shader.fragmentShader = shader.fragmentShader.replace(
        "#include <common>",
        `
                varying vec3 vPosition;
                uniform float uNoiseFactor;
                uniform float uProgress;
                uniform float uTime;
                uniform sampler2D uBlueNoiseTxt;
                uniform sampler2D uNoiseTxt;

                #include <common>
            `,
      );
      shader.fragmentShader = shader.fragmentShader.replace(
        "#include <opaque_fragment>",
        `
                  float bn = texture(uBlueNoiseTxt, gl_FragCoord.xy * 0.005).r;
                  outgoingLight.rgb *= 1.0 - bn * uNoiseFactor;
                  outgoingLight.rgb = clamp(outgoingLight.rgb, 0.0, 3.0);

                  // TRANS
                  // Rotate vPosition.xy by an angle
                  float angle = 0.75; // radians, adjust as needed
                  mat2 rot = mat2(cos(angle), -sin(angle),sin(angle),  cos(angle));
                  vec2 rotatedPos = rot * vPosition.xy;

                  float mask = texture2D(uNoiseTxt, rotatedPos * 0.02 + uTime * 0.01).r;
                  float mixRatio = uProgress;
                  float threshold = 0.15;
                  float r = mixRatio * (1.0 + threshold * 2.0) - threshold;
                  float mixf = 1.0 - clamp(( mask - r) * (1.0 / threshold), 0.0, 1.0);
                  float edge = smoothstep(0.1, 0.9, sin(mixf * 3.14)) * smoothstep(0.9, 0.7, mixRatio);

                  #include <opaque_fragment>
                  gl_FragColor.a = max(mixf, edge);
                  gl_FragColor.rgb = mix(gl_FragColor.rgb, gl_FragColor.rgb * 800.0, edge);
                `,
      );
    };
    model.traverse((o) => {
      if ((o as Mesh).isMesh) {
        (o as Mesh).material = material;
        o.renderOrder = RENDER.renderOrder.hero + 3 + slide * 2;
      }
    });
    const fit = new FitModel({ model, scaleFactor: 1.05, tracker });
    const pivot = new Group();
    pivot.add(fit);
    // The tilt sits outside the spinning pivot, so the camera keeps seeing a little of the top as the
    // model turns. (The original tilted inside the pivot, which swung the model between top and underside.)
    const tilt = new Group();
    tilt.rotation.x = 0.2;
    tilt.add(pivot);
    tracker.add(tilt);
    this.add(tracker);
    this.#components.add(tracker);
    this.#components.add(fit);
    return { model: pivot, material, rotation: v3.clone(), tracker, fit, slide, pop: { t: 0 }, on: null };
  }

  #onRevealed = (revealed: boolean) => {
    gsap.to(this.#reveal, { duration: REVEAL_DURATION, progress: revealed ? 1 : 0, ease: REVEAL_EASE, overwrite: "auto" });
  };

  #updateSettled(expand: number) {
    if (!this.#isMobile) this.#marble.visible = this.#marble.scrollProgress < 1 || expand > 0;
    const settled = this.#marble.scrollProgress >= 1;
    if (settled !== this.#settled) {
      this.#settled = settled;
      store.setFlag("vaultsSettled", settled);
    }
  }

  #updateCarousel() {
    const { pos, step, posAtMeasure } = d.helpers.uniswap;
    const shift = (posAtMeasure - pos) * step;
    const deck = !step;
    const expand = MathUtils.clamp(MathUtils.inverseLerp(EXPAND_FROM, EXPAND_TO, pos), 0, 1);
    this.#marble.expand = expand;
    this.#updateSettled(expand);

    this.#boxes.forEach((box) => {
      const hideFirst = !deck && expand === 0 && !this.#settled && Math.abs(box.slide - pos) < 0.5;
      box.offset.x = shift;
      box.material.opacity = hideFirst ? 0 : 1;
      const depth = deck ? d.helpers.uniswap.deckP - box.slide : 0;
      const stacked = MathUtils.clamp(depth, 0, DECK_MAX);
      const fade = 1 - MathUtils.smoothstep(depth, DECK_MAX, DECK_MAX + DECK_FADE);
      box.material.color.setScalar(stacked * fade * DECK_TINT);
      box.mesh.visible = !deck || depth <= DECK_MAX + DECK_FADE;
      if (box.uSize) {
        box.uSize.value.set(box.scale.x, box.scale.y);
        box.uRadius!.value = BOX_RADIUS_REM * this.#rem;
        box.uBow!.value = this.#bow.bow;
      }
      const focus = deck ? 1 : 1 - MathUtils.smoothstep(Math.min(Math.abs(box.slide - pos), 1), 0, 1);
      const s = INACTIVE_SCALE + (1 - INACTIVE_SCALE) * focus;
      box.mesh.scale.set(s, s, 1);
    });

    const index = d.helpers.uniswap.index;
    const dt = Math.max(d.time.delta, 1e-4);
    const velocity = deck ? 0 : (pos - this.#bow.prev) / dt;
    this.#bow.prev = pos;
    const targetBow = MathUtils.clamp(velocity * BOW_GAIN, -BOW_MAX, BOW_MAX);
    this.#bow.bow += (targetBow - this.#bow.bow) * BOW_LERP;
    if (Math.abs(this.#bow.bow - targetBow) < 1e-4) this.#bow.bow = targetBow;
    const bowShift = this.#bow.bow * (this.#boxes[0]?.scale.x ?? 0);

    this.#cards.forEach((card) => {
      card.tracker.offset.x = shift;
      card.model.position.x = bowShift;
      if (card.tracker.live) card.fit.resize();
      const on = deck || card.slide === index;
      if (on !== card.on) {
        if (card.on === null) card.pop.t = on ? 1 : 0;
        else gsap.to(card.pop, { t: on ? 1 : 0, ...(on ? POP_IN : POP_OUT), ease: "power2.out", overwrite: "auto" });
        card.on = on;
      }
      const p = card.pop.t * this.#reveal.progress;
      card.model.scale.setScalar(POP_MIN + (1 - POP_MIN) * backOut(p));
      const uniforms = card.material.uniforms;
      if (uniforms) uniforms.uProgress.value = p;
    });
  }

  #listen() {
    this.#unwatch.push(watchFlag("vaultsRevealed", this.#onRevealed, { immediate: true }));
    events.on(EVENTS.THEATRE_SWAP_MATCAP, this.#swapMatcap);
  }

  #unlisten() {
    this.#unwatch.forEach((u) => u());
    events.off(EVENTS.THEATRE_SWAP_MATCAP, this.#swapMatcap);
  }

  resize() {
    this.#rem = parseFloat(getComputedStyle(document.documentElement).fontSize);
    this.#components.resize();
    this.#fitPaint();
  }

  update() {
    const velocity = d.runtime.scroll.lenis.velocity;
    const spin = 0.2 * d.time.delta + velocity * 0.002;
    this.#cards.forEach((card) => (card.model.rotation.y += spin + card.rotation.y));
    this.#updateCarousel();
    // the grid tiles in Y, so it can drift slowly against the page as you scroll
    const grid = resources.get("tech-grid");
    grid.offset.y = this.#paintBaseY + d.runtime.scroll.lenis.scroll * PAINT_DRIFT;
    this.#components.update();
  }

  destroy() {
    this.#components.destroy();
    this.#unlisten();
  }
}
