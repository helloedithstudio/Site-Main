"use client";

// Drag carousel of the media section: pointer drag with a lerped track, snap to the
// nearest card on release, tap-through navigation via [data-url], prev/next API.

import { forwardRef, useEffect, useImperativeHandle, useRef, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { gsap, ScrollTrigger } from "@/lib/runtime/gsap";
import { getRuntime, events, EVENTS } from "@/lib/runtime";
import type { TickEvent } from "@/lib/runtime/events";
import { isExternal } from "@/lib/links";

export type DragCarouselHandle = { next: () => void; previous: () => void };

type Slot = { el: HTMLElement; start: number; end: number; out: boolean; width: number };
type Point = { x: number; y: number };

const lerp = (a: number, b: number, t: number) => a * (1 - t) + b * t;
const rect = (el: Element) => el.getBoundingClientRect();

const DragCarousel = forwardRef<DragCarouselHandle, { className?: string; children: ReactNode }>(
  function DragCarousel({ className, children }, ref) {
    const el = useRef<HTMLDivElement>(null);
    const [down, setDown] = useState(false);
    const router = useRouter();
    const routerRef = useRef(router);
    routerRef.current = router;
    const api = useRef<DragCarouselHandle>({ next: () => {}, previous: () => {} });

    useImperativeHandle(ref, () => ({
      next: () => api.current.next(),
      previous: () => api.current.previous(),
    }));

    useEffect(() => {
      const root = el.current!;
      const { resize } = getRuntime();
      const touch = !resize.mouse;

      let speed = 2;
      let startOffset = 0;
      let startX = 0;
      let startY = 0;
      let downX = 0;
      let target = 0;
      let current = 0;
      let max = 0;
      let gutter = 0;
      let index = 0;
      let isDown = false;
      let measuring = false;
      let inView = false;
      let cache: Slot[] = [];
      let snaps: number[] = [];
      let progress: HTMLElement | null = null;

      const setTransform = (slide: HTMLElement, x = current) => {
        slide.style.transform = `translate3d(${-x}px, 0, 0)`;
      };
      const inRange = (start: number, end: number, x = current) => x > start && x < end;

      const render = () => {
        cache.forEach((slot) => {
          if (inRange(slot.start, slot.end) || measuring) {
            if (slot.out) slot.out = false;
            setTransform(slot.el);
          } else if (!slot.out) {
            slot.out = true;
            setTransform(slot.el);
          }
        });
        if (progress) progress.style.transform = `scaleX(${gsap.utils.wrap(0, 1, current / max)})`;
      };

      const bounds = (last: HTMLElement, right: number, offset: number) => {
        gutter = parseInt(getComputedStyle(last).getPropertyValue("margin-right"));
        max = Math.max(0, right - resize.ww + offset);
      };

      const measure = () => {
        measuring = true;
        if (!progress) progress = root.querySelector<HTMLElement>(".js-progress");
        const slides = [...root.querySelectorAll<HTMLElement>(".js-slide")];
        if (!slides.length) return;
        const track = root.querySelector(".js-slides")!;
        const trackRect = rect(track);
        const rootRect = rect(root);
        const lastIndex = slides.length - 1;
        const offset = trackRect.left - rootRect.left;
        speed = resize.small ? 3.5 : 2;
        snaps = [];
        cache = slides.map((slide, i) => {
          slide.style.transform = "translate3d(0, 0, 0)";
          const { left, right, width } = rect(slide);
          snaps.push(left - trackRect.left);
          if (i === lastIndex) bounds(slide, right, offset);
          return { el: slide, start: left - rootRect.width, end: right, out: true, width };
        });
        render();
        queueMicrotask(() => (measuring = false)); // Vue's nextTick
      };

      const point = (e: MouseEvent | TouchEvent): Point => {
        const t = (e as TouchEvent).changedTouches?.[0];
        return t ? { x: t.clientX, y: t.clientY } : { x: (e as MouseEvent).clientX, y: (e as MouseEvent).clientY };
      };
      const clampTarget = () => {
        target = Math.min(Math.max(target, 0), max);
      };
      const snap = () => {
        const wrapped = gsap.utils.wrap(0, max, target);
        const snapped = gsap.utils.snap(snaps, wrapped) as number;
        target += snapped - wrapped;
        index = snaps.indexOf(snapped);
        clampTarget();
      };

      const onDown = (e: Event) => {
        const { x, y } = point(e as MouseEvent);
        isDown = true;
        setDown(true);
        startX = x;
        startY = y;
        downX = x;
        startOffset = target + x * speed;
        clampTarget();
      };
      const onMove = (e: Event) => {
        if (!isDown) return;
        const { x, y } = point(e as MouseEvent);
        if (Math.abs(x - startX) > Math.abs(y - startY) && e.cancelable) {
          e.preventDefault();
          e.stopPropagation();
        }
        target = startOffset - x * speed;
        clampTarget();
      };
      const onUp = (e: Event) => {
        if (!isDown) return;
        isDown = false;
        setDown(false);
        const { x } = point(e as MouseEvent);
        if (Math.abs(x - downX) < 10) {
          const t = e.target as Element;
          if (t.closest("button")) return;
          const link = t.closest<HTMLElement>("[data-url]");
          if (link && link.dataset.url) {
            const url = link.dataset.url;
            if (isExternal(url)) window.open(url, "_blank", "noopener,noreferrer");
            else routerRef.current.push(url);
          }
        } else snap();
      };
      const onTick = ({ ratio }: TickEvent) => {
        if (!inView) return;
        current = lerp(current, target, 0.1 * ratio);
        current = Math.round(current * 100) / 100;
        if (!measuring) render();
      };

      api.current = {
        next: () => {
          const slot = cache[index];
          if (!slot) return;
          target += slot.width + gutter;
          index = gsap.utils.wrap(0, cache.length, index + 1);
          clampTarget();
        },
        previous: () => {
          const slot = cache[index];
          if (!slot) return;
          target -= slot.width + gutter;
          index = gsap.utils.wrap(0, cache.length, index - 1);
          clampTarget();
        },
      };

      const names = {
        move: touch ? "touchmove" : "mousemove",
        down: touch ? "touchstart" : "mousedown",
        up: touch ? "touchend" : "mouseup",
      };

      const trigger = ScrollTrigger.create({ trigger: root, onToggle: ({ isActive }) => (inView = isActive) });
      root.addEventListener(names.down, onDown);
      root.addEventListener(names.move, onMove);
      window.addEventListener(names.up, onUp);
      resize.add(measure);
      events.on(EVENTS.APP_TICK, onTick);

      return () => {
        root.removeEventListener(names.down, onDown);
        root.removeEventListener(names.move, onMove);
        window.removeEventListener(names.up, onUp);
        resize.remove(measure);
        events.off(EVENTS.APP_TICK, onTick);
        trigger.kill();
      };
    }, []);

    return (
      <div ref={el} className={`select-none cursor-grab${down ? " is-active" : ""}${className ? ` ${className}` : ""}`}>
        {children}
      </div>
    );
  },
);

export default DragCarousel;
