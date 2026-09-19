// Renderer, camera, clock, size and mouse — the WebGL "core" of the original engine.

import {
  Clock,
  MathUtils,
  Mesh,
  MeshBasicMaterial,
  OrthographicCamera,
  PerspectiveCamera,
  PlaneGeometry,
  Scene,
  SRGBColorSpace,
  Vector2,
  Vector3,
  WebGLRenderer,
  type Texture,
} from "three";
import { events, EVENTS } from "@/lib/runtime/events";
import { glState as d } from "./state";
import { resources } from "./resources";

const quad = new PlaneGeometry(2, 2);

type View = {
  mesh: Mesh<PlaneGeometry, MeshBasicMaterial>;
  width: number;
  x: number;
  y: number;
  sourceWidth: number;
  sourceHeight: number;
};

/** Debug overlay that blits textures into the corner (`?showHelpers=1`). */
export class BufferViewer {
  #scene = new Scene();
  #camera = new OrthographicCamera(-1, 1, 1, -1, 0, 1);
  #views: View[] = [];
  #width: number;
  #x: number;
  #y: number;

  constructor({ width = 300, x = 0, y = 0 } = {}) {
    this.#width = width;
    this.#x = x;
    this.#y = y;
  }

  createView(map: Texture, { width = this.#width, x = this.#x, y = this.#y, sourceWidth = 1, sourceHeight = 1 } = {}) {
    const material = new MeshBasicMaterial({ map, depthTest: false, depthWrite: false, transparent: true });
    const mesh = new Mesh(quad, material);
    mesh.frustumCulled = false;
    this.#scene.add(mesh);
    const view = { mesh, width, x, y, sourceWidth, sourceHeight };
    this.#views.push(view);
    return view;
  }

  #measure(view: View) {
    const image = view.mesh.material.map?.image as { width?: number; height?: number } | undefined;
    if (image?.width && image?.height && image.width > 0 && image.height > 0) {
      view.sourceWidth = image.width;
      view.sourceHeight = image.height;
      return;
    }
    view.sourceWidth = Math.max(1, view.sourceWidth || 1);
    view.sourceHeight = Math.max(1, view.sourceHeight || 1);
  }

  resize() {
    const w = Math.max(1, d.size.width || 1);
    const h = Math.max(1, d.size.height || 1);
    const aspect = w / h;
    Object.assign(this.#camera, { left: -aspect, right: aspect, top: 1, bottom: -1, near: 0, far: 1 });
    this.#camera.updateProjectionMatrix();
    this.#views.forEach((v) => this.#measure(v));
  }

  update() {
    if (!this.#views.length) return;
    const gl = d.gl;
    const { width, height } = d.size;
    const autoClear = gl.autoClear;
    gl.autoClear = false;
    gl.setScissorTest(true);
    for (const view of this.#views) {
      if (!view.mesh.material.map) continue;
      this.#measure(view);
      const w = Math.min(view.width, width);
      const h = Math.max(1, Math.round((w * view.sourceHeight) / view.sourceWidth));
      gl.setViewport(view.x, view.y, w, h);
      gl.setScissor(view.x, view.y, w, h);
      gl.render(this.#scene, this.#camera);
    }
    gl.setScissorTest(false);
    gl.setViewport(0, 0, width, height);
    gl.autoClear = autoClear;
  }

  destroy() {
    this.#views.forEach((v) => {
      v.mesh.geometry.dispose();
      v.mesh.material.dispose();
    });
    this.#views = [];
  }
}

const v2 = new Vector2();
const v3 = new Vector3();

/** Pointer in NDC with two smoothed followers (fed by the global MOUSE:MOVE event). */
export class Mouse {
  static = v2.clone().set(-0, -0);
  smooth = v2.clone().set(-0, -0);
  smoother = v2.clone().set(-0, -0);
  world = v3.clone().set(-1e4, -1e4, -1e4);
  viewport = v3.clone().set(-0, -0, 0);
  viewportSmooth = v3.clone().set(-0, -0, 0);
  isDragging = false;
  isHolding = false;

  constructor() {
    d.helpers.uniforms.mouse.smooth.value = this.smooth;
    d.helpers.uniforms.mouse.smoother.value = this.smoother;
    events.on(EVENTS.APP_MOUSE_MOVE, this.#onMove);
    events.on(EVENTS.APP_MOUSE_DRAG, this.#onDrag);
  }

  #onMove = (e: { xy: [number, number] }) => {
    if (!d.size) return;
    const [x, y] = e.xy;
    this.viewport.x = x;
    this.viewport.y = y;
    this.static.x = (x / d.size.width) * 2 - 1;
    this.static.y = -(y / d.size.height) * 2 + 1;
  };

  #onDrag = (e: { xy: [number, number]; dragging: boolean; active: boolean }) => {
    if (!d.size) return;
    const [x, y] = e.xy;
    this.viewport.x = x;
    this.viewport.y = y;
    this.static.x = (x / d.size.width) * 2 - 1;
    this.static.y = -(y / d.size.height) * 2 + 1;
    this.isDragging = e.dragging;
    this.isHolding = e.active;
  };

