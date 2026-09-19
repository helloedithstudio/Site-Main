"use client";

// Vault-slide pager. Three behaviours, picked from the viewport exactly like the original:
//  • "deck"  (small screens)  — cards stack and are scrubbed by a pinned ScrollTrigger
//  • "scrub" (mouse devices)  — the section pins and scrolling steps through the cards
//  • "pager" (touch, ≥650px)  — drag / tap / arrows with GSAP easing
// Card positions are mirrored into glState.helpers.uniswap for the WebGL boxes.

import { forwardRef, useEffect, useImperativeHandle, useRef, useState, type ReactNode } from "react";
import { DragGesture } from "@use-gesture/vanilla";
import { gsap, ScrollTrigger } from "@/lib/runtime/gsap";
import { getRuntime, events, EVENTS } from "@/lib/runtime";
import type { TickEvent } from "@/lib/runtime/events";
import { glState } from "@/lib/gl/state";

const DRAG_THRESHOLD = 0.5;
const DRAG_LERP = 0.14;
const SCRUB_VH_PER_CARD = 1.35;
const SNAP_DEBOUNCE = 150;
const SNAP_DURATION = 1;
const SNAP_EASE = "snappy";
const TAIL_VH = 0.5;
const DECK_MAX = 4;
const DECK_SCALE_STEP = 0.04;
const DECK_OFFSET_REM = 4.4;
const DECK_VH_PER_CARD = 1.5;
const DECK_EASE = "power2.out";
const DECK_COPY_FADE = 0.35;

export type PagerHandle = {
  index: () => number;
  n: () => number;
  goTo: (i: number, snappy?: boolean) => void;
  next: () => void;
  previous: () => void;
  scrollToCard: (i: number) => void;
  scrubLength: () => number;
  deckLength: () => number;
};

type Options = {
  gap: number;
  disabled: () => boolean;
  pin: () => HTMLElement | null;
  anchor: () => HTMLElement | null;
  onChange: (i: number) => void;
  setDragging: (v: boolean) => void;
  setCount: (v: number) => void;
  setScrubbing: (v: boolean) => void;
};

const clamp = (v: number, min: number, max: number) => Math.min(Math.max(v, min), max);
const $$ = (sel: string, root: ParentNode) => [...root.querySelectorAll<HTMLElement>(sel)];

class PagerController {
  el: HTMLElement;
  o: Options;
  index = 0;
  count = 0;
  dragging = false;
  pos = { current: 0 };
  slides: HTMLElement[] = [];
  copies: HTMLElement[][] = [];
  step = 0;
  posAtMeasure = 0;
  dragTarget = 0;
  tween: gsap.core.Tween | null = null;
  gesture: DragGesture | null = null;
  deck: ScrollTrigger | null = null;
  lastEmitted = 0;
  scrub: ScrollTrigger | null = null;
  snapTimer: ReturnType<typeof setTimeout> | undefined;
  savedIndex = -1;
  transforms = new WeakMap<HTMLElement, string>();

  constructor(el: HTMLElement, options: Options) {
    this.el = el;
    this.o = options;
  }

  get rt() {
    return getRuntime();
  }

  mode() {
    const { resize } = this.rt;
    return resize.small ? "deck" : resize.mouse ? "scrub" : "pager";
  }

  setTransform(el: HTMLElement, value: string) {
    if (this.transforms.get(el) !== value) {
      this.transforms.set(el, value);
      el.style.transform = value;
    }
  }

  apply = () => {
    this.slides.forEach((slide, i) => {
      this.setTransform(slide, `translate3d(${((i - this.pos.current) * this.step).toFixed(2)}px, 0px, 0px)`);
    });
    this.publish();
  };

  publish() {
    const u = glState.helpers.uniswap;
    u.pos = this.pos.current;
    u.step = this.step;
    u.posAtMeasure = this.posAtMeasure;
  }

  setIndex(i: number) {
    this.index = i;
  }

  animateTo(target: number, snappy = false) {
    const i = clamp(Math.round(target), 0, this.count - 1);
    if (i !== this.index) this.o.onChange(i);
    this.setIndex(i);
    this.lastEmitted = i;
    glState.helpers.uniswap.index = i;
    this.tween?.kill();
    this.tween = gsap.to(this.pos, {
      current: i,
      duration: snappy ? 0.9 : 1,
      ease: snappy ? "snappy" : "expo.out",
      onUpdate: this.apply,
      overwrite: "auto",
    });
  }

  goTo = (target: number, snappy = false) => {
    if (this.o.disabled() || !this.step) return;
    if (this.scrub) {
      this.scrollToCard(target);
      return;
    }
    this.animateTo(target, snappy);
  };

