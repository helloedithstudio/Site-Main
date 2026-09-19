// Client runtime — the equivalent of the original Nuxt plugin chain
// (device → event → observe-vid → scroll-restoration → gsap → resize → scroll).
// Created lazily on first use inside an effect, so the SSR DOM already exists.

import { events, EVENTS, EventBus } from "./events";
import { createDevice, type Device } from "./device";
import { createResize, type Resize } from "./resize";
import { createScroll, type Scroll } from "./scroll";
import { store } from "./store";
import "./gsap";

export type Runtime = {
  events: EventBus;
  device: Device;
  resize: Resize;
  scroll: Scroll;
  store: typeof store;
  observeVid: { observe: (el: Element) => void; unobserve: (el: Element) => void };
};

let runtime: Runtime | null = null;

function manualScrollRestoration() {
  if ("scrollRestoration" in history) history.scrollRestoration = "manual";
  window.addEventListener("beforeunload", () => {
    history.scrollRestoration = "auto";
  });
  window.addEventListener("load", () => {
    history.scrollRestoration = "manual";
  });
}

function createObserveVid() {
  let io: IntersectionObserver | null = null;
  const get = () => {
    if (!io) {
      io = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            const target = entry.target as HTMLElement & { play?: () => void; pause?: () => void };
            if (entry.isIntersecting) target.play?.();
            else target.pause?.();
          });
        },
        { rootMargin: "25% 25% 25% 25%" },
      );
    }
    return io;
  };
  return {
    observe: (el: Element) => get().observe(el),
    unobserve: (el: Element) => io?.unobserve(el),
  };
}

export function getRuntime(): Runtime {
  if (runtime) return runtime;
  const device = createDevice();
  const observeVid = createObserveVid();
  manualScrollRestoration();
  const resize = createResize(events);
  const scroll = createScroll(resize, events);
  runtime = { events, device, resize, scroll, store, observeVid };
  return runtime;
}

export { events, EVENTS, store };