  update() {
    this.viewportSmooth.lerp(this.viewport, 0.15 * d.time.scale);
    this.smooth.lerp(this.static, 0.09 * d.time.scale);
    this.smoother.lerp(this.static, 0.033 * d.time.scale);
  }

  destroy() {
    events.off(EVENTS.APP_MOUSE_MOVE, this.#onMove);
    events.off(EVENTS.APP_MOUSE_DRAG, this.#onDrag);
  }
}

export class Time {
  clock = new Clock();
  elapsed = 0;
  delta = 0;
  realDelta = 0;
  scale = 1;
  frames = 0;

  constructor() {
    this.clock.start();
  }

  reset() {
    this.frames = 0;
    this.clock.start();
    this.clock.getElapsedTime();
    const delta = this.clock.getDelta();
    this.realDelta = delta;
    this.elapsed = 0;
    d.helpers.uniforms.time.value = this.elapsed;
    d.helpers.uniforms.timeScale.value = this.scale;
  }

  update() {
    this.frames += 1;
    const delta = this.clock.getDelta();
    this.clock.getElapsedTime();
    this.realDelta = delta;
    this.delta = delta * this.scale;
    this.elapsed += this.delta;
    d.helpers.uniforms.time.value = this.elapsed;
    d.helpers.uniforms.timeScale.value = this.scale;
  }
}

export class Size {
  width = 0;
  height = 0;
  isMobile = false;
  isTouch = false;

  setSize(width: number, height: number) {
    this.width = width;
    this.height = height;
    const { resize } = d.runtime;
    d.helpers.uniforms.resolution.value.set(width, height, d.dpr);
    this.isMobile = resize.small;
    this.isTouch = !resize.mouse;
  }
}

/** Perspective camera placed so that 1 world unit = 1 CSS pixel at z = 0. */
export class Camera extends PerspectiveCamera {
  constructor(fov: number, aspect: number, near: number, far: number) {
    super(fov, aspect, near, far);
    this.lookAt(0, 0, 0);
  }
  update() {}
  resize() {
    const z = (d.size.height / Math.tan((this.fov * Math.PI) / 360)) * 0.5;
    this.position.set(0, 0, z);
    this.aspect = d.size.width / d.size.height;
    this.far = z * 20;
    this.near = this.far / 1e3;
    this.lookAt(0, 0, 0);
    this.updateProjectionMatrix();
  }
}

export class Renderer {
  #gl!: WebGLRenderer;
  #dom: { wrapper: HTMLElement; canvas: HTMLCanvasElement };
  #scene!: Scene;

  constructor(dom: { wrapper: HTMLElement; canvas: HTMLCanvasElement }) {
    this.#dom = dom;
    this.#init();
  }

  #init() {
    const params = new URLSearchParams(window.location.search);
    d.isDebug = !!params.get("debug");
    d.showHelpers = !!params.get("showHelpers");

    const dpr = MathUtils.clamp(window.devicePixelRatio, 1, 2);
    this.#gl = new WebGLRenderer({
      powerPreference: "high-performance",
      canvas: this.#dom.canvas,
      depth: true,
      stencil: true,
      antialias: !(dpr > 1),
    });
    this.#gl.outputColorSpace = SRGBColorSpace;
    this.#gl.shadowMap.enabled = false;
    this.#gl.setClearColor(526344);
    this.#gl.setClearAlpha(1);
    this.#gl.setPixelRatio(dpr);
    d.dpr = dpr;
    d.mouse = new Mouse();
    d.time = new Time();
    d.size = new Size();

    const w = this.#dom.wrapper.clientWidth;
    const h = this.#dom.wrapper.clientHeight;
    d.size.setSize(w, h);
    this.#gl.setSize(w, h);
    const camera = new Camera(30, w / h, 1, 1e3);
    this.#scene = new Scene();
    resources.addContext(this.#gl);
    d.dom = this.#dom;
    d.gl = this.#gl;
    d.scene = this.#scene;
    d.camera = camera;
    if (d.showHelpers) d.bufferViewer = new BufferViewer();
    this.onResize();
    this.onResize();
  }

  destroy() {
    (d.mouse as unknown as Mouse | undefined)?.destroy?.();
    this.#gl.dispose();
    this.#gl.forceContextLoss();
  }

  update = () => {
    d.mouse.update();
    d.time.update();
    (d.camera as unknown as Camera).update();
    events.emit(EVENTS.WEBGL_BEFORE_RENDER, d);
    d.gl.render(d.scene, d.camera);
    events.emit(EVENTS.WEBGL_AFTER_RENDER, d);
    if (d.showHelpers) d.bufferViewer?.update();
  };

  onResize() {
    const w = this.#dom.wrapper.clientWidth;
    const h = this.#dom.wrapper.clientHeight;
    d.gl.setSize(w, h);
    d.size.setSize(w, h);
    (d.camera as unknown as Camera).resize();
  }
}