  next = () => this.goTo(this.index + 1, true);
  previous = () => this.goTo(this.index - 1, true);

  scrollToCard = (target: number) => {
    const i = clamp(Math.round(target), 0, this.count - 1);
    const { scroll } = this.rt;
    if (this.scrub) {
      scroll.to(this.scrub.start + i * this.scrubCard(), SNAP_DURATION, gsap.parseEase(SNAP_EASE));
      return;
    }
    if (!this.deck) {
      this.goTo(target, true);
      return;
    }
    scroll.to(this.deck.start + i * window.innerHeight, 0.9);
  };

  measure() {
    this.slides = $$(".js-slide", this.el);
    this.copies = this.slides.map((s) => $$(".js-slide-copy, .js-slide-fade", s));
    this.count = this.slides.length;
    this.o.setCount(this.count);
    const first = this.slides[0];
    if (!first) return;
    if (this.rt.resize.small) {
      this.step = 0;
      this.publish();
      return;
    }
    const rem = parseFloat(getComputedStyle(document.documentElement).fontSize);
    this.step = first.offsetWidth + this.o.gap * rem;
    this.posAtMeasure = this.pos.current;
    this.apply();
  }

  // ---- deck (small screens) ----
  deckProgress(p: number) {
    glState.helpers.uniswap.deckP = p;
    const rem = parseFloat(getComputedStyle(document.documentElement).fontSize);
    const offset = DECK_OFFSET_REM * rem;
    const enterFrom = (window.innerHeight + (this.el.offsetHeight ?? 0)) / 2 + 40;
    const ease = gsap.parseEase(DECK_EASE);
    this.slides.forEach((slide, j) => {
      const incoming = j === 0 ? 1 : p - (j - 1);
      if (incoming < 1) {
        const e = ease(clamp(incoming, 0, 1));
        this.setTransform(slide, `translate3d(0, ${((1 - e) * enterFrom).toFixed(2)}px, 0) scale(1)`);
        slide.style.visibility = incoming <= 0 ? "hidden" : "";
        slide.style.opacity = "";
        this.copies[j].forEach((c) => (c.style.opacity = ""));
        return;
      }
      const depth = clamp(p - j, 0, DECK_MAX + 1);
      this.setTransform(
        slide,
        `translate3d(0, ${(-depth * offset).toFixed(2)}px, 0) scale(${(1 - depth * DECK_SCALE_STEP).toFixed(4)})`,
      );
      slide.style.visibility = depth > DECK_MAX + 0.5 ? "hidden" : "";
      slide.style.opacity = depth > DECK_MAX ? String(clamp(1 - (depth - DECK_MAX) / 0.5, 0, 1)) : "";
      const copyOpacity = depth > 0.001 ? String(clamp(1 - depth / DECK_COPY_FADE, 0, 1)) : "";
      this.copies[j].forEach((c) => (c.style.opacity = copyOpacity));
    });
    const i = clamp(Math.round(p), 0, this.count - 1);
    if (i !== this.lastEmitted) {
      this.lastEmitted = i;
      glState.helpers.uniswap.index = i;
      this.o.onChange(i);
    }
  }

  deckCard = () => window.innerHeight * DECK_VH_PER_CARD;
  deckTrack = () => (this.count - 1) * this.deckCard();
  deckTail = () => window.innerHeight * TAIL_VH;
  deckMap = (progress: number) => clamp((progress * (this.deckTrack() + this.deckTail())) / this.deckCard(), 0, this.count - 1);

  createDeck() {
    this.killDeck();
    if (this.count < 2) return;
    this.deck = ScrollTrigger.create({
      trigger: this.el,
      start: "center center",
      end: () => "+=" + (this.deckTrack() + this.deckTail()),
      pin: this.el,
      pinSpacing: true,
      pinType: "fixed",
      invalidateOnRefresh: true,
      refreshPriority: 1,
      onRefresh: (st) => this.deckProgress(this.deckMap(st.progress)),
      onUpdate: (st) => this.deckProgress(this.deckMap(st.progress)),
    });
    this.deckProgress(this.deckMap(this.deck.progress));
  }

  deckLength = () => (this.mode() === "deck" ? this.deckTrack() + this.deckTail() : 0);

  killDeck() {
    if (!this.deck) return;
    this.deck.kill();
    this.deck = null;
    glState.helpers.uniswap.deckP = 0;
    this.slides.forEach((slide, j) => {
      this.setTransform(slide, "");
      slide.style.visibility = "";
      slide.style.opacity = "";
      this.copies[j].forEach((c) => (c.style.opacity = ""));
    });
  }

