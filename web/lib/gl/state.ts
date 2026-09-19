// Global WebGL state (`tk` in the original bundle): renderer handles, shared uniforms
// and the "uniswap" helpers the DOM carousel writes and the GL scene reads.

import { Vector2, Vector3, type Camera, type Scene, type WebGLRenderer } from "three";
import { events, EVENTS } from "@/lib/runtime/events";
import type { Runtime } from "@/lib/runtime";

export const GL_STATES = { LOADING: "loading", LOADED: "loaded", READY: "ready" } as const;

const STATE_EVENTS: Record<string, string> = {
  loading: EVENTS.WEBGL_APP_LOADING,
  loaded: EVENTS.WEBGL_APP_LOADED,
  ready: EVENTS.WEBGL_APP_READY,
};

const zero2 = new Vector2();
const zero3 = new Vector3();

export const glState = {
  glState: "",
  setGlState(state: string) {
    glState.glState = state;
    if (state in STATE_EVENTS) events.emit(STATE_EVENTS[state]);
  },
  runtime: undefined as unknown as Runtime,
  gl: undefined as unknown as WebGLRenderer,
  scene: undefined as unknown as Scene,
  camera: undefined as unknown as Camera & { fov: number },
  composer: undefined as unknown,
  raycaster: undefined as unknown,
  dom: undefined as unknown as { wrapper: HTMLElement; canvas: HTMLCanvasElement },
  mouse: undefined as unknown as {
    smooth: Vector2;
    smoother: Vector2;
    update: () => void;
  },
  size: undefined as unknown as { width: number; height: number; isMobile: boolean; isTouch: boolean; setSize: (w: number, h: number) => void },
  time: undefined as unknown as { elapsed: number; delta: number; scale: number; frames: number; update: () => void; reset: () => void },
  dpr: 1,
  scroll: undefined as unknown,
  isDebug: false,
  showHelpers: false,
  bufferViewer: undefined as unknown as { update: () => void } | undefined,
  helpers: {
    uniforms: {
      time: { value: 0 },
      timeScale: { value: 1 },
      resolution: { value: zero3.clone() },
      mouse: { smooth: { value: zero2.clone() }, smoother: { value: zero2.clone() } },
    },
    fluid: { texture: null as unknown },
    uniswap: {
      pos: 0,
      step: 0,
      posAtMeasure: 0,
      index: 0,
      deckP: 0,
    },
  },
};

export type GlState = typeof glState;
