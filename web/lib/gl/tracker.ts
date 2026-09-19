// DOM → WebGL tracking. A Tracker is a Group positioned (and optionally scaled) to
// match a DOM element in pixel-space world units, compensating document scroll;
// `sticky` mirrors a CSS-sticky range, `live` re-measures every frame.

import { Group, MathUtils } from "three";
import { glState as d } from "./state";

type StickyInput = string | { container: string; top?: number; start?: string | (() => string); end?: string | (() => string) };
type Sticky = { container: string; start: string | (() => string); end?: string | (() => string) };

export type TrackerOptions = {
  tracker: string | HTMLElement;
  preventUpdatePosition?: boolean;
  preventUpdateScale?: boolean;
  live?: boolean;
  sticky?: StickyInput | false;
};

const STICKY_DEFAULTS = { start: "top top", end: "bottom bottom" };

function anchor(r: DOMRect, where: string) {
  return where === "center" ? r.top + r.height * 0.5 : (r as unknown as Record<string, number>)[where];
}

function viewportOffset(position: string, vh: number) {
  const m = position.match(/^(top|center|bottom)(([+-])=)?(\d*\.?\d+)?(%)?$/);
  if (!m) throw new Error(`Invalid scroll position: ${position}`);
  const [, edge, , sign, amount, percent] = m;
  let y = edge === "top" ? 0 : edge === "center" ? vh * 0.5 : vh;
  if (sign && amount) {
    const n = parseFloat(amount);
    const px = percent ? vh * (n / 100) : n;
    y = sign === "+" ? y + px : y - px;
  }
  return y;
}

function scrollPosition(el: Element, spec: string, scroll: number, vh: number) {
  const [elementEdge, viewportEdge] = spec.trim().split(/\s+/);
  const r = el.getBoundingClientRect();
  return anchor(r, elementEdge) + scroll - viewportOffset(viewportEdge, vh);
}

export class Tracker extends Group {
  #options: TrackerOptions;
  #el: HTMLElement | undefined;
  #observer: IntersectionObserver | undefined;
  #stickyEl: HTMLElement | undefined;
  #sticky: Sticky | null;
  #stickyStart = 0;
  #stickyEnd = 0;

  el: HTMLElement | undefined;
  trackPosition = { x: 0, y: 0, z: 0 };
  trackSize = { w: 0, h: 0 };
  rect = { width: 0, height: 0, left: 0, top: 0 };
  offset = { x: 0, y: 0 };
  preventUpdatePosition: boolean;
  preventUpdateScale: boolean;
  live: boolean;
  isActive = false;
  inert = false;

  constructor(options: TrackerOptions) {
    super();
    this.#options = options;
    this.#sticky = null;
    this.preventUpdatePosition = options.preventUpdatePosition ?? false;
    this.preventUpdateScale = options.preventUpdateScale ?? true;
    this.live = options.live ?? false;
    this.#init();
  }

  get sticky() {
    return this.#options.sticky ?? false;
  }

  #normaliseSticky(input: StickyInput | false | undefined): Sticky | null {
    if (!input) return null;
    const cfg = typeof input === "string" ? { container: input } : { ...input };
    const { top, start, container, end } = cfg as { top?: number; start?: string | (() => string); container?: string; end?: string | (() => string) };
    if (!container) throw new Error("Tracker sticky config requires a container selector");
    return { ...STICKY_DEFAULTS, container, end, start: start ?? (top != null ? `top top+=${top}` : STICKY_DEFAULTS.start) };
  }

  #init() {
    const target =
      typeof this.#options.tracker === "string"
        ? document.querySelector<HTMLElement>(this.#options.tracker)
        : this.#options.tracker;
    if (!target) {
      console.warn(`[GL] Tracker element not found for selector: ${this.#options.tracker} — this object is inert`);
      this.inert = true;
      this.visible = false;
      return;
    }
    this.#el = target;
    this.el = target;
    this.#sticky = this.#normaliseSticky(this.sticky);
    if (this.#sticky) this.#initSticky();
    this.#measure();
    this.#observe();
  }

  #initSticky() {
    const { container } = this.#sticky!;
    const el = document.querySelector<HTMLElement>(container);
    if (!el) {
      console.warn(`[GL] Tracker sticky container not found for selector: ${container} — sticky is off`);
      this.#sticky = null;
      return;
    }
    this.#stickyEl = el;
    setTimeout(() => this.#measure(), 500);
  }

  #value(v: string | (() => string) | undefined) {
    return typeof v === "function" ? v() : (v as string);
  }

  #measureSticky() {
    if (!this.#stickyEl) return;
    const { start, end } = this.#sticky!;
    const scroll = d.runtime.scroll.y;
    const vh = d.size.height;
    this.#stickyStart = scrollPosition(this.#stickyEl, this.#value(start), scroll, vh);
    this.#stickyEnd = scrollPosition(this.#stickyEl, this.#value(end), scroll, vh);
  }

  #stickyProgress(scroll: number) {
    const range = this.#stickyEnd - this.#stickyStart;
    return MathUtils.clamp((scroll - this.#stickyStart) / range, 0, 1);
  }

  #stickyDistance(scroll: number) {
    return this.#stickyProgress(scroll) * (this.#stickyEnd - this.#stickyStart);
  }

  #observe() {
    this.#observer = new IntersectionObserver(
      (entries) => {
        const e = entries[0];
        this.isActive = !!e && e.isIntersecting && e.intersectionRatio > 0;
      },
      { threshold: 0 },
    );
    this.#observer.observe(this.#el!);
  }

  #place() {
    const { width, height } = d.size;
    if (this.live) return this.#placeLive(width, height);
    const scroll = d.runtime.scroll.y;
    this.trackPosition.x = this.rect.left - width * 0.5 + this.rect.width * 0.5 + this.offset.x;
    let y = -(this.rect.height * 0.5) + height * 0.5 - this.rect.top + scroll - this.offset.y;
    if (this.#stickyEl) y -= this.#stickyDistance(scroll);
    this.trackPosition.y = y;
    this.trackPosition.z = 0;
    if (!this.preventUpdatePosition) this.position.set(this.trackPosition.x, this.trackPosition.y, 0);
  }

  #placeLive(width: number, height: number) {
    const { width: w, height: h, left, top } = this.#el!.getBoundingClientRect();
    this.rect.width = w;
    this.rect.height = h;
    this.rect.left = left;
    this.rect.top = top;
    this.trackSize.w = w;
    this.trackSize.h = h;
    if (!this.preventUpdateScale) this.scale.set(w, h, 1);
    this.trackPosition.x = left - width * 0.5 + w * 0.5;
    this.trackPosition.y = -(h * 0.5) + height * 0.5 - top;
    this.trackPosition.z = 0;
    if (!this.preventUpdatePosition) this.position.set(this.trackPosition.x, this.trackPosition.y, 0);
  }

  #measure() {
    const { width, height, left, top } = this.#el!.getBoundingClientRect();
    this.rect.width = width;
    this.rect.height = height;
    this.rect.left = left;
    this.rect.top = top;
    this.trackSize = { w: width, h: height };
    this.offset.y = d.runtime.scroll.y;
    if (!this.preventUpdateScale) this.scale.set(this.trackSize.w, this.trackSize.h, 1);
    this.#measureSticky();
    this.#place();
  }

  #teardown() {
    this.#stickyEl = undefined;
    if (this.#observer) {
      this.#observer.disconnect();
      this.#observer = undefined;
    }
  }

  update() {
    if (!this.inert) this.#place();
  }

  resize() {
    if (!this.inert) this.#measure();
  }

  destroy() {
    this.#teardown();
  }
}