  // ---- scrub (mouse) ----
  scrubCard = () => window.innerHeight * SCRUB_VH_PER_CARD;
  scrubTrack = () => (this.count - 1) * this.scrubCard();
  scrubTail = () => window.innerHeight * TAIL_VH;
  scrubLength = () => (this.mode() === "scrub" ? this.scrubTrack() + this.scrubTail() : 0);
  scrubMap = (progress: number) =>
    clamp((progress * (this.scrubTrack() + this.scrubTail())) / this.scrubCard(), 0, this.count - 1);

  setScrubIndex(target: number) {
    const i = clamp(target, 0, this.count - 1);
    if (i !== this.index) {
      this.setIndex(i);
      this.lastEmitted = i;
      glState.helpers.uniswap.index = i;
      this.o.onChange(i);
    }
  }

  followScrub(target: number) {
    const i = clamp(Math.round(target), 0, this.count - 1);
    if (i !== this.index) this.animateTo(i, true);
  }

  jumpScrub(target: number) {
    const i = clamp(Math.round(target), 0, this.count - 1);
    this.tween?.kill();
    this.pos.current = i;
    this.setScrubIndex(i);
    this.apply();
  }

  snap = () => {
    if (!this.scrub) return;
    // A nav link or arrow is already scrolling somewhere; on a slow frame the debounce can fire mid-flight
    // and hijack it onto a card. (edith fix: the original snapped regardless.)
    if (this.rt.scroll.navigating) return;
    const p = this.scrubMap(this.scrub.progress);
    if (this.scrub.progress * (this.scrubTrack() + this.scrubTail()) > this.scrubTrack()) return;
    const i = Math.round(p);
    if (Math.abs(p - i) < 0.01) return;
    this.scrollToCard(i);
  };

  scheduleSnap() {
    clearTimeout(this.snapTimer);
    this.snapTimer = setTimeout(this.snap, SNAP_DEBOUNCE);
  }

  createScrub() {
    if (this.scrub || this.count < 2) return;
    this.scrub = ScrollTrigger.create({
      trigger: this.o.anchor() ?? this.o.pin() ?? this.el,
      pin: this.o.pin() ?? this.el,
      start: "center center",
      end: () => "+=" + (this.scrubTrack() + this.scrubTail()),
      pinSpacing: true,
      scroller: window,
      refreshPriority: 1,
      invalidateOnRefresh: true,
      onRefresh: (st) => this.jumpScrub(this.scrubMap(st.progress)),
      onUpdate: (st) => {
        this.followScrub(this.scrubMap(st.progress));
        this.scheduleSnap();
      },
    });
    this.o.setScrubbing(true);
    this.jumpScrub(this.scrubMap(this.scrub.progress));
  }

  onRefreshInit = () => {
    const y = this.rt.scroll.y;
    this.savedIndex = this.scrub && y >= this.scrub.start && y <= this.scrub.end ? this.index : -1;
  };

  onRefresh = () => {
    if (this.savedIndex < 0 || !this.scrub) {
      this.savedIndex = -1;
      return;
    }
    const i = this.savedIndex;
    this.savedIndex = -1;
    this.rt.scroll.lenis?.scrollTo(this.scrub.start + i * this.scrubCard(), { immediate: true, force: true });
  };

  killScrub() {
    clearTimeout(this.snapTimer);
    if (this.scrub) {
      this.scrub.kill();
      this.scrub = null;
      this.o.setScrubbing(false);
      this.pos.current = this.index;
    }
  }

  // ---- drag (pager) ----
  onTick = ({ ratio }: TickEvent) => {
    if (!this.dragging) return;
    this.pos.current += (this.dragTarget - this.pos.current) * Math.min(1, DRAG_LERP * ratio);
    this.apply();
  };

  setDragging(v: boolean) {
    this.dragging = v;
    this.o.setDragging(v);
  }

  tapTarget(target: EventTarget | null) {
    const slide = (target as Element | null)?.closest?.(".js-slide") as HTMLElement | null;
    return slide ? this.slides.indexOf(slide) - this.index : 0;
  }

