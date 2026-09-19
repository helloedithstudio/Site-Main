// The Nuxt `$scroll` plugin: Lenis smooth scroll driven by the GSAP ticker.
// Mouse devices scroll the window; touch devices scroll the fixed
// [data-mobile-scroll] wrapper (syncTouch) — exactly like the original.

import Lenis from "lenis";
import { gsap, ScrollTrigger } from "./gsap";
import { EVENTS, EventBus } from "./events";
import type { Resize } from "./resize";

export type Scroll = {
  to: (target?: number | string | Node, duration?: number, easing?: (t: number) => number) => void;
  readonly lenis: Lenis;
  reset: () => void;
  stop: () => void;
  start: () => void;
  readonly y: number;
  /** True while a scroll started by `to()` is still animating (edith addition, see Pager.snap). */
  readonly navigating: boolean;
};

const expoInOut = (t: number) =>
  t === 0 ? 0 : t === 1 ? 1 : t < 0.5 ? Math.pow(2, 20 * t - 10) / 2 : (2 - Math.pow(2, -20 * t + 10)) / 2;

export function createScroll(resize: Resize, events: EventBus): Scroll {
  let lenis: Lenis | null = null;
  let tick: ((time: number) => void) | null = null;
  let initialised = false;
  // end time of the current programmatic scroll; the pager must not snap while one is in flight
  let navigatingUntil = 0;

  const to: Scroll["to"] = (target = 0, duration = 1, easing) => {
    // A pinned section (the loop carousel) is wrapped in a GSAP `.pin-spacer`. Once the page has scrolled
    // past the pin, the section itself sits at the END of its pin distance, so measure the wrapper, whose
    // top edge is always the section's natural start. (Edith change: the original measured the section.)
    const anchorOf = (el: Element) =>
      el.parentElement?.classList.contains("pin-spacer") ? el.parentElement : el;
    let y = 0;
    if (typeof target === "number") y = target;
    else if (typeof target === "string") {
      const el = document.querySelector(target.startsWith("#") ? target : `#${target}`);
      if (el) y = anchorOf(el).getBoundingClientRect().top + lenis!.scroll;
      else console.error("Target is a string but no element was found");
    } else if (target instanceof Node) {
      y = anchorOf(target as Element).getBoundingClientRect().top + lenis!.scroll;
    } else console.error("Target is neither a number, a string, nor a node");
    navigatingUntil = performance.now() + duration * 1000 + 120;
    lenis!.scrollTo(y, { duration, easing: easing ?? expoInOut });
  };

  const destroy = () => {
    if (tick) gsap.ticker.remove(tick);
    tick = null;
    lenis?.destroy();
    lenis = null;
  };

  const init = () => {
    const wrapper = resize.mouse ? undefined : document.querySelector<HTMLElement>("[data-mobile-scroll]") ?? undefined;
    const content = resize.mouse
      ? undefined
      : document.querySelector<HTMLElement>("[data-mobile-scroll-content]") ?? undefined;

    ScrollTrigger.defaults({ scroller: wrapper ?? window });

    lenis = new Lenis({
      lerp: 0.15,
      wheelMultiplier: 1.25,
      autoResize: false,
      ...(wrapper && {
        wrapper,
        content,
        syncTouch: true,
        touchInertiaExponent: 1.9,
        syncTouchLerp: 0.05,
      }),
    });

    lenis.on("scroll", ({ scroll }: Lenis) => {
      ScrollTrigger.update();
      events.emit(EVENTS.APP_SCROLL, { y: scroll, direction: lenis!.direction });
    });

    tick = (time: number) => {
      lenis!.raf(time * 1000);
      events.emit(EVENTS.APP_TICK, {
        y: lenis!.scroll,
        time,
        ratio: gsap.ticker.deltaRatio(60),
        still: !lenis!.isScrolling,
      });
    };
    gsap.ticker.add(tick);
    gsap.ticker.lagSmoothing(0);

    if (wrapper && !initialised) {
      const reset = () => {
        wrapper.scrollTop = 0;
        lenis!.scrollTo(0, { immediate: true, force: true });
      };
      reset();
      if (document.readyState === "complete") requestAnimationFrame(reset);
      else window.addEventListener("load", () => requestAnimationFrame(reset), { once: true });
    }
    initialised = true;
  };

  init();

  resize.onMouseChange(() => {
    destroy();
    init();
    ScrollTrigger.refresh();
  });

  resize.add(() => {
    ScrollTrigger.refresh();
    lenis!.resize();
  });

  return {
    to,
    get lenis() {
      return lenis!;
    },
    reset: () => {
      lenis!.scrollTo(0, { immediate: true });
    },
    stop: () => {
      lenis!.stop();
    },
    start: () => {
      lenis!.start();
    },
    get navigating() {
      return performance.now() < navigatingUntil;
    },
    get y() {
      return lenis!.scroll;
    },
  };
}
