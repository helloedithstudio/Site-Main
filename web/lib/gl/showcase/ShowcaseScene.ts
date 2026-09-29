// The Showcase page's live scene: a row of monoliths in a pitch-black studio (the Hall), an exploded monolith off to the
// side (the X-ray), and a spark for the finale. The page never moves the camera itself; it writes chapter and progress
// into showcaseState, and every frame this scene eases the camera towards that chapter's shot (poses.ts), lights the
// monolith in focus, follows the cursor across its veins, and draws, through bloom and AgX tone mapping on capable
// devices. Frames nobody can see (a film or an opaque section covers the canvas) are skipped.

import {
  AgXToneMapping,
  CanvasTexture,
  Color,
  FogExp2,
  Group,
  HalfFloatType,
  MathUtils,
  Mesh,
  MeshBasicMaterial,
  MeshPhysicalMaterial,
  NoToneMapping,
  PerspectiveCamera,
  PlaneGeometry,
  PointLight,
  Raycaster,
  Sprite,
  SpriteMaterial,
  SRGBColorSpace,
  Vector2,
  Vector3,
  VideoTexture,
  AdditiveBlending,
  type Camera,
  type Material,
  type Texture,
  type ToneMapping,
} from "three";
import { BloomEffect, EffectComposer, EffectPass, RenderPass, ToneMappingEffect, ToneMappingMode } from "postprocessing";
import { events, EVENTS } from "@/lib/runtime/events";
import { glState as d } from "../state";
import { resources } from "../resources";
import { hallPosition, showcaseState as s } from "../showcaseState";
import { createMonolith, goldMaterial, M, monolithGeometries, setSeam, type Geometries, type Monolith } from "./monolith";
import { studioEnvironment, studioLights } from "./studio";
import { XRay } from "./xray";
import { frame, mixPose, monolithCentre, SHOTS, type Pose, type Shot } from "./poses";

// Far enough apart that each monolith stands alone in its shot, like a product on a page.
const SPACING = 5.4;
const X_XRAY = -16;

/** The perspective camera of this scene, in metres (the engine's own camera works in CSS pixels). */
class ShowcaseCamera extends PerspectiveCamera {
  update() {}
  resize() {
    this.aspect = Math.max(0.1, d.size.width / Math.max(1, d.size.height));
    this.updateProjectionMatrix();
  }
}

const ease = (t: number) => t * t * (3 - 2 * t);
const clamp01 = (t: number) => Math.min(1, Math.max(0, t));
const span = (t: number, a: number, b: number) => clamp01((t - a) / (b - a));

/** "ANGLE (NVIDIA, NVIDIA GeForce RTX 4050 Laptop GPU (0x28A1) Direct3D11 vs_5_0 ps_5_0, D3D11)" becomes the chip's name. */
export function cleanGpu(raw: string): string {
  let r = raw.trim();
  const angle = r.match(/^ANGLE \((.*)\)$/);
  if (angle) {
    const parts = angle[1].split(/,\s*/);
    r = parts[1] ?? parts[0];
  }
  r = r
    .replace(/ANGLE Metal Renderer:\s*/i, "")
    .replace(/\s*\(0x[0-9a-f]+\)/gi, "")
    .replace(/\s+(Direct3D|OpenGL|Vulkan|Metal).*$/i, "")
    .replace(/\s+/g, " ")
    .trim();
  return r.slice(0, 48);
}

function shadowTexture(): Texture {
  const c = document.createElement("canvas");
  c.width = 256;
  c.height = 128;
  const ctx = c.getContext("2d")!;
  const g = ctx.createRadialGradient(128, 64, 4, 128, 64, 120);
  g.addColorStop(0, "rgba(0,0,0,0.9)");
  g.addColorStop(0.45, "rgba(0,0,0,0.55)");
  g.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 256, 128);
  const t = new CanvasTexture(c);
  t.colorSpace = SRGBColorSpace;
  return t;
}