  onDrag = ({
    active,
    movement: [mx, my],
    event,
    cancel,
    canceled,
  }: {
    active: boolean;
    movement: [number, number];
    event: Event;
    cancel: () => void;
    canceled: boolean;
  }) => {
    if (canceled || this.o.disabled() || !this.step) return;
    if (this.scrub) {
      if (!active && Math.abs(mx) < 10 && Math.abs(my) < 10) {
        const d = this.tapTarget(event.target);
        if (d) this.scrollToCard(this.index + d);
      }
      return;
    }
    if (active && Math.abs(mx) > this.step * DRAG_THRESHOLD) {
      this.setDragging(false);
      this.goTo(this.index + (mx < 0 ? 1 : -1));
      cancel();
      return;
    }
    if (active) {
      this.setDragging(true);
      this.tween?.kill();
      this.dragTarget = clamp(
        this.index - mx / this.step,
        clamp(this.index - 1, 0, this.count - 1),
        clamp(this.index + 1, 0, this.count - 1),
      );
      return;
    }
    this.setDragging(false);
    if (Math.abs(mx) < 10 && Math.abs(my) < 10) {
      const d = this.tapTarget(event.target);
      if (d) {
        this.goTo(this.index + d, true);
        return;
      }
    }
    this.goTo(this.index);
  };

  // ---- lifecycle ----
  layout = () => {
    this.measure();
    const m = this.mode();
    if (m !== "deck") this.killDeck();
    if (m !== "scrub") this.killScrub();
    if (m === "deck") {
      this.tween?.kill();
      this.pos.current = 0;
      this.createDeck();
      return;
    }
    if (m === "scrub") {
      this.tween?.kill();
      this.createScrub();
      return;
    }
    this.apply();
    if (this.lastEmitted !== this.index) {
      this.lastEmitted = this.index;
      this.o.onChange(this.index);
    }
    glState.helpers.uniswap.index = this.index;
  };

  mount() {
    this.layout();
    if (this.count > 1) {
      this.gesture = new DragGesture(this.el, this.onDrag as never, { pointer: { capture: true }, filterTaps: false });
    }
    this.rt.resize.add(this.layout);
    events.on(EVENTS.APP_TICK, this.onTick);
    ScrollTrigger.addEventListener("refreshInit", this.onRefreshInit);
    ScrollTrigger.addEventListener("refresh", this.onRefresh);
  }

  destroy() {
    this.tween?.kill();
    this.gesture?.destroy();
    this.killDeck();
    this.killScrub();
    this.rt.resize.remove(this.layout);
    events.off(EVENTS.APP_TICK, this.onTick);
    ScrollTrigger.removeEventListener("refreshInit", this.onRefreshInit);
    ScrollTrigger.removeEventListener("refresh", this.onRefresh);
  }
}

type Props = {
  gap?: number;
  disabled?: boolean;
  pin?: () => HTMLElement | null;
  anchor?: () => HTMLElement | null;
  onChange?: (i: number) => void;
  className?: string;
  children: ReactNode;
};

const Pager = forwardRef<PagerHandle, Props>(function Pager(
  { gap = 35, disabled = false, pin, anchor, onChange, className, children },
  ref,
) {
  const el = useRef<HTMLDivElement>(null);
  const controller = useRef<PagerController | null>(null);
  const [dragging, setDragging] = useState(false);
  const [count, setCount] = useState(0);
  const [scrubbing, setScrubbing] = useState(false);
  const latest = useRef({ disabled, pin, anchor, onChange });
  latest.current = { disabled, pin, anchor, onChange };

  useImperativeHandle(ref, () => ({
    index: () => controller.current?.index ?? 0,
    n: () => controller.current?.count ?? 0,
    goTo: (i, s) => controller.current?.goTo(i, s),
    next: () => controller.current?.next(),
    previous: () => controller.current?.previous(),
    scrollToCard: (i) => controller.current?.scrollToCard(i),
    scrubLength: () => controller.current?.scrubLength() ?? 0,
    deckLength: () => controller.current?.deckLength() ?? 0,
  }));

  useEffect(() => {
    const c = new PagerController(el.current!, {
      gap,
      disabled: () => latest.current.disabled,
      pin: () => latest.current.pin?.() ?? null,
      anchor: () => latest.current.anchor?.() ?? null,
      onChange: (i) => latest.current.onChange?.(i),
      setDragging,
      setCount,
      setScrubbing,
    });
    controller.current = c;
    c.mount();
    return () => {
      c.destroy();
      controller.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const cursor = count > 1 && !disabled && !scrubbing ? (dragging ? "cursor-grabbing" : "cursor-grab") : "";
  const classes = ["select-none touch-pan-y", cursor, className].filter(Boolean).join(" ");

  return (
    <div ref={el} className={classes} onDragStart={(e) => e.preventDefault()}>
      <div className="js-slides stack s:h-full">{children}</div>
    </div>
  );
});

export default Pager;
