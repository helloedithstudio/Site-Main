"use client";

// Beliefs (500vh): a pinned canvas plays the 267-frame flower sequence (WebP, loaded lazily) with scroll,
// the frame scales 0.75 → 1, the gold rule grows, and the six belief captions swap with
// SplitText line reveals.

import { useEffect, useRef, useState } from "react";
import { home } from "@/lib/content";
import { gsap, SplitText } from "@/lib/runtime/gsap";
import { getRuntime } from "@/lib/runtime";
import { TransitionSwitch } from "../ui/Transition";

const item = home.beliefs;
const FRAMES = 267;
const FRAME_W = 1800;
const FRAME_H = 949;
const FRAME_CONCURRENCY = 4;
// Start fetching the sequence this long after mount even if the section is far away (ms).
const FRAME_IDLE_START = 9000;
const pad = (n: number) => String(n).padStart(4, "0");

export default function Beliefs() {
  const [index, setIndex] = useState(0);
  const indexRef = useRef(0);
  const section = useRef<HTMLElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const scale = useRef<HTMLDivElement>(null);
  const line = useRef<HTMLDivElement>(null);
  const textBox = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const { resize } = getRuntime();
    const frames: (HTMLImageElement | undefined)[] = [];
    const state = { frame: 0 };
    let tl: gsap.core.Timeline | null = null;
    let disposed = false;
    let drawn = -1;

    const ready = (i: number) => (frames[i]?.naturalWidth ?? 0) > 0;
    // The closest frame that has arrived, so scrubbing never shows a hole while the sequence is still loading.
    const nearest = (i: number) => {
      if (ready(i)) return i;
      for (let d = 1; d < FRAMES; d++) {
        if (i - d >= 0 && ready(i - d)) return i - d;
        if (i + d < FRAMES && ready(i + d)) return i + d;
      }
      return -1;
    };
    const draw = (img: HTMLImageElement) => {
      const c = canvas.current;
      if (!c) return;
      const ctx = c.getContext("2d")!;
      const { width, height } = c;
      const s = Math.max(width / FRAME_W, height / FRAME_H);
      const w = FRAME_W * s;
      const h = FRAME_H * s;
      ctx.clearRect(0, 0, width, height);
      ctx.filter = "saturate(1.6) contrast(1.15)";
      ctx.drawImage(img, (width - w) / 2, (height - h) / 2, w, h);
      ctx.filter = "none";
    };
    const render = (target: number, force = false) => {
      const n = nearest(target);
      if (n < 0 || (n === drawn && !force)) return;
      drawn = n;
      draw(frames[n]!);
    };
    const onResize = (ww: number, wh: number) => {
      const c = canvas.current;
      if (!c) return;
      c.width = ww;
      c.height = wh;
      render(Math.round(state.frame), true);
    };

    resize.add(onResize);

    // The sequence is 4.7 MB, so it must not compete with the WebGL assets at page load. Frames load a few at a
    // time in passes (every 8th, then 4th, 2nd, the rest) once the section is near, or a little after the page
    // has settled, whichever comes first. Scrubbing draws the nearest frame that has arrived.
    const order: number[] = [0, FRAMES - 1];
    const queued = new Set<number>(order);
    for (const stride of [8, 4, 2, 1]) {
      for (let i = 0; i < FRAMES; i += stride) {
        if (!queued.has(i)) {
          queued.add(i);
          order.push(i);
        }
      }
    }
    let next = 0;
    let inFlight = 0;
    let started = false;
    const pump = () => {
      while (!disposed && inFlight < FRAME_CONCURRENCY && next < order.length) {
        const i = order[next++];
        const img = new Image();
        img.decoding = "async";
        inFlight++;
        const settle = () => {
          inFlight--;
          if (disposed) return;
          if (ready(i) && nearest(Math.round(state.frame)) === i) render(Math.round(state.frame));
          pump();
        };
        img.onload = settle;
        img.onerror = () => {
          frames[i] = undefined;
          settle();
        };
        frames[i] = img;
        img.src = `/images/flower/frame_${pad(i + 1)}.webp`;
      }
    };
    const start = () => {
      if (started || disposed) return;
      started = true;
      observer?.disconnect();
      pump();
    };
    const observer =
      typeof IntersectionObserver === "undefined"
        ? null
        : new IntersectionObserver((entries) => entries.some((e) => e.isIntersecting) && start(), {
            rootMargin: "300% 0px 300% 0px",
          });
    if (section.current) observer?.observe(section.current);
    // On a slow or data-saving connection, only fetch the sequence once the section is close.
    const conn = (navigator as Navigator & { connection?: { saveData?: boolean; effectiveType?: string } }).connection;
    const lean = !!conn && (!!conn.saveData || /^(slow-2g|2g|3g)$/.test(conn.effectiveType ?? ""));
    const idleTimer = lean ? 0 : window.setTimeout(start, FRAME_IDLE_START);
    if (!observer) start();

    const duration = 3;
    tl = gsap
      .timeline({
        scrollTrigger: {
          trigger: section.current,
          start: "top top",
          end: "bottom bottom",
          scrub: true,
          refreshPriority: -1,
          onUpdate: (st) => {
            const next = Math.round(st.progress * (item.items.length - 1));
            if (next !== indexRef.current) {
              // watch(index) → lock the text box height before the swap
              if (textBox.current) gsap.set(textBox.current, { height: textBox.current.offsetHeight });
              indexRef.current = next;
              setIndex(next);
            }
          },
        },
        defaults: { duration, ease: "none" },
      })
      .fromTo(scale.current, { scale: 0.75 }, { scale: 1, duration: duration / 3, ease: "power1.inOut" }, 0)
      .fromTo(line.current, { scaleX: 0 }, { scaleX: 1 }, 0)
      .to(
        state,
        {
          frame: FRAMES - 1,
          snap: 1,
          onUpdate: () => render(Math.round(state.frame)),
        } as unknown as gsap.TweenVars,
        0,
      );

    return () => {
      disposed = true;
      observer?.disconnect();
      window.clearTimeout(idleTimer);
      frames.forEach((img) => {
        if (img) img.onload = img.onerror = null;
      });
      resize.remove(onResize);
      tl?.kill();
    };
  }, []);

  const onEnter = (el: HTMLElement, done: () => void) => {
    done();
    const split = SplitText.create(el, { type: "lines", mask: "lines" });
    if (textBox.current) {
      gsap.to(textBox.current, {
        height: el.offsetHeight,
        duration: 1,
        delay: 0.5,
        ease: "expo",
        overwrite: true,
        onComplete: () => {
          gsap.set(textBox.current, { height: "auto" });
        },
      });
    }
    gsap.from(split.lines, { yPercent: 105, duration: 1, stagger: 0.05, delay: 0.5, ease: "expo" });
  };
  const onLeave = (el: HTMLElement, done: () => void) => {
    gsap.to(SplitText.create(el, { type: "lines", mask: "lines" }).lines, {
      yPercent: -105,
      duration: 0.5,
      stagger: 0.05,
      ease: "power2.in",
      onComplete: done,
    });
  };

  return (
    <section
      ref={section}
      id="beliefs"
      data-quick-link="Beliefs"
      className="edith-beliefs relative border-t border-brown-dark z-2"
    >
      <div className="sticky top-0 h-full-screen w-full overflow-hidden">
        <div ref={scale} className="absolute inset-0 pointer-events-none z-1">
          <canvas ref={canvas} className="absolute inset-0 w-full h-full" />
          <div className="absolute bottom-20 inset-x-20 s:right-auto s:bottom-75 s:left-1/2 s:-translate-x-1/2 s:w-full s:max-w-[70rem] px-20 s:px-120 py-20 s:py-50 border border-brown-dark rounded-[.5rem] overflow-hidden bg-black z-3">
            <div ref={textBox} className="relative stack items-start type-body-xs s:type-body-md">
              <TransitionSwitch onEnter={onEnter} onLeave={onLeave}>
                <div key={index} dangerouslySetInnerHTML={{ __html: item.items[index].text }} />
              </TransitionSwitch>
            </div>
            <div ref={line} className="absolute bottom-0 inset-x-0 border-b border-gold origin-left z-2" />
          </div>
        </div>
      </div>
    </section>
  );
}
