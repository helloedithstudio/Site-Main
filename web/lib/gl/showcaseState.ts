// What the Showcase page tells its 3D scene, and what the scene reports back. The page writes chapter and scroll
// progress (0 to 1) as the visitor scrolls; the scene reads them every frame and eases towards them, so the 3D is always
// exactly as far along as the page. Plain data, no three.js, so the page can import it without the engine.

export type ShowcaseChapter = "ignition" | "hall" | "closer" | "xray" | "resolve";

export type ShowcaseExhibit = { slug: string; live: boolean; video?: { webm?: string; mp4?: string }; poster?: string };

type Listener = () => void;

const readyListeners = new Set<Listener>();
const shownBy = new Map<string, boolean>();

export const showcaseState = {
  chapter: "ignition" as ShowcaseChapter,
  /** Chapter before the closer look opened, to return to. */
  previous: "hall" as ShowcaseChapter,
  /** Whether any part of the live scene is on screen. When false (a film or an opaque section covers it) the scene skips drawing. */
  visible: false,
  /** Progress through the hall, 0 at the first exhibit and 1 at the last slot. */
  hall: 0,
  xray: 0,
  resolve: 0,
  /** The exhibit open in "Take a closer look", or -1. */
  closer: -1,
  /** Turn applied by dragging in the closer look, in radians. */
  turn: { x: 0, y: 0 },
  /** Phones and portrait tablets use the portrait cameras. */
  portrait: false,
  exhibits: [] as ShowcaseExhibit[],
  reserved: 0,
  tier: "high" as "high" | "mid",
  /** Filled in by the scene every frame, for the "Under the hood" readouts. */
  info: { triangles: 0, calls: 0, gpu: "" },
  ready: false,
  readyAt: 0,
  /** When the page mounted (performance.now()), so "loaded in" measures this page even after moving here from another. */
  mountedAt: 0,
  /** A chapter says whether it currently shows the live scene; the scene draws while any of them does. */
  show(key: string, on: boolean) {
    shownBy.set(key, on);
    showcaseState.visible = [...shownBy.values()].some(Boolean);
  },
  onReady(cb: Listener) {
    if (showcaseState.ready) cb();
    else readyListeners.add(cb);
    return () => readyListeners.delete(cb);
  },
  markReady() {
    if (showcaseState.ready) return;
    showcaseState.ready = true;
    showcaseState.readyAt = performance.now();
    readyListeners.forEach((cb) => cb());
    readyListeners.clear();
  },
  reset() {
    shownBy.clear();
    showcaseState.ready = false;
    showcaseState.readyAt = 0;
    showcaseState.visible = false;
    showcaseState.chapter = "ignition";
    showcaseState.closer = -1;
    showcaseState.hall = showcaseState.xray = showcaseState.resolve = 0;
  },
};

/**
 * Where the hall camera rests for a given progress: at each monolith for the middle half of its share of the scroll,
 * gliding between them for the rest. Shared by the page (which plaque is showing) and the scene (where the camera is).
 */
export function hallPosition(progress: number, slots: number): number {
  if (slots <= 1) return 0;
  const t = Math.min(1, Math.max(0, progress)) * (slots - 1);
  const i = Math.min(slots - 2, Math.floor(t));
  const f = t - i;
  const e = f < 0.22 ? 0 : f > 0.78 ? 1 : ((u) => u * u * (3 - 2 * u))((f - 0.22) / 0.56);
  return i + e;
}
