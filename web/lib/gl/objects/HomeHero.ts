// Hero + "How an idea becomes a launch" WebGL layer:
//  • the hero marble, which scroll-morphs into the first carousel card
//  • one rounded black box per card (bends with drag velocity); the card content itself is DOM (Loop.tsx)
// The page is pitch black: there is no backdrop plane, only the marble and the boxes.

import { Group, MathUtils, PlaneGeometry, Vector2 } from "three";
import { store } from "@/lib/runtime/store";
import { glState as d } from "../state";
import { RENDER } from "../constants";
import { ComponentList } from "./ComponentList";
import { Marble } from "./Marble";
import { TrackedPlane } from "./TrackedPlane";

const EXPAND_FROM = 1.4;
const EXPAND_TO = 2;
const BOX_RADIUS_REM = 0.5;
const DECK_TINT = 0.0025;
const DECK_MAX = 4;
const DECK_FADE = 0.5;
const BOX_GEOMETRY = new PlaneGeometry(1, 1, 1, 24);
const BOW_MAX = 0.045;
const BOW_GAIN = -0.014;
const BOW_LERP = 0.14;
const INACTIVE_SCALE = 0.92;
const liveTracking = () => !!d.size?.isMobile || !d.size?.isTouch;

export class HomeHero extends Group {
  #components: ComponentList;
  #isMobile: boolean;
  #marble!: Marble;
  #boxes: TrackedPlane[] = [];
  #settled = false;
  #rem: number;
  #bow = { prev: 0, bow: 0 };

  constructor({ isMobile }: { isMobile: boolean }) {
    super();
    this.#isMobile = isMobile;
    this.#rem = parseFloat(getComputedStyle(document.documentElement).fontSize);
    this.#components = new ComponentList();
    this.#build();
  }

  #build() {
    if (this.#isMobile) this.#buildMobileMarble();
    else this.#buildHeroMarble();

    this.#buildBoxes();
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

    const dt = Math.max(d.time.delta, 1e-4);
    const velocity = deck ? 0 : (pos - this.#bow.prev) / dt;
    this.#bow.prev = pos;
    const targetBow = MathUtils.clamp(velocity * BOW_GAIN, -BOW_MAX, BOW_MAX);
    this.#bow.bow += (targetBow - this.#bow.bow) * BOW_LERP;
    if (Math.abs(this.#bow.bow - targetBow) < 1e-4) this.#bow.bow = targetBow;
  }

  resize() {
    this.#rem = parseFloat(getComputedStyle(document.documentElement).fontSize);
    this.#components.resize();
  }

  update() {
    this.#updateCarousel();
    this.#components.update();
  }

  destroy() {
    this.#components.destroy();
  }
}
