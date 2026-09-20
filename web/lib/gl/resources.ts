// Asset loader of the WebGL layer (the list itself is in manifest.ts). Textures flagged `compress` are loaded as
// KTX2 (`-desktop.ktx2` / `-mobile.ktx2` when responsive), models as Draco-ready GLB.

import { SRGBColorSpace, TextureLoader, type Texture, type WebGLRenderer } from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader.js";
import { KTX2Loader } from "three/examples/jsm/loaders/KTX2Loader.js";
import { manifest, type ResourceEntry } from "./manifest";

const requestIdle: (cb: () => void, opts?: { timeout: number }) => unknown =
  (typeof globalThis !== "undefined" && (globalThis as { requestIdleCallback?: typeof requestIdleCallback }).requestIdleCallback) ||
  ((cb: () => void) => setTimeout(cb, 1));

type Loaded = any; // Texture | GLTF (with `config`)

class Resources {
  gl: WebGLRenderer | false = false;
  #cache = new Map<string, Loaded>();
  #initQueue: Texture[] = [];
  #initRunning = false;
  #responsive: "desktop" | "mobile" = "desktop";
  #deferred: ResourceEntry[] = [];
  #loaders: { gltf: GLTFLoader; tl: TextureLoader; gainmap: undefined; ktx: KTX2Loader; rgbe?: any };

  constructor() {
    this.#loaders = { gltf: new GLTFLoader(), tl: new TextureLoader(), gainmap: undefined, ktx: new KTX2Loader() };
    const draco = new DRACOLoader();
    draco.setDecoderPath("/gl/decoders/draco/gltf/");
    this.#loaders.gltf.setDRACOLoader(draco);
    this.#loaders.ktx.setTranscoderPath("/gl/decoders/basis/");
  }

  get(key: string): Loaded {
    return key === "all" ? this.#cache : this.#cache.get(key);
  }

  get loaders() {
    return this.#loaders;
  }

  addContext(gl: WebGLRenderer) {
    this.gl = gl;
    this.#loaders?.ktx?.detectSupport(gl);
  }

  setResponsiveType(type: "desktop" | "mobile") {
    this.#responsive = type;
  }

  #runInitQueue() {
    if (this.#initRunning) return;
    this.#initRunning = true;
    const next = () => {
      if (this.#initQueue.length === 0) {
        this.#initRunning = false;
        return;
      }
      const texture = this.#initQueue.shift()!;
      const gl = this.gl;
      if (!gl || gl.getContext().isContextLost()) {
        this.#initQueue.length = 0;
        this.#initRunning = false;
        return;
      }
      if (!(gl.properties.get(texture) as { __webglTexture?: unknown }).__webglTexture) gl.initTexture(texture);
      if (typeof requestIdle === "function") requestIdle(next, { timeout: 50 });
      else setTimeout(next, 10);
    };
    next();
  }

  #queueInit(texture: Texture) {
    this.#initQueue.push(texture);
    this.#runInitQueue();
  }

  async loadDeferredResources() {
    const clear = () => (this.#deferred = []);
    return this.load({ data: this.#deferred, isDeferCall: true }).then(() => clear());
  }

  load({ data = [], isDeferCall = false, preventSave = false }: { data?: ResourceEntry[]; isDeferCall?: boolean; preventSave?: boolean } = {}) {
    const entries = preventSave ? [...data] : [...data, ...(manifest || [])];
    const done = (entry: ResourceEntry, resolve: (v: Loaded) => void, value: Loaded = false, cached = false, skipSave = false) => {
      if (value && !skipSave) this.#cache.set(entry.key, value);
      void isDeferCall;
      void cached;
      resolve(value);
    };
    const fail = (entry: ResourceEntry, resolve: (v: Loaded) => void, error: unknown) => {
      console.error(`FAILED:[${entry.type}][${entry.key}]:${entry.path}`, error);
      resolve(null);
    };

    const promises = entries.map((entry) => {
      if (this.#cache.has(entry.key)) return new Promise((r) => done(entry, r, false, true, preventSave));
      if (entry.type === "gltf") {
        return new Promise((resolve) => {
          this.#loaders.gltf.load(
            entry.path,
            (gltf) => {
              (gltf as Loaded).config = entry;
              done(entry, resolve, gltf, false, preventSave);
            },
            undefined,
            (e) => fail(entry, resolve, e),
          );
        });
      }
      if (entry.type === "texture") {
        const compress = entry.compress;
        let loader: TextureLoader | KTX2Loader = this.#loaders.tl;
        if (compress) {
          loader = this.#loaders.ktx;
          if (entry.compress?.responsive) {
            const suffix = this.#responsive === "desktop" ? "-desktop.ktx2" : "-mobile.ktx2";
            entry.path = entry.path.replace(/\.(png|jpg)/, suffix);
          } else entry.path = entry.path.replace(/\.(png|jpg)/, ".ktx2");
        }
        return new Promise((resolve) => {
          (loader as TextureLoader).load(
            entry.path,
            (texture: Texture) => {
              (texture as Loaded).config = entry;
              if (entry.colorSpace === "SRGBColorSpace") texture.colorSpace = SRGBColorSpace;
              if ("flipY" in entry) texture.flipY = entry.flipY!;
              if (!entry.preventInit && this.gl) this.#queueInit(texture);
              done(entry, resolve, texture, false, preventSave);
            },
            undefined,
            (e) => fail(entry, resolve, e),
          );
        });
      }
      return undefined;
    });
    return Promise.all(promises);
  }
}

export const resources = new Resources();
