"use client";

// Left-edge section index (≥1600px). Tracks the section in view, keeps the active
// label centred with a lerped translate, scroll-wheel nudges the list, click scrolls.

import { useEffect, useRef, useState } from "react";
import { getRuntime, events, EVENTS } from "@/lib/runtime";
import type { ScrollEvent, TickEvent } from "@/lib/runtime/events";

type Item = { id: string; label: string };

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const offsetTop = (el: HTMLElement | null) => {
  let top = 0;
  for (let n: HTMLElement | null = el; n; n = n.offsetParent as HTMLElement | null) top += n.offsetTop;
  return top;
};

export default function QuickMenu() {
  const [items, setItems] = useState<Item[]>([]);
  const [current, setCurrent] = useState("");
  const [active, setActive] = useState(false);
  const nav = useRef<HTMLElement>(null);
  const list = useRef<HTMLUListElement>(null);
  const wheelArea = useRef<HTMLDivElement>(null);
  const api = useRef<{ go: (id: string) => void; start: () => void }>({ go: () => {}, start: () => {} });

  useEffect(() => {
    const { scroll, resize } = getRuntime();
    const found: Item[] = [...document.querySelectorAll<HTMLElement>("[data-quick-link]")].map((el) => ({
      id: el.id,
      label: el.dataset.quickLink || "",
    }));

    let cur = found[0]?.id ?? "";
    let sections: { id: string; top: number }[] = [];
    let start = 0;
    let end = 0;
    let step = 24;
    let target = 0;
    let base = 0;
    let wheelTarget = 0;
    let wheel = 0;
    let navigating = false;

    const index = () => found.findIndex((i) => i.id === cur);
    const centre = () => {
      const i = index();
      return i === -1 || !found.length ? 0 : ((found.length - 1) / 2 - i) * step;
    };
    // watch(centre): follow the active label unless a click-navigation is in flight
    let lastCentre = centre();
    const syncCentre = () => {
      const c = centre();
      if (c === lastCentre) return;
      lastCentre = c;
      if (!navigating) {
        target = c;
        wheelTarget = 0;
      }
    };
    const setCur = (id: string) => {
      if (id === cur) return;
      cur = id;
      setCurrent(id);
      syncCentre();
    };
    const clampWheel = (v: number) => {
      const i = Math.max(0, index());
      return Math.max(-(found.length - 1 - i) * step, Math.min(i * step, v));
    };
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      wheelTarget = clampWheel(wheelTarget - e.deltaY * 0.5);
    };
    const go = (id: string) => {
      const n = found.length;
      const shown = Math.round((n - 1) / 2 - (base + wheel) / step);
      const from = Math.max(0, Math.min(n - 1, shown));
      const to = found.findIndex((i) => i.id === id);
      base = ((n - 1) / 2 - from) * step;
      target = ((n - 1) / 2 - to) * step;
      wheelTarget = wheel = 0;
      cur = id;
      setCurrent(id);
      navigating = true;
      lastCentre = centre();
      scroll.to(`#${id}`);
    };
    api.current.go = go;

    const onTick = ({ ratio }: TickEvent) => {
      base = lerp(base, target, 0.15 * ratio);
      wheel = lerp(wheel, wheelTarget, 0.15 * ratio);
      if (list.current) list.current.style.transform = `translateY(${base + wheel}px)`;
    };
    const measureStep = () => {
      const children = list.current?.children;
      if (!children || children.length < 2) return;
      step = children[1].getBoundingClientRect().top - children[0].getBoundingClientRect().top;
      syncCentre();
    };
    const measure = () => {
      measureStep();
      const offset = window.innerHeight * 0.8;
      sections = found.map((i) => {
        const el = document.getElementById(i.id);
        return { id: i.id, top: el ? offsetTop(el) - offset : 0 };
      });
      start = sections[0]?.top ?? 0;
      const last = document.getElementById(found[found.length - 1]?.id);
      end = last ? offsetTop(last) + last.offsetHeight : 0;
    };
    const onScroll = ({ y }: ScrollEvent) => {
      setActive(y >= start && y <= end);
      for (const s of [...sections].reverse()) {
        if (y >= s.top) {
          if (navigating) {
            if (s.id === cur) navigating = false;
          } else setCur(s.id);
          break;
        }
      }
    };
    const onVirtualScroll = ({ event }: { event: Event }) => {
      if (navigating && !nav.current?.contains(event.target as Node)) navigating = false;
    };

    setItems(found);
    setCurrent(cur);
    scroll.lenis.on("virtual-scroll", onVirtualScroll as never);
    const area = wheelArea.current!;
    area.addEventListener("wheel", onWheel, { passive: false });

    // runs once the labels are rendered (the original's `nextTick`)
    let started = false;
    api.current.start = () => {
      if (started) return;
      started = true;
      measureStep();
      measure();
      target = base = lastCentre = centre();
      resize.add(measure);
      events.on(EVENTS.APP_SCROLL, onScroll);
      events.on(EVENTS.APP_TICK, onTick);
    };

    return () => {
      if (started) {
        resize.remove(measure);
        events.off(EVENTS.APP_SCROLL, onScroll);
        events.off(EVENTS.APP_TICK, onTick);
      }
      area.removeEventListener("wheel", onWheel);
      scroll.lenis?.off("virtual-scroll", onVirtualScroll as never);
    };
  }, []);

  useEffect(() => {
    if (items.length) api.current.start();
  }, [items]);

  return (
    <nav
      ref={nav}
      className={`quick-menu fixed left-25 inset-y-0 z-50 hidden l:flex items-center pointer-events-none${active ? " is-active" : ""}`}
      inert={!active}
      aria-label="Sections"
      data-lenis-prevent=""
    >
      <svg className="quick-menu__icon shrink-0 mr-15 h-20 w-auto" viewBox="0 0 12 19" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <circle cx="6" cy="9.5" r="5.5" fill="#D64238" />
      </svg>
      <div ref={wheelArea} className="flex flex-col items-start justify-center py-100">
        <ul ref={list} className="flex flex-col gap-y-10">
          {items.map((item) => (
            <li key={item.id}>
              <button
                className="block group"
                aria-current={current === item.id ? "true" : undefined}
                onClick={() => api.current.go(item.id)}
              >
                <span
                  className={`type-caption uppercase leading-none transition-colors duration-300 ease-out whitespace-nowrap ${
                    current === item.id ? "text-gold" : "text-brown has-hover:group-hover:text-gold"
                  }`}
                >
                  {item.label}
                </span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </nav>
  );
}
