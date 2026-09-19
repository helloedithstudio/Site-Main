// The Nuxt `$resize` plugin: viewport size + breakpoint/capability flags,
// debounced ResizeObserver, and the `--vh-c` / `--vh-e` custom properties on touch.

import { debounce } from "./timing";
import { EVENTS, EventBus } from "./events";

export type ResizeCallback = (ww: number, wh: number, small: boolean, landscape: boolean) => void;

export type Resize = {
  add: (cb: ResizeCallback) => void;
  remove: (cb: ResizeCallback) => void;
  readonly ww: number;
  readonly wh: number;
  readonly small: boolean;
  readonly medium: boolean;
  readonly mouse: boolean;
  readonly landscape: boolean;
  /** internal: listeners for capability changes (used by the scroll service) */
  onMouseChange: (cb: (mouse: boolean) => void) => void;
  /** internal: the `app:mounted` hook of the original plugin */
  mounted: () => void;
};

const mq = (q: string) => window.matchMedia(q).matches;

export function createResize(events: EventBus): Resize {
  const callbacks = new Set<ResizeCallback>();
  const mouseWatchers = new Set<(mouse: boolean) => void>();

  let ww = document.documentElement.clientWidth;
  let wh = document.documentElement.clientHeight;
  let small = mq("(max-width: 649px)");
  let medium = mq("(max-width: 1100px)");
  let mouse = mq("(hover: hover) and (pointer: fine)");
  let landscape = mq("(orientation: landscape)");

  const setVh = () => {
    const root = document.documentElement;
    root.style.setProperty("--vh-c", `${(wh || window.innerHeight) / 100}px`);
    root.style.setProperty(
      "--vh-e",
      `${(window.screen.availHeight || screen.height || root.clientHeight || wh || window.innerHeight) / 100}px`,
    );
  };

  const update = debounce(() => {
    ww = document.documentElement.clientWidth;
    wh = document.documentElement.clientHeight;
    small = mq("(max-width: 649px)");
    medium = mq("(max-width: 1100px)");
    const nextMouse = mq("(hover: hover) and (pointer: fine)");
    landscape = mq("(orientation: landscape)");
    if (nextMouse !== mouse) {
      mouse = nextMouse;
      mouseWatchers.forEach((cb) => cb(mouse));
    }
    callbacks.forEach((cb) => cb(ww, wh, small, landscape));
    events.emit(EVENTS.APP_RESIZE, { ww, wh, small, landscape });
  }, 50);

  const observer = new ResizeObserver(update);
  observer.observe(document.documentElement);
  const content = document.querySelector("[data-mobile-scroll-content]");
  if (content) observer.observe(content);
  update();

  let orientationObserver: ResizeObserver | null = null;

  return {
    add(cb) {
      callbacks.add(cb);
      cb(ww, wh, small, landscape);
    },
    remove(cb) {
      callbacks.delete(cb);
    },
    get ww() {
      return ww;
    },
    get wh() {
      return wh;
    },
    get small() {
      return small;
    },
    get medium() {
      return medium;
    },
    get mouse() {
      return mouse;
    },
    get landscape() {
      return landscape;
    },
    onMouseChange(cb) {
      mouseWatchers.add(cb);
    },
    mounted() {
      if (mouse || orientationObserver) return;
      setVh();
      let wasLandscape = landscape;
      orientationObserver = new ResizeObserver(() => {
        const next = mq("(orientation: landscape)");
        if (next !== wasLandscape) {
          wasLandscape = next;
          setTimeout(setVh, 100);
        }
      });
      orientationObserver.observe(document.documentElement);
    },
  };
}
