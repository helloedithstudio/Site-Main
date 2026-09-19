// WebGL engine lifecycle: create the renderer, load every asset (30s safety timeout),
// build the page scene, then render on the global GSAP/Lenis tick.

import { events, EVENTS } from "@/lib/runtime/events";
import { ScrollTrigger } from "@/lib/runtime/gsap";
import { glState as d, GL_STATES } from "./state";
import { resources } from "./resources";
import { Renderer } from "./core";
import { HomeScene, MarbleScene } from "./scenes";

const LOAD_TIMEOUT = 3e4;

export class Engine {
  #options: { wrapper: HTMLElement; canvas: HTMLCanvasElement; page: string };
  #renderer!: Renderer;
  #scene?: HomeScene | MarbleScene;
  #destroyed = false;

  constructor(options: { wrapper: HTMLElement; canvas: HTMLCanvasElement; page: string }) {
    this.#options = options;
    this.#init();
  }

  #createRenderer() {
    this.#renderer = new Renderer(this.#options);
  }

  async #load() {
    d.setGlState(GL_STATES.LOADING);
    let timer: ReturnType<typeof setTimeout> | undefined;
    const timeout = new Promise<void>((resolve) => {
      timer = setTimeout(() => {
        console.warn(`[GL] resources.load() still pending after ${LOAD_TIMEOUT}ms — building the scene without it`);
        resolve();
      }, LOAD_TIMEOUT);
    });
    await Promise.race([Promise.all([resources.load()]), timeout]);
    clearTimeout(timer);
    d.setGlState(GL_STATES.LOADED);
    d.setGlState(GL_STATES.READY);
    setTimeout(() => d.setGlState(GL_STATES.READY), 0);
  }

  async #init() {
    try {
      this.#createRenderer();
      if (this.#destroyed) return;
      await this.#load();
      if (this.#destroyed) return;
      this.#listen();
      this.#buildScene();
      d.time.reset();
      this.#onResize();
    } catch (e) {
      console.error("[GL] init failed — the page runs without the GL layer", e);
    }
  }

  #listen() {
    events.on(EVENTS.APP_TICK, this.#onTick);
    events.on(EVENTS.APP_RESIZE, this.#onResize);
    ScrollTrigger.addEventListener("refresh", this.#onRefresh);
  }

  #unlisten() {
    events.off(EVENTS.APP_TICK, this.#onTick);
    events.off(EVENTS.APP_RESIZE, this.#onResize);
    ScrollTrigger.removeEventListener("refresh", this.#onRefresh);
  }

  #buildScene() {
    this.#scene = this.#options.page === "index" ? new HomeScene() : new MarbleScene();
    d.scene.add(this.#scene);
  }

  #onResize = () => {
    this.#renderer.onResize();
    this.#scene?.resize();
  };

  #onRefresh = () => {
    this.#scene?.resize();
  };

  #onTick = () => {
    this.#renderer.update();
  };

  destroy() {
    this.#destroyed = true;
    this.#unlisten();
    this.#scene?.destroy();
    this.#renderer?.destroy();
  }
}
