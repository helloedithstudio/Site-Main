import { Group } from "three";
import { events, EVENTS } from "@/lib/runtime/events";
import { glState as d } from "./state";
import { RENDER } from "./constants";
import { THEATRE, t, theatreObject } from "./theatre";
import { ComponentList } from "./objects/ComponentList";
import { HomeHero } from "./objects/HomeHero";
import { Marble } from "./objects/Marble";
import { SpinningModel } from "./objects/SpinningModel";

/** Home page: hero/loop layer, footer marble, membership glyph, decisions scroll. */
export class HomeScene extends Group {
  #components = new ComponentList();
  #theatre!: { unsubscribe: () => void };

  constructor() {
    super();
    this.#build();
    events.on(EVENTS.WEBGL_BEFORE_RENDER, this.#update);
    this.#theatre = theatreObject(
      THEATRE.projects.home,
      THEATRE.sheets.home.webgl,
      "Global",
      { modelsMatcap: t.image(undefined, { label: "Models Matcap" }) },
      () => {},
    );
  }

  #build() {
    const hero = new HomeHero({ isMobile: !d.runtime.resize.mouse });
    this.add(hero);
    this.#components.add(hero);

    const footer = new Marble({ tracker: '[data-js="gl-marble-footer"]', isHero: false });
    this.add(footer);
    this.#components.add(footer);

    const membership = new SpinningModel({
      key: "membership-model",
      tracker: '[data-js="gl-coin"]',
      mask: { tracker: '[data-js="gl-coin-mask"]', stencilRef: RENDER.stencils.coin },
      diffuseKey: "membership-diffuse",
      normalKey: "membership-normal",
      scaleFactor: 1.5,
      hasEmbers: true,
    });
    this.#components.add(membership);
    this.add(membership);

    const decisions = new SpinningModel({
      key: "decisions-model",
      tracker: '[data-js="gl-emblem"]',
      mask: { tracker: '[data-js="gl-emblem-mask"]', stencilRef: RENDER.stencils.emblem },
      diffuseKey: "decisions-diffuse",
      normalKey: "decisions-normal",
      scaleFactor: 0.95,
      hasEmbers: true,
    });
    this.#components.add(decisions);
    this.add(decisions);
  }

  resize() {
    this.#components.resize();
  }

  #update = () => {
    this.#components.update();
  };

  destroy() {
    this.#components.destroy();
    events.off(EVENTS.WEBGL_BEFORE_RENDER, this.#update);
    this.#theatre.unsubscribe();
  }
}

/** Other pages: every [data-js="gl-marble"] gets a marble plane. */
export class MarbleScene extends Group {
  #components = new ComponentList();

  constructor() {
    super();
    document.querySelectorAll<HTMLElement>('[data-js="gl-marble"]').forEach((el) => {
      const marble = new Marble({ tracker: el, isHero: false });
      this.add(marble);
      this.#components.add(marble);
    });
    events.on(EVENTS.WEBGL_BEFORE_RENDER, this.#update);
  }

  resize() {
    this.#components.resize();
  }

  #update = () => {
    this.#components.update();
  };

  destroy() {
    this.#components.destroy();
    events.off(EVENTS.WEBGL_BEFORE_RENDER, this.#update);
  }
}