function sparkTexture(): Texture {
  const c = document.createElement("canvas");
  c.width = c.height = 128;
  const ctx = c.getContext("2d")!;
  const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
  g.addColorStop(0, "rgba(255,236,230,1)");
  g.addColorStop(0.12, "rgba(214,66,56,1)");
  g.addColorStop(0.4, "rgba(214,66,56,0.28)");
  g.addColorStop(1, "rgba(214,66,56,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 128, 128);
  const t = new CanvasTexture(c);
  t.colorSpace = SRGBColorSpace;
  return t;
}

type Slot = { monolith: Monolith; x: number; live: boolean; seam: number; video?: HTMLVideoElement; screen?: MeshBasicMaterial };

export class ShowcaseScene extends Group {
  #camera = new ShowcaseCamera(30, 1, 0.1, 200);
  #previousCamera: Camera;
  #previousTone: ToneMapping;
  #geo: Geometries;
  #gold: Material;
  #slots: Slot[] = [];
  #xray: XRay;
  #lights: Group;
  #floor: Mesh;
  #shadows: Mesh[] = [];
  #spark: Sprite;
  #sparkLight: PointLight;
  #env: Texture;
  #composer: EffectComposer | null = null;
  #raycaster = new Raycaster();
  #pose: Pose = { position: new Vector3(), target: new Vector3(), fov: 30 };
  #goal: Pose = { position: new Vector3(), target: new Vector3(), fov: 30 };
  #scratch: Pose = { position: new Vector3(), target: new Vector3(), fov: 30 };
  #snapped = false;
  #warm = 3;
  #cursorAmt = 0;
  #turn = new Vector2();
  #wasVisible = false;
  #last = performance.now();

  constructor() {
    super();
    const gl = d.gl;
    this.#previousCamera = d.camera;
    this.#previousTone = gl.toneMapping;
    d.camera = this.#camera as unknown as typeof d.camera;
    this.#camera.resize();
    gl.localClippingEnabled = true;
    gl.info.autoReset = false;

    this.#env = studioEnvironment(gl);
    d.scene.environment = this.#env;
    d.scene.fog = new FogExp2(0x000000, 0.024);

    const marble = (resources.get("sc-marble") as Texture | undefined) ?? null;
    const color = (resources.get("sc-color") as Texture | undefined) ?? null;
    this.#geo = monolithGeometries();
    this.#gold = goldMaterial();

    // The hall: every exhibit, then the sealed slots.
    const exhibits = s.exhibits.length ? s.exhibits : [{ slug: "exhibit", live: true }];
    const count = exhibits.length + s.reserved;
    const shadowTex = shadowTexture();
    const shadowMat = new MeshBasicMaterial({ map: shadowTex, transparent: true, depthWrite: false, toneMapped: false });
    const shadowGeo = new PlaneGeometry(M.w * 2.3, M.d * 5).rotateX(-Math.PI / 2);
    for (let i = 0; i < count; i++) {
      const live = i < exhibits.length;
      const monolith = createMonolith(this.#geo, { marble, color, seed: i * 1.7 + 0.4, sealed: !live, gold: this.#gold });
      monolith.group.position.x = i * SPACING;
      this.add(monolith.group);
      const shadow = new Mesh(shadowGeo, shadowMat);
      shadow.position.set(i * SPACING, 0.002, 0);
      this.add(shadow);
      this.#shadows.push(shadow);
      this.#slots.push({ monolith, x: i * SPACING, live, seam: live ? 0.45 : 0.1 });
    }
    this.#setupVideos(exhibits);

    this.#xray = new XRay(this.#geo, { marble, color, gold: this.#gold });
    this.#xray.position.x = X_XRAY;
    this.add(this.#xray);
    const xrayShadow = new Mesh(shadowGeo, shadowMat);
    xrayShadow.position.set(X_XRAY, 0.002, 0.2);
    this.add(xrayShadow);

    this.#floor = new Mesh(
      new PlaneGeometry(160, 60).rotateX(-Math.PI / 2),
      // black glass: almost no diffuse light, soft reflections of the studio strips and the monoliths' glow
      // (pure black and a broad, weak sheen, so neither the studio nor the lights ever mirror into it as a hard patch)
      new MeshPhysicalMaterial({ color: new Color(0, 0, 0), roughness: 0.82, metalness: 0, specularIntensity: 0.18, envMapIntensity: 0.35 }),
    );
    this.#floor.position.set(20, 0, 0);
    this.add(this.#floor);

    this.#lights = studioLights();
    this.add(this.#lights);

    this.#spark = new Sprite(new SpriteMaterial({ map: sparkTexture(), blending: AdditiveBlending, depthWrite: false, toneMapped: false, transparent: true }));
    this.#spark.scale.setScalar(0.22);
    this.#spark.visible = false;
    this.add(this.#spark);
    this.#sparkLight = new PointLight(new Color("#d64238"), 0, 4, 2);
    this.add(this.#sparkLight);

    if (s.tier === "high") {
      gl.toneMapping = NoToneMapping;
      const composer = new EffectComposer(gl, { frameBufferType: HalfFloatType, multisampling: d.dpr > 1 ? 0 : 4 });
      composer.addPass(new RenderPass(d.scene, this.#camera));
      composer.addPass(
        new EffectPass(
          this.#camera,
          new BloomEffect({ mipmapBlur: true, intensity: 0.7, luminanceThreshold: 0.78, luminanceSmoothing: 0.22, radius: 0.68 }),
          new ToneMappingEffect({ mode: ToneMappingMode.AGX }),
        ),
      );
      this.#composer = composer;
    } else {
      gl.toneMapping = AgXToneMapping;
    }

    try {
      const ctx = gl.getContext();
      const ext = ctx.getExtension("WEBGL_debug_renderer_info");
      s.info.gpu = cleanGpu(String(ext ? ctx.getParameter(ext.UNMASKED_RENDERER_WEBGL) : ctx.getParameter(ctx.RENDERER)));
    } catch {
      s.info.gpu = "";
    }

    d.render = this.#render;
    events.on(EVENTS.WEBGL_BEFORE_RENDER, this.#update);
    this.resize();
    // Compile every shader up front (the X-ray passes included), so nothing hitches the first time it appears.
    this.#xray.showAll(true);
    const compiled = (gl as unknown as { compileAsync?: (sc: typeof d.scene, cam: Camera) => Promise<unknown> }).compileAsync;
    Promise.resolve(compiled ? compiled.call(gl, d.scene, this.#camera) : gl.compile(d.scene, this.#camera))
      .catch(() => undefined)
      .finally(() => this.#xray.set(s.xray));
  }

  // ------------------------------------------------------------------ videos on the monoliths' windows

  #setupVideos(exhibits: typeof s.exhibits) {
    exhibits.forEach((e, i) => {
      const src = e.video?.webm || e.video?.mp4;
      if (!src) return;
      const v = document.createElement("video");
      v.muted = true;
      v.loop = true;
      v.playsInline = true;
      v.preload = "none";
      v.crossOrigin = "anonymous";
      if (e.video?.webm) {
        const a = document.createElement("source");
        a.src = e.video.webm;
        a.type = "video/webm";
        v.appendChild(a);
      }
      if (e.video?.mp4) {
        const b = document.createElement("source");
        b.src = e.video.mp4;
        b.type = "video/mp4";
        v.appendChild(b);
      }
      const tex = new VideoTexture(v);
      tex.colorSpace = SRGBColorSpace;
      // The loop plays on its own sheet just in front of the window's glow, and fades up when the screen "turns on",
      // so at the handoff the live window still matches the film's final frame (lit, but not yet playing).
      const display = this.#slots[i].monolith.parts.display;
      const screenMat = new MeshBasicMaterial({ map: tex, transparent: true, opacity: 0, depthWrite: false, toneMapped: false });
      screenMat.color.setScalar(1.35);
      const screen = new Mesh(display.geometry, screenMat);
      screen.position.z = 0.0003;
      screen.renderOrder = 1;
      display.parent!.add(screen);
      this.#slots[i].video = v;
      this.#slots[i].screen = screenMat;
    });
  }

  #playVideos(focus: number, dt: number) {
    const on = s.visible && (s.chapter === "hall" || s.chapter === "closer" || s.chapter === "resolve");
    this.#slots.forEach((slot, i) => {
      const v = slot.video;
      if (!v || !slot.screen) return;
      const near = on && Math.abs(i - focus) < 1.5;
      if (near && v.paused) void v.play().catch(() => {});
      else if (!near && !v.paused) v.pause();
      // the screen turns on once the page has handed over to the live scene, and only when it has a frame to show
      const want = near && v.readyState >= 2 ? 1 : 0;
      slot.screen.opacity += (want - slot.screen.opacity) * (1 - Math.exp(-dt * (want ? 2.2 : 6)));
      slot.screen.visible = slot.screen.opacity > 0.003;
    });
  }

  // ------------------------------------------------------------------ per frame

  #orientation(): "landscape" | "portrait" {
    const portrait = d.size.height > d.size.width * 1.05;
    s.portrait = portrait;
    return portrait ? "portrait" : "landscape";
  }

  #shot(name: keyof typeof SHOTS): Shot {
    return SHOTS[name][this.#orientation()];
  }

  /** The chapter's camera, written into `out`. Returns the index of the monolith in focus (-1: the X-ray one). */
  #target(out: Pose): number {
    const aspect = this.#camera.aspect;
    const slots = this.#slots.length;
    const hallAt = (pos: number, shotName: "handoff" | "hall" = "hall") => {
      const i = Math.min(slots - 1, Math.floor(pos));
      const f = pos - i;
      const a = frame(monolithCentre(this.#slots[i].x), this.#shot(shotName), aspect);
      if (f <= 0 || i >= slots - 1) return a;
      const b = frame(monolithCentre(this.#slots[i + 1].x), this.#shot(shotName), aspect);
      mixPose(a, b, f, out);
      // between monoliths the camera eases back a little, so moving along the row has depth
      const lift = Math.sin(Math.PI * f);
      out.position.z += lift * 0.9;
      out.position.y += lift * 0.1;
      return { ...out, position: out.position.clone(), target: out.target.clone() };
    };

    switch (s.chapter) {
      case "ignition": {
        const p = hallAt(0, "handoff");
        out.position.copy(p.position);
        out.target.copy(p.target);
        out.fov = p.fov;
        return 0;
      }
      case "closer": {
        const i = Math.max(0, Math.min(slots - 1, s.closer));
        const p = frame(monolithCentre(this.#slots[i].x), this.#shot("closer"), aspect);
        out.position.copy(p.position);
        out.target.copy(p.target);
        out.fov = p.fov;
        return i;
      }
      case "xray": {
        const shot = { ...this.#shot("xray") };
        shot.yaw += s.xray * 14;
        const p = frame(monolithCentre(X_XRAY, 0.3), shot, aspect);
        out.position.copy(p.position);
        out.target.copy(p.target);
        out.fov = p.fov;
        return -1;
      }
      case "resolve": {
        const start = hallAt(0);
        const centre = monolithCentre(((slots - 1) * SPACING) / 2);
        const wide: Shot = this.#orientation() === "portrait"
          ? { at: [0, 0.16], fill: 0.24, yaw: -64, pitch: 26, fov: 40 }
          : { at: [0, 0.24], fill: 0.2, yaw: -16, pitch: 9, fov: 30 };
        const end = frame(centre, wide, aspect);
        mixPose(start, end, ease(span(s.resolve, 0.04, 0.62)), out);
        return 0;
      }
      default: {
        const pos = hallPosition(s.hall, slots);
        const p = hallAt(pos);
        out.position.copy(p.position);
        out.target.copy(p.target);
        out.fov = p.fov;
        return Math.round(pos);
      }
    }
  }

  #update = () => {
    const now = performance.now();
    const dt = Math.min(0.1, (now - this.#last) / 1000);
    this.#last = now;
    const time = d.time.elapsed;

    const focus = this.#target(this.#goal);
    // Jump straight to the new shot whenever the scene was hidden (behind a film or an opaque section), glide otherwise.
    const jump = !this.#snapped || !this.#wasVisible;
    const k = jump ? 1 : 1 - Math.exp(-dt * (s.chapter === "closer" ? 5 : 9));
    this.#pose.position.lerp(this.#goal.position, k);
    this.#pose.target.lerp(this.#goal.target, k);
    this.#pose.fov += (this.#goal.fov - this.#pose.fov) * k;
    this.#snapped = true;
    this.#wasVisible = s.visible;

    // A little parallax from the pointer, except where the page hands over from a film (the frames must match).
    const cam = this.#camera;
    cam.position.copy(this.#pose.position);
    const touch = d.size.isTouch;
    if (!touch && (s.chapter === "hall" || s.chapter === "xray" || s.chapter === "resolve")) {
      cam.position.x += d.mouse.smooth.x * 0.14;
      cam.position.y += d.mouse.smooth.y * 0.07;
    }
    if (Math.abs(cam.fov - this.#pose.fov) > 1e-3) {
      cam.fov = this.#pose.fov;
      cam.updateProjectionMatrix();
    }
    cam.lookAt(this.#pose.target);

    // The monolith in focus: lights follow it, its seam lights up, the cursor glows across its veins.
    const focusX = focus >= 0 ? this.#slots[focus].x : X_XRAY;
    this.#lights.position.x += (focusX - this.#lights.position.x) * (jump ? 1 : 1 - Math.exp(-dt * 6));
    // seen from high above (the finale) the strips would mirror across the stone as beams, so they dim there
    const lightLevel = s.chapter === "resolve" ? 1 - 0.8 * ease(span(s.resolve, 0.04, 0.4)) : 1;
    this.#lights.children.forEach((l, i) => {
      const light = l as unknown as { intensity: number; userData: { base?: number } };
      light.userData.base ??= light.intensity;
      light.intensity = (light.userData.base ?? 0) * lightLevel;
      void i;
    });
    this.#slots.forEach((slot, i) => {
      let want = slot.live ? 0.45 : 0.1;
      if (s.chapter === "resolve") want = ease(span(s.resolve, 0.34 + i * 0.05, 0.44 + i * 0.05)) * (slot.live ? 1 : 0.6) + (slot.live ? 0.2 : 0.05);
      else if (i === focus && s.chapter !== "xray") want = slot.live ? 1 : 0.35;
      slot.seam += (want - slot.seam) * (1 - Math.exp(-dt * 4));
      setSeam(slot.monolith.line, slot.seam);
      slot.monolith.uniforms.uScTime.value = time;
      (slot.monolith.body.material as MeshPhysicalMaterial).envMapIntensity = 1 - 0.65 * (1 - lightLevel) / 0.8;
    });
    this.#xray.monolith.uniforms.uScTime.value = time;
    this.#xray.set(s.xray);

    // Closer look: the monolith turns as the visitor drags it, and settles back when the dialog closes.
    const turning = s.chapter === "closer" ? s.turn : { x: 0, y: 0 };
    this.#turn.x += (turning.x - this.#turn.x) * (1 - Math.exp(-dt * 6));
    this.#turn.y += (turning.y - this.#turn.y) * (1 - Math.exp(-dt * 6));
    const turned = s.closer >= 0 ? this.#slots[Math.min(this.#slots.length - 1, s.closer)] : null;
    this.#slots.forEach((slot) => {
      const g = slot.monolith.group;
      const on = slot === turned;
      g.rotation.y = on ? this.#turn.y : g.rotation.y * 0.9;
      g.rotation.x = on ? this.#turn.x * 0.5 : g.rotation.x * 0.9;
    });

    this.#cursor(focus, dt);
    this.#finale(time);
    this.#playVideos(focus, dt);
  };

  #cursor(focus: number, dt: number) {
    const body = focus >= 0 ? this.#slots[focus].monolith.body : null;
    let hit = false;
    if (body && s.visible) {
      this.#raycaster.setFromCamera(d.mouse.smooth, this.#camera);
      const h = this.#raycaster.intersectObject(body, false)[0];
      if (h) {
        hit = true;
        body.worldToLocal(h.point);
        this.#slots[focus].monolith.uniforms.uScCursor.value.copy(h.point);
      }
    }
    this.#cursorAmt += ((hit ? 1 : 0) - this.#cursorAmt) * (1 - Math.exp(-dt * 5));
    this.#slots.forEach((slot, i) => (slot.monolith.uniforms.uScCursorAmt.value = i === focus ? this.#cursorAmt : 0));
  }

  /** The finale: the spark lifts off the first monolith and rises above the row. */
  #finale(time: number) {
    const p = s.chapter === "resolve" ? s.resolve : 0;
    const t = ease(span(p, 0.2, 0.78));
    const on = p > 0.18;
    this.#spark.visible = on;
    if (!on) {
      this.#sparkLight.intensity = 0;
      return;
    }
    const rowCentre = ((this.#slots.length - 1) * SPACING) / 2;
    this.#spark.position.set(MathUtils.lerp(0, rowCentre, t), MathUtils.lerp(M.h + 0.12, M.h + 1.4, t), MathUtils.lerp(0.22, 0.6, t));
    const pulse = 0.85 + 0.15 * Math.sin(time * 3.2);
    this.#spark.scale.setScalar((0.16 + 0.1 * t) * pulse);
    this.#sparkLight.position.copy(this.#spark.position);
    this.#sparkLight.intensity = 6 * span(p, 0.18, 0.3) * pulse;
  }

  // ------------------------------------------------------------------ drawing

  #render = () => {
    const gl = d.gl;
    if (!s.visible && this.#warm <= 0) return;
    gl.info.reset();
    if (this.#composer) this.#composer.render(d.time.delta);
    else gl.render(d.scene, this.#camera);
    if (s.visible) {
      s.info.triangles = gl.info.render.triangles;
      s.info.calls = gl.info.render.calls;
    }
    if (this.#warm > 0 && --this.#warm === 0) s.markReady();
  };

  resize() {
    this.#camera.resize();
    this.#composer?.setSize(d.size.width, d.size.height);
  }

  destroy() {
    events.off(EVENTS.WEBGL_BEFORE_RENDER, this.#update);
    d.render = undefined;
    d.camera = this.#previousCamera as typeof d.camera;
    const gl = d.gl;
    gl.toneMapping = this.#previousTone;
    gl.localClippingEnabled = false;
    gl.info.autoReset = true;
    d.scene.environment = null;
    d.scene.fog = null;
    this.#slots.forEach((slot) => {
      if (slot.video) {
        slot.video.pause();
        slot.video.replaceChildren();
        slot.video.load();
      }
      slot.screen?.map?.dispose();
      slot.screen?.dispose();
      slot.monolith.materials.forEach((m) => m.dispose());
    });
    this.#xray.dispose();
    Object.values(this.#geo).forEach((g) => g.dispose());
    this.#gold.dispose();
    this.#floor.geometry.dispose();
    (this.#floor.material as Material).dispose();
    this.#env.dispose();
    this.#composer?.dispose();
    s.ready = false;
  }
}
